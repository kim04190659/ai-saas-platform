'use client'
// =====================================================
//  src/app/(dashboard)/runwith/agreement/vision/page.tsx
//  意見整合プラットフォーム 画面イメージ案（仮説ベース・議論用モックアップ）
//
//  ■ このページの役割
//    実装ではなく「議論用のたたき台」。8/10 鯨本さんMTGで
//    「こんな画面を想定しているが合っているか」を確認するための
//    静的モックアップ。すべて仮のデータで、API・Notion DBには
//    一切接続していない。
//    詳細構想: https://app.notion.com/p/3b7960a91e2381bdae66fb57775a9c4f
//    画面案の元ネタ: https://app.notion.com/p/3b7960a91e2381cf9d37e9b0e1fbe071
//
//  ■ Sprint改訂（2026-08-09 追記）
//    単に数値カードを並べるだけでは「合意形成」にならない、という
//    フィードバックを受け、以下3点を追加した。
//    1. KPIを単一数値ではなく「過去〜将来予測」の折れ線グラフで見せる
//       （＝みんなが同じ推移を見ながら話せる状態を作る）
//    2. 複数島を同じ物差し（2010年=100の指数）で重ね描きする比較モード
//       （＝島ごとの立場の違いを、感情論ではなく同じグラフの上で話せる）
//    3. 「対策別AI予測」を、分岐する折れ線グラフとして見せる
//       （＝対策を選ぶことで未来がどう変わるかを、その場で比較できる）
//    グラフは外部ライブラリを追加せず、軽量な自前SVGコンポーネントで実装。
//
//  ■ 技術ポイント
//    - すべて静的なモックデータ（useState はタブ・トグル切り替えのみに使用）
//    - fetch は一切行わない（＝本番データを壊す心配がない）
// =====================================================

import { useState } from 'react'

// ── 仮の対象島リスト（沖縄35島のうち議論用に4島だけ例示） ──
// popSeries: 2010〜2025の人口推移（過去）、popProjection: 2025〜2035の「現状維持」予測（将来）
// 数値はすべて仮。実データはPopulationData DB（e-Stat等CSV取込）への接続を想定。
const MOCK_ISLANDS = [
  {
    id: 'yakushima', name: '屋久島町', note: '検証フェーズ（実証中）',
    popSeries:     [{ x: 2010, value: 4200 }, { x: 2015, value: 3900 }, { x: 2020, value: 3480 }, { x: 2025, value: 3120 }],
    popProjection: [{ x: 2025, value: 3120 }, { x: 2030, value: 2900 }, { x: 2035, value: 2700 }],
  },
  {
    id: 'ishigaki', name: '石垣市', note: '仮説：中核候補',
    popSeries:     [{ x: 2010, value: 47000 }, { x: 2015, value: 48000 }, { x: 2020, value: 49000 }, { x: 2025, value: 49600 }],
    popProjection: [{ x: 2025, value: 49600 }, { x: 2030, value: 50000 }, { x: 2035, value: 50200 }],
  },
  {
    id: 'yonaguni', name: '与那国町', note: '仮説：小規模実証向き',
    popSeries:     [{ x: 2010, value: 1700 }, { x: 2015, value: 1600 }, { x: 2020, value: 1500 }, { x: 2025, value: 1400 }],
    popProjection: [{ x: 2025, value: 1400 }, { x: 2030, value: 1250 }, { x: 2035, value: 1100 }],
  },
  {
    id: 'zamami', name: '座間味村', note: '仮説：小規模実証向き',
    popSeries:     [{ x: 2010, value: 950 }, { x: 2015, value: 900 }, { x: 2020, value: 830 }, { x: 2025, value: 780 }],
    popProjection: [{ x: 2025, value: 780 }, { x: 2030, value: 700 }, { x: 2035, value: 620 }],
  },
]

const ISLAND_COLOR: Record<string, string> = {
  yakushima: '#0d9488', // teal-600
  ishigaki:  '#2563eb', // blue-600
  yonaguni:  '#d97706', // amber-600
  zamami:    '#dc2626', // red-600
}

// ── 仮の財政健全度トレンド（特定KPIに固定しない設計方針の一例として、人口以外も1本だけ用意） ──
const MOCK_FISCAL_SERIES     = [{ x: 2018, value: 62 }, { x: 2020, value: 58 }, { x: 2022, value: 55 }, { x: 2025, value: 54 }]
const MOCK_FISCAL_PROJECTION = [{ x: 2025, value: 54 }, { x: 2030, value: 49 }]

// ── 仮の論点（Issue）データ。StanceBar のデモ用 ──
const MOCK_ISSUES = [
  {
    id: 'i1',
    title: '空き家を活用した移住者向け住宅整備',
    kpiTags: ['👪 人口推移', '🏡 移住者定着率'],
    total: 34,
    suppressed: false,
    byStance: { '賛成': 14, '条件付き賛成': 12, '保留': 5, '反対': 3 },
  },
  {
    id: 'i2',
    title: '観光船の寄港枠を増やすか、現状維持か',
    kpiTags: ['🏭 産業構成', '💰 財政健全度'],
    total: 12,
    suppressed: true,
    byStance: null,
  },
]

const STANCE_ORDER = ['賛成', '条件付き賛成', '保留', '反対']
const STANCE_COLOR: Record<string, string> = {
  '賛成':         'bg-green-400',
  '条件付き賛成': 'bg-yellow-400',
  '保留':         'bg-gray-300',
  '反対':         'bg-red-400',
}

function StanceBar({ byStance, total }: { byStance: Record<string, number>; total: number }) {
  return (
    <div className="space-y-1">
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
        {STANCE_ORDER.filter(s => (byStance[s] ?? 0) > 0).map(s => (
          <div key={s} className={STANCE_COLOR[s]} style={{ width: `${((byStance[s] ?? 0) / total) * 100}%` }} />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-gray-500">
        {STANCE_ORDER.filter(s => (byStance[s] ?? 0) > 0).map(s => (
          <span key={s}>
            <span className={`inline-block w-2 h-2 rounded-full mr-1 ${STANCE_COLOR[s]}`} />
            {s} {Math.round(((byStance[s] ?? 0) / total) * 100)}%
          </span>
        ))}
      </div>
    </div>
  )
}

// =====================================================
//  軽量SVG折れ線グラフ（外部ライブラリ不使用）
//  ・複数系列（series）を重ね描きできる
//  ・dashed: true の系列は破線（＝予測・仮説であることを視覚的に示す）
// =====================================================
interface ChartPoint  { x: number; value: number }
interface ChartSeries { label: string; color: string; points: ChartPoint[]; dashed?: boolean }

function LineChart({ series, height = 110, width = 320 }: { series: ChartSeries[]; height?: number; width?: number }) {
  const allPoints = series.flatMap(s => s.points)
  const xs = allPoints.map(p => p.x)
  const ys = allPoints.map(p => p.value)
  const minX = Math.min(...xs), maxX = Math.max(...xs)
  const minY = Math.min(...ys) * 0.95, maxY = Math.max(...ys) * 1.05
  const padL = 8, padR = 8, padB = 16, padT = 8

  const sx = (x: number) => padL + ((x - minX) / (maxX - minX || 1)) * (width - padL - padR)
  const sy = (v: number) => height - padB - ((v - minY) / (maxY - minY || 1)) * (height - padT - padB)

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" role="img" aria-label="推移グラフ">
      {/* 横のガイド線（最小・最大の目安） */}
      <line x1={padL} y1={height - padB} x2={width - padR} y2={height - padB} stroke="#e5e7eb" strokeWidth={1} />
      {series.map(s => {
        const path = s.points.map((p, i) => `${i === 0 ? 'M' : 'L'}${sx(p.x)},${sy(p.value)}`).join(' ')
        return (
          <g key={s.label}>
            <path d={path} fill="none" stroke={s.color} strokeWidth={2} strokeDasharray={s.dashed ? '4 3' : undefined} />
            {s.points.map(p => (
              <circle key={`${s.label}-${p.x}`} cx={sx(p.x)} cy={sy(p.value)} r={2.2} fill={s.color} />
            ))}
          </g>
        )
      })}
      <text x={sx(minX)} y={height - 2} fontSize="9" fill="#9ca3af">{minX}</text>
      <text x={sx(maxX)} y={height - 2} fontSize="9" fill="#9ca3af" textAnchor="end">{maxX}</text>
    </svg>
  )
}

function ChartLegend({ items }: { items: Array<{ label: string; color: string; dashed?: boolean }> }) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-500 mt-1">
      {items.map(it => (
        <span key={it.label} className="flex items-center gap-1">
          <span
            className="inline-block w-3 h-0.5"
            style={{ background: it.color, borderTop: it.dashed ? `1px dashed ${it.color}` : undefined }}
          />
          {it.label}
        </span>
      ))}
    </div>
  )
}

// 2010年=100とした指数に変換（規模の違う島どうしを同じ物差しで比較するため）
function toIndex(points: ChartPoint[]): ChartPoint[] {
  const base = points[0].value
  return points.map(p => ({ x: p.x, value: (p.value / base) * 100 }))
}

// ── 仮の対策別AI予測（分岐グラフ用）。数値は既存の静的カードと揃えてある ──
const SCENARIO_START = { x: 2026, value: 3120 }
const SCENARIO_SERIES: ChartSeries[] = [
  { label: '何もしない場合',              color: '#9ca3af', dashed: true,  points: [SCENARIO_START, { x: 2028, value: 3020 }, { x: 2031, value: 2700 }] },
  { label: '対策A：空き家改修補助を拡充', color: '#0d9488', dashed: false, points: [SCENARIO_START, { x: 2028, value: 3080 }, { x: 2031, value: 2950 }] },
  { label: '対策B：観光船寄港枠を拡大',   color: '#d97706', dashed: false, points: [SCENARIO_START, { x: 2028, value: 3040 }, { x: 2031, value: 2850 }] },
]

function SectionLabel({ no, title, sub }: { no: string; title: string; sub: string }) {
  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold bg-teal-600 text-white rounded-full w-6 h-6 flex items-center justify-center shrink-0">{no}</span>
        <h2 className="font-bold text-gray-800">{title}</h2>
      </div>
      <p className="text-xs text-gray-500 mt-1 ml-8">{sub}</p>
    </div>
  )
}

// RESAS（地域経済分析システム）は外部提供APIが2025年3月に終了しているため、
// 自動取得はできない。Webポータル自体は稼働中なので案内リンクのみ表示する。
function ResasLinkCard({ islandName }: { islandName: string }) {
  return (
    <div className="border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 text-xs text-gray-500 leading-relaxed">
      📊 RESAS（地域経済分析システム）：外部提供APIは2025年3月に終了したため自動表示はできません。
      Webポータル自体は稼働中のため、{islandName}の詳細は
      <a className="text-teal-600 underline mx-1" href="https://resas.go.jp/population-composition/" target="_blank" rel="noreferrer">
        RESAS 人口構成分析ページ
      </a>
      で対象自治体を手動選択して確認してください。
    </div>
  )
}

export default function AgreementVisionPage() {
  const [activeIsland, setActiveIsland] = useState(MOCK_ISLANDS[0].id)
  const [compareMode,  setCompareMode]  = useState(false)
  const island = MOCK_ISLANDS.find(i => i.id === activeIsland) ?? MOCK_ISLANDS[0]

  return (
    <div className="p-6 space-y-8 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">🗺️ 意見整合プラットフォーム 画面イメージ案</h1>
        <p className="text-sm text-gray-500 mt-1">仮説ベースの議論用モックアップ。8/10 鯨本さんMTGでのたたき台。</p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700 leading-relaxed">
        ⚠️ このページは<strong>実装ではありません</strong>。表示されているKPI・論点・予測値はすべてダミーデータで、Notion DB・APIには一切接続していません。
        「こういう画面があるとよいのでは」という仮説を、鯨本さんと議論するための叩き台です。
      </div>

      {/* ── 画面① 共通ゴール・ダッシュボード ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionLabel no="①" title="共通ゴール・ダッシュボード" sub="単なる数値ではなく「同じ推移を見ながら話す」ためのグラフ表示" />

        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 ml-8">
          <div className="flex flex-wrap gap-2">
            {MOCK_ISLANDS.map(i => (
              <button
                key={i.id}
                onClick={() => setActiveIsland(i.id)}
                disabled={compareMode}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 ${
                  activeIsland === i.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300'
                }`}
              >
                {i.name}
              </button>
            ))}
          </div>
          <button
            onClick={() => setCompareMode(v => !v)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
              compareMode ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-300'
            }`}
          >
            {compareMode ? '✕ 4島比較を終了' : '🔀 4島を同じ物差しで比較'}
          </button>
        </div>

        {compareMode ? (
          <div className="ml-8">
            <p className="text-xs text-gray-400 mb-2">
              人口規模が全く違う島どうしを比較できるよう、各島とも「2010年=100」とした指数に揃えて重ね描きしています。
            </p>
            <LineChart
              series={MOCK_ISLANDS.map(i => ({
                label: i.name,
                color: ISLAND_COLOR[i.id],
                points: toIndex(i.popSeries),
              }))}
            />
            <ChartLegend items={MOCK_ISLANDS.map(i => ({ label: `${i.name}（人口指数）`, color: ISLAND_COLOR[i.id] }))} />
          </div>
        ) : (
          <>
            <p className="text-xs text-gray-400 mb-3 ml-8">選択中：{island.name}（{island.note}）</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-8">
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">👪 人口推移（実線=実績・破線=現状維持シナリオ）</div>
                <LineChart
                  series={[
                    { label: '実績',       color: '#0d9488', points: island.popSeries },
                    { label: '現状維持予測', color: '#0d9488', dashed: true, points: island.popProjection },
                  ]}
                />
                <div className="text-[11px] text-gray-400 mt-1">出典：人口データ連携（実データ想定）・予測部分は仮</div>
              </div>
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">💰 財政健全度スコア（島共通の仮モデル・0〜100）</div>
                <LineChart
                  series={[
                    { label: '実績',       color: '#2563eb', points: MOCK_FISCAL_SERIES },
                    { label: '現状維持予測', color: '#2563eb', dashed: true, points: MOCK_FISCAL_PROJECTION },
                  ]}
                />
                <div className="text-[11px] text-gray-400 mt-1">出典：財政健全化エンジン（実データ連携済み）</div>
              </div>
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">🏭 産業構成</div>
                <div className="text-lg font-bold text-gray-800">観光62% / 一次産業23%</div>
                <div className="text-xs text-gray-500">▲ 観光偏重が進行（仮）</div>
                <div className="text-[11px] text-gray-400 mt-1">仮説：未接続（要ヒアリング。グラフ化は今後の課題）</div>
              </div>
              <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                <div className="text-xs text-gray-500 mb-1">🏡 移住者定着率</div>
                <div className="text-lg font-bold text-gray-800">58%</div>
                <div className="text-xs text-gray-500">▼ 3年前比-6pt（仮）</div>
                <div className="text-[11px] text-gray-400 mt-1">仮説：未接続（要ヒアリング。グラフ化は今後の課題）</div>
              </div>
            </div>

            <div className="mt-3 ml-8">
              <ResasLinkCard islandName={island.name} />
            </div>
          </>
        )}
      </section>

      {/* ── 画面② 論点タイムライン + 意見整合ステータス ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionLabel no="②" title="論点タイムライン + 意見整合ステータス" sub="論点ごとに「根拠となっているKPI」を明示し、意見と数字を同じ画面に置く" />
        <div className="space-y-3 ml-8">
          {MOCK_ISSUES.map(iss => (
            <div key={iss.id} className="border border-gray-100 rounded-lg p-4">
              <h3 className="font-bold text-gray-800 text-sm mb-2">{iss.title}</h3>
              <div className="flex flex-wrap gap-2 mb-3">
                {iss.kpiTags.map(t => (
                  <span key={t} className="text-[11px] bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{t}</span>
                ))}
              </div>
              {iss.suppressed || !iss.byStance ? (
                <div className="text-xs bg-gray-50 text-gray-400 rounded px-3 py-2">
                  🔒 データ収集中（{iss.total}件・20件集まるまで内訳は非公開です）
                </div>
              ) : (
                <StanceBar byStance={iss.byStance} total={iss.total} />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ── 画面③ 対策別AI予測（Phase2想定） ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionLabel no="③" title="対策別AI予測（仮説・Phase2扱い）" sub="対策ごとに未来がどう分岐するかを、1つのグラフの上で比較する" />
        <div className="ml-8">
          <div className="border border-gray-100 rounded-lg p-3 bg-gray-50">
            <LineChart series={SCENARIO_SERIES} height={140} />
            <ChartLegend items={SCENARIO_SERIES.map(s => ({ label: s.label, color: s.color, dashed: s.dashed }))} />
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            ※ 数値・分岐の形はすべてダミー。実装前に「断定しすぎない見せ方」（信頼区間の表現など）を別途検討する。
          </p>
        </div>
      </section>

      {/* ── 画面④ 政策提言サマリー出力 ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionLabel no="④" title="政策提言サマリー出力" sub="鯨本さんが県・自治体に説明する場で使う1枚サマリーのイメージ" />
        <div className="ml-8 border border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
          <div className="text-xs text-gray-400 mb-2">— サマリープレビュー（仮） —</div>
          <div className="text-sm font-bold text-gray-800 mb-1">{island.name}：空き家を活用した移住者向け住宅整備</div>
          <div className="text-xs text-gray-500 mb-2">関連KPI：👪 人口推移 / 🏡 移住者定着率</div>
          <div className="text-xs text-gray-600">住民意見（匿名集計・34件）：賛成41% / 条件付き賛成35% / 保留15% / 反対9%</div>
          <div className="text-xs text-gray-400 mt-2">出力形式（仮）：PDF／画面共有リンク　※未実装</div>
        </div>
      </section>

      <div className="text-xs text-gray-400 text-center">
        フィードバックはNotion「画面イメージ案（仮説ベース・沖縄MTG議論用）」ページに追記してください。
      </div>
    </div>
  )
}
