// =====================================================
//  src/app/api/line-consultation/route.ts
//  LINE相談ログ API ルート — Sprint #15
//
//  ■ このファイルの役割
//    - GET  : LINE相談ログ DB から相談一覧を取得する
//             クエリパラメータ ?status=未対応 でフィルタリング可能
//    - PATCH: 対応状況・回答内容・担当職員名・担当部署を更新する
//             職員が画面から対応状況を変更するために使用
//
//  ■ 使用 Notion DB
//    LINE相談ログ DB: d3c225835ec440f495bf79cd737eb862
//
//  ■ 対応状況の選択肢
//    未対応 / 対応中 / 完了 / エスカレーション
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// ─── 定数 ─────────────────────────────────────────────
const NOTION_API_BASE   = 'https://api.notion.com/v1'
const NOTION_VERSION    = '2022-06-28'
// LINE相談ログ DB の ID
const LINE_LOG_DB_ID    = 'd3c225835ec440f495bf79cd737eb862'

// ─── 型定義 ──────────────────────────────────────────

/** API が返す相談1件の型 */
interface ConsultationRecord {
  id:              string
  title:           string   // 相談タイトル
  content:         string   // 相談内容
  category:        string   // 相談種別
  channel:         string   // チャンネル（住民LINE / 職員LINE）
  status:          string   // 対応状況
  answer:          string   // 回答内容
  staffName:       string   // 担当職員名
  department:      string   // 担当部署
  aiResult:        string   // AI振り分け結果
  anonymousId:     string   // 匿名ID
  receivedAt:      string   // 受信日時
  satisfaction:    number   // 住民満足度
}

/** PATCH リクエストの型 */
interface UpdateRequest {
  id:          string   // Notion ページ ID（必須）
  status?:     string   // 対応状況（変更する場合）
  answer?:     string   // 回答内容（記録する場合）
  staffName?:  string   // 担当職員名（記録する場合）
  department?: string   // 担当部署（変更する場合）
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

// ─── GET ハンドラ ─────────────────────────────────────
// LINE相談ログ一覧を取得してフロントに返す

export async function GET(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  // クエリパラメータ ?status=未対応 でフィルタリング（省略時は全件）
  const statusFilter = req.nextUrl.searchParams.get('status')

  try {
    // ── Notion DB クエリ ──
    // 受信日時の新しい順で最大 100 件取得
    const queryBody: Record<string, unknown> = {
      page_size: 100,
      sorts: [{ property: '受信日時', direction: 'descending' }],
    }

    // ステータスでフィルタリングする場合
    if (statusFilter) {
      queryBody.filter = {
        property: '対応状況',
        select:   { equals: statusFilter },
      }
    }

    const res = await fetch(`${NOTION_API_BASE}/databases/${LINE_LOG_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify(queryBody),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${errText}` }, { status: 500 })
    }

    const data = await res.json()

    // Notion レコードを扱いやすい形に変換
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: ConsultationRecord[] = data.results?.map((r: any) => {
      const p = r.properties
      return {
        id:           r.id,
        title:        p['相談タイトル']?.title?.[0]?.plain_text   ?? '（タイトルなし）',
        content:      p['相談内容']?.rich_text?.[0]?.plain_text    ?? '',
        category:     p['相談種別']?.select?.name                  ?? '',
        channel:      p['チャンネル']?.select?.name                ?? '',
        status:       p['対応状況']?.select?.name                  ?? '未対応',
        answer:       p['回答内容']?.rich_text?.[0]?.plain_text    ?? '',
        staffName:    p['担当職員名']?.rich_text?.[0]?.plain_text  ?? '',
        department:   p['担当部署']?.select?.name                  ?? '',
        aiResult:     p['AI振り分け結果']?.rich_text?.[0]?.plain_text ?? '',
        anonymousId:  p['匿名ID']?.rich_text?.[0]?.plain_text      ?? '',
        receivedAt:   p['受信日時']?.date?.start                   ?? '',
        satisfaction: p['住民満足度']?.number                      ?? 0,
      }
    }) ?? []

    // ── サマリー集計 ──
    // ステータス別件数を集計してフロントのカード表示用に返す
    const total            = records.length
    const unhandledCount   = records.filter(r => r.status === '未対応').length
    const inProgressCount  = records.filter(r => r.status === '対応中').length
    const completedCount   = records.filter(r => r.status === '完了').length
    const escalatedCount   = records.filter(r => r.status === 'エスカレーション').length
    // 完了率（0件の場合は0%）
    const completionRate   = total > 0 ? Math.round((completedCount / total) * 100) : 0

    return NextResponse.json({
      records,
      summary: {
        total,
        unhandledCount,
        inProgressCount,
        completedCount,
        escalatedCount,
        completionRate,
      },
    })
  } catch (err) {
    console.error('LineConsultation GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── PATCH ハンドラ ───────────────────────────────────
// 対応状況・回答内容などを更新する（職員が画面から操作）

export async function PATCH(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: UpdateRequest = await req.json()

    // ── 入力バリデーション ──
    if (!body.id) {
      return NextResponse.json({ error: '相談IDが必要です' }, { status: 400 })
    }

    // ── 更新する properties を構築 ──
    // 値が指定されたフィールドだけを更新する（undefined のフィールドは変更しない）
    const properties: Record<string, unknown> = {}

    if (body.status) {
      // select 型: { select: { name: 値 } }
      properties['対応状況'] = { select: { name: body.status } }
    }
    if (body.answer !== undefined) {
      // rich_text 型: テキストコンテンツを配列で渡す
      properties['回答内容'] = {
        rich_text: body.answer.trim()
          ? [{ text: { content: body.answer.trim() } }]
          : [],
      }
    }
    if (body.staffName !== undefined) {
      properties['担当職員名'] = {
        rich_text: body.staffName.trim()
          ? [{ text: { content: body.staffName.trim() } }]
          : [],
      }
    }
    if (body.department) {
      properties['担当部署'] = { select: { name: body.department } }
    }

    // ── Notion ページを更新 ──
    // PATCH /pages/{page_id} で既存レコードのプロパティを上書き
    const notionRes = await fetch(`${NOTION_API_BASE}/pages/${body.id}`, {
      method:  'PATCH',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({ properties }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion更新エラー: ${errText}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `対応状況を「${body.status ?? '—'}」に更新しました`,
    })
  } catch (err) {
    console.error('LineConsultation PATCH エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
