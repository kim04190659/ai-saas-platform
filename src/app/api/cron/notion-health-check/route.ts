// =====================================================
//  src/app/api/cron/notion-health-check/route.ts
//  Notion 死活監視 Cron — Sprint #79
//
//  ■ 役割
//    Vercel Cron から定期的に呼ばれ、Notion API の状態を確認する。
//    障害を検知した場合は管理者へ LINE 通知を送る。
//    前回のステータスを Vercel KV（将来対応）または環境変数で管理し、
//    「障害発生」と「復旧」の両方を通知する。
//
//  ■ 起動タイミング（vercel.json で設定）
//    毎時 0, 5, 10, ..., 55 分（5分ごと）
//    ※ Vercel Hobby は1日1回まで。Pro 以上は任意のスケジュールが可能。
//
//  ■ 認証
//    Vercel Cron は Authorization: Bearer <CRON_SECRET> を自動付与する。
//    CRON_SECRET 環境変数で保護する。
//
//  ■ 環境変数
//    CRON_SECRET          : Vercel 自動設定（手動実行時は不要）
//    NOTION_API_KEY       : Notion API トークン
//    LINE_CHANNEL_ACCESS_TOKEN : LINE 送信用トークン
//    ADMIN_LINE_USER_ID   : 管理者の LINE ユーザーID
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// ─── Notion ヘルスチェック API を内部呼び出し ─────────
// 同一デプロイ内の API を呼ぶことで、ロジックを DRY に保つ

export async function GET(req: NextRequest): Promise<NextResponse> {

  // ── Vercel Cron の認証確認 ────────────────────────────
  const cronSecret = process.env.CRON_SECRET ?? ''
  const authHeader = req.headers.get('authorization') ?? ''

  // 本番環境ではシークレットチェック（開発環境はスキップ）
  if (process.env.NODE_ENV === 'production' && cronSecret) {
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
  }

  // ── Notion ヘルスチェックを実行 ──────────────────────
  // 通知あり（Cron 実行時は常に通知を有効にする）
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? 'https://run-with.vercel.app'

  try {
    const res = await fetch(`${baseUrl}/api/admin/notion-health?notify=true`, {
      headers: {
        // 内部リクエストとして認識させるためのヘッダー
        'x-internal-cron': 'true',
      },
    })

    const data = await res.json()

    console.log('[cron/notion-health-check]', JSON.stringify(data))

    return NextResponse.json({
      cronRan:   true,
      checkedAt: data.checkedAt,
      status:    data.status,
      message:   data.message,
    })

  } catch (err) {
    // ヘルスチェック自体が失敗した場合（Vercel 内部エラー）
    console.error('[cron/notion-health-check] 内部エラー:', err)
    return NextResponse.json(
      { cronRan: false, error: String(err) },
      { status: 500 }
    )
  }
}
