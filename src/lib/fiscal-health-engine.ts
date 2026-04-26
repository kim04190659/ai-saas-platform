// =====================================================
//  src/lib/fiscal-health-engine.ts
//  財政健全化 共通AIエンジン — Sprint #52
//
//  ■ 概要
//    各自治体の財政健全化指標DB（健全化判断比率・資金不足比率・
//    財政構造指標・歳入歳出比率）をNotionから取得し、
//    Claude AIが財政状況を分析して改善提言を行う。
//
//  ■ municipalityId で自治体を切り替え（デフォルト: kirishima）
//    → getMunicipalityDbConfig(municipalityId).fiscalDbId を参照
//
//  ■ 分析シナリオ
//    current:  現状分析（財政指標の健全性評価・リスク洗い出し）
//    optimize: 歳出最適化（経常収支比率改善・コスト削減施策）
//    longterm: 中長期財政計画（人口減少・公債費ピーク対応）
// =====================================================

import Anthropic from '@anthropic-ai/sdk'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ───────────────────────────────────────────

export interface FiscalIndicator {
  id:            string
  name:          string   // 指標名
  category:      string   // 区分（健全化判断比率/資金不足比率/財政構造指標/歳入歳出）
  value:         number   // 値_%
  earlyThreshold: number | null  // 早期健全化基準_%
  regenThreshold: number | null  // 財政再生基準_%
  yoyChange:     number   // 前年度比_%
  assessment:    string   // 評価（優良/良好/注意/警戒/危険）
  fiscalYear:    string   // 対象年度
  note:          string   // 備考
}

export interface FiscalRecommendation {
  priority:   string   // 高/中/低
  title:      string
  detail:     string
  timing:     string
  costEffect: string
}

export interface FiscalAnalysisResult {
  scenario:           string
  summary:            string
  urgentItems:        string[]
  recommendations:    FiscalRecommendation[]
  totalCostReduction: string  // 歳出削減・財政改善効果
  risks:              string[]
}

// ─── Notion DB からデータ取得 ─────────────────────────

export async function fetchFiscalIndicators(
  notionKey:      string,
  municipalityId: string = 'kirishima',
): Promise<FiscalIndicator[]> {

  const cfg = getMunicipalityDbConfig(municipalityId)
  if (!cfg?.fiscalDbId) {
    console.warn(`[fiscal-engine] fiscalDbId が未設定: ${municipalityId}`)
    return []
  }

  const res = await fetch(`${NOTION_API}/databases/${cfg.fiscalDbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({ page_size: 100 }),
  })

  if (!res.ok) {
    console.error(`[fiscal-engine] Notion クエリ失敗: ${res.status}`)
    return []
  }

  const data = await res.json()
  const rows = (data.results ?? []) as Record<string, unknown>[]

  // Notion プロパティ → 型変換
  return rows.map(r => {
    const p = r.properties as Record<string, Record<string, unknown>>
    return {
      id:            (r.id as string) ?? '',
      name:          (p['指標名']?.title           as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      category:      (p['区分']?.select            as {name:string})?.name ?? '',
      value:         (p['値_%']?.number            as number) ?? 0,
      earlyThreshold:(p['早期健全化基準_%']?.number as number | null) ?? null,
      regenThreshold:(p['財政再生基準_%']?.number   as number | null) ?? null,
      yoyChange:     (p['前年度比_%']?.number       as number) ?? 0,
      assessment:    (p['評価']?.select             as {name:string})?.name ?? '',
      fiscalYear:    (p['対象年度']?.rich_text      as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      note:          (p['備考']?.rich_text          as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
    }
  })
}

// ─── シナリオ別プロンプト生成 ─────────────────────────

function buildPrompt(
  scenario:         string,
  indicators:       FiscalIndicator[],
  municipalityName: string,
): string {

  // 「警戒」「危険」「注意」を優先して上位12件に絞る（トークン節約）
  const priorityOrder: Record<string, number> = { 危険: 0, 警戒: 1, 注意: 2, 良好: 3, 優良: 4 }
  const topIndicators = [...indicators]
    .sort((a, b) => (priorityOrder[a.assessment] ?? 5) - (priorityOrder[b.assessment] ?? 5))
    .slice(0, 12)

  // 指標データをテキスト化（1行あたりの情報を最小限に）
  const dataText = [
    `【${municipalityName} 財政健全化指標（令和5年度）】`,
    ...topIndicators.map(f => {
      // 閾値がある場合のみ表示
      const threshold = f.earlyThreshold != null ? `早期基準${f.earlyThreshold}%` : ''
      const change    = f.yoyChange > 0 ? `+${f.yoyChange}` : `${f.yoyChange}`
      return `${f.name}|${f.category}|${f.value}%|前年${change}%pt|${f.assessment}${threshold ? `|${threshold}` : ''}`
    }),
    '',
    // 総括サマリー（全件）
    `警戒・危険: ${indicators.filter(i => ['警戒','危険'].includes(i.assessment)).length}件`,
    `注意: ${indicators.filter(i => i.assessment === '注意').length}件`,
    `良好以上: ${indicators.filter(i => ['良好','優良'].includes(i.assessment)).length}件`,
  ].join('\n')

  // シナリオごとの指示
  const scenarioMap: Record<string, string> = {
    current: [
      'シナリオ: 現状財政分析',
      '財政健全化指標を総合的に評価し「霧島市が今最も注力すべき財政課題」を特定してください。',
      '特に「2027〜2030年に深刻化するリスク」を具体的に指摘してください。',
      '合併特例債の元金償還ピーク・高齢化による扶助費増加・経常収支比率悪化の連鎖を分析してください。',
    ].join('\n'),

    optimize: [
      'シナリオ: 歳出最適化・経常収支比率改善',
      '経常収支比率93.4%を目標88%以下に改善するための具体的な施策を提言してください。',
      '人件費・扶助費・公債費の3大経常経費それぞれについて削減・抑制策を示してください。',
      '年間何億円の歳出削減が必要か、実現可能な施策の組み合わせを試算してください。',
    ].join('\n'),

    longterm: [
      'シナリオ: 中長期財政計画（2025〜2035年）',
      '人口減少（2035年推計: 現在比約15%減）と合併特例債償還ピーク（2027年）を踏まえ、',
      '10年間の財政運営方針を提言してください。',
      '財政調整基金残高の目標設定（現在58億円→目標水準）、',
      '公共施設の統廃合・広域化による歳出削減効果も含めて示してください。',
    ].join('\n'),
  }

  const scenarioInstruction = scenarioMap[scenario] ?? scenarioMap['current']

  // ★開発ルール: Haiku max_tokens=4096 に収めるため出力を簡潔に制限する
  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{',
    '  "summary": "全体サマリー（2文以内）",',
    '  "urgentItems": ["緊急・重要課題（最大3件・1文以内）"],',
    '  "recommendations": [最大4件。各フィールドは下記形式',
    '    {"priority":"高|中|低","title":"20文字以内","detail":"1〜2文","timing":"時期","costEffect":"金額・効果の概算"}',
    '  ],',
    '  "totalCostReduction": "歳出削減・財政改善効果合計（例: 年間約X億円）",',
    '  "risks": ["リスク（最大2件・1文以内）"]',
    '}',
    '※ JSONのみ出力。説明文・コードブロック不要。簡潔さを最優先すること。',
  ].join('\n')

  return [
    `あなたは日本の地方財政・財政健全化の専門家です。`,
    `${municipalityName}の財政健全化指標データを分析し、具体的な改善提言を作成してください。`,
    '',
    dataText,
    '',
    scenarioInstruction,
    '',
    outputFormat,
  ].join('\n')
}

// ─── AI分析実行 ───────────────────────────────────────

export async function runFiscalAnalysis(
  notionKey:      string,
  anthropicKey:   string,
  scenario:       string = 'current',
  municipalityId: string = 'kirishima',
): Promise<FiscalAnalysisResult> {

  // 自治体名を取得（プロンプトで使用）
  const municipality     = getMunicipalityById(municipalityId)
  const municipalityName = municipality?.shortName ?? municipalityId

  // Notionからデータ取得
  const indicators = await fetchFiscalIndicators(notionKey, municipalityId)
  if (indicators.length === 0) {
    throw new Error(`財政指標データが取得できませんでした（municipalityId: ${municipalityId}）`)
  }

  // プロンプト生成 → Claude呼び出し
  const prompt    = buildPrompt(scenario, indicators, municipalityName)
  const anthropic = new Anthropic({ apiKey: anthropicKey })

  const res = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: 4096, // ★Haikuの上限。出力制限ルールを守ることで途中切れを防ぐ
    messages:   [{ role: 'user', content: prompt }],
  })

  const raw      = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
  const stripped = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  const match    = stripped.match(/\{[\s\S]*\}/)

  // stop_reason チェック（途中切れの警告）
  if (res.stop_reason === 'max_tokens') {
    console.warn('[fiscal-engine] max_tokens に達したため出力が途中で切れている可能性があります')
  }

  const parsed = JSON.parse(match ? match[0] : '{}') as Partial<FiscalAnalysisResult>

  return {
    scenario,
    summary:            parsed.summary            ?? 'AI分析を生成できませんでした',
    urgentItems:        parsed.urgentItems         ?? [],
    recommendations:    parsed.recommendations     ?? [],
    totalCostReduction: parsed.totalCostReduction  ?? '—',
    risks:              parsed.risks               ?? [],
  }
}
