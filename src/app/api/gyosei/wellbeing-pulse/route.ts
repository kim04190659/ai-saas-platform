// =====================================================
//  src/app/api/gyosei/wellbeing-pulse/route.ts
//  Well-Being Pulse 統合API(自治体職員向け) — 【結(YUI)】基盤 第二歩
//
//  ■ このAPIの役割
//    自治体職員向け画面(/gyosei/wellbeing-board)に、
//    2種類のPulseをまとめて返す。
//
//    ① Pulse-native型(⑤文化多様性と回復力・⑥良い統治)
//       RunWithが既に持つ財政健全化・移住定着リスクデータを
//       そのまま使う。新しいデータ収集は不要。
//
//    ② Signal→Pulse型(てつだっての会話由来)
//       既存の /api/signal と同じ集計結果をそのまま転記する。
//       カテゴリ名は現行実装のもの(生活・家事 等)を使っており、
//       GNH8領域への正式な対応付けはまだコード化されていない
//       (Notion「Signal/Pulse実装トラッカー」に別タスクとして記録済み)。
//
//    ④教育・⑧生活水準は、対応するデータ源が現時点で無いため、
//    このAPIでは扱わず、画面側で固定表示する。
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchAllPulseNativeDomains } from '@/lib/pulse-native'
import { fetchAggregatedSignals } from '@/lib/signal-store'

export async function GET(req: NextRequest) {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'

  try {
    const [pulseNative, signalPulse] = await Promise.all([
      fetchAllPulseNativeDomains(notionKey, municipalityId),
      fetchAggregatedSignals(notionKey),
    ])

    return NextResponse.json({
      status: 'success',
      municipalityId,
      generatedAt: new Date().toISOString(),
      pulseNative,
      signalPulse,
    })
  } catch (e) {
    console.error('[wellbeing-pulse GET] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 },
    )
  }
}
