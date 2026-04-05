// =====================================================
//  src/app/api/compare/route.ts
//  類似自治体比較分析 API ルート — Sprint #18
//
//  ■ このファイルの役割
//    - GET : 比較分析マスタ DB から自治体一覧を取得し、
//            地域タイプ・人口規模・RunWith導入状況でフィルタ対応
//    - POST: 新しい自治体データを 比較分析マスタ DB に登録する
//
//  ■ 使用 Notion DB
//    比較分析マスタ DB: f209f175d6f44efb9dee02c59d893aed
//
//  ■ データ項目
//    自治体名 / 都道府県 / 地域タイプ / 人口規模 / 総人口 /
//    高齢化率 / 財政力指数 / 主要産業 / Well-Beingスコア /
//    DX成熟度スコア / RunWith導入状況 / 参照元・出典 / 備考
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const COMPARE_DB_ID   = 'f209f175d6f44efb9dee02c59d893aed'

/** Notion API 共通ヘッダーを生成 */
function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ─────────────────────────────────────────────
// 比較分析マスタ DB から自治体一覧を取得

export async function GET(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  // URLパラメータでフィルタ可能（例: ?regionType=離島&runwith=導入済）
  const { searchParams } = new URL(req.url)
  const filterRegion  = searchParams.get('regionType') ?? ''
  const filterRunWith = searchParams.get('runwith') ?? ''

  try {
    // Notion DB を最大 100 件取得（自治体名の昇順）
    const res = await fetch(`${NOTION_API_BASE}/databases/${COMPARE_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({
        page_size: 100,
        sorts: [{ property: '自治体名', direction: 'ascending' }],
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${t}` }, { status: 500 })
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records = (data.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id:              r.id,
        name:            p['自治体名']?.title?.[0]?.plain_text       ?? '（名称なし）',
        prefecture:      p['都道府県']?.rich_text?.[0]?.plain_text   ?? '',
        regionType:      p['地域タイプ']?.select?.name               ?? '',
        sizeCategory:    p['人口規模']?.select?.name                  ?? '',
        population:      p['総人口']?.number                          ?? null,
        elderlyRate:     p['高齢化率（%）']?.number                   ?? null,
        fiscalStrength:  p['財政力指数']?.number                      ?? null,
        // 主要産業は multi_select なので配列として取得
        industries:      (p['主要産業']?.multi_select ?? []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (s: any) => s.name
        ),
        wellBeingScore:  p['Well-Beingスコア']?.number                ?? null,
        dxScore:         p['DX成熟度スコア']?.number                  ?? null,
        runwithStatus:   p['RunWith導入状況']?.select?.name           ?? '',
        source:          p['参照元・出典']?.rich_text?.[0]?.plain_text ?? '',
        notes:           p['備考']?.rich_text?.[0]?.plain_text        ?? '',
        registeredDate:  p['登録日']?.date?.start                     ?? '',
      }
    })

    // ── フィルタ処理（クエリパラメータが指定された場合） ──
    if (filterRegion)  records = records.filter((r: { regionType: string }) => r.regionType === filterRegion)
    if (filterRunWith) records = records.filter((r: { runwithStatus: string }) => r.runwithStatus === filterRunWith)

    // ── サマリー集計 ──
    const total = records.length

    // 地域タイプ別件数
    const byRegion: Record<string, number> = {}
    records.forEach((r: { regionType: string }) => {
      if (r.regionType) byRegion[r.regionType] = (byRegion[r.regionType] ?? 0) + 1
    })

    // RunWith導入状況別件数
    const byRunWith: Record<string, number> = {}
    records.forEach((r: { runwithStatus: string }) => {
      if (r.runwithStatus) byRunWith[r.runwithStatus] = (byRunWith[r.runwithStatus] ?? 0) + 1
    })

    // Well-Beingスコア平均（数値あるもののみ）
    const withWB = records.filter((r: { wellBeingScore: number | null }) => r.wellBeingScore !== null)
    const avgWellBeing = withWB.length > 0
      ? Math.round(
          withWB.reduce((s: number, r: { wellBeingScore: number }) => s + r.wellBeingScore, 0)
          / withWB.length * 10
        ) / 10
      : null

    // DX成熟度スコア平均
    const withDX = records.filter((r: { dxScore: number | null }) => r.dxScore !== null)
    const avgDXScore = withDX.length > 0
      ? Math.round(
          withDX.reduce((s: number, r: { dxScore: number }) => s + r.dxScore, 0)
          / withDX.length * 10
        ) / 10
      : null

    // 導入済み自治体の平均Well-Beingスコア（比較用）
    const introduced = records.filter((r: { runwithStatus: string; wellBeingScore: number | null }) =>
      r.runwithStatus === '導入済' && r.wellBeingScore !== null
    )
    const avgWBIntroduced = introduced.length > 0
      ? Math.round(
          introduced.reduce((s: number, r: { wellBeingScore: number }) => s + r.wellBeingScore, 0)
          / introduced.length * 10
        ) / 10
      : null

    return NextResponse.json({
      records,
      summary: {
        total,
        byRegion,
        byRunWith,
        avgWellBeing,
        avgDXScore,
        avgWBIntroduced,
      },
    })
  } catch (err) {
    console.error('Compare GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────
// 新しい自治体データを 比較分析マスタ DB に登録

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  try {
    const body = await req.json()

    // 自治体名は必須
    if (!body.name?.trim()) {
      return NextResponse.json({ error: '自治体名を入力してください' }, { status: 400 })
    }

    // ── Notion properties を構築 ──
    const properties: Record<string, unknown> = {
      // タイトル型（必須）
      '自治体名': { title: [{ text: { content: body.name.trim() } }] },
    }

    // テキスト型
    if (body.prefecture?.trim())
      properties['都道府県'] = { rich_text: [{ text: { content: body.prefecture.trim() } }] }
    if (body.source?.trim())
      properties['参照元・出典'] = { rich_text: [{ text: { content: body.source.trim() } }] }
    if (body.notes?.trim())
      properties['備考'] = { rich_text: [{ text: { content: body.notes.trim() } }] }

    // select 型
    if (body.regionType)
      properties['地域タイプ'] = { select: { name: body.regionType } }
    if (body.sizeCategory)
      properties['人口規模'] = { select: { name: body.sizeCategory } }
    if (body.runwithStatus)
      properties['RunWith導入状況'] = { select: { name: body.runwithStatus } }

    // multi_select 型（主要産業: 配列で受け取る）
    if (Array.isArray(body.industries) && body.industries.length > 0) {
      properties['主要産業'] = {
        multi_select: body.industries.map((name: string) => ({ name })),
      }
    }

    // 数値型
    if (body.population !== undefined && body.population !== '')
      properties['総人口'] = { number: Number(body.population) }
    if (body.elderlyRate !== undefined && body.elderlyRate !== '')
      properties['高齢化率（%）'] = { number: Number(body.elderlyRate) }
    if (body.fiscalStrength !== undefined && body.fiscalStrength !== '')
      properties['財政力指数'] = { number: Number(body.fiscalStrength) }
    if (body.wellBeingScore !== undefined && body.wellBeingScore !== '')
      properties['Well-Beingスコア'] = { number: Number(body.wellBeingScore) }
    if (body.dxScore !== undefined && body.dxScore !== '')
      properties['DX成熟度スコア'] = { number: Number(body.dxScore) }

    // 日付型
    if (body.registeredDate)
      properties['登録日'] = { date: { start: body.registeredDate } }

    // ── Notion にページ（レコード）を作成 ──
    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({ parent: { database_id: COMPARE_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const t = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${t}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `「${body.name}」を登録しました` })
  } catch (err) {
    console.error('Compare POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
