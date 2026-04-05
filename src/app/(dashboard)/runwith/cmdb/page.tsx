'use client'
// =====================================================
//  src/app/(dashboard)/runwith/cmdb/page.tsx
//  CMDBダッシュボード — Sprint #20
//
//  ■ このページの役割
//    自治体のIT資産（サーバー・PC・ネットワーク機器・
//    クラウドサービスなど）を一覧管理し、稼働状態・
//    更新期限・月額費用を可視化するCMDB画面。
//
//  ■ 主な機能
//    - サマリーカード（総資産数/稼働中/月額費用合計/期限アラート）
//    - 資産種別バーグラフ（クリックでフィルタ）
//    - 更新期限アラート（90日以内）ハイライト
//    - 稼働状態・資産種別・担当部署フィルタ
//    - 資産カード一覧
//    - 新規登録フォーム（トグル形式）
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// ─── 型定義 ──────────────────────────────────────────

interface CmdbRecord {
  id:             string
  name:           string
  managementNo:   string
  assetType:      string
  status:         string
  dept:           string
  contractType:   string
  monthlyCost:    number | null
  vendor:         string
  location:       string
  relatedService: string
  notes:          string
  installedDate:  string
  renewalDate:    string
}

interface CmdbResponse {
  records: CmdbRecord[]
  summary: {
    total:             number
    byStatus:          Record<string, number>
    byType:            Record<string, number>
    totalMonthlyCost:  number
    renewalAlertCount: number
    renewalAlerts:     CmdbRecord[]
  }
}

// ─── 定数 ────────────────────────────────────────────

const ASSET_TYPES   = ['サーバー', 'PC・端末', 'ネットワーク機器', 'ソフトウェア', 'クラウドサービス', 'プリンター・複合機']
const STATUS_LIST   = ['稼働中', 'メンテナンス中', '廃棄予定', '廃棄済']
const DEPT_LIST     = ['住民課', '総務課', '福祉課', '財政課', '情報政策課', '教育委員会']
const CONTRACT_LIST = ['購入', 'リース', 'クラウド月額']

// ─── ヘルパーコンポーネント ──────────────────────────

/** 稼働状態バッジ */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    '稼働中':       'bg-green-100  text-green-700',
    'メンテナンス中': 'bg-amber-100 text-amber-700',
    '廃棄予定':     'bg-red-100    text-red-600',
    '廃棄済':       'bg-gray-100   text-gray-400',
  }
  const dots: Record<string, string> = {
    '稼働中':       'bg-green-500',
    'メンテナンス中': 'bg-amber-500',
    '廃棄予定':     'bg-red-500',
    '廃棄済':       'bg-gray-400',
  }
  return (
    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${styles[status] ?? 'bg-gray-100 text-gray-500'}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${dots[status] ?? 'bg-gray-400'}`} />
      {status || '—'}
    </span>
  )
}

/** 資産種別アイコン */
function AssetTypeIcon({ type }: { type: string }) {
  const icons: Record<string, string> = {
    'サーバー':         '🖥️',
    'PC・端末':         '💻',
    'ネットワーク機器': '🌐',
    'ソフトウェア':     '📦',
    'クラウドサービス': '☁️',
    'プリンター・複合機': '🖨️',
  }
  return <span>{icons[type] ?? '📋'}</span>
}

/** 月額費用を「XX円」「XX万円」形式に整形 */
function formatCost(cost: number | null): string {
  if (cost === null) return '—'
  if (cost >= 10000) return `${(cost / 10000).toFixed(1)}万円`
  return `${cost.toLocaleString()}円`
}

/** 更新期限までの残り日数を計算 */
function daysUntilRenewal(dateStr: string): number | null {
  if (!dateStr) return null
  const diff = new Date(dateStr).getTime() - new Date().getTime()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

// ─── メインコンポーネント ─────────────────────────────

export default function CmdbPage() {
  const [data,          setData]          = useState<CmdbResponse | null>(null)
  const [loading,       setLoading]       = useState(true)
  const [error,         setError]         = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterType,    setFilterType]    = useState('')
  const [filterDept,    setFilterDept]    = useState('')
  const [showForm,      setShowForm]      = useState(false)
  const [submitting,    setSubmitting]    = useState(false)
  const [submitMsg,     setSubmitMsg]     = useState('')
  const [showAlerts,    setShowAlerts]    = useState(true) // 期限アラート表示フラグ

  const [form, setForm] = useState({
    name: '', managementNo: '', assetType: '', status: '稼働中',
    dept: '', contractType: '', monthlyCost: '', vendor: '',
    location: '', relatedService: '', notes: '',
    installedDate: '', renewalDate: '',
  })

  // ── データ取得 ──
  const fetchData = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const params = new URLSearchParams()
      if (filterStatus) params.set('status', filterStatus)
      if (filterType)   params.set('assetType', filterType)
      if (filterDept)   params.set('dept', filterDept)
      const res  = await fetch(`/api/cmdb?${params.toString()}`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'データ取得エラー')
      setData(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [filterStatus, filterType, filterDept])

  useEffect(() => { fetchData() }, [fetchData])

  // ── フォーム送信 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res  = await fetch('/api/cmdb', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          monthlyCost: form.monthlyCost ? Number(form.monthlyCost) : undefined,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '登録失敗')
      setSubmitMsg(json.message ?? '登録しました')
      setForm({
        name: '', managementNo: '', assetType: '', status: '稼働中',
        dept: '', contractType: '', monthlyCost: '', vendor: '',
        location: '', relatedService: '', notes: '',
        installedDate: '', renewalDate: '',
      })
      setShowForm(false)
      fetchData()
    } catch (e) {
      setSubmitMsg(`エラー: ${e instanceof Error ? e.message : '不明なエラー'}`)
    } finally {
      setSubmitting(false)
    }
  }

  const records = data?.records  ?? []
  const summary = data?.summary

  // 資産種別バーグラフの最大値（正規化用）
  const maxTypeCount = summary
    ? Math.max(...Object.values(summary.byType), 1)
    : 1

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🗂️ 構成管理（CMDB）</h1>
          <p className="text-sm text-gray-500 mt-1">
            IT資産・システム構成情報を登録・参照・変更履歴管理します
          </p>
        </div>
        <button
          onClick={() => { setShowForm(!showForm); setSubmitMsg('') }}
          className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg transition-colors"
        >
          {showForm ? '✕ 閉じる' : '＋ 資産を登録'}
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
            <div className="text-xs text-gray-500 mt-1">総資産数</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-3xl font-bold text-green-600">
              {summary.byStatus['稼働中'] ?? 0}
            </div>
            <div className="text-xs text-gray-500 mt-1">稼働中</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">
              {summary.totalMonthlyCost > 0
                ? formatCost(summary.totalMonthlyCost)
                : '—'}
            </div>
            <div className="text-xs text-gray-500 mt-1">月額費用合計</div>
          </div>
          <div
            className={`rounded-xl border p-4 text-center cursor-pointer transition-colors ${
              summary.renewalAlertCount > 0
                ? 'bg-red-50 border-red-200'
                : 'bg-white border-gray-200'
            }`}
            onClick={() => setShowAlerts(!showAlerts)}
          >
            <div className={`text-3xl font-bold ${summary.renewalAlertCount > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {summary.renewalAlertCount}
            </div>
            <div className="text-xs text-gray-500 mt-1">期限90日以内 ⚠️</div>
          </div>
        </div>
      )}

      {/* ── 更新期限アラート ── */}
      {showAlerts && summary && summary.renewalAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h2 className="text-sm font-semibold text-red-700 mb-3">
            ⚠️ 更新・更改期限が90日以内の資産
          </h2>
          <div className="space-y-2">
            {summary.renewalAlerts.map(r => {
              const days = daysUntilRenewal(r.renewalDate)
              return (
                <div key={r.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-red-100">
                  <div className="flex items-center gap-2">
                    <AssetTypeIcon type={r.assetType} />
                    <span className="text-sm font-medium text-gray-800">{r.name}</span>
                    {r.dept && <span className="text-xs text-gray-400">｜{r.dept}</span>}
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-red-600 font-semibold">
                      {days !== null ? `あと ${days} 日` : r.renewalDate}
                    </div>
                    <div className="text-xs text-gray-400">{r.renewalDate}</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── 資産種別バーグラフ ── */}
      {summary && Object.keys(summary.byType).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <h2 className="text-sm font-semibold text-gray-600 mb-3">資産種別の内訳</h2>
          <div className="space-y-2">
            {ASSET_TYPES.filter(t => (summary.byType[t] ?? 0) > 0).map(type => {
              const count = summary.byType[type] ?? 0
              const pct   = Math.round((count / maxTypeCount) * 100)
              return (
                <button
                  key={type}
                  onClick={() => setFilterType(filterType === type ? '' : type)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                    filterType === type ? 'bg-orange-50 border border-orange-200' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="w-6 text-center"><AssetTypeIcon type={type} /></span>
                  <span className="text-sm text-gray-700 w-28 shrink-0">{type}</span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-3 bg-orange-400 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-600 w-6 text-right">{count}</span>
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
            <label className="block text-xs text-gray-500 mb-1">稼働状態</label>
            <select
              value={filterStatus}
              onChange={e => setFilterStatus(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべて</option>
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">資産種別</label>
            <select
              value={filterType}
              onChange={e => setFilterType(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべて</option>
              {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">担当部署</label>
            <select
              value={filterDept}
              onChange={e => setFilterDept(e.target.value)}
              className="text-sm border border-gray-200 rounded px-2 py-1.5 bg-white"
            >
              <option value="">すべて</option>
              {DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          {(filterStatus || filterType || filterDept) && (
            <button
              onClick={() => { setFilterStatus(''); setFilterType(''); setFilterDept('') }}
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

      {/* ── 登録フォーム ── */}
      {showForm && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-orange-700 mb-4">📋 IT資産を新規登録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 資産名・管理番号 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">資産名 <span className="text-red-500">*</span></label>
                <input
                  required
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="例: 住民情報システムサーバー"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">管理番号</label>
                <input
                  type="text"
                  value={form.managementNo}
                  onChange={e => setForm(p => ({ ...p, managementNo: e.target.value }))}
                  placeholder="例: SV-001"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* 資産種別・稼働状態・担当部署 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">資産種別</label>
                <select
                  value={form.assetType}
                  onChange={e => setForm(p => ({ ...p, assetType: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {ASSET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">稼働状態</label>
                <select
                  value={form.status}
                  onChange={e => setForm(p => ({ ...p, status: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">担当部署</label>
                <select
                  value={form.dept}
                  onChange={e => setForm(p => ({ ...p, dept: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {DEPT_LIST.map(d => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>

            {/* 契約種別・月額費用・ベンダー名 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">契約種別</label>
                <select
                  value={form.contractType}
                  onChange={e => setForm(p => ({ ...p, contractType: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
                >
                  <option value="">選択してください</option>
                  {CONTRACT_LIST.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">月額費用（円）</label>
                <input
                  type="number"
                  value={form.monthlyCost}
                  onChange={e => setForm(p => ({ ...p, monthlyCost: e.target.value }))}
                  placeholder="例: 50000"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">ベンダー名</label>
                <input
                  type="text"
                  value={form.vendor}
                  onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))}
                  placeholder="例: 富士通"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* 設置場所・関連サービス */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">設置場所</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={e => setForm(p => ({ ...p, location: e.target.value }))}
                  placeholder="例: 庁舎2F サーバー室"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">関連サービス</label>
                <input
                  type="text"
                  value={form.relatedService}
                  onChange={e => setForm(p => ({ ...p, relatedService: e.target.value }))}
                  placeholder="例: 住民票発行、印鑑証明"
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
            </div>

            {/* 導入日・更新予定日 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">導入日</label>
                <input
                  type="date"
                  value={form.installedDate}
                  onChange={e => setForm(p => ({ ...p, installedDate: e.target.value }))}
                  className="w-full text-sm border border-gray-300 rounded px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-xs text-gray-600 mb-1">更新・更改予定日</label>
                <input
                  type="date"
                  value={form.renewalDate}
                  onChange={e => setForm(p => ({ ...p, renewalDate: e.target.value }))}
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

      {/* ── 資産一覧 ── */}
      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : records.length === 0 ? (
        <div className="text-center text-gray-400 py-12 bg-white rounded-xl border border-gray-200">
          <div className="text-4xl mb-2">🗂️</div>
          <p>登録されたIT資産がありません。</p>
          <p className="text-sm mt-1">「資産を登録」から追加してください。</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {records.map(r => {
            const days = daysUntilRenewal(r.renewalDate)
            const isAlert = days !== null && days <= 90 && days >= 0 && r.status !== '廃棄済'
            return (
              <div
                key={r.id}
                className={`bg-white rounded-xl border p-4 hover:shadow-md transition-shadow ${
                  isAlert ? 'border-red-200' : 'border-gray-200'
                }`}
              >
                {/* カードヘッダー */}
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg"><AssetTypeIcon type={r.assetType} /></span>
                    <div>
                      <h3 className="font-bold text-gray-800 text-sm leading-tight">{r.name}</h3>
                      {r.managementNo && (
                        <p className="text-xs text-gray-400">#{r.managementNo}</p>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={r.status} />
                </div>

                {/* 属性情報 */}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mb-3">
                  {r.assetType   && <span>種別: <strong className="text-gray-700">{r.assetType}</strong></span>}
                  {r.dept        && <span>担当: <strong className="text-gray-700">{r.dept}</strong></span>}
                  {r.contractType && <span>契約: <strong className="text-gray-700">{r.contractType}</strong></span>}
                  {r.vendor      && <span>ベンダー: <strong className="text-gray-700">{r.vendor}</strong></span>}
                  {r.location    && <span>設置: <strong className="text-gray-700">{r.location}</strong></span>}
                  {r.monthlyCost !== null && (
                    <span>月額: <strong className="text-blue-600">{formatCost(r.monthlyCost)}</strong></span>
                  )}
                </div>

                {/* 関連サービス */}
                {r.relatedService && (
                  <div className="text-xs text-gray-500 mb-2">
                    🔗 {r.relatedService}
                  </div>
                )}

                {/* 更新期限 */}
                {r.renewalDate && (
                  <div className={`text-xs rounded px-2 py-1 ${
                    isAlert ? 'bg-red-50 text-red-600' : 'bg-gray-50 text-gray-500'
                  }`}>
                    🗓️ 更新予定: {r.renewalDate}
                    {days !== null && days >= 0 && (
                      <span className={`ml-2 font-semibold ${isAlert ? 'text-red-600' : 'text-gray-600'}`}>
                        （あと{days}日）
                      </span>
                    )}
                    {days !== null && days < 0 && (
                      <span className="ml-2 text-gray-400">（期限切れ）</span>
                    )}
                  </div>
                )}

                {/* 備考 */}
                {r.notes && (
                  <div className="mt-2 text-xs text-gray-400">{r.notes}</div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
