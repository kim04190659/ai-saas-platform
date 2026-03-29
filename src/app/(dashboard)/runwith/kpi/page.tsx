'use client'

// =====================================================
//  src/app/(dashboard)/runwith/kpi/page.tsx
//  運用KPIダッシュボード
//
//  ■ このページの役割
//    Notionに蓄積されたデータをグラフで「見える化」する。
//    Sprint #9（AI Well-Being顧問）と合わせることで、
//    「左で蓄積 → グラフで確認 → AIで分析」の左右連動デモが完成する。
//
//  ■ 表示内容
//    - KPIサマリーカード（4枚）
//    - IT成熟度 5領域レーダーチャート（SVGで自前実装）
//    - スコア推移バー（最新10件の記録）
//    - 最新学習ログ一覧
// =====================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import type { KpiResponse } from '@/app/api/kpi/route'

// ─── SDL / IT成熟度の5領域定義 ────────────────────────

/**
 * IT成熟度の5領域
 * レーダーチャートの各頂点に対応する
 */
const MATURITY_AXES = [
  { key: 'incident',   label: 'インシデント\n管理', color: '#7c3aed' },
  { key: 'change',     label: '変更\n管理',         color: '#2563eb' },
  { key: 'monitoring', label: '監視',               color: '#059669' },
  { key: 'document',   label: 'ドキュメント\n管理', color: '#d97706' },
  { key: 'security',   label: 'セキュリティ',       color: '#dc2626' },
] as const

// ─── レーダーチャートコンポーネント（純SVG実装）─────────

/**
 * 5軸レーダーチャート
 * @param scores - 各軸のスコア（0〜100）
 */
function RadarChart({ scores }: { scores: Record<string, number> }) {
  const cx = 130, cy = 130, r = 95 // 中心座標とオuter半径

  /**
   * 角度とradiusから(x, y)座標を計算する
   * 角度は度数法。正五角形を上頂点から時計回りに配置するため -90° を基準にする
   */
  const point = (angleDeg: number, radius: number) => {
    const rad = (angleDeg * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  // 5軸の基準角度（-90°スタートで72°ずつ時計回り）
  const angles = MATURITY_AXES.map((_, i) => -90 + i * 72)

  // グリッド多角形の頂点座標（20%, 40%, 60%, 80%, 100%の5段階）
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0]
  const gridPolygons = gridLevels.map(level =>
    angles.map(a => {
      const p = point(a, r * level)
      return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
    }).join(' ')
  )

  // 実データの多角形頂点（スコアを0〜1に正規化）
  const dataPolygon = MATURITY_AXES.map((axis, i) => {
    const score = (scores[axis.key] ?? 0) / 100
    const p = point(angles[i], r * score)
    return `${p.x.toFixed(1)},${p.y.toFixed(1)}`
  }).join(' ')

  // 各頂点のデータ点
  const dataCircles = MATURITY_AXES.map((axis, i) => {
    const score = (scores[axis.key] ?? 0) / 100
    return point(angles[i], r * score)
  })

  // ラベル位置（外側に少し出す）
  const labelPositions = angles.map((a, i) => {
    const p = point(a, r + 22)
    return { ...p, label: MATURITY_AXES[i].label }
  })

  return (
    <svg viewBox="0 0 260 260" className="w-full max-w-[280px] mx-auto">
      {/* ── グリッド多角形（薄いグレー） ── */}
      {gridPolygons.map((pts, i) => (
        <polygon
          key={i}
          points={pts}
          fill="none"
          stroke="#e2e8f0"
          strokeWidth={i === 4 ? 1.5 : 1}
        />
      ))}

      {/* ── 軸の線（中心から各頂点へ） ── */}
      {angles.map((a, i) => {
        const outer = point(a, r)
        return (
          <line
            key={i}
            x1={cx} y1={cy}
            x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
        )
      })}

      {/* ── グリッドの%ラベル（最内と最外のみ） ── */}
      {[0.4, 1.0].map((level, i) => {
        const p = point(-90, r * level)
        return (
          <text
            key={i}
            x={p.x + 4} y={p.y}
            fontSize="9"
            fill="#94a3b8"
            dominantBaseline="middle"
          >
            {level * 100}
          </text>
        )
      })}

      {/* ── データ領域（紫の半透明） ── */}
      <polygon
        points={dataPolygon}
        fill="rgba(124, 58, 237, 0.12)"
        stroke="rgb(124, 58, 237)"
        strokeWidth="2"
        strokeLinejoin="round"
      />

      {/* ── データ点（各軸の値を丸で表示） ── */}
      {dataCircles.map((p, i) => (
        <circle
          key={i}
          cx={p.x.toFixed(1)}
          cy={p.y.toFixed(1)}
          r="5"
          fill="rgb(124, 58, 237)"
          stroke="white"
          strokeWidth="1.5"
        />
      ))}

      {/* ── 軸ラベル（折り返し対応） ── */}
      {labelPositions.map((l, i) => {
        const lines = l.label.split('\n')
        return (
          <text
            key={i}
            x={l.x.toFixed(1)}
            y={l.y.toFixed(1)}
            textAnchor="middle"
            fontSize="10"
            fill="#475569"
            fontWeight="600"
          >
            {lines.map((line, j) => (
              <tspan
                key={j}
                x={l.x.toFixed(1)}
                dy={j === 0 ? (lines.length > 1 ? '-0.5em' : '0') : '1.2em'}
              >
                {line}
              </tspan>
            ))}
          </text>
        )
      })}
    </svg>
  )
}

// ─── スコアバーコンポーネント ────────────────────────────

/** 1件のスコアをバーグラフで表示 */
function ScoreBar({
  label, score, maxScore, type, date,
}: {
  label: string; score: number; maxScore: number; type: string; date: string
}) {
  const pct = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0
  const color = pct >= 70 ? 'bg-emerald-500' : pct >= 40 ? 'bg-amber-400' : 'bg-red-400'
  const dateStr = date ? new Date(date).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' }) : ''

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-32 flex-shrink-0">
        <p className="text-xs font-medium text-slate-700 truncate">{label || '（タイトルなし）'}</p>
        <p className="text-[10px] text-slate-400">{type} {dateStr && `· ${dateStr}`}</p>
      </div>
      <div className="flex-1 bg-slate-100 rounded-full h-2.5">
        <div
          className={`${color} h-2.5 rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-600 w-10 text-right">{pct}%</span>
    </div>
  )
}

// ─── KPIカードコンポーネント ─────────────────────────────

/** サマリー数値を1枚のカードで表示 */
function KpiCard({
  emoji, label, value, unit, sub, colorClass,
}: {
  emoji: string; label: string; value: number | string; unit: string; sub: string; colorClass: string
}) {
  return (
    <div className={`bg-white rounded-2xl border shadow-sm p-4 ${colorClass}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold text-slate-500">{label}</p>
          <p className="text-2xl font-bold text-slate-800 mt-1">
            {value}<span className="text-sm font-normal text-slate-500 ml-1">{unit}</span>
          </p>
          <p className="text-xs text-slate-400 mt-1">{sub}</p>
        </div>
        <span className="text-2xl">{emoji}</span>
      </div>
    </div>
  )
}

// ─── メインページコンポーネント ───────────────────────────

export default function KpiDashboardPage() {
  // KPIデータの状態管理
  const [data, setData] = useState<KpiResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ページ表示時にAPIからデータ取得
  useEffect(() => {
    fetch('/api/kpi')
      .then(res => {
        if (!res.ok) throw new Error('データ取得に失敗しました')
        return res.json()
      })
      .then(setData)
      .catch(e => setError(e.message))
      .finally(() => setIsLoading(false))
  }, [])

  // ─── ローディング表示 ──────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-slate-500">Notionからデータを取得中…</p>
        </div>
      </div>
    )
  }

  // ─── エラー表示 ────────────────────────────────────────
  if (error || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="bg-white rounded-2xl border border-red-200 p-6 text-center max-w-sm">
          <p className="text-2xl mb-2">⚠️</p>
          <p className="text-sm font-semibold text-red-600">データ取得エラー</p>
          <p className="text-xs text-slate-500 mt-1">{error}</p>
        </div>
      </div>
    )
  }

  const { summary, platformRecords, learningLogs } = data

  // スコアがあるレコードをバーグラフ用に絞り込む
  const scoredRecords = platformRecords.filter(r => r.score !== null && r.maxScore !== null)

  // ─── メインレンダリング ────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                📈 運用KPIダッシュボード
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                蓄積データを見える化し、AI Well-Being顧問による分析と合わせて活用してください
              </p>
            </div>
            {/* AI顧問へのリンクボタン */}
            <Link
              href="/ai-advisor"
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors"
            >
              🤖 このデータをAIに分析させる
            </Link>
          </div>
        </div>

        {/* ── KPIサマリーカード（4枚） ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            emoji="📋"
            label="記録総数"
            value={summary.totalPlatformRecords}
            unit="件"
            sub="プラットフォーム記録"
            colorClass="border-slate-200"
          />
          <KpiCard
            emoji="🎮"
            label="学習セッション"
            value={summary.totalLearningLogs}
            unit="回"
            sub="カードゲーム累計"
            colorClass="border-sky-200"
          />
          <KpiCard
            emoji="🏅"
            label="平均成熟度スコア"
            value={summary.avgMaturityScore || '—'}
            unit={summary.avgMaturityScore ? '%' : ''}
            sub={summary.avgMaturityScore ? 'IT運用診断結果' : 'まだ診断データがありません'}
            colorClass="border-orange-200"
          />
          <KpiCard
            emoji="⭐"
            label="平均学習スコア"
            value={summary.avgGameScore || '—'}
            unit={summary.avgGameScore ? 'pt' : ''}
            sub={summary.avgGameScore ? 'ゲーム学習累計' : 'まだゲームデータがありません'}
            colorClass="border-purple-200"
          />
        </div>

        {/* ── 中段：レーダーチャート + スコア推移 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

          {/* IT成熟度レーダーチャート */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-1">
              🕸️ IT運用成熟度 5領域
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              RunWith診断データを5領域にマッピングしたスコア
            </p>

            {/* レーダーチャート本体 */}
            <RadarChart scores={summary.maturityAxes} />

            {/* 凡例 */}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 justify-center">
              {MATURITY_AXES.map(axis => (
                <div key={axis.key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-purple-600" />
                  <span className="text-[10px] text-slate-500">
                    {axis.label.replace('\n', '')}
                    <span className="font-bold ml-1 text-slate-700">
                      {summary.maturityAxes[axis.key]}
                    </span>
                  </span>
                </div>
              ))}
            </div>

            {/* データが少ない場合の案内 */}
            {summary.totalPlatformRecords < 3 && (
              <p className="text-[10px] text-slate-400 text-center mt-3">
                ※ IT運用成熟度診断を実施するとスコアが更新されます
              </p>
            )}
          </div>

          {/* スコア推移バーグラフ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-1">
              📊 最新スコア履歴
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              プラットフォーム記録の直近{scoredRecords.length}件
            </p>

            {scoredRecords.length > 0 ? (
              <div className="space-y-0.5 overflow-y-auto max-h-64">
                {scoredRecords.map((r, i) => (
                  <ScoreBar
                    key={i}
                    label={r.title}
                    score={r.score!}
                    maxScore={r.maxScore!}
                    type={r.type}
                    date={r.createdAt}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-40 text-slate-400">
                <p className="text-3xl mb-2">📭</p>
                <p className="text-xs">まだスコアデータがありません</p>
                <p className="text-[10px] mt-1">IT運用成熟度診断を実施してください</p>
              </div>
            )}
          </div>
        </div>

        {/* ── 学習ログ一覧 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-1">
            📚 最新学習ログ（カードゲーム）
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            エクセレントサービスゲームの直近{learningLogs.length}件
          </p>

          {learningLogs.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-slate-500 font-semibold">セッション名</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-semibold">種別</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-semibold">職員</th>
                    <th className="text-right py-2 px-2 text-slate-500 font-semibold">スコア</th>
                    <th className="text-left py-2 px-2 text-slate-500 font-semibold">AIフィードバック</th>
                  </tr>
                </thead>
                <tbody>
                  {learningLogs.map((log, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50">
                      <td className="py-2 px-2 font-medium text-slate-700 max-w-[120px] truncate">
                        {log.session || '—'}
                      </td>
                      <td className="py-2 px-2">
                        <span className="px-2 py-0.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200">
                          {log.gameType || '—'}
                        </span>
                      </td>
                      <td className="py-2 px-2 text-slate-500">
                        {log.staff || '—'}{log.dept ? ` / ${log.dept}` : ''}
                      </td>
                      <td className="py-2 px-2 text-right font-bold text-slate-700">
                        {log.score !== null ? log.score : '—'}
                      </td>
                      <td className="py-2 px-2 text-slate-400 max-w-[200px] truncate">
                        {log.feedback || '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-24 text-slate-400">
              <p className="text-2xl mb-1">🃏</p>
              <p className="text-xs">まだゲームの学習ログがありません</p>
            </div>
          )}
        </div>

        {/* ── フッター：AI顧問へ誘導 ── */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4 flex items-center justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-bold text-purple-800">
              🤖 このデータをAIに深掘りしてもらいましょう
            </p>
            <p className="text-xs text-purple-600 mt-0.5">
              AI Well-Being顧問が蓄積データを読み込み、自治体固有の改善提言を作成します
            </p>
          </div>
          <Link
            href="/ai-advisor"
            className="px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-xl hover:bg-purple-700 transition-colors whitespace-nowrap"
          >
            AI顧問に聞く →
          </Link>
        </div>

      </div>
    </div>
  )
}
