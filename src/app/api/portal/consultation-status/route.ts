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

// ─── デモ用サンプルデータ ─────────────────────────────
// Notion DB にデータがない場合のデモ・開発用フォールバック。
// 本番運用では Notion 側に実レコードを登録することで自動的に使われなくなる。

const SAMPLE_DATA: Record<string, ConsultationStatusResponse> = {
  'anon-yk-001': { found: true, status: '完了',   category: '生活・環境',   receivedAt: '2026-04-12T09:30:00', answeredAt: '2026-04-12T14:00:00', department: '住民課',        answer: 'ゴミ分別マニュアルをお送りします。水道の開栓手続きは役場住民課（0997-46-2111）にお電話ください。' },
  'anon-yk-002': { found: true, status: '完了',   category: '観光・体験',   receivedAt: '2026-04-10T14:15:00', answeredAt: '2026-04-10T17:00:00', department: '観光課',        answer: '平日早朝（5〜7時スタート）が比較的空いています。許可証は事前予約制をご利用ください。' },
  'anon-yk-003': { found: true, status: '対応中', category: '子育て・教育', receivedAt: '2026-04-11T10:00:00', answeredAt: '',                    department: '福祉課',        answer: '現在空き状況を確認中です。確認でき次第ご連絡いたします。' },
  'anon-yk-004': { found: true, status: '完了',   category: '防災・安全',   receivedAt: '2026-04-09T16:45:00', answeredAt: '2026-04-09T17:30:00', department: '総務課',        answer: '宮之浦地区の避難所は「屋久島環境文化村センター」です。防災マップをお送りします。' },
  'anon-yk-005': { found: true, status: '未対応', category: '税・手続き',   receivedAt: '2026-04-13T09:00:00', answeredAt: '',                    department: '',              answer: '' },
  'anon-kr-001': { found: true, status: '完了',   category: '観光・体験',   receivedAt: '2026-04-11T10:30:00', answeredAt: '2026-04-11T15:00:00', department: '観光課',        answer: '元旦は大変混雑します。臨時駐車場（霧島高校グラウンド）をご利用ください。シャトルバスも運行します。' },
  'anon-kr-002': { found: true, status: '対応中', category: '税・手続き',   receivedAt: '2026-04-10T13:00:00', answeredAt: '',                    department: '収納課',        answer: '分割納付のご相談は収納課（0995-45-5111）にてお受けしています。' },
  'anon-kr-003': { found: true, status: '完了',   category: 'インフラ・環境', receivedAt: '2026-04-09T08:15:00', answeredAt: '2026-04-09T12:00:00', department: '建設課',       answer: '現地を確認しました。本日中に補修工事を行います。ご連絡いただきありがとうございます。' },
  'anon-kr-004': { found: true, status: '完了',   category: '子育て・教育', receivedAt: '2026-04-12T09:45:00', answeredAt: '2026-04-12T11:00:00', department: '子育て支援課',  answer: '隼人児童センターで本日14時以降お受けできます。事前にお電話での予約をお願いします。' },
  'anon-kr-005': { found: true, status: '未対応', category: '生活・環境',   receivedAt: '2026-04-13T07:30:00', answeredAt: '',                    department: '',              answer: '' },
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

    // ── レコードが見つからない場合 → サンプルデータを参照 ──
    // Notion に実レコードがない場合はデモ用サンプルにフォールバック。
    // 本番運用では Notion にデータが入るため自動的にサンプルは使われなくなる。
    if (!data.results || data.results.length === 0) {
      const sample = SAMPLE_DATA[anonymousId]
      if (sample) return NextResponse.json(sample)
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
