'use client'
// =====================================================
//  src/components/gyosei/ChildcareRiskPanel.tsx
//  子育て世帯流出リスク検知AI UIパネル — Sprint #69
//
//  ■ 表示内容
//    - リスク別件数サマリー（HIGH/MEDIUM/LOW）
//    - カテゴリ別転出懸念分析
//    - 世帯一覧（リスクフィルター付き）
//    - Claude Haiku によるフォロー施策提言
//
//  ■ 事例自治体
//    神埼市（佐賀県）少子化・子育て世帯流出が深刻
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import type {
  ChildcareRiskResponse,
  ChildcareRecord,
  CategoryRiskSummary,
} from '@/app/api/gyosei/childcare-risk/route'

// ─── リスクレベル設定 ──────────────────────────────────────

const RISK_CONFIG = {
  HIGH:   { label: '高リスク', color: 'text-red-700',   bg: 'bg-red-100 border-red-300',   dot: 'bg-red-500',   bar: 'bg-red-500'   },
  MEDIUM: { label: '中リスク', color: 'text-amber-700', bg: 'bg-amber-100 border-amber-300', dot: 'bg-amber-400', bar: 'bg-amber-400' },
  LOW:    { label: '低リスク', color: 'text-green-700', bg: 'bg-green-100 border-green-300', dot: 'bg-green-500', bar: 'bg-green-400' },
}

// ─── カテゴリ設定 ──────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { emoji: string }> = {
  '保育所待機': { emoji: '🏫' },
  '医療・健康': { emoji: '🏥' },
  '転出相談':   { emoji: '🚚' },
  '経済支援':   { emoji: '💴' },
  '発達支援':   { emoji: '🌱' },
  'その他':     { emoji: '📋' },
}

// ─── フォロー状況設定 ──────────────────────────────────────

const FOLLOW_CONFIG: Record<string, string> = {
  '未対応':   'bg-red-100 text-red-700 border-red-200',
  '対応中':   'bg-amber-100 text-amber-700 border-amber-200',
  '解決済み': 'bg-green-100 text-green-700 border-green-200',
  '転出済み': 'bg-gray-100 text-gray-500 border-gray-200',
}

// ─── サブコンポーネント ────────────────────────────────────

/** カテゴリ別リスク行 */
function CategoryRow({ cat }: { cat: CategoryRiskSummary }) {
  const cfg = CATEGORY_CONFIG[cat.category] ?? { emoji: '📋' }
  const riskRate = cat.totalCount > 0 ? Math.round((cat.highRiskCount / cat.totalCount) * 100) : 0
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
      <span className="text-lg w-7">{cfg.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-medium text-gray-700">{cat.category}</span>
          <span className="text-xs text-gray-500">{cat.totalCount}件 / 高リスク{cat.highRiskCount}件</span>
        </div>
        <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-red-400 rounded-full transition-all duration-700"
            style={{ width: `${riskRate}%` }}
          />
        </div>
      </div>
      <span className="text-xs font-semibold text-red-600 w-10 text-right">{riskRate}%</span>
    </div>
  )
}

/** 相談カード（モバイル） */
function RecordCard({ r }: { r: ChildcareRecord }) {
  const rCfg = RISK_CONFIG[r.riskLevel]
  const fCls = FOLLOW_CONFIG[r.followStatus] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  const catEmoji = CATEGORY_CONFIG[r.category]?.emoji ?? '📋'
  return (
    <div className={`bg-white border rounded-xl p-4 shadow-sm border-l-4 ${r.riskLevel === 'HIGH' ? 'border-l-red-500' : r.riskLevel === 'MEDIUM' ? 'border-l-amber-400' : 'border-l-green-400'}`}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-lg">{catEmoji}</span>
          <div>
            <p className="text-sm font-semibold text-gray-800">{r.consultationId}</p>
            <p className="text-xs text-gray-500">{r.childAge} / {r.household}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1">
          <span className={`text-xs px-2 py-0.5 rounded-full border ${rCfg.bg} ${rCfg.color}`}>
            {rCfg.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full border ${fCls}`}>{r.followStatus}</span>
        </div>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs text-gray-500">転出懸念スコア</span>
        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full ${rCfg.bar} rounded-full`}
            style={{ width: `${r.departureScore}%` }}
          />
        </div>
        <span className={`text-sm font-bold ${rCfg.color}`}>{r.departureScore}</span>
      </div>
      <p className="text-xs text-gray-500 line-clamp-2">{r.content}</p>
      <p className="text-xs text-gray-400 mt-1">{r.category} | {r.consultDate}</p>
    </div>
  )
}

/** 相談テーブル行（デスクトップ） */
function RecordRow({ r }: { r: ChildcareRecord }) {
  const rCfg = RISK_CONFIG[r.riskLevel]
  const fCls = FOLLOW_CONFIG[r.followStatus] ?? 'bg-gray-100 text-gray-600 border-gray-200'
  const catEmoji = CATEGORY_CONFIG[r.category]?.emoji ?? '📋'
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2.5 text-sm font-medium text-gray-700">{r.consultationId}</td>
      <td className="px-3 py-2.5 text-xs text-gray-600">{catEmoji} {r.category}</td>
      <td className="px-3 py-2.5 text-xs text-gray-600">{r.childAge}</td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{r.household}</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${rCfg.bar} rounded-full`} style={{ width: `${r.departureScore}%` }} />
          </div>
          <span className={`text-sm font-bold ${rCfg.color}`}>{r.departureScore}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${rCfg.bg} ${rCfg.color}`}>{rCfg.label}</span>
      </td>
      <td className="px-3 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${fCls}`}>{r.followStatus}</span>
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{r.staff}</td>
    </tr>
  )
}

// ─── メインコンポーネント ──────────────────────────────────

export function ChildcareRiskPanel() {
  const { municipalityId } = useMunicipality()
  const [data, setData] = useState<ChildcareRiskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterRisk, setFilterRisk] = useState<string>('ALL')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gyosei/childcare-risk?municipalityId=${municipalityId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'データ取得失敗')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー')
    } finally {
      setLoading(false)
    }
  }, [municipalityId])

  useEffect(() => {
    setData(null)
    setError(null)
  }, [municipalityId])

  // ── 未分析 ────────────────────────────────────────────
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-4">👶</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">子育て世帯流出リスク検知AI</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          子育て相談記録から転出を考えている世帯を早期検知し、
          フォロー施策をAIが提言します。
        </p>
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-pink-600 text-white rounded-xl text-sm font-semibold hover:bg-pink-700 transition-colors shadow"
        >
          📊 転出リスクを分析する
        </button>
        {error && (
          error.includes('childcareDbId が設定されていません') ? (
            // 神埼市専用機能のため、他の自治体では friendly メッセージを表示
            <div className="mt-6 bg-pink-50 border border-pink-200 rounded-xl p-6 text-center max-w-md">
              <p className="text-2xl mb-2">👶</p>
              <p className="text-pink-800 font-semibold mb-1">
                この機能は神埼市（少子化・子育て世帯流出対策）のデモ専用です
              </p>
              <p className="text-xs text-pink-600">
                ヘッダーの自治体セレクターで「神埼市」に切り替えると転出リスクデータを確認できます。
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-red-500">エラー: {error}</p>
          )
        )}
      </div>
    )
  }

  // ── ローディング ──────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-4xl mb-3 animate-pulse">👶</div>
        <p className="text-gray-600 text-sm font-medium">転出リスクをスコアリング中...</p>
        <p className="text-gray-400 text-xs mt-1">子育て相談データを分析しています</p>
      </div>
    )
  }

  if (!data) return null

  const { municipalityName, totalRecords, highRiskCount, mediumRiskCount, lowRiskCount,
          unhandledCount, avgDepartureScore, records, categorySummaries,
          recommendations, fetchedAt } = data

  // リスクフィルター適用
  const filteredRecords = filterRisk === 'ALL'
    ? records
    : records.filter((r) => r.riskLevel === filterRisk)

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-5">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">👶 子育て世帯流出リスク検知AI</h1>
          <p className="text-sm text-gray-500">{municipalityName} | {fetchedAt.slice(0, 10)} 集計</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-pink-600 text-white rounded-lg hover:bg-pink-700 transition-colors"
        >
          更新
        </button>
      </div>

      {/* ── サマリーカード ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '高リスク世帯',   value: `${highRiskCount}件`,   sub: '転出懸念スコア70以上', emoji: '🚨', cls: 'border-red-200 bg-red-50' },
          { label: '中リスク世帯',   value: `${mediumRiskCount}件`, sub: 'スコア40〜69', emoji: '⚠️', cls: 'border-amber-200 bg-amber-50' },
          { label: '低リスク世帯',   value: `${lowRiskCount}件`,    sub: 'スコア39以下', emoji: '✅', cls: 'border-green-200 bg-green-50' },
          { label: '未対応件数',    value: `${unhandledCount}件`,   sub: `全${totalRecords}件中`, emoji: '📋', cls: 'border-gray-200 bg-white' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-3 shadow-sm text-center ${card.cls}`}>
            <p className="text-2xl mb-1">{card.emoji}</p>
            <p className="text-xl font-bold text-gray-800">{card.value}</p>
            <p className="text-xs text-gray-500">{card.sub}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── カテゴリ別分析 + 平均スコア ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 平均スコアゲージ */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col items-center justify-center">
          <p className="text-sm font-semibold text-gray-700 mb-2">平均転出懸念スコア</p>
          <p className={`text-6xl font-bold mb-1 ${avgDepartureScore >= 70 ? 'text-red-600' : avgDepartureScore >= 40 ? 'text-amber-500' : 'text-green-600'}`}>
            {avgDepartureScore}
          </p>
          <p className="text-xs text-gray-400">/ 100点（全{totalRecords}世帯平均）</p>
          <div className="w-full mt-3 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-700 ${avgDepartureScore >= 70 ? 'bg-red-500' : avgDepartureScore >= 40 ? 'bg-amber-400' : 'bg-green-400'}`}
              style={{ width: `${avgDepartureScore}%` }}
            />
          </div>
        </div>

        {/* カテゴリ別分析 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">相談カテゴリ別 高リスク率</p>
          <div>
            {categorySummaries.map((cat) => (
              <CategoryRow key={cat.category} cat={cat} />
            ))}
          </div>
        </div>
      </div>

      {/* ── AI施策提言 ── */}
      {recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-bold text-pink-800 mb-3">🤖 AI引き止め施策提言（Claude Haiku）</p>
          <div className="space-y-2">
            {recommendations.map((rec, i) => (
              <div key={i} className="flex gap-3 bg-white/70 rounded-lg p-3">
                <span className="text-pink-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-pink-900">{rec}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 世帯一覧 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">相談世帯一覧</p>
          {/* リスクフィルター */}
          <div className="flex flex-wrap gap-1.5">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((key) => {
              const isAll = key === 'ALL'
              const cfg = isAll ? null : RISK_CONFIG[key]
              const isActive = filterRisk === key
              return (
                <button
                  key={key}
                  onClick={() => setFilterRisk(key)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    isActive
                      ? 'bg-pink-600 text-white border-pink-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {isAll ? 'すべて' : cfg!.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* モバイル: カード */}
        <div className="md:hidden p-3 space-y-3">
          {filteredRecords.map((r) => (
            <RecordCard key={r.id} r={r} />
          ))}
        </div>

        {/* デスクトップ: テーブル */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['相談者ID', 'カテゴリ', '子どもの年齢', '世帯状況', '転出スコア', 'リスク', 'フォロー', '担当者'].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredRecords.map((r) => (
                <RecordRow key={r.id} r={r} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
