// =====================================================
//  src/app/api/revenue/route.ts
//  収益・財政データ分析 API ルート — Sprint #17
//
//  ■ このファイルの役割
//    - GET : 収益データ DB から一覧を取得し、種別・地域タイプ別に集計する
//    - POST: 新しいデータポイントを Notion DB に登録する
//
//  ■ 使用 Notion DB
//    収益データ DB: 00dc2b2f34ef44f78f8dd6551258a9f2
//
//  ■ データ種別
//    ガイド記録 / 宿泊稼働 / SNS感情 / 産品販売 / EC転換 / 周遊パターン / 環境負荷 / その他
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityById } from '@/config/municipalities'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const REVENUE_DB_ID   = '00dc2b2f34ef44f78f8dd6551258a9f2'

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ─────────────────────────────────────────────

// Sprint #35: NextRequest を受け取り municipalityId クエリを処理するように変更
export async function GET(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  // ── Sprint #35: クエリパラメータから自治体IDを取得 ──
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'
  const municipality     = getMunicipalityById(municipalityId)

  try {
    // 自治体名でフィルタリングして収益データを取得（マルチテナント対応）
    const res = await fetch(`${NOTION_API_BASE}/databases/${REVENUE_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({
        filter: {
          property: '自治体名',
          rich_text: { contains: municipality.shortName },
        },
        page_size: 100,
        sorts: [{ property: '記録日', direction: 'descending' }],
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${t}` }, { status: 500 })
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = (data.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id:          r.id,
        name:        p['データ名']?.title?.[0]?.plain_text     ?? '（名称なし）',
        dataType:    p['データ種別']?.select?.name              ?? '',
        regionType:  p['地域タイプ']?.select?.name             ?? '',
        reliability: p['信頼度']?.select?.name                  ?? '',
        value:       p['数値']?.number                          ?? null,
        baseValue:   p['比較基準値']?.number                    ?? null,
        unit:        p['単位']?.rich_text?.[0]?.plain_text      ?? '',
        municipality: p['自治体名']?.rich_text?.[0]?.plain_text ?? '',
        period:      p['記録期間']?.rich_text?.[0]?.plain_text  ?? '',
        aiHint:      p['AI提言への示唆']?.rich_text?.[0]?.plain_text ?? '',
        recordDate:  p['記録日']?.date?.start                   ?? '',
      }
    })

    // ── サマリー集計 ──
    const total      = records.length
    const withAiHint = records.filter((r: { aiHint: string }) => r.aiHint).length

    // 基準値との比較が可能なレコードで平均乖離率を算出
    const comparable = records.filter((r: { value: number | null; baseValue: number | null }) =>
      r.value !== null && r.baseValue !== null && r.baseValue !== 0
    )
    const avgDeviation = comparable.length > 0
      ? Math.round(
          comparable.reduce((s: number, r: { value: number; baseValue: number }) =>
            s + ((r.value - r.baseValue) / r.baseValue) * 100, 0
          ) / comparable.length
        )
      : null

    // 種別ごとの件数集計
    const byType: Record<string, number> = {}
    records.forEach((r: { dataType: string }) => {
      if (r.dataType) byType[r.dataType] = (byType[r.dataType] ?? 0) + 1
    })

    // 最新の記録（AI提言示唆つき）を最大5件ピックアップ
    const recentWithHint = records
      .filter((r: { aiHint: string }) => r.aiHint)
      .slice(0, 5)

    return NextResponse.json({
      records,
      summary: { total, withAiHint, avgDeviation, byType },
      recentWithHint,
    })
  } catch (err) {
    console.error('Revenue GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  try {
    const body = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'データ名を入力してください' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      'データ名': { title: [{ text: { content: body.name.trim() } }] },
    }

    if (body.dataType)    properties['データ種別']  = { select: { name: body.dataType } }
    if (body.regionType)  properties['地域タイプ']  = { select: { name: body.regionType } }
    if (body.reliability) properties['信頼度']       = { select: { name: body.reliability } }
    if (body.value !== undefined && body.value !== '')
      properties['数値']      = { number: Number(body.value) }
    if (body.baseValue !== undefined && body.baseValue !== '')
      properties['比較基準値'] = { number: Number(body.baseValue) }
    if (body.unit?.trim())
      properties['単位']       = { rich_text: [{ text: { content: body.unit.trim() } }] }
    if (body.municipality?.trim())
      properties['自治体名']   = { rich_text: [{ text: { content: body.municipality.trim() } }] }
    if (body.period?.trim())
      properties['記録期間']   = { rich_text: [{ text: { content: body.period.trim() } }] }
    if (body.aiHint?.trim())
      properties['AI提言への示唆'] = { rich_text: [{ text: { content: body.aiHint.trim() } }] }
    if (body.recordDate)
      properties['記録日'] = { date: { start: body.recordDate } }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({ parent: { database_id: REVENUE_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const t = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${t}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `「${body.name}」を記録しました` })
  } catch (err) {
    console.error('Revenue POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
