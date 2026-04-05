'use client'
// =====================================================
//  src/app/(dashboard)/runwith/knowledge/page.tsx
//  集合知ナレッジブラウザ — Sprint #21
//
//  ■ このページの役割
//    限界自治体の課題解決事例を集積・横展開するナレッジ基盤。
//    「他の自治体はどうやってこの課題を解決したか」を
//    SDL五軸・課題カテゴリ・地域タイプで検索・閲覧できる。
//
//  ■ 主な機能
//    - サマリーカード（総ナレッジ数/成功事例/平均評価スコア/SDL軸カバー数）
//    - キーワード検索（タイトル・課題概要・解決策をクライアント側で絞り込み）
//    - 課題カテゴリ・地域タイプ・SDL軸・タグのフィルタ
//    - ナレッジカード一覧（課題→解決策→効果の流れで表示）
//    - 新規登録フォーム（トグル形式）
// =====================================================

import { useState, useEffect, useCallback, useMemo } from 'react'

// ─── 型定義 ──────────────────────────────────────────

interface KnowledgeRecord {
  id:               string
  title:            string
  category:         string
  overview:         string
  solution:         string
  effect:           string
  period:           string
  regionType:       string
  municipalityType: string
  sdlAxes:          string[]
  tags:             string[]
  score:            number | null
  link:             string
  registeredDate:   string
}

interface KnowledgeResponse {
  records: KnowledgeRecord[]
  summary: {
    total:           number
    byCategory:      Record<string, number>
    byTag:           Record<string, number>
    sdlCoveredCount: number
    avgScore:        number | null
    successCount:    number
  }
}

// ─── 定数 ────────────────────────────────────────────

const CATEGORIES  = ['人口減少', '財政課題', 'DX推進', '住民サービス', '職員育成', '観光・移住', 'インフラ維持']
const REGION_TYPES = ['離島', '山間部', '農村', '都市近郊', '沿岸部']
const SDL_AXES    = ['共創軸', '文脈軸', '資源軸', '統合軸', '価値軸']
const TAGS        = ['成功事例', '参考事例', '失敗から学ぶ', 'コスト削減', 'AI活用']

// ─── ヘルパーコンポーネント ──────────────────────────

/** 課題カテゴリバッジ */
function CategoryBadge({ name }: { name: string }) {
  const colorMap: Record<string, string> = {
    '人口減少':   'bg-red-100    text-red-700',
    '財政課題':   'bg-orange-100 text-orange-700',
    'DX推進':     'bg-purple-100 text-purple-700',
    '住民サービス': 'bg-blue-100  text-blue-700',
    '職員育成':   'bg-green-100  text-green-700',
    '観光・移住': 'bg-pink-100   text-pink-700',
    'インフラ維持': 'bg-gray-100  text-gray-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colorMap[name] ?? 'bg-gray-100 text-gray-500'}`}>
      {name}
    </span>
  )
}

/** SDL軸チップ */
function SdlChip({ name }: { name: string }) {
  const colorMap: Record<string, string> = {
    '共創軸': 'bg-blue-100   text-blue-700',
    '文脈軸': 'bg-green-100  text-green-700',
    '資源軸': 'bg-orange-100 text-orange-700',
    '統合軸': 'bg-purple-100 text-purple-700',
    '価値軸': 'bg-pink-100   text-pink-700',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${colorMap[name] ?? 'bg-gray-100 text-gray-500'}`}>
      【{name}】
    </span>
  )
}

/** タグチップ */
function TagChip({ name }: { name: string }) {
  const colorMap: Record<string, string> = {
    '成功事例':     'bg-green-100  text-green-700',
    '参考事例':     'bg-blue-100   text-blue-700',
    '失敗から学ぶ': 'bg-amber-100  text-amber-700',
    'コスト削減':   'bg-purple-100 text-purple-700',
    'AI活用':       'bg-indigo-100 text-indigo-700',
  }
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded ${colorMap[name] ?? 'bg-gray-100 text-gray-500'}`}>
      #{name}
    </span>
  )
}

/** 評価スコア星表示（0〜5で星に換算） */
function ScoreStars({ score }: { score: number | null }) {
  if (score === null) return <span className="text-xs text-gray-400">—</span>
  const stars = Math.round(Math.min(5, Math.max(0, score)))
  return (
    <span className="text-sm text-amber-400" title={`評価: ${score}`}>
      {'★'.repeat(stars)}{'☆'.repeat(5 - stars)}
      <span className="text-xs text-gray-500 ml-1">{score}</span>
    </span>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function KnowledgePage() {
  const [data,           setData]           = useState<KnowledgeResponse | null>(null)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [filterRegion,   setFilterRegion]   = useState('')
  const [filterSdl,      setFilterSdl]      = useState('')
  const [filterTag,      setFilterTag]      = useState('')
  const [keyword,        setKeyword]        = useState('')  // クライアント側キーワード検索
  const [showForm,       setShowForm]       = useState(false)
  const [submitting,     setSubmitting]     = useState(false)
  const [submitMsg,      setSubmitMsg]      = useState('')

  const [form, setForm] = useState({
    title: '', category: '', overview: '', solution: '', effect: '',
    period: '', regionType: '', municipalityType: '',
    sdlAxes: [] as string[], tags: [] as string[],
    score: '', link: '',
    registeredDate: new Date().toISOString().slice(0, 10),
  })

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterCategory) params.set('category', filterCategory)
      if (filterRegion)   params.set('regionType', filterRegion)
      if (filterSdl)      params.set('sdlAxis', filterSdl)
      if (filterTag)      params.set('tag', filterTag)
      const res  = await fetch(`/api/knowledge?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'データ取得エラー')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [filterCategory, filterRegion, filterSdl, filterTag])

  useEffect(() => { fetchData() }, [fetchData])

  // ── キーワード検索（クライアント側フィルタ）──
  const filteredRecords = useMemo(() => {
    const recs = data?.records ?? []
    if (!keyword.trim()) return recs
    const kw = keyword.trim().toLowerCase()
    return recs.filter(r =>
      r.title.toLowerCase().includes(kw) ||
      r.overview.toLowerCase().includes(kw) ||
      r.solution.toLowerCase().includes(kw) ||
      r.effect.toLowerCase().includes(kw)
    )
  }, [data, keyword])

  // ── フォーム送信 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res  = await fetch('/api/knowledge', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          score: form.score ? Number(form.score) : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '登録失敗')
      setSubmitMsg(json.message ?? '登録しました')
      setForm({
        title: '', category: '', overview: '', solution: '', effect: '',
        period: '', regionType: '', municipalityType: '',
        sdlAxes: [], tags: [],
        score: '', link: '',
        registeredDate: new Date().toISOString().slice(0, 10),
      })
      setShowForm(false)
      fetchData()
    } catch (e) {
      setSubmitMsg(`エラー: ${e instanceof Error ? e.message : '不明なエラー'}`)
    } finally {
      setSubmitting(false)
    }
  }

  // multi_select のトグル
  const toggleSdl = (name: string) =>
    setForm(p => ({
      ...p,
      sdlAxes: p.sdlAxes.includes(name) ? p.sdlAxes.filter(x => x !== name) : [...p.sdlAxes, name],
    }))
  const toggleTag = (name: string) =>
    setForm(p => ({
      ...p,
      tags: p.tags.includes(name) ? p.tags.filter(x => x !== name) : [...p.tags, name],
    }))

  const summary = data?.summary

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🧠 集合知ナレッジブラウザ</h1>
          <p className="text-sm text-gray-500 mt-1">
            限界自治体の課題解決ノウハウを集積・横展開する知識ベース
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitMsg('') }}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '✕ 閉じる' : '＋ 事例を登録'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
          ⚠️ {error}
        </div>
      )}

      {/* ── サマリーカード ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-emerald-600">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-1">総ナレッジ数</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{summary.successCount}</div>
            <div className="text-xs text-gray-500 mt-1">成功事例</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">
              {summary.avgScore !== null ? summary.avgScore : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">平均評価スコア</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-purple-600">{summary.sdlCoveredCount}/5</div>
            <div className="text-xs text-gray-500 mt-1">SDL軸カバー数</div>
          </div>
        </div>
      )}

      {/* ── キーワード検索バー ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <input
          type="text"
          value={keyword}
          onChange={e => setKeyword(e.target.value)}
          placeholder="🔍 キーワードで検索（タイトル・課題・解決策）"
          className="w-full text-sm border border-gray-200 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-emerald-300"
        />
      </div>

      {/* ── フィルターバー ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
        {/* 課題カテゴリ（ボタン選択式） */}
        <div>
          <p className="text-xs text-gray-500 mb-2">課題カテゴリ</p>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(filterCategory === cat ? '' : cat)}
                className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                  filterCategory === cat
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-emerald-400'
                }`}
              >
                {cat}
                {summary?.byCategory[cat] ? ` (${summary.byCategory[cat]})` : ''}
              </button>
            ))}
          </div>
        </div>

        {/* SDL軸・地域タイプ・タグ */}
        <div className="flex flex-wrap gap-4 items-end pt-2 border-t border-gray-100">
          <div>
            <label className="block text-xs text-gray-500 mb-1">SDL軸</label>
            <select
              value={filterSdl}
              onChange={e => setFilterSdl(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべての軸</option>
              {SDL_AXES.map(ax => <option key={ax} value={ax}>{ax}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">地域タイプ</label>
            <select
              value={filterRegion}
              onChange={e => setFilterRegion(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべての地域</option>
              {REGION_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">タグ</label>
            <select
              value={filterTag}
              onChange={e => setFilterTag(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべてのタグ</option>
              {TAGS.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {(filterCategory || filterRegion || filterSdl || filterTag || keyword) && (
            <button
              onClick={() => {
                setFilterCategory(''); setFilterRegion('')
                setFilterSdl(''); setFilterTag(''); setKeyword('')
              }}
              className="text-xs text-gray-400 hover:text-red-500 underline"
            >
              すべてクリア
            </button>
          )}
          <div className="ml-auto text-xs text-gray-400">
            {loading ? '読み込み中...' : `${filteredRecords.length} 件表示`}
          </div>
        </div>
      </div>

      {/* ── 登録フォーム ── */}
      {showForm && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-emerald-700 mb-4">📝 ナレッジ事例を登録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs text-gray-600 mb-1">タイトル <span className="text-red-500">*</span></label>
              <input
                required type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="例: 離島でのオンライン住民相談導入による窓口削減"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">課題カテゴリ</label>
                <select value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white">
                  <option value="">選択</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">地域タイプ</label>
                <select value={form.regionType} onChange={e => setForm(p => ({ ...p, regionType: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white">
                  <option value="">選択</option>
                  {REGION_TYPES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">評価スコア（0〜5）</label>
                <input type="number" min="0" max="5" step="0.1"
                  value={form.score}
                  onChange={e => setForm(p => ({ ...p, score: e.target.value }))}
                  placeholder="例: 4.5"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">課題の概要</label>
              <textarea rows={2} value={form.overview}
                onChange={e => setForm(p => ({ ...p, overview: e.target.value }))}
                placeholder="どのような課題があったか"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">解決策・取り組み</label>
              <textarea rows={2} value={form.solution}
                onChange={e => setForm(p => ({ ...p, solution: e.target.value }))}
                placeholder="どのように解決したか"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">得られた効果</label>
              <textarea rows={2} value={form.effect}
                onChange={e => setForm(p => ({ ...p, effect: e.target.value }))}
                placeholder="どんな効果が生まれたか（数値があれば記載）"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">実施期間</label>
                <input type="text" value={form.period}
                  onChange={e => setForm(p => ({ ...p, period: e.target.value }))}
                  placeholder="例: 2024年4月〜2025年3月"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">登録自治体タイプ（匿名化）</label>
                <input type="text" value={form.municipalityType}
                  onChange={e => setForm(p => ({ ...p, municipalityType: e.target.value }))}
                  placeholder="例: 離島型 人口1万人未満"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
              </div>
            </div>

            {/* SDL軸 */}
            <div>
              <label className="block text-xs text-gray-600 mb-2">SDL軸（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {SDL_AXES.map(ax => (
                  <label key={ax} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={form.sdlAxes.includes(ax)} onChange={() => toggleSdl(ax)} />
                    <span className="text-sm">{ax}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* タグ */}
            <div>
              <label className="block text-xs text-gray-600 mb-2">タグ（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {TAGS.map(tag => (
                  <label key={tag} className="flex items-center gap-1 cursor-pointer">
                    <input type="checkbox" checked={form.tags.includes(tag)} onChange={() => toggleTag(tag)} />
                    <span className="text-sm">{tag}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">参考リンク（URL）</label>
                <input type="url" value={form.link}
                  onChange={e => setForm(p => ({ ...p, link: e.target.value }))}
                  placeholder="https://..."
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">登録日</label>
                <input type="date" value={form.registeredDate}
                  onChange={e => setForm(p => ({ ...p, registeredDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button type="submit" disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50">
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

      {/* ── ナレッジカード一覧 ── */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : filteredRecords.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-2">🧠</div>
          <p>{data?.records.length === 0 ? '登録されたナレッジがありません。' : 'キーワードに一致する事例が見つかりません。'}</p>
          <p className="text-sm mt-1">「事例を登録」から追加してください。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRecords.map(r => (
            <div
              key={r.id}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow"
            >
              {/* ヘッダー */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-base leading-snug">{r.title}</h3>
                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                    {r.category   && <CategoryBadge name={r.category} />}
                    {r.regionType && (
                      <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                        {r.regionType}
                      </span>
                    )}
                    {r.municipalityType && (
                      <span className="text-xs text-gray-400">{r.municipalityType}</span>
                    )}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <ScoreStars score={r.score} />
                  {r.period && <div className="text-xs text-gray-400 mt-0.5">{r.period}</div>}
                </div>
              </div>

              {/* 課題→解決策→効果 の3ステップ */}
              <div className="space-y-2 text-sm">
                {r.overview && (
                  <div className="flex gap-2">
                    <span className="text-red-500 font-bold shrink-0">課題</span>
                    <p className="text-gray-600 leading-relaxed">{r.overview}</p>
                  </div>
                )}
                {r.solution && (
                  <div className="flex gap-2">
                    <span className="text-blue-500 font-bold shrink-0">対策</span>
                    <p className="text-gray-600 leading-relaxed">{r.solution}</p>
                  </div>
                )}
                {r.effect && (
                  <div className="flex gap-2">
                    <span className="text-green-600 font-bold shrink-0">効果</span>
                    <p className="text-gray-700 leading-relaxed font-medium">{r.effect}</p>
                  </div>
                )}
              </div>

              {/* SDL軸・タグ・リンク */}
              {(r.sdlAxes.length > 0 || r.tags.length > 0 || r.link) && (
                <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                  {r.sdlAxes.map(ax => <SdlChip key={ax} name={ax} />)}
                  {r.tags.map(tag => <TagChip key={tag} name={tag} />)}
                  {r.link && (
                    <a
                      href={r.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-auto text-xs text-blue-500 hover:underline"
                    >
                      🔗 参考リンク
                    </a>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
