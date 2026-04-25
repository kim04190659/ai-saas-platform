// =====================================================
//  src/app/api/cron/infra-aging-alert/route.ts
//  インフラ老朽化アラート Cron — Sprint #29
//
//  ■ スケジュール: 毎月曜 10:00 JST（UTC 01:00）
//    vercel.json: "0 1 * * 1"
//
//  ■ 処理内容
//    1. Notion の設備点検 DB からデータを取得
//    2. Claude Haiku がリスクを分析
//    3. 担当課に LINE でアラートを送信
//    4. Notion にレポートを保存
//
//  ■ 手動実行
//    POST /api/cron/infra-aging-alert
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { detectInfraAging } from '@/lib/predictive-detector'
import { getMunicipalityById } from '@/config/municipalities'

export async function GET(req: NextRequest) {
  // Vercel Cron は Authorization ヘッダーで認証する
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'
  return runDetection(municipalityId)
}

// 手動実行用（管理画面から POST — body に { municipalityId } を含める）
export async function POST(req: NextRequest) {
  let municipalityId = 'kirishima'
  try {
    const body = await req.json()
    if (body?.municipalityId) municipalityId = body.municipalityId
  } catch { /* body なしは無視 */ }
  return runDetection(municipalityId)
}

async function runDetection(municipalityId: string) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const lineToken    = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

  // 自治体マスタから shortName と notionPageId を取得
  const municipality = getMunicipalityById(municipalityId)

  console.log(`[infra-aging-alert] Cron 開始: ${municipality.shortName}`)

  const result = await detectInfraAging(
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
      action:   a.actionNeeded,
    })),
    notionPage:  result.notionPage,
  })
}
