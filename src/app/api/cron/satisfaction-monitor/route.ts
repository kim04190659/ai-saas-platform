// =====================================================
//  src/app/api/cron/satisfaction-monitor/route.ts
//  住民満足度モニタリング Cron — Sprint #29
//
//  ■ スケジュール: 毎週月曜 08:00 JST（日曜 UTC 23:00）
//    vercel.json: "0 23 * * 0"
//
//  ■ 処理内容
//    1. Notion タッチポイント DB から 28 日分のデータを取得
//    2. 週次平均スコアを集計（4 週間分）
//    3. Claude Haiku がトレンドを分析
//    4. 低下傾向があれば LINE アラートを送信
//    5. Notion にモニタリングレポートを保存
//
//  ■ 手動実行
//    POST /api/cron/satisfaction-monitor
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { detectSatisfactionDecline } from '@/lib/predictive-detector'
import { getMunicipalityById } from '@/config/municipalities'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'
  return runMonitor(municipalityId)
}

export async function POST(req: NextRequest) {
  let municipalityId = 'kirishima'
  try {
    const body = await req.json()
    if (body?.municipalityId) municipalityId = body.municipalityId
  } catch { /* body なしは無視 */ }
  return runMonitor(municipalityId)
}

async function runMonitor(municipalityId: string) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const lineToken    = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

  const municipality = getMunicipalityById(municipalityId)

  console.log(`[satisfaction-monitor] Cron 開始: ${municipality.shortName}`)

  const result = await detectSatisfactionDecline(
    notionKey, anthropicKey, lineToken,
    municipality.shortName, municipality.notionPageId,
  )

  if (!result.success) {
    return NextResponse.json({
      status:  'error',
      message: result.error ?? '処理に失敗しました',
    }, { status: 500 })
  }

  return NextResponse.json({
    status:      'success',
    alertCount:  result.alertCount,
    alerts:      result.alerts.map(a => ({
      level:    a.level,
      title:    a.title,
      score:    a.score,
      action:   a.actionNeeded,
    })),
    notionPage:  result.notionPage,
  })
}
