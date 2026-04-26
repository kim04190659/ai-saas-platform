// =====================================================
//  src/app/api/yakushima/policy-engine/route.ts
//  屋久島町 データ参照型AI施策エンジン API — Sprint #46
//
//  ■ GET  : Vercel Cron 経由の自動実行（Bearer認証）
//  ■ POST : フロントエンド（YakushimaPolicyPanel）から手動実行
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { runYakushimaPolicyEngine } from '@/lib/yakushima-policy-engine'

// 屋久島町役場の Notion ページID（CLAUDE.md より）
const YAKUSHIMA_PAGE_ID = '347960a91e2381ac9999d0bad0d8646e'

export async function GET(req: NextRequest) {
  // Vercel Cron からの呼び出し時は Bearer トークンで認証
  const authHeader = req.headers.get('authorization')
  if (
    authHeader !== `Bearer ${process.env.CRON_SECRET}` &&
    process.env.NODE_ENV === 'production'
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return runEngine()
}

export async function POST() {
  // フロントエンドからの手動実行（認証不要）
  return runEngine()
}

// ─── メイン処理 ───────────────────────────────────────────
async function runEngine() {
  const notionKey    = process.env.NOTION_API_KEY            ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY         ?? ''

  console.log('[api/yakushima/policy-engine] 実行開始')

  const result = await runYakushimaPolicyEngine(
    notionKey,
    anthropicKey,
    YAKUSHIMA_PAGE_ID
  )

  if (!result.success) {
    return NextResponse.json(
      { status: 'error', message: result.error ?? '処理に失敗しました' },
      { status: 500 }
    )
  }

  // フロントエンドが使いやすい形に整形して返す
  return NextResponse.json({
    status:      'success',
    dateLabel:   result.dateLabel,
    dataContext: result.dataContext,
    proposals:   result.proposals?.map((p) => ({
      category:     p.category,
      title:        p.title,
      rationale:    p.rationale,
      action:       p.action,
      urgency:      p.urgency,
      owner:        p.owner,
      dataEvidence: p.dataEvidence,
      // UIのアラートレベルに変換
      level: p.urgency === 'immediate' ? 'critical'
           : p.urgency === 'short'     ? 'warning'
           : 'info',
    })) ?? [],
    dataGaps:    result.dataGaps ?? [],
    notionPage:  result.notionPage,
  })
}
