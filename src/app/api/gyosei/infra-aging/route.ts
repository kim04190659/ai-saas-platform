// =====================================================
//  src/app/api/gyosei/infra-aging/route.ts
//  インフラ老朽化 共通API — Sprint #56（/kirishima から昇格）
//
//  ■ GET  /api/gyosei/infra-aging?municipalityId=kirishima
//    → 施設一覧・種別別グループ・修繕サマリーを返す
//
//  ■ POST /api/gyosei/infra-aging
//    { scenario: 'urgent' | 'budget' | 'consolidate', municipalityId: string }
//    → AI分析を実行して修繕・統廃合提言を返す
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchInfraFacilities, runInfraAnalysis } from '@/lib/infrastructure-aging-engine'

// ─── GET: 施設一覧取得 ────────────────────────────────

export async function GET(req: NextRequest) {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'

  try {
    const facilities = await fetchInfraFacilities(notionKey, municipalityId)

    // 種別ごとにグループ化
    const byType: Record<string, typeof facilities> = {}
    for (const f of facilities) {
      if (!byType[f.type]) byType[f.type] = []
      byType[f.type].push(f)
    }

    return NextResponse.json({
      status: 'success',
      municipalityId,
      total: facilities.length,
      facilities,
      byType,
      summary: {
        urgent:          facilities.filter(f => f.urgency === '緊急修繕').length,
        planned:         facilities.filter(f => f.urgency === '計画修繕').length,
        watch:           facilities.filter(f => f.urgency === '経過観察').length,
        good:            facilities.filter(f => f.urgency === '良好').length,
        totalRepairCost: facilities.reduce((s, f) => s + f.repairCost, 0),
      },
    })

  } catch (e) {
    console.error('[gyosei/infra-aging GET] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

// ─── POST: AI分析実行 ─────────────────────────────────

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  const body = await req.json() as { scenario?: string; municipalityId?: string }
  const scenario       = body.scenario       ?? 'urgent'
  const municipalityId = body.municipalityId ?? 'kirishima'

  try {
    const result = await runInfraAnalysis(
      notionKey,
      anthropicKey,
      scenario,
      municipalityId,
    )

    return NextResponse.json({ status: 'success', ...result })

  } catch (e) {
    console.error('[gyosei/infra-aging POST] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
