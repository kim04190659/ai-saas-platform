// =====================================================
//  src/app/api/gyosei/local-industry/route.ts
//  地場産業6次産業化支援AI API — Sprint #70
//
//  ■ 概要
//    地場産業台帳DBを取得し、後継者空白リスクスコアを計算。
//    Claude HaikuがAI分析（「5年後に消えるリスクがある産業×支援施策」）を提言。
//
//  ■ 事例自治体
//    気仙沼市（宮城県）水産業都市
//
//  ■ エンドポイント
//    GET /api/gyosei/local-industry?municipalityId=kesennuma
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { getMunicipalityById } from '@/config/municipalities'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

// ─── 型定義 ──────────────────────────────────────────────

/** 地場産業1件の型 */
export type LocalIndustryRecord = {
  id: string
  industryName: string       // 産業名
  municipality: string       // 自治体名
  industryType: string       // 産業種
  businessCount: number      // 事業者数
  employeeCount: number      // 従業員数合計
  avgOwnerAge: number        // 事業者平均年齢
  successorStatus: string    // 後継者有無
  successorRisk: 'HIGH' | 'MEDIUM' | 'LOW'  // 後継者空白リスク
  annualRevenue: number      // 年商（百万円）
  mainChannel: string        // 主要販路
  sixthIndustryStatus: string // 6次産業化状況
  subsidyEligible: boolean   // 補助金対象
  issueMemo: string          // 課題メモ
  staff: string              // 担当者
  registeredDate: string     // 登録日
}

/** 産業種別集計 */
export type IndustryTypeSummary = {
  industryType: string
  count: number
  highRiskCount: number
  totalRevenue: number      // 合計年商（百万円）
  avgOwnerAge: number       // 平均事業者年齢
}

/** APIレスポンス */
export type LocalIndustryResponse = {
  municipalityName: string
  totalRecords: number
  highRiskCount: number       // 後継者空白リスクHIGH件数
  mediumRiskCount: number
  lowRiskCount: number
  extinctionRisk5yr: number   // 5年以内に消えるリスクのある産業数（HIGH+一部MEDIUM）
  totalRevenue: number        // 全産業合計年商（百万円）
  avgOwnerAge: number         // 全産業平均事業者年齢
  records: LocalIndustryRecord[]
  typeSummaries: IndustryTypeSummary[]
  recommendations: AiRecommendation[]  // Claude Haikuによる支援施策提言
  fetchedAt: string
}

/** AI提言1件 */
export type AiRecommendation = {
  industryName: string   // 対象産業
  riskLevel: string      // HIGH/MEDIUM
  policy: string         // 提言する施策（2文以内）
}

// ─── 産業種別集計 ────────────────────────────────────────

function buildTypeSummaries(records: LocalIndustryRecord[]): IndustryTypeSummary[] {
  // 産業種の一覧を動的に取得
  const types = [...new Set(records.map((r) => r.industryType))]

  return types.map((type) => {
    const typeRecords = records.filter((r) => r.industryType === type)
    const totalCount = typeRecords.length
    const highRiskCount = typeRecords.filter((r) => r.successorRisk === 'HIGH').length
    const totalRevenue = typeRecords.reduce((sum, r) => sum + r.annualRevenue, 0)
    const avgOwnerAge = Math.round(
      typeRecords.reduce((sum, r) => sum + r.avgOwnerAge, 0) / totalCount
    )

    return { industryType: type, count: totalCount, highRiskCount, totalRevenue, avgOwnerAge }
  }).sort((a, b) => b.highRiskCount - a.highRiskCount)  // 高リスク多い順
}

// ─── Claude Haiku 支援施策提言生成 ───────────────────────

async function generateRecommendations(
  municipalityName: string,
  records: LocalIndustryRecord[],
  typeSummaries: IndustryTypeSummary[]
): Promise<AiRecommendation[]> {
  // HIGH/MEDIUMリスク産業を最大8件に絞る
  const atRiskRecords = records
    .filter((r) => r.successorRisk === 'HIGH' || r.successorRisk === 'MEDIUM')
    .slice(0, 8)
    .map((r) => ({
      name: r.industryName,
      type: r.industryType,
      risk: r.successorRisk,
      avgAge: r.avgOwnerAge,
      successor: r.successorStatus,
      sixthIndustry: r.sixthIndustryStatus,
      revenue: r.annualRevenue,
      issue: r.issueMemo.slice(0, 80),
    }))

  // 産業種別サマリー
  const typeSummaryText = typeSummaries
    .map((t) => `${t.industryType}: ${t.count}産業 高リスク${t.highRiskCount}件 合計${t.totalRevenue}百万円 平均${t.avgOwnerAge}歳`)
    .join(' / ')

  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"recommendations":[{"industryName":"産業名","riskLevel":"HIGH|MEDIUM","policy":"施策提言（2文以内）"},最大5件]}',
    '※ JSONのみ出力。説明文・コードブロック不要。',
  ].join('\n')

  const prompt = [
    `${municipalityName}の地場産業の後継者断絶・衰退リスクを分析し、今すぐ実施すべき6次産業化・後継者育成施策を産業ごとに提言してください。`,
    '',
    `【産業種別状況】${typeSummaryText}`,
    '',
    '【リスクが高い産業の詳細】',
    atRiskRecords.map((r) =>
      `・${r.name}（${r.type}）リスク${r.risk} 平均${r.avgAge}歳 後継者:${r.successor} 6次産業化:${r.sixthIndustry} 「${r.issue}」`
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
      console.warn('[local-industry] max_tokens に達したため出力が途中で切れている可能性があります')
    }

    const raw = res.content[0].type === 'text' ? res.content[0].text : ''
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('JSON not found in AI response')
    const parsed = JSON.parse(jsonMatch[0]) as { recommendations?: AiRecommendation[] }
    return parsed.recommendations ?? []
  } catch (err) {
    console.error('[local-industry] AI提言生成エラー:', err)
    return []
  }
}

// ─── Notion DB フェッチ ──────────────────────────────────

async function fetchRecordsFromNotion(
  localIndustryDbId: string,
  municipalityShortName: string
): Promise<LocalIndustryRecord[]> {
  const notionToken = process.env.NOTION_API_KEY
  if (!notionToken) throw new Error('NOTION_API_KEY が設定されていません')

  const res = await fetch(`https://api.notion.com/v1/databases/${localIndustryDbId}/query`, {
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
        // HIGH > MEDIUM > LOW の順に並べたいが select では難しいため年商降順で代用
        { property: '年商（百万円）', direction: 'descending' },
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

    // 後継者空白リスク（未設定の場合はMEDIUMとして扱う）
    const rawRisk = p['後継者空白リスク']?.select?.name ?? 'MEDIUM'
    const successorRisk: 'HIGH' | 'MEDIUM' | 'LOW' =
      rawRisk === 'HIGH' ? 'HIGH' : rawRisk === 'LOW' ? 'LOW' : 'MEDIUM'

    return {
      id:                   page.id,
      industryName:         p['産業名']?.title?.[0]?.plain_text ?? '',
      municipality:         p['自治体名']?.select?.name ?? '',
      industryType:         p['産業種']?.select?.name ?? '',
      businessCount:        p['事業者数']?.number ?? 0,
      employeeCount:        p['従業員数合計']?.number ?? 0,
      avgOwnerAge:          p['事業者平均年齢']?.number ?? 0,
      successorStatus:      p['後継者有無']?.select?.name ?? '',
      successorRisk,
      annualRevenue:        p['年商（百万円）']?.number ?? 0,
      mainChannel:          p['主要販路']?.select?.name ?? '',
      sixthIndustryStatus:  p['6次産業化状況']?.select?.name ?? '',
      subsidyEligible:      p['補助金対象']?.checkbox ?? false,
      issueMemo:            p['課題メモ']?.rich_text?.[0]?.plain_text ?? '',
      staff:                p['担当者']?.rich_text?.[0]?.plain_text ?? '',
      registeredDate:       p['登録日']?.date?.start ?? '',
    }
  })
}

// ─── リスク順ソート ───────────────────────────────────────

function sortByRisk(records: LocalIndustryRecord[]): LocalIndustryRecord[] {
  const order = { HIGH: 0, MEDIUM: 1, LOW: 2 }
  return [...records].sort((a, b) => order[a.successorRisk] - order[b.successorRisk])
}

// ─── GETハンドラー ────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const municipalityId = searchParams.get('municipalityId') ?? 'kesennuma'

    const municipality = getMunicipalityById(municipalityId)

    const dbConf = getMunicipalityDbConfig(municipalityId)
    const localIndustryDbId = dbConf?.localIndustryDbId
    if (!localIndustryDbId) {
      return NextResponse.json(
        { error: `municipalityId "${municipalityId}" に localIndustryDbId が設定されていません` },
        { status: 400 }
      )
    }

    const rawRecords = await fetchRecordsFromNotion(localIndustryDbId, municipality.shortName)

    if (rawRecords.length === 0) {
      return NextResponse.json(
        { error: '地場産業データが見つかりませんでした' },
        { status: 404 }
      )
    }

    // リスク順にソート
    const records = sortByRisk(rawRecords)

    // ── 集計 ──────────────────────────────────────────────
    const totalRecords    = records.length
    const highRiskCount   = records.filter((r) => r.successorRisk === 'HIGH').length
    const mediumRiskCount = records.filter((r) => r.successorRisk === 'MEDIUM').length
    const lowRiskCount    = records.filter((r) => r.successorRisk === 'LOW').length
    // 5年以内消滅リスク = HIGH + 後継者なしのMEDIUM
    const extinctionRisk5yr = records.filter(
      (r) => r.successorRisk === 'HIGH' ||
        (r.successorRisk === 'MEDIUM' && r.successorStatus === 'なし')
    ).length
    const totalRevenue = records.reduce((sum, r) => sum + r.annualRevenue, 0)
    const avgOwnerAge  = Math.round(
      records.reduce((sum, r) => sum + r.avgOwnerAge, 0) / totalRecords
    )

    const typeSummaries = buildTypeSummaries(records)

    // Claude Haiku 提言（上位8件に絞る）
    const topRecords = records.slice(0, 8)
    const recommendations = await generateRecommendations(
      municipality.name,
      topRecords,
      typeSummaries
    )

    const response: LocalIndustryResponse = {
      municipalityName: municipality.name,
      totalRecords,
      highRiskCount,
      mediumRiskCount,
      lowRiskCount,
      extinctionRisk5yr,
      totalRevenue,
      avgOwnerAge,
      records,
      typeSummaries,
      recommendations,
      fetchedAt: new Date().toISOString(),
    }

    return NextResponse.json(response)
  } catch (err) {
    console.error('[local-industry] エラー:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : '不明なエラー' },
      { status: 500 }
    )
  }
}
