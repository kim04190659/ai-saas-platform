// =====================================================
//  src/app/api/cron/risk-oneonone-reminder/route.ts
//  リスク職員 1on1 リマインド Cron — Sprint #29
//
//  ■ スケジュール: 毎火曜 10:00 JST（UTC 01:00）
//    vercel.json: "0 1 * * 2"
//    ※ 月曜の離職リスクスコアリング（0:30 UTC）翌日に実行
//
//  ■ 処理内容
//    1. Notion から直近のリスクスコアレポートを確認
//    2. Claude Haiku が 1on1 リマインドメッセージを生成
//    3. 管理職・部署管理者に LINE で送信
//    4. Notion に送信ログを保存
//
//  ■ 手動実行
//    POST /api/cron/risk-oneonone-reminder
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { sendOneOnOneReminders } from '@/lib/predictive-detector'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return runReminders()
}

export async function POST() {
  return runReminders()
}

async function runReminders() {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const lineToken    = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

  console.log('[risk-oneonone-reminder] Cron 開始')

  const result = await sendOneOnOneReminders(notionKey, anthropicKey, lineToken)

  if (!result.success) {
    return NextResponse.json({
      status:  'error',
      message: result.error ?? '処理に失敗しました',
    }, { status: 500 })
  }

  return NextResponse.json({
    status:       'success',
    alertCount:   result.alertCount,
    alerts:       result.alerts.map(a => ({
      level:      a.level,
      title:      a.title,
      targetDept: a.targetDept,
    })),
    notionPage:   result.notionPage,
  })
}
