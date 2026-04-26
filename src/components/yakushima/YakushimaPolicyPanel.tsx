'use client'
// =====================================================
//  src/components/yakushima/YakushimaPolicyPanel.tsx
//  屋久島町 データ参照型AI施策パネル — Sprint #46
//
//  ■ 表示内容
//    1. 5本のNotionDBから読み込んだ実データのサマリー
//    2. データに基づいた施策提案（数値引用付き）
//    3. データ不足の指摘（何を蓄積すべきか）
//
//  ■ 従来の困り事→施策エンジンとの違い
//    - 従来: 「一般的に〇〇が有効です」という汎用提案
//    - 今回: 「安房小学校は2020年42人→2025年27人(-36%)のため…」
//            という実データ引用提案
// =====================================================

import { useState } from 'react'
import { SummaryCard } from '@/components/ui/SummaryCard'

// ─── 型定義 ───────────────────────────────────────────────

type Proposal = {
  category: string
  title: string
  rationale: string
  action: string
  urgency: 'immediate' | 'short' | 'medium'
  owner: string
  dataEvidence: string[]
  level: 'critical' | 'warning' | 'info'
}

type DataGap = {
  category: string
  description: string
  impact: string
  howToCollect: string
}

type DataContext = {
  schoolSummary: string
  ictSummary: string
  populationSummary: string
  migrationSummary: string
  tourismSummary: string
}

type ApiResponse = {
  status: string
  dateLabel?: string
  dataContext?: DataContext
  proposals?: Proposal[]
  dataGaps?: DataGap[]
  notionPage?: string
  message?: string
}

// ─── スタイル設定 ─────────────────────────────────────────

/** 緊急度別のスタイル */
const URGENCY_CONFIG: Record<string, {
  bg: string; border: string; badge: string; dot: string; label: string
}> = {
  immediate: {
    bg:     'bg-red-50',
    border: 'border-red-300',
    badge:  'bg-red-100 text-red-700',
    dot:    'bg-red-500',
    label:  '🔴 緊急',
  },
  short: {
    bg:     'bg-yellow-50',
    border: 'border-yellow-300',
    badge:  'bg-yellow-100 text-yellow-700',
    dot:    'bg-yellow-500',
    label:  '🟡 短期',
  },
  medium: {
    bg:     'bg-green-50',
    border: 'border-green-300',
    badge:  'bg-green-100 text-green-700',
    dot:    'bg-green-500',
    label:  '🟢 中期',
  },
}

/** データソースの見出し */
const DATA_SOURCE_LABELS: Record<keyof DataContext, { emoji: string; label: string; color: string }> = {
  schoolSummary:     { emoji: '📚', label: '学校別児童生徒数推移',  color: 'blue'   },
  ictSummary:        { emoji: '💻', label: 'ICT環境整備状況',       color: 'purple' },
  populationSummary: { emoji: '👥', label: '人口動態・地区別統計',  color: 'orange' },
  migrationSummary:  { emoji: '🏡', label: '移住・定住実績',        color: 'teal'   },
  tourismSummary:    { emoji: '🌿', label: '観光統計・環境負荷',    color: 'green'  },
}

// ─── コンポーネント ───────────────────────────────────────

export function YakushimaPolicyPanel() {
  const [loading, setLoading]           = useState(false)
  const [result, setResult]             = useState<ApiResponse | null>(null)
  const [activeTab, setActiveTab]       = useState<'data' | 'proposals' | 'gaps'>('proposals')
  const [expandedGap, setExpandedGap]   = useState<number | null>(null)

  // ─── AI 実行 ───────────────────────────────────────────
  const handleRun = async () => {
    setLoading(true)
    setResult(null)
    try {
      const res = await fetch('/api/yakushima/policy-engine', { method: 'POST' })
      const data = await res.json() as ApiResponse
      setResult(data)
      // データタブを初期表示後、提案タブへ切り替え
      if (data.status === 'success') setActiveTab('proposals')
    } catch {
      setResult({ status: 'error', message: '通信エラーが発生しました' })
    } finally {
      setLoading(false)
    }
  }

  // ─── 統計カード用の集計 ────────────────────────────────
  const proposals   = result?.proposals   ?? []
  const dataGaps    = result?.dataGaps    ?? []
  const urgentCount = proposals.filter(p => p.urgency === 'immediate').length

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            🧩 データ参照型施策提案エンジン
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            屋久島町の5本のNotionDBを読み込み、実際の数値を引用した施策提案を生成します
          </p>
        </div>

        {/* 実行ボタン */}
        <button
          onClick={handleRun}
          disabled={loading}
          className={`
            flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium text-sm transition
            ${loading
              ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
              : 'bg-green-600 hover:bg-green-700 text-white shadow-sm'
            }
          `}
        >
          {loading ? (
            <>
              <span className="animate-spin">⏳</span>
              DBを読み込んでAI分析中…
            </>
          ) : (
            <>📊 データ読み込み &amp; 施策提案生成</>
          )}
        </button>
      </div>

      {/* データソースバッジ（常に表示） */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <p className="text-xs font-semibold text-gray-500 mb-3">📡 参照する屋久島町向けNotionDB</p>
        <div className="flex flex-wrap gap-2">
          {(Object.entries(DATA_SOURCE_LABELS) as Array<[keyof DataContext, typeof DATA_SOURCE_LABELS[keyof DataContext]]>).map(([, cfg]) => (
            <span
              key={cfg.label}
              className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded-full"
            >
              {cfg.emoji} {cfg.label}
            </span>
          ))}
        </div>
      </div>

      {/* エラー表示 */}
      {result?.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          ⚠️ {result.message ?? 'エラーが発生しました'}
        </div>
      )}

      {/* 結果表示 */}
      {result?.status === 'success' && (
        <>
          {/* サマリーカード */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <SummaryCard
              icon="💡"
              label="施策提案数"
              value={`${proposals.length}件`}
              colorClass="text-green-600"
            />
            <SummaryCard
              icon="🔴"
              label="緊急施策"
              value={`${urgentCount}件`}
              colorClass="text-red-600"
            />
            <SummaryCard
              icon="⚠️"
              label="データ不足指摘"
              value={`${dataGaps.length}件`}
              colorClass="text-yellow-600"
            />
            <SummaryCard
              icon="📅"
              label="生成日"
              value={result.dateLabel ?? '—'}
              colorClass="text-gray-600"
            />
          </div>

          {/* Notion保存リンク */}
          {result.notionPage && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
              <span>📄 Notionに保存済み:</span>
              <a
                href={result.notionPage}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline truncate"
              >
                {result.notionPage}
              </a>
            </div>
          )}

          {/* タブ切り替え */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
            {([
              { key: 'proposals', label: `💡 施策提案（${proposals.length}）` },
              { key: 'data',      label: '📊 実データ確認' },
              { key: 'gaps',      label: `⚠️ データ不足（${dataGaps.length}）` },
            ] as const).map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`
                  px-4 py-1.5 rounded-md text-sm font-medium transition
                  ${activeTab === tab.key
                    ? 'bg-white text-gray-800 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                  }
                `}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* ─── タブ: 施策提案 ───────────────────────── */}
          {activeTab === 'proposals' && (
            <div className="space-y-4">
              {proposals.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  施策提案が生成されませんでした
                </p>
              ) : (
                proposals.map((p, i) => {
                  const cfg = URGENCY_CONFIG[p.urgency]
                  return (
                    <div
                      key={i}
                      className={`rounded-xl border ${cfg.border} ${cfg.bg} p-5 space-y-3`}
                    >
                      {/* ヘッダー行 */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${cfg.badge}`}>
                            {cfg.label}
                          </span>
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-gray-600 border border-gray-200">
                            {p.category}
                          </span>
                          <span className="text-xs text-gray-500">
                            担当: {p.owner}
                          </span>
                        </div>
                      </div>

                      {/* タイトル */}
                      <h3 className="text-base font-bold text-gray-800">
                        {p.title}
                      </h3>

                      {/* 根拠（データ引用） */}
                      <div className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="text-xs font-semibold text-gray-400 mb-1">
                          📊 データに基づく根拠
                        </p>
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {p.rationale}
                        </p>
                      </div>

                      {/* アクション */}
                      <div>
                        <p className="text-xs font-semibold text-gray-400 mb-1">
                          🎯 具体的なアクション
                        </p>
                        <p className="text-sm text-gray-800">
                          {p.action}
                        </p>
                      </div>

                      {/* 引用データ一覧 */}
                      {p.dataEvidence.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {p.dataEvidence.map((ev, j) => (
                            <span
                              key={j}
                              className="text-xs px-2.5 py-1 bg-white border border-gray-300 rounded-full text-gray-600"
                            >
                              📌 {ev}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
            </div>
          )}

          {/* ─── タブ: 実データ確認 ──────────────────── */}
          {activeTab === 'data' && result.dataContext && (
            <div className="space-y-4">
              {(Object.entries(result.dataContext) as Array<[keyof DataContext, string]>).map(
                ([key, value]) => {
                  const cfg = DATA_SOURCE_LABELS[key]
                  return (
                    <div
                      key={key}
                      className="bg-white rounded-xl border border-gray-200 p-4"
                    >
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{cfg.emoji}</span>
                        <h3 className="text-sm font-bold text-gray-700">
                          {cfg.label}
                        </h3>
                        <span className="text-xs text-gray-400 ml-auto">
                          Notion DB より取得
                        </span>
                      </div>
                      <pre className="text-xs text-gray-600 bg-gray-50 rounded-lg p-3 whitespace-pre-wrap font-sans leading-relaxed">
                        {value}
                      </pre>
                    </div>
                  )
                }
              )}
            </div>
          )}

          {/* ─── タブ: データ不足の指摘 ──────────────── */}
          {activeTab === 'gaps' && (
            <div className="space-y-3">
              <p className="text-sm text-gray-500">
                以下のデータを蓄積することで、より精度の高い施策提案が可能になります。
              </p>
              {dataGaps.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-8">
                  データ不足の指摘はありませんでした
                </p>
              ) : (
                dataGaps.map((gap, i) => (
                  <div
                    key={i}
                    className="bg-yellow-50 border border-yellow-200 rounded-xl overflow-hidden"
                  >
                    {/* アコーディオン header */}
                    <button
                      className="w-full flex items-center justify-between p-4 text-left"
                      onClick={() => setExpandedGap(expandedGap === i ? null : i)}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-yellow-600 font-bold text-sm">
                          ⚠️ {gap.category}
                        </span>
                        <span className="text-sm text-gray-700">
                          {gap.description}
                        </span>
                      </div>
                      <span className="text-gray-400 text-lg">
                        {expandedGap === i ? '▲' : '▼'}
                      </span>
                    </button>

                    {/* アコーディオン body */}
                    {expandedGap === i && (
                      <div className="px-4 pb-4 space-y-3 border-t border-yellow-200 pt-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            💡 なぜ必要か
                          </p>
                          <p className="text-sm text-gray-700">{gap.impact}</p>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1">
                            🔧 収集方法
                          </p>
                          <p className="text-sm text-gray-700">{gap.howToCollect}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}

      {/* 初期状態 */}
      {!result && !loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-4">🧩</div>
          <p className="text-sm">
            「データ読み込み &amp; 施策提案生成」ボタンを押すと、
          </p>
          <p className="text-sm">
            屋久島町の5本のNotionDBを読み込んで実データに基づく提案を生成します
          </p>
        </div>
      )}
    </div>
  )
}
