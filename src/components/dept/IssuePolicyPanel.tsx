'use client'
// =====================================================
//  src/components/dept/IssuePolicyPanel.tsx
//  困り事 → 施策提案パネル — Sprint #44
//
//  ■ 役割
//    住民困り事レーダーの蓄積データを集計し、
//    カテゴリ別トレンドと AI 施策提案を表示する。
//    「今すぐ分析」ボタンで /api/cron/issue-policy を呼び出す。
// =====================================================

import { useState } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import { SummaryCard } from '@/components/ui/SummaryCard'

// ─── 型定義 ──────────────────────────────────────────

interface CategorySummary {
  category:      string
  count:         number
  prevCount:     number
  trend:         'new' | 'up' | 'stable' | 'down' | 'resolved'
  trendDelta:    number
  criticalCount: number
  topIssues:     string[]
}

interface ProposalAlert {
  level:      'critical' | 'warning' | 'info'
  title:      string
  action?:    string
  targetDept?: string
}

interface PolicyResult {
  status:           'success' | 'error'
  dateLabel?:       string
  alertCount?:      number
  alerts?:          ProposalAlert[]
  categorySummary?: CategorySummary[]
  notionPage?:      { id: string; url: string } | null
  message?:         string
}

// ─── スタイルヘルパー ─────────────────────────────────

const TREND_CONFIG = {
  new:      { emoji: '🆕', label: '新規',      cls: 'bg-blue-100 text-blue-700'    },
  up:       { emoji: '🔺', label: '増加',      cls: 'bg-red-100 text-red-700'      },
  stable:   { emoji: '➡️', label: '継続',      cls: 'bg-gray-100 text-gray-600'    },
  down:     { emoji: '🔻', label: '改善中',    cls: 'bg-emerald-100 text-emerald-700' },
  resolved: { emoji: '✅', label: '解決',      cls: 'bg-green-100 text-green-700'  },
}

const URGENCY_CONFIG = {
  critical: { label: '⚡ 今週中', cls: 'bg-red-100 text-red-700 border-red-200'       },
  warning:  { label: '📅 1ヶ月', cls: 'bg-amber-100 text-amber-700 border-amber-200'  },
  info:     { label: '🗓️ 3ヶ月',  cls: 'bg-sky-100 text-sky-700 border-sky-200'       },
}

// カテゴリのアイコン
const CATEGORY_ICONS: Record<string, string> = {
  '道路・インフラ': '🛣️',
  'ゴミ・環境':    '♻️',
  '子育て・教育':  '👶',
  '高齢者・福祉':  '👴',
  '防災・安全':    '🚨',
  '観光・交流':    '🗺️',
  '行政手続き':    '📋',
  '騒音・生活':    '🔊',
  'その他':        '📌',
}

function categoryIcon(title: string): string {
  for (const [cat, icon] of Object.entries(CATEGORY_ICONS)) {
    if (title.includes(cat)) return icon
  }
  return '📌'
}

// ─── トレンドバー（カテゴリ別ミニグラフ） ─────────────

function TrendBar({ summary }: { summary: CategorySummary }) {
  const cfg   = TREND_CONFIG[summary.trend]
  const maxW  = Math.max(summary.count, summary.prevCount, 1)
  const currW = Math.round((summary.count   / maxW) * 100)
  const prevW = Math.round((summary.prevCount / maxW) * 100)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{CATEGORY_ICONS[summary.category] ?? '📌'}</span>
          <span className="text-sm font-semibold text-gray-700">{summary.category}</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.cls}`}>
          {cfg.emoji} {cfg.label}
          {Math.abs(summary.trendDelta) > 0 && ` (${summary.trendDelta > 0 ? '+' : ''}${summary.trendDelta})`}
        </span>
      </div>

      {/* 今回バー */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-10 text-right shrink-0">今週</span>
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${summary.criticalCount > 0 ? 'bg-red-400' : 'bg-teal-400'}`}
              style={{ width: `${currW}%` }}
            />
          </div>
          <span className="w-8 text-right font-semibold text-gray-700">{summary.count}件</span>
        </div>

        {/* 前回バー（前回データがある場合） */}
        {summary.prevCount > 0 && (
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span className="w-10 text-right shrink-0">前回</span>
            <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gray-300 transition-all"
                style={{ width: `${prevW}%` }}
              />
            </div>
            <span className="w-8 text-right">{summary.prevCount}件</span>
          </div>
        )}
      </div>

      {/* 代表的な困り事（最大3件） */}
      {summary.topIssues.length > 0 && (
        <div className="pt-1 border-t border-gray-100">
          {summary.topIssues.map((issue, i) => (
            <p key={i} className="text-xs text-gray-500 truncate">• {issue}</p>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── メインパネル ─────────────────────────────────────

export function IssuePolicyPanel() {
  const { municipalityId, municipality } = useMunicipality()

  const [loading,     setLoading]     = useState(false)
  const [result,      setResult]      = useState<PolicyResult | null>(null)
  const [activeTab,   setActiveTab]   = useState<'trend' | 'policy'>('trend')
  const [showDetail,  setShowDetail]  = useState(true)

  // ─── 分析実行 ──────────────────────────────────────

  async function handleRun() {
    setLoading(true)
    setResult(null)
    try {
      const res  = await fetch('/api/cron/issue-policy', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ municipalityId }),
      })
      const data = await res.json() as PolicyResult
      setResult(data)
      setShowDetail(true)
    } catch (e) {
      setResult({ status: 'error', message: String(e) })
    } finally {
      setLoading(false)
    }
  }

  // ─── 集計値 ────────────────────────────────────────

  const totalIssues     = result?.categorySummary?.reduce((s, c) => s + c.count, 0) ?? 0
  const upCount         = result?.categorySummary?.filter((c) => c.trend === 'up').length      ?? 0
  const downCount       = result?.categorySummary?.filter((c) => c.trend === 'down').length    ?? 0
  const immediateCount  = result?.alerts?.filter((a) => a.level === 'critical').length         ?? 0

  // ─── 描画 ──────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* タイトル */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">💡 困り事 → 施策提案サイクル</h1>
        <p className="text-gray-500 text-sm">
          {municipality.name} — 住民困り事レーダーで収集したデータを集計し、
          前回との比較でトレンドを把握。AIが具体的な施策を提案します。
        </p>
      </div>

      {/* サイクル説明 */}
      <div className="bg-gradient-to-r from-teal-50 to-sky-50 border border-teal-200 rounded-xl p-4">
        <div className="flex items-center gap-2 text-sm text-teal-700 font-medium mb-2">
          🔄 Well-Being 向上サイクル
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-600 flex-wrap">
          <span className="px-2 py-1 bg-white rounded-lg border border-teal-200">🎯 困り事収集</span>
          <span>→</span>
          <span className="px-2 py-1 bg-white rounded-lg border border-sky-200">📊 トレンド分析</span>
          <span>→</span>
          <span className="px-2 py-1 bg-teal-100 rounded-lg border border-teal-300 font-medium">💡 施策提案</span>
          <span>→</span>
          <span className="px-2 py-1 bg-white rounded-lg border border-teal-200">✅ 実行・確認</span>
          <span>→</span>
          <span className="px-2 py-1 bg-white rounded-lg border border-teal-200">🎯 再収集（翌週）</span>
        </div>
      </div>

      {/* 実行カード */}
      <div className="rounded-xl border-2 p-5 bg-sky-50 border-sky-200">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">💡</span>
            <div>
              <h3 className="font-bold text-base text-sky-700">困り事を集計して施策を提案する</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">
                🕐 毎週月曜 09:00 自動実行（困り事収集の2時間後）
              </span>
            </div>
          </div>
          <button
            onClick={handleRun}
            disabled={loading}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 bg-sky-600 hover:bg-sky-700 text-white"
          >
            {loading ? '🔄 分析中…' : '▶ 今すぐ分析'}
          </button>
        </div>
        <p className="text-sm text-gray-600 leading-relaxed">
          Notionに蓄積された最新・前回の困り事レポートを比較。増加・改善・解決のトレンドを検出し、
          優先度の高い課題からAIが施策を提案します。
        </p>
      </div>

      {/* 実行結果 */}
      {result && (
        <div className="space-y-4">
          {result.status === 'error' ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
              ❌ {result.message}
              {result.message?.includes('困り事レポートが見つかりません') && (
                <p className="mt-2 text-xs">
                  → 先に「🎯 住民困り事レーダー」を実行してください
                </p>
              )}
            </div>
          ) : (
            <>
              {/* サマリーカード 4枚 */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <SummaryCard icon="📋" label="今週の困り事" value={totalIssues} sub="件"
                  colorClass="bg-white border-slate-200 text-slate-700" />
                <SummaryCard icon="🔺" label="増加カテゴリ" value={upCount} sub="件"
                  colorClass="bg-red-50 border-red-200 text-red-700" />
                <SummaryCard icon="🔻" label="改善カテゴリ" value={downCount} sub="件"
                  colorClass="bg-emerald-50 border-emerald-200 text-emerald-700" />
                <SummaryCard icon="⚡" label="今週中に対応" value={immediateCount} sub="施策"
                  colorClass="bg-amber-50 border-amber-200 text-amber-700" />
              </div>

              {/* Notion リンク */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-700">
                  ✅ 分析完了 — {result.dateLabel} / 施策提案 {result.alertCount}件
                </span>
                <div className="flex items-center gap-3">
                  {result.notionPage && (
                    <a href={result.notionPage.url} target="_blank" rel="noopener noreferrer"
                       className="text-xs text-blue-600 hover:underline">
                      📝 Notionで確認
                    </a>
                  )}
                  <button onClick={() => setShowDetail((v) => !v)}
                          className="text-xs text-gray-500 hover:text-gray-700">
                    {showDetail ? '▲ 閉じる' : '▼ 詳細'}
                  </button>
                </div>
              </div>

              {showDetail && (
                <>
                  {/* タブ切り替え */}
                  <div className="flex gap-2 border-b border-gray-200">
                    {[
                      { key: 'trend',  label: '📊 カテゴリ別トレンド' },
                      { key: 'policy', label: '💡 AI施策提案' },
                    ].map((tab) => (
                      <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key as 'trend' | 'policy')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                          activeTab === tab.key
                            ? 'border-sky-500 text-sky-700'
                            : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  {/* トレンドタブ */}
                  {activeTab === 'trend' && result.categorySummary && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {result.categorySummary.map((s) => (
                        <TrendBar key={s.category} summary={s} />
                      ))}
                    </div>
                  )}

                  {/* 施策提案タブ */}
                  {activeTab === 'policy' && result.alerts && result.alerts.length > 0 && (
                    <div className="space-y-3">
                      {result.alerts.map((proposal, i) => {
                        const urg = URGENCY_CONFIG[proposal.level]
                        return (
                          <div key={i}
                               className={`p-4 bg-white rounded-xl border-2 ${urg.cls.split(' ').find((c) => c.startsWith('border')) ?? 'border-gray-200'}`}>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">{categoryIcon(proposal.title)}</span>
                                <span className="font-semibold text-gray-800 text-sm">{proposal.title}</span>
                              </div>
                              <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium border ${urg.cls}`}>
                                {urg.label}
                              </span>
                            </div>
                            {proposal.action && (
                              <p className="text-xs text-gray-600 leading-relaxed">
                                ▶ {proposal.action}
                              </p>
                            )}
                            {proposal.targetDept && (
                              <p className="text-xs text-gray-400 mt-1">
                                🏢 担当: {proposal.targetDept}
                              </p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      )}

      {/* 注記 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>※ 施策提案はAIによる参考情報です。実施可否は担当課が判断してください</p>
        <p>※ トレンドは直近2回の困り事レポートを比較しています。初回実行時は「新規」と表示されます</p>
        <p>※ LINE通知はLINE_CHANNEL_ACCESS_TOKENが設定されている場合のみ送信されます</p>
      </div>
    </div>
  )
}
