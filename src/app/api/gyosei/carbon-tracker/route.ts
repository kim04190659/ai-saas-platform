// =====================================================
//  src/app/api/gyosei/carbon-tracker/route.ts
//  CO2削減進捗トラッカー API — Sprint #68
//
//  ■ 概要
//    CO2削減活動DBを取得し、カテゴリ別削減量・達成率・
//    総合スコアを集計する。Claude HaikuがAI四半期総括を生成。
//
//  ■ 事例自治体
//    上勝町（徳島県）2020年ゼロカーボン宣言・45種類分別リサイクル
//
//  ■ エンドポイント
//    GET /api/gyosei/carbon-tracker?municipalityId=kamikatsu
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getMunicipalityById } from '@/config/municipalities'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

// ─── 型定義 ──────────────────────────────────────────────

/** CO2削減活動1件の型 */
export type CarbonActivity = {
  id: string
  name: string            // 活動名
  municipality: string    // 自治体名
  category: string        // カテゴリ（再エネ/EV・モビリティ/廃棄物削減/森林吸収/省エネ）
  status: string          // ステータス（実施中/達成/計画中/中断）
  baselineValue: number   // 基準年数値
  currentValue: number    // 現在数値
  reductionCo2: number    // 削減量（CO2-t）
  achievementRate: number // 達成率（%）
  period: string          // 計測期間（四半期）
  division: string        // 担当課
  notes: string           // 備考
}

/** カテゴリ別集計 */
export type CarbonCategorySummary = {
  category: string
  totalActivities: number
  achievedCount: number      // 達成済み件数
  totalReductionCo2: number  // 累計削減量（CO2-t）
  avgAchievementRate: number // 平均達成率
}

/** APIレスポンス */
export type CarbonTrackerResponse = {
  municipalityName: string
  totalActivities: number
  achievedCount: number        // 達成済み件数
  inProgressCount: number      // 実施中件数
  plannedCount: number         // 計画中件数
  totalReductionCo2: number    // 総削減量（CO2-t）
  avgAchievementRate: number   // 全体平均達成率
  overallScore: number         // 総合スコア（0〜100）
  activities: CarbonActivity[]
  categorySummaries: CarbonCategorySummary[]
  aiAssessment: string[]       // Claude Haikuによる四半期総括
  fetchedAt: string
}

// ─── カテゴリ別集計 ───────────────────────────────────────

function buildCategorySummaries(activities: CarbonActivity[]): CarbonCategorySummary[] {
  const categories = ['再エネ', 'EV・モビリティ', '廃棄物削減', '森林吸収', '省エネ']

  return categories
    .map((cat) => {
      const catActivities = activities.filter((a) => a.category === cat)
      if (catActivities.length === 0) return null

      const totalActivities = catActivities.length
      const achievedCount = catActivities.filter((a) => a.status === '達成').length
      const totalReductionCo2 = catActivities.reduce((sum, a) => sum + a.reductionCo2, 0)
      const avgAchievementRate = Math.round(
        catActivities.reduce((sum, a) => sum + a.achievementRate, 0) / totalActivities
      )

      return { category: cat, totalActivities, achievedCount, totalReductionCo2, avgAchievementRate }
    })
    .filter((c): c is CarbonCategorySummary => c !== null)
}

// ─── 総合スコア算出 ────────────────────────────────────────

/**
 * ゼロカーボン達成度スコア（0〜100）
 * 達成率の加重平均。達成済み活動にボーナス加算。
 */
function calcOverallScore(activities: CarbonActivity[]): number {
  if (activities.length === 0) return 0
  const baseScore = activities.reduce((sum, a) => sum + a.achievementRate, 0) / activities.length
  const achievedBonus = (activities.filter((a) => a.status === '達成').length / activities.length) * 10
  return Math.min(100, Math.round(baseScore + achievedBonus))
}

// ─── Claude Haiku AI四半期総括 ────────────────────────────

async function generateAiAssessment(
  municipalityName: string,
  activities: CarbonActivity[],
  categorySummaries: CarbonCategorySummary[],
  totalReductionCo2: number,
  overallScore: number
): Promise<string[]> {
  // カテゴリ別サマリーテキスト
  const catText = categorySummaries
    .map((c) => `${c.category}: 削減量${c.totalReductionCo2}t 達成率${c.avgAchievementRate}%`)
    .join(' / ')

  // 進捗遅れの活動（達成率50%未満かつ実施中）
  const laggingActivities = activities
    .filter((a) => a.achievementRate < 50 && a.status === '実施中')
    .slice(0, 3)
    .map((a) => `・${a.name}（${a.category}）達成率${a.achievementRate}% 備考:${a.notes}`)
    .join('\n')

  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"assessment":["総括コメント（2文以内）","加速が必要な取り組み（1〜2文）","次四半期の重点施策提言（1〜2文）"]}',
    '※ JSONのみ出力。説明文・コードブロック不要。',
  ].join('\n')

  const prompt = [
    `${municipalityName}のゼロカーボン進捗を分析し、四半期総括コメントを3件生成してください。`,
    '',
    `【全体スコア】${overallScore}/100点 | 総削減量: ${totalReductionCo2}t-CO2`,
    `【カテゴリ別】${catText}`,
    '',
    laggingActivities ? `【進捗遅れの活動】\n${laggingActivities}` : '【進捗遅れ活動なし】',
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
      console.warn('[carbon-tracker] max_tokens に達したため出力が途中で切れている可能性があります')
    }

    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in AI response')
    const parsed = JSON.parse(jsonMatch[0]) as { assessment?: string[] }
    return parsed.assessment ?? []
  } catch (err) {
    console.error('[carbon-tracker] AI総括生成エラー:', err)
    return []
  }
}

// ─── Notion DB フェッチ ──────────────────────────────────

async function fetchActivitiesFromNotion(
  carbonDbId: string,
  municipalityShortName: string
): Promise<CarbonActivity[]> {
  const notionToken = process.env.NOTION_API_KEY
  if (!notionToken) throw new Error('NOTION_API_KEY が設定されていません')

  const res = await fetch(`https://api.notion.com/v1/databases/${carbonDbId}/query`, {
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
        { property: 'カテゴリ',     direction: 'ascending' },   // カテゴリ順
        { property: '達成率（%）',  direction: 'descending' },  // 達成率の高い順
      ],
      page_size: 50,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion APIエラー: ${err}`)
  }

  const data = await res.json()

  // Notion レスポンスを CarbonActivity 型にマッピング
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.results.map((page: any) => {
    const p = page.properties

    return {
      id:              page.id,
      name:            p['活動名']?.title?.[0]?.plain_text ?? '',
      municipality:    p['自治体名']?.select?.name ?? '',
      category:        p['カテゴリ']?.select?.name ?? '',
      status:          p['ステータス']?.select?.name ?? '',
      baselineValue:   p['基準年数値']?.number ?? 0,
      currentValue:    p['現在数値']?.number ?? 0,
      reductionCo2:    p['削減量（CO2-t）']?.number ?? 0,
      achievementRate: p['達成率（%）']?.number ?? 0,
      period:          p['計測期間']?.select?.name ?? '',
      division:        p['担当課']?.rich_text?.[0]?.plain_text ?? '',
      notes:           p['備考']?.rich_text?.[0]?.plain_text ?? '',
    }
  })
}

// ─── GETハンドラー ────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const municipalityId = searchParams.get('municipalityId') ?? 'kamikatsu'

    // 自治体マスタからshortNameを取得
    const municipality = getMunicipalityById(municipalityId)

    // DB設定を取得
    const dbConf = getMunicipalityDbConfig(municipalityId)
    const carbonDbId = dbConf?.carbonDbId
    if (!carbonDbId) {
      return NextResponse.json(
        { error: `municipalityId "${municipalityId}" に carbonDbId が設定されていません` },
        { status: 400 }
      )
    }

    // Notionから活動データを取得
    const activities = await fetchActivitiesFromNotion(carbonDbId, municipality.shortName)

    if (activities.length === 0) {
      return NextResponse.json(
        { error: 'CO2削減活動データが見つかりませんでした' },
        { status: 404 }
      )
    }

    // ── 集計 ──────────────────────────────────────────────
    const totalActivities  = activities.length
    const achievedCount    = activities.filter((a) => a.status === '達成').length
    const inProgressCount  = activities.filter((a) => a.status === '実施中').length
    const plannedCount     = activities.filter((a) => a.status === '計画中').length
    const totalReductionCo2 = activities.reduce((sum, a) => sum + a.reductionCo2, 0)
    const avgAchievementRate = Math.round(
      activities.reduce((sum, a) => sum + a.achievementRate, 0) / totalActivities
    )
    const overallScore = calcOverallScore(activities)

    // カテゴリ別集計
    const categorySummaries = buildCategorySummaries(activities)

    // Claude Haiku でAI四半期総括を生成（上位12件に絞る）
    const topActivities = activities.slice(0, 12)
    const aiAssessment = await generateAiAssessment(
      municipality.name,
      topActivities,
      categorySummaries,
      totalReductionCo2,
      overallScore
    )

    const response: CarbonTrackerResponse = {
      municipalityName: municipality.name,
      totalActivities,
      achievedCount,
      inProgressCount,
      plannedCount,
      totalReductionCo2,
      avgAchievementRate,
      overallScore,
      activities,
      categorySummaries,
      aiAssessment,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[carbon-tracker] エラー:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
