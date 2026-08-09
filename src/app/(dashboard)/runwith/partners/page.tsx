'use client'
// =====================================================
//  src/app/(dashboard)/runwith/partners/page.tsx
//  パートナー役割分担・合意状況 — Sprint #91
//
//  ■ このページの役割
//    RunWithに新規機能として追加する「合意形成レイヤー」の起点。
//    離島経済新聞社（鯨本さん）のような地域外パートナーについて、
//    「何を担い」「何を求めているか」「役割分担にいつ合意したか」を
//    属人的な記憶に頼らず管理者画面に残す。
//
//  ■ 主な機能
//    - サマリーカード（総パートナー数/未合意件数/ステータス内訳）
//    - パートナー一覧カード（担当領域・offers/seeks・関連Issue表示）
//    - 新規登録フォーム（トグル形式）
//    - 合意ステータスをカード上でその場更新（未着手→進行中→完了）
//
//  ■ 技術ポイント
//    - GET   /api/partners で一覧取得
//    - POST  /api/partners で新規登録
//    - PATCH /api/partners で合意ステータス更新
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// ─── 型定義 ──────────────────────────────────────────

interface PartnerRecord {
  id:              string
  name:            string
  roleAreas:       string[]
  agreementStatus: string
  agreementDate:   string
  offers:          string
  seeks:           string
  matchedIssues:   string
  municipalityIds: string
  notes:           string
}

interface PartnerResponse {
  records: PartnerRecord[]
  summary: {
    total:            number
    byStatus:         Record<string, number>
    unresolvedCount:  number
  }
}

// ─── 定数 ────────────────────────────────────────────

const ROLE_AREAS = [
  '信頼構築・出会い', '情報発信', '島間ネットワーク',
  '対面ファシリテーション', '定性的文脈理解', 'データマッチング',
]
const AGREEMENT_STATUSES = ['未着手', '進行中', '完了']

const INITIAL_FORM = {
  name:            '',
  roleAreas:       [] as string[],
  agreementStatus: '未着手',
  agreementDate:   '',
  offers:          '',
  seeks:           '',
  matchedIssues:   '',
  municipalityIds: '',
  notes:           '',
}

// ─── ヘルパーコンポーネント ──────────────────────────

/** 合意ステータスのバッジ */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    '未着手': 'bg-gray-100  text-gray-500',
    '進行中': 'bg-amber-100 text-amber-700',
    '完了':   'bg-green-100 text-green-700',
  }
  const dots: Record<string, string> = {
    '未着手': 'bg-gray-400',
    '進行中': 'bg-amber-500',
    '完了':   'bg-green-500',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? 'bg-gray-400'}`} />
      {status || '—'}
    </span>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function PartnersPage() {
  const [data,       setData]       = useState<PartnerResponse | null>(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [showForm,   setShowForm]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitMsg,  setSubmitMsg]  = useState('')
  const [updatingId, setUpdatingId] = useState('')

  const [form, setForm] = useState(INITIAL_FORM)

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res  = await fetch('/api/partners')
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

  // ── 担当領域チェックボックスの切り替え ──
  const toggleRoleArea = (area: string) => {
    setForm(p => ({
      ...p,
      roleAreas: p.roleAreas.includes(area)
        ? p.roleAreas.filter(a => a !== area)
        : [...p.roleAreas, area],
    }))
  }

  // ── フォーム送信（新規登録） ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res  = await fetch('/api/partners', {
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

  // ── 合意ステータスをその場更新 ──
  const handleStatusChange = async (record: PartnerRecord, newStatus: string) => {
    setUpdatingId(record.id)
    try {
      await fetch('/api/partners', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          pageId:          record.id,
          agreementStatus: newStatus,
          // 「完了」に更新するタイミングで合意日が未入力なら今日の日付を入れる
          agreementDate:   newStatus === '完了' && !record.agreementDate
            ? new Date().toISOString().split('T')[0]
            : record.agreementDate || undefined,
        }),
      })
      fetchData()
    } finally {
      setUpdatingId('')
    }
  }

  const records = data?.records ?? []
  const summary = data?.summary

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🤝 パートナー役割分担・合意状況</h1>
          <p className="text-sm text-gray-500 mt-1">
            地域外パートナー（離島経済新聞社など）と RunWith の役割分担・合意状況を管理します
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitMsg('') }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '✕ 閉じる' : '＋ パートナーを登録'}
        </button>
      </div>

      {/* ── エラー ── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
          ⚠️ {error}
        </div>
      )}

      {/* ── サマリーカード ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-orange-500">{summary.total}</div>
            <div className="text-xs text-gray-500 mt-1">登録パートナー数</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-gray-400">{summary.byStatus['未着手'] ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">未着手</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-amber-500">{summary.byStatus['進行中'] ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">進行中</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-green-600">{summary.byStatus['完了'] ?? 0}</div>
            <div className="text-xs text-gray-500 mt-1">合意完了</div>
          </div>
        </div>
      )}

      {/* ── 未合意アラート ── */}
      {summary && summary.unresolvedCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          ⚠️ 役割分担の合意がまだ完了していないパートナーが {summary.unresolvedCount} 件あります。
        </div>
      )}

      {/* ── 登録フォーム ── */}
      {showForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-orange-700 mb-4">🤝 パートナーを新規登録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="block text-xs text-gray-600 mb-1">パートナー名 <span className="text-red-500">*</span></label>
              <input
                required
                type="text"
                value={form.name}
                onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="例: 離島経済新聞社（鯨本代表）"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">担当領域（複数選択可）</label>
              <div className="flex flex-wrap gap-2">
                {ROLE_AREAS.map(area => (
                  <button
                    key={area}
                    type="button"
                    onClick={() => toggleRoleArea(area)}
                    className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                      form.roleAreas.includes(area)
                        ? 'bg-orange-500 text-white border-orange-500'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-orange-300'
                    }`}
                  >
                    {area}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">合意ステータス</label>
                <select
                  value={form.agreementStatus}
                  onChange={e => setForm(p => ({ ...p, agreementStatus: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {AGREEMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">合意日</label>
                <input
                  type="date"
                  value={form.agreementDate}
                  onChange={e => setForm(p => ({ ...p, agreementDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">提供できるもの（offers）</label>
              <textarea
                value={form.offers}
                onChange={e => setForm(p => ({ ...p, offers: e.target.value }))}
                rows={2}
                placeholder="例: 複数離島との人的ネットワーク、現地取材による信頼構築"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-1">求めるもの（seeks）</label>
              <textarea
                value={form.seeks}
                onChange={e => setForm(p => ({ ...p, seeks: e.target.value }))}
                rows={2}
                placeholder="例: 自分たちが作った出会い・信頼が合意形成につながっているかの可視化"
                className="w-full text-sm border border-gray-300 rounded px-3 py-2"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">関連Issue</label>
                <input
                  type="text"
                  value={form.matchedIssues}
                  onChange={e => setForm(p => ({ ...p, matchedIssues: e.target.value }))}
                  placeholder="例: 屋久島町 みず産業クラスター構想"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">対象municipality_id</label>
                <input
                  type="text"
                  value={form.municipalityIds}
                  onChange={e => setForm(p => ({ ...p, municipalityIds: e.target.value }))}
                  placeholder="複数はカンマ区切り。地域外主体は空欄"
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

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50"
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

      {/* ── パートナー一覧 ── */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-2">🤝</div>
          <p>登録されたパートナーがありません。</p>
          <p className="text-sm mt-1">「パートナーを登録」から追加してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map(r => (
            <div key={r.id} className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow">
              {/* カードヘッダー */}
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-bold text-gray-800 text-sm leading-tight">{r.name}</h3>
                <StatusBadge status={r.agreementStatus} />
              </div>

              {/* 担当領域タグ */}
              {r.roleAreas.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {r.roleAreas.map(area => (
                    <span key={area} className="text-xs bg-orange-50 text-orange-700 px-2 py-0.5 rounded-full">
                      {area}
                    </span>
                  ))}
                </div>
              )}

              {/* offers / seeks */}
              {r.offers && (
                <div className="text-xs text-gray-500 mb-1">
                  <span className="font-semibold text-gray-600">提供:</span> {r.offers}
                </div>
              )}
              {r.seeks && (
                <div className="text-xs text-gray-500 mb-2">
                  <span className="font-semibold text-gray-600">要望:</span> {r.seeks}
                </div>
              )}

              {/* 関連Issue */}
              {r.matchedIssues && (
                <div className="text-xs text-gray-500 mb-2">🔗 {r.matchedIssues}</div>
              )}

              {/* 合意日 */}
              {r.agreementDate && (
                <div className="text-xs text-gray-400 mb-2">🗓️ 合意日: {r.agreementDate}</div>
              )}

              {/* 備考 */}
              {r.notes && (
                <div className="text-xs text-gray-400 mb-3">{r.notes}</div>
              )}

              {/* 合意ステータス変更 */}
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-xs text-gray-400">合意ステータス変更:</span>
                <select
                  value={r.agreementStatus}
                  disabled={updatingId === r.id}
                  onChange={e => handleStatusChange(r, e.target.value)}
                  className="text-xs border border-gray-200 rounded px-2 py-1 bg-white disabled:opacity-50"
                >
                  {AGREEMENT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
