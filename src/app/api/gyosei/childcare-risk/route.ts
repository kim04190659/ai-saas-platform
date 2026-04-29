// =====================================================
//  src/app/api/gyosei/childcare-risk/route.ts
//  子育て世帯流出リスク検知AI API — Sprint #69
//
//  ■ 概要
//    子育て相談DBを取得し、転出懸念スコアをもとに
//    「転出しそうな世帯」を早期検知する。
//    Claude HaikuがカテゴリBESTフォロー施策を3件提言。
//
//  ■ 事例自治体
//    神埼市（佐賀県）少子化が深刻な中規模市
//
//  ■ エンドポイント
//    GET /api/gyosei/childcare-risk?municipalityId=kanzaki
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getMunicipalityById } from '@/config/municipalities'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

// ─── 型定義 ──────────────────────────────────────────────

/** 相談レコード1件の型 */
export type ChildcareRecord = {
  id: string
  consultationId: string   // 相談者ID
  municipality: string     // 自治体名
  childAge: string         // 子どもの年齢
  household: string        // 世帯状況
  category: string         // 相談カテゴリ
  departureFlag: boolean   // 転出懸念フラグ
  departureScore: number   // 転出懸念スコア（0〜100）
  consultCount: number     // 相談回数（過去6ヶ月）
  followStatus: string     // フォロー状況
  content: string          // 相談内容
  staff: string            // 担当者
  consultDate: string      // 相談日
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW'  // リスクレベル（計算値）
}

/** カテゴリ別集計 */
export type CategoryRiskSummary = {
  category: string
  totalCount: number
  highRiskCount: number
  avgDepartureScore: number
}

/** APIレスポンス */
export type ChildcareRiskResponse = {
  municipalityName: string
  totalRecords: number
  highRiskCount: number      // スコア70以上
  mediumRiskCount: number    // スコア40〜69
  lowRiskCount: number       // スコア39以下
  unhandledCount: number     // 未対応件数
  avgDepartureScore: number  // 平均転出懸念スコア
  records: ChildcareRecord[]
  categorySummaries: CategoryRiskSummary[]
  recommendations: string[]  // Claude Haikuによる施策提言
  fetchedAt: string
}

// ─── リスクレベル判定 ──────────────────────────────────────

function calcRiskLevel(score: number, flag: boolean): 'HIGH' | 'MEDIUM' | 'LOW' {
  if (flag && score >= 70) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

// ─── カテゴリ別集計 ───────────────────────────────────────

function buildCategorySummaries(records: ChildcareRecord[]): CategoryRiskSummary[] {
  const categories = ['保育所待機', '医療・健康', '転出相談', '経済支援', '発達支援', 'その他']

  return categories
    .map((cat) => {
      const catRecords = records.filter((r) => r.category === cat)
      if (catRecords.length === 0) return null

      const totalCount = catRecords.length
      const highRiskCount = catRecords.filter((r) => r.riskLevel === 'HIGH').length
      const avgDepartureScore = Math.round(
        catRecords.reduce((sum, r) => sum + r.departureScore, 0) / totalCount
      )

      return { category: cat, totalCount, highRiskCount, avgDepartureScore }
    })
    .filter((c): c is CategoryRiskSummary => c !== null)
}

// ─── Claude Haiku 施策提言生成 ────────────────────────────

async function generateRecommendations(
  municipalityName: string,
  records: ChildcareRecord[],
  categorySummaries: CategoryRiskSummary[]
): Promise<string[]> {
  // HIGH リスク世帯を最大5件に絞る
  const highRiskRecords = records
    .filter((r) => r.riskLevel === 'HIGH')
    .slice(0, 5)
    .map((r) => ({
      category: r.category,
      score: r.departureScore,
      household: r.household,
      content: r.content,
    }))

  // カテゴリ別サマリー
  const catText = categorySummaries
    .map((c) => `${c.category}: ${c.totalCount}件 高リスク${c.highRiskCount}件 平均スコア${c.avgDepartureScore}`)
    .join(' / ')

  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"recommendations":["施策提言1（2文以内）","施策提言2（2文以内）","施策提言3（2文以内）"]}',
    '※ JSONのみ出力。説明文・コードブロック不要。',
  ].join('\n')

  const prompt = [
    `${municipalityName}の子育て世帯転出リスクを分析し、今すぐ実施すべき引き止め施策を3件提言してください。`,
    '',
    `【カテゴリ別状況】${catText}`,
    '',
    '【高リスク世帯の声】',
    highRiskRecords.map((r) =>
      `・${r.category}（${r.household}）スコア${r.score} 「${r.content.slice(0, 60)}…」`
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

    if (res.stop_reason === 'max_tokens') {
      console.warn('[childcare-risk] max_tokens に達したため出力が途中で切れている可能性があります')
    }

    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in AI response')
    const parsed = JSON.parse(jsonMatch[0]) as { recommendations?: string[] }
    return parsed.recommendations ?? []
  } catch (err) {
    console.error('[childcare-risk] AI提言生成エラー:', err)
    return []
  }
}

// ─── Notion DB フェッチ ──────────────────────────────────

async function fetchRecordsFromNotion(
  childcareDbId: string,
  municipalityShortName: string
): Promise<ChildcareRecord[]> {
  const notionToken = process.env.NOTION_API_KEY
  if (!notionToken) throw new Error('NOTION_API_KEY が設定されていません')

  const res = await fetch(`https://api.notion.com/v1/databases/${childcareDbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      filter: {
        property: '自治体名',
        select: { equals: municipalityShortName },
      },
      sorts: [
        { property: '転出懸念スコア', direction: 'descending' },  // スコア高い順
      ],
      page_size: 50,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion APIエラー: ${err}`)
  }

  const data = await res.json()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return data.results.map((page: any) => {
    const p = page.properties

    const departureScore = p['転出懸念スコア']?.number ?? 0
    const departureFlag  = p['転出懸念フラグ']?.checkbox ?? false

    return {
      id:             page.id,
      consultationId: p['相談者ID']?.title?.[0]?.plain_text ?? '',
      municipality:   p['自治体名']?.select?.name ?? '',
      childAge:       p['子どもの年齢']?.select?.name ?? '',
      household:      p['世帯状況']?.select?.name ?? '',
      category:       p['相談カテゴリ']?.select?.name ?? '',
      departureFlag,
      departureScore,
      consultCount:   p['相談回数（過去6ヶ月）']?.number ?? 0,
      followStatus:   p['フォロー状況']?.select?.name ?? '',
      content:        p['相談内容']?.rich_text?.[0]?.plain_text ?? '',
      staff:          p['担当者']?.rich_text?.[0]?.plain_text ?? '',
      consultDate:    p['相談日']?.date?.start ?? '',
      riskLevel:      calcRiskLevel(departureScore, departureFlag),
    }
  })
}

// ─── GETハンドラー ────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const municipalityId = searchParams.get('municipalityId') ?? 'kanzaki'

    const municipality = getMunicipalityById(municipalityId)

    const dbConf = getMunicipalityDbConfig(municipalityId)
    const childcareDbId = dbConf?.childcareDbId
    if (!childcareDbId) {
      return NextResponse.json(
        { error: `municipalityId "${municipalityId}" に childcareDbId が設定されていません` },
        { status: 400 }
      )
    }

    const records = await fetchRecordsFromNotion(childcareDbId, municipality.shortName)

    if (records.length === 0) {
      return NextResponse.json(
        { error: '子育て相談データが見つかりませんでした' },
        { status: 404 }
      )
    }

    // ── 集計 ──────────────────────────────────────────────
    const totalRecords      = records.length
    const highRiskCount     = records.filter((r) => r.riskLevel === 'HIGH').length
    const mediumRiskCount   = records.filter((r) => r.riskLevel === 'MEDIUM').length
    const lowRiskCount      = records.filter((r) => r.riskLevel === 'LOW').length
    const unhandledCount    = records.filter((r) => r.followStatus === '未対応').length
    const avgDepartureScore = Math.round(
      records.reduce((sum, r) => sum + r.departureScore, 0) / totalRecords
    )

    const categorySummaries = buildCategorySummaries(records)

    // Claude Haiku 提言（上位12件に絞る）
    const topRecords = records.slice(0, 12)
    const recommendations = await generateRecommendations(
      municipality.name,
      topRecords,
      categorySummaries
    )

    const response: ChildcareRiskResponse = {
      municipalityName: municipality.name,
      totalRecords,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      unhandledCount,
      avgDepartureScore,
      records,
      categorySummaries,
      recommendations,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[childcare-risk] エラー:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
