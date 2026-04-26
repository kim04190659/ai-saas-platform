// =====================================================
//  src/lib/emergency-support-engine.ts
//  緊急時住民支援 優先順位エンジン — Sprint #55
//
//  台風・地震などの緊急時に
//  「誰を優先して助けるか」「誰が助けに行けるか」を
//  住民の属性データ（年齢層・世帯状況・移動手段・WBスコア）
//  から自動計算し、AIが地区別対応計画を生成する。
//
//  ■ 要支援スコア算出ロジック
//    年齢層:   80代以上(+3) / 60〜70代(+2) / 40〜50代(+1) / 〜30代(0)
//    世帯状況: 独居(+3) / 施設入居(+1) / 核家族・三世代(0)
//    移動手段: 移動困難(+3) / バスのみ(+1) / 自家用車あり(0)
//    WBスコア: 3以下(+3) / 5以下(+1) / 6以上(0)
//    緊急相談: 未解決の「緊急」相談あり(+2) / 「高」(+1)
//    ─────────────────────────────
//    合計: 最大12点 → 高いほど優先支援が必要
// =====================================================

import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

const NOTION_API = 'https://api.notion.com/v1'

// ── 型定義 ─────────────────────────────────────────

/** 要支援住民（優先度つき） */
export type SupportNeededResident = {
  id:           string
  住民名:       string
  住民ID:       string
  地区:         string
  年齢層:       string
  世帯状況:     string
  移動手段:     string
  WBスコア:     number | null
  要支援スコア: number           // 算出した優先度スコア（0〜12）
  優先度:       '最優先' | '高' | '中' | '低'
  リスク要因:   string[]         // 例: ['独居', '移動困難', 'WBスコア低']
}

/** 支援可能住民 */
export type SupportCapableResident = {
  id:       string
  住民名:   string
  住民ID:   string
  地区:     string
  移動手段: string
  世帯状況: string
  WBスコア: number | null
}

/** 地区別緊急対応ペア */
export type DistrictPlan = {
  地区:     string
  要支援者: SupportNeededResident[]
  支援者:   SupportCapableResident[]
}

/** AI生成の緊急対応計画 */
export type EmergencyPlan = {
  scenario:       string
  municipalityId: string
  updatedAt:      string
  要支援住民数:   number
  支援可能住民数: number
  地区別計画:     DistrictPlan[]
  AIアドバイス:   {
    概況:         string
    最優先アクション: string[]
    注意事項:     string[]
  } | null
}

// ── Notion ヘルパー ────────────────────────────────

function notionHeaders(key: string) {
  return {
    Authorization:    `Bearer ${key}`,
    'Notion-Version': '2022-06-28',
    'Content-Type':   'application/json',
  }
}

function richText(prop: { rich_text?: { plain_text: string }[] } | undefined): string {
  return prop?.rich_text?.map(r => r.plain_text).join('') ?? ''
}

function titleText(prop: { title?: { plain_text: string }[] } | undefined): string {
  return prop?.title?.map(r => r.plain_text).join('') ?? ''
}

function selectVal(prop: { select?: { name: string } | null } | undefined): string {
  return prop?.select?.name ?? ''
}

function numberVal(prop: { number?: number | null } | undefined): number | null {
  return prop?.number ?? null
}

// ── 要支援スコア算出 ──────────────────────────────

/**
 * 住民属性から要支援スコアを算出する（最大12点）
 * スコアが高いほど緊急時に優先支援が必要
 */
function calcSupportScore(
  年齢層:   string,
  世帯状況: string,
  移動手段: string,
  wbScore:  number | null,
  緊急相談あり: boolean,   // 未解決の「緊急」相談
  高優先相談あり: boolean, // 未解決の「高」相談
): { score: number; リスク要因: string[] } {

  let score = 0
  const factors: string[] = []

  // 年齢層スコア
  if (年齢層 === '80代以上')    { score += 3; factors.push('80代以上') }
  else if (年齢層 === '60〜70代') { score += 2; factors.push('60〜70代') }
  else if (年齢層 === '40〜50代') { score += 1 }

  // 世帯状況スコア（独居が最もリスク高）
  if (世帯状況 === '独居')      { score += 3; factors.push('独居') }
  else if (世帯状況 === '施設入居') { score += 1; factors.push('施設入居') }

  // 移動手段スコア（移動困難＝自力避難不可）
  if (移動手段 === '移動困難')  { score += 3; factors.push('移動困難') }
  else if (移動手段 === 'バスのみ') { score += 1; factors.push('バスのみ') }

  // WBスコア補正
  if (wbScore !== null) {
    if (wbScore <= 3)      { score += 3; factors.push('WBスコア低（' + wbScore + '）') }
    else if (wbScore <= 5) { score += 1 }
  }

  // 緊急相談補正
  if (緊急相談あり)      { score += 2; factors.push('未解決の緊急相談あり') }
  else if (高優先相談あり) { score += 1; factors.push('未解決の高優先相談あり') }

  return { score, リスク要因: factors }
}

/**
 * 要支援スコアから優先度ラベルを決定する
 */
function toPriority(score: number): '最優先' | '高' | '中' | '低' {
  if (score >= 8) return '最優先'
  if (score >= 5) return '高'
  if (score >= 2) return '中'
  return '低'
}

// ── データ取得 ────────────────────────────────────

/**
 * 住民相談DBから「未解決の緊急・高優先相談」を住民ID別にまとめる
 */
async function fetchUrgentConsultations(
  notionKey:      string,
  consultationDbId: string,
): Promise<Map<string, { 緊急: boolean; 高: boolean }>> {

  const map = new Map<string, { 緊急: boolean; 高: boolean }>()

  const res = await fetch(`${NOTION_API}/databases/${consultationDbId}/query`, {
    method:  'POST',
    headers: notionHeaders(notionKey),
    body:    JSON.stringify({ page_size: 100 }),
  })
  if (!res.ok) return map

  const data = await res.json() as {
    results: { properties: Record<string, unknown> }[]
  }

  for (const page of data.results) {
    const p = page.properties as Record<string, {
      rich_text?: { plain_text: string }[]
      title?:     { plain_text: string }[]
      select?:    { name: string } | null
    }>

    const residentId = richText(p['住民ID'])
    const 緊急度     = selectVal(p['緊急度'])
    const 解決状況   = selectVal(p['解決状況'])

    // 解決済みは除外
    if (解決状況 === '解決済み' || !residentId) continue

    const current = map.get(residentId) ?? { 緊急: false, 高: false }
    if (緊急度 === '緊急') current.緊急 = true
    if (緊急度 === '高')   current.高   = true
    map.set(residentId, current)
  }

  return map
}

/**
 * 住民WBコーチングDBから全住民を取得し、要支援スコアを算出する
 */
export async function fetchResidentsWithSupportScore(
  notionKey:      string,
  municipalityId: string = 'yakushima'
): Promise<{ needed: SupportNeededResident[]; capable: SupportCapableResident[] }> {

  const cfg = getMunicipalityDbConfig(municipalityId)
  if (!cfg) return { needed: [], capable: [] }

  // 住民相談DB から緊急度情報を取得（並列）
  const [residentsRes, urgentMap] = await Promise.all([
    fetch(`${NOTION_API}/databases/${cfg.coachingDbId}/query`, {
      method:  'POST',
      headers: notionHeaders(notionKey),
      body:    JSON.stringify({ page_size: 100 }),
    }),
    fetchUrgentConsultations(notionKey, cfg.consultationDbId),
  ])

  if (!residentsRes.ok) return { needed: [], capable: [] }

  const data = await residentsRes.json() as {
    results: { id: string; properties: Record<string, unknown> }[]
  }

  const needed:  SupportNeededResident[]  = []
  const capable: SupportCapableResident[] = []

  for (const page of data.results) {
    const p = page.properties as Record<string, {
      rich_text?: { plain_text: string }[]
      title?:     { plain_text: string }[]
      select?:    { name: string } | null
      number?:    number | null
    }>

    const 住民ID   = richText(p['住民ID'])
    const 年齢層   = selectVal(p['年齢層'])
    const 世帯状況 = selectVal(p['世帯状況'])
    const 移動手段 = selectVal(p['移動手段'])
    const wbScore  = numberVal(p['WBスコア'])
    const urgent   = urgentMap.get(住民ID) ?? { 緊急: false, 高: false }

    // 要支援スコア算出
    const { score, リスク要因 } = calcSupportScore(
      年齢層, 世帯状況, 移動手段, wbScore,
      urgent.緊急, urgent.高,
    )

    // スコア1以上 → 要支援リストに追加
    if (score >= 1) {
      needed.push({
        id:           page.id,
        住民名:       titleText(p['住民名']),
        住民ID,
        地区:         selectVal(p['地区']),
        年齢層,
        世帯状況,
        移動手段,
        WBスコア:     wbScore,
        要支援スコア: score,
        優先度:       toPriority(score),
        リスク要因,
      })
    }

    // 自家用車あり＋独居でない＋WBスコア6以上 → 支援可能候補
    if (
      移動手段 === '自家用車あり' &&
      世帯状況 !== '独居' &&
      (wbScore === null || wbScore >= 6)
    ) {
      capable.push({
        id:       page.id,
        住民名:   titleText(p['住民名']),
        住民ID,
        地区:     selectVal(p['地区']),
        移動手段,
        世帯状況,
        WBスコア: wbScore,
      })
    }
  }

  // 要支援住民はスコア降順でソート
  needed.sort((a, b) => b.要支援スコア - a.要支援スコア)

  return { needed, capable }
}

// ── 地区別計画作成 ────────────────────────────────

/**
 * 要支援住民・支援可能住民を地区別にグループ化する
 */
export function groupByDistrict(
  needed:  SupportNeededResident[],
  capable: SupportCapableResident[],
): DistrictPlan[] {

  // 地区一覧を収集（順序: 要支援者の多い地区を先頭）
  const districtSet = new Set<string>()
  needed.forEach(r => { if (r.地区) districtSet.add(r.地区) })
  capable.forEach(r => { if (r.地区) districtSet.add(r.地区) })

  const plans: DistrictPlan[] = []

  for (const 地区 of districtSet) {
    plans.push({
      地区,
      要支援者: needed.filter(r => r.地区 === 地区),
      支援者:   capable.filter(r => r.地区 === 地区),
    })
  }

  // 要支援者数の多い地区を先頭に
  plans.sort((a, b) => b.要支援者.length - a.要支援者.length)

  return plans
}

// ── AI 対応計画生成 ──────────────────────────────

/**
 * Claude Haiku が緊急時の対応アドバイスを生成する
 * @param scenario 'typhoon'（台風）/ 'earthquake'（地震）/ 'heatwave'（熱中症）
 */
export async function generateEmergencyAdvice(
  anthropicKey:    string,
  scenario:        string,
  needed:          SupportNeededResident[],
  capable:         SupportCapableResident[],
  municipalityName: string,
): Promise<{ 概況: string; 最優先アクション: string[]; 注意事項: string[] } | null> {

  // シナリオ名の日本語変換
  const scenarioLabel: Record<string, string> = {
    typhoon:    '台風・大雨',
    earthquake: '地震・津波',
    heatwave:   '熱中症・猛暑',
    default:    '緊急事態',
  }
  const scenarioName = scenarioLabel[scenario] ?? scenarioLabel.default

  // 入力データを上位8件に絞る（Haiku トークン対策）
  const topNeeded  = needed.slice(0, 8)
  const topCapable = capable.slice(0, 6)

  const neededText = topNeeded.map(r =>
    `${r.住民名}（${r.地区}・${r.年齢層}・${r.世帯状況}・${r.移動手段}・スコア${r.要支援スコア}）`
  ).join('、')

  const capableText = topCapable.map(r =>
    `${r.住民名}（${r.地区}・${r.移動手段}）`
  ).join('、')

  const prompt = `
あなたは${municipalityName}の緊急時住民支援コーディネーターです。
「${scenarioName}」が発生した際の住民支援計画を作成してください。

【要支援住民（優先度順・上位${topNeeded.length}名）】
${neededText || 'なし'}

【支援可能な住民（自家用車あり・体力的に支援可能）】
${capableText || 'なし'}

【出力形式（JSON）— 必ずこの形式のみで回答すること】
{"概況":"2文以内で全体状況","最優先アクション":["最大4件・1文以内・具体的な行動で記述"],"注意事項":["最大3件・1文以内"]}
※ JSONのみ出力。説明文・コードブロック不要。簡潔さを最優先。
`.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method:  'POST',
    headers: {
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages:   [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return null

  const data = await res.json() as {
    content?:    { type: string; text: string }[]
    stop_reason?: string
  }

  // JSON途中切れ警告（Haiku 3原則）
  if (data.stop_reason === 'max_tokens') {
    console.warn('[emergency-support] max_tokens に達しました。出力が切れている可能性があります。')
  }

  const text  = data.content?.find(b => b.type === 'text')?.text ?? ''
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[0]) as {
      概況:             string
      最優先アクション: string[]
      注意事項:         string[]
    }
    return {
      概況:             parsed.概況 ?? '',
      最優先アクション: Array.isArray(parsed.最優先アクション) ? parsed.最優先アクション : [],
      注意事項:         Array.isArray(parsed.注意事項) ? parsed.注意事項 : [],
    }
  } catch {
    return null
  }
}

// ── メインエクスポート ────────────────────────────

/**
 * 緊急時住民支援計画を生成する
 * GET用: AIなし（住民リスト + 地区別グループのみ）
 */
export async function fetchEmergencySupport(
  notionKey:      string,
  municipalityId: string = 'yakushima',
): Promise<Omit<EmergencyPlan, 'AIアドバイス'> & { AIアドバイス: null }> {

  const { needed, capable } = await fetchResidentsWithSupportScore(notionKey, municipalityId)
  const 地区別計画 = groupByDistrict(needed, capable)

  return {
    scenario:       'none',
    municipalityId,
    updatedAt:      new Date().toISOString(),
    要支援住民数:   needed.length,
    支援可能住民数: capable.length,
    地区別計画,
    AIアドバイス:   null,
  }
}

/**
 * AI込みの緊急対応計画を生成する
 * POST用: scenario を受け取り AI がアドバイスを生成
 */
export async function runEmergencyPlan(
  notionKey:      string,
  anthropicKey:   string,
  scenario:       string,
  municipalityId: string = 'yakushima',
): Promise<EmergencyPlan> {

  const municipalityName = getMunicipalityById(municipalityId).shortName

  const { needed, capable } = await fetchResidentsWithSupportScore(notionKey, municipalityId)
  const 地区別計画 = groupByDistrict(needed, capable)

  const AIアドバイス = await generateEmergencyAdvice(
    anthropicKey, scenario, needed, capable, municipalityName,
  )

  return {
    scenario,
    municipalityId,
    updatedAt:      new Date().toISOString(),
    要支援住民数:   needed.length,
    支援可能住民数: capable.length,
    地区別計画,
    AIアドバイス,
  }
}
