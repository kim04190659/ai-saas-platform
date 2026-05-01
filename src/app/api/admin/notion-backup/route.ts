// =====================================================
//  src/app/api/admin/notion-backup/route.ts
//  Notion バックアップ API — Sprint #80
//
//  ■ エンドポイント
//    GET  /api/admin/notion-backup        → 最新バックアップ状態を返す
//    POST /api/admin/notion-backup        → 今すぐバックアップを実行する
//
//  ■ 用途
//    - 管理画面（/admin/system-health）からの手動バックアップ実行
//    - Cron ジョブからの定期バックアップ実行
//
//  ■ 環境変数
//    NOTION_API_KEY              : Notion API トークン
//    NEXT_PUBLIC_SUPABASE_URL    : Supabase プロジェクト URL
//    NEXT_PUBLIC_SUPABASE_ANON_KEY : Supabase anon キー
// =====================================================

import { NextResponse }                              from 'next/server'
import { runFullBackup, getLatestBackupStatus }      from '@/lib/notion-backup-engine'

// ─── GET: バックアップ状態確認 ────────────────────────

export async function GET(): Promise<NextResponse> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  try {
    const statuses = await getLatestBackupStatus(supabaseUrl, supabaseKey)

    // 全自治体の中で最も古いバックアップ時刻を「最終バックアップ時刻」として返す
    const lastBackedUpAt = statuses.length > 0
      ? statuses.reduce((oldest, s) =>
          s.backedUpAt < oldest ? s.backedUpAt : oldest,
          statuses[0].backedUpAt,
        )
      : null

    return NextResponse.json({
      status:         'ok',
      lastBackedUpAt,
      totalEntries:   statuses.length,
      statuses,
    })

  } catch (err) {
    console.error('[notion-backup] GET エラー:', err)
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 },
    )
  }
}

// ─── POST: バックアップ実行 ───────────────────────────

export async function POST(): Promise<NextResponse> {
  try {
    console.log('[notion-backup] 手動バックアップ開始')

    const summary = await runFullBackup()

    console.log('[notion-backup] 手動バックアップ完了:', JSON.stringify(summary))

    return NextResponse.json({
      status:  summary.failed === 0 ? 'ok' : 'partial',
      summary,
    })

  } catch (err) {
    console.error('[notion-backup] POST エラー:', err)
    return NextResponse.json(
      { status: 'error', message: String(err) },
      { status: 500 },
    )
  }
}
