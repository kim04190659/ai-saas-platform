// =====================================================
//  src/app/api/kirishima/infra-aging/route.ts
//  霧島市 インフラ老朽化 API — Sprint #51
//
//  ■ GET  /api/kirishima/infra-aging
//    → Notion DB から施設一覧を取得して返す
//
//  ■ POST /api/kirishima/infra-aging
//    { scenario: 'urgent' | 'budget' | 'consolidate' }
//    → AI分析を実行し結果を返す（Notion保存は非同期）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchInfraFacilities,
  runInfraAnalysis,
} from '@/lib/infrastructure-aging-engine'

const MUNICIPALITY_ID = 'kirishima'

// ── GET: 施設一覧取得 ────────────────────────────────

export async function GET() {
  const notionKey = process.env.NOTION_API_KEY ?? ''

  try {
    const facilities = await fetchInfraFacilities(notionKey, MUNICIPALITY_ID)

    // 種別ごとにグループ化
    const byType: Record<string, typeof facilities> = {}
    for (const f of facilities) {
      if (!byType[f.type]) byType[f.type] = []
      byType[f.type].push(f)
    }

    return NextResponse.json({
      status:     'success',
      total:      facilities.length,
      facilities,
      byType,
      summary: {
        urgent:  facilities.filter(f => f.urgency === '緊急修繕').length,
        planned: facilities.filter(f => f.urgency === '計画修繕').length,
        watch:   facilities.filter(f => f.urgency === '経過観察').length,
        good:    facilities.filter(f => f.urgency === '良好').length,
        totalRepairCost: facilities.reduce((s, f) => s + f.repairCost, 0),
      },
    })
  } catch (e) {
    console.error('[infra-aging GET] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

// ── POST: AI分析実行 ─────────────────────────────────

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  const { scenario = 'urgent' } = await req.json() as { scenario?: string }

  try {
    const result = await runInfraAnalysis(
      notionKey,
      anthropicKey,
      scenario,
      MUNICIPALITY_ID,
    )

    return NextResponse.json({ status: 'success', ...result })
  } catch (e) {
    console.error('[infra-aging POST] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
