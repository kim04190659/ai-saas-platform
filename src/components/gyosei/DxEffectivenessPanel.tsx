'use client'
// =====================================================
//  src/components/gyosei/DxEffectivenessPanel.tsx
//  DX効果測定ダッシュボード — Sprint #60
//
//  ■ 表示内容
//    - 全体デジタル化率（大きなスコア + ゲージ）
//    - Claude Haiku 提言サマリー + TOP3施策
//    - カテゴリ別デジタル化率（棒グラフ風リスト）
//      改善余地「高」→「中」→「低」の順
//
//  ■ データソース: /api/gyosei/dx-effectiveness
// =====================================================

import { useState, useEffect } from 'react'
import { useMunicipality }     from '@/contexts/MunicipalityContext'
import type {
  DxEffectivenessResponse,
  DxServiceScore,
} from '@/app/api/gyosei/dx-effectiveness/route'

// ─── 改善余地バッジ ──────────────────────────────────

function PotentialBadge({ p }: { p: DxServiceScore['improvementPotential'] }) {
  const styles: Record<string, string> = {
    '高': 'bg-red-100 text-red-700',
    '中': 'bg-yellow-100 text-yellow-700',
    '低': 'bg-green-100 text-green-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${styles[p] ?? 'bg-gray-100 text-gray-500'}`}>
      改善余地: {p}
    </span>
  )
}

// ─── カテゴリ別デジタル化率バー ─────────────────────

function ServiceBar({ s }: { s: DxServiceScore }) {
  // デジタル化率に応じてバーの色を変える
  const barColor =
    s.digitalRate < 30 ? 'bg-red-400'    :
    s.digitalRate < 60 ? 'bg-yellow-400' :
                         'bg-green-400'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition-colors">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-gray-800 text-sm">{s.category}</span>
          <PotentialBadge p={s.improvementPotential} />
        </div>
        <span className="text-lg font-bold text-gray-700">{s.digitalRate}%</span>
      </div>

      {/* デジタル化率バー */}
      <div className="relative h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${s.digitalRate}%` }}
        />
      </div>

      {/* チャネル内訳 */}
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>💬 デジタル {s.digitalCount}件</span>
        <span>📞 アナログ {s.analogCount}件</span>
        <span>合計 {s.total}件</span>
      </div>
    </div>
  )
}

// ─── 全体スコアゲージ ─────────────────────────────────

function OverallScore({ score, digital, total }: { score: number; digital: number; total: number }) {
  const color =
    score < 30 ? 'text-red-600'    :
    score < 60 ? 'text-yellow-600' :
                 'text-green-600'

  return (
    <div className="bg-white rounded-xl border border-violet-200 p-6 text-center">
      <p className="text-sm text-gray-500 mb-1">全体デジタル化率</p>
      <p className={`text-6xl font-bold ${color}`}>{score}%</p>
      <div className="mt-3 relative h-3 bg-gray-100 rounded-full overflow-hidden mx-auto max-w-xs">
        <div
          className={`absolute left-0 top-0 h-full rounded-full transition-all ${
            score < 30 ? 'bg-red-400' : score < 60 ? 'bg-yellow-400' : 'bg-green-400'
          }`}
          style={{ width: `${score}%` }}
        />
      </div>
      <p className="text-xs text-gray-400 mt-2">
        {digital}件 / {total}件が LINE・Web などデジタルチャネル経由
      </p>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export function DxEffectivenessPanel() {
  const { municipalityId } = useMunicipality()
  const [data,    setData]    = useState<DxEffectivenessResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/gyosei/dx-effectiveness?municipalityId=${municipalityId}`)
      .then(r => r.json())
      .then((json: DxEffectivenessResponse) => {
        if (json.status !== 'success') throw new Error(json.message ?? 'データ取得失敗')
        setData(json)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [municipalityId])

  // ── ローディング ────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-violet-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">DX効果データを分析中…</p>
        </div>
      </div>
    )
  }

  // ── エラー ──────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <p className="text-red-700 font-semibold">⚠ データ取得エラー</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) return null

  // 改善余地「高」→「中」→「低」の順にソート
  const sortedServices = [...data.services].sort((a, b) => {
    const rank = { '高': 0, '中': 1, '低': 2 }
    return (rank[a.improvementPotential] ?? 9) - (rank[b.improvementPotential] ?? 9)
  })

  const highCount = data.services.filter(s => s.improvementPotential === '高').length
  const midCount  = data.services.filter(s => s.improvementPotential === '中').length

  return (
    <div className="space-y-6 p-4">

      {/* ── ヘッダー ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-700 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold">🔍 DX効果測定ダッシュボード</h1>
        <p className="text-violet-100 text-sm mt-1">
          {data.municipal} — 住民相談チャネル分析で「どこをデジタル化すると最も効果的か」を特定
        </p>
      </div>

      {/* ── 全体スコア + サマリーカード ─────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-1">
          <OverallScore
            score={data.overallDxScore}
            digital={data.digitalContacts}
            total={data.totalContacts}
          />
        </div>
        <div className="md:col-span-2 grid grid-cols-2 gap-4">
          {/* 改善余地「高」件数 */}
          <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
            <p className="text-3xl font-bold text-red-600">{highCount}</p>
            <p className="text-xs text-gray-500 mt-1">改善余地「高」カテゴリ</p>
            <p className="text-xs text-red-500 mt-1">デジタル化率 30%未満</p>
          </div>
          {/* 改善余地「中」件数 */}
          <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
            <p className="text-3xl font-bold text-yellow-600">{midCount}</p>
            <p className="text-xs text-gray-500 mt-1">改善余地「中」カテゴリ</p>
            <p className="text-xs text-yellow-500 mt-1">デジタル化率 30〜60%</p>
          </div>
          {/* 相談総数 */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-3xl font-bold text-gray-700">{data.totalContacts}</p>
            <p className="text-xs text-gray-500 mt-1">分析対象 相談総数</p>
          </div>
          {/* デジタル相談数 */}
          <div className="bg-violet-50 rounded-xl border border-violet-200 p-4 text-center">
            <p className="text-3xl font-bold text-violet-700">{data.digitalContacts}</p>
            <p className="text-xs text-gray-500 mt-1">デジタルチャネル相談数</p>
          </div>
        </div>
      </div>

      {/* ── Claude Haiku 提言 ────────────────────────── */}
      {(data.summary || data.topRecommendations.length > 0) && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
          <h2 className="font-bold text-violet-800 mb-3 flex items-center gap-2">
            <span>🤖</span> AI優先DX施策提言
          </h2>
          {data.summary && (
            <p className="text-sm text-gray-700 mb-3">{data.summary}</p>
          )}
          {data.topRecommendations.length > 0 && (
            <div className="space-y-2">
              {data.topRecommendations.map((rec, i) => (
                <div key={i} className="flex items-start gap-2 bg-white rounded-lg p-3 border border-violet-100">
                  <span className="text-violet-600 font-bold text-sm min-w-[24px]">
                    {['①', '②', '③'][i]}
                  </span>
                  <p className="text-sm text-gray-800">{rec}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── カテゴリ別分析 ──────────────────────────── */}
      {sortedServices.length > 0 ? (
        <div>
          <h2 className="font-bold text-gray-800 mb-3">
            📊 カテゴリ別 デジタル化率（改善余地の高い順）
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sortedServices.map(s => (
              <ServiceBar key={s.category} s={s} />
            ))}
          </div>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <p className="text-2xl mb-2">📭</p>
          <p>住民相談データが取得できませんでした</p>
          <p className="text-sm mt-1">Notionの住民相談DBにデータを追加してください</p>
        </div>
      )}

      {/* ── 計測方法の説明 ──────────────────────────── */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs text-gray-500">
        <p className="font-semibold text-gray-600 mb-1">📌 デジタル化率の算出方法</p>
        <p>住民相談DBの「チャネル」フィールドを分析。
          LINE・Web・メール・アプリ経由をデジタル、窓口・電話・来庁をアナログと分類。
          カテゴリ別のデジタル比率が低いほど「デジタル化で改善できる余地が大きい」と判断します。</p>
      </div>
    </div>
  )
}
