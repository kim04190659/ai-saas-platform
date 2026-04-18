// =====================================================
//  src/app/api/line-reply/route.ts
//  LINE プッシュ返信 API — Sprint #27
//
//  ■ 役割
//    職員がWebシステムから住民のLINEに直接返信するためのAPI。
//    replyToken は30秒で失効するため、後から返信するには
//    「プッシュメッセージ」を使う。
//    プッシュメッセージは lineUserId（実際のLINEユーザーID）が必要。
//
//  ■ データフロー
//    職員が返答内容を入力 → 「📱 LINEに返信」ボタン
//      ↓ POST /api/line-reply
//    LINE Messaging API（push message）
//      ↓
//    住民のLINEに直接メッセージが届く
//
//  ■ 必要な環境変数
//    LINE_CHANNEL_ACCESS_TOKEN: Vercelに設定済み
//
//  ■ LINE Messaging API プッシュメッセージ制限
//    - フリープランは月1000通まで無料
//    - 有料プランで無制限対応可能
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// LINE Messaging API プッシュメッセージエンドポイント
const LINE_API_PUSH = 'https://api.line.me/v2/bot/message/push'

// ─── POST ハンドラ ────────────────────────────────────

export async function POST(req: NextRequest) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

  // アクセストークンが設定されていない場合はエラー
  if (!accessToken) {
    return NextResponse.json(
      { error: 'LINE_CHANNEL_ACCESS_TOKEN が設定されていません。Vercelの環境変数を確認してください。' },
      { status: 500 }
    )
  }

  // ── リクエストボディを解析 ──
  let lineUserId: string
  let message: string

  try {
    const body = await req.json()
    lineUserId = body.lineUserId ?? ''
    message    = body.message    ?? ''
  } catch {
    return NextResponse.json({ error: 'リクエストの形式が不正です' }, { status: 400 })
  }

  // ── バリデーション ──
  if (!lineUserId) {
    return NextResponse.json(
      { error: 'lineUserId が必要です（LINEユーザーIDが記録されていない相談には返信できません）' },
      { status: 400 }
    )
  }
  if (!message.trim()) {
    return NextResponse.json({ error: '返信内容が空です' }, { status: 400 })
  }
  // メッセージ長チェック（LINE最大5000文字）
  if (message.length > 5000) {
    return NextResponse.json({ error: 'メッセージが長すぎます（5000文字以内にしてください）' }, { status: 400 })
  }

  // ── LINE プッシュメッセージ送信 ──
  try {
    const lineRes = await fetch(LINE_API_PUSH, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        // プッシュ先のLINEユーザーID
        to: lineUserId,
        messages: [
          {
            type: 'text',
            // 行政からの返信であることをわかりやすくするためにヘッダーを付ける
            text: `【屋久島町より】\n\n${message.trim()}`,
          },
        ],
      }),
    })

    if (!lineRes.ok) {
      const errText = await lineRes.text()
      console.error('[line-reply] LINE API エラー:', lineRes.status, errText)
      return NextResponse.json(
        { error: `LINE API エラー: ${lineRes.status} — ${errText}` },
        { status: 500 }
      )
    }

    console.log(`[line-reply] 返信送信成功: to=${lineUserId.slice(0, 8)}...`)
    return NextResponse.json({
      success: true,
      message: 'LINEへの返信を送信しました',
    })

  } catch (err) {
    console.error('[line-reply] 送信例外:', err)
    return NextResponse.json({ error: 'ネットワークエラーが発生しました' }, { status: 500 })
  }
}
