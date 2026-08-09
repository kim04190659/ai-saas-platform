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
//  ■ 技術ポイント
//    - すべて静的なモックデータ（useState はタブ切り替えのみに使用）
//    - fetch は一切行わない（＝本番データを壊す心配がない）
// =====================================================

import { useState, useEffect } from 'react'

// ── 仮の対象島リスト（沖縄35島のうち議論用に4島だけ例示） ──
// prefCode / cityCode は総務省の全国地方公共団体コード（RESAS APIの引数と共通）
const MOCK_ISLANDS = [
  { id: 'yakushima', name: '屋久島町', note: '検証フェーズ（実証中）', prefCode: 46, cityCode: '46505' },
  { id: 'ishigaki',  name: '石垣市',   note: '仮説：中核候補',         prefCode: 47, cityCode: '47207' },
  { id: 'yonaguni',  name: '与那国町', note: '仮説：小規模実証向き',   prefCode: 47, cityCode: '47382' },
  { id: 'zamami',    name: '座間味村', note: '仮説：小規模実証向き',   prefCode: 47, cityCode: '47354' },
]

// ── 仮のKPIカード（特定指標に固定しない、という設計方針を反映） ──
const MOCK_KPIS = [
  { key: 'population', label: '👪 人口推移',       value: '3,120人',   trend: '▼ 年-1.8%',  source: '人口データ連携（実データ）' },
  { key: 'fiscal',     label: '💰 財政健全度',     value: 'B（やや注意）', trend: '→ 横ばい',  source: '財政健全化エンジン（実データ）' },
  { key: 'industry',   label: '🏭 産業構成',       value: '観光62% / 一次産業23%', trend: '▲ 観光偏重進行', source: '仮説：未接続（要ヒアリング）' },
  { key: 'settlement', label: '🏡 移住者定着率',   value: '58%',       trend: '▼ 3年前比-6pt', source: '仮説：未接続（要ヒアリング）' },
]

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

// ── 仮の対策別AI予測（数値はすべてダミー。実装イメージのみ伝える） ──
const MOCK_PREDICTIONS = [
  { label: '何もしない場合', population: '5年後 約2,700人（-14%）', note: '現状トレンドの延長' },
  { label: '対策A：空き家改修補助を拡充', population: '5年後 約2,950人（-5%）', note: '移住者定着率の改善を仮定' },
  { label: '対策B：観光船寄港枠を拡大', population: '5年後 約2,850人（-9%）', note: '財政は改善、定住効果は限定的と仮定' },
]

// ── RESAS（地域経済分析システム）連携パネル ──
// /api/resas 経由で、選択中の島の「総人口推移」を取得して表示する。
// RESAS_API_KEY が未設定の環境では「未接続」と正直に表示する（ダミー値を実データのように見せない）。
interface ResasState {
  loading:      boolean
  available:    boolean
  reason?:      string
  series?:      Array<{ year: number; value: number }>
}

function ResasPanel({ prefCode, cityCode }: { prefCode: number; cityCode: string }) {
  const [state, setState] = useState<ResasState>({ loading: true, available: false })

  useEffect(() => {
    let cancelled = false
    // 島の切り替え時は呼び出し元で key={island.id} を渡してコンポーネントごと
    // 再マウントする方針にしているため、ここでは初期化のsetStateを行わない
    fetch(`/api/resas?prefCode=${prefCode}&cityCode=${cityCode}`)
      .then(res => res.json())
      .then(json => { if (!cancelled) setState({ loading: false, ...json }) })
      .catch(() => { if (!cancelled) setState({ loading: false, available: false, reason: '取得に失敗しました' }) })
    return () => { cancelled = true }
  }, [prefCode, cityCode])

  if (state.loading) {
    return <div className="ml-8 text-xs text-gray-400">📊 RESASデータ取得中...</div>
  }

  if (!state.available) {
    return (
      <div className="ml-8 border border-dashed border-gray-300 rounded-lg p-3 bg-gray-50 text-xs text-gray-500 leading-relaxed">
        📊 RESAS（地域経済分析システム）連携：
        {state.reason === 'RESAS_API_KEY未設定'
          ? 'APIキー未設定のため未接続です。'
          : `未接続（${state.reason ?? '不明なエラー'}）`}
        <br />
        無料の利用申請を
        <a className="text-teal-600 underline mx-1" href="https://opendata.resas-portal.go.jp/form.html" target="_blank" rel="noreferrer">
          RESAS APIポータル
        </a>
        で行い、取得したキーをVercelの環境変数 <code className="bg-gray-100 px-1 rounded">RESAS_API_KEY</code> に設定すると、この場所に実データ（総人口推移）が自動的に表示されます。
      </div>
    )
  }

  const max = Math.max(...(state.series ?? []).map(s => s.value), 1)
  return (
    <div className="ml-8 border border-gray-100 rounded-lg p-3 bg-gray-50">
      <div className="text-xs text-gray-500 mb-2">📊 RESAS 総人口推移（実データ・出典：地域経済分析システム）</div>
      <div className="flex items-end gap-3 h-20">
        {state.series?.map(s => (
          <div key={s.year} className="flex flex-col items-center gap-1">
            <div className="w-6 bg-teal-400 rounded-t" style={{ height: `${(s.value / max) * 64}px` }} />
            <span className="text-[10px] text-gray-400">{s.year}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

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

export default function AgreementVisionPage() {
  const [activeIsland, setActiveIsland] = useState(MOCK_ISLANDS[0].id)
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
        <SectionLabel no="①" title="共通ゴール・ダッシュボード" sub="「みんなが同じ方向を見ている」実感を最初に作る画面" />

        <div className="flex flex-wrap gap-2 mb-4 ml-8">
          {MOCK_ISLANDS.map(i => (
            <button
              key={i.id}
              onClick={() => setActiveIsland(i.id)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeIsland === i.id ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300'
              }`}
            >
              {i.name}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400 mb-3 ml-8">選択中：{island.name}（{island.note}）※島を切り替えても数値は変わりません（デモ用）</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 ml-8">
          {MOCK_KPIS.map(k => (
            <div key={k.key} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
              <div className="text-xs text-gray-500 mb-1">{k.label}</div>
              <div className="text-lg font-bold text-gray-800">{k.value}</div>
              <div className="text-xs text-gray-500">{k.trend}</div>
              <div className="text-[11px] text-gray-400 mt-1">出典：{k.source}</div>
            </div>
          ))}
        </div>

        <div className="mt-3">
          <ResasPanel key={island.id} prefCode={island.prefCode} cityCode={island.cityCode} />
        </div>
      </section>

      {/* ── 画面② 論点タイムライン + 意見整合ステータス ── */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <SectionLabel no="②" title="論点タイムライン + 意見整合ステータス" sub="Sprint #94（論点タイムライン）を、KPIバッジ付きで汎用化したイメージ" />
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
        <SectionLabel no="③" title="対策別AI予測（仮説・Phase2扱い）" sub="「対策を打った場合どうなるか」の簡易試算イメージ。根拠と不確実性を明記する前提" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 ml-8">
          {MOCK_PREDICTIONS.map(p => (
            <div key={p.label} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
              <div className="text-xs font-semibold text-gray-700 mb-1">{p.label}</div>
              <div className="text-sm font-bold text-gray-800">{p.population}</div>
              <div className="text-[11px] text-gray-400 mt-1">前提：{p.note}</div>
            </div>
          ))}
        </div>
        <p className="text-[11px] text-gray-400 mt-3 ml-8">※ 数値はすべてダミー。実装前に「断定しすぎない見せ方」を別途検討する。</p>
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
