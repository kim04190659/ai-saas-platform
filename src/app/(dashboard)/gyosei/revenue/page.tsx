'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/revenue/page.tsx
//  収益・財政データ分析ページ — Sprint #17
//
//  ■ このページの役割
//    ガイド記録・宿泊稼働・産品販売など地域の収益データを
//    Notionから取得して可視化する。町長・議会向けの財政状況把握と
//    AI顧問への Layer 3 RAG データ供給が目的。
//
//  ■ 機能概要
//    - サマリーカード: 総件数・AI示唆あり・平均基準比・最新記録
//    - 種別バーグラフ: データ種別ごとの件数
//    - AI示唆ハイライト: 「AI提言への示唆」が入ったデータを優先表示
//    - 全データ一覧テーブル: 数値・基準値比較・信頼度
//    - データ入力フォーム: 新しい収益データをNotionに登録
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── 型定義 ──────────────────────────────────────────

interface RevenueRecord {
  id:           string
  name:         string
  dataType:     string
  regionType:   string
  reliability:  string
  value:        number | null
  baseValue:    number | null
  unit:         string
  municipality: string
  period:       string
  aiHint:       string
  recordDate:   string
}

interface Summary {
  total:        number
  withAiHint:   number
  avgDeviation: number | null
  byType:       Record<string, number>
}

interface FormState {
  name:         string
  dataType:     string
  regionType:   string
  reliability:  string
  value:        string
  baseValue:    string
  unit:         string
  municipality: string
  period:       string
  aiHint:       string
  recordDate:   string
}

// ─── 定数 ────────────────────────────────────────────

const DATA_TYPES    = ['ガイド記録', '宿泊稼働', 'SNS感情', '産品販売', 'EC転換', '周遊パターン', '環境負荷', 'その他']
const REGION_TYPES  = ['タイプA:世界遺産・国立公園', 'タイプB:農林水産業', 'タイプC:温泉・文化観光', 'タイプD:工業・製造業', 'タイプE:医療・福祉']
const RELIABILITIES = ['高：実測値', '中：推計値', '低：参考値']

const DATA_TYPE_EMOJI: Record<string, string> = {
  'ガイド記録': '🧭', '宿泊稼働': '🏨', 'SNS感情': '📱',
  '産品販売': '🛒', 'EC転換': '💻', '周遊パターン': '🗺️',
  '環境負荷': '🌿', 'その他': '📊',
}

const INITIAL_FORM: FormState = {
  name: '', dataType: 'ガイド記録', regionType: 'タイプA:世界遺産・国立公園',
  reliability: '中：推計値', value: '', baseValue: '', unit: '',
  municipality: '', period: '', aiHint: '',
  recordDate: new Date().toISOString().split('T')[0],
}

// ─── ヘルパー ─────────────────────────────────────────

/** 基準値との乖離率を計算して色付き表示 */
function DeviationBadge({ value, base }: { value: number | null; base: number | null }) {
  if (value === null || base === null || base === 0) return <span className="text-slate-300">—</span>
  const pct = Math.round(((value - base) / base) * 100)
  const color = pct > 0 ? 'text-emerald-600' : pct < 0 ? 'text-red-500' : 'text-slate-500'
  return <span className={`text-xs font-bold ${color}`}>{pct > 0 ? '+' : ''}{pct}%</span>
}

/** 信頼度バッジ */
function ReliabilityBadge({ r }: { r: string }) {
  const style = r === '高：実測値' ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : r === '中：推計値' ? 'bg-amber-50 text-amber-700 border-amber-200'
              : 'bg-red-50 text-red-600 border-red-200'
  return (
    <span className={`inline-flex px-1.5 py-0.5 rounded text-xs border ${style}`}>
      {r === '高：実測値' ? '実測' : r === '中：推計値' ? '推計' : '参考'}
    </span>
  )
}

/** サマリーカード */
function SummaryCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function RevenuePage() {
  const [records,      setRecords]      = useState<RevenueRecord[]>([])
  const [hints,        setHints]        = useState<RevenueRecord[]>([])
  const [summary,      setSummary]      = useState<Summary | null>(null)
  const [form,         setForm]         = useState<FormState>(INITIAL_FORM)
  const [loading,      setLoading]      = useState(false)
  const [fetching,     setFetching]     = useState(true)
  const [message,      setMessage]      = useState<{ text: string; ok: boolean } | null>(null)
  const [showForm,     setShowForm]     = useState(false)
  const [filterType,   setFilterType]   = useState<string>('')

  const fetchData = useCallback(async () => {
    setFetching(true)
    try {
      const res  = await fetch('/api/revenue')
      const data = await res.json()
      if (!data.error) {
        setRecords(data.records ?? [])
        setSummary(data.summary ?? null)
        setHints(data.recentWithHint ?? [])
      }
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim()) {
      setMessage({ text: 'データ名を入力してください', ok: false })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      const res  = await fetch('/api/revenue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (data.error) {
        setMessage({ text: data.error, ok: false })
      } else {
        setMessage({ text: data.message, ok: true })
        setForm(INITIAL_FORM)
        setShowForm(false)
        await fetchData()
      }
    } catch {
      setMessage({ text: 'ネットワークエラー', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const setField = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm(prev => ({ ...prev, [k]: v }))

  // フィルタリング後のレコード
  const filtered = filterType ? records.filter(r => r.dataType === filterType) : records
  const maxByType = summary ? Math.max(...Object.values(summary.byType), 1) : 1

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── ヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                💰 収益・財政データ分析
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                観光・産品・宿泊など地域の収益データを記録・可視化し、AI顧問の分析に活用します
              </p>
            </div>
            <button
              onClick={() => setShowForm(!showForm)}
              className="shrink-0 px-4 py-2 rounded-xl bg-violet-600 text-white text-sm font-medium hover:bg-violet-700 transition-colors"
            >
              {showForm ? '✕ 閉じる' : '＋ データ登録'}
            </button>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
              📊 経営・政策 — Sprint #17
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-yellow-50 text-yellow-700 border border-yellow-200">
              💰 収益データ DB に蓄積
            </span>
          </div>
        </div>

        {/* ── サマリーカード ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon="📊" label="総データ件数" value={fetching ? '…' : summary?.total ?? 0} sub="件" color="bg-white border-slate-200 text-slate-700" />
          <SummaryCard icon="🤖" label="AI示唆あり" value={fetching ? '…' : summary?.withAiHint ?? 0} sub="件に提言メモ" color="bg-violet-50 border-violet-200 text-violet-700" />
          <SummaryCard
            icon="📈"
            label="平均基準値比"
            value={fetching ? '…' : summary?.avgDeviation !== null && summary?.avgDeviation !== undefined ? `${summary.avgDeviation > 0 ? '+' : ''}${summary.avgDeviation}%` : '—'}
            sub="比較基準値との乖離"
            color={
              (summary?.avgDeviation ?? 0) > 0
                ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                : (summary?.avgDeviation ?? 0) < 0
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-slate-200 text-slate-700'
            }
          />
          <SummaryCard icon="🗓️" label="データ種別数" value={fetching ? '…' : Object.keys(summary?.byType ?? {}).length} sub="種類" color="bg-sky-50 border-sky-200 text-sky-700" />
        </div>

        {/* ── 種別バーグラフ ── */}
        {summary && Object.keys(summary.byType).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">📊 データ種別の内訳</h2>
            <div className="space-y-2">
              {Object.entries(summary.byType).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? '' : type)}
                  className={`w-full flex items-center gap-3 text-left rounded-lg px-2 py-1 transition-colors ${filterType === type ? 'bg-violet-50' : 'hover:bg-slate-50'}`}
                >
                  <span className="w-28 text-xs text-slate-600 shrink-0">
                    {DATA_TYPE_EMOJI[type] ?? '📊'} {type}
                  </span>
                  <div className="flex-1 bg-slate-100 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${filterType === type ? 'bg-violet-500' : 'bg-violet-300'}`}
                      style={{ width: `${(count / maxByType) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-slate-500 w-5 text-right">{count}</span>
                </button>
              ))}
            </div>
            {filterType && (
              <p className="text-xs text-violet-600 mt-2">
                「{filterType}」でフィルタ中 —
                <button onClick={() => setFilterType('')} className="underline ml-1">解除</button>
              </p>
            )}
          </div>
        )}

        {/* ── AI示唆ハイライト ── */}
        {hints.length > 0 && (
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-violet-700 mb-3">
              🤖 AI提言への示唆（最新{hints.length}件）
            </h2>
            <div className="space-y-3">
              {hints.map(r => (
                <div key={r.id} className="bg-violet-50 rounded-xl p-3 border border-violet-100">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-semibold text-violet-700">{DATA_TYPE_EMOJI[r.dataType] ?? '📊'} {r.name}</span>
                    <span className="text-xs text-slate-400">{r.period}</span>
                    {r.value !== null && (
                      <span className="text-xs font-bold text-slate-600 ml-auto">
                        {r.value.toLocaleString()}{r.unit}
                        {' '}
                        <DeviationBadge value={r.value} base={r.baseValue} />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-violet-800 leading-relaxed">{r.aiHint}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── メッセージ ── */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            {message.ok ? '✅ ' : '❌ '}{message.text}
          </div>
        )}

        {/* ── 入力フォーム ── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-violet-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-4">📝 収益データを登録</h2>
            <form onSubmit={handleSubmit} className="space-y-4">

              {/* 行1: データ名 / 自治体名 / 記録日 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">データ名 <span className="text-red-400">*</span></label>
                  <input type="text" value={form.name} onChange={e => setField('name', e.target.value)}
                    placeholder="例: 観光客入込数 2026年Q1" required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">自治体名</label>
                  <input type="text" value={form.municipality} onChange={e => setField('municipality', e.target.value)}
                    placeholder="例: 屋久島町"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">記録日</label>
                  <input type="date" value={form.recordDate} onChange={e => setField('recordDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>

              {/* 行2: データ種別 / 地域タイプ / 記録期間 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">データ種別</label>
                  <select value={form.dataType} onChange={e => setField('dataType', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                    {DATA_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">地域タイプ</label>
                  <select value={form.regionType} onChange={e => setField('regionType', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                    {REGION_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">記録期間</label>
                  <input type="text" value={form.period} onChange={e => setField('period', e.target.value)}
                    placeholder="例: 2026年Q1、2025年度"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
              </div>

              {/* 行3: 数値 / 比較基準値 / 単位 / 信頼度 */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">数値</label>
                  <input type="number" value={form.value} onChange={e => setField('value', e.target.value)}
                    placeholder="例: 15000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">比較基準値</label>
                  <input type="number" value={form.baseValue} onChange={e => setField('baseValue', e.target.value)}
                    placeholder="例: 12000"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">単位</label>
                  <input type="text" value={form.unit} onChange={e => setField('unit', e.target.value)}
                    placeholder="例: 人、円、件"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">信頼度</label>
                  <select value={form.reliability} onChange={e => setField('reliability', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 bg-white">
                    {RELIABILITIES.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
              </div>

              {/* AI示唆メモ */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">AI提言への示唆（このデータが示す収益向上のヒント）</label>
                <textarea value={form.aiHint} onChange={e => setField('aiHint', e.target.value)}
                  placeholder="例: 観光客数が前年比+25%だが宿泊率は横ばい。日帰り客の宿泊転換施策が有効と考えられる。"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300 resize-none" />
              </div>

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl bg-violet-600 text-white font-medium text-sm hover:bg-violet-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed">
                {loading ? '登録中…' : '💾 Notionに登録する'}
              </button>
            </form>
          </div>
        )}

        {/* ── データ一覧テーブル ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            📋 収益データ一覧
            {filterType && <span className="ml-2 text-xs font-normal text-violet-600">「{filterType}」のみ表示</span>}
          </h2>

          {fetching ? (
            <p className="text-sm text-slate-400 text-center py-8">読み込み中…</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">💰</p>
              <p className="text-sm font-medium text-slate-600 mb-1">データがありません</p>
              <p className="text-xs text-slate-400">「＋ データ登録」から最初のデータを追加してください</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">データ名</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">種別</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">数値</th>
                    <th className="text-right py-2 px-2 text-xs font-medium text-slate-500">基準比</th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-slate-500">信頼度</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">期間</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, idx) => (
                    <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${idx % 2 === 0 ? '' : 'bg-slate-50/40'}`}>
                      <td className="py-2.5 px-2">
                        <div className="font-medium text-slate-700 text-xs">{r.name}</div>
                        {r.municipality && <div className="text-xs text-slate-400">{r.municipality}</div>}
                        {r.aiHint && <div className="text-xs text-violet-500 mt-0.5 truncate max-w-[200px]">💡 {r.aiHint}</div>}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-500">
                        {DATA_TYPE_EMOJI[r.dataType] ?? '📊'} {r.dataType}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        {r.value !== null
                          ? <span className="text-sm font-bold text-slate-700">{r.value.toLocaleString()}<span className="text-xs font-normal text-slate-400 ml-0.5">{r.unit}</span></span>
                          : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="py-2.5 px-2 text-right">
                        <DeviationBadge value={r.value} base={r.baseValue} />
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <ReliabilityBadge r={r.reliability} />
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-400">{r.period || r.recordDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── ガイドバナー ── */}
        <div className="bg-violet-50 rounded-2xl border border-violet-200 p-4">
          <p className="text-xs font-semibold text-violet-600 mb-2">📊 経営・政策ダッシュボードへの統合</p>
          <p className="text-sm text-violet-700 leading-relaxed">
            このデータはSprint #19で<strong>AI顧問 Layer 3</strong>に統合されます。
            財政データ・比較分析データとあわせて、AI顧問が「この自治体の収益はどう変化しているか」を
            文脈付きで分析・提言できるようになります。
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link href="/ai-advisor"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors border border-violet-200">
              🤖 AI顧問で分析する
            </Link>
            <Link href="/gyosei/dashboard"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 hover:bg-slate-50 transition-colors border border-slate-200">
              📊 ダッシュボードへ
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
