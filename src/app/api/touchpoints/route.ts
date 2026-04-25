// =====================================================
//  src/app/api/touchpoints/route.ts
//  タッチポイントイベント API ルート — Sprint #16
//
//  ■ このファイルの役割
//    - GET : タッチポイントイベント DB から活動記録一覧を取得する
//    - POST: フォームの入力値を受け取り SDL価値共創スコアを自動計算し
//            タッチポイントイベント DB に記録する
//
//  ■ SDL価値共創スコア計算式
//    スコア = (接触後の課題解決度+1) × 継続意向係数 × 接触者属性重み
//    ÷ 12 × 100   → 0〜100pt に正規化
//    最大: (3+1) × 2.0（紹介あり） × 1.5（移住者） = 12 → 100pt
//
//  ■ 使用 Notion DB
//    タッチポイントイベント DB: 16f70d3d19c04be6842564af0e5461ea
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityById } from '@/config/municipalities'

// ─── 定数 ─────────────────────────────────────────────
const NOTION_API_BASE  = 'https://api.notion.com/v1'
const NOTION_VERSION   = '2022-06-28'
const TOUCHPOINT_DB_ID = '16f70d3d19c04be6842564af0e5461ea'

// ─── SDL スコア計算用マップ ──────────────────────────

/** 継続意向 → 係数 */
const INTENTION_COEFF: Record<string, number> = {
  '高（また来る）': 1.5,
  '紹介あり':       2.0,
  '中（様子見）':   1.0,
  '低（一度限り）': 0.5,
}

/** 接触者属性 → 重み */
const ATTRIBUTE_WEIGHT: Record<string, number> = {
  '住民（定住）':  1.2,
  '住民（移住者）': 1.5,
  '観光来訪者':    0.8,
  '関係人口':      1.3,
  '事業者':        1.0,
  'その他':        0.5,
}

// ─── 型定義 ──────────────────────────────────────────

/** POST リクエストの型（フォームから受け取るデータ） */
interface TouchpointInput {
  eventId:          string   // イベントID（タイトル、必須）
  touchpointType:   string   // タッチポイント種別
  visitorAttribute: string   // 接触者属性
  visitorAge:       string   // 接触者年代
  purposeCategory:  string   // 来訪目的カテゴリ
  continuationIntent: string // 継続意向
  problemBefore:    number   // 接触前の課題レベル（1〜3）
  problemAfter:     number   // 接触後の課題解決度（0〜3）
  contactMinutes:   number   // 接触時間（分）
  department:       string   // 担当職員部署
  municipalityName: string   // 自治体名
  aiMemo:           string   // AI洞察メモ
  recordDate:       string   // 記録日（YYYY-MM-DD）
}

// ─── ヘルパー関数 ─────────────────────────────────────

/** Notion API 共通ヘッダーを生成 */
function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

/**
 * SDL 価値共創スコアを計算する（0〜100pt）
 *
 * 計算式:
 *   (課題解決度+1) × 継続意向係数 × 接触者属性重み ÷ 12 × 100
 *
 *   課題解決度: 0=未解決, 1=部分解決, 2=完全解決, 3=次ステップへ繋げた
 *   継続意向係数: 高=1.5, 紹介あり=2.0, 中=1.0, 低=0.5
 *   接触者属性重み: 移住者=1.5, 定住=1.2, 関係人口=1.3, 事業者=1.0, 観光=0.8, その他=0.5
 */
function calcSDLScore(input: TouchpointInput): number {
  const solutionPt  = input.problemAfter + 1                        // 1〜4
  const intentCoeff = INTENTION_COEFF[input.continuationIntent] ?? 1.0
  const attrWeight  = ATTRIBUTE_WEIGHT[input.visitorAttribute]  ?? 1.0
  const raw         = solutionPt * intentCoeff * attrWeight         // 最大 12
  return Math.round(Math.min(100, Math.max(0, (raw / 12) * 100)))
}

// ─── GET ハンドラ ─────────────────────────────────────
// タッチポイントイベント一覧を取得

// Sprint #36: NextRequest を受け取り municipalityId クエリを処理するように変更
export async function GET(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  // ── Sprint #36: クエリパラメータから自治体IDを取得 ──
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'
  const municipality     = getMunicipalityById(municipalityId)

  try {
    // 自治体名でフィルタリングして記録日の新しい順で最大 100 件取得（マルチテナント対応）
    const res = await fetch(`${NOTION_API_BASE}/databases/${TOUCHPOINT_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
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
      const errText = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${errText}` }, { status: 500 })
    }

    const data = await res.json()

    // Notion レコードを扱いやすい形に変換
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = data.results?.map((r: any) => {
      const p = r.properties
      return {
        id:               r.id,
        eventId:          p['イベントID']?.title?.[0]?.plain_text      ?? '（IDなし）',
        touchpointType:   p['タッチポイント種別']?.select?.name         ?? '',
        visitorAttribute: p['接触者属性']?.select?.name                 ?? '',
        visitorAge:       p['接触者年代']?.select?.name                  ?? '',
        purposeCategory:  p['来訪目的カテゴリ']?.select?.name           ?? '',
        continuationIntent: p['継続意向']?.select?.name                  ?? '',
        problemBefore:    p['接触前の課題レベル']?.number                ?? 0,
        problemAfter:     p['接触後の課題解決度']?.number                ?? 0,
        contactMinutes:   p['接触時間（分）']?.number                    ?? 0,
        sdlScore:         p['SDL価値共創スコア']?.number                 ?? 0,
        department:       p['担当職員部署']?.select?.name                ?? '',
        municipalityName: p['自治体名']?.rich_text?.[0]?.plain_text      ?? '',
        aiMemo:           p['AI洞察メモ']?.rich_text?.[0]?.plain_text    ?? '',
        recordDate:       p['記録日']?.date?.start                       ?? '',
      }
    }) ?? []

    // ── サマリー集計 ──
    const total = records.length
    const thisMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const thisMonthCount = records.filter((r: { recordDate: string }) =>
      r.recordDate.startsWith(thisMonth)
    ).length
    const avgSDL = total > 0
      ? Math.round(records.reduce((s: number, r: { sdlScore: number }) => s + r.sdlScore, 0) / total)
      : 0
    const highIntentCount = records.filter((r: { continuationIntent: string }) =>
      r.continuationIntent === '高（また来る）' || r.continuationIntent === '紹介あり'
    ).length

    // タッチポイント種別ごとの件数（グラフ用）
    const byType: Record<string, number> = {}
    records.forEach((r: { touchpointType: string }) => {
      if (r.touchpointType) {
        byType[r.touchpointType] = (byType[r.touchpointType] ?? 0) + 1
      }
    })

    return NextResponse.json({
      records,
      summary: { total, thisMonthCount, avgSDL, highIntentCount, byType },
    })
  } catch (err) {
    console.error('Touchpoints GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── POST ハンドラ ─────────────────────────────────────
// 新しいタッチポイントイベントを Notion に記録する

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: TouchpointInput = await req.json()

    // ── 入力バリデーション ──
    if (!body.eventId?.trim()) {
      return NextResponse.json({ error: 'イベントIDを入力してください' }, { status: 400 })
    }

    // ── SDL スコアを自動計算 ──
    const sdlScore = calcSDLScore(body)

    // ── Notion properties を構築 ──
    const properties: Record<string, unknown> = {
      // タイトル型
      'イベントID': { title: [{ text: { content: body.eventId.trim() } }] },
      // 数値型
      '接触前の課題レベル':   { number: body.problemBefore },
      '接触後の課題解決度':   { number: body.problemAfter },
      '接触時間（分）':       { number: body.contactMinutes },
      'SDL価値共創スコア':    { number: sdlScore },
      // 日付型
      '記録日': { date: { start: body.recordDate } },
    }

    // select 型: 値がある場合のみセット
    if (body.touchpointType)    properties['タッチポイント種別']  = { select: { name: body.touchpointType } }
    if (body.visitorAttribute)  properties['接触者属性']          = { select: { name: body.visitorAttribute } }
    if (body.visitorAge)        properties['接触者年代']           = { select: { name: body.visitorAge } }
    if (body.purposeCategory)   properties['来訪目的カテゴリ']     = { select: { name: body.purposeCategory } }
    if (body.continuationIntent) properties['継続意向']            = { select: { name: body.continuationIntent } }
    if (body.department)        properties['担当職員部署']         = { select: { name: body.department } }

    // テキスト型
    if (body.municipalityName?.trim()) {
      properties['自治体名'] = { rich_text: [{ text: { content: body.municipalityName.trim() } }] }
    }
    if (body.aiMemo?.trim()) {
      properties['AI洞察メモ'] = { rich_text: [{ text: { content: body.aiMemo.trim() } }] }
    }

    // ── Notion にページ（レコード）を作成 ──
    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({
        parent:     { database_id: TOUCHPOINT_DB_ID },
        properties,
      }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    return NextResponse.json({
      success:  true,
      sdlScore,
      message:  `タッチポイントを記録しました（SDL価値共創スコア: ${sdlScore}点）`,
    })
  } catch (err) {
    console.error('Touchpoints POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
