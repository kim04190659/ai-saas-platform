'use client'
// =====================================================
//  src/components/fiscal/FiscalHealthPanel.tsx
//  財政健全化パネル — Sprint #52
//
//  ■ 使い方
//    <FiscalHealthPanel
//      apiBase="/api/kirishima/fiscal-health"
//      municipalityName="霧島市"
//    />
//
//  ■ 3タブ構成
//    指標一覧 / ⚠️ リスク評価 / 🤖 AI財政分析
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import type { FiscalIndicator, FiscalRecommendation } from '@/lib/fiscal-health-engine'

// ─── 型定義 ───────────────────────────────────────────

interface FiscalSummary {
  total: number
  assessmentCount: {
    danger: number
    caution: number
    watch: number
    good: number
    excellent: number
  }
  criticalIndicators: string[]
}

interface FiscalApiResponse {
  status: string
  indicators: FiscalIndicator[]
  byCategory: Record<string, FiscalIndicator[]>
  summary: FiscalSummary
}

interface AiAnalysisResult {
  scenario:           string
  summary:            string
  urgentItems:        string[]
  recommendations:    FiscalRecommendation[]
  totalCostReduction: string
  risks:              string[]
}

// ─── 評価バッジ ───────────────────────────────────────

function AssessmentBadge({ assessment }: { assessment: string }) {
  const styles: Record<string, string> = {
    危険: 'bg-red-100 text-red-800 border border-red-300',
    警戒: 'bg-orange-100 text-orange-800 border border-orange-300',
    注意: 'bg-yellow-100 text-yellow-800 border border-yellow-300',
    良好: 'bg-blue-100 text-blue-800 border border-blue-300',
    優良: 'bg-green-100 text-green-800 border border-green-300',
  }
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${styles[assessment] ?? 'bg-gray-100 text-gray-700'}`}>
      {assessment}
    </span>
  )
}

// ─── 前年度比インジケーター ────────────────────────────

function YoyChange({ value }: { value: number }) {
  if (value === 0) return <span className="text-gray-400 text-xs">±0</span>
  // 数値が増加 = 悪化（財政指標は多くが低いほど良い）なのでオレンジ表示
  const isUp = value > 0
  return (
    <span className={`text-xs font-medium ${isUp ? 'text-orange-600' : 'text-green-600'}`}>
      {isUp ? `▲${value}` : `▼${Math.abs(value)}`}
    </span>
  )
}

// ─── 閾値ゲージ ───────────────────────────────────────

function ThresholdBar({ value, earlyThreshold }: { value: number; earlyThreshold: number | null }) {
  if (earlyThreshold == null || value <= 0) return null
  const pct = Math.min((value / earlyThreshold) * 100, 100)
  const color = pct >= 85 ? 'bg-red-500' : pct >= 65 ? 'bg-orange-500' : pct >= 45 ? 'bg-yellow-500' : 'bg-green-500'
  return (
    <div className="mt-1">
      <div className="flex justify-between text-xs text-gray-400 mb-0.5">
        <span>0</span>
        <span>早期基準 {earlyThreshold}%</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

interface FiscalHealthPanelProps {
  apiBase:          string
  municipalityName: string
}

export function FiscalHealthPanel({ apiBase, municipalityName }: FiscalHealthPanelProps) {
  const [tab, setTab]               = useState<'list' | 'risk' | 'ai'>('list')
  const [data, setData]             = useState<FiscalApiResponse | null>(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState<string | null>(null)
  const [aiResult, setAiResult]     = useState<AiAnalysisResult | null>(null)
  const [aiLoading, setAiLoading]   = useState(false)
  const [aiError, setAiError]       = useState<string | null>(null)
  const [scenario, setScenario]     = useState<'current' | 'optimize' | 'longterm'>('current')
  const [filterCat, setFilterCat]   = useState<string>('すべて')

  // 指標データを取得
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(apiBase)
      const json = await res.json() as FiscalApiResponse
      if (json.status !== 'success') throw new Error('データ取得に失敗しました')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { loadData() }, [loadData])

  // AI分析実行
  const runAI = async () => {
    setAiLoading(true)
    setAiError(null)
    setAiResult(null)
    try {
      const res  = await fetch(apiBase, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scenario }),
      })
      const json = await res.json() as AiAnalysisResult & { status?: string; message?: string }
      if (json.status === 'error') throw new Error(json.message ?? 'AI分析に失敗しました')
      setAiResult(json)
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e))
    } finally {
      setAiLoading(false)
    }
  }

  // カテゴリフィルター用リスト
  const categories = data ? ['すべて', ...Object.keys(data.byCategory)] : ['すべて']
  const filteredIndicators = data
    ? (filterCat === 'すべて' ? data.indicators : (data.byCategory[filterCat] ?? []))
    : []

  // ─── サマリーカード ──────────────────────────────────

  const SummaryCards = () => {
    if (!data) return null
    const { assessmentCount } = data.summary
    return (
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        {[
          { label: '危険',   count: assessmentCount.danger,    color: 'border-red-400 bg-red-50',    textColor: 'text-red-700' },
          { label: '警戒',   count: assessmentCount.caution,   color: 'border-orange-400 bg-orange-50', textColor: 'text-orange-700' },
          { label: '注意',   count: assessmentCount.watch,     color: 'border-yellow-400 bg-yellow-50', textColor: 'text-yellow-700' },
          { label: '良好',   count: assessmentCount.good,      color: 'border-blue-400 bg-blue-50',  textColor: 'text-blue-700' },
          { label: '優良',   count: assessmentCount.excellent, color: 'border-green-400 bg-green-50', textColor: 'text-green-700' },
        ].map(item => (
          <div key={item.label} className={`rounded-lg border-l-4 p-3 ${item.color}`}>
            <div className={`text-2xl font-bold ${item.textColor}`}>{item.count}</div>
            <div className="text-xs text-gray-600">{item.label}</div>
          </div>
        ))}
      </div>
    )
  }

  // ─── 指標一覧タブ ────────────────────────────────────

  const ListTab = () => (
    <div>
      <SummaryCards />
      {/* カテゴリフィルター */}
      <div className="flex flex-wrap gap-2 mb-4">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setFilterCat(cat)}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              filterCat === cat
                ? 'bg-teal-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* 指標カード */}
      <div className="space-y-3">
        {filteredIndicators.map(ind => (
          <div key={ind.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-teal-300 transition-colors">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <AssessmentBadge assessment={ind.assessment} />
                  <span className="text-xs text-gray-400">{ind.category}</span>
                </div>
                <div className="font-medium text-gray-800 text-sm">{ind.name}</div>
                {ind.note && (
                  <div className="text-xs text-gray-500 mt-1 line-clamp-2">{ind.note}</div>
                )}
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-xl font-bold text-gray-800">
                  {ind.value.toLocaleString()}
                  <span className="text-sm font-normal text-gray-500">%</span>
                </div>
                <YoyChange value={ind.yoyChange} />
              </div>
            </div>
            <ThresholdBar value={ind.value} earlyThreshold={ind.earlyThreshold} />
          </div>
        ))}
      </div>
    </div>
  )

  // ─── リスク評価タブ ──────────────────────────────────

  const RiskTab = () => {
    if (!data) return null
    const critical = data.indicators.filter(i => ['警戒', '危険'].includes(i.assessment))
    const watch    = data.indicators.filter(i => i.assessment === '注意')

    return (
      <div className="space-y-6">
        {/* 重大リスク */}
        <div>
          <h3 className="text-sm font-semibold text-red-700 mb-3 flex items-center gap-1">
            🔴 重大リスク（警戒・危険）— {critical.length}件
          </h3>
          {critical.length === 0 ? (
            <p className="text-sm text-gray-500">該当なし</p>
          ) : (
            <div className="space-y-2">
              {critical.map(ind => (
                <div key={ind.id} className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <AssessmentBadge assessment={ind.assessment} />
                      <div className="font-medium text-sm mt-1">{ind.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{ind.note}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-red-700">
                        {ind.value.toLocaleString()}%
                      </div>
                      <YoyChange value={ind.yoyChange} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 要注意 */}
        <div>
          <h3 className="text-sm font-semibold text-yellow-700 mb-3 flex items-center gap-1">
            🟡 要注意（注意）— {watch.length}件
          </h3>
          {watch.length === 0 ? (
            <p className="text-sm text-gray-500">該当なし</p>
          ) : (
            <div className="space-y-2">
              {watch.map(ind => (
                <div key={ind.id} className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-sm">{ind.name}</div>
                      <div className="text-xs text-gray-600 mt-1">{ind.note}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold text-yellow-700">
                        {ind.value.toLocaleString()}%
                      </div>
                      <YoyChange value={ind.yoyChange} />
                    </div>
                  </div>
                  <ThresholdBar value={ind.value} earlyThreshold={ind.earlyThreshold} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    )
  }

  // ─── AI分析タブ ──────────────────────────────────────

  const scenarioLabels: Record<string, string> = {
    current:  '📊 現状財政分析',
    optimize: '✂️ 歳出最適化',
    longterm: '🔭 中長期財政計画',
  }

  const priorityColors: Record<string, string> = {
    高: 'border-red-400 bg-red-50',
    中: 'border-orange-400 bg-orange-50',
    低: 'border-blue-400 bg-blue-50',
  }

  const AiTab = () => (
    <div className="space-y-4">
      {/* シナリオ選択 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">分析シナリオを選択</label>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {(['current', 'optimize', 'longterm'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScenario(s)}
              className={`p-3 rounded-lg border-2 text-sm font-medium text-left transition-all ${
                scenario === s
                  ? 'border-teal-500 bg-teal-50 text-teal-700'
                  : 'border-gray-200 bg-white text-gray-600 hover:border-teal-300'
              }`}
            >
              {scenarioLabels[s]}
            </button>
          ))}
        </div>
      </div>

      {/* 分析ボタン */}
      <button
        onClick={runAI}
        disabled={aiLoading}
        className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {aiLoading ? '🤖 AI分析中...' : `🤖 ${scenarioLabels[scenario]} を実行`}
      </button>

      {/* エラー表示 */}
      {aiError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          ⚠️ {aiError}
        </div>
      )}

      {/* 分析結果 */}
      {aiResult && (
        <div className="space-y-4">
          {/* サマリー */}
          <div className="p-4 bg-teal-50 border border-teal-200 rounded-lg">
            <h3 className="font-semibold text-teal-800 mb-2">📋 財政状況サマリー</h3>
            <p className="text-sm text-teal-900">{aiResult.summary}</p>
          </div>

          {/* 緊急課題 */}
          {aiResult.urgentItems.length > 0 && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
              <h3 className="font-semibold text-red-800 mb-2">🔴 緊急・重要課題</h3>
              <ul className="space-y-1">
                {aiResult.urgentItems.map((item, i) => (
                  <li key={i} className="text-sm text-red-900 flex items-start gap-1">
                    <span className="mt-0.5">•</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 提言 */}
          <div>
            <h3 className="font-semibold text-gray-700 mb-3">💡 AI改善提言</h3>
            <div className="space-y-3">
              {aiResult.recommendations.map((rec, i) => (
                <div key={i} className={`border-l-4 rounded-lg p-3 ${priorityColors[rec.priority] ?? 'border-gray-300 bg-gray-50'}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-gray-600">優先度 {rec.priority}</span>
                    <span className="font-semibold text-sm text-gray-800">{rec.title}</span>
                  </div>
                  <p className="text-sm text-gray-700">{rec.detail}</p>
                  <div className="flex gap-4 mt-2 text-xs text-gray-500">
                    <span>🗓️ {rec.timing}</span>
                    <span>💴 {rec.costEffect}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 改善効果合計 */}
          <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm">
            <span className="font-semibold text-green-800">💴 改善効果合計：</span>
            <span className="text-green-900 ml-1">{aiResult.totalCostReduction}</span>
          </div>

          {/* リスク */}
          {aiResult.risks.length > 0 && (
            <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2 text-sm">⚠️ 実施リスク</h3>
              <ul className="space-y-1">
                {aiResult.risks.map((risk, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-1">
                    <span>•</span><span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )

  // ─── レンダリング ─────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800">
          💴 財政健全化管理
          <span className="text-sm font-normal text-gray-500 ml-2">{municipalityName}</span>
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          財政健全化法に基づく指標を管理し、AIが財政改善・中長期計画を提言します。
        </p>
      </div>

      {/* ローディング・エラー */}
      {loading && (
        <div className="text-center py-12 text-gray-400">
          <div className="text-3xl mb-2">⏳</div>
          <div>財政データを読み込んでいます...</div>
        </div>
      )}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ データ取得エラー: {error}
        </div>
      )}

      {!loading && !error && data && (
        <>
          {/* タブナビ */}
          <div className="flex gap-1 mb-6 border-b border-gray-200">
            {([
              { key: 'list', label: '📋 指標一覧' },
              { key: 'risk', label: '⚠️ リスク評価' },
              { key: 'ai',   label: '🤖 AI財政分析' },
            ] as const).map(t => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? 'border-teal-500 text-teal-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* タブコンテンツ */}
          {tab === 'list' && <ListTab />}
          {tab === 'risk' && <RiskTab />}
          {tab === 'ai'   && <AiTab />}
        </>
      )}
    </div>
  )
}
