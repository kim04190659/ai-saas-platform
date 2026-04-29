'use client';

// =====================================================
//  src/components/gyosei/RecoveryDashboardPanel.tsx
//  復興進捗ダッシュボード UI — Sprint #67
//
//  ■ 表示内容
//    ① サマリーカード（総案件数・完成・遅延・平均進捗・予算執行率）
//    ② カテゴリ別進捗バー（住宅再建/インフラ/産業/医療/教育/コミュニティ）
//    ③ 案件リスト（遅延リスク HIGH → MEDIUM → LOW 順）
//    ④ AI提言セクション（Claude Haikuによる3件）
//
//  ■ カラーコーディング
//    HIGH  → red（緊急対応必要）
//    MEDIUM → amber（要注意）
//    LOW    → green（順調）
//    完成   → emerald
// =====================================================

import { useState, useEffect } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import type { RecoveryDashboardResponse, RecoveryProject, CategorySummary } from '@/app/api/gyosei/recovery-dashboard/route'

// ─── リスクバッジの設定 ─────────────────────────────────

const RISK_CONFIG = {
  HIGH:   { label: '遅延中',   bg: 'bg-red-100',   text: 'text-red-700',   dot: 'bg-red-500',   border: 'border-red-200' },
  MEDIUM: { label: '要注意',   bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500', border: 'border-amber-200' },
  LOW:    { label: '順調',     bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', border: 'border-green-200' },
} as const

// ステータスバッジの色
const STATUS_CONFIG: Record<string, { bg: string; text: string }> = {
  '計画中': { bg: 'bg-gray-100',   text: 'text-gray-600'   },
  '着工':   { bg: 'bg-blue-100',  text: 'text-blue-700'   },
  '施工中': { bg: 'bg-orange-100',text: 'text-orange-700' },
  '完成':   { bg: 'bg-emerald-100', text: 'text-emerald-700' },
  '中断':   { bg: 'bg-red-100',   text: 'text-red-700'    },
}

// カテゴリ絵文字
const CATEGORY_EMOJI: Record<string, string> = {
  '住宅再建':   '🏠',
  'インフラ':   '🛣️',
  '産業':       '🏭',
  '医療':       '🏥',
  '教育':       '🏫',
  'コミュニティ': '🤝',
}

// ─── サブコンポーネント: 進捗バー ───────────────────────

function ProgressBar({ value, color = 'bg-orange-500' }: { value: number; color?: string }) {
  return (
    <div className="w-full bg-gray-100 rounded-full h-2">
      <div
        className={`h-2 rounded-full transition-all duration-500 ${color}`}
        style={{ width: `${Math.min(value, 100)}%` }}
      />
    </div>
  )
}

// ─── サブコンポーネント: カテゴリ別進捗行 ──────────────

function CategoryRow({ summary }: { summary: CategorySummary }) {
  const emoji = CATEGORY_EMOJI[summary.category] ?? '📋'
  const execRate = summary.totalBudget > 0
    ? Math.round((summary.totalExecuted / summary.totalBudget) * 100)
    : 0

  // 進捗に応じてバーの色を変える
  const barColor = summary.avgProgress >= 80
    ? 'bg-emerald-500'
    : summary.avgProgress >= 50
      ? 'bg-orange-500'
      : 'bg-red-400'

  return (
    <div className="flex items-center gap-3 py-2">
      {/* 絵文字 + カテゴリ名 */}
      <div className="w-28 flex-shrink-0 flex items-center gap-1.5">
        <span className="text-base">{emoji}</span>
        <span className="text-sm font-medium text-gray-700 truncate">{summary.category}</span>
      </div>

      {/* 進捗バー */}
      <div className="flex-1">
        <ProgressBar value={summary.avgProgress} color={barColor} />
      </div>

      {/* 数値 */}
      <div className="w-12 text-right">
        <span className="text-sm font-bold text-gray-800">{summary.avgProgress}%</span>
      </div>

      {/* 遅延件数 */}
      {summary.delayedCount > 0 && (
        <span className="text-xs text-red-600 font-medium w-16 text-right">
          遅延{summary.delayedCount}件
        </span>
      )}
      {summary.delayedCount === 0 && (
        <span className="text-xs text-gray-300 w-16 text-right">—</span>
      )}

      {/* 執行率 */}
      <span className="text-xs text-gray-500 w-16 text-right hidden sm:block">
        執行{execRate}%
      </span>
    </div>
  )
}

// ─── サブコンポーネント: 案件カード（モバイル） ─────────

function ProjectCard({ project }: { project: RecoveryProject }) {
  const [expanded, setExpanded] = useState(false)
  const risk = RISK_CONFIG[project.delayRisk]
  const status = STATUS_CONFIG[project.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const emoji = CATEGORY_EMOJI[project.category] ?? '📋'

  return (
    <div className={`bg-white rounded-xl border p-4 shadow-sm ${risk.border}`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 truncate">
            {emoji} {project.name}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{project.division}</p>
        </div>
        <div className="flex flex-col items-end gap-1 flex-shrink-0">
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
            {risk.label}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${status.bg} ${status.text}`}>
            {project.status}
          </span>
        </div>
      </div>

      {/* 進捗バー */}
      <div className="mb-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>進捗率</span>
          <span className="font-bold text-gray-800">{project.progress}%</span>
        </div>
        <ProgressBar
          value={project.progress}
          color={project.progress >= 80 ? 'bg-emerald-500' : project.isDelayed ? 'bg-red-400' : 'bg-orange-400'}
        />
      </div>

      {/* 予算・執行率 */}
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
        <div>
          <p className="text-gray-400">予算</p>
          <p className="font-medium">{project.budget.toLocaleString()}万円</p>
        </div>
        <div>
          <p className="text-gray-400">執行率</p>
          <p className="font-medium">{project.executionRate}%</p>
        </div>
      </div>

      {/* 備考（展開） */}
      {project.notes && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-orange-600 font-medium"
          >
            {expanded ? '▲ 閉じる' : '▼ 詳細を見る'}
          </button>
          {expanded && (
            <p className="mt-1 text-xs text-gray-600 bg-orange-50 rounded p-2">
              {project.notes}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// ─── サブコンポーネント: 案件行（デスクトップテーブル） ─

function ProjectRow({ project }: { project: RecoveryProject }) {
  const [expanded, setExpanded] = useState(false)
  const risk = RISK_CONFIG[project.delayRisk]
  const status = STATUS_CONFIG[project.status] ?? { bg: 'bg-gray-100', text: 'text-gray-600' }
  const emoji = CATEGORY_EMOJI[project.category] ?? '📋'

  return (
    <>
      <tr
        className="hover:bg-orange-50 cursor-pointer transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        {/* 案件名 */}
        <td className="px-4 py-3">
          <p className="text-sm font-medium text-gray-900">
            {emoji} {project.name}
          </p>
          <p className="text-xs text-gray-400">{project.division}</p>
        </td>

        {/* ステータス */}
        <td className="px-4 py-3">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${status.bg} ${status.text}`}>
            {project.status}
          </span>
        </td>

        {/* 進捗率 */}
        <td className="px-4 py-3 w-40">
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <ProgressBar
                value={project.progress}
                color={project.progress >= 80 ? 'bg-emerald-500' : project.isDelayed ? 'bg-red-400' : 'bg-orange-400'}
              />
            </div>
            <span className="text-xs font-bold text-gray-700 w-8 text-right">{project.progress}%</span>
          </div>
        </td>

        {/* 予算・執行率 */}
        <td className="px-4 py-3 text-right">
          <p className="text-xs font-medium text-gray-800">{project.budget.toLocaleString()}万円</p>
          <p className="text-xs text-gray-400">執行{project.executionRate}%</p>
        </td>

        {/* リスク */}
        <td className="px-4 py-3 text-center">
          <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${risk.bg} ${risk.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${risk.dot}`} />
            {risk.label}
          </span>
        </td>
      </tr>

      {/* 展開行: 備考 */}
      {expanded && project.notes && (
        <tr className="bg-orange-50">
          <td colSpan={5} className="px-4 py-2">
            <p className="text-xs text-gray-600">{project.notes}</p>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── メインコンポーネント ────────────────────────────────

export function RecoveryDashboardPanel() {
  const { municipalityId, municipality } = useMunicipality()
  const [data, setData] = useState<RecoveryDashboardResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // フィルター: ALL / HIGH / MEDIUM / LOW
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL')

  // データ取得
  const fetchData = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gyosei/recovery-dashboard?municipalityId=${municipalityId}`)
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'データ取得に失敗しました')
      }
      setData(await res.json())
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [municipalityId])

  // フィルタリング済み案件リスト
  const filteredProjects = data?.projects.filter((p) =>
    riskFilter === 'ALL' ? true : p.delayRisk === riskFilter
  ) ?? []

  // ─── ローディング ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">復興進捗データを読み込み中...</p>
      </div>
    )
  }

  // ─── エラー ──────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-700 font-medium mb-2">データ取得エラー</p>
        <p className="text-sm text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
        >
          再試行
        </button>
      </div>
    )
  }

  if (!data) return null

  // ─── メイン表示 ──────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            🏗️ 復興進捗ダッシュボード
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {data.municipalityName} — 能登半島地震 復興事業進捗管理
          </p>
        </div>
        <button
          onClick={fetchData}
          className="px-3 py-1.5 text-xs bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors"
        >
          🔄 更新
        </button>
      </div>

      {/* ── ① サマリーカード ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {[
          { label: '総案件数',    value: `${data.totalProjects}件`,      sub: '管理中',          color: 'text-gray-800',   bg: 'bg-gray-50'    },
          { label: '完成',        value: `${data.completedProjects}件`,   sub: `${Math.round(data.completedProjects / data.totalProjects * 100)}%完成`, color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { label: '遅延中',      value: `${data.delayedProjects}件`,     sub: '要対応',           color: 'text-red-700',    bg: 'bg-red-50'     },
          { label: '平均進捗',    value: `${data.avgProgress}%`,          sub: '全案件平均',       color: 'text-orange-700', bg: 'bg-orange-50'  },
          { label: '予算執行率',  value: `${data.executionRate}%`,        sub: `${data.totalBudget.toLocaleString()}万円予算`, color: 'text-blue-700', bg: 'bg-blue-50' },
        ].map((card) => (
          <div key={card.label} className={`${card.bg} rounded-xl p-3 border border-white shadow-sm`}>
            <p className="text-xs text-gray-500">{card.label}</p>
            <p className={`text-lg font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-400">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── ② カテゴリ別進捗 ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">📊 カテゴリ別進捗</h2>
        <div className="divide-y divide-gray-50">
          {data.categorySummaries.map((s) => (
            <CategoryRow key={s.category} summary={s} />
          ))}
        </div>
      </div>

      {/* ── ③ 案件リスト ── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {/* フィルターヘッダー */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            🗂️ 案件一覧 <span className="text-gray-400 font-normal">({filteredProjects.length}件)</span>
          </h2>
          <div className="flex gap-1">
            {(['ALL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setRiskFilter(f)}
                className={[
                  'px-2 py-1 rounded text-xs font-medium transition-colors',
                  riskFilter === f
                    ? 'bg-orange-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200',
                ].join(' ')}
              >
                {f === 'ALL' ? '全て' : RISK_CONFIG[f].label}
              </button>
            ))}
          </div>
        </div>

        {/* モバイル: カード表示 */}
        <div className="sm:hidden p-3 space-y-3">
          {filteredProjects.map((p) => (
            <ProjectCard key={p.id} project={p} />
          ))}
        </div>

        {/* デスクトップ: テーブル表示 */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
              <tr>
                <th className="px-4 py-2 text-left">案件名</th>
                <th className="px-4 py-2 text-left">ステータス</th>
                <th className="px-4 py-2 text-left">進捗</th>
                <th className="px-4 py-2 text-right">予算・執行</th>
                <th className="px-4 py-2 text-center">リスク</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredProjects.map((p) => (
                <ProjectRow key={p.id} project={p} />
              ))}
            </tbody>
          </table>
        </div>

        {filteredProjects.length === 0 && (
          <div className="p-8 text-center text-sm text-gray-400">
            該当する案件がありません
          </div>
        )}
      </div>

      {/* ── ④ AI提言 ── */}
      {data.recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-200 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h2 className="text-sm font-semibold text-orange-800">AI 復興推進アドバイス</h2>
            <span className="text-xs text-orange-400">（Claude AI 分析）</span>
          </div>
          <ul className="space-y-2">
            {data.recommendations.map((rec, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-orange-500 font-bold text-sm mt-0.5 flex-shrink-0">
                  {i + 1}.
                </span>
                <p className="text-sm text-orange-900">{rec}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* フッター */}
      <p className="text-xs text-gray-400 text-right">
        最終更新: {new Date(data.fetchedAt).toLocaleString('ja-JP')}
      </p>
    </div>
  )
}
