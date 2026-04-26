// =====================================================
//  src/app/api/gyosei/fiscal-health/route.ts
//  財政健全化 共通API — Sprint #56（/kirishima から昇格）
//
//  ■ GET  /api/gyosei/fiscal-health?municipalityId=kirishima
//    → 財政指標一覧・カテゴリ別・評価別件数サマリーを返す
//
//  ■ POST /api/gyosei/fiscal-health
//    { scenario: 'current' | 'optimize' | 'longterm', municipalityId: string }
//    → AI財政分析を実行して提言を返す
//
//  ■ 変更点（kirishima版との違い）
//    MUNICIPALITY_ID をハードコードせず、
//    クエリパラメータ / POSTボディから動的に取得する
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchFiscalIndicators, runFiscalAnalysis } from '@/lib/fiscal-health-engine'

// ─── GET: 財政指標一覧取得 ────────────────────────────

export async function GET(req: NextRequest) {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  // municipalityId を動的に受け取る（省略時は kirishima）
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'

  try {
    const indicators = await fetchFiscalIndicators(notionKey, municipalityId)

    // カテゴリ別グルーピング
    const byCategory: Record<string, typeof indicators> = {}
    for (const ind of indicators) {
      if (!byCategory[ind.category]) byCategory[ind.category] = []
      byCategory[ind.category].push(ind)
    }

    // 評価別件数サマリー
    const assessmentCount = {
      danger:    indicators.filter(i => i.assessment === '危険').length,
      caution:   indicators.filter(i => i.assessment === '警戒').length,
      watch:     indicators.filter(i => i.assessment === '注意').length,
      good:      indicators.filter(i => i.assessment === '良好').length,
      excellent: indicators.filter(i => i.assessment === '優良').length,
    }

    return NextResponse.json({
      status: 'success',
      municipalityId,
      indicators,
      byCategory,
      summary: {
        total: indicators.length,
        assessmentCount,
        criticalIndicators: indicators
          .filter(i => ['警戒', '危険'].includes(i.assessment))
          .map(i => i.name),
      },
    })

  } catch (e) {
    console.error('[gyosei/fiscal-health GET] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

// ─── POST: AI財政分析 ─────────────────────────────────

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  const body = await req.json() as { scenario?: string; municipalityId?: string }
  const scenario       = body.scenario       ?? 'current'
  const municipalityId = body.municipalityId ?? 'kirishima'

  try {
    const result = await runFiscalAnalysis(
      notionKey,
      anthropicKey,
      scenario,
      municipalityId,
    )

    return NextResponse.json({ status: 'success', ...result })

  } catch (e) {
    console.error('[gyosei/fiscal-health POST] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
