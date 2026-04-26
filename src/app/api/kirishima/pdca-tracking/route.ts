// =====================================================
//  src/app/api/kirishima/pdca-tracking/route.ts
//  霧島市 PDCA 追跡 API — Sprint #49
//
//  屋久島町版（yakushima/pdca-tracking）と同じロジックを
//  municipalityId='kirishima' で呼び出すだけ。
//  エンジン本体は yakushima-pdca-engine.ts を共用。
//
//  ■ GET  : 施策実行記録DB の全件取得
//  ■ POST : action に応じて処理を振り分け
//    - action: 'register'  → 施策を新規登録
//    - action: 'update'    → ステータス・実績効果を更新
//    - action: 'evaluate'  → AI による PDCA 効果測定を実行
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  fetchPolicies,
  registerPolicy,
  updatePolicyStatus,
  runPdcaEvaluation,
  type RegisterPolicyRequest,
} from '@/lib/yakushima-pdca-engine'

// 霧島市の自治体ID（municipality-db-config.ts のキーに対応）
const MUNICIPALITY_ID = 'kirishima'

export async function GET() {
  const notionKey = process.env.NOTION_API_KEY ?? ''

  // 霧島市の施策実行記録DBから全件取得
  const policies = await fetchPolicies(notionKey, MUNICIPALITY_ID)

  // カンバン用にステータス別に集計
  const kanban = {
    検討中: policies.filter(p => p.ステータス === '検討中'),
    実施中: policies.filter(p => p.ステータス === '実施中'),
    完了:   policies.filter(p => p.ステータス === '完了'),
    却下:   policies.filter(p => p.ステータス === '却下'),
  }

  return NextResponse.json({
    status:   'success',
    total:    policies.length,
    kanban,
    policies,
  })
}

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  let body: {
    action?: string
    policy?: RegisterPolicyRequest
    pageId?: string
    update?: {
      ステータス?: string
      実績効果?: string
      効果スコア?: number
      根拠データ_実施後?: string
      実施開始日?: string
      実施完了日?: string
    }
  } = {}

  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { action } = body

  // ─── 施策の新規登録 ──────────────────────────────────
  if (action === 'register') {
    if (!body.policy) {
      return NextResponse.json({ error: 'policy が必要です' }, { status: 400 })
    }
    // 霧島市の施策実行記録DBに登録
    const result = await registerPolicy(notionKey, body.policy, MUNICIPALITY_ID)
    if (!result.success) {
      return NextResponse.json({ status: 'error', message: '施策の登録に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ status: 'success', pageId: result.pageId, url: result.url })
  }

  // ─── ステータス・実績の更新 ───────────────────────────
  if (action === 'update') {
    if (!body.pageId || !body.update) {
      return NextResponse.json({ error: 'pageId と update が必要です' }, { status: 400 })
    }
    // updatePolicyStatus は pageId で直接更新するため municipalityId 不要
    const ok = await updatePolicyStatus(notionKey, body.pageId, body.update)
    if (!ok) {
      return NextResponse.json({ status: 'error', message: '更新に失敗しました' }, { status: 500 })
    }
    return NextResponse.json({ status: 'success' })
  }

  // ─── AI による PDCA 効果測定 ─────────────────────────
  if (action === 'evaluate') {
    const result = await runPdcaEvaluation(notionKey, anthropicKey, MUNICIPALITY_ID)
    if (!result.success) {
      return NextResponse.json({ status: 'error', message: result.error }, { status: 500 })
    }
    return NextResponse.json({ status: 'success', ...result })
  }

  return NextResponse.json({ error: '不明なアクション: ' + action }, { status: 400 })
}
