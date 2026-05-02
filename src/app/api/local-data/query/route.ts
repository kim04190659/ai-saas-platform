/**
 * /api/local-data/query
 *
 * Vercel（RunWith）側のプロキシAPI。
 * フロントエンドからのリクエストを受け取り、
 * Mac mini上のMCPゲートウェイ（ngrok経由）に転送して結果を返す。
 *
 * 設計原則：
 *   - 生データはMCPゲートウェイ側でマスク済み
 *   - このAPIはクエリ結果のみを受け取り、RunWithアプリに渡す
 *   - GATEWAY_API_KEY は Vercel 環境変数で管理（外部に漏らさない）
 */

import { NextRequest, NextResponse } from 'next/server'

// Vercel環境変数に設定すること
// GATEWAY_BASE_URL = https://tubeless-premium-legal.ngrok-free.dev（ngrok URL）
// GATEWAY_API_KEY  = mcp-gateway/.env の GATEWAY_API_KEY と同じ値
const GATEWAY_BASE_URL = process.env.GATEWAY_BASE_URL ?? 'http://localhost:3100'
const GATEWAY_API_KEY  = process.env.GATEWAY_API_KEY  ?? 'dev-key'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      type: 'csv' | 'excel'
      datasource_id: string
      filter?: Record<string, string>
      columns?: string[]
      limit?: number
      sheet_name?: string
    }

    const { type, ...queryParams } = body

    // クエリタイプに応じてゲートウェイのエンドポイントを選択
    const endpoint = type === 'excel'
      ? `${GATEWAY_BASE_URL}/api/query/excel`
      : `${GATEWAY_BASE_URL}/api/query/csv`

    // MCPゲートウェイにリクエストを転送
    const gatewayRes = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-gateway-api-key': GATEWAY_API_KEY,  // ゲートウェイ認証キー
      },
      body: JSON.stringify(queryParams),
      // タイムアウト: 10秒（オンプレが重い場合は延ばす）
      signal: AbortSignal.timeout(10_000),
    })

    if (!gatewayRes.ok) {
      const errBody = await gatewayRes.text()
      console.error(`[local-data/query] ゲートウェイエラー: ${gatewayRes.status} ${errBody}`)
      return NextResponse.json(
        { error: `ゲートウェイエラー: ${gatewayRes.status}`, detail: errBody },
        { status: gatewayRes.status }
      )
    }

    const data = await gatewayRes.json()
    return NextResponse.json(data)

  } catch (err) {
    // タイムアウトやネットワークエラーの場合
    const message = err instanceof Error ? err.message : String(err)

    if (message.includes('TimeoutError') || message.includes('abort')) {
      return NextResponse.json(
        { error: 'ゲートウェイへの接続がタイムアウトしました。Mac miniが起動しているか確認してください。' },
        { status: 504 }
      )
    }

    console.error('[local-data/query] エラー:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// データソース一覧取得（GETリクエスト）
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const municipality = searchParams.get('municipality') ?? undefined

    const url = new URL(`${GATEWAY_BASE_URL}/api/datasources`)
    if (municipality) url.searchParams.set('municipality', municipality)

    const gatewayRes = await fetch(url.toString(), {
      headers: { 'x-gateway-api-key': GATEWAY_API_KEY },
      signal: AbortSignal.timeout(5_000),
    })

    if (!gatewayRes.ok) {
      return NextResponse.json(
        { error: 'ゲートウェイに接続できません', datasources: [] },
        { status: 503 }
      )
    }

    const data = await gatewayRes.json()
    return NextResponse.json(data)

  } catch {
    // ゲートウェイが落ちている場合は空リストを返す（RunWithアプリは続行できる）
    return NextResponse.json({ datasources: [], count: 0, error: 'ゲートウェイ未接続' })
  }
}
