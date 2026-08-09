'use client'
// =====================================================
//  src/app/(dashboard)/runwith/agreement/stakeholders/page.tsx
//  ステークホルダーマップ — Sprint #94（REQ-01）
//
//  ■ このページの役割
//    合意形成に関わる住民・事業者・職員・外部パートナーを
//    役割ごとにグルーピングして一覧表示する。
//    匿名希望の人は名前を出さない（APIレスポンス側でマスク済み）。
//
//  ■ 技術ポイント
//    - GET  /api/stakeholders で一覧取得
//    - POST /api/stakeholders で新規登録
// =====================================================

import { useState, useEffect, useCallback } from 'react'

interface StakeholderRecord {
  id:              string
  name:            string
  type:            string
  affiliation:     string
  role:            string
  isAnonymous:     boolean
  municipalityIds: string
  notes:           string
}

interface StakeholderResponse {
  records: StakeholderRecord[]
  summary: { total: number; byRole: Record<string, number> }
}

const TYPES = ['個人', '団体']
const ROLES = ['住民', '事業者', '職員', '外部パートナー', 'その他']

const INITIAL_FORM = {
  name: '', type: '個人', affiliation: '', role: '住民',
  isAnonymous: false, municipalityIds: '', notes: '',
}

const ROLE_EMOJI: Record<string, string> = {
  '住民':         '🏠',
  '事業者':       '🏢',
  '職員':         '🏛️',
  '外部パートナー': '🌍',
  'その他':       '👤',
}

function RoleBadge({ role }: { role: string }) {
  return (
    <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">
      {ROLE_EMOJI[role] ?? '👤'} {role || '未設定'}
    </span>
  )
}

export default function StakeholdersPage() {
  const [data,       setData]       = useState<StakeholderResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg,  setSubmitMsg]  = useState('')
  const [filterRole, setFilterRole] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/stakeholders')
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
      const res  = await fetch('/api/stakeholders', {
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

  const records = (data?.records ?? []).filter(r => !filterRole || r.role === filterRole)
  const summary = data?.summary

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🧑‍🤝‍🧑 ステークホルダーマップ</h1>
          <p className="text-sm text-gray-500 mt-1">合意形成に関わる人・団体を役割ごとに一覧します</p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitMsg('') }}
          className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '✕ 閉じる' : '＋ ステークホルダーを登録'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">⚠️ {error}</div>
      )}

      {summary && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilterRole('')}
            className={`text-xs px-3 py-1.5 rounded-full border ${filterRole === '' ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300'}`}
          >
            すべて（{summary.total}）
          </button>
          {ROLES.filter(r => (summary.byRole[r] ?? 0) > 0).map(r => (
            <button
              key={r}
              onClick={() => setFilterRole(filterRole === r ? '' : r)}
              className={`text-xs px-3 py-1.5 rounded-full border ${filterRole === r ? 'bg-teal-600 text-white border-teal-600' : 'bg-white text-gray-600 border-gray-300'}`}
            >
              {ROLE_EMOJI[r]} {r}（{summary.byRole[r]}）
            </button>
          ))}
        </div>
      )}

      {showForm && (
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-teal-700 mb-4">🧑‍🤝‍🧑 ステークホルダーを新規登録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-gray-600 mb-1">名前 <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例: 田中さん（柑橘農家）"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">種別</label>
                <select
                  value={form.type}
                  onChange={e => setForm(p => ({ ...p, type: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">役割</label>
                <select
                  value={form.role}
                  onChange={e => setForm(p => ({ ...p, role: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-xs text-gray-600">
                  <input
                    type="checkbox"
                    checked={form.isAnonymous}
                    onChange={e => setForm(p => ({ ...p, isAnonymous: e.target.checked }))}
                  />
                  匿名希望（一覧で実名を出さない）
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">所属組織</label>
                <input
                  type="text"
                  value={form.affiliation}
                  onChange={e => setForm(p => ({ ...p, affiliation: e.target.value }))}
                  placeholder="例: ○○農園"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">対象municipality_id</label>
                <input
                  type="text"
                  value={form.municipalityIds}
                  onChange={e => setForm(p => ({ ...p, municipalityIds: e.target.value }))}
                  placeholder="例: yakushima"
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
          <div className="text-4xl mb-2">🧑‍🤝‍🧑</div>
          <p>登録されたステークホルダーがいません。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm">{r.name}</h3>
                <RoleBadge role={r.role} />
              </div>
              <div className="flex flex-wrap gap-x-3 text-xs text-gray-500">
                {r.type        && <span>種別: {r.type}</span>}
                {r.affiliation && <span>所属: {r.affiliation}</span>}
              </div>
              {r.notes && <div className="mt-2 text-xs text-gray-400">{r.notes}</div>}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
