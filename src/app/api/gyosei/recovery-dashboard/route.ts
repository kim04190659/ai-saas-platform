// =====================================================
//  src/app/api/gyosei/recovery-dashboard/route.ts
//  復興進捗ダッシュボード API — Sprint #67
//
//  ■ 概要
//    復興事業進捗DBを取得し、カテゴリ別進捗・予算執行率・
//    遅延リスクを集計する。Claude Haikuが優先対応提言を3件生成。
//
//  ■ 事例自治体
//    輪島市（石川県）2024年 能登半島地震からの復興
//
//  ■ エンドポイント
//    GET /api/gyosei/recovery-dashboard?municipalityId=wajima
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getMunicipalityById } from '@/config/municipalities'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

// ─── 型定義 ──────────────────────────────────────────────

/** 復興事業1件の型 */
export type RecoveryProject = {
  id: string
  name: string          // 案件名
  municipality: string  // 自治体名
  category: string      // カテゴリ（住宅再建/インフラ/産業/医療/教育/コミュニティ）
  status: string        // ステータス（計画中/着工/施工中/完成/中断）
  progress: number      // 進捗率 0〜100
  budget: number        // 予算（万円）
  executed: number      // 執行額（万円）
  startDate: string     // 着工日
  plannedEnd: string    // 完了予定日
  division: string      // 担当課
  isDelayed: boolean    // 遅延フラグ
  notes: string         // 備考
  executionRate: number // 予算執行率 0〜100（計算値）
  delayRisk: 'HIGH' | 'MEDIUM' | 'LOW'  // 遅延リスク（計算値）
}

/** カテゴリ別集計 */
export type CategorySummary = {
  category: string
  totalProjects: number
  avgProgress: number
  delayedCount: number
  totalBudget: number
  totalExecuted: number
}

/** APIレスポンス */
export type RecoveryDashboardResponse = {
  municipalityName: string
  totalProjects: number
  completedProjects: number
  delayedProjects: number
  avgProgress: number
  totalBudget: number       // 総予算（万円）
  totalExecuted: number     // 総執行額（万円）
  executionRate: number     // 全体執行率
  projects: RecoveryProject[]
  categorySummaries: CategorySummary[]
  recommendations: string[] // Claude Haikuによる提言
  fetchedAt: string
}

// ─── 遅延リスク判定 ───────────────────────────────────────

/**
 * 遅延リスクを判定する
 * - 遅延フラグON → HIGH
 * - 施工中で進捗率30%未満 → MEDIUM
 * - その他 → LOW
 */
function calcDelayRisk(
  project: Omit<RecoveryProject, 'executionRate' | 'delayRisk'>
): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (project.isDelayed) return 'HIGH'
  if (project.status === '施工中' && project.progress < 30) return 'MEDIUM'
  return 'LOW'
}

// ─── カテゴリ別集計 ───────────────────────────────────────

function buildCategorySummaries(projects: RecoveryProject[]): CategorySummary[] {
  // カテゴリ一覧
  const categories = ['住宅再建', 'インフラ', '産業', '医療', '教育', 'コミュニティ']

  return categories
    .map((cat) => {
      const catProjects = projects.filter((p) => p.category === cat)
      if (catProjects.length === 0) return null

      const totalProjects = catProjects.length
      const avgProgress = Math.round(
        catProjects.reduce((sum, p) => sum + p.progress, 0) / totalProjects
      )
      const delayedCount = catProjects.filter((p) => p.isDelayed).length
      const totalBudget = catProjects.reduce((sum, p) => sum + p.budget, 0)
      const totalExecuted = catProjects.reduce((sum, p) => sum + p.executed, 0)

      return { category: cat, totalProjects, avgProgress, delayedCount, totalBudget, totalExecuted }
    })
    .filter((c): c is CategorySummary => c !== null)
}

// ─── Claude Haiku 提言生成 ────────────────────────────────

async function generateRecommendations(
  municipalityName: string,
  projects: RecoveryProject[],
  categorySummaries: CategorySummary[]
): Promise<string[]> {
  // 遅延リスクHIGHの案件を最大5件に絞ってAIに渡す
  const highRiskProjects = projects
    .filter((p) => p.delayRisk === 'HIGH')
    .slice(0, 5)
    .map((p) => ({
      name: p.name,
      category: p.category,
      progress: p.progress,
      executionRate: p.executionRate,
      notes: p.notes,
    }))

  // カテゴリ別遅延状況
  const catSummaryText = categorySummaries
    .map((c) => `${c.category}: 平均進捗${c.avgProgress}% 遅延${c.delayedCount}件`)
    .join(' / ')

  // 出力フォーマット（途中切れ防止のためコンパクトに）
  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"recommendations":["提言1（2文以内）","提言2（2文以内）","提言3（2文以内）"]}',
    '※ JSONのみ出力。説明文・コードブロック不要。',
  ].join('\n')

  const prompt = [
    `${municipalityName}の復興事業進捗状況を分析し、優先的に対処すべき3件の提言を生成してください。`,
    '',
    `【カテゴリ別進捗】${catSummaryText}`,
    '',
    `【遅延リスクHIGH案件】`,
    highRiskProjects.map((p) =>
      `・${p.name}（${p.category}）進捗${p.progress}% 執行率${p.executionRate}% 状況:${p.notes}`
    ).join('\n'),
    '',
    outputFormat,
  ].join('\n')

  try {
    const client = new Anthropic()
    const res = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })

    // stop_reason チェック（途中切れ警告）
    if (res.stop_reason === 'max_tokens') {
      console.warn('[recovery-dashboard] max_tokens に達したため出力が途中で切れている可能性があります')
    }

    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    // JSON部分を抽出してパース
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in AI response')
    const parsed = JSON.parse(jsonMatch[0]) as { recommendations?: string[] }
    return parsed.recommendations ?? []
  } catch (err) {
    console.error('[recovery-dashboard] AI提言生成エラー:', err)
    return []
  }
}

// ─── Notion DB フェッチ ──────────────────────────────────

async function fetchProjectsFromNotion(
  recoveryDbId: string,
  municipalityShortName: string
): Promise<RecoveryProject[]> {
  const notionToken = process.env.NOTION_API_KEY
  if (!notionToken) throw new Error('NOTION_API_KEY が設定されていません')

  const res = await fetch(`https://api.notion.com/v1/databases/${recoveryDbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      // 自治体名でフィルタリング（マルチテナント対応）
      filter: {
        property: '自治体名',
        select: { equals: municipalityShortName },
      },
      sorts: [
        { property: '遅延フラグ', direction: 'descending' },  // 遅延案件を先頭に
        { property: '進捗率',     direction: 'ascending' },   // 進捗の低い順
      ],
      page_size: 50,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion APIエラー: ${err}`)
  }

  const data = await res.json()

  // Notion レスポンスを RecoveryProject 型にマッピング
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.results.map((page: any) => {
    const p = page.properties

    const budget   = p['予算（万円）']?.number ?? 0
    const executed = p['執行額（万円）']?.number ?? 0
    const progress = p['進捗率']?.number ?? 0
    const isDelayed = p['遅延フラグ']?.checkbox ?? false

    const base = {
      id:           page.id,
      name:         p['案件名']?.title?.[0]?.plain_text ?? '',
      municipality: p['自治体名']?.select?.name ?? '',
      category:     p['カテゴリ']?.select?.name ?? '',
      status:       p['ステータス']?.select?.name ?? '',
      progress,
      budget,
      executed,
      startDate:    p['着工日']?.date?.start ?? '',
      plannedEnd:   p['完了予定日']?.date?.start ?? '',
      division:     p['担当課']?.rich_text?.[0]?.plain_text ?? '',
      isDelayed,
      notes:        p['備考']?.rich_text?.[0]?.plain_text ?? '',
    }

    const executionRate = budget > 0 ? Math.round((executed / budget) * 100) : 0
    const delayRisk = calcDelayRisk(base)

    return { ...base, executionRate, delayRisk }
  })
}

// ─── GETハンドラー ────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const municipalityId = searchParams.get('municipalityId') ?? 'wajima'

    // 自治体マスタからshortNameを取得
    const municipality = getMunicipalityById(municipalityId)

    // DB設定を取得
    const dbConf = getMunicipalityDbConfig(municipalityId)
    const recoveryDbId = dbConf?.recoveryDbId
    if (!recoveryDbId) {
      return NextResponse.json(
        { error: `municipalityId "${municipalityId}" に recoveryDbId が設定されていません` },
        { status: 400 }
      )
    }

    // Notionから復興事業データを取得
    const projects = await fetchProjectsFromNotion(recoveryDbId, municipality.shortName)

    if (projects.length === 0) {
      return NextResponse.json(
        { error: '復興事業データが見つかりませんでした' },
        { status: 404 }
      )
    }

    // ── 集計 ──────────────────────────────────────────────
    const totalProjects     = projects.length
    const completedProjects = projects.filter((p) => p.status === '完成').length
    const delayedProjects   = projects.filter((p) => p.isDelayed).length
    const avgProgress       = Math.round(
      projects.reduce((sum, p) => sum + p.progress, 0) / totalProjects
    )
    const totalBudget   = projects.reduce((sum, p) => sum + p.budget, 0)
    const totalExecuted = projects.reduce((sum, p) => sum + p.executed, 0)
    const executionRate = totalBudget > 0
      ? Math.round((totalExecuted / totalBudget) * 100)
      : 0

    // カテゴリ別集計
    const categorySummaries = buildCategorySummaries(projects)

    // Claude Haiku で提言生成（上位12件に絞って渡す）
    const topProjects = projects.slice(0, 12)
    const recommendations = await generateRecommendations(
      municipality.name,
      topProjects,
      categorySummaries
    )

    const response: RecoveryDashboardResponse = {
      municipalityName: municipality.name,
      totalProjects,
      completedProjects,
      delayedProjects,
      avgProgress,
      totalBudget,
      totalExecuted,
      executionRate,
      projects,
      categorySummaries,
      recommendations,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[recovery-dashboard] エラー:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
