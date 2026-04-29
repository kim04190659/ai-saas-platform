// =====================================================
//  src/components/gyosei/VisitPriorityPanel.tsx
//  往診優先順位AI パネル — Sprint #65
//
//  往診管理DBの患者を優先度スコア順に表示し、
//  担当医・看護師が「今週誰を優先して往診すべきか」を
//  ひと目で把握できるダッシュボード。
// =====================================================

'use client'

import { useState } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import type { VisitPriorityResponse, VisitPriorityRecord } from '@/app/api/gyosei/visit-priority/route'

// ─── 優先度ランク 設定 ────────────────────────────────

const RANK_CONFIG = {
  URGENT: {
    label:  '緊急対応',
    badge:  'bg-red-100 text-red-700 border border-red-200',
    row:    'bg-red-50',
    bar:    'bg-red-500',
    border: 'border-red-200',
  },
  HIGH: {
    label:  '今週必須',
    badge:  'bg-orange-100 text-orange-700 border border-orange-200',
    row:    'bg-orange-50',
    bar:    'bg-orange-400',
    border: 'border-orange-200',
  },
  MID: {
    label:  '今週推奨',
    badge:  'bg-amber-100 text-amber-700 border border-amber-200',
    row:    'bg-amber-50',
    bar:    'bg-amber-400',
    border: 'border-amber-200',
  },
  LOW: {
    label:  '経過観察',
    badge:  'bg-emerald-100 text-emerald-700 border border-emerald-200',
    row:    'bg-white',
    bar:    'bg-emerald-400',
    border: 'border-gray-200',
  },
} as const

// ─── 緊急フラグ バッジ ────────────────────────────────

function UrgencyBadge({ flag }: { flag: string }) {
  const style =
    flag === '緊急'   ? 'bg-red-100 text-red-600 border border-red-200' :
    flag === '要注意' ? 'bg-orange-100 text-orange-600 border border-orange-200' :
    'bg-gray-100 text-gray-500 border border-gray-200'
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded-full font-medium ${style}`}>
      {flag}
    </span>
  )
}

// ─── スコアバー ───────────────────────────────────────

function ScoreBar({ score, barColor }: { score: number; barColor: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${barColor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-mono font-semibold text-gray-700 w-6">{score}</span>
    </div>
  )
}

// ─── 患者カード（モバイル用） ─────────────────────────

function PatientCard({ r }: { r: VisitPriorityRecord }) {
  const [open, setOpen] = useState(false)
  const cfg = RANK_CONFIG[r.priorityRank]

  return (
    <div className={`rounded-xl border p-3 space-y-2 text-sm ${cfg.border}`}>
      <div className="flex items-center justify-between">
        <div>
          <span className="font-semibold text-gray-800">{r.name}</span>
          <span className="ml-2 text-xs text-gray-500">{r.age}歳</span>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>
      <ScoreBar score={r.priorityScore} barColor={cfg.bar} />
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>📍 {r.area}</span>
        <span>🏠 {r.householdType}</span>
        <span>📅 {r.daysSinceVisit}日前</span>
        <span>👨‍⚕️ {r.doctorName}</span>
      </div>
      <div className="flex gap-1 flex-wrap items-center">
        <UrgencyBadge flag={r.urgencyFlag} />
        <span className="text-xs text-gray-500">{r.careLevel}</span>
      </div>
      {r.scoreFactors.length > 0 && (
        <button onClick={() => setOpen(v => !v)} className="text-xs text-blue-600 underline">
          {open ? '▲ 要因を隠す' : '▼ スコア要因'}
        </button>
      )}
      {open && (
        <ul className="text-xs text-gray-600 space-y-0.5 pl-2">
          {r.scoreFactors.map((f, i) => (
            <li key={i} className="before:content-['・']">{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── 患者テーブル行（デスクトップ用） ────────────────

function PatientRow({ r }: { r: VisitPriorityRecord }) {
  const [open, setOpen] = useState(false)
  const cfg = RANK_CONFIG[r.priorityRank]

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${cfg.row}`}>
        <td className="px-3 py-2.5 text-sm font-medium text-gray-800">
          {r.name}
          <span className="ml-1 text-xs text-gray-500">{r.age}歳</span>
        </td>
        <td className="px-3 py-2.5">
          <ScoreBar score={r.priorityScore} barColor={cfg.bar} />
        </td>
        <td className="px-3 py-2.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600">{r.area}</td>
        <td className="px-3 py-2.5 text-xs">
          <UrgencyBadge flag={r.urgencyFlag} />
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-600">{r.careLevel}</td>
        <td className="px-3 py-2.5 text-xs text-gray-600">{r.householdType}</td>
        <td className="px-3 py-2.5 text-xs text-gray-500">
          {r.daysSinceVisit}日前
        </td>
        <td className="px-3 py-2.5 text-xs text-gray-500">{r.doctorName}</td>
        <td className="px-3 py-2.5">
          {r.scoreFactors.length > 0 && (
            <button
              onClick={() => setOpen(v => !v)}
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              {open ? '▲ 閉じる' : '▼ 要因'}
            </button>
          )}
        </td>
      </tr>
      {open && (
        <tr className={`border-b border-gray-100 ${cfg.row}`}>
          <td colSpan={10} className="px-6 pb-3">
            <p className="text-xs text-gray-500 mb-1">基礎疾患: {r.conditions}</p>
            <ul className="text-xs text-gray-600 space-y-0.5 list-disc pl-4">
              {r.scoreFactors.map((f, i) => <li key={i}>{f}</li>)}
            </ul>
            {r.notes && (
              <p className="text-xs text-gray-500 mt-1 italic">備考: {r.notes}</p>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

// ─── メインパネル ─────────────────────────────────────

export function VisitPriorityPanel() {
  const { municipalityId, municipality } = useMunicipality()
  const [data,    setData]    = useState<VisitPriorityResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const res  = await fetch(`/api/gyosei/visit-priority?municipalityId=${municipalityId}`)
      const json = await res.json() as VisitPriorityResponse
      if (json.status === 'error') throw new Error(json.message)
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // ── 初期状態 ──────────────────────────────────────────
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🏥</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">往診優先順位 AI</h1>
        <p className="text-gray-500 text-sm max-w-md mb-6">
          往診管理DBの患者に優先度スコアを算出します。<br />
          限られた医師が「今週誰を優先すべきか」を<br />
          データで判断できるようにします。
        </p>
        <button
          onClick={fetchData}
          className="px-6 py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold hover:bg-rose-700 transition-colors shadow"
        >
          📊 往診優先順位を分析する
        </button>
        {error && (
          error.includes('往診管理DBが設定されていません') ? (
            // 五島市専用機能のため、他の自治体では friendly メッセージを表示
            <div className="mt-6 bg-rose-50 border border-rose-200 rounded-xl p-6 text-center max-w-md">
              <p className="text-2xl mb-2">🏥</p>
              <p className="text-rose-800 font-semibold mb-1">
                この機能は五島市（離島医療）のデモ専用です
              </p>
              <p className="text-xs text-rose-600">
                ヘッダーの自治体セレクターで「五島市」に切り替えると往診優先順位データを確認できます。
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
        <div className="text-4xl mb-3 animate-pulse">🏥</div>
        <p className="text-gray-600 text-sm font-medium">優先度スコアを算出中...</p>
        <p className="text-gray-400 text-xs mt-1">患者データを分析しています</p>
      </div>
    )
  }

  if (!data) return null
  const { summary, records, aiRecommendations, municipal } = data

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-5">

      {/* ── ヘッダー ──────────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🏥 往診優先順位 AI</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {municipal} ／ 往診患者 {summary.total} 名を分析
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          🔄 再分析
        </button>
      </div>

      {/* ── サマリーカード ────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: '緊急対応',   value: summary.urgent, color: 'text-red-600',     bg: 'bg-red-50',     sub: '80点以上' },
          { label: '今週必須',   value: summary.high,   color: 'text-orange-600',  bg: 'bg-orange-50',  sub: '50〜79点' },
          { label: '今週推奨',   value: summary.mid,    color: 'text-amber-600',   bg: 'bg-amber-50',   sub: '25〜49点' },
          { label: '経過観察',   value: summary.low,    color: 'text-emerald-600', bg: 'bg-emerald-50', sub: '25点未満' },
        ].map(({ label, value, color, bg, sub }) => (
          <div key={label} className={`rounded-xl p-3 text-center shadow-sm ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}<span className="text-sm ml-0.5">名</span></p>
            <p className="text-xs font-medium text-gray-700 mt-0.5">{label}</p>
            <p className="text-xs text-gray-400">{sub}</p>
          </div>
        ))}
      </div>

      {/* ── AI往診スケジュール提言 ────────────────────── */}
      {aiRecommendations.length > 0 && (
        <div className="bg-gradient-to-br from-rose-50 to-pink-50 border border-rose-100 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-rose-800 mb-3">
            🤖 AI往診スケジュール提言（{municipal}向け）
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {aiRecommendations.map((rec, i) => (
              <div
                key={i}
                className="flex-1 bg-white rounded-lg p-3 text-xs text-gray-700 shadow-sm border border-rose-100"
              >
                <span className="inline-block w-5 h-5 rounded-full bg-rose-100 text-rose-700 text-center text-xs font-bold mr-1.5 leading-5">
                  {i + 1}
                </span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 患者一覧（テーブル：デスクトップ） ────────── */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">往診患者リスト（優先度高い順）</h2>
          <p className="text-xs text-gray-400">{records.length} 名</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                <th className="px-3 py-2 text-left font-medium">患者名</th>
                <th className="px-3 py-2 text-left font-medium">優先スコア</th>
                <th className="px-3 py-2 text-left font-medium">区分</th>
                <th className="px-3 py-2 text-left font-medium">居住区</th>
                <th className="px-3 py-2 text-left font-medium">緊急</th>
                <th className="px-3 py-2 text-left font-medium">介護度</th>
                <th className="px-3 py-2 text-left font-medium">世帯</th>
                <th className="px-3 py-2 text-left font-medium">前回往診</th>
                <th className="px-3 py-2 text-left font-medium">担当医</th>
                <th className="px-3 py-2 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => <PatientRow key={r.id} r={r} />)}
              {records.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-8 text-center text-sm text-gray-400">
                    患者データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 患者カード（モバイル） ─────────────────────── */}
      <div className="md:hidden space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">往診患者リスト（優先度高い順）</h2>
        {records.length === 0
          ? <p className="text-center text-sm text-gray-400 py-6">患者データがありません</p>
          : records.map(r => <PatientCard key={r.id} r={r} />)
        }
      </div>

      <p className="text-xs text-gray-400 text-center pb-4">
        優先スコアは年齢・疾患数・世帯状況・介護度・緊急フラグ・前回往診日の6要素で算出（0〜100点）
      </p>
    </div>
  )
}
