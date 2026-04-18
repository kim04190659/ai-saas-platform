'use client'

// =====================================================
//  src/app/(dashboard)/runwith/mcp-gateway/page.tsx
//  MCPゲートウェイ ログダッシュボード — Sprint #16
//
//  ■ 役割
//    /api/mcp-gateway 経由で行われたNotion操作の
//    監査ログを一覧表示する管理画面。
//
//  ■ 機能
//    - サマリーカード（総操作数・成功・失敗・処理中）
//    - フィルタータブ（全件 / 成功 / 失敗 / 処理中）
//    - ログカード一覧（操作名・ツール・日時・操作者・結果・レスポンス概要）
//    - 手動更新ボタン
//
//  ■ データ取得
//    Notion MCPゲートウェイ ログDB を直接クエリ（/api/mcp-log）
//    ※ 別途 GET /api/mcp-log を用意してもよいが、
//      ここでは /api/mcp-gateway の notion_query_database を経由して取得する
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// ─── 型定義 ──────────────────────────────────────────

/** ログ1件の型 */
interface LogRecord {
  id:              string
  operationName:   string   // 操作名（例: notion_search 実行）
  toolName:        string   // ツール名
  operator:        string   // 操作者
  targetResource:  string   // 対象リソース
  parameters:      string   // パラメータ（JSON文字列）
  result:          string   // 成功 / 失敗 / 処理中
  responseSummary: string   // レスポンス概要
  createdTime:     string   // 作成日時（ISO8601）
}

/** サマリー集計 */
interface Summary {
  total:      number
  success:    number
  failure:    number
  processing: number
}

// ─── 定数 ────────────────────────────────────────────

// MCPゲートウェイ ログDB の ID
const LOG_DB_ID = '4de5a346529d4d48b236befcd98d9d86'

const FILTER_TABS = [
  { key: '',     label: '全件',   emoji: '📋' },
  { key: '成功', label: '成功',   emoji: '✅' },
  { key: '失敗', label: '失敗',   emoji: '❌' },
  { key: '処理中', label: '処理中', emoji: '🔄' },
]

/** 結果バッジのスタイル */
function resultStyle(result: string): string {
  switch (result) {
    case '成功':  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case '失敗':  return 'bg-red-100 text-red-700 border-red-200'
    case '処理中': return 'bg-amber-100 text-amber-700 border-amber-200'
    default:      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

/** ツール名のスタイル */
function toolStyle(tool: string): string {
  if (tool.includes('search'))   return 'bg-blue-50 text-blue-600'
  if (tool.includes('create'))   return 'bg-violet-50 text-violet-600'
  if (tool.includes('query'))    return 'bg-orange-50 text-orange-600'
  if (tool.includes('get'))      return 'bg-sky-50 text-sky-600'
  return 'bg-slate-50 text-slate-500'
}

/** ISO8601 日時を見やすく整形 */
function formatDate(iso: string): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleString('ja-JP', {
      month:  '2-digit',
      day:    '2-digit',
      hour:   '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso.slice(0, 16)
  }
}

// ─── サブコンポーネント ───────────────────────────────

function SummaryCard({
  emoji, label, value, colorClass,
}: {
  emoji: string; label: string; value: number; colorClass: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="text-xl mb-1">{emoji}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function McpGatewayPage() {
  const [logs,         setLogs]         = useState<LogRecord[]>([])
  const [summary,      setSummary]      = useState<Summary>({ total: 0, success: 0, failure: 0, processing: 0 })
  const [activeFilter, setActiveFilter] = useState('')
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [expanded,     setExpanded]     = useState<string | null>(null)

  // ── データ取得 ──
  // /api/mcp-gateway の notion_query_database ツールを経由してログDBをQueryする
  const fetchLogs = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      // フィルター条件を組み立てる
      const queryParams: Record<string, unknown> = {
        database_id: LOG_DB_ID,
        page_size:   50,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }

      // 結果フィルターが指定されている場合
      if (activeFilter) {
        queryParams.filter = {
          property: '結果',
          select:   { equals: activeFilter },
        }
      }

      const res  = await fetch('/api/mcp-gateway', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          tool:     'notion_query_database',
          params:   queryParams,
          operator: 'dashboard',
        }),
      })
      const data = await res.json()

      if (data.error) {
        setError(data.error)
        return
      }

      // Notion レコードを LogRecord 型に変換
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const records: LogRecord[] = (data.result?.results ?? []).map((r: any) => {
        const p = r.properties
        return {
          id:              r.id,
          operationName:   p['操作名']?.title?.[0]?.plain_text         ?? '（不明）',
          toolName:        p['ツール名']?.rich_text?.[0]?.plain_text    ?? '',
          operator:        p['操作者']?.rich_text?.[0]?.plain_text      ?? '',
          targetResource:  p['対象リソース']?.rich_text?.[0]?.plain_text ?? '',
          parameters:      p['パラメータ']?.rich_text?.[0]?.plain_text   ?? '',
          result:          p['結果']?.select?.name                      ?? '処理中',
          responseSummary: p['レスポンス概要']?.rich_text?.[0]?.plain_text ?? '',
          createdTime:     r.created_time                               ?? '',
        }
      })

      setLogs(records)

      // サマリー集計（フィルターなしの全件で計算）
      // フィルターあり取得の場合はsummaryが偏るため、全件から計算する
      if (!activeFilter) {
        const success    = records.filter(r => r.result === '成功').length
        const failure    = records.filter(r => r.result === '失敗').length
        const processing = records.filter(r => r.result === '処理中').length
        setSummary({ total: records.length, success, failure, processing })
      }
    } catch (err) {
      setError(`データ取得エラー: ${String(err)}`)
    } finally {
      setLoading(false)
    }
  }, [activeFilter])

  useEffect(() => {
    fetchLogs()
  }, [fetchLogs])

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── ページヘッダー ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-orange-100 flex items-center justify-center text-lg">🔐</div>
            <div>
              <h1 className="text-base font-bold text-slate-800">MCPゲートウェイ ログダッシュボード</h1>
              <p className="text-xs text-slate-500">
                /api/mcp-gateway 経由のNotion操作を監査ログとして記録・確認する
              </p>
            </div>
          </div>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="px-3 py-1.5 rounded-lg border border-orange-200 text-xs text-orange-700 bg-orange-50 hover:bg-orange-100 transition-colors disabled:opacity-50"
          >
            🔄 更新
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-4 space-y-4">

        {/* ── サマリーカード ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            emoji="📊" label="総操作数" value={summary.total}
            colorClass="bg-white border-slate-200 text-slate-700"
          />
          <SummaryCard
            emoji="✅" label="成功"     value={summary.success}
            colorClass="bg-emerald-50 border-emerald-200 text-emerald-700"
          />
          <SummaryCard
            emoji="❌" label="失敗"     value={summary.failure}
            colorClass={summary.failure > 0 ? 'bg-red-50 border-red-200 text-red-700' : 'bg-white border-slate-200 text-slate-700'}
          />
          <SummaryCard
            emoji="🔄" label="処理中"  value={summary.processing}
            colorClass="bg-amber-50 border-amber-200 text-amber-700"
          />
        </div>

        {/* ── エラー表示 ── */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            ❌ {error}
          </div>
        )}

        {/* ── フィルタータブ ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveFilter(tab.key)}
              className={`flex-1 px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                activeFilter === tab.key
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* ── ログ一覧 ── */}
        <div className="space-y-2">
          {loading ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">読み込み中…</p>
            </div>
          ) : logs.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
              <p className="text-2xl mb-2">🔐</p>
              <p className="text-sm font-medium text-slate-600">
                {activeFilter ? `「${activeFilter}」のログはありません` : 'まだログがありません'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                POST /api/mcp-gateway でNotion操作を実行するとここに記録されます
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 px-1">{logs.length} 件のログ</p>
              {logs.map(log => (
                <div
                  key={log.id}
                  className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden"
                >
                  {/* カードヘッダー */}
                  <div className="px-4 py-3 flex items-center gap-3">
                    {/* 結果バッジ */}
                    <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full border font-bold ${resultStyle(log.result)}`}>
                      {log.result}
                    </span>

                    {/* ツール名バッジ */}
                    {log.toolName && (
                      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-md font-medium ${toolStyle(log.toolName)}`}>
                        {log.toolName}
                      </span>
                    )}

                    {/* 操作名 */}
                    <p className="flex-1 text-sm font-medium text-slate-700 truncate">
                      {log.operationName}
                    </p>

                    {/* 日時・操作者 */}
                    <div className="text-right shrink-0">
                      <p className="text-xs text-slate-500">{formatDate(log.createdTime)}</p>
                      {log.operator && (
                        <p className="text-xs text-slate-400">{log.operator}</p>
                      )}
                    </div>

                    {/* 詳細展開ボタン */}
                    <button
                      onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      className="shrink-0 text-xs text-slate-400 hover:text-slate-600 px-2 py-1 rounded border border-slate-200"
                    >
                      {expanded === log.id ? '閉じる' : '詳細'}
                    </button>
                  </div>

                  {/* レスポンス概要（常時表示） */}
                  {log.responseSummary && (
                    <div className="px-4 pb-2">
                      <p className="text-xs text-slate-500 truncate">{log.responseSummary}</p>
                    </div>
                  )}

                  {/* 詳細展開時 */}
                  {expanded === log.id && (
                    <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
                      {log.targetResource && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-0.5">対象リソース</p>
                          <p className="text-xs text-slate-700 font-mono bg-slate-50 rounded px-2 py-1 break-all">
                            {log.targetResource}
                          </p>
                        </div>
                      )}
                      {log.parameters && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-0.5">パラメータ</p>
                          <pre className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5 overflow-x-auto whitespace-pre-wrap break-all">
                            {(() => {
                              try { return JSON.stringify(JSON.parse(log.parameters), null, 2) }
                              catch { return log.parameters }
                            })()}
                          </pre>
                        </div>
                      )}
                      {log.responseSummary && (
                        <div>
                          <p className="text-xs font-medium text-slate-500 mb-0.5">レスポンス概要</p>
                          <p className="text-xs text-slate-600 bg-slate-50 rounded px-2 py-1.5 break-all whitespace-pre-wrap">
                            {log.responseSummary}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* ── 使い方ガイド ── */}
        <div className="bg-orange-50 rounded-2xl border border-orange-200 p-4">
          <p className="text-xs font-semibold text-orange-700 mb-2">
            🔐 MCPゲートウェイの使い方
          </p>
          <p className="text-xs text-orange-700 leading-relaxed mb-2">
            <code className="bg-orange-100 px-1 rounded">POST /api/mcp-gateway</code> にリクエストを送ると、
            Notion操作を中継しながら監査ログをここに自動記録します。
          </p>
          <pre className="text-xs bg-white border border-orange-200 rounded-lg p-3 text-slate-700 overflow-x-auto">{`{
  "tool": "notion_search",
  "params": { "query": "屋久島" },
  "operator": "吉高"
}`}</pre>
        </div>

      </div>
    </div>
  )
}
