// =====================================================
//  src/app/api/signal/route.ts
//  Signalボード API — 【結(YUI)】基盤開発 第一歩
//
//  ■ 役割
//    企業(Coarc)・自治体(RunWith)向けに、匿名化・集計済みのSignalを返す。
//    個別の会話内容や個人の識別情報は一切含まれない
//    (母数が少ないカテゴリは件数も伏せる。signal-store.ts 参照)。
// =====================================================

import { NextResponse } from 'next/server'
import { fetchAggregatedSignals } from '@/lib/signal-store'

export async function GET() {
  try {
    const notionKey = process.env.NOTION_API_KEY ?? ''
    const result = await fetchAggregatedSignals(notionKey)
    return NextResponse.json(result)
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[api/signal]', message)
    return NextResponse.json(
      { status: 'error', message, threshold: 0, generatedAt: new Date().toISOString(), categories: [] },
      { status: 500 }
    )
  }
}
