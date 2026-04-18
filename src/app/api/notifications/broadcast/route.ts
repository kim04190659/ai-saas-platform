// =====================================================
//  src/app/api/notifications/broadcast/route.ts
//  緊急アラート / 一斉配信 API — Sprint #29
//
//  ■ 役割
//    管理画面（PushNotificationPanel）から呼ばれ、
//    LINE公式アカウントのフォロワー全員に一斉通知を送る。
//    送信後はNotionに通知ログを記録する。
//
//  ■ リクエスト
//    POST /api/notifications/broadcast
//    Body: {
//      template: NotificationTemplate,
//      params:   TemplateParams,
//      customText?: string   // テンプレートを使わず直接送る場合
//    }
//
//  ■ レスポンス
//    { status, message, sentAt }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  buildNotificationText,
  broadcastMessage,
  logNotificationToNotion,
  type NotificationTemplate,
  type TemplateParams,
} from '@/lib/line-push'

export async function POST(req: NextRequest) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
  const notionKey   = process.env.NOTION_API_KEY            ?? ''

  try {
    const body = await req.json()
    const template:    NotificationTemplate = body.template    ?? 'announcement'
    const params:      TemplateParams       = body.params      ?? {}
    const customText:  string               = body.customText  ?? ''

    // 送信テキストを組み立て（customTextが指定された場合はそちらを優先）
    const text = customText.trim() || buildNotificationText(template, params)

    if (!text) {
      return NextResponse.json({ status: 'error', message: '送信内容が空です' }, { status: 400 })
    }

    const sentAt = new Date().toISOString()

    // LINE ブロードキャスト送信
    const result = await broadcastMessage(text, accessToken)

    // Notion にログを記録
    if (notionKey) {
      await logNotificationToNotion({
        notionKey,
        template,
        title:   params.title ?? params.alertType ?? template,
        text,
        mode:    'broadcast',
        success: result.success,
        sentAt,
      })
    }

    if (result.success) {
      console.log(`[broadcast] 送信成功: ${template}`)
      return NextResponse.json({
        status:  'success',
        message: '全フォロワーへの配信が完了しました',
        sentAt,
        preview: text.slice(0, 100) + (text.length > 100 ? '…' : ''),
      })
    } else {
      return NextResponse.json({
        status:  'error',
        message: result.error ?? '送信に失敗しました',
        sentAt,
      }, { status: 500 })
    }

  } catch (e) {
    console.error('[broadcast] エラー:', e)
    return NextResponse.json({
      status:  'error',
      message: `処理エラー: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 500 })
  }
}

// GET: ヘルスチェック
export async function GET() {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
  return NextResponse.json({
    status:      'ok',
    description: '緊急アラート・一斉配信エンドポイント',
    lineToken:   accessToken ? '✅ 設定済み' : '❌ LINE_CHANNEL_ACCESS_TOKEN 未設定',
  })
}
