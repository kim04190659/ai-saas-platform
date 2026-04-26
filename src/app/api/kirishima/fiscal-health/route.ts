// =====================================================
//  src/app/api/kirishima/fiscal-health/route.ts
//  霧島市 財政健全化 API — Sprint #52
//
//  ■ エンドポイント
//    GET  /api/kirishima/fiscal-health   → 財政指標一覧・サマリー統計
//    POST /api/kirishima/fiscal-health   → AI財政分析（シナリオ指定）
//
//  ■ POST リクエスト
//    { scenario: 'current' | 'optimize' | 'longterm' }
//
//  ■ GET レスポンス
//    { indicators[], byCategory{}, summary{} }
//
//  ■ POST レスポンス
//    { scenario, summary, urgentItems[], recommendations[], totalCostReduction, risks[] }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchFiscalIndicators, runFiscalAnalysis } from '@/lib/fiscal-health-engine'

// 霧島市固定（将来的にクエリパラメータで切り替え可能）
const MUNICIPALITY_ID = 'kirishima'

// ─── GET: 財政指標一覧取得 ────────────────────────────

export async function GET() {
  const notionKey = process.env.NOTION_API_KEY ?? ''

  try {
    const indicators = await fetchFiscalIndicators(notionKey, MUNICIPALITY_ID)

    // カテゴリ別グルーピング
    const byCategory: Record<string, typeof indicators> = {}
    for (const ind of indicators) {
      if (!byCategory[ind.category]) byCategory[ind.category] = []
      byCategory[ind.category].push(ind)
    }

    // 評価別件数サマリー
    const assessmentCount = {
      danger:   indicators.filter(i => i.assessment === '危険').length,
      caution:  indicators.filter(i => i.assessment === '警戒').length,
      watch:    indicators.filter(i => i.assessment === '注意').length,
      good:     indicators.filter(i => i.assessment === '良好').length,
      excellent: indicators.filter(i => i.assessment === '優良').length,
    }

    return NextResponse.json({
      status: 'success',
      indicators,
      byCategory,
      summary: {
        total: indicators.length,
        assessmentCount,
        // 最も深刻な指標（警戒・危険）
        criticalIndicators: indicators
          .filter(i => ['警戒', '危険'].includes(i.assessment))
          .map(i => i.name),
      },
    })

  } catch (e) {
    console.error('[fiscal-health GET] エラー:', e)
    return NextResponse.json({
      status: 'error',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}

// ─── POST: AI財政分析 ─────────────────────────────────

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  const { scenario = 'current' } = await req.json() as { scenario?: string }

  try {
    const result = await runFiscalAnalysis(
      notionKey,
      anthropicKey,
      scenario,
      MUNICIPALITY_ID,
    )

    return NextResponse.json({
      status: 'success',
      ...result,
    })

  } catch (e) {
    console.error('[fiscal-health POST] エラー:', e)
    return NextResponse.json({
      status: 'error',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
