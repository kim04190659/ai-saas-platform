// =====================================================
//  src/app/api/line/push-notify/route.ts
//  LINE プッシュ通知送信API — Sprint #88-C
//
//  ■ 役割
//    職員がRunWithの管理画面から住民向けに
//    LINEプッシュ通知を送信するためのAPIエンドポイント。
//
//  ■ 送信先の種類
//    - broadcast : LINE公式アカウントの全友達に送信
//    - multicast  : 指定したユーザーID複数人に送信
//    - push       : グループID or ユーザーIDに送信
//
//  ■ リクエスト形式（POST JSON）
//    {
//      "mode":    "broadcast" | "push" | "multicast",
//      "to":      "グループIDまたはユーザーID"（broadcast時は不要）,
//      "toList":  ["userId1","userId2"]（multicast時のみ）,
//      "message": "送信する本文テキスト",
//      "sender":  "霧島市役所"（送信者名、省略可）
//    }
//
//  ■ 使用するLINE API
//    broadcast : POST /v2/bot/message/broadcast
//    multicast  : POST /v2/bot/message/multicast
//    push       : POST /v2/bot/message/push
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// LINE Messaging API のエンドポイント
const LINE_BROADCAST  = 'https://api.line.me/v2/bot/message/broadcast'
const LINE_MULTICAST  = 'https://api.line.me/v2/bot/message/multicast'
const LINE_PUSH       = 'https://api.line.me/v2/bot/message/push'

// ─── リクエストの型定義 ───────────────────────────────

interface PushNotifyRequest {
  mode:     'broadcast' | 'push' | 'multicast'
  to?:      string        // push モード時: グループID or ユーザーID
  toList?:  string[]      // multicast モード時: ユーザーIDリスト（最大500件）
  message:  string        // 送信する本文テキスト
  sender?:  string        // 送信者名（例: '霧島市役所'）
}

// ─── POST ハンドラー ──────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body: PushNotifyRequest = await req.json()

    // 必須パラメータのバリデーション
    if (!body.message || body.message.trim().length === 0) {
      return NextResponse.json(
        { error: 'message は必須です' },
        { status: 400 }
      )
    }
    if (body.mode === 'push' && !body.to) {
      return NextResponse.json(
        { error: 'push モードでは to（送信先ID）が必須です' },
        { status: 400 }
      )
    }
    if (body.mode === 'multicast' && (!body.toList || body.toList.length === 0)) {
      return NextResponse.json(
        { error: 'multicast モードでは toList が必須です' },
        { status: 400 }
      )
    }

    const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN
    if (!accessToken) {
      return NextResponse.json(
        { error: 'LINE_CHANNEL_ACCESS_TOKEN が設定されていません' },
        { status: 500 }
      )
    }

    // 送信テキストを構築（送信者名があれば冒頭に追加）
    const text = body.sender
      ? `【${body.sender}からのお知らせ】\n\n${body.message}`
      : body.message

    // モードに応じてLINE APIを呼び出す
    let apiUrl: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let reqBody: Record<string, any>

    switch (body.mode) {
      case 'broadcast':
        apiUrl  = LINE_BROADCAST
        reqBody = { messages: [{ type: 'text', text }] }
        break

      case 'multicast':
        apiUrl  = LINE_MULTICAST
        reqBody = {
          to:       body.toList!.slice(0, 500),  // LINE上限500件
          messages: [{ type: 'text', text }],
        }
        break

      case 'push':
      default:
        apiUrl  = LINE_PUSH
        reqBody = {
          to:       body.to!,
          messages: [{ type: 'text', text }],
        }
        break
    }

    const res = await fetch(apiUrl, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify(reqBody),
    })

    if (!res.ok) {
      const errText = await res.text()
      console.error('[push-notify] LINE API エラー:', res.status, errText)
      return NextResponse.json(
        { error: `LINE API エラー: ${res.status}`, detail: errText },
        { status: res.status }
      )
    }

    console.log(`[push-notify] 送信成功 mode=${body.mode} chars=${text.length}`)

    // 成功レスポンス（送信日時・内容を返して履歴表示に使う）
    return NextResponse.json({
      ok:        true,
      mode:      body.mode,
      sentAt:    new Date().toISOString(),
      charCount: text.length,
    })

  } catch (e) {
    console.error('[push-notify] 例外:', e)
    return NextResponse.json(
      { error: '内部エラーが発生しました' },
      { status: 500 }
    )
  }
}
