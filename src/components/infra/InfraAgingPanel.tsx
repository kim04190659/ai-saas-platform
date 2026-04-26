'use client'
// =====================================================
//  src/components/infra/InfraAgingPanel.tsx
//  インフラ老朽化管理 共通UIパネル — Sprint #51
//
//  ■ 3タブ構成
//    Tab 1: 施設一覧  — 種別・健全度スコア・修繕必要度
//    Tab 2: 緊急度マップ — スコア別の視覚的な優先度表示
//    Tab 3: AI修繕提言 — 3シナリオをAIが分析
//
//  ■ props
//    apiBase: '/api/kirishima/infra-aging' など
//    municipalityName: '霧島市' など
//    themeColor: 'teal' / 'indigo' など（Tailwind色クラス）
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import type { InfraFacility, InfraRecommendation } from '@/lib/infrastructure-aging-engine'

// ─── 型定義 ──────────────────────────────────────────

interface SummaryStats {
  urgent:  number
  planned: number
  watch:   number
  good:    number
  totalRepairCost: number
}

interface FacilitiesResponse {
  status:     string
  total:      number
  facilities: InfraFacility[]
  summary:    SummaryStats
}

interface AIResult {
  status:             string
  message?:           string
  scenario:           string
  summary:            string
  urgentItems:        string[]
  recommendations:    InfraRecommendation[]
  totalRepairCost:    string
  totalCostReduction: string
  risks:              string[]
}

interface Props {
  apiBase:          string
  municipalityName: string
  themeColor?:      'teal' | 'indigo' | 'blue'
}

// ─── ユーティリティ ───────────────────────────────────

function urgencyColor(u: string) {
  if (u === '緊急修繕') return 'bg-red-100 text-red-700'
  if (u === '計画修繕') return 'bg-orange-100 text-orange-700'
  if (u === '経過観察') return 'bg-yellow-100 text-yellow-700'
  if (u === '良好')     return 'bg-green-100 text-green-700'
  return 'bg-gray-100 text-gray-600'
}

function typeIcon(t: string) {
  if (t === '橋梁')      return '🌉'
  if (t === '市道')      return '🛣️'
  if (t === '排水路')    return '💧'
  if (t === '公共施設')  return '🏛️'
  if (t === '上下水道管') return '🔧'
  return '🏗️'
}

function priorityColor(p: string) {
  if (p === '高') return 'bg-red-100 text-red-700'
  if (p === '中') return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

// 健全度スコアに応じたバーの色
function scoreBarColor(score: number) {
  if (score < 35) return 'bg-red-400'
  if (score < 55) return 'bg-orange-400'
  if (score < 70) return 'bg-yellow-400'
  return 'bg-green-400'
}

// ─── スコアバー ───────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 bg-gray-100 rounded-full h-2 flex-shrink-0">
        <div
          className={`${scoreBarColor(score)} h-2 rounded-full`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-xs font-bold ${score < 35 ? 'text-red-600' : score < 55 ? 'text-orange-500' : 'text-gray-700'}`}>
        {score}点
      </span>
    </div>
  )
}

// ─── メインパネル ─────────────────────────────────────

export function InfraAgingPanel({ apiBase, municipalityName, themeColor = 'teal' }: Props) {
  const [tab, setTab] = useState<'list' | 'risk' | 'ai'>('list')
  const [loading, setLoading]     = useState(true)
  const [facilities, setFacilities] = useState<InfraFacility[]>([])
  const [stats, setStats]         = useState<SummaryStats | null>(null)
  const [filterType, setFilterType] = useState<string>('全種別')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult]   = useState<AIResult | null>(null)
  const [aiError, setAiError]     = useState<string | null>(null)
  const [scenario, setScenario]   = useState<'urgent' | 'budget' | 'consolidate'>('urgent')

  // テーマカラークラス
  const theme = {
    teal:   { bg: 'bg-teal-50',   border: 'border-teal-200',   text: 'text-teal-700',   btn: 'bg-teal-600 hover:bg-teal-700',   active: 'border-teal-500 bg-teal-50' },
    indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700', active: 'border-indigo-500 bg-indigo-50' },
    blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   text: 'text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700',   active: 'border-blue-500 bg-blue-50' },
  }[themeColor]

  // データ取得
  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      const res  = await fetch(apiBase)
      const data = await res.json() as FacilitiesResponse
      setFacilities(data.facilities ?? [])
      setStats(data.summary ?? null)
    } catch (e) {
      console.error('[InfraAgingPanel] データ取得エラー:', e)
    } finally {
      setLoading(false)
    }
  }, [apiBase])

  useEffect(() => { loadData() }, [loadData])

  // AI分析実行
  async function runAI() {
    setAiLoading(true)
    setAiResult(null)
    setAiError(null)
    try {
      const res  = await fetch(apiBase, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenario }),
      })
      const data = await res.json() as AIResult
      if (data.status === 'error') {
        setAiError(data.message ?? 'AI分析中にエラーが発生しました')
        return
      }
      setAiResult(data)
    } catch (e) {
      console.error('[InfraAgingPanel] AI分析エラー:', e)
      setAiError('通信エラーが発生しました。しばらく待ってから再試行してください。')
    } finally {
      setAiLoading(false)
    }
  }

  // フィルタリング
  const types       = ['全種別', ...Array.from(new Set(facilities.map(f => f.type)))]
  const filtered    = filterType === '全種別' ? facilities : facilities.filter(f => f.type === filterType)
  const sortedByScore = [...filtered].sort((a, b) => a.score - b.score)  // 健全度低い順

  const tabs = [
    { key: 'list', label: '🏗️ 施設一覧' },
    { key: 'risk', label: '⚠️ リスク優先度' },
    { key: 'ai',   label: '🤖 AI修繕提言' },
  ] as const

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          🛣️ {municipalityName} インフラ老朽化管理
        </h1>
        <p className="text-sm text-gray-500">
          橋梁・道路・排水路・公共施設・上下水道の健全度をAIが分析し、限られた予算での最適な修繕計画を提言します。
        </p>
      </div>

      {/* サマリーカード */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {[
            { label: '緊急修繕',  value: `${stats.urgent}件`,  warn: 'red'    },
            { label: '計画修繕',  value: `${stats.planned}件`, warn: 'orange' },
            { label: '経過観察',  value: `${stats.watch}件`,   warn: 'yellow' },
            { label: '良好',      value: `${stats.good}件`,    warn: 'green'  },
            { label: '修繕費見積合計', value: `${(stats.totalRepairCost / 10000).toFixed(1)}億円`, warn: 'gray' },
          ].map((c, i) => (
            <div key={i} className={`p-3 rounded-xl border ${
              c.warn === 'red'    ? 'bg-red-50 border-red-200' :
              c.warn === 'orange' ? 'bg-orange-50 border-orange-200' :
              c.warn === 'yellow' ? 'bg-yellow-50 border-yellow-200' :
              c.warn === 'green'  ? 'bg-green-50 border-green-200' :
              'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-xs text-gray-500">{c.label}</p>
              <p className={`text-lg font-bold ${
                c.warn === 'red'    ? 'text-red-700' :
                c.warn === 'orange' ? 'text-orange-700' :
                c.warn === 'yellow' ? 'text-yellow-700' :
                c.warn === 'green'  ? 'text-green-700' :
                'text-gray-800'
              }`}>{c.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* タブ */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.key
                ? 'bg-white border border-b-white border-gray-200 text-teal-700 -mb-px'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">データを読み込み中…</div>
      ) : (
        <>
          {/* ─── Tab 1: 施設一覧 ─── */}
          {tab === 'list' && (
            <div className="space-y-4">
              {/* 種別フィルター */}
              <div className="flex flex-wrap gap-2">
                {types.map(t => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                      filterType === t
                        ? 'bg-gray-800 text-white border-gray-800'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
                    }`}
                  >
                    {typeIcon(t)} {t}
                  </button>
                ))}
              </div>

              {/* 施設テーブル */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs">
                    <tr>
                      <th className="text-left px-3 py-2">施設名</th>
                      <th className="text-left px-3 py-2">種別</th>
                      <th className="text-left px-3 py-2">所在地区</th>
                      <th className="text-right px-3 py-2">築年数</th>
                      <th className="text-left px-3 py-2">健全度</th>
                      <th className="text-center px-3 py-2">修繕必要度</th>
                      <th className="text-right px-3 py-2">修繕費見積</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {sortedByScore.map(f => (
                      <tr key={f.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{f.name}</td>
                        <td className="px-3 py-2 text-gray-600">
                          {typeIcon(f.type)} {f.type}
                        </td>
                        <td className="px-3 py-2 text-gray-500 text-xs">{f.district}</td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-medium ${f.age >= 50 ? 'text-red-600' : f.age >= 35 ? 'text-orange-500' : 'text-gray-700'}`}>
                            {f.age}年
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <ScoreBar score={f.score} />
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${urgencyColor(f.urgency)}`}>
                            {f.urgency}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-gray-700 font-medium">
                          {f.repairCost.toLocaleString()}万円
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ─── Tab 2: リスク優先度 ─── */}
          {tab === 'risk' && (
            <div className="space-y-4">
              {/* 緊急修繕ゾーン */}
              {['緊急修繕', '計画修繕', '経過観察', '良好'].map(urgency => {
                const items = facilities.filter(f => f.urgency === urgency)
                if (items.length === 0) return null
                const zoneBg = urgency === '緊急修繕' ? 'bg-red-50 border-red-200' :
                               urgency === '計画修繕' ? 'bg-orange-50 border-orange-200' :
                               urgency === '経過観察' ? 'bg-yellow-50 border-yellow-200' :
                               'bg-green-50 border-green-200'
                const zoneText = urgency === '緊急修繕' ? 'text-red-700' :
                                 urgency === '計画修繕' ? 'text-orange-700' :
                                 urgency === '経過観察' ? 'text-yellow-700' :
                                 'text-green-700'
                return (
                  <div key={urgency} className={`rounded-xl border p-4 ${zoneBg}`}>
                    <h3 className={`font-semibold text-sm mb-3 ${zoneText}`}>
                      {urgency === '緊急修繕' ? '🚨' : urgency === '計画修繕' ? '⚠️' : urgency === '経過観察' ? '👁️' : '✅'} {urgency}（{items.length}件）
                      <span className="ml-2 font-normal text-xs">
                        修繕費合計: {items.reduce((s, f) => s + f.repairCost, 0).toLocaleString()}万円
                      </span>
                    </h3>
                    <div className="space-y-2">
                      {items.sort((a, b) => a.score - b.score).map(f => (
                        <div key={f.id} className="bg-white rounded-lg p-3 flex items-center gap-3">
                          <span className="text-lg">{typeIcon(f.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm text-gray-800">{f.name}</p>
                            <p className="text-xs text-gray-500">{f.district} ／ 築{f.age}年</p>
                          </div>
                          <ScoreBar score={f.score} />
                          <p className="text-sm font-medium text-gray-700 w-24 text-right flex-shrink-0">
                            {f.repairCost.toLocaleString()}万円
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* ─── Tab 3: AI修繕提言 ─── */}
          {tab === 'ai' && (
            <div className="space-y-4">
              {/* シナリオ選択 */}
              <div className={`${theme.bg} border ${theme.border} rounded-xl p-4`}>
                <h2 className={`text-sm font-semibold ${theme.text} mb-3`}>📋 分析シナリオを選択</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { key: 'urgent',      label: '🚨 緊急課題の洗い出し',    desc: '今すぐ対応が必要な施設を特定' },
                    { key: 'budget',      label: '💰 予算制約内の最適計画',  desc: '5000万円/年の予算での優先順位' },
                    { key: 'consolidate', label: '🏚️ 施設統廃合シナリオ',   desc: '人口減少地区の廃止・集約提言' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setScenario(s.key as typeof scenario)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        scenario === s.key
                          ? theme.active
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <p className="font-medium text-sm text-gray-800">{s.label}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{s.desc}</p>
                    </button>
                  ))}
                </div>
                <button
                  onClick={runAI}
                  disabled={aiLoading}
                  className={`w-full sm:w-auto px-6 py-2.5 ${theme.btn} text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60`}
                >
                  {aiLoading ? '🔄 AI分析中（20〜40秒かかります）…' : '🤖 AIに分析・提言を依頼する'}
                </button>
                {aiError && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    ⚠️ {aiError}
                  </div>
                )}
              </div>

              {/* AI結果 */}
              {aiResult && (
                <div className="space-y-4">
                  {/* サマリー */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">📝 AIサマリー</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiResult.summary}</p>
                  </div>

                  {/* 緊急対応項目 */}
                  {aiResult.urgentItems?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h3 className="font-semibold text-red-700 mb-2">🚨 緊急対応が必要な施設・課題</h3>
                      <ul className="space-y-1">
                        {aiResult.urgentItems.map((item, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                            <span>•</span><span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 提言一覧 */}
                  {aiResult.recommendations?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800">💡 修繕・改善提言</h3>
                      {aiResult.recommendations.map((r, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-xl p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${priorityColor(r.priority)}`}>
                              優先度: {r.priority}
                            </span>
                            <h4 className="font-medium text-gray-800 text-sm">{r.title}</h4>
                          </div>
                          <p className="text-sm text-gray-700 mb-2 leading-relaxed">{r.detail}</p>
                          <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                            <span>🗓️ 実施時期: {r.timing}</span>
                            <span>💰 効果: {r.costEffect}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* コスト効果サマリー */}
                  <div className={`${theme.bg} border ${theme.border} rounded-xl p-4`}>
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className={`text-xs ${theme.text} mb-1`}>対象施設の修繕費総額</p>
                        <p className={`text-xl font-bold ${theme.text}`}>{aiResult.totalRepairCost}</p>
                      </div>
                      <div>
                        <p className={`text-xs ${theme.text} mb-1`}>最適化による削減・回避効果</p>
                        <p className={`text-xl font-bold ${theme.text}`}>{aiResult.totalCostReduction}</p>
                      </div>
                    </div>
                  </div>

                  {/* リスク */}
                  {aiResult.risks?.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">⚠️ 実施上のリスク</h3>
                      <ul className="space-y-1">
                        {aiResult.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span>•</span><span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {!aiResult && !aiLoading && (
                <div className="text-center py-10 text-gray-400 text-sm">
                  シナリオを選択して「AIに分析・提言を依頼する」を押してください
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
