// =====================================================
//  src/lib/notion-backup-engine.ts
//  Notion 日次バックアップエンジン — Sprint #80
//
//  ■ 役割
//    全自治体の主要3DB（住民相談・WBコーチング・施策実行記録）を
//    Notion から取得し、Supabase の notion_backups テーブルに保存する。
//    自治体×DB種別ごとに最新3件のみ保持し、古いものは自動削除する。
//
//  ■ バックアップ対象
//    - consultationDbId : 住民相談DB
//    - coachingDbId     : 住民WBコーチングDB
//    - pdcaDbId         : 施策実行記録DB
//
//  ■ 保存先
//    Supabase の notion_backups テーブル（Sprint #80-A で作成済み）
//
//  ■ 環境変数
//    NOTION_API_KEY              : Notion API トークン
//    NEXT_PUBLIC_SUPABASE_URL    : Supabase プロジェクト URL
//    NEXT_PUBLIC_SUPABASE_ANON_KEY : Supabase anon キー
// =====================================================

import { MUNICIPALITY_DB_CONFIG } from '@/config/municipality-db-config'

// ─── 型定義 ─────────────────────────────────────────

/** バックアップ1件の結果 */
export interface BackupResult {
  municipalityId: string
  dbType:         string
  success:        boolean
  recordCount:    number
  error?:         string
}

/** バックアップ実行全体のサマリー */
export interface BackupSummary {
  startedAt:   string
  finishedAt:  string
  totalTasks:  number
  succeeded:   number
  failed:      number
  results:     BackupResult[]
}

// ─── Notion ページ取得（全件） ────────────────────────
// Notion API は1回最大100件なので、has_more がある場合はページネーションで全件取得する

async function fetchAllNotionPages(
  dbId:       string,
  notionKey:  string,
): Promise<object[]> {

  const pages: object[] = []
  let   cursor: string | undefined = undefined
  let   hasMore = true

  while (hasMore) {
    const body: Record<string, unknown> = { page_size: 100 }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body:   JSON.stringify(body),
      signal: AbortSignal.timeout(30_000), // 30秒タイムアウト
    })

    if (!res.ok) {
      throw new Error(`Notion API エラー: ${res.status} ${await res.text()}`)
    }

    const data = await res.json() as {
      results:     object[]
      has_more:    boolean
      next_cursor: string | null
    }

    pages.push(...data.results)
    hasMore = data.has_more
    cursor  = data.next_cursor ?? undefined
  }

  return pages
}

// ─── Supabase に保存 ─────────────────────────────────
// REST API 経由で notion_backups テーブルに INSERT する

async function saveToSupabase(
  municipalityId: string,
  dbType:         string,
  recordCount:    number,
  data:           object[],
  supabaseUrl:    string,
  supabaseKey:    string,
): Promise<void> {

  const backedUpAt = new Date().toISOString()

  // 1. 新しいバックアップを INSERT
  const insertRes = await fetch(`${supabaseUrl}/rest/v1/notion_backups`, {
    method: 'POST',
    headers: {
      'apikey':       supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal',
    },
    body: JSON.stringify({
      municipality_id: municipalityId,
      db_type:         dbType,
      backed_up_at:    backedUpAt,
      record_count:    recordCount,
      data:            data,
    }),
  })

  if (!insertRes.ok) {
    const errText = await insertRes.text()
    throw new Error(`Supabase INSERT エラー: ${insertRes.status} ${errText}`)
  }

  // 2. 古いバックアップを削除（最新3件以外）
  //    まず対象の id 一覧を取得してから削除する
  const listRes = await fetch(
    `${supabaseUrl}/rest/v1/notion_backups` +
    `?municipality_id=eq.${encodeURIComponent(municipalityId)}` +
    `&db_type=eq.${encodeURIComponent(dbType)}` +
    `&order=backed_up_at.desc` +
    `&select=id` +
    `&offset=3`, // 最新3件をスキップして4件目以降を取得
    {
      headers: {
        'apikey':        supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    },
  )

  if (listRes.ok) {
    const old = await listRes.json() as { id: number }[]
    if (old.length > 0) {
      const ids = old.map((r) => r.id).join(',')
      await fetch(
        `${supabaseUrl}/rest/v1/notion_backups?id=in.(${ids})`,
        {
          method: 'DELETE',
          headers: {
            'apikey':        supabaseKey,
            'Authorization': `Bearer ${supabaseKey}`,
          },
        },
      )
    }
  }
}

// ─── メイン：全自治体バックアップ実行 ────────────────

export async function runFullBackup(): Promise<BackupSummary> {

  const notionKey   = process.env.NOTION_API_KEY              ?? ''
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL    ?? ''
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''

  const startedAt = new Date().toISOString()
  const results:   BackupResult[] = []

  // バックアップ対象のDB種別と設定キーの対応
  const DB_TARGETS: Array<{ dbType: string; configKey: 'consultationDbId' | 'coachingDbId' | 'pdcaDbId' }> = [
    { dbType: 'resident_consult', configKey: 'consultationDbId' },
    { dbType: 'wb_coaching',      configKey: 'coachingDbId'     },
    { dbType: 'pdca',             configKey: 'pdcaDbId'         },
  ]

  // 全自治体をループ
  for (const [municipalityId, dbConfig] of Object.entries(MUNICIPALITY_DB_CONFIG)) {

    for (const { dbType, configKey } of DB_TARGETS) {

      const dbId = dbConfig[configKey]

      // DB ID が設定されていない場合はスキップ
      if (!dbId) {
        results.push({ municipalityId, dbType, success: false, recordCount: 0, error: 'DB ID 未設定' })
        continue
      }

      try {
        // Notion から全レコードを取得
        const pages = await fetchAllNotionPages(dbId, notionKey)

        // Supabase に保存
        await saveToSupabase(municipalityId, dbType, pages.length, pages, supabaseUrl, supabaseKey)

        results.push({ municipalityId, dbType, success: true, recordCount: pages.length })

        console.log(`[backup] ✅ ${municipalityId}/${dbType}: ${pages.length}件`)

      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        results.push({ municipalityId, dbType, success: false, recordCount: 0, error: errMsg })
        console.error(`[backup] ❌ ${municipalityId}/${dbType}: ${errMsg}`)
      }
    }
  }

  const finishedAt = new Date().toISOString()
  const succeeded  = results.filter((r) => r.success).length
  const failed     = results.filter((r) => !r.success).length

  console.log(`[backup] 完了: ${succeeded}件成功 / ${failed}件失敗`)

  return {
    startedAt,
    finishedAt,
    totalTasks: results.length,
    succeeded,
    failed,
    results,
  }
}

// ─── バックアップ状態確認 ─────────────────────────────
// 最新バックアップの時刻・件数を取得して管理画面に表示する

export interface BackupStatus {
  municipalityId: string
  dbType:         string
  backedUpAt:     string
  recordCount:    number
}

export async function getLatestBackupStatus(
  supabaseUrl: string,
  supabaseKey: string,
): Promise<BackupStatus[]> {

  // 各 municipality_id × db_type の最新1件ずつ取得
  const res = await fetch(
    `${supabaseUrl}/rest/v1/notion_backups` +
    `?order=backed_up_at.desc` +
    `&select=municipality_id,db_type,backed_up_at,record_count` +
    `&limit=100`,
    {
      headers: {
        'apikey':        supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`,
      },
    },
  )

  if (!res.ok) return []

  const rows = await res.json() as {
    municipality_id: string
    db_type:         string
    backed_up_at:    string
    record_count:    number
  }[]

  // 自治体×DB種別の最新1件だけに絞り込む
  const seen  = new Set<string>()
  const latest: BackupStatus[] = []

  for (const row of rows) {
    const key = `${row.municipality_id}/${row.db_type}`
    if (!seen.has(key)) {
      seen.add(key)
      latest.push({
        municipalityId: row.municipality_id,
        dbType:         row.db_type,
        backedUpAt:     row.backed_up_at,
        recordCount:    row.record_count,
      })
    }
  }

  return latest
}
