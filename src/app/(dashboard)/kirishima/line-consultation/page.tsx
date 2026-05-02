'use client'

// =====================================================
//  src/app/(dashboard)/kirishima/line-consultation/page.tsx
//  霧島市 住民LINE相談管理 — Sprint #87
//
//  ■ このページの役割
//    霧島市の住民からLINEで届いた相談を職員が一覧確認し、
//    対応状況（未対応→対応中→完了）を画面から更新できる。
//    Notionの LINE相談ログDB（霧島市フィルター）と連携する。
//
//  ■ 機能概要
//    - サマリーカード: 未対応件数・対応中・完了率を一目で確認
//    - フィルタータブ: 全件/未対応/対応中/エスカレーション/完了
//    - 相談カード: タイトル・種別・内容・対応状況変更ドロップダウン
//    - 回答・担当入力: 担当職員名・回答内容を記録できる
//
//  ■ 注意
//    municipalityId は 'kirishima' 固定（セレクター不要）
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'

// ─── 霧島市固有の自治体ID（固定値） ─────────────────────
const MUNICIPALITY_ID = 'kirishima'

// ─── 型定義 ──────────────────────────────────────────

/** LINE相談1件の型（APIレスポンス） */
interface ConsultationRecord {
  id:           string
  title:        string
  content:      string
  category:     string
  channel:      string
  status:       string
  answer:       string
  staffName:    string
  department:   string
  aiResult:     string
  anonymousId:  string
  receivedAt:   string
  satisfaction: number
}

/** サマリー統計の型 */
interface Summary {
  total:           number
  unhandledCount:  number
  inProgressCount: number
  completedCount:  number
  escalatedCount:  number
  completionRate:  number
}

// ─── 定数・設定 ──────────────────────────────────────

/** フィルタータブの定義 */
const FILTER_TABS = [
  { key: '',              label: '全件',               emoji: '📋' },
  { key: '未対応',        label: '未対応',             emoji: '🔴' },
  { key: '対応中',        label: '対応中',             emoji: '🟡' },
  { key: 'エスカレーション', label: 'エスカレーション', emoji: '🔶' },
  { key: '完了',          label: '完了',               emoji: '✅' },
]

/** 対応状況の選択肢 */
const STATUS_OPTIONS = ['未対応', '対応中', '完了', 'エスカレーション']

/** 担当部署の選択肢（霧島市向け） */
const DEPARTMENT_OPTIONS = [
  '市民課', '総務課', '福祉課', '財政課',
  '情報政策課', '教育委員会', '観光課', '農林水産課', '建設課',
]

/** 対応状況のバッジスタイル（色分け） */
function statusStyle(status: string) {
  switch (status) {
    case '未対応':
      return 'bg-red-100 text-red-700 border-red-200'
    case '対応中':
      return 'bg-amber-100 text-amber-700 border-amber-200'
    case '完了':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'エスカレーション':
      return 'bg-orange-100 text-orange-700 border-orange-200'
    default:
      return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

/** 相談種別のバッジスタイル */
function categoryStyle(category: string) {
  switch (category) {
    case '住民サービス':   return 'bg-blue-50 text-blue-600'
    case '手続き・申請':  return 'bg-purple-50 text-purple-600'
    case 'インフラ・施設': return 'bg-orange-50 text-orange-600'
    case '観光・移住':    return 'bg-green-50 text-green-600'
    default:              return 'bg-slate-50 text-slate-500'
  }
}

// ─── サマリーカードコンポーネント ─────────────────────

function SummaryCard({
  icon, label, value, sub, color
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  color: string
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

// ─── 相談カードコンポーネント ─────────────────────────

/**
 * 相談1件を表示するカード。
 * 対応状況・回答内容・担当職員名を直接変更できる。
 */
function ConsultationCard({
  record,
  onUpdate,
}: {
  record: ConsultationRecord
  onUpdate: (id: string, updates: Partial<ConsultationRecord>) => Promise<void>
}) {
  const [editStatus,     setEditStatus]     = useState(record.status)
  const [editAnswer,     setEditAnswer]     = useState(record.answer)
  const [editStaffName,  setEditStaffName]  = useState(record.staffName)
  const [editDepartment, setEditDepartment] = useState(record.department)
  const [saving,         setSaving]         = useState(false)
  const [saved,          setSaved]          = useState(false)
  const [expanded,       setExpanded]       = useState(false)

  // 変更があるか判定
  const hasChanges =
    editStatus     !== record.status     ||
    editAnswer     !== record.answer     ||
    editStaffName  !== record.staffName  ||
    editDepartment !== record.department

  const handleSave = async () => {
    setSaving(true)
    await onUpdate(record.id, {
      status:     editStatus,
      answer:     editAnswer,
      staffName:  editStaffName,
      department: editDepartment,
    })
    setSaving(false)
    setSaved(true)
    // 2秒後に「保存済み」表示を消す
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className={`bg-white rounded-xl border shadow-sm overflow-hidden transition-all ${
      editStatus === '未対応' ? 'border-red-200' :
      editStatus === 'エスカレーション' ? 'border-orange-300' :
      'border-slate-200'
    }`}>
      {/* カードヘッダー */}
      <div className="px-4 py-3 flex items-start gap-3">
        {/* 対応状況バッジ */}
        <span className={`inline-flex shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusStyle(editStatus)}`}>
          {editStatus}
        </span>

        {/* タイトルと基本情報 */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-slate-800 text-sm truncate">{record.title}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            {record.category && (
              <span className={`text-xs px-2 py-0.5 rounded-md font-medium ${categoryStyle(record.category)}`}>
                {record.category}
              </span>
            )}
            <span className="text-xs text-slate-400">
              {record.channel || '住民LINE'}
            </span>
            {record.receivedAt && (
              <span className="text-xs text-slate-400">
                📅 {record.receivedAt.slice(0, 10)}
              </span>
            )}
            {record.department && (
              <span className="text-xs text-slate-500">
                🏢 {record.department}
              </span>
            )}
          </div>
        </div>

        {/* 展開/折りたたみボタン */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="text-slate-400 hover:text-slate-600 text-xs px-2 py-1 rounded border border-slate-200 shrink-0"
        >
          {expanded ? '閉じる' : '対応'}
        </button>
      </div>

      {/* 相談内容（展開時） */}
      {expanded && (
        <div className="px-4 pb-4 space-y-3 border-t border-slate-100 pt-3">

          {/* 相談内容 */}
          {record.content && (
            <div className="bg-slate-50 rounded-lg p-3">
              <p className="text-xs font-medium text-slate-500 mb-1">💬 相談内容</p>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{record.content}</p>
            </div>
          )}

          {/* AI振り分け結果 */}
          {record.aiResult && (
            <div className="bg-teal-50 rounded-lg p-3">
              <p className="text-xs font-medium text-teal-600 mb-1">🤖 AI振り分け結果</p>
              <p className="text-sm text-teal-700">{record.aiResult}</p>
            </div>
          )}

          {/* 対応操作パネル */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {/* 対応状況変更 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                対応状況を変更
              </label>
              <select
                value={editStatus}
                onChange={e => setEditStatus(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
              >
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* 担当職員名 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                担当職員名
              </label>
              <input
                type="text"
                value={editStaffName}
                onChange={e => setEditStaffName(e.target.value)}
                placeholder="例: 田中 花子"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300"
              />
            </div>

            {/* 担当部署 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                担当部署
              </label>
              <select
                value={editDepartment}
                onChange={e => setEditDepartment(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
              >
                <option value="">-- 選択 --</option>
                {DEPARTMENT_OPTIONS.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>
          </div>

          {/* 回答内容 */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              回答内容（住民への回答を記録）
            </label>
            <textarea
              value={editAnswer}
              onChange={e => setEditAnswer(e.target.value)}
              placeholder="住民への回答・対応内容をメモしてください"
              rows={3}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 resize-none"
            />
          </div>

          {/* 保存ボタン */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving || !hasChanges}
              className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium hover:bg-teal-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {saving ? '保存中…' : '💾 Notionに保存'}
            </button>
            {saved && (
              <span className="text-sm text-emerald-600 font-medium">✅ 保存しました</span>
            )}
            {!hasChanges && !saved && (
              <span className="text-xs text-slate-400">変更なし</span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function KirishimaLineConsultationPage() {
  // ── State ──
  const [records,      setRecords]      = useState<ConsultationRecord[]>([])
  const [summary,      setSummary]      = useState<Summary | null>(null)
  const [activeFilter, setActiveFilter] = useState<string>('')
  const [fetching,     setFetching]     = useState(true)
  const [updateMsg,    setUpdateMsg]    = useState<{ text: string; ok: boolean } | null>(null)

  // ── データ取得（霧島市固定のmunicipalityId でフィルタリング）──
  const fetchData = useCallback(async (status?: string) => {
    setFetching(true)
    try {
      // 全件サマリー取得
      const summaryRes = await fetch(`/api/line-consultation?municipalityId=${MUNICIPALITY_ID}`)
      const summaryData = await summaryRes.json()
      if (!summaryData.error) {
        setSummary(summaryData.summary ?? null)
      }

      // フィルタリングした一覧取得
      const url = status
        ? `/api/line-consultation?municipalityId=${MUNICIPALITY_ID}&status=${encodeURIComponent(status)}`
        : `/api/line-consultation?municipalityId=${MUNICIPALITY_ID}`
      const res  = await fetch(url)
      const data = await res.json()
      if (!data.error) {
        setRecords(data.records ?? [])
      }
    } catch {
      // 取得失敗時はサイレントに処理
    } finally {
      setFetching(false)
    }
  }, [])

  // 初回・フィルター変更時にデータ取得
  useEffect(() => {
    fetchData(activeFilter || undefined)
  }, [activeFilter, fetchData])

  // ── 対応状況更新 ──
  const handleUpdate = async (
    id: string,
    updates: Partial<ConsultationRecord>
  ) => {
    try {
      const res  = await fetch('/api/line-consultation', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ id, ...updates }),
      })
      const data = await res.json()
      if (data.error) {
        setUpdateMsg({ text: data.error, ok: false })
      } else {
        setUpdateMsg({ text: data.message, ok: true })
        // レコードをローカルで即時反映
        setRecords(prev => prev.map(r =>
          r.id === id ? { ...r, ...updates } : r
        ))
        setTimeout(() => setUpdateMsg(null), 3000)
      }
    } catch {
      setUpdateMsg({ text: 'ネットワークエラーが発生しました', ok: false })
    }
  }

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            💬 住民LINE相談 — 霧島市 職員対応管理
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            霧島市 — 住民からのLINE相談を確認し、対応状況・回答内容をNotionに記録します
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
              🏙️ 霧島市 RunWith — Sprint #87
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              📊 Notion LINE相談ログ DB に蓄積
            </span>
          </div>
        </div>

        {/* ── サマリーカード（4枚） ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon="🔴"
            label="未対応"
            value={fetching ? '…' : summary?.unhandledCount ?? 0}
            sub="件（要対応）"
            color={
              (summary?.unhandledCount ?? 0) > 0
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-white border-slate-200 text-slate-700'
            }
          />
          <SummaryCard
            icon="🟡"
            label="対応中"
            value={fetching ? '…' : summary?.inProgressCount ?? 0}
            sub="件"
            color="bg-amber-50 border-amber-200 text-amber-700"
          />
          <SummaryCard
            icon="✅"
            label="完了率"
            value={fetching ? '…' : `${summary?.completionRate ?? 0}%`}
            sub={`完了 ${summary?.completedCount ?? 0}件`}
            color="bg-emerald-50 border-emerald-200 text-emerald-700"
          />
          <SummaryCard
            icon="📋"
            label="総相談件数"
            value={fetching ? '…' : summary?.total ?? 0}
            sub="件"
            color="bg-white border-slate-200 text-slate-700"
          />
        </div>

        {/* ── グローバルメッセージ ── */}
        {updateMsg && (
          <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
            updateMsg.ok
              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {updateMsg.ok ? '✅ ' : '❌ '}{updateMsg.text}
          </div>
        )}

        {/* ── フィルタータブ ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-1 flex gap-1 overflow-x-auto">
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveFilter(tab.key)}
              className={`flex-1 min-w-max px-3 py-2 rounded-xl text-xs font-medium transition-all whitespace-nowrap ${
                activeFilter === tab.key
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              {tab.emoji} {tab.label}
            </button>
          ))}
        </div>

        {/* ── 相談一覧 ── */}
        <div className="space-y-3">
          {fetching ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-sm text-slate-400">読み込み中…</p>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center">
              <p className="text-2xl mb-2">💬</p>
              <p className="text-sm font-medium text-slate-600 mb-1">
                {activeFilter ? `「${activeFilter}」の相談はありません` : '相談がまだありません'}
              </p>
              <p className="text-xs text-slate-400">
                住民からLINEで相談が届くとここに表示されます
              </p>
            </div>
          ) : (
            <>
              <p className="text-xs text-slate-500 px-1">
                {activeFilter ? `「${activeFilter}」` : '全件'} — {records.length}件
              </p>
              {records.map(record => (
                <ConsultationCard
                  key={record.id}
                  record={record}
                  onUpdate={handleUpdate}
                />
              ))}
            </>
          )}
        </div>

        {/* ── 運用ガイドバナー ── */}
        <div className="bg-teal-50 rounded-2xl border border-teal-200 p-4">
          <p className="text-xs font-semibold text-teal-600 mb-2">
            🏙️ 霧島市 住民接点の完成に向けて
          </p>
          <p className="text-sm text-teal-700 leading-relaxed">
            このページは<strong>LINE相談ログDB（霧島市フィルター）</strong>のデータをもとに表示されています。
            住民からのLINE相談はNotionフォームで受け付け、職員はこの画面で対応状況を管理します。
            蓄積された相談データはAI顧問の分析にも活用されます。
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href="/kirishima/management-dashboard"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-teal-100 text-teal-700 hover:bg-teal-200 transition-colors border border-teal-200"
            >
              📊 経営ダッシュボードで相談トレンドを分析
            </Link>
            <Link
              href="/gyosei/dashboard?municipalityId=kirishima"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-teal-700 hover:bg-teal-50 transition-colors border border-teal-200"
            >
              🌱 WBダッシュボードへ
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
