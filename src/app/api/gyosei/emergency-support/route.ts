// =====================================================
//  src/app/api/gyosei/emergency-support/route.ts
//  緊急時住民支援 API — Sprint #55
//
//  ■ GET  /api/gyosei/emergency-support?municipalityId=yakushima
//    → 要支援住民リスト・支援可能住民リスト・地区別グループを返す（AI なし）
//
//  ■ POST /api/gyosei/emergency-support
//    { scenario: 'typhoon' | 'earthquake' | 'heatwave', municipalityId: string }
//    → AI が緊急時対応計画（対応順・アドバイス）を生成して返す
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchEmergencySupport,
  runEmergencyPlan,
} from '@/lib/emergency-support-engine'

// ── GET: 住民リストのみ取得（AI なし・高速） ─────────

export async function GET(req: NextRequest) {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  // 自治体ID（省略時は 'yakushima'）
  const municipalityId = searchParams.get('municipalityId') ?? 'yakushima'

  try {
    const result = await fetchEmergencySupport(notionKey, municipalityId)

    return NextResponse.json({
      status: 'success',
      ...result,
    })
  } catch (e) {
    console.error('[emergency-support GET] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}

// ── POST: AI 緊急対応計画を生成 ──────────────────────

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  const body = await req.json() as {
    scenario?:       string
    municipalityId?: string
  }

  // シナリオ（デフォルト: 台風）
  const scenario       = body.scenario       ?? 'typhoon'
  const municipalityId = body.municipalityId ?? 'yakushima'

  try {
    const result = await runEmergencyPlan(
      notionKey,
      anthropicKey,
      scenario,
      municipalityId,
    )

    return NextResponse.json({
      status: 'success',
      ...result,
    })
  } catch (e) {
    console.error('[emergency-support POST] エラー:', e)
    return NextResponse.json(
      { status: 'error', message: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
