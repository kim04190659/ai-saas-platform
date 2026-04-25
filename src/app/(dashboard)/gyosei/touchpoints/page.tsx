'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/touchpoints/page.tsx
//  タッチポイントイベント 記録・閲覧ページ — Sprint #16
//
//  ■ このページの役割
//    窓口・電話・訪問など職員と住民の接点（タッチポイント）を記録し、
//    SDL価値共創スコアで見える化する。
//    蓄積データは AI顧問の RAG データとして活用される。
//
//  ■ 機能概要
//    - サマリーカード: 総件数・今月・平均SDL・継続意向「高」率
//    - 種別バーグラフ: タッチポイント種別ごとの件数（CSS バー）
//    - 入力フォーム: タッチポイントの詳細を入力してNotionに記録
//    - 一覧テーブル: 記録済みタッチポイントの一覧表示
//
//  ■ 技術ポイント
//    - GET /api/touchpoints で一覧取得
//    - POST /api/touchpoints で新規登録
//    - SDL価値共創スコアはサーバー側で自動計算
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useMunicipality } from '@/contexts/MunicipalityContext'

// ─── 型定義 ──────────────────────────────────────────

/** タッチポイント1件の型（APIレスポンス） */
interface TouchpointRecord {
  id:                 string
  eventId:            string
  touchpointType:     string
  visitorAttribute:   string
  visitorAge:         string
  purposeCategory:    string
  continuationIntent: string
  problemBefore:      number
  problemAfter:       number
  contactMinutes:     number
  sdlScore:           number
  department:         string
  municipalityName:   string
  aiMemo:             string
  recordDate:         string
}

/** サマリー統計の型 */
interface Summary {
  total:            number
  thisMonthCount:   number
  avgSDL:           number
  highIntentCount:  number
  byType:           Record<string, number>
}

/** フォームの入力状態の型 */
interface FormState {
  eventId:            string
  touchpointType:     string
  visitorAttribute:   string
  visitorAge:         string
  purposeCategory:    string
  continuationIntent: string
  problemBefore:      number
  problemAfter:       number
  contactMinutes:     number
  department:         string
  municipalityName:   string
  aiMemo:             string
  recordDate:         string
}

// ─── 定数・設定 ──────────────────────────────────────

const TOUCHPOINT_TYPES = [
  '窓口来訪', '電話相談', 'イベント参加', 'SNS接触', 'アウトリーチ訪問', 'オンライン手続き', 'カードゲーム参加'
]
const VISITOR_ATTRIBUTES = [
  '住民（定住）', '住民（移住者）', '観光来訪者', '関係人口', '事業者', 'その他'
]
const VISITOR_AGES = ['10代以下', '20代', '30代', '40代', '50代', '60代以上', '不明']
const PURPOSE_CATEGORIES = [
  '生活手続き', '福祉・介護相談', '観光情報収集', '移住相談', '産業・就労', '子育て教育', '地域活動'
]
const CONTINUATION_INTENTS = ['高（また来る）', '中（様子見）', '低（一度限り）', '紹介あり']
const DEPARTMENTS = ['政策推進課', '観光まちづくり課', '住民福祉課', '総務課', '産業振興課', '教育委員会']

/** 課題解決度ラベル */
const PROBLEM_AFTER_LABELS = ['未解決', '部分解決', '完全解決', '次ステップへ繋げた']

/** フォーム初期値 */
const INITIAL_FORM: FormState = {
  eventId:            '',
  touchpointType:     '窓口来訪',
  visitorAttribute:   '住民（定住）',
  visitorAge:         '不明',
  purposeCategory:    '生活手続き',
  continuationIntent: '中（様子見）',
  problemBefore:      2,
  problemAfter:       2,
  contactMinutes:     15,
  department:         '',
  municipalityName:   '',
  aiMemo:             '',
  recordDate:         new Date().toISOString().split('T')[0],
}

// ─── ヘルパー関数 ─────────────────────────────────────

/** SDL スコアのバッジスタイル */
function sdlBadgeColor(score: number) {
  if (score >= 70) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (score >= 40) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-slate-100 text-slate-600 border-slate-200'
}

/** 継続意向のバッジスタイル */
function intentBadgeColor(intent: string) {
  switch (intent) {
    case '高（また来る）': return 'bg-emerald-50 text-emerald-700'
    case '紹介あり':       return 'bg-blue-50 text-blue-700'
    case '中（様子見）':   return 'bg-amber-50 text-amber-700'
    case '低（一度限り）': return 'bg-red-50 text-red-600'
    default:              return 'bg-slate-50 text-slate-500'
  }
}

/** タッチポイント種別の絵文字 */
function typeEmoji(type: string) {
  const map: Record<string, string> = {
    '窓口来訪':       '🏛️',
    '電話相談':       '📞',
    'イベント参加':   '🎪',
    'SNS接触':        '📱',
    'アウトリーチ訪問': '🚗',
    'オンライン手続き': '💻',
    'カードゲーム参加': '🃏',
  }
  return map[type] ?? '📍'
}

// ─── サマリーカードコンポーネント ─────────────────────

function SummaryCard({
  icon, label, value, sub, color
}: {
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

export default function TouchpointsPage() {
  // Sprint #36: 選択中の自治体を取得
  const { municipalityId, municipality } = useMunicipality()

  // ── State ──
  const [records,     setRecords]     = useState<TouchpointRecord[]>([])
  const [summary,     setSummary]     = useState<Summary | null>(null)
  // フォームの初期自治体名をコンテキストから設定
  const [form,        setForm]        = useState<FormState>({ ...INITIAL_FORM, municipalityName: municipality.shortName })
  const [loading,     setLoading]     = useState(false)
  const [fetching,    setFetching]    = useState(true)
  const [message,     setMessage]     = useState<{ text: string; ok: boolean } | null>(null)
  const [showForm,    setShowForm]    = useState(false)

  // ── データ取得（Sprint #36: municipalityId をクエリパラメータで渡す）──
  const fetchData = useCallback(async () => {
    setFetching(true)
    try {
      const res  = await fetch(`/api/touchpoints?municipalityId=${municipalityId}`)
      const data = await res.json()
      if (!data.error) {
        setRecords(data.records ?? [])
        setSummary(data.summary ?? null)
      }
    } catch {
      // サイレントに処理
    } finally {
      setFetching(false)
    }
  }, [municipalityId])  // municipalityId が変わると再取得

  // 自治体が切り替わったらフォームの自治体名もリセット
  useEffect(() => {
    setForm(f => ({ ...f, municipalityName: municipality.shortName }))
    setMessage(null)
  }, [municipalityId, municipality.shortName])

  useEffect(() => { fetchData() }, [fetchData])

  // ── フォーム送信 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.eventId.trim()) {
      setMessage({ text: 'イベントIDを入力してください', ok: false })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const res  = await fetch('/api/touchpoints', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const data = await res.json()

      if (data.error) {
        setMessage({ text: data.error, ok: false })
      } else {
        setMessage({ text: data.message, ok: true })
        setForm({ ...INITIAL_FORM, recordDate: new Date().toISOString().split('T')[0] })
        setShowForm(false)
        await fetchData()
      }
    } catch {
      setMessage({ text: 'ネットワークエラーが発生しました', ok: false })
    } finally {
      setLoading(false)
    }
  }

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm(prev => ({ ...prev, [key]: val }))

  // 種別バーグラフの最大値
  const maxByType = summary
    ? Math.max(...Object.values(summary.byType), 1)
    : 1

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                📍 タッチポイントイベント記録
              </h1>
              <p className="text-sm text-slate-500 mt-1">{municipality.name} —
                窓口・電話・訪問など住民との接点を記録し、SDL価値共創スコアで可視化します
              </p>
            </div>
            {/* 記録ボタン */}
            <button
              type="button"
              onClick={() => setShowForm(!showForm)}
              className="shrink-0 px-4 py-2 rounded-xl bg-sky-600 text-white text-sm font-medium hover:bg-sky-700 transition-colors"
            >
              {showForm ? '✕ 閉じる' : '＋ 記録する'}
            </button>
          </div>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
              🏘️ 住民接点 — Sprint #16
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
              🤝 タッチポイントイベント DB に蓄積
            </span>
          </div>
        </div>

        {/* ── サマリーカード（4枚） ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon="📍"
            label="総タッチポイント数"
            value={fetching ? '…' : summary?.total ?? 0}
            sub="件"
            color="bg-white border-slate-200 text-slate-700"
          />
          <SummaryCard
            icon="📅"
            label="今月の件数"
            value={fetching ? '…' : summary?.thisMonthCount ?? 0}
            sub="件"
            color="bg-sky-50 border-sky-200 text-sky-700"
          />
          <SummaryCard
            icon="⭐"
            label="平均SDL価値スコア"
            value={fetching ? '…' : summary?.avgSDL ?? 0}
            sub="/ 100pt"
            color="bg-violet-50 border-violet-200 text-violet-700"
          />
          <SummaryCard
            icon="💚"
            label="継続意向「高」"
            value={fetching ? '…' : summary?.highIntentCount ?? 0}
            sub="また来る + 紹介あり"
            color="bg-emerald-50 border-emerald-200 text-emerald-700"
          />
        </div>

        {/* ── 種別グラフ（CSS バー） ── */}
        {summary && Object.keys(summary.byType).length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">
              📊 タッチポイント種別の内訳
            </h2>
            <div className="space-y-2">
              {Object.entries(summary.byType)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) => (
                  <div key={type} className="flex items-center gap-3">
                    <span className="w-32 text-xs text-slate-600 shrink-0">
                      {typeEmoji(type)} {type}
                    </span>
                    <div className="flex-1 bg-slate-100 rounded-full h-2">
                      <div
                        className="bg-sky-500 h-2 rounded-full transition-all"
                        style={{ width: `${(count / maxByType) * 100}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-slate-500 w-6 text-right">
                      {count}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ── メッセージ表示 ── */}
        {message && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
            message.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {message.ok ? '✅ ' : '❌ '}{message.text}
          </div>
        )}

        {/* ── 入力フォーム（トグル表示） ── */}
        {showForm && (
          <div className="bg-white rounded-2xl border border-sky-200 shadow-sm p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-4">
              📝 タッチポイントを記録
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 行1: イベントID / 自治体名 / 記録日 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    イベントID <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={form.eventId}
                    onChange={e => setField('eventId', e.target.value)}
                    placeholder="例: TP-2026-001"
                    required
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    自治体名
                  </label>
                  <input
                    type="text"
                    value={form.municipalityName}
                    onChange={e => setField('municipalityName', e.target.value)}
                    placeholder="例: 屋久島町"
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    記録日
                  </label>
                  <input
                    type="date"
                    value={form.recordDate}
                    onChange={e => setField('recordDate', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              {/* 行2: 種別 / 接触者属性 / 年代 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    タッチポイント種別
                  </label>
                  <select
                    value={form.touchpointType}
                    onChange={e => setField('touchpointType', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    {TOUCHPOINT_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    接触者属性
                  </label>
                  <select
                    value={form.visitorAttribute}
                    onChange={e => setField('visitorAttribute', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    {VISITOR_ATTRIBUTES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    接触者年代
                  </label>
                  <select
                    value={form.visitorAge}
                    onChange={e => setField('visitorAge', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    {VISITOR_AGES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* 行3: 目的 / 担当部署 / 接触時間 */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    来訪目的カテゴリ
                  </label>
                  <select
                    value={form.purposeCategory}
                    onChange={e => setField('purposeCategory', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    {PURPOSE_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    担当職員部署
                  </label>
                  <select
                    value={form.department}
                    onChange={e => setField('department', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    <option value="">-- 選択 --</option>
                    {DEPARTMENTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    接触時間（分）
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={480}
                    value={form.contactMinutes}
                    onChange={e => setField('contactMinutes', Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>
              </div>

              {/* SDL 評価スコア */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* 接触前の課題レベル */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    接触前の課題レベル
                  </label>
                  <div className="flex gap-2">
                    {[1, 2, 3].map(n => (
                      <button key={n} type="button" onClick={() => setField('problemBefore', n)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                          form.problemBefore === n
                            ? 'bg-orange-500 text-white border-transparent'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                        {n === 1 ? '1 軽微' : n === 2 ? '2 中程度' : '3 深刻'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 接触後の課題解決度 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    接触後の課題解決度
                  </label>
                  <div className="flex gap-1">
                    {[0, 1, 2, 3].map(n => (
                      <button key={n} type="button" onClick={() => setField('problemAfter', n)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all ${
                          form.problemAfter === n
                            ? 'bg-emerald-500 text-white border-transparent'
                            : 'bg-white border-slate-200 text-slate-500'
                        }`}>
                        {n}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    {PROBLEM_AFTER_LABELS[form.problemAfter]}
                  </p>
                </div>

                {/* 継続意向 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-2">
                    継続意向
                  </label>
                  <select
                    value={form.continuationIntent}
                    onChange={e => setField('continuationIntent', e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 bg-white"
                  >
                    {CONTINUATION_INTENTS.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>

              {/* AI洞察メモ */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  AI洞察メモ（気づき・住民の声など）
                </label>
                <textarea
                  value={form.aiMemo}
                  onChange={e => setField('aiMemo', e.target.value)}
                  placeholder="住民から聞いた課題・要望・気づきなどをメモしてください。AI顧問の分析に活用されます。"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none"
                />
              </div>

              {/* 送信ボタン */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-sky-600 text-white font-medium text-sm hover:bg-sky-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                {loading ? '記録中…' : '💾 Notionに記録する'}
              </button>
            </form>
          </div>
        )}

        {/* ── 記録一覧テーブル ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            📋 タッチポイント記録一覧
          </h2>

          {fetching ? (
            <p className="text-sm text-slate-400 text-center py-8">読み込み中…</p>
          ) : records.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-2xl mb-2">📍</p>
              <p className="text-sm font-medium text-slate-600 mb-1">まだ記録がありません</p>
              <p className="text-xs text-slate-400">
                「＋ 記録する」ボタンから最初のタッチポイントを記録してください
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">種別</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">来訪目的</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">属性</th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-slate-500">解決度</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">継続意向</th>
                    <th className="text-center py-2 px-2 text-xs font-medium text-slate-500">SDL</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-slate-500">記録日</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-2.5 px-2">
                        <span className="text-sm">{typeEmoji(r.touchpointType)}</span>
                        <span className="ml-1 text-xs text-slate-600">{r.touchpointType}</span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-500">
                        {r.purposeCategory || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-500">
                        {r.visitorAttribute || '—'}
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${
                          r.problemAfter >= 2 ? 'bg-emerald-500' :
                          r.problemAfter === 1 ? 'bg-amber-400' : 'bg-slate-400'
                        }`}>
                          {r.problemAfter}
                        </span>
                      </td>
                      <td className="py-2.5 px-2">
                        <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${intentBadgeColor(r.continuationIntent)}`}>
                          {r.continuationIntent || '—'}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${sdlBadgeColor(r.sdlScore)}`}>
                          {r.sdlScore}
                        </span>
                      </td>
                      <td className="py-2.5 px-2 text-xs text-slate-400">
                        {r.recordDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── ガイドバナー ── */}
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
          <p className="text-xs font-semibold text-teal-600 mb-2">
            🤝 SDL価値共創スコアとは
          </p>
          <p className="text-sm text-teal-700 leading-relaxed">
            「課題解決度 × 継続意向 × 接触者属性」で算出するスコアです。
            住民との接点の<strong>質を数値化</strong>し、
            どのタッチポイントが価値を生んでいるかを可視化します。
            蓄積データは<strong>AI顧問の分析（RAG）</strong>にも活用されます。
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href="/ai-advisor"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors border border-teal-200"
            >
              🤖 AI顧問でタッチポイントを分析
            </Link>
            <Link
              href="/gyosei/line-consultation"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-sky-50 text-sky-700 hover:bg-sky-100 transition-colors border border-sky-200"
            >
              💬 LINE相談管理へ
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
