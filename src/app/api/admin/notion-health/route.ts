// =====================================================
//  src/app/api/admin/notion-health/route.ts
//  Notion ヘルスチェック API — Sprint #79
//
//  ■ 役割
//    Notion API の疎通確認を行い、障害を検知する。
//    正常時・障害時ともに詳細なステータスを返す。
//    障害検知時には管理者（ADMIN_LINE_USER_ID）へ LINE 通知を送る。
//
//  ■ 呼び出し元
//    - Vercel Cron: /api/cron/notion-health-check（5分ごと）
//    - 管理者画面: /admin/system-health（手動チェック）
//    - GET /api/admin/notion-health
//
//  ■ レスポンス
//    { status, notionStatus, responseMs, checkedAt, message }
//
//  ■ 環境変数
//    NOTION_API_KEY       : Notion API トークン
//    LINE_CHANNEL_ACCESS_TOKEN : LINE 送信用トークン
//    ADMIN_LINE_USER_ID   : 管理者の LINE ユーザーID（障害通知先）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { pushMessage }               from '@/lib/line-push'

// ─── Notion への疎通確認リクエスト ────────────────────
// /v1/users/me は最も軽量なエンドポイント（データ取得なし）

const NOTION_PING_URL = 'https://api.notion.com/v1/users/me'
const NOTION_VERSION  = '2022-06-28'

// ─── ステータス型定義 ─────────────────────────────────

export interface NotionHealthResult {
  status:      'ok' | 'degraded' | 'down'
  notionStatus: number | null   // HTTP ステータスコード（null = 接続タイムアウト）
  responseMs:  number           // 応答時間（ms）
  checkedAt:   string           // ISO 8601 形式
  message:     string           // 人間向けメッセージ
}

// ─── メイン処理 ───────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse> {
  const notionKey    = process.env.NOTION_API_KEY            ?? ''
  const lineToken    = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
  const adminUserId  = process.env.ADMIN_LINE_USER_ID        ?? ''

  // クエリパラメータ: notify=false にすると LINE 通知をスキップ（手動確認時）
  const notify = req.nextUrl.searchParams.get('notify') !== 'false'

  const checkedAt = new Date().toISOString()
  const startMs   = Date.now()

  // ── Notion API にリクエスト ──────────────────────────
  let notionStatus: number | null = null
  let responseMs   = 0

  try {
    const res = await fetch(NOTION_PING_URL, {
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Notion-Version': NOTION_VERSION,
      },
      // 10秒でタイムアウト（Notion が返答しない場合）
      signal: AbortSignal.timeout(10_000),
    })

    responseMs   = Date.now() - startMs
    notionStatus = res.status

  } catch (err) {
    // タイムアウト or ネットワークエラー
    responseMs = Date.now() - startMs
    notionStatus = null
  }

  // ── ステータス判定 ────────────────────────────────────
  // ok:       200〜299 かつ応答 < 5秒
  // degraded: 200〜299 だが応答が遅い（5秒以上）
  // down:     4xx/5xx または タイムアウト

  let status: NotionHealthResult['status']
  let message: string

  if (notionStatus !== null && notionStatus >= 200 && notionStatus < 300) {
    if (responseMs < 5_000) {
      status  = 'ok'
      message = `Notion API 正常（${responseMs}ms）`
    } else {
      status  = 'degraded'
      message = `Notion API 応答遅延（${responseMs}ms — 通常より遅い）`
    }
  } else if (notionStatus !== null) {
    status  = 'down'
    message = `Notion API エラー（HTTP ${notionStatus}）`
  } else {
    status  = 'down'
    message = `Notion API タイムアウト（${responseMs}ms 以内に応答なし）`
  }

  const result: NotionHealthResult = {
    status,
    notionStatus,
    responseMs,
    checkedAt,
    message,
  }

  // ── 障害時は管理者へ LINE 通知 ────────────────────────
  if ((status === 'down' || status === 'degraded') && notify && lineToken && adminUserId) {
    const emoji    = status === 'down' ? '🚨' : '⚠️'
    const severity = status === 'down' ? '障害発生' : '応答遅延'

    const lineText = [
      `${emoji} RunWith Platform — Notion ${severity}`,
      '',
      `ステータス: ${message}`,
      `検知時刻: ${new Date(checkedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}`,
      '',
      status === 'down'
        ? '現在 Notion に接続できません。バックアップデータで業務を継続してください。'
        : 'Notion の応答が遅くなっています。しばらく様子を見てください。',
      '',
      '▶ 管理画面で詳細を確認',
      'https://run-with.vercel.app/admin/system-health',
    ].join('\n')

    // 管理者個人への push 通知（住民への broadcast とは別）
    await pushMessage(adminUserId, lineText, lineToken).catch((err) => {
      console.error('[notion-health] LINE 通知送信失敗:', err)
    })
  }

  // ── レスポンス返却 ────────────────────────────────────
  const httpStatus = status === 'ok' ? 200 : status === 'degraded' ? 200 : 503
  return NextResponse.json(result, { status: httpStatus })
}
