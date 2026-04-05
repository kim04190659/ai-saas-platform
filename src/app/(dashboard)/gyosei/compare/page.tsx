'use client'
// =====================================================
//  src/app/(dashboard)/gyosei/compare/page.tsx
//  類似自治体比較分析ページ — Sprint #18
//
//  ■ このページの役割
//    比較分析マスタ DB に登録された類似自治体のデータを
//    一覧・フィルタ・レーダーチャート風に表示し、
//    屋久島町と他自治体のベンチマーク比較を行う。
//
//  ■ 主な機能
//    - サマリーカード（総登録数/平均WBスコア/平均DXスコア/RunWith導入済み数）
//    - 地域タイプ・RunWith導入状況フィルタ
//    - 自治体カード一覧（主要産業バッジ・スコアバー）
//    - 新規登録フォーム（トグル形式）
//    - スコア比較バー（Well-BeingとDX成熟度を並列表示）
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// ─── 型定義 ──────────────────────────────────────────

/** 比較分析マスタ DB 1件の型 */
interface CompareRecord {
  id:             string
  name:           string
  prefecture:     string
  regionType:     string
  sizeCategory:   string
  population:     number | null
  elderlyRate:    number | null
  fiscalStrength: number | null
  industries:     string[]
  wellBeingScore: number | null
  dxScore:        number | null
  runwithStatus:  string
  source:         string
  notes:          string
  registeredDate: string
}

/** GET レスポンス全体の型 */
interface CompareResponse {
  records: CompareRecord[]
  summary: {
    total:            number
    byRegion:         Record<string, number>
    byRunWith:        Record<string, number>
    avgWellBeing:     number | null
    avgDXScore:       number | null
    avgWBIntroduced:  number | null
  }
}

// ─── 定数 ──────────────────────────────────────────

/** 地域タイプの選択肢 */
const REGION_TYPES = ['離島', '山間部', '農村', '都市近郊', '沿岸部']

/** 人口規模の選択肢 */
const SIZE_CATEGORIES = ['〜5千人', '5千〜1万人', '1万〜3万人', '3万〜10万人', '10万人以上']

/** 主要産業の選択肢 */
const INDUSTRIES = ['農業', '漁業', '林業', '観光', '製造業', '商業']

/** RunWith導入状況の選択肢 */
const RUNWITH_OPTIONS = ['導入済', '検討中', '未導入']

// ─── ヘルパーコンポーネント ──────────────────────────

/** RunWith導入状況バッジ */
function RunWithBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    '導入済':  'bg-violet-100 text-violet-700',
    '検討中':  'bg-amber-100  text-amber-700',
    '未導入':  'bg-gray-100   text-gray-500',
  }
  return (
    <span className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status || '—'}
    </span>
  )
}

/** スコアバー（0〜100 または任意の最大値で正規化） */
function ScoreBar({
  value,
  max = 100,
  color = 'bg-violet-500',
  label,
}: {
  value: number | null
  max?: number
  color?: string
  label: string
}) {
  if (value === null) {
    return <div className="text-xs text-gray-400">{label}: —</div>
  }
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className="mb-1">
      <div className="flex justify-between text-xs text-gray-500 mb-0.5">
        <span>{label}</span>
        <span className="font-semibold text-gray-700">{value}</span>
      </div>
      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-2 rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/** 主要産業チップ */
function IndustryChip({ name }: { name: string }) {
  const colorMap: Record<string, string> = {
    '農業':   'bg-green-100  text-green-700',
    '漁業':   'bg-blue-100   text-blue-700',
    '林業':   'bg-lime-100   text-lime-700',
    '観光':   'bg-pink-100   text-pink-700',
    '製造業': 'bg-gray-100   text-gray-600',
    '商業':   'bg-orange-100 text-orange-700',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colorMap[name] ?? 'bg-gray-100 text-gray-500'}`}>
      {name}
    </span>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function ComparePage() {
  // ── State ──
  const [data,          setData]          = useState<CompareResponse | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [filterRegion,  setFilterRegion]  = useState('')     // 地域タイプフィルタ
  const [filterRunWith, setFilterRunWith] = useState('')     // RunWith導入フィルタ
  const [showForm,      setShowForm]      = useState(false)  // 登録フォームの開閉
  const [submitting,    setSubmitting]    = useState(false)  // POST送信中フラグ
  const [submitMsg,     setSubmitMsg]     = useState('')     // 送信結果メッセージ

  // 登録フォームの入力値
  const [form, setForm] = useState({
    name:           '',
    prefecture:     '',
    regionType:     '',
    sizeCategory:   '',
    population:     '',
    elderlyRate:    '',
    fiscalStrength: '',
    industries:     [] as string[],
    wellBeingScore: '',
    dxScore:        '',
    runwithStatus:  '',
    source:         '',
    notes:          '',
    registeredDate: new Date().toISOString().slice(0, 10),
  })

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      // フィルタパラメータをURLに付与
      const params = new URLSearchParams()
      if (filterRegion)  params.set('regionType', filterRegion)
      if (filterRunWith) params.set('runwith', filterRunWith)
      const res  = await fetch(`/api/compare?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'データ取得エラー')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [filterRegion, filterRunWith])

  // フィルタ変更時・初回ロード時に再取得
  useEffect(() => { fetchData() }, [fetchData])

  // ── フォーム送信 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res  = await fetch('/api/compare', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          population:     form.population     ? Number(form.population)     : undefined,
          elderlyRate:    form.elderlyRate     ? Number(form.elderlyRate)    : undefined,
          fiscalStrength: form.fiscalStrength  ? Number(form.fiscalStrength) : undefined,
          wellBeingScore: form.wellBeingScore  ? Number(form.wellBeingScore) : undefined,
          dxScore:        form.dxScore         ? Number(form.dxScore)        : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '登録失敗')
      setSubmitMsg(json.message ?? '登録しました')
      // フォームリセット
      setForm({
        name: '', prefecture: '', regionType: '', sizeCategory: '',
        population: '', elderlyRate: '', fiscalStrength: '',
        industries: [], wellBeingScore: '', dxScore: '',
        runwithStatus: '', source: '', notes: '',
        registeredDate: new Date().toISOString().slice(0, 10),
      })
      setShowForm(false)
      // 一覧を再取得
      fetchData()
    } catch (e) {
      setSubmitMsg(`エラー: ${e instanceof Error ? e.message : '不明なエラー'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // ── 産業チェックボックスのトグル ──
  const toggleIndustry = (name: string) => {
    setForm(prev => ({
      ...prev,
      industries: prev.industries.includes(name)
        ? prev.industries.filter(i => i !== name)
        : [...prev.industries, name],
    }))
  }

  // ── レンダリング ──
  const records  = data?.records  ?? []
  const summary  = data?.summary

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🔍 類似自治体比較分析</h1>
          <p className="text-sm text-gray-500 mt-1">
            比較分析マスタ DB に登録された自治体のデータを一覧・比較します
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitMsg('') }}
          className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '✕ 閉じる' : '＋ 自治体を登録'}
        </button>
      </div>

      {/* ── エラー表示 ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
          ⚠️ {error}
        </div>
      )}

      {/* ── サマリーカード ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-violet-600">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-1">登録自治体数</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-blue-600">
              {summary.avgWellBeing ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">平均WB スコア</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">
              {summary.avgDXScore ?? '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">平均DX成熟度</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-pink-600">
              {summary.byRunWith?.['導入済'] ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">RunWith導入済み</div>
          </div>
        </div>
      )}

      {/* ── RunWith導入状況別ビジュアルバー ── */}
      {summary && Object.keys(summary.byRunWith).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">RunWith 導入状況の内訳</h2>
          <div className="flex gap-2 flex-wrap">
            {RUNWITH_OPTIONS.map(status => {
              const count = summary.byRunWith[status] ?? 0
              const total = summary.total || 1
              const pct   = Math.round((count / total) * 100)
              const colors: Record<string, string> = {
                '導入済':  'bg-violet-500',
                '検討中':  'bg-amber-400',
                '未導入':  'bg-gray-300',
              }
              return (
                <button
                  key={status}
                  onClick={() => setFilterRunWith(filterRunWith === status ? '' : status)}
                  className={`flex-1 min-w-[80px] rounded-lg p-3 text-center border-2 transition-colors ${
                    filterRunWith === status ? 'border-violet-500 bg-violet-50' : 'border-gray-100 hover:border-gray-200'
                  }`}
                >
                  <div className={`h-2 rounded-full mb-2 ${colors[status] ?? 'bg-gray-300'}`}
                    style={{ width: `${pct}%`, minWidth: '4px' }} />
                  <div className="text-lg font-bold text-gray-700">{count}</div>
                  <div className="text-xs text-gray-500">{status} ({pct}%)</div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── フィルターバー ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap gap-4 items-end">
          <div>
            <label className="block text-xs text-gray-500 mb-1">地域タイプで絞り込む</label>
            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべての地域タイプ</option>
              {REGION_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">RunWith導入状況で絞り込む</label>
            <select
              value={filterRunWith}
              onChange={e => setFilterRunWith(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべての導入状況</option>
              {RUNWITH_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          {(filterRegion || filterRunWith) && (
            <button
              onClick={() => { setFilterRegion(''); setFilterRunWith('') }}
              className="text-xs text-gray-400 hover:text-red-500 underline"
            >
              フィルタ解除
            </button>
          )}
          <div className="ml-auto text-xs text-gray-400">
            {loading ? '読み込み中...' : `${records.length} 件表示`}
          </div>
        </div>
      </div>

      {/* ── 登録フォーム（トグル） ── */}
      {showForm && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-violet-700 mb-4">📋 自治体データを新規登録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 自治体名・都道府県 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">自治体名 <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  required
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="例: 屋久島町"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">都道府県</label>
                <input
                  type="text"
                  value={form.prefecture}
                  onChange={e => setForm(p => ({ ...p, prefecture: e.target.value }))}
                  placeholder="例: 鹿児島県"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* 地域タイプ・人口規模 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">地域タイプ</label>
                <select
                  value={form.regionType}
                  onChange={e => setForm(p => ({ ...p, regionType: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {REGION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">人口規模</label>
                <select
                  value={form.sizeCategory}
                  onChange={e => setForm(p => ({ ...p, sizeCategory: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {SIZE_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 数値データ */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">総人口（人）</label>
                <input
                  type="number"
                  value={form.population}
                  onChange={e => setForm(p => ({ ...p, population: e.target.value }))}
                  placeholder="例: 12000"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">高齢化率（%）</label>
                <input
                  type="number"
                  step="0.1"
                  value={form.elderlyRate}
                  onChange={e => setForm(p => ({ ...p, elderlyRate: e.target.value }))}
                  placeholder="例: 38.5"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">財政力指数</label>
                <input
                  type="number"
                  step="0.001"
                  value={form.fiscalStrength}
                  onChange={e => setForm(p => ({ ...p, fiscalStrength: e.target.value }))}
                  placeholder="例: 0.142"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* スコア */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">Well-Beingスコア（0〜100）</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={form.wellBeingScore}
                  onChange={e => setForm(p => ({ ...p, wellBeingScore: e.target.value }))}
                  placeholder="例: 72.5"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">DX成熟度スコア（0〜100）</label>
                <input
                  type="number"
                  min="0" max="100"
                  value={form.dxScore}
                  onChange={e => setForm(p => ({ ...p, dxScore: e.target.value }))}
                  placeholder="例: 55.0"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* 主要産業（チェックボックス） */}
            <div>
              <label className="block text-xs text-gray-600 mb-2">主要産業（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map(ind => (
                  <label key={ind} className="flex items-center gap-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.industries.includes(ind)}
                      onChange={() => toggleIndustry(ind)}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700">{ind}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* RunWith導入状況 */}
            <div>
              <label className="block text-xs text-gray-600 mb-1">RunWith導入状況</label>
              <select
                value={form.runwithStatus}
                onChange={e => setForm(p => ({ ...p, runwithStatus: e.target.value }))}
                className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
              >
                <option value="">選択してください</option>
                {RUNWITH_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* 参照元・備考・登録日 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">参照元・出典</label>
                <input
                  type="text"
                  value={form.source}
                  onChange={e => setForm(p => ({ ...p, source: e.target.value }))}
                  placeholder="例: 総務省 住民基本台帳"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">登録日</label>
                <input
                  type="date"
                  value={form.registeredDate}
                  onChange={e => setForm(p => ({ ...p, registeredDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">備考</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                rows={2}
                placeholder="自由記入"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>

            {/* 送信ボタン・メッセージ */}
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-violet-600 hover:bg-violet-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? '登録中...' : '登録する'}
              </button>
              {submitMsg && (
                <p className={`text-sm ${submitMsg.startsWith('エラー') ? 'text-red-600' : 'text-green-600'}`}>
                  {submitMsg}
                </p>
              )}
            </div>
          </form>
        </div>
      )}

      {/* ── 自治体カード一覧 ── */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-2">🔍</div>
          <p>登録されたデータがありません。</p>
          <p className="text-sm mt-1">「自治体を登録」から追加してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow"
            >
              {/* カードヘッダー */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-gray-800 text-base">{r.name}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {r.prefecture}
                    {r.regionType && ` ｜ ${r.regionType}`}
                    {r.sizeCategory && ` ｜ ${r.sizeCategory}`}
                  </p>
                </div>
                <RunWithBadge status={r.runwithStatus} />
              </div>

              {/* 主要産業チップ */}
              {r.industries.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {r.industries.map(ind => <IndustryChip key={ind} name={ind} />)}
                </div>
              )}

              {/* スコアバー */}
              <div className="space-y-1">
                <ScoreBar
                  value={r.wellBeingScore}
                  label="Well-Beingスコア"
                  color="bg-violet-500"
                />
                <ScoreBar
                  value={r.dxScore}
                  label="DX成熟度スコア"
                  color="bg-emerald-500"
                />
              </div>

              {/* 数値データ */}
              <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500 border-t border-gray-100 pt-3">
                {r.population !== null && (
                  <span>人口: <strong className="text-gray-700">{r.population.toLocaleString()}人</strong></span>
                )}
                {r.elderlyRate !== null && (
                  <span>高齢化率: <strong className="text-gray-700">{r.elderlyRate}%</strong></span>
                )}
                {r.fiscalStrength !== null && (
                  <span>財政力指数: <strong className="text-gray-700">{r.fiscalStrength}</strong></span>
                )}
              </div>

              {/* 出典・備考 */}
              {(r.source || r.notes) && (
                <div className="mt-2 text-xs text-gray-400">
                  {r.source && <div>出典: {r.source}</div>}
                  {r.notes  && <div>備考: {r.notes}</div>}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
