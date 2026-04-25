// =====================================================
//  src/app/api/cron/citizen-radar/route.ts
//  住民困り事レーダー Cron — Sprint #43
//
//  ■ スケジュール: 毎週月曜 07:00 JST（日曜 UTC 22:00）
//    vercel.json: "0 22 * * 0"
//    ※ 満足度モニタリング（08:00）の前に収集完了させる
//
//  ■ 処理内容
//    1. Google News RSS・Yahoo知恵袋・goo・発言小町から収集
//    2. 自治体公式HPと既存LINE相談ログも統合
//    3. Claude Haiku でカテゴリ分類・深刻度スコアリング
//    4. Notion「住民困り事レポート」として保存
//
//  ■ 手動実行（管理画面から）
//    POST /api/cron/citizen-radar  body: { municipalityId }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { runCitizenRadar } from '@/lib/citizen-radar'
import { getMunicipalityById } from '@/config/municipalities'

// GET: Vercel Cron から自動実行（Bearer 認証）
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'
  return runRadar(municipalityId)
}

// POST: 管理画面から手動実行（body に { municipalityId } を含める）
export async function POST(req: NextRequest) {
  let municipalityId = 'kirishima'
  try {
    const body = await req.json()
    if (body?.municipalityId) municipalityId = body.municipalityId
  } catch { /* body なしは無視 */ }

  return runRadar(municipalityId)
}

// ─── メイン処理 ───────────────────────────────────────

async function runRadar(municipalityId: string) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  // 自治体マスタから shortName と notionPageId を取得
  const municipality = getMunicipalityById(municipalityId)

  console.log(`[citizen-radar] Cron 開始: ${municipality.shortName}`)

  const result = await runCitizenRadar(
    notionKey,
    anthropicKey,
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
    issueCount: result.issueCount,
    alerts:     result.issues?.map((issue) => ({
      level:      issue.severity,
      title:      `[${issue.category}] ${issue.summary}`,
      action:     issue.detail,
      targetDept: issue.source,
    })) ?? [],
    notionPage: result.notionPage,
  })
}
