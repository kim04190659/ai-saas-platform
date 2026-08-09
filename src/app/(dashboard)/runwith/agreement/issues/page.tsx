'use client'
// =====================================================
//  src/app/(dashboard)/runwith/agreement/issues/page.tsx
//  論点タイムライン — Sprint #94（REQ-02）
//
//  ■ このページの役割
//    合意形成の対象となる論点（Issue）の一覧と、賛成/反対/保留の
//    内訳を表示する。内訳はk匿名性の閾値（20件）未満の論点では
//    非公開にする（Sprint #93 設計書に準拠）。
//
//  ■ 技術ポイント
//    - GET  /api/issues で一覧＋集計を取得（集計はAPI側で実施）
//    - POST /api/issues で新規論点を登録
// =====================================================

import { useState, useEffect, useCallback } from 'react'

interface IssueRecord {
  id:              string
  title:           string
  domain:          string
  status:          string
  level:           string
  municipalityIds: string
  relatedProject:  string
  notes:           string
  aggregate: {
    total:      number
    suppressed: boolean
    byStance:   Record<string, number> | null
  }
}

interface IssueResponse {
  records: IssueRecord[]
  summary: { total: number; byStatus: Record<string, number> }
}

const DOMAINS = ['健康', '仕事', 'コミュニティ', '教育', '環境', 'ガバナンス', '心理的Well-Being', '物質的基盤']
const STATUSES = ['提起', '議論中', '合意形成中', '合意済み', '保留']
const LEVELS   = ['市町村', '県', '地域全体']
const STANCE_ORDER = ['賛成', '条件付き賛成', '保留', '反対']

const INITIAL_FORM = {
  title: '', domain: '', status: '提起', level: '',
  municipalityIds: '', relatedProject: '', notes: '',
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    '提起':       'bg-gray-100 text-gray-500',
    '議論中':     'bg-blue-100 text-blue-700',
    '合意形成中': 'bg-orange-100 text-orange-700',
    '合意済み':   'bg-green-100 text-green-700',
    '保留':       'bg-red-100 text-red-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      {status || '—'}
    </span>
  )
}

const STANCE_COLOR: Record<string, string> = {
  '賛成':         'bg-green-400',
  '条件付き賛成': 'bg-yellow-400',
  '保留':         'bg-gray-300',
  '反対':         'bg-red-400',
}

/** 賛成/反対/保留の内訳を横棒グラフで表示する */
function StanceBar({ byStance, total }: { byStance: Record<string, number>; total: number }) {
  return (
    <div className="space-y-1">
      <div className="w-full h-3 rounded-full overflow-hidden flex bg-gray-100">
        {STANCE_ORDER.filter(s => (byStance[s] ?? 0) > 0).map(s => (
          <div
            key={s}
            className={STANCE_COLOR[s]}
            style={{ width: `${((byStance[s] ?? 0) / total) * 100}%` }}
            title={`${s}: ${byStance[s]}件`}
          />
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

export default function IssuesPage() {
  const [data,       setData]       = useState<IssueResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg,  setSubmitMsg]  = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/issues')
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'データ取得エラー')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res  = await fetch('/api/issues', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '登録失敗')
      setSubmitMsg(json.message ?? '登録しました')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchData()
    } catch (e) {
      setSubmitMsg(`エラー: ${e instanceof Error ? e.message : '不明なエラー'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const records = (data?.records ?? []).filter(r => !filterStatus || r.status === filterStatus)
  const summary = data?.summary

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🗣️ 論点タイムライン</h1>
          <p className="text-sm text-gray-500 mt-1">論点ごとの賛成/反対/保留の推移を確認します</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitMsg('') }}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '✕ 閉じる' : '＋ 論点を登録'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">⚠️ {error}</div>
      )}

      {summary && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterStatus('')}
            className={`text-xs px-3 py-1.5 rounded-full border ${filterStatus === '' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            すべて（{summary.total}）
          </button>
          {STATUSES.filter(s => (summary.byStatus[s] ?? 0) > 0).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(filterStatus === s ? '' : s)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filterStatus === s ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {s}（{summary.byStatus[s]}）
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-teal-700 mb-4">🗣️ 論点を新規登録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">論点タイトル <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                placeholder="例: みず産業クラスターへの新規参入事業者受け入れ"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">ドメイン</label>
                <select
                  value={form.domain}
                  onChange={e => setForm(p => ({ ...p, domain: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {DOMAINS.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">ステータス</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">対象レベル</label>
                <select
                  value={form.level}
                  onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">対象municipality_id</label>
                <input
                  type="text"
                  value={form.municipalityIds}
                  onChange={e => setForm(p => ({ ...p, municipalityIds: e.target.value }))}
                  placeholder="複数はカンマ区切り。県/地域全体は空欄可"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">関連プロジェクト</label>
                <input
                  type="text"
                  value={form.relatedProject}
                  onChange={e => setForm(p => ({ ...p, relatedProject: e.target.value }))}
                  placeholder="例: 屋久島町 みず産業クラスター構想"
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
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50"
              >
                {submitting ? '登録中...' : '登録する'}
              </button>
              {submitMsg && (
                <p className={`text-sm ${submitMsg.startsWith('エラー') ? 'text-red-600' : 'text-green-600'}`}>{submitMsg}</p>
              )}
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-2">🗣️</div>
          <p>登録された論点がありません。</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2 gap-2">
                <h3 className="font-bold text-gray-800 text-sm leading-snug">{r.title}</h3>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-500 mb-3">
                {r.domain && <span>🏷️ {r.domain}</span>}
                {r.level  && <span>📍 {r.level}</span>}
                {r.relatedProject && <span>🔗 {r.relatedProject}</span>}
              </div>

              {r.aggregate.suppressed ? (
                <div className="text-xs bg-gray-50 text-gray-400 rounded px-3 py-2">
                  🔒 データ収集中（{r.aggregate.total}件・{20}件集まるまで内訳は非公開です）
                </div>
              ) : r.aggregate.byStance ? (
                <StanceBar byStance={r.aggregate.byStance} total={r.aggregate.total} />
              ) : null}

              {r.notes && <div className="mt-2 text-xs text-gray-400">{r.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
