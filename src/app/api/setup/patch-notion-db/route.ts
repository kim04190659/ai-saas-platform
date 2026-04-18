// =====================================================
//  src/app/api/setup/patch-notion-db/route.ts
//  Notion DBスキーマ セットアップAPI
//
//  ■ 役割
//    職員コンディションDBに不足しているプロパティを追加する。
//    初回デプロイ後、または seed-staff-data.mjs 実行前に
//    一度だけ呼ぶセットアップ用エンドポイント。
//
//  ■ 使い方（ブラウザまたはcurlで一度だけ実行）
//    GET /api/setup/patch-notion-db
//
//  ■ 追加するプロパティ
//    - deptId      : rich_text（部署分離キー）
//    - 部署名      : rich_text（部署表示名）
//    - 自治体名    : rich_text（自治体名）
//    - コメント    : rich_text（職員コメント）
// =====================================================

import { NextResponse } from 'next/server'

const NOTION_API_BASE       = 'https://api.notion.com/v1'
const NOTION_VERSION        = '2022-06-28'
const STAFF_CONDITION_DB_ID = '4d65b3ba47764ea6b472c2c9452f27c6'

function notionHeaders(key: string) {
  return {
    'Authorization':  `Bearer ${key}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

export async function GET() {
  const notionKey = process.env.NOTION_API_KEY
  if (!notionKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY 未設定' }, { status: 500 })
  }

  // ── 現在のDBスキーマを取得して存在チェック ──
  const getRes = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}`, {
    headers: notionHeaders(notionKey),
  })
  if (!getRes.ok) {
    return NextResponse.json({ error: 'DB取得失敗: ' + (await getRes.text()) }, { status: 500 })
  }
  const db = await getRes.json()
  const existingProps = Object.keys(db.properties ?? {})

  // ── 追加が必要なプロパティだけ絞り込む ──
  const toAdd: Record<string, unknown> = {}

  if (!existingProps.includes('deptId'))   toAdd['deptId']   = { rich_text: {} }
  if (!existingProps.includes('部署名'))   toAdd['部署名']   = { rich_text: {} }
  if (!existingProps.includes('自治体名')) toAdd['自治体名'] = { rich_text: {} }
  if (!existingProps.includes('コメント')) toAdd['コメント'] = { rich_text: {} }

  if (Object.keys(toAdd).length === 0) {
    return NextResponse.json({
      status:  'already_ok',
      message: '追加が必要なプロパティはありません。すべて設定済みです。',
      existing: existingProps,
    })
  }

  // ── PATCHでプロパティを追加 ──
  const patchRes = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}`, {
    method:  'PATCH',
    headers: notionHeaders(notionKey),
    body:    JSON.stringify({ properties: toAdd }),
  })

  if (!patchRes.ok) {
    const err = await patchRes.text()
    return NextResponse.json({ error: 'PATCH失敗: ' + err }, { status: 500 })
  }

  return NextResponse.json({
    status:  'ok',
    message: `プロパティを追加しました: ${Object.keys(toAdd).join(', ')}`,
    added:   Object.keys(toAdd),
    skipped: existingProps,
  })
}
