/**
 * index.ts — RunWith MCPゲートウェイ サーバ本体
 *
 * 役割：
 *   1. MCP Server（Claude Desktopから直接接続）
 *   2. REST API（Vercel上のRunWithアプリからngrok経由で接続）
 *
 * 提供ツール（MCPツール）：
 *   - list_datasources : 利用可能なデータソースの一覧を返す
 *   - query_csv        : CSVデータをクエリして匿名化済み結果を返す
 *   - query_excel      : Excelデータをクエリして匿名化済み結果を返す
 *
 * 設計原則：
 *   生データはこのサーバから外に出ない。
 *   Claudeには「クエリ結果（集計・匿名化済み）」のみ渡す。
 */

import express from 'express'
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { listDataSources, getDataSource } from './datasource-registry'
import { readCsv } from './adapters/csv-adapter'
import { readExcel } from './adapters/excel-adapter'

const PORT = parseInt(process.env.PORT ?? '3100', 10)
const GATEWAY_API_KEY = process.env.GATEWAY_API_KEY ?? 'dev-key'

// ════════════════════════════════════════════════
//  MCP Server 定義
//  Claude Desktop が stdio 経由で直接接続する
// ════════════════════════════════════════════════

const mcpServer = new McpServer({
  name: 'runwith-local-gateway',
  version: '1.0.0',
})

// ── ツール①: データソース一覧 ──
mcpServer.tool(
  'list_datasources',
  'RunWithゲートウェイで利用可能なデータソースの一覧を返す。まずこのツールを呼んで利用可能なデータを確認すること。',
  {
    municipality: z.string().optional().describe('自治体名でフィルタリング（例: 霧島市）'),
  },
  async ({ municipality }) => {
    const sources = listDataSources(municipality)
    const result = sources.map(ds => ({
      id: ds.id,
      label: ds.label,
      description: ds.description,
      type: ds.type,
      org: ds.org,
      municipality: ds.municipality,
      columns: ds.columns,
    }))
    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify({ datasources: result, count: result.length }, null, 2),
        },
      ],
    }
  }
)

// ── ツール②: CSVクエリ ──
mcpServer.tool(
  'query_csv',
  'CSVファイルを読み込んで匿名化済みデータを返す。個人情報フィールドは自動的にマスクされる。',
  {
    datasource_id: z.string().describe('データソースID（list_datasources で確認）'),
    filter: z.record(z.string()).optional().describe('フィルタ条件（例: {"地区名": "国分中央"}）'),
    columns: z.array(z.string()).optional().describe('取得するカラム名（省略時は全カラム）'),
    limit: z.number().optional().describe('最大取得件数（デフォルト: 100）'),
  },
  async ({ datasource_id, filter, columns, limit }) => {
    // データソース定義を確認
    const ds = getDataSource(datasource_id)
    if (!ds) {
      return {
        content: [{ type: 'text' as const, text: `エラー: データソースが見つかりません: ${datasource_id}` }],
        isError: true,
      }
    }
    if (ds.type !== 'csv') {
      return {
        content: [{ type: 'text' as const, text: `エラー: ${datasource_id} は CSV ではありません（型: ${ds.type}）` }],
        isError: true,
      }
    }

    try {
      const result = await readCsv({
        datasource: ds.filePath,
        filter,
        columns,
        limit,
      })
      console.log(`[MCP] query_csv: ${datasource_id} → ${result.records.length}件取得 (全${result.totalCount}件)`)
      if (result.maskedFields.length > 0) {
        console.log(`[MCP] 匿名化フィールド: ${result.maskedFields.join(', ')}`)
      }
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              datasource: datasource_id,
              label: ds.label,
              recordCount: result.records.length,
              totalCount: result.totalCount,
              maskedFields: result.maskedFields,
              records: result.records,
            }, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text' as const, text: `エラー: ${message}` }],
        isError: true,
      }
    }
  }
)

// ── ツール③: Excelクエリ ──
mcpServer.tool(
  'query_excel',
  'Excelファイルを読み込んで匿名化済みデータを返す。シートを指定できる。',
  {
    datasource_id: z.string().describe('データソースID（list_datasources で確認）'),
    sheet_name: z.string().optional().describe('シート名（省略時は最初のシート）'),
    filter: z.record(z.string()).optional().describe('フィルタ条件'),
    columns: z.array(z.string()).optional().describe('取得するカラム名'),
    limit: z.number().optional().describe('最大取得件数（デフォルト: 100）'),
  },
  async ({ datasource_id, sheet_name, filter, columns, limit }) => {
    const ds = getDataSource(datasource_id)
    if (!ds) {
      return {
        content: [{ type: 'text' as const, text: `エラー: データソースが見つかりません: ${datasource_id}` }],
        isError: true,
      }
    }
    if (ds.type !== 'excel') {
      return {
        content: [{ type: 'text' as const, text: `エラー: ${datasource_id} は Excel ではありません（型: ${ds.type}）` }],
        isError: true,
      }
    }

    try {
      const result = await readExcel({
        datasource: ds.filePath,
        sheetName: sheet_name,
        filter,
        columns,
        limit,
      })
      console.log(`[MCP] query_excel: ${datasource_id}[${result.sheetName}] → ${result.records.length}件取得`)
      return {
        content: [
          {
            type: 'text' as const,
            text: JSON.stringify({
              datasource: datasource_id,
              label: ds.label,
              sheetName: result.sheetName,
              availableSheets: result.availableSheets,
              recordCount: result.records.length,
              totalCount: result.totalCount,
              maskedFields: result.maskedFields,
              records: result.records,
            }, null, 2),
          },
        ],
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return {
        content: [{ type: 'text' as const, text: `エラー: ${message}` }],
        isError: true,
      }
    }
  }
)

// ════════════════════════════════════════════════
//  REST API Server
//  Vercel（RunWith）からngrok経由でアクセスする
// ════════════════════════════════════════════════

const app = express()
app.use(express.json())

// API Key 認証ミドルウェア
function requireApiKey(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
): void {
  const key = req.headers['x-gateway-api-key']
  if (key !== GATEWAY_API_KEY) {
    res.status(401).json({ error: '認証エラー: API Keyが不正です' })
    return
  }
  next()
}

// ヘルスチェック（認証不要）
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'runwith-mcp-gateway', version: '1.0.0' })
})

// データソース一覧
app.get('/api/datasources', requireApiKey, (req, res) => {
  const municipality = req.query.municipality as string | undefined
  const sources = listDataSources(municipality)
  res.json({ datasources: sources, count: sources.length })
})

// CSVクエリエンドポイント
app.post('/api/query/csv', requireApiKey, async (req, res) => {
  const { datasource_id, filter, columns, limit } = req.body as {
    datasource_id: string
    filter?: Record<string, string>
    columns?: string[]
    limit?: number
  }

  const ds = getDataSource(datasource_id)
  if (!ds) {
    res.status(404).json({ error: `データソースが見つかりません: ${datasource_id}` })
    return
  }

  try {
    const result = await readCsv({ datasource: ds.filePath, filter, columns, limit })
    res.json({ ...result, label: ds.label, datasource: datasource_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

// Excelクエリエンドポイント
app.post('/api/query/excel', requireApiKey, async (req, res) => {
  const { datasource_id, sheet_name, filter, columns, limit } = req.body as {
    datasource_id: string
    sheet_name?: string
    filter?: Record<string, string>
    columns?: string[]
    limit?: number
  }

  const ds = getDataSource(datasource_id)
  if (!ds) {
    res.status(404).json({ error: `データソースが見つかりません: ${datasource_id}` })
    return
  }

  try {
    const result = await readExcel({ datasource: ds.filePath, sheetName: sheet_name, filter, columns, limit })
    res.json({ ...result, label: ds.label, datasource: datasource_id })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    res.status(500).json({ error: message })
  }
})

// ════════════════════════════════════════════════
//  起動処理
// ════════════════════════════════════════════════

async function main() {
  // REST APIサーバを起動
  app.listen(PORT, () => {
    console.log(`[MCPゲートウェイ] REST API起動: http://localhost:${PORT}`)
    console.log(`[MCPゲートウェイ] データフォルダ: ${process.env.DATA_ROOT ?? 'mcp-gateway/data'}`)
    console.log(`[MCPゲートウェイ] 登録データソース数: ${listDataSources().length}`)
  })

  // MCPサーバを stdio で起動（Claude Desktopからの接続用）
  // ※ REST APIと共存するため、stdinが TTY でない場合のみ起動
  if (!process.stdin.isTTY) {
    const transport = new StdioServerTransport()
    await mcpServer.connect(transport)
    console.error('[MCPゲートウェイ] MCPサーバ起動（stdio）')
  }
}

main().catch(err => {
  console.error('[MCPゲートウェイ] 起動エラー:', err)
  process.exit(1)
})
