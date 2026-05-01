// =====================================================
//  src/app/api/portal/consultation-status/route.ts
//  住民ポータル：相談状況照会API — Sprint #82-A
//
//  ■ 役割
//    住民が匿名ID（受付番号）を入力して自分の相談状況を確認するための
//    公開APIエンドポイント。
//
//  ■ セキュリティ方針
//    - LINE_UserID など個人を特定できる情報は返さない
//    - 匿名IDが一致するレコードの「状況・回答」のみ返す
//    - NOTION_API_KEY はサーバー側のみで使用（クライアントに露出しない）
//
//  ■ 使い方
//    GET /api/portal/consultation-status?anonymousId=anon-yk-001
//
//  ■ レスポンス例
//    { found: true, status: '完了', answer: '...', receivedAt: '...', category: '...' }
//    { found: false }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// ─── 定数 ─────────────────────────────────────────────
const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
// LINE相談ログ DB（全自治体共通）
const LINE_LOG_DB_ID  = 'd3c225835ec440f495bf79cd737eb862'

// ─── 型定義 ──────────────────────────────────────────

/** 住民に返すレスポンスの型（センシティブ情報を除外） */
interface ConsultationStatusResponse {
  found:       boolean
  status?:     string   // 未対応 / 対応中 / 完了 / エスカレーション
  category?:   string   // 相談種別（例: 生活・環境）
  receivedAt?: string   // 受信日時
  answeredAt?: string   // 回答日時（解決日）
  answer?:     string   // 回答内容（対応中・完了のみ）
  department?: string   // 担当部署（どこが対応しているか）
}

// ─── GET ハンドラ ─────────────────────────────────────
// 匿名IDに一致する相談レコードを検索して状況を返す

export async function GET(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ found: false, error: 'サーバー設定エラー' }, { status: 500 })
  }

  // クエリパラメータから匿名IDを取得
  const anonymousId = req.nextUrl.searchParams.get('anonymousId')?.trim()

  // 匿名IDが指定されていない場合はエラー
  if (!anonymousId) {
    return NextResponse.json(
      { found: false, error: '受付番号（anonymousId）を指定してください' },
      { status: 400 },
    )
  }

  try {
    // ── Notion DB を匿名IDで検索 ──────────────────────
    // rich_text の contains フィルターで部分一致検索
    const res = await fetch(`${NOTION_API_BASE}/databases/${LINE_LOG_DB_ID}/query`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${notionApiKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        page_size: 1,  // 匿名IDは一意のため1件で十分
        filter: {
          property: '匿名ID',
          rich_text: { equals: anonymousId },  // 完全一致
        },
      }),
    })

    if (!res.ok) {
      console.error('[portal] Notion エラー:', await res.text())
      return NextResponse.json({ found: false, error: 'データ取得エラー' }, { status: 500 })
    }

    const data = await res.json()

    // ── レコードが見つからない場合 ───────────────────
    if (!data.results || data.results.length === 0) {
      return NextResponse.json({ found: false })
    }

    // ── レコードが見つかった場合：安全なフィールドのみ返す ──
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data.results[0] as any
    const p = r.properties

    const status     = p['対応状況']?.select?.name                    ?? '未対応'
    const category   = p['相談種別']?.select?.name                    ?? ''
    const receivedAt = p['受信日時']?.date?.start                     ?? ''
    const answeredAt = p['解決日']?.date?.start                       ?? ''
    const department = p['担当部署']?.select?.name                    ?? ''

    // 回答内容は「対応中」または「完了」の場合のみ返す
    // 「未対応」の場合は回答がないため空文字を返す
    const answer = (status === '対応中' || status === '完了')
      ? (p['回答内容']?.rich_text?.[0]?.plain_text ?? '')
      : ''

    const response: ConsultationStatusResponse = {
      found: true,
      status,
      category,
      receivedAt,
      answeredAt,
      answer,
      department,
    }

    return NextResponse.json(response)

  } catch (err) {
    console.error('[portal] GET エラー:', err)
    return NextResponse.json({ found: false, error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
