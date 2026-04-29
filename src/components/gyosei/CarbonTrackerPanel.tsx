'use client'
// =====================================================
//  src/components/gyosei/CarbonTrackerPanel.tsx
//  CO2削減進捗トラッカー UIパネル — Sprint #68
//
//  ■ 表示内容
//    - 総合スコア・総削減量・カテゴリ別進捗バー
//    - 活動一覧（カテゴリフィルター付き）
//    - Claude Haiku による四半期AI総括
//
//  ■ 事例自治体
//    上勝町（徳島県）2020年ゼロカーボン宣言
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import type {
  CarbonTrackerResponse,
  CarbonActivity,
  CarbonCategorySummary,
} from '@/app/api/gyosei/carbon-tracker/route'

// ─── カテゴリ設定 ──────────────────────────────────────────

const CATEGORY_CONFIG: Record<string, { emoji: string; color: string; bg: string; bar: string }> = {
  '再エネ':        { emoji: '☀️', color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', bar: 'bg-yellow-400' },
  'EV・モビリティ': { emoji: '⚡', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     bar: 'bg-blue-400'   },
  '廃棄物削減':    { emoji: '♻️', color: 'text-green-700',  bg: 'bg-green-50 border-green-200',   bar: 'bg-green-500'  },
  '森林吸収':      { emoji: '🌲', color: 'text-emerald-700',bg: 'bg-emerald-50 border-emerald-200',bar: 'bg-emerald-500'},
  '省エネ':        { emoji: '💡', color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', bar: 'bg-orange-400' },
}

// ─── ステータス設定 ────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  '達成':  { label: '達成',  cls: 'bg-green-100 text-green-700 border-green-300' },
  '実施中': { label: '実施中', cls: 'bg-blue-100 text-blue-700 border-blue-300'   },
  '計画中': { label: '計画中', cls: 'bg-gray-100 text-gray-600 border-gray-300'   },
  '中断':  { label: '中断',  cls: 'bg-red-100 text-red-600 border-red-300'       },
}

// ─── サブコンポーネント ────────────────────────────────────

/** スコアリングゲージ（円形） */
function ScoreGauge({ score }: { score: number }) {
  const r = 54
  const circumference = 2 * Math.PI * r
  const offset = circumference - (score / 100) * circumference
  const color = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center w-36 h-36">
      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e5e7eb" strokeWidth="10" />
        <circle
          cx="60" cy="60" r={r}
          fill="none" stroke={color} strokeWidth="10"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="absolute text-center">
        <p className="text-3xl font-bold" style={{ color }}>{score}</p>
        <p className="text-xs text-gray-500">/ 100</p>
      </div>
    </div>
  )
}

/** カテゴリ別進捗行 */
function CategoryRow({ cat }: { cat: CarbonCategorySummary }) {
  const cfg = CATEGORY_CONFIG[cat.category] ?? { emoji: '📊', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', bar: 'bg-gray-400' }
  return (
    <div className={`p-3 rounded-lg border ${cfg.bg} flex items-center gap-3`}>
      <span className="text-xl w-7 text-center">{cfg.emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className={`text-sm font-semibold ${cfg.color}`}>{cat.category}</span>
          <span className="text-xs text-gray-500">{cat.totalReductionCo2}t削減 / {cat.achievedCount}/{cat.totalActivities}件達成</span>
        </div>
        <div className="h-2 bg-white/60 rounded-full overflow-hidden">
          <div
            className={`h-full ${cfg.bar} rounded-full transition-all duration-700`}
            style={{ width: `${Math.min(100, cat.avgAchievementRate)}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-0.5 text-right">{cat.avgAchievementRate}%</p>
      </div>
    </div>
  )
}

/** 活動カード（モバイル） */
function ActivityCard({ a }: { a: CarbonActivity }) {
  const cfg = CATEGORY_CONFIG[a.category] ?? { emoji: '📊', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', bar: 'bg-gray-400' }
  const sCfg = STATUS_CONFIG[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600 border-gray-300' }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-start gap-2 min-w-0">
          <span className="text-lg">{cfg.emoji}</span>
          <p className="text-sm font-semibold text-gray-800 leading-tight">{a.name}</p>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full border whitespace-nowrap ${sCfg.cls}`}>{sCfg.label}</span>
      </div>
      <div className="flex gap-4 text-xs text-gray-600 mb-2">
        <span>削減量: <strong className="text-green-700">{a.reductionCo2}t</strong></span>
        <span>達成率: <strong>{a.achievementRate}%</strong></span>
        <span>{a.period}</span>
      </div>
      <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full ${cfg.bar} rounded-full`}
          style={{ width: `${Math.min(100, a.achievementRate)}%` }}
        />
      </div>
      {a.notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">{a.notes}</p>}
    </div>
  )
}

/** 活動テーブル行（デスクトップ） */
function ActivityRow({ a }: { a: CarbonActivity }) {
  const cfg = CATEGORY_CONFIG[a.category] ?? { emoji: '📊', color: 'text-gray-700', bg: 'bg-gray-50 border-gray-200', bar: 'bg-gray-400' }
  const sCfg = STATUS_CONFIG[a.status] ?? { label: a.status, cls: 'bg-gray-100 text-gray-600 border-gray-300' }
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-3 py-2.5 text-sm text-gray-800">
        <span className="mr-1">{cfg.emoji}</span>{a.name}
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-600">{a.category}</td>
      <td className="px-3 py-2.5">
        <span className={`text-xs px-2 py-0.5 rounded-full border ${sCfg.cls}`}>{sCfg.label}</span>
      </td>
      <td className="px-3 py-2.5 text-sm font-semibold text-green-700 text-right">{a.reductionCo2}t</td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-2">
          <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className={`h-full ${cfg.bar} rounded-full`} style={{ width: `${Math.min(100, a.achievementRate)}%` }} />
          </div>
          <span className="text-xs text-gray-600 w-8 text-right">{a.achievementRate}%</span>
        </div>
      </td>
      <td className="px-3 py-2.5 text-xs text-gray-500">{a.division}</td>
    </tr>
  )
}

// ─── メインコンポーネント ──────────────────────────────────

export function CarbonTrackerPanel() {
  const { municipalityId } = useMunicipality()
  const [data, setData] = useState<CarbonTrackerResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [filterCategory, setFilterCategory] = useState<string>('ALL')

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gyosei/carbon-tracker?municipalityId=${municipalityId}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'データ取得失敗')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー')
    } finally {
      setLoading(false)
    }
  }, [municipalityId])

  // municipalityId が変わったらリセット
  useEffect(() => {
    setData(null)
    setError(null)
  }, [municipalityId])

  // ── 未分析 ────────────────────────────────────────────
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <p className="text-5xl mb-4">🌱</p>
        <h2 className="text-xl font-bold text-gray-800 mb-2">CO2削減進捗トラッカー</h2>
        <p className="text-sm text-gray-500 max-w-sm mb-6">
          ゼロカーボン宣言自治体の削減活動をカテゴリ別に可視化し、
          AIが四半期総括を自動生成します。
        </p>
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-green-600 text-white rounded-xl text-sm font-semibold hover:bg-green-700 transition-colors shadow"
        >
          🌍 ゼロカーボン進捗を分析する
        </button>
        {error && (
          error.includes('carbonDbId が設定されていません') ? (
            // 上勝町専用機能のため、他の自治体では friendly メッセージを表示
            <div className="mt-6 bg-green-50 border border-green-200 rounded-xl p-6 text-center max-w-md">
              <p className="text-2xl mb-2">🌿</p>
              <p className="text-green-800 font-semibold mb-1">
                この機能は上勝町（ゼロカーボン推進）のデモ専用です
              </p>
              <p className="text-xs text-green-600">
                ヘッダーの自治体セレクターで「上勝町」に切り替えるとCO2削減進捗データを確認できます。
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
        <div className="text-4xl mb-3 animate-pulse">🌱</div>
        <p className="text-gray-600 text-sm font-medium">CO2削減データを集計中...</p>
        <p className="text-gray-400 text-xs mt-1">カテゴリ別進捗を計算しています</p>
      </div>
    )
  }

  if (!data) return null

  const { municipalityName, totalActivities, achievedCount, inProgressCount, plannedCount,
          totalReductionCo2, avgAchievementRate, overallScore,
          activities, categorySummaries, aiAssessment, fetchedAt } = data

  // カテゴリフィルター適用
  const filteredActivities = filterCategory === 'ALL'
    ? activities
    : activities.filter((a) => a.category === filterCategory)

  const categories = ['ALL', ...Object.keys(CATEGORY_CONFIG)]

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-5">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🌱 CO2削減進捗トラッカー</h1>
          <p className="text-sm text-gray-500">{municipalityName} | {fetchedAt.slice(0, 10)} 集計</p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          更新
        </button>
      </div>

      {/* ── サマリーカード ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '総活動数',    value: `${totalActivities}件`, sub: `達成${achievedCount}件`, emoji: '📋' },
          { label: '総削減量',    value: `${totalReductionCo2}t`, sub: 'CO2削減', emoji: '🌍' },
          { label: '平均達成率',  value: `${avgAchievementRate}%`, sub: `実施中${inProgressCount}件`, emoji: '📊' },
          { label: '計画中活動', value: `${plannedCount}件`, sub: '次フェーズ', emoji: '📅' },
        ].map((card) => (
          <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-3 shadow-sm text-center">
            <p className="text-2xl mb-1">{card.emoji}</p>
            <p className="text-xl font-bold text-gray-800">{card.value}</p>
            <p className="text-xs text-gray-500">{card.sub}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.label}</p>
          </div>
        ))}
      </div>

      {/* ── スコアゲージ + カテゴリ別進捗 ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 総合スコア */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm flex flex-col items-center">
          <p className="text-sm font-semibold text-gray-700 mb-3">ゼロカーボン達成スコア</p>
          <ScoreGauge score={overallScore} />
          <p className="text-xs text-gray-400 mt-3 text-center">
            達成済み活動のボーナス込みスコア（100点満点）
          </p>
        </div>

        {/* カテゴリ別進捗 */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">カテゴリ別削減進捗</p>
          <div className="space-y-2">
            {categorySummaries.map((cat) => (
              <CategoryRow key={cat.category} cat={cat} />
            ))}
          </div>
        </div>
      </div>

      {/* ── AI四半期総括 ── */}
      {aiAssessment.length > 0 && (
        <div className="bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5 shadow-sm">
          <p className="text-sm font-bold text-green-800 mb-3">🤖 AI四半期総括（Claude Haiku）</p>
          <div className="space-y-2">
            {aiAssessment.map((comment, i) => (
              <div key={i} className="flex gap-3 bg-white/70 rounded-lg p-3">
                <span className="text-green-500 font-bold text-sm flex-shrink-0">{i + 1}</span>
                <p className="text-sm text-green-900">{comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 活動一覧 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-700 mb-3">削減活動一覧</p>
          {/* カテゴリフィルター */}
          <div className="flex flex-wrap gap-1.5">
            {categories.map((cat) => {
              const cfg = cat === 'ALL' ? null : CATEGORY_CONFIG[cat]
              const isActive = filterCategory === cat
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                    isActive
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                  }`}
                >
                  {cfg ? `${cfg.emoji} ${cat}` : 'すべて'}
                </button>
              )
            })}
          </div>
        </div>

        {/* モバイル: カード表示 */}
        <div className="md:hidden p-3 space-y-3">
          {filteredActivities.map((a) => (
            <ActivityCard key={a.id} a={a} />
          ))}
        </div>

        {/* デスクトップ: テーブル表示 */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {['活動名', 'カテゴリ', 'ステータス', '削減量', '達成率', '担当課'].map((h) => (
                  <th key={h} className="px-3 py-2 text-xs font-semibold text-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredActivities.map((a) => (
                <ActivityRow key={a.id} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
