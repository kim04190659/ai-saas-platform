// =====================================================
//  src/app/api/cron/issue-policy/route.ts
//  困り事 → 施策提案サイクル Cron — Sprint #44
//
//  ■ スケジュール: 毎週月曜 09:00 JST（UTC 00:00）
//    vercel.json: "0 0 * * 1"
//    ※ 困り事レーダー（07:00）収集完了後に実行
//
//  ■ 処理内容
//    1. Notion から最新の困り事レポートを取得（今回・前回）
//    2. カテゴリ別集計・トレンド検出（増加/改善/解決）
//    3. Claude Haiku が上位課題への施策を提案
//    4. Notion に「施策提案レポート」として保存
//    5. 担当職員に LINE で要約通知
//
//  ■ 手動実行
//    POST /api/cron/issue-policy  body: { municipalityId }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { runIssuePolicyEngine } from '@/lib/issue-policy-engine'
import { getMunicipalityById } from '@/config/municipalities'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'
  return runCycle(municipalityId)
}

export async function POST(req: NextRequest) {
  let municipalityId = 'kirishima'
  try {
    const body = await req.json()
    if (body?.municipalityId) municipalityId = body.municipalityId
  } catch { /* body なしは無視 */ }

  return runCycle(municipalityId)
}

// ─── メイン処理 ───────────────────────────────────────

async function runCycle(municipalityId: string) {
  const notionKey    = process.env.NOTION_API_KEY            ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY         ?? ''
  const lineToken    = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''

  const municipality = getMunicipalityById(municipalityId)

  console.log(`[issue-policy] Cron 開始: ${municipality.shortName}`)

  const result = await runIssuePolicyEngine(
    notionKey,
    anthropicKey,
    lineToken,
    municipality.shortName,
    municipality.notionPageId,
  )

  if (!result.success) {
    return NextResponse.json({
      status:  'error',
      message: result.error ?? '処理に失敗しました',
    }, { status: 500 })
  }

  return NextResponse.json({
    status:     'success',
    dateLabel:  result.dateLabel,
    // フロントエンド（IssuePolicyPanel）が使いやすい形に整形
    alertCount: result.proposals?.length ?? 0,
    alerts:     result.proposals?.map((p) => ({
      level:      p.urgency === 'immediate' ? 'critical'
                : p.urgency === 'short'     ? 'warning'
                : 'info',
      title:      `【${p.category}】${p.title}`,
      action:     `${p.action}（担当: ${p.owner}・${p.cost}）`,
      targetDept: p.owner,
    })) ?? [],
    categorySummary: result.categorySummary,
    notionPage:      result.notionPage,
  })
}
