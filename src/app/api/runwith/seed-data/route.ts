// =====================================================
//  src/app/api/runwith/seed-data/route.ts
//  テストデータ登録 API — Sprint #72
//
//  ■ 概要
//    ウィザード Step 9 で入力したサンプルデータを、
//    対応する Notion DB にページとして登録する。
//
//  ■ エンドポイント
//    POST /api/runwith/seed-data
//
//  ■ リクエスト
//    {
//      municipalityId: string,       // 自治体ID（例: 'shimanto'）
//      municipalityName: string,     // 自治体短縮名（例: '四万十市'）
//      featureId: string,            // 機能ID（feature-catalog.ts）
//      dbKey: string,                // DBキー（例: 'consultationDbId'）
//      rows: Record<string,string>[] // 入力データ行
//    }
//
//  ■ 動作
//    1. municipality-db-config.ts から DB ID を取得
//    2. DB_SCHEMAS から Notion プロパティ型を取得
//    3. 各行を Notion ページとして作成
//    4. DB が未設定の場合は 400 を返す（Sprint #73 で DB 作成後に再実行）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { DB_SCHEMAS } from '@/config/feature-catalog'

// ─── 型定義 ──────────────────────────────────────────────

/** リクエストボディ */
interface SeedDataRequest {
  municipalityId:   string                    // 自治体ID
  municipalityName: string                    // 自治体短縮名（DB の「自治体名」プロパティに入れる）
  featureId:        string                    // 機能ID（ログ用）
  dbKey:            string                    // DB キー（例: 'consultationDbId'）
  rows:             Record<string, string>[]  // 入力データ行
}

/** Notion プロパティ値（最小限の型） */
type NotionPropValue =
  | { title:      [{ text: { content: string } }] }
  | { rich_text:  [{ text: { content: string } }] }
  | { number:     number | null }
  | { select:     { name: string } | null }
  | { checkbox:   boolean }
  | { date:       { start: string } | null }

// ─── 文字列値 → Notion プロパティ値 変換 ─────────────────

/**
 * 入力フォームの文字列値を Notion API が受け付ける形式に変換する。
 * 空文字の場合は null / 空文字で返す。
 */
function toNotionProp(
  value: string,
  type:  string,
): NotionPropValue {
  const v = value.trim()

  switch (type) {
    case 'title':
      return { title: [{ text: { content: v } }] }

    case 'rich_text':
      return { rich_text: [{ text: { content: v } }] }

    case 'number': {
      const n = parseFloat(v)
      return { number: isNaN(n) ? null : n }
    }

    case 'select':
      return { select: v ? { name: v } : null }

    case 'checkbox':
      // '1' / 'true' / 'yes' / 'あり' → true
      return { checkbox: ['1', 'true', 'yes', 'あり', 'TRUE', 'Yes', '有'].includes(v) }

    case 'date':
      // YYYY-MM-DD 形式のみ受け付ける。それ以外は null
      return { date: /^\d{4}-\d{2}-\d{2}$/.test(v) ? { start: v } : null }

    default:
      return { rich_text: [{ text: { content: v } }] }
  }
}

// ─── メインハンドラー ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const notionToken = process.env.NOTION_API_KEY
  if (!notionToken) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  let body: SeedDataRequest
  try {
    body = await req.json() as SeedDataRequest
  } catch {
    return NextResponse.json(
      { error: 'リクエスト解析エラー' },
      { status: 400 }
    )
  }

  const { municipalityId, municipalityName, dbKey, rows } = body

  // ── 1. DB ID を取得 ──────────────────────────────────────
  const dbConf = getMunicipalityDbConfig(municipalityId)
  const dbId   = dbConf ? (dbConf as Record<string, string | undefined>)[dbKey] : undefined

  if (!dbId) {
    return NextResponse.json(
      {
        error: `${municipalityId} の ${dbKey} が設定されていません。`,
        hint:  'Sprint #73 の自動プロビジョニングで DB を作成してから再実行してください。',
        skipped: true,
      },
      { status: 400 }
    )
  }

  // ── 2. DB スキーマを取得 ──────────────────────────────────
  const schema = DB_SCHEMAS[dbKey]
  if (!schema) {
    return NextResponse.json(
      { error: `${dbKey} のスキーマ定義が feature-catalog.ts に見つかりません` },
      { status: 400 }
    )
  }

  // ── 3. 有効な行だけ抽出（全フィールドが空の行はスキップ） ──
  const validRows = rows.filter((row) =>
    Object.values(row).some((v) => v.trim() !== '')
  )

  if (validRows.length === 0) {
    return NextResponse.json(
      { error: '入力データが空です。少なくとも1行入力してください。' },
      { status: 400 }
    )
  }

  // ── 4. 各行を Notion ページとして作成 ────────────────────
  const results: { success: boolean; error?: string }[] = []

  for (const row of validRows) {
    // プロパティをNotionの形式に変換
    const properties: Record<string, NotionPropValue> = {}

    for (const prop of schema.properties) {
      const rawValue = row[prop.name] ?? ''

      // 自治体名プロパティは入力値に関係なく固定値をセット
      if (prop.name === '自治体名') {
        properties[prop.name] = { select: { name: municipalityName } }
        continue
      }

      properties[prop.name] = toNotionProp(rawValue, prop.type)
    }

    // Notion API でページ作成
    try {
      const res = await fetch('https://api.notion.com/v1/pages', {
        method:  'POST',
        headers: {
          Authorization:    `Bearer ${notionToken}`,
          'Notion-Version': '2022-06-28',
          'Content-Type':   'application/json',
        },
        body: JSON.stringify({
          parent:     { database_id: dbId },
          properties,
        }),
      })

      if (!res.ok) {
        const err = await res.text()
        results.push({ success: false, error: err })
      } else {
        results.push({ success: true })
      }
    } catch (err) {
      results.push({ success: false, error: String(err) })
    }
  }

  // ── 5. 結果集計 ──────────────────────────────────────────
  const successCount = results.filter((r) => r.success).length
  const failCount    = results.filter((r) => !r.success).length

  return NextResponse.json({
    success:      failCount === 0,
    successCount,
    failCount,
    totalRows:    validRows.length,
    message:      `${successCount}件 登録成功 / ${failCount}件 失敗`,
    errors:       results.filter((r) => !r.success).map((r) => r.error),
  })
}
