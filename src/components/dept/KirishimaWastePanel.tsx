'use client'
// =====================================================
//  src/components/dept/KirishimaWastePanel.tsx
//  霧島市 廃棄物管理最適化ダッシュボード
//
//  ■ 3タブ構成
//    Tab 1: 地区別分析 — 人口推移・収集コスト・ステータス
//    Tab 2: 焼却施設   — 稼働率・コスト・広域化判定
//    Tab 3: AI最適化提言 — 3シナリオをAIが試算
// =====================================================

import { useState, useEffect } from 'react'

// ─── 型定義 ──────────────────────────────────────────

interface DistrictWaste {
  id: string; name: string
  pop2020: number; pop2025: number; pop2030: number; pop2035: number
  wasteVolume: number; households: number; collectFreq: number
  annualCost: number; costPerHH: number
  status: string; mergeCandidates: string; note: string
}

interface Facility {
  id: string; name: string; location: string
  capacity: number; age: number; annualVolume: number; utilization: number
  annualCost: number; costPerTon: number; nextRenovation: string
  status: string; note: string
}

interface CollectionRoute {
  id: string; name: string; district: string
  households: number; distanceKm: number; weeksPerYear: number
  annualCost: number; costPerHH: number; efficiencyScore: number
  proposal: string; mergeTarget: string; note: string
}

interface Recommendation { priority: string; title: string; detail: string; timing: string; costEffect: string }
interface AIResult {
  scenario: string; summary: string; urgentIssues: string[]
  recommendations: Recommendation[]; totalCostReduction: string
  risks: string[]; notionPage?: { id: string; url: string } | null
}

// ─── ユーティリティ ───────────────────────────────────

function statusColor(s: string) {
  if (s === '維持')     return 'bg-green-100 text-green-700'
  if (s === '要検討')   return 'bg-yellow-100 text-yellow-700'
  if (s === '統合推奨') return 'bg-orange-100 text-orange-700'
  if (s === '統合済み') return 'bg-gray-100 text-gray-500'
  return 'bg-gray-100 text-gray-600'
}

function facilityColor(s: string) {
  if (s === '単独維持')   return 'bg-green-100 text-green-700'
  if (s === '縮小改修')   return 'bg-yellow-100 text-yellow-700'
  if (s === '広域化推奨') return 'bg-orange-100 text-orange-700'
  if (s === '廃止予定')   return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

function routeColor(s: string) {
  if (s === '現状維持')   return 'bg-green-100 text-green-700'
  if (s === '頻度削減')   return 'bg-yellow-100 text-yellow-700'
  if (s === '統合推奨')   return 'bg-orange-100 text-orange-700'
  if (s === '廃止・委託') return 'bg-red-100 text-red-700'
  return 'bg-gray-100 text-gray-600'
}

function priorityColor(p: string) {
  if (p === '高') return 'bg-red-100 text-red-700'
  if (p === '中') return 'bg-yellow-100 text-yellow-700'
  return 'bg-green-100 text-green-700'
}

function popChange(p2020: number, p2035: number) {
  if (!p2020) return 0
  return Math.round(((p2035 - p2020) / p2020) * 100)
}

// ─── ミニバーチャート（人口推移） ────────────────────

function PopBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="flex items-center gap-1">
      <div className="w-24 bg-gray-100 rounded-full h-2">
        <div className="bg-blue-400 h-2 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-500 w-14">{value.toLocaleString()}</span>
    </div>
  )
}

// ─── 効率スコアバー ───────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-green-400' : score >= 45 ? 'bg-yellow-400' : 'bg-red-400'
  return (
    <div className="flex items-center gap-1">
      <div className="w-16 bg-gray-100 rounded-full h-2">
        <div className={`${color} h-2 rounded-full`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-medium">{score}</span>
    </div>
  )
}

// ─── メインパネル ─────────────────────────────────────

export function KirishimaWastePanel() {
  const [tab, setTab] = useState<'district' | 'facility' | 'ai'>('district')
  const [loading, setLoading]         = useState(true)
  const [districts, setDistricts]     = useState<DistrictWaste[]>([])
  const [facilities, setFacilities]   = useState<Facility[]>([])
  const [routes, setRoutes]           = useState<CollectionRoute[]>([])
  const [aiLoading, setAiLoading]     = useState(false)
  const [aiResult, setAiResult]       = useState<AIResult | null>(null)
  const [scenario, setScenario]       = useState<'current' | 'merge_routes' | 'regionalize'>('current')

  // データ取得
  useEffect(() => {
    fetch('/api/notion/kirishima/waste')
      .then(r => r.json())
      .then(d => {
        setDistricts(d.districts ?? [])
        setFacilities(d.facilities ?? [])
        setRoutes(d.routes ?? [])
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  // AI最適化実行
  async function runAI() {
    setAiLoading(true)
    setAiResult(null)
    try {
      const res  = await fetch('/api/kirishima/waste-optimization', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenario }),
      })
      const data = await res.json() as AIResult
      setAiResult(data)
    } catch (e) {
      console.error(e)
    } finally {
      setAiLoading(false)
    }
  }

  const maxPop = Math.max(...districts.map(d => d.pop2020), 1)

  // ─── タブボタン ─────────────────────────────────────
  const tabs = [
    { key: 'district', label: '🏘️ 地区別分析' },
    { key: 'facility', label: '🏭 焼却施設' },
    { key: 'ai',       label: '🤖 AI最適化提言' },
  ] as const

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-5">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">♻️ 霧島市 廃棄物管理最適化</h1>
        <p className="text-sm text-gray-500">
          人口縮小に伴うごみ収集路線・焼却炉の最適化を AI が分析・提言します。<br />
          データは霧島市からの実データ提供後に自動更新されます（現在はデモデータ）。
        </p>
      </div>

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
          {/* ─── Tab 1: 地区別分析 ─── */}
          {tab === 'district' && (
            <div className="space-y-4">
              {/* サマリーカード */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                  { label: '総地区数',       value: `${districts.length} 地区` },
                  { label: '統合推奨',        value: `${districts.filter(d => d.status === '統合推奨').length} 地区`, warn: true },
                  { label: '要検討',          value: `${districts.filter(d => d.status === '要検討').length} 地区` },
                  { label: '年間収集コスト合計', value: `${districts.reduce((s,d)=>s+d.annualCost,0).toLocaleString()} 万円` },
                ].map((c, i) => (
                  <div key={i} className={`p-3 rounded-xl border ${c.warn ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
                    <p className="text-xs text-gray-500">{c.label}</p>
                    <p className={`text-lg font-bold ${c.warn ? 'text-orange-700' : 'text-gray-800'}`}>{c.value}</p>
                  </div>
                ))}
              </div>

              {/* 地区テーブル */}
              <div className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-600 text-xs">
                    <tr>
                      <th className="text-left px-3 py-2">地区名</th>
                      <th className="text-left px-3 py-2">人口推移</th>
                      <th className="text-right px-3 py-2">増減率</th>
                      <th className="text-right px-3 py-2">1世帯コスト</th>
                      <th className="text-center px-3 py-2">ステータス</th>
                      <th className="text-left px-3 py-2">統合候補</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {districts.sort((a, b) => b.pop2020 - a.pop2020).map(d => (
                      <tr key={d.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-medium text-gray-800">{d.name}</td>
                        <td className="px-3 py-2">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1 text-xs text-gray-400">
                              <span className="w-8">2020</span>
                              <PopBar value={d.pop2020} max={maxPop} />
                            </div>
                            <div className="flex items-center gap-1 text-xs text-blue-400">
                              <span className="w-8">2035</span>
                              <PopBar value={d.pop2035} max={maxPop} />
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-medium ${popChange(d.pop2020, d.pop2035) < -20 ? 'text-red-600' : popChange(d.pop2020, d.pop2035) < -10 ? 'text-orange-500' : 'text-gray-600'}`}>
                            {popChange(d.pop2020, d.pop2035)}%
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span className={`font-medium ${d.costPerHH >= 30000 ? 'text-red-600' : d.costPerHH >= 18000 ? 'text-orange-500' : 'text-gray-700'}`}>
                            {d.costPerHH.toLocaleString()} 円
                          </span>
                        </td>
                        <td className="px-3 py-2 text-center">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColor(d.status)}`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-xs text-gray-500">{d.mergeCandidates || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 収集ルート効率一覧 */}
              <div>
                <h2 className="text-sm font-semibold text-gray-700 mb-2">収集ルート 効率スコア一覧</h2>
                <div className="overflow-x-auto rounded-xl border border-gray-200">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-600 text-xs">
                      <tr>
                        <th className="text-left px-3 py-2">ルート名</th>
                        <th className="text-right px-3 py-2">対象世帯</th>
                        <th className="text-right px-3 py-2">距離</th>
                        <th className="text-right px-3 py-2">1世帯コスト</th>
                        <th className="text-left px-3 py-2">効率スコア</th>
                        <th className="text-center px-3 py-2">AI提案</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {routes.sort((a, b) => b.efficiencyScore - a.efficiencyScore).map(r => (
                        <tr key={r.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2 font-medium text-gray-800">{r.name}</td>
                          <td className="px-3 py-2 text-right text-gray-600">{r.households.toLocaleString()} 世帯</td>
                          <td className="px-3 py-2 text-right text-gray-600">{r.distanceKm} km</td>
                          <td className="px-3 py-2 text-right">
                            <span className={r.costPerHH >= 30000 ? 'text-red-600 font-medium' : r.costPerHH >= 18000 ? 'text-orange-500' : 'text-gray-700'}>
                              {r.costPerHH.toLocaleString()} 円
                            </span>
                          </td>
                          <td className="px-3 py-2">
                            <ScoreBar score={r.efficiencyScore} />
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${routeColor(r.proposal)}`}>
                              {r.proposal}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab 2: 焼却施設 ─── */}
          {tab === 'facility' && (
            <div className="space-y-4">
              {/* 施設カード */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {facilities.map(f => (
                  <div key={f.id} className="rounded-xl border border-gray-200 p-4 bg-white shadow-sm">
                    <div className="flex items-start justify-between mb-2">
                      <h3 className="font-bold text-gray-800 text-sm">{f.name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${facilityColor(f.status)}`}>
                        {f.status}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mb-3">📍 {f.location}</p>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500">処理能力</span>
                        <span className="font-medium">{f.capacity} トン/日</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">築年数</span>
                        <span className={`font-medium ${f.age >= 30 ? 'text-red-600' : f.age >= 20 ? 'text-orange-500' : 'text-gray-700'}`}>
                          {f.age} 年
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">稼働率</span>
                        <span className={`font-medium ${f.utilization < 55 ? 'text-red-600' : f.utilization < 70 ? 'text-orange-500' : 'text-green-600'}`}>
                          {f.utilization} %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">年間維持費</span>
                        <span className="font-medium">{f.annualCost.toLocaleString()} 万円</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">1トンあたりコスト</span>
                        <span className={`font-medium ${f.costPerTon >= 100000 ? 'text-red-600' : f.costPerTon >= 60000 ? 'text-orange-500' : 'text-gray-700'}`}>
                          {f.costPerTon.toLocaleString()} 円
                        </span>
                      </div>

                      {/* 稼働率バー */}
                      <div className="mt-2">
                        <div className="flex justify-between text-gray-400 mb-0.5">
                          <span>稼働率</span><span>{f.utilization}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${f.utilization < 55 ? 'bg-red-400' : f.utilization < 70 ? 'bg-yellow-400' : 'bg-green-400'}`}
                            style={{ width: `${f.utilization}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    {f.nextRenovation && (
                      <div className="mt-3 p-2 bg-gray-50 rounded-lg text-xs text-gray-600">
                        🔧 {f.nextRenovation}
                      </div>
                    )}

                    {f.note && (
                      <p className="mt-2 text-xs text-gray-400 leading-relaxed">{f.note}</p>
                    )}
                  </div>
                ))}
              </div>

              {/* コスト比較テーブル */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <h3 className="text-sm font-semibold text-amber-700 mb-3">⚠️ 施設間コスト比較</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="text-xs text-gray-600">
                      <tr>
                        <th className="text-left py-1">施設名</th>
                        <th className="text-right py-1">1トンあたりコスト</th>
                        <th className="text-right py-1">対 最安値比</th>
                        <th className="text-right py-1">年間維持費</th>
                        <th className="text-center py-1">判定</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100">
                      {[...facilities].sort((a,b) => a.costPerTon - b.costPerTon).map((f, i) => {
                        const minCost = Math.min(...facilities.map(x => x.costPerTon))
                        const ratio   = minCost > 0 ? (f.costPerTon / minCost).toFixed(1) : '—'
                        return (
                          <tr key={f.id}>
                            <td className="py-1.5 font-medium text-gray-800">{f.name}</td>
                            <td className={`py-1.5 text-right font-medium ${i === 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {f.costPerTon.toLocaleString()} 円
                            </td>
                            <td className="py-1.5 text-right text-gray-600">× {ratio}</td>
                            <td className="py-1.5 text-right text-gray-600">{f.annualCost.toLocaleString()} 万円</td>
                            <td className="py-1.5 text-center">
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${facilityColor(f.status)}`}>
                                {f.status}
                              </span>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ─── Tab 3: AI最適化提言 ─── */}
          {tab === 'ai' && (
            <div className="space-y-4">
              {/* シナリオ選択 */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <h2 className="text-sm font-semibold text-teal-700 mb-3">📋 分析シナリオを選択</h2>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                  {[
                    { key: 'current',      label: '📊 現状分析',        desc: '問題点・緊急課題の洗い出し' },
                    { key: 'merge_routes', label: '🔀 路線統廃合',      desc: '統合優先度・コスト削減試算' },
                    { key: 'regionalize',  label: '🏭 焼却炉広域化',    desc: '施設集約・近隣自治体連携案' },
                  ].map(s => (
                    <button
                      key={s.key}
                      onClick={() => setScenario(s.key as typeof scenario)}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        scenario === s.key
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 bg-white hover:border-teal-300'
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
                  className="w-full sm:w-auto px-6 py-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-60"
                >
                  {aiLoading ? '🔄 AI分析中（15〜30秒）…' : '🤖 AIに分析・提言を依頼する'}
                </button>
              </div>

              {/* AI結果 */}
              {aiResult && (
                <div className="space-y-4">
                  {/* サマリー */}
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-800 mb-2">📝 AIサマリー</h3>
                    <p className="text-sm text-gray-700 leading-relaxed">{aiResult.summary}</p>
                  </div>

                  {/* 緊急課題 */}
                  {aiResult.urgentIssues?.length > 0 && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <h3 className="font-semibold text-red-700 mb-2">🚨 緊急課題</h3>
                      <ul className="space-y-1">
                        {aiResult.urgentIssues.map((issue, i) => (
                          <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                            <span>•</span><span>{issue}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* 提言一覧 */}
                  {aiResult.recommendations?.length > 0 && (
                    <div className="space-y-3">
                      <h3 className="font-semibold text-gray-800">💡 提言一覧</h3>
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
                            <span>💰 削減効果: {r.costEffect}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* 合計削減効果 */}
                  {aiResult.totalCostReduction && (
                    <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-center">
                      <p className="text-xs text-teal-600 mb-1">全提言実施後の年間削減効果（概算）</p>
                      <p className="text-2xl font-bold text-teal-700">{aiResult.totalCostReduction}</p>
                    </div>
                  )}

                  {/* リスク */}
                  {aiResult.risks?.length > 0 && (
                    <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                      <h3 className="font-semibold text-gray-700 mb-2 text-sm">⚠️ 実施リスク</h3>
                      <ul className="space-y-1">
                        {aiResult.risks.map((risk, i) => (
                          <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                            <span>•</span><span>{risk}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Notion保存リンク */}
                  {aiResult.notionPage && (
                    <div className="text-center">
                      <a
                        href={aiResult.notionPage.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-blue-600 hover:underline"
                      >
                        📝 この提言をNotionで確認・編集する
                      </a>
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

      {/* フッター注記 */}
      <div className="text-xs text-gray-400 border-t pt-3 space-y-0.5">
        <p>※ 現在はデモデータで動作しています。霧島市からの実データ提供後、NotionDBを更新するだけで自動反映されます。</p>
        <p>※ 人口推計は独自試算です。実際の将来推計は国勢調査・人口問題研究所のデータをお使いください。</p>
      </div>
    </div>
  )
}
