// =====================================================
//  src/app/api/cron/notion-backup/route.ts
//  Notion 日次バックアップ Cron — Sprint #80
//
//  ■ 役割
//    Vercel Cron から毎日1回呼ばれ、全自治体データをバックアップする。
//    バックアップ結果を JSON で返す。
//
//  ■ 起動タイミング（vercel.json で設定）
//    毎日 1:00 AM UTC（日本時間 10:00 AM）
//    ※ Vercel Hobby は1日1回まで対応
//
//  ■ 認証
//    Vercel Cron は Authorization: Bearer <CRON_SECRET> を自動付与する。
//
//  ■ 環境変数
//    CRON_SECRET                 : Vercel 自動設定
//    NOTION_API_KEY              : Notion API トークン
//    NEXT_PUBLIC_SUPABASE_URL    : Supabase プロジェクト URL
//    NEXT_PUBLIC_SUPABASE_ANON_KEY : Supabase anon キー
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { runFullBackup }             from '@/lib/notion-backup-engine'

export async function GET(req: NextRequest): Promise<NextResponse> {

  // ── Vercel Cron の認証確認 ────────────────────────────
  const cronSecret = process.env.CRON_SECRET ?? ''
  const authHeader = req.headers.get('authorization') ?? ''

  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
  }

  // ── バックアップ実行 ──────────────────────────────────
  console.log('[cron/notion-backup] バックアップ開始')

  try {
    const summary = await runFullBackup()

    console.log('[cron/notion-backup] 完了:', JSON.stringify({
      succeeded: summary.succeeded,
      failed:    summary.failed,
    }))

    return NextResponse.json({
      cronRan:    true,
      startedAt:  summary.startedAt,
      finishedAt: summary.finishedAt,
      succeeded:  summary.succeeded,
      failed:     summary.failed,
    })

  } catch (err) {
    console.error('[cron/notion-backup] エラー:', err)
    return NextResponse.json(
      { cronRan: false, error: String(err) },
      { status: 500 },
    )
  }
}
