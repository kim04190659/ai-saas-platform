// =====================================================
//  src/lib/notion-fallback.ts
//  Notion フォールバックユーティリティ — Sprint #81
//
//  ■ 役割
//    Notion API が利用できない場合に、Supabase に保存した
//    バックアップデータを代わりに返す共通ユーティリティ。
//
//  ■ 使い方（API ルートから呼ぶ例）
//    const { data, fromBackup, backedUpAt } =
//      await getWithFallback('kirishima', 'resident_consult', async () => {
//        // ← ここに通常の Notion 取得処理を書く
//        return await fetchFromNotion(dbId)
//      })
//
//  ■ 動作フロー
//    1. Notion 取得処理を試みる
//    2. 成功 → そのまま返す（fromBackup: false）
//    3. 失敗（タイムアウト・エラー）→ Supabase から最新バックアップを返す
//       （fromBackup: true, backedUpAt: バックアップ時刻）
//
//  ■ 環境変数
//    NEXT_PUBLIC_SUPABASE_URL      : Supabase プロジェクト URL
//    NEXT_PUBLIC_SUPABASE_ANON_KEY : Supabase anon キー
// =====================================================

// ─── 型定義 ─────────────────────────────────────────

/** フォールバック付きデータ取得の結果 */
export interface FallbackResult<T> {
  data:        T
  fromBackup:  boolean   // true = Supabase バックアップから取得
  backedUpAt:  string | null  // バックアップ時刻（fromBackup=true の時のみ有効）
}

// ─── Supabase からバックアップを取得 ─────────────────

async function fetchBackup(
  municipalityId: string,
  dbType:         string,
  supabaseUrl:    string,
  supabaseKey:    string,
): Promise<{ data: object[]; backedUpAt: string } | null> {

  try {
    const res = await fetch(
      `${supabaseUrl}/rest/v1/notion_backups` +
      `?municipality_id=eq.${encodeURIComponent(municipalityId)}` +
      `&db_type=eq.${encodeURIComponent(dbType)}` +
      `&order=backed_up_at.desc` +
      `&limit=1` +
      `&select=data,backed_up_at`,
      {
        headers: {
          'apikey':        supabaseKey,
          'Authorization': `Bearer ${supabaseKey}`,
        },
        // 5秒でタイムアウト（Supabase 自体が遅い場合の保険）
        signal: AbortSignal.timeout(5_000),
      },
    )

    if (!res.ok) return null

    const rows = await res.json() as { data: object[]; backed_up_at: string }[]
    if (rows.length === 0) return null

    return {
      data:        rows[0].data,
      backedUpAt:  rows[0].backed_up_at,
    }

  } catch {
    return null
  }
}

// ─── メイン関数：Notion 取得 → 失敗時は Supabase にフォールバック ──

/**
 * Notion からデータを取得し、失敗した場合は Supabase のバックアップを返す。
 *
 * @param municipalityId  自治体ID（例: 'kirishima'）
 * @param dbType          DB種別（例: 'resident_consult'）
 * @param fetchFromNotion Notion からデータを取得する非同期関数
 * @returns               FallbackResult<T>
 */
export async function getWithFallback<T>(
  municipalityId:  string,
  dbType:          string,
  fetchFromNotion: () => Promise<T>,
): Promise<FallbackResult<T>> {

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL     ?? ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  // ── Notion から取得を試みる ────────────────────────
  try {
    const data = await fetchFromNotion()
    return { data, fromBackup: false, backedUpAt: null }

  } catch (notionErr) {
    // Notion 取得失敗 → ログを残してフォールバックへ
    console.warn(
      `[fallback] Notion 取得失敗（${municipalityId}/${dbType}）:`,
      notionErr instanceof Error ? notionErr.message : String(notionErr),
    )
  }

  // ── Supabase バックアップから取得 ─────────────────
  const backup = await fetchBackup(municipalityId, dbType, supabaseUrl, supabaseKey)

  if (backup) {
    console.info(
      `[fallback] Supabase バックアップを使用（${municipalityId}/${dbType}）`,
      `backedUpAt: ${backup.backedUpAt}`,
    )
    return {
      data:       backup.data as T,
      fromBackup: true,
      backedUpAt: backup.backedUpAt,
    }
  }

  // ── バックアップもない場合は空配列を返す ─────────
  console.error(
    `[fallback] バックアップなし（${municipalityId}/${dbType}）— 空データを返します`,
  )
  return {
    data:       [] as unknown as T,
    fromBackup: true,
    backedUpAt: null,
  }
}

// ─── Notion ヘルス状態を取得（クライアントサイド用）────
// バナー表示のために現在の Notion 状態を確認する

export interface NotionHealthState {
  status:     'ok' | 'degraded' | 'down' | 'unknown'
  checkedAt:  string | null
  responseMs: number | null
}

export async function checkNotionHealth(baseUrl = ''): Promise<NotionHealthState> {
  try {
    const res  = await fetch(`${baseUrl}/api/admin/notion-health?notify=false`, {
      signal: AbortSignal.timeout(8_000),
    })
    const data = await res.json() as {
      status:     'ok' | 'degraded' | 'down'
      checkedAt:  string
      responseMs: number
    }
    return {
      status:     data.status,
      checkedAt:  data.checkedAt,
      responseMs: data.responseMs,
    }
  } catch {
    return { status: 'unknown', checkedAt: null, responseMs: null }
  }
}
