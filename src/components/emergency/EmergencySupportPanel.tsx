'use client'
// =====================================================
//  src/components/emergency/EmergencySupportPanel.tsx
//  緊急時住民支援パネル — Sprint #55
//
//  台風・地震などの緊急時に
//  「誰を優先して助けるか」「誰が助けに行けるか」を表示し
//  AIが地区別の対応計画を生成する。
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import type {
  SupportNeededResident,
  SupportCapableResident,
  DistrictPlan,
} from '@/lib/emergency-support-engine'

// ── 型定義（API レスポンス） ─────────────────────────

type EmergencyResponse = {
  status:         string
  要支援住民数:   number
  支援可能住民数: number
  地区別計画:     DistrictPlan[]
  AIアドバイス: {
    概況:             string
    最優先アクション: string[]
    注意事項:         string[]
  } | null
}

// ── 優先度バッジ ────────────────────────────────────

function PriorityBadge({ 優先度 }: { 優先度: string }) {
  const styles: Record<string, string> = {
    '最優先': 'bg-red-100 text-red-800 border border-red-300',
    '高':     'bg-orange-100 text-orange-800 border border-orange-300',
    '中':     'bg-yellow-100 text-yellow-800 border border-yellow-300',
    '低':     'bg-gray-100 text-gray-700 border border-gray-300',
  }
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${styles[優先度] ?? ''}`}>
      {優先度}
    </span>
  )
}

// ── 要支援住民カード ────────────────────────────────

function NeededCard({ resident }: { resident: SupportNeededResident }) {
  return (
    <div className="bg-white border rounded-lg p-3 shadow-sm">
      <div className="flex items-center justify-between mb-1">
        <span className="font-medium text-sm">{resident.住民名}</span>
        <PriorityBadge 優先度={resident.優先度} />
      </div>
      <div className="text-xs text-gray-500 space-y-0.5">
        <div>📍 {resident.地区}　👤 {resident.年齢層}・{resident.世帯状況}</div>
        <div>🚗 {resident.移動手段}　❤️ WBスコア: {resident.WBスコア ?? '—'}</div>
        {resident.リスク要因.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {resident.リスク要因.map(f => (
              <span key={f} className="bg-red-50 text-red-700 text-xs px-1.5 py-0.5 rounded">
                {f}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── 支援者カード ────────────────────────────────────

function CapableCard({ resident }: { resident: SupportCapableResident }) {
  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-3">
      <div className="font-medium text-sm text-green-800">{resident.住民名}</div>
      <div className="text-xs text-green-600 mt-0.5">
        📍 {resident.地区}　🚗 {resident.移動手段}　👪 {resident.世帯状況}
      </div>
    </div>
  )
}

// ── メインコンポーネント ─────────────────────────────

type Props = {
  municipalityId:   string
  municipalityName: string
}

export function EmergencySupportPanel({ municipalityId, municipalityName }: Props) {
  const [data,     setData]     = useState<EmergencyResponse | null>(null)
  const [loading,  setLoading]  = useState(false)
  const [aiLoading, setAiLoading] = useState(false)
  const [scenario, setScenario] = useState<'typhoon' | 'earthquake' | 'heatwave'>('typhoon')
  const [error,    setError]    = useState<string | null>(null)

  // 住民リスト取得（AI なし・高速）
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/gyosei/emergency-support?municipalityId=${municipalityId}`)
      const json = await res.json() as EmergencyResponse
      setData(json)
    } catch {
      setError('データの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [municipalityId])

  useEffect(() => { fetchData() }, [fetchData])

  // AI 対応計画を生成
  const runAI = async () => {
    setAiLoading(true)
    setError(null)
    try {
      const res  = await fetch('/api/gyosei/emergency-support', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ scenario, municipalityId }),
      })
      const json = await res.json() as EmergencyResponse
      setData(json)
    } catch {
      setError('AI分析に失敗しました')
    } finally {
      setAiLoading(false)
    }
  }

  const scenarioOptions = [
    { value: 'typhoon',    label: '🌀 台風・大雨' },
    { value: 'earthquake', label: '🏔 地震・津波' },
    { value: 'heatwave',   label: '☀️ 熱中症・猛暑' },
  ] as const

  return (
    <div className="space-y-6">

      {/* ヘッダー */}
      <div className="bg-red-600 text-white rounded-xl p-5">
        <h2 className="text-xl font-bold">🚨 緊急時住民支援 優先順位システム</h2>
        <p className="text-red-100 text-sm mt-1">
          {municipalityName} — 台風・地震などの緊急時に「誰を優先して助けるか」「誰が助けに行けるか」をAIが提案します
        </p>
      </div>

      {/* シナリオ選択 + AI実行 */}
      <div className="bg-white border rounded-xl p-4 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-3">📋 緊急シナリオを選択してAI対応計画を生成</h3>
        <div className="flex flex-wrap gap-3 items-center">
          {scenarioOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => setScenario(opt.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                scenario === opt.value
                  ? 'bg-red-600 text-white border-red-600'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-red-400'
              }`}
            >
              {opt.label}
            </button>
          ))}
          <button
            onClick={runAI}
            disabled={aiLoading}
            className="ml-auto px-5 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg text-sm font-bold transition-colors"
          >
            {aiLoading ? '⏳ AI分析中...' : '🤖 AI対応計画を生成'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
          ⚠️ {error}
        </div>
      )}

      {loading && (
        <div className="text-center py-10 text-gray-500">住民データを読み込み中...</div>
      )}

      {data && !loading && (
        <>
          {/* KPIサマリー */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-red-700">{data.要支援住民数}</div>
              <div className="text-sm text-red-600 mt-1">要支援住民数</div>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-green-700">{data.支援可能住民数}</div>
              <div className="text-sm text-green-600 mt-1">支援可能住民数（自家用車あり）</div>
            </div>
          </div>

          {/* AI アドバイス */}
          {data.AIアドバイス && (
            <div className="bg-orange-50 border border-orange-300 rounded-xl p-5">
              <h3 className="font-bold text-orange-800 mb-3">🤖 AI緊急対応アドバイス</h3>
              <p className="text-gray-700 text-sm mb-4">{data.AIアドバイス.概況}</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="text-sm font-semibold text-red-700 mb-2">🚨 最優先アクション</h4>
                  <ul className="space-y-1">
                    {data.AIアドバイス.最優先アクション.map((action, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-red-600 font-bold">{i + 1}.</span>
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-orange-700 mb-2">⚠️ 注意事項</h4>
                  <ul className="space-y-1">
                    {data.AIアドバイス.注意事項.map((note, i) => (
                      <li key={i} className="flex gap-2 text-sm">
                        <span className="text-orange-500">•</span>
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {/* 地区別計画 */}
          <div>
            <h3 className="font-semibold text-gray-800 mb-3">📍 地区別 支援計画</h3>
            <div className="space-y-6">
              {data.地区別計画.map(plan => (
                <div key={plan.地区} className="border rounded-xl overflow-hidden">
                  {/* 地区ヘッダー */}
                  <div className="bg-gray-100 px-4 py-2 flex items-center gap-2">
                    <span className="font-bold text-gray-800">{plan.地区}</span>
                    <span className="text-xs text-red-600">要支援: {plan.要支援者.length}名</span>
                    <span className="text-xs text-green-600">支援可能: {plan.支援者.length}名</span>
                  </div>

                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* 要支援者リスト */}
                    <div>
                      <h4 className="text-xs font-bold text-red-700 mb-2 uppercase">🆘 要支援住民（優先度順）</h4>
                      {plan.要支援者.length === 0 ? (
                        <p className="text-xs text-gray-400">該当者なし</p>
                      ) : (
                        <div className="space-y-2">
                          {plan.要支援者.map(r => (
                            <NeededCard key={r.id} resident={r} />
                          ))}
                        </div>
                      )}
                    </div>

                    {/* 支援可能者リスト */}
                    <div>
                      <h4 className="text-xs font-bold text-green-700 mb-2 uppercase">✅ 支援可能住民</h4>
                      {plan.支援者.length === 0 ? (
                        <p className="text-xs text-gray-400">この地区に支援可能な住民がいません。隣接地区からの支援を検討してください。</p>
                      ) : (
                        <div className="space-y-2">
                          {plan.支援者.map(r => (
                            <CapableCard key={r.id} resident={r} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 更新ボタン */}
          <div className="text-center">
            <button
              onClick={fetchData}
              className="px-4 py-2 text-sm text-gray-600 border rounded-lg hover:bg-gray-50"
            >
              🔄 データを更新する
            </button>
          </div>
        </>
      )}
    </div>
  )
}
