// =====================================================
//  src/lib/infrastructure-aging-engine.ts
//  インフラ老朽化 共通AIエンジン — Sprint #51
//
//  ■ 概要
//    各自治体のインフラ施設DB（橋梁・市道・排水路・公共施設・上下水道管）を
//    Notionから取得し、Claude AIが修繕優先度と予算最適化を提言する。
//
//  ■ municipalityId で自治体を切り替え（デフォルト: kirishima）
//    → getMunicipalityDbConfig(municipalityId).infraDbId を参照
//
//  ■ 分析シナリオ
//    urgent:    緊急課題の洗い出し（健全度スコア低順に優先度判定）
//    budget:    予算制約内での最適修繕計画（ROI最大化）
//    consolidate: 人口減少を踏まえた施設統廃合シナリオ
// =====================================================

import Anthropic from '@anthropic-ai/sdk'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ───────────────────────────────────────────

export interface InfraFacility {
  id:           string
  name:         string   // 施設名
  type:         string   // 種別（橋梁/市道/排水路/公共施設/上下水道管）
  district:     string   // 所在地区
  age:          number   // 築年数_年
  score:        number   // 健全度スコア（100点満点、低いほど老朽化）
  urgency:      string   // 修繕必要度
  repairCost:   number   // 修繕費見積_万円
  lastInspect:  string   // 最終点検年度
  note:         string   // 備考
}

export interface InfraRecommendation {
  priority:   string   // 高/中/低
  title:      string
  detail:     string
  timing:     string
  costEffect: string
}

export interface InfraAnalysisResult {
  scenario:           string
  summary:            string
  urgentItems:        string[]
  recommendations:    InfraRecommendation[]
  totalRepairCost:    string  // 対象施設の修繕費総額
  totalCostReduction: string  // 最適化による削減効果
  risks:              string[]
}

// ─── Notion DB からデータ取得 ─────────────────────────

export async function fetchInfraFacilities(
  notionKey:      string,
  municipalityId: string = 'kirishima',
): Promise<InfraFacility[]> {

  const cfg = getMunicipalityDbConfig(municipalityId)
  if (!cfg?.infraDbId) {
    console.warn(`[infra-engine] infraDbId が未設定: ${municipalityId}`)
    return []
  }

  const res = await fetch(`${NOTION_API}/databases/${cfg.infraDbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({ page_size: 100 }),
  })

  if (!res.ok) {
    console.error(`[infra-engine] Notion クエリ失敗: ${res.status}`)
    return []
  }

  const data = await res.json()
  const rows = (data.results ?? []) as Record<string, unknown>[]

  // Notion プロパティ → 型変換
  return rows.map(r => {
    const p = r.properties as Record<string, Record<string, unknown>>
    return {
      id:          (r.id as string) ?? '',
      name:        (p['施設名']?.title         as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      type:        (p['種別']?.select           as {name:string})?.name ?? '',
      district:    (p['所在地区']?.rich_text    as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      age:         (p['築年数_年']?.number      as number) ?? 0,
      score:       (p['健全度スコア']?.number   as number) ?? 0,
      urgency:     (p['修繕必要度']?.select     as {name:string})?.name ?? '',
      repairCost:  (p['修繕費見積_万円']?.number as number) ?? 0,
      lastInspect: (p['最終点検年度']?.rich_text as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      note:        (p['備考']?.rich_text         as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
    }
  })
}

// ─── シナリオ別プロンプト生成 ─────────────────────────

function buildPrompt(
  scenario:       string,
  facilities:     InfraFacility[],
  municipalityName: string,
): string {

  // 健全度スコアが低い順に上位12件に絞る（トークン節約）
  const topFacilities = [...facilities]
    .sort((a, b) => a.score - b.score)
    .slice(0, 12)

  // 施設データをテキスト化（1行あたりの情報を最小限に）
  const dataText = [
    `【${municipalityName} インフラ施設（健全度低い順・上位${topFacilities.length}件）】`,
    ...topFacilities.map(f =>
      `${f.name}|${f.type}|${f.district}|築${f.age}年|健全度${f.score}|${f.urgency}|${f.repairCost}万円`
    ),
    '',
    `全${facilities.length}件: 緊急${facilities.filter(f => f.urgency === '緊急修繕').length}件, 計画${facilities.filter(f => f.urgency === '計画修繕').length}件`,
    `修繕費合計: ${facilities.reduce((s, f) => s + f.repairCost, 0).toLocaleString()}万円`,
  ].join('\n')

  // シナリオごとの指示
  const scenarioMap: Record<string, string> = {
    urgent: [
      'シナリオ: 緊急課題の洗い出し',
      '健全度スコアが低い施設・特に人命に関わる橋梁・市道を中心に、',
      '「今すぐ対応が必要な施設」を優先順位付きで特定してください。',
      '2025〜2027年に集中して対応すべき施設と、その修繕費用総額を試算してください。',
    ].join('\n'),

    budget: [
      'シナリオ: 予算制約内での最適修繕計画',
      '年間予算を5000万円と仮定した場合、どの施設から優先的に修繕すべきか提言してください。',
      '「修繕しないことで将来かかるコスト（放置コスト）」の大きい施設を優先する視点で分析してください。',
      '5年間のロードマップ（2025〜2029年）として提示してください。',
    ].join('\n'),

    consolidate: [
      'シナリオ: 人口減少を踏まえた施設統廃合シナリオ',
      '人口減少・過疎化が進む地区（横川・福山・牧園・霧島地区）の施設について、',
      '「修繕せず廃止・集約する」という選択肢を含めて提言してください。',
      '廃止・集約した場合のコスト削減効果と、住民サービスへの影響も示してください。',
    ].join('\n'),
  }

  const scenarioInstruction = scenarioMap[scenario]
    ?? scenarioMap['urgent']

  // ★開発ルール: Haiku max_tokens=4096 に収めるため出力を簡潔に制限する
  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{',
    '  "summary": "全体サマリー（2文以内）",',
    '  "urgentItems": ["緊急対応施設・課題（最大3件）"],',
    '  "recommendations": [最大4件。各フィールドは下記形式',
    '    {"priority":"高|中|低","title":"20文字以内","detail":"1〜2文","timing":"時期","costEffect":"金額の概算"}',
    '  ],',
    '  "totalRepairCost": "修繕費総額の概算（例: 約X億円）",',
    '  "totalCostReduction": "削減・回避効果（例: 年間約X万円）",',
    '  "risks": ["リスク（最大2件・1文以内）"]',
    '}',
    '※ JSONのみ出力。説明文・コードブロック不要。簡潔さを最優先すること。',
  ].join('\n')

  return [
    `あなたは日本の地方自治体のインフラ管理・公共施設マネジメントの専門家です。`,
    `${municipalityName}のインフラ施設データを分析し、具体的な改善提言を作成してください。`,
    '',
    dataText,
    '',
    scenarioInstruction,
    '',
    outputFormat,
  ].join('\n')
}

// ─── AI分析実行 ───────────────────────────────────────

export async function runInfraAnalysis(
  notionKey:      string,
  anthropicKey:   string,
  scenario:       string = 'urgent',
  municipalityId: string = 'kirishima',
): Promise<InfraAnalysisResult> {

  // 自治体名を取得（プロンプトで使用）
  const municipality     = getMunicipalityById(municipalityId)
  const municipalityName = municipality?.shortName ?? municipalityId

  // Notionからデータ取得
  const facilities = await fetchInfraFacilities(notionKey, municipalityId)
  if (facilities.length === 0) {
    throw new Error(`施設データが取得できませんでした（municipalityId: ${municipalityId}）`)
  }

  // プロンプト生成 → Claude呼び出し
  const prompt    = buildPrompt(scenario, facilities, municipalityName)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const res = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 4096, // 3000→4096（Haikuの上限。18施設分の詳細JSONが途中で切れる対策）
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw     = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
  const stripped = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const match    = stripped.match(/\{[\s\S]*\}/)

  // stop_reason が 'max_tokens' の場合は途中切れの警告を出す
  if (res.stop_reason === 'max_tokens') {
    console.warn('[infra-engine] max_tokens に達したため出力が途中で切れている可能性があります')
  }

  const parsed = JSON.parse(match ? match[0] : '{}') as Partial<InfraAnalysisResult>

  return {
    scenario,
    summary:            parsed.summary            ?? 'AI分析を生成できませんでした',
    urgentItems:        parsed.urgentItems         ?? [],
    recommendations:    parsed.recommendations     ?? [],
    totalRepairCost:    parsed.totalRepairCost     ?? '—',
    totalCostReduction: parsed.totalCostReduction  ?? '—',
    risks:              parsed.risks               ?? [],
  }
}
