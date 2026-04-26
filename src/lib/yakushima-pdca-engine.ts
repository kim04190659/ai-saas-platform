// =====================================================
//  src/lib/yakushima-pdca-engine.ts
//  屋久島町 PDCA追跡エンジン — Sprint #47
//
//  ■ PDCAサイクル
//    Plan   : データ参照型エンジン（Sprint #46）が施策を提案
//    Do     : 職員が施策を実施し、実行記録DBに登録・ステータス更新
//    Check  : このエンジンが実施前後のデータを突合し効果を測定
//    Act    : Claude が改善点・次のアクションを提言
//
//  ■ 施策実行記録DB
//    ID    : b2685f135ee14a529041f2ebc178d048
//    DS_ID : 736e5f07-94ac-4814-9949-51240ce7c23c
// =====================================================

// ── 設定インポート ──────────────────────────────────
// municipalityId に応じた施策実行記録DB IDを取得するための設定ファイル
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

// 屋久島専用データDBのID（参照・効果測定に使用。霧島市等には該当DBなし）
const YAKUSHIMA_DB = {
  school:     '562a5136c2c64e42926c127df1ade099',
  ict:        '134897d2da734cff8f1bfcadcefe24db',
  population: '659d08de2d2f4c939eb7256cec33a838',
  migration:  '3b27788f40204073a896c6e392525ea4',
  tourism:    'd180f71cfc0942da986bf40e94495afc',
} as const

const NOTION_API_BASE = 'https://api.notion.com/v1'

// ─── 型定義 ───────────────────────────────────────────────

/** Notion から取得したページの raw 型 */
type NotionPage = {
  id: string
  url?: string
  properties: Record<string, {
    type: string
    number?: number | null
    title?: Array<{ plain_text: string }>
    rich_text?: Array<{ plain_text: string }>
    select?: { name: string } | null
    date?: { start: string | null } | null
    url?: string | null
  }>
}

/** 施策実行記録の1件 */
export type PolicyRecord = {
  id: string
  url?: string
  施策名: string
  ステータス: '検討中' | '実施中' | '完了' | '却下'
  カテゴリ: string
  緊急度: 'immediate' | 'short' | 'medium'
  担当部門: string
  提案日: string | null
  実施開始日: string | null
  実施完了日: string | null
  期待効果: string
  実績効果: string
  効果スコア: number | null
  根拠データ_実施前: string
  根拠データ_実施後: string
  備考: string
}

/** 施策登録のリクエスト */
export type RegisterPolicyRequest = {
  施策名: string
  カテゴリ: string
  緊急度: 'immediate' | 'short' | 'medium'
  担当部門: string
  期待効果: string
  根拠データ_実施前: string
}

/** Before/After 効果測定の結果 */
export type PdcaEvaluationResult = {
  success: boolean
  error?: string
  summary?: string              // AI が生成した PDCA サイクル総括
  completedPolicies?: number
  avgEffectScore?: number
  dataChanges?: {               // データDBから読んだ最新値の変化
    schoolTrend: string
    ictTrend: string
    migrationTrend: string
    tourismTrend: string
  }
  recommendations?: string[]   // 次のアクションへの提言
}

// ─── Notion ヘルパー ──────────────────────────────────────

/** ページのプロパティ値を取得 */
function getProp(page: NotionPage, key: string): string | number | null {
  const p = page.properties?.[key]
  if (!p) return null
  if (p.type === 'number')    return p.number ?? null
  if (p.type === 'title')     return p.title?.[0]?.plain_text ?? null
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text ?? null
  if (p.type === 'select')    return p.select?.name ?? null
  if (p.type === 'date')      return p.date?.start ?? null
  if (p.type === 'url')       return p.url ?? null
  return null
}

/** Notion DB を query して results を返す */
async function queryDb(
  notionKey: string,
  dbId: string,
  filter?: object,
  sorts?: object[]
): Promise<NotionPage[]> {
  const body: Record<string, unknown> = { page_size: 100 }
  if (filter) body.filter = filter
  if (sorts)  body.sorts  = sorts

  const res = await fetch(`${NOTION_API_BASE}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    console.error(`[pdca] DB クエリ失敗 (${dbId}):`, res.status)
    return []
  }
  const data = await res.json() as { results?: NotionPage[] }
  return data.results ?? []
}

// ─── 施策実行記録DB の CRUD ───────────────────────────────

/**
 * 施策実行記録DB から全件取得（ステータスでフィルタ可）
 * @param municipalityId 自治体ID（省略時は 'yakushima'）
 */
export async function fetchPolicies(
  notionKey:      string,
  municipalityId: string = 'yakushima',
  status?:        string
): Promise<PolicyRecord[]> {
  const cfg = getMunicipalityDbConfig(municipalityId)
  if (!cfg) return []
  const pdcaDbId = cfg.pdcaDbId

  const filter = status ? {
    property: 'ステータス',
    select: { equals: status }
  } : undefined

  const pages = await queryDb(notionKey, pdcaDbId, filter)
  return pages.map(p => ({
    id:               p.id,
    url:              p.url,
    施策名:           String(getProp(p, '施策名') ?? ''),
    ステータス:       (getProp(p, 'ステータス') as PolicyRecord['ステータス']) ?? '検討中',
    カテゴリ:         String(getProp(p, 'カテゴリ') ?? ''),
    緊急度:           (getProp(p, '緊急度') as PolicyRecord['緊急度']) ?? 'medium',
    担当部門:         String(getProp(p, '担当部門') ?? ''),
    提案日:           getProp(p, '提案日') as string | null,
    実施開始日:       getProp(p, '実施開始日') as string | null,
    実施完了日:       getProp(p, '実施完了日') as string | null,
    期待効果:         String(getProp(p, '期待効果') ?? ''),
    実績効果:         String(getProp(p, '実績効果') ?? ''),
    効果スコア:       getProp(p, '効果スコア') as number | null,
    根拠データ_実施前: String(getProp(p, '根拠データ（実施前）') ?? ''),
    根拠データ_実施後: String(getProp(p, '根拠データ（実施後）') ?? ''),
    備考:             String(getProp(p, '備考') ?? ''),
  }))
}

/**
 * 施策実行記録DB に新しい施策を登録する
 * Sprint #46 エンジンの提案をワンクリックで登録できる
 * @param municipalityId 自治体ID（省略時は 'yakushima'）
 */
export async function registerPolicy(
  notionKey:      string,
  policy:         RegisterPolicyRequest,
  municipalityId: string = 'yakushima'
): Promise<{ success: boolean; pageId?: string; url?: string }> {
  const cfg = getMunicipalityDbConfig(municipalityId)
  if (!cfg) return { success: false }
  const pdcaDbId = cfg.pdcaDbId

  const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { database_id: pdcaDbId },
      properties: {
        '施策名':    { title: [{ text: { content: policy.施策名 } }] },
        'ステータス': { select: { name: '検討中' } },
        'カテゴリ':  { select: { name: policy.カテゴリ } },
        '緊急度':    { select: { name: policy.緊急度 } },
        '担当部門':  { rich_text: [{ text: { content: policy.担当部門 } }] },
        '提案日':    { date: { start: today } },
        '期待効果':  { rich_text: [{ text: { content: policy.期待効果 } }] },
        '根拠データ（実施前）': {
          rich_text: [{ text: { content: policy.根拠データ_実施前 } }]
        },
      },
    }),
  })

  if (!res.ok) {
    console.error('[pdca] 施策登録失敗:', await res.text())
    return { success: false }
  }

  const created = await res.json() as { id: string; url?: string }
  return { success: true, pageId: created.id, url: created.url }
}

/**
 * 施策のステータスを更新する
 * UIのカンバンからドラッグ&ドロップ的に呼び出す
 */
export async function updatePolicyStatus(
  notionKey: string,
  pageId: string,
  update: {
    ステータス?: string
    実績効果?: string
    効果スコア?: number
    根拠データ_実施後?: string
    実施開始日?: string
    実施完了日?: string
  }
): Promise<boolean> {
  const properties: Record<string, unknown> = {}

  if (update.ステータス)
    properties['ステータス'] = { select: { name: update.ステータス } }
  if (update.実績効果)
    properties['実績効果'] = { rich_text: [{ text: { content: update.実績効果 } }] }
  if (update.効果スコア !== undefined)
    properties['効果スコア'] = { number: update.効果スコア }
  if (update.根拠データ_実施後)
    properties['根拠データ（実施後）'] = { rich_text: [{ text: { content: update.根拠データ_実施後 } }] }
  if (update.実施開始日)
    properties['実施開始日'] = { date: { start: update.実施開始日 } }
  if (update.実施完了日)
    properties['実施完了日'] = { date: { start: update.実施完了日 } }

  const res = await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ properties }),
  })

  return res.ok
}

// ─── データ変化の読み取り ─────────────────────────────────

/**
 * 5本のDBから「現在の主要指標」を取得してトレンド文を生成する
 * 実施前データ（文字列で保存）と比較するための最新スナップショット
 *
 * ※ 屋久島町専用。他の自治体では対応DBがないため空文字列を返す。
 */
async function fetchCurrentDataSnapshot(
  notionKey:      string,
  municipalityId: string = 'yakushima'
): Promise<{ school: string; ict: string; migration: string; tourism: string }> {
  // 屋久島町以外はスナップショット機能なし（施策データだけで評価）
  if (municipalityId !== 'yakushima') {
    return { school: '', ict: '', migration: '', tourism: '' }
  }
  // 学校DB: 安房小2025年の最新
  const schoolPages = await queryDb(notionKey, YAKUSHIMA_DB.school, {
    property: '学校名', title: { equals: '安房小学校' }
  })
  const schoolLatest = schoolPages.sort(
    (a, b) => (getProp(b, '年度') as number ?? 0) - (getProp(a, '年度') as number ?? 0)
  )[0]
  const school = schoolLatest
    ? `安房小学校最新: ${getProp(schoolLatest, '年度')}年度 ` +
      `${getProp(schoolLatest, '児童生徒数合計')}人、` +
      `複式学級${getProp(schoolLatest, '複式学級数')}クラス`
    : '学校データなし'

  // ICT DB: 安房小2025年
  const ictPages = await queryDb(notionKey, YAKUSHIMA_DB.ict)
  const ictLatest = ictPages.sort(
    (a, b) => (getProp(b, '年度') as number ?? 0) - (getProp(a, '年度') as number ?? 0)
  )[0]
  const ict = ictLatest
    ? `ICT最新(${getProp(ictLatest, '対象')} ${getProp(ictLatest, '年度')}): ` +
      `家庭Wi-Fi${getProp(ictLatest, '家庭Wi-Fi普及率')}%、` +
      `オンライン授業${getProp(ictLatest, 'オンライン授業実施回数')}回/年`
    : 'ICTデータなし'

  // 移住DB: 最新年度
  const migrationPages = await queryDb(notionKey, YAKUSHIMA_DB.migration, undefined, [
    { property: '年度', direction: 'descending' }
  ])
  const migLatest = migrationPages[0]
  const migration = migLatest
    ? `移住実績最新(${getProp(migLatest, '年度')}): ` +
      `リモートワーク移住${getProp(migLatest, 'リモートワーク移住者数')}人、` +
      `子育て世帯${getProp(migLatest, '子育て世帯数')}世帯`
    : '移住データなし'

  // 観光DB: 夏季ピーク（8月）
  const tourismPages = await queryDb(notionKey, YAKUSHIMA_DB.tourism, {
    property: '月', number: { equals: 8 }
  })
  const tourAug = tourismPages[0]
  const tourism = tourAug
    ? `観光ピーク(8月): 来訪${(getProp(tourAug, '来訪者数合計') as number ?? 0).toLocaleString()}人、` +
      `入山規制${getProp(tourAug, '入山規制日数')}日`
    : '観光データなし'

  return { school, ict, migration, tourism }
}

// ─── Claude による PDCA 総括評価 ──────────────────────────

/**
 * 完了済み施策・実施前後データをもとにClaudeが効果を評価し、
 * 次のアクションを提言する
 * @param municipalityName 自治体名（プロンプトに埋め込む。例: '屋久島町'）
 */
async function evaluatePdcaCycle(
  completedPolicies: PolicyRecord[],
  currentSnapshot:   { school: string; ict: string; migration: string; tourism: string },
  anthropicKey:      string,
  municipalityName:  string = '屋久島町'
): Promise<{ summary: string; recommendations: string[] }> {
  if (!completedPolicies.length) {
    return {
      summary: 'まだ完了した施策がありません。施策を実施してステータスを更新してください。',
      recommendations: [
        '施策実行記録DBに検討中の施策を「実施中」に変更して実行を開始してください',
        '完了した施策の「実績効果」と「効果スコア」を記入することでAI評価が機能します',
      ],
    }
  }

  const policiesSummary = completedPolicies.map(p =>
    `【${p.カテゴリ}】${p.施策名}\n` +
    `  実施前: ${p.根拠データ_実施前}\n` +
    `  実施後: ${p.根拠データ_実施後 || '未記入'}\n` +
    `  実績効果: ${p.実績効果 || '未記入'}\n` +
    `  効果スコア: ${p.効果スコア ?? '未評価'}/5`
  ).join('\n\n')

  // スナップショットが空でない場合のみデータセクションを追加
  const hasSnapshot = currentSnapshot.school || currentSnapshot.ict ||
                      currentSnapshot.migration || currentSnapshot.tourism
  const snapshotSection = hasSnapshot
    ? `\n## 現在のデータ（最新）\n${currentSnapshot.school}\n${currentSnapshot.ict}\n${currentSnapshot.migration}\n${currentSnapshot.tourism}`
    : ''

  const prompt = `あなたは${municipalityName}のPDCAサイクルを評価するアドバイザーAIです。
以下の完了施策とデータの現状から、効果の評価と次のアクションを提言してください。

## 完了施策
${policiesSummary}${snapshotSection}

以下のJSON形式で回答してください（コードブロックなし）:
{
  "summary": "PDCAサイクル全体の評価（2〜3文、具体的数値を含む）",
  "recommendations": ["次のアクション1", "次のアクション2", "次のアクション3"]
}`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return { summary: 'AI評価に失敗しました', recommendations: [] }

  const data = await res.json() as { content: Array<{ text: string }> }
  const text = data.content?.[0]?.text ?? '{}'

  try {
    const parsed = JSON.parse(text) as { summary?: string; recommendations?: string[] }
    return {
      summary: parsed.summary ?? 'AI評価を生成できませんでした',
      recommendations: parsed.recommendations ?? [],
    }
  } catch {
    return { summary: text.slice(0, 200), recommendations: [] }
  }
}

// ─── メインエントリーポイント ──────────────────────────────

/**
 * PDCA 効果測定を実行する
 * 完了施策の Before/After を分析し、AI が総括評価を生成
 * @param municipalityId 自治体ID（省略時は 'yakushima'）
 */
export async function runPdcaEvaluation(
  notionKey:      string,
  anthropicKey:   string,
  municipalityId: string = 'yakushima'
): Promise<PdcaEvaluationResult> {
  const municipalityName = getMunicipalityById(municipalityId).shortName
  console.log(`[pdca] PDCA 評価開始 (${municipalityName})`)

  try {
    // ── STEP 1: 全施策を取得 ──────────────────────────────
    const allPolicies = await fetchPolicies(notionKey, municipalityId)
    const completedPolicies = allPolicies.filter(p => p.ステータス === '完了')

    // 効果スコアの平均（登録済みのものだけ）
    const scores = completedPolicies
      .map(p => p.効果スコア)
      .filter((s): s is number => s !== null)
    const avgScore = scores.length
      ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
      : null

    // ── STEP 2: 最新データのスナップショット取得（屋久島専用） ──
    const snapshot = await fetchCurrentDataSnapshot(notionKey, municipalityId)

    // ── STEP 3: Claude による PDCA 総括 ──────────────────
    const { summary, recommendations } = await evaluatePdcaCycle(
      completedPolicies,
      snapshot,
      anthropicKey,
      municipalityName,
    )

    console.log(`[pdca] 完了施策${completedPolicies.length}件 / 全${allPolicies.length}件を評価`)

    return {
      success: true,
      summary,
      completedPolicies: completedPolicies.length,
      avgEffectScore:    avgScore ?? undefined,
      dataChanges: {
        schoolTrend:    snapshot.school,
        ictTrend:       snapshot.ict,
        migrationTrend: snapshot.migration,
        tourismTrend:   snapshot.tourism,
      },
      recommendations,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[pdca] エラー:', msg)
    return { success: false, error: msg }
  }
}
