// =====================================================
//  src/app/api/knowledge/route.ts
//  集合知ナレッジブラウザ API ルート — Sprint #21
//
//  ■ このファイルの役割
//    - GET : 集合知ナレッジ DB から事例一覧を取得。
//            課題カテゴリ・地域タイプ・SDL軸・タグで
//            フィルタ可能。評価スコア降順ソート。
//    - POST: 新しいナレッジ事例を 集合知ナレッジ DB に登録する
//
//  ■ 使用 Notion DB
//    集合知ナレッジ DB: 904e1be93bc2497387c2fbe8560fab5f
//
//  ■ データ項目
//    タイトル / 課題カテゴリ / 課題の概要 / 解決策・取り組み /
//    得られた効果 / 実施期間 / 地域タイプ / 登録自治体タイプ /
//    SDL軸（複数）/ タグ（複数）/ 評価スコア / 参考リンク / 登録日
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE  = 'https://api.notion.com/v1'
const NOTION_VERSION   = '2022-06-28'
const KNOWLEDGE_DB_ID  = '904e1be93bc2497387c2fbe8560fab5f'

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const filterCategory  = searchParams.get('category')   ?? ''
  const filterRegion    = searchParams.get('regionType')  ?? ''
  const filterSdl       = searchParams.get('sdlAxis')     ?? ''
  const filterTag       = searchParams.get('tag')         ?? ''

  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${KNOWLEDGE_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({
        page_size: 100,
        // 評価スコアの高い順に取得
        sorts: [{ property: '評価スコア', direction: 'descending' }],
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
        id:               r.id,
        title:            p['タイトル']?.title?.[0]?.plain_text          ?? '（タイトルなし）',
        category:         p['課題カテゴリ']?.select?.name                ?? '',
        overview:         p['課題の概要']?.rich_text?.[0]?.plain_text    ?? '',
        solution:         p['解決策・取り組み']?.rich_text?.[0]?.plain_text ?? '',
        effect:           p['得られた効果']?.rich_text?.[0]?.plain_text  ?? '',
        period:           p['実施期間']?.rich_text?.[0]?.plain_text      ?? '',
        regionType:       p['地域タイプ']?.select?.name                  ?? '',
        municipalityType: p['登録自治体タイプ']?.rich_text?.[0]?.plain_text ?? '',
        // multi_select フィールドは配列に変換
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sdlAxes:          (p['SDL軸']?.multi_select ?? []).map((s: any) => s.name) as string[],
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        tags:             (p['タグ']?.multi_select ?? []).map((s: any) => s.name) as string[],
        score:            p['評価スコア']?.number ?? null,
        link:             p['参考リンク']?.url ?? '',
        registeredDate:   p['登録日']?.date?.start ?? '',
      }
    })

    // ── クライアント側フィルタ（API側で処理）──
    if (filterCategory) records = records.filter((r: { category: string }) => r.category === filterCategory)
    if (filterRegion)   records = records.filter((r: { regionType: string }) => r.regionType === filterRegion)
    if (filterSdl)      records = records.filter((r: { sdlAxes: string[] }) => r.sdlAxes.includes(filterSdl))
    if (filterTag)      records = records.filter((r: { tags: string[] }) => r.tags.includes(filterTag))

    // ── サマリー集計 ──
    const total = records.length

    // 課題カテゴリ別件数
    const byCategory: Record<string, number> = {}
    records.forEach((r: { category: string }) => {
      if (r.category) byCategory[r.category] = (byCategory[r.category] ?? 0) + 1
    })

    // タグ別件数
    const byTag: Record<string, number> = {}
    records.forEach((r: { tags: string[] }) => {
      r.tags.forEach(tag => {
        byTag[tag] = (byTag[tag] ?? 0) + 1
      })
    })

    // SDL軸カバー数（何軸が使われているか）
    const sdlCovered = new Set<string>()
    records.forEach((r: { sdlAxes: string[] }) => r.sdlAxes.forEach(ax => sdlCovered.add(ax)))

    // 平均評価スコア
    const withScore = records.filter((r: { score: number | null }) => r.score !== null)
    const avgScore  = withScore.length > 0
      ? Math.round(
          withScore.reduce((s: number, r: { score: number }) => s + r.score, 0)
          / withScore.length * 10
        ) / 10
      : null

    return NextResponse.json({
      records,
      summary: {
        total,
        byCategory,
        byTag,
        sdlCoveredCount: sdlCovered.size,
        avgScore,
        successCount: byTag['成功事例'] ?? 0,
      },
    })
  } catch (err) {
    console.error('Knowledge GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  try {
    const body = await req.json()

    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'タイトルを入力してください' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      'タイトル': { title: [{ text: { content: body.title.trim() } }] },
    }

    // テキスト型
    if (body.overview?.trim())
      properties['課題の概要'] = { rich_text: [{ text: { content: body.overview.trim() } }] }
    if (body.solution?.trim())
      properties['解決策・取り組み'] = { rich_text: [{ text: { content: body.solution.trim() } }] }
    if (body.effect?.trim())
      properties['得られた効果'] = { rich_text: [{ text: { content: body.effect.trim() } }] }
    if (body.period?.trim())
      properties['実施期間'] = { rich_text: [{ text: { content: body.period.trim() } }] }
    if (body.municipalityType?.trim())
      properties['登録自治体タイプ'] = { rich_text: [{ text: { content: body.municipalityType.trim() } }] }

    // select 型
    if (body.category)   properties['課題カテゴリ'] = { select: { name: body.category } }
    if (body.regionType) properties['地域タイプ']   = { select: { name: body.regionType } }

    // multi_select 型
    if (Array.isArray(body.sdlAxes) && body.sdlAxes.length > 0)
      properties['SDL軸'] = { multi_select: body.sdlAxes.map((n: string) => ({ name: n })) }
    if (Array.isArray(body.tags) && body.tags.length > 0)
      properties['タグ'] = { multi_select: body.tags.map((n: string) => ({ name: n })) }

    // 数値型
    if (body.score !== undefined && body.score !== '')
      properties['評価スコア'] = { number: Number(body.score) }

    // URL型
    if (body.link?.trim())
      properties['参考リンク'] = { url: body.link.trim() }

    // 日付型
    if (body.registeredDate)
      properties['登録日'] = { date: { start: body.registeredDate } }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({ parent: { database_id: KNOWLEDGE_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const t = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${t}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `「${body.title}」を登録しました` })
  } catch (err) {
    console.error('Knowledge POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
