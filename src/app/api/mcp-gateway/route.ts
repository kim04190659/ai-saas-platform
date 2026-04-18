// =====================================================
//  src/app/api/mcp-gateway/route.ts
//  MCPゲートウェイ API — Sprint #16
//
//  ■ 役割
//    Vercel（Next.js）をMCPゲートウェイとして活用し、
//    Notion操作の中継＋監査ログの自動記録を行う中間層。
//
//  ■ 対応ツール（POST /api/mcp-gateway）
//    - notion_search        : Notionページ検索
//    - notion_get_page      : ページ取得
//    - notion_create_page   : ページ作成
//    - notion_query_database: DBクエリ
//
//  ■ リクエスト形式
//    { "tool": "notion_search", "params": { "query": "検索ワード" }, "operator": "吉高" }
//
//  ■ ログ保存先
//    🔐 MCPゲートウェイ ログDB（ID: 4de5a346529d4d48b236befcd98d9d86）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'

// MCPゲートウェイ ログDB のID（Sprint #16 設計書より）
const LOG_DB_ID = '4de5a346529d4d48b236befcd98d9d86'

// ─── ヘルパー ─────────────────────────────────────────

/** Notion API 共通ヘッダー */
function notionHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── 対応ツール定義 ───────────────────────────────────

type ToolHandler = (params: Record<string, unknown>, apiKey: string) => Promise<unknown>

/**
 * 各ツールの実行関数。
 * paramsはリクエストボディの "params" フィールドをそのまま渡す。
 */
const TOOL_HANDLERS: Record<string, ToolHandler> = {

  // Notionページ・データベースを横断検索する
  notion_search: async (params, apiKey) => {
    const res = await fetch(`${NOTION_API_BASE}/search`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify(params),
    })
    return res.json()
  },

  // 指定IDのNotionページを取得する
  notion_get_page: async (params, apiKey) => {
    const { page_id } = params as { page_id: string }
    if (!page_id) throw new Error('page_id が必要です')
    const res = await fetch(`${NOTION_API_BASE}/pages/${page_id}`, {
      method:  'GET',
      headers: notionHeaders(apiKey),
    })
    return res.json()
  },

  // 新しいNotionページを作成する
  notion_create_page: async (params, apiKey) => {
    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify(params),
    })
    return res.json()
  },

  // NotionデータベースをフィルターつきでQueryする
  notion_query_database: async (params, apiKey) => {
    const { database_id, ...queryParams } = params as { database_id: string; [key: string]: unknown }
    if (!database_id) throw new Error('database_id が必要です')
    const res = await fetch(`${NOTION_API_BASE}/databases/${database_id}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify(queryParams),
    })
    return res.json()
  },
}

// ─── ログ保存 ─────────────────────────────────────────

/**
 * 操作ログをMCPゲートウェイ ログDBに保存する。
 * ログ保存の失敗はメイン処理に影響させない（サイレント処理）。
 */
async function saveLog(
  apiKey:         string,
  toolName:       string,
  operator:       string,
  params:         Record<string, unknown>,
  result:         '成功' | '失敗' | '処理中',
  responseSummary: string,
  targetResource:  string,
): Promise<void> {
  try {
    // パラメータをJSON文字列化（2000文字上限でトリム）
    const paramsStr = JSON.stringify(params).slice(0, 2000)

    await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body: JSON.stringify({
        parent: { database_id: LOG_DB_ID },
        properties: {
          // タイトル: "ツール名 実行" 形式
          '操作名': {
            title: [{ text: { content: `${toolName} 実行` } }],
          },
          '操作者': {
            rich_text: [{ text: { content: operator } }],
          },
          'ツール名': {
            rich_text: [{ text: { content: toolName } }],
          },
          '対象リソース': {
            rich_text: [{ text: { content: targetResource.slice(0, 200) } }],
          },
          'パラメータ': {
            rich_text: [{ text: { content: paramsStr } }],
          },
          '結果': {
            select: { name: result },
          },
          'レスポンス概要': {
            rich_text: [{ text: { content: responseSummary.slice(0, 2000) } }],
          },
        },
      }),
    })
  } catch (logErr) {
    // ログ保存失敗はサイレントに無視（メイン処理を止めない）
    console.error('[mcp-gateway] ログ保存失敗:', logErr)
  }
}

// ─── POST ハンドラ ────────────────────────────────────

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  // ── リクエスト解析 ──
  let body: { tool?: string; params?: Record<string, unknown>; operator?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'リクエストボディが不正です' }, { status: 400 })
  }

  const tool     = body.tool     ?? ''
  const params   = body.params   ?? {}
  const operator = body.operator ?? 'system'

  // ── ツール存在チェック ──
  if (!tool || !TOOL_HANDLERS[tool]) {
    const supported = Object.keys(TOOL_HANDLERS).join(', ')
    return NextResponse.json(
      { error: `未対応のツール: "${tool}"。対応ツール: ${supported}` },
      { status: 400 }
    )
  }

  // ── 対象リソースの特定（ログ記録用） ──
  const targetResource = String(
    (params as Record<string, unknown>).page_id       ??
    (params as Record<string, unknown>).database_id   ??
    (params as Record<string, unknown>).query         ??
    ''
  )

  // ── ツール実行 ──
  let execResult: unknown
  let success = true
  let responseSummary = ''

  try {
    execResult      = await TOOL_HANDLERS[tool](params, notionApiKey)
    responseSummary = JSON.stringify(execResult).slice(0, 500)
  } catch (execErr) {
    success         = false
    responseSummary = String(execErr)
  }

  // ── ログ保存 ──
  await saveLog(
    notionApiKey,
    tool,
    operator,
    params,
    success ? '成功' : '失敗',
    responseSummary,
    targetResource,
  )

  // ── レスポンス返却 ──
  if (!success) {
    return NextResponse.json(
      { error: responseSummary },
      { status: 500 }
    )
  }

  return NextResponse.json({ result: execResult, tool, operator })
}

// ─── GET ハンドラ（ヘルスチェック兼ツール一覧） ────────

export async function GET() {
  return NextResponse.json({
    status:  'ok',
    version: '1.0.0',
    sprint:  '#16',
    tools:   Object.keys(TOOL_HANDLERS),
    usage: {
      method:      'POST',
      contentType: 'application/json',
      body: {
        tool:     'notion_search | notion_get_page | notion_create_page | notion_query_database',
        params:   '{ ... }',
        operator: '操作者名（省略時: "system"）',
      },
    },
  })
}
