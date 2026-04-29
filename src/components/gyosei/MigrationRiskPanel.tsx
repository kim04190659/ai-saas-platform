// =====================================================
//  src/components/gyosei/MigrationRiskPanel.tsx
//  移住定着リスクスコアリング パネル — Sprint #64
//
//  /api/gyosei/migration-risk を呼び出し、
//  移住者の定着リスクスコアを一覧表示する。
//  担当職員が優先フォローすべき移住者を
//  ひと目で把握できるダッシュボード。
// =====================================================

'use client'

import { useState } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import type { MigrationRiskResponse, MigrationRiskRecord } from '@/app/api/gyosei/migration-risk/route'

// ─── リスクランク ラベル・カラー定義 ─────────────────

const RANK_CONFIG = {
  HIGH: {
    label: '要フォロー',
    badge: 'bg-red-100 text-red-700 border border-red-200',
    row:   'bg-red-50',
    dot:   'bg-red-500',
  },
  MID: {
    label: '経過観察',
    badge: 'bg-amber-100 text-amber-700 border border-amber-200',
    row:   'bg-amber-50',
    dot:   'bg-amber-400',
  },
  LOW: {
    label: '安定',
    badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
    row:   'bg-white',
    dot:   'bg-emerald-500',
  },
} as const

// ─── スコアバー コンポーネント ────────────────────────

function ScoreBar({ score }: { score: number }) {
  // スコアに応じてバーの色を変える
  const color =
    score >= 60 ? 'bg-red-400' :
    score >= 30 ? 'bg-amber-400' :
    'bg-emerald-400'

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} transition-all`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-mono font-semibold text-gray-700">{score}</span>
    </div>
  )
}

// ─── 移住者カード（モバイル用） ──────────────────────

function ResidentCard({ r }: { r: MigrationRiskRecord }) {
  const [open, setOpen] = useState(false)
  const cfg = RANK_CONFIG[r.riskRank]

  return (
    <div className={`rounded-lg border p-3 text-sm space-y-2 ${r.riskRank === 'HIGH' ? 'border-red-200' : r.riskRank === 'MID' ? 'border-amber-200' : 'border-gray-200'}`}>
      {/* 名前・ランク */}
      <div className="flex items-center justify-between">
        <span className="font-semibold text-gray-800">{r.name || '（名前なし）'}</span>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
          {cfg.label}
        </span>
      </div>

      {/* スコア */}
      <ScoreBar score={r.riskScore} />

      {/* メタ情報 */}
      <div className="text-xs text-gray-500 flex flex-wrap gap-x-3 gap-y-1">
        <span>📅 {r.consultDate || '—'}</span>
        <span>🏠 {r.householdType || '—'}</span>
        <span>💼 {r.occupation || '—'}</span>
        <span>👤 {r.staffName || '担当未定'}</span>
      </div>

      {/* リスク要因（展開） */}
      {r.riskFactors.length > 0 && (
        <button
          onClick={() => setOpen(v => !v)}
          className="text-xs text-blue-600 underline"
        >
          {open ? '▲ 要因を隠す' : '▼ リスク要因を見る'}
        </button>
      )}
      {open && (
        <ul className="text-xs text-gray-600 space-y-0.5 pl-2">
          {r.riskFactors.map((f, i) => (
            <li key={i} className="before:content-['・']">{f}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

// ─── テーブル行（デスクトップ用） ──────────────────────

function ResidentRow({ r }: { r: MigrationRiskRecord }) {
  const [open, setOpen] = useState(false)
  const cfg = RANK_CONFIG[r.riskRank]

  return (
    <>
      <tr className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${cfg.row}`}>
        {/* 名前 */}
        <td className="px-3 py-2.5 text-sm font-medium text-gray-800">
          {r.name || '（名前なし）'}
        </td>

        {/* 相談日 */}
        <td className="px-3 py-2.5 text-xs text-gray-500">
          {r.consultDate || '—'}
        </td>

        {/* リスクスコア */}
        <td className="px-3 py-2.5">
          <ScoreBar score={r.riskScore} />
        </td>

        {/* ランク */}
        <td className="px-3 py-2.5">
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cfg.badge}`}>
            {cfg.label}
          </span>
        </td>

        {/* 世帯 */}
        <td className="px-3 py-2.5 text-xs text-gray-600">
          {r.householdType || '—'}
        </td>

        {/* 就業状況 */}
        <td className="px-3 py-2.5 text-xs text-gray-600">
          {r.occupation || '—'}
        </td>

        {/* ステータス */}
        <td className="px-3 py-2.5 text-xs text-gray-600">
          {r.status || '—'}
        </td>

        {/* 担当 */}
        <td className="px-3 py-2.5 text-xs text-gray-500">
          {r.staffName || '—'}
        </td>

        {/* リスク要因展開ボタン */}
        <td className="px-3 py-2.5">
          {r.riskFactors.length > 0 && (
            <button
              onClick={() => setOpen(v => !v)}
              className="text-xs text-blue-600 hover:underline whitespace-nowrap"
            >
              {open ? '▲ 閉じる' : '▼ 要因'}
            </button>
          )}
        </td>
      </tr>

      {/* リスク要因詳細行（展開時） */}
      {open && (
        <tr className={`border-b border-gray-100 ${cfg.row}`}>
          <td colSpan={9} className="px-6 pb-3">
            <ul className="text-xs text-gray-600 space-y-0.5 list-disc pl-4">
              {r.riskFactors.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  )
}

// ─── メインパネル ─────────────────────────────────────

export function MigrationRiskPanel() {
  const { municipalityId, municipality } = useMunicipality()
  const [data,    setData]    = useState<MigrationRiskResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  // API呼び出し
  async function fetchRisk() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gyosei/migration-risk?municipalityId=${municipalityId}`)
      const json = await res.json() as MigrationRiskResponse
      if (json.status === 'error') throw new Error(json.message)
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
    } finally {
      setLoading(false)
    }
  }

  // ── 初期状態（未取得） ─────────────────────────────
  if (!data && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🏡</div>
        <h1 className="text-2xl font-bold text-gray-800 mb-2">
          移住定着リスク AI
        </h1>
        <p className="text-gray-500 text-sm max-w-md mb-6">
          移住相談DBの各レコードに定着リスクスコアを算出します。<br />
          スコアが高い移住者を優先してフォローすることで、<br />
          早期離村を防ぎ、定住率を高めます。
        </p>
        <button
          onClick={fetchRisk}
          className="px-6 py-3 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700 transition-colors shadow"
        >
          📊 リスクスコアを分析する
        </button>
        {error && (
          error.includes('移住相談DBが設定されていません') ? (
            // 海士町専用機能のため、他の自治体では friendly メッセージを表示
            <div className="mt-6 bg-cyan-50 border border-cyan-200 rounded-xl p-6 text-center max-w-md">
              <p className="text-2xl mb-2">🏡</p>
              <p className="text-cyan-800 font-semibold mb-1">
                この機能は海士町（移住定着リスクAI）のデモ専用です
              </p>
              <p className="text-xs text-cyan-600">
                ヘッダーの自治体セレクターで「海士町」に切り替えると移住定着リスクデータを確認できます。
              </p>
            </div>
          ) : (
            <p className="mt-4 text-xs text-red-500">エラー: {error}</p>
          )
        )}
      </div>
    )
  }

  // ── ローディング ────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="text-4xl mb-3 animate-bounce">🏡</div>
        <p className="text-gray-600 text-sm font-medium">リスクスコアを算出中...</p>
        <p className="text-gray-400 text-xs mt-1">移住相談データを分析しています</p>
      </div>
    )
  }

  // ── データあり ─────────────────────────────────────
  if (!data) return null
  const { summary, records, aiRecommendations, municipal } = data

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6 space-y-5">

      {/* ── ヘッダー ─────────────────────────────── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-800">🏡 移住定着リスク AI</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {municipal} ／ 移住相談 {summary.total} 件分析
          </p>
        </div>
        <button
          onClick={fetchRisk}
          className="text-xs px-3 py-1.5 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
        >
          🔄 再分析
        </button>
      </div>

      {/* ── サマリーカード ───────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: '総件数',    value: summary.total,    color: 'text-gray-800', bg: 'bg-white' },
          { label: '要フォロー', value: summary.highRisk,  color: 'text-red-600',  bg: 'bg-red-50' },
          { label: '経過観察',  value: summary.midRisk,   color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: '安定',     value: summary.lowRisk,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: '定住確定',  value: summary.settled,  color: 'text-blue-600',  bg: 'bg-blue-50' },
          { label: '断念',     value: summary.dropped,  color: 'text-gray-600',  bg: 'bg-gray-100' },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`rounded-xl p-3 text-center shadow-sm ${bg}`}>
            <p className={`text-2xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* ── AI フォロー提言 ──────────────────────── */}
      {aiRecommendations.length > 0 && (
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-emerald-800 mb-3">
            🤖 AI フォロー提言（{municipal}向け）
          </h2>
          <div className="flex flex-col sm:flex-row gap-2">
            {aiRecommendations.map((rec, i) => (
              <div
                key={i}
                className="flex-1 bg-white rounded-lg p-3 text-xs text-gray-700 shadow-sm border border-emerald-100"
              >
                <span className="inline-block w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 text-center text-xs font-bold mr-1.5 leading-5">
                  {i + 1}
                </span>
                {rec}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── 移住者一覧（テーブル：デスクトップ） ── */}
      <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">
            移住者リスク一覧（リスク高い順）
          </h2>
          <p className="text-xs text-gray-400">{records.length} 件</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 border-b border-gray-100">
                <th className="px-3 py-2 text-left font-medium">相談者名</th>
                <th className="px-3 py-2 text-left font-medium">相談日</th>
                <th className="px-3 py-2 text-left font-medium">リスクスコア</th>
                <th className="px-3 py-2 text-left font-medium">ランク</th>
                <th className="px-3 py-2 text-left font-medium">世帯</th>
                <th className="px-3 py-2 text-left font-medium">就業</th>
                <th className="px-3 py-2 text-left font-medium">ステータス</th>
                <th className="px-3 py-2 text-left font-medium">担当</th>
                <th className="px-3 py-2 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <ResidentRow key={r.id} r={r} />
              ))}
              {records.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-8 text-center text-sm text-gray-400">
                    移住相談データがありません
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 移住者カード一覧（モバイル） ─────────── */}
      <div className="md:hidden space-y-3">
        <h2 className="text-sm font-semibold text-gray-700">
          移住者リスク一覧（リスク高い順）
        </h2>
        {records.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-6">
            移住相談データがありません
          </p>
        ) : (
          records.map(r => <ResidentCard key={r.id} r={r} />)
        )}
      </div>

      {/* ── フッター ──────────────────────────────── */}
      <p className="text-xs text-gray-400 text-center pb-4">
        リスクスコアは就業状況・世帯構成・補助金申請・進捗・動機の5要素で算出（0〜100点）
      </p>
    </div>
  )
}
