// =====================================================
//  src/app/api/yakushima/resident-coach/route.ts
//  屋久島町 住民個人AIコーチ API — Sprint #48
//
//  ■ GET  : 全住民のWBスコア＋コーチング情報一覧を返す
//  ■ POST : action に応じて処理を振り分け
//    - action: 'coach_one' → 1住民のコーチングを実行・更新
//    - action: 'coach_all' → 全住民の一括コーチングを実行
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchResidents,
  fetchAllConsultations,
  runCoachingForResident,
  runCoachingForAll,
} from '@/lib/yakushima-resident-coach-engine'

// ── GET: 全住民一覧を返す ─────────────────────────
export async function GET() {
  const notionKey = process.env.NOTION_API_KEY ?? ''

  // 住民WBコーチングDB と 住民相談DB を並列取得
  const [residents, consultations] = await Promise.all([
    fetchResidents(notionKey),
    fetchAllConsultations(notionKey),
  ])

  // 住民ごとに相談件数・カテゴリ別集計を付加する
  const enriched = residents.map(r => {
    const myConsults = consultations.filter(c => c.住民ID === r.住民ID)
    const categoryCount: Record<string, number> = {}
    for (const c of myConsults) {
      categoryCount[c.相談カテゴリ] = (categoryCount[c.相談カテゴリ] ?? 0) + 1
    }
    return {
      ...r,
      相談履歴: myConsults,
      カテゴリ別件数: categoryCount,
    }
  })

  // WBスコア昇順（支援優先度の高い住民を先頭に）でソート
  enriched.sort((a, b) => (a.WBスコア ?? 10) - (b.WBスコア ?? 10))

  return NextResponse.json({
    status: 'success',
    total:  enriched.length,
    residents: enriched,
  })
}

// ── POST: コーチング実行 ──────────────────────────
export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  let body: {
    action?:     string
    residentId?: string  // 'coach_one' のとき必須
  } = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action } = body

  // ─── 1住民のコーチングを実行 ─────────────────────
  if (action === 'coach_one') {
    if (!body.residentId) {
      return NextResponse.json({ error: 'residentId が必要です' }, { status: 400 })
    }
    const result = await runCoachingForResident(notionKey, anthropicKey, body.residentId)
    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.error }, { status: 500 })
    }
    return NextResponse.json({ status: 'success', result })
  }

  // ─── 全住民の一括コーチングを実行 ────────────────
  if (action === 'coach_all') {
    const result = await runCoachingForAll(notionKey, anthropicKey)
    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.error }, { status: 500 })
    }
    return NextResponse.json({ status: 'success', ...result })
  }

  return NextResponse.json({ error: '不明なアクション: ' + action }, { status: 400 })
}
