'use client'

// =====================================================
//  src/app/(dashboard)/staff/line/page.tsx
//  LINE業務対応 — AI返答提案付き職員対応画面（Sprint #25）
//
//  ■ このページの役割
//    住民からのLINE相談一覧を左パネルで確認し、
//    選択した相談に対してAIが返答案を即時生成する。
//    職員は生成された返答案を確認・編集してNotionに保存できる。
//
//  ■ AI返答提案の仕組み
//    /api/chat に相談内容と専用システムプロンプトを送り、
//    屋久島町の行政スタイルに合った丁寧な返答案を生成する。
//
//  ■ データフロー
//    Notion LINE相談ログDB → /api/line-consultation (GET)
//    → 一覧表示 → AI返答案生成（/api/chat）
//    → 編集 → /api/line-consultation (PATCH) → Notionに保存
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// ─── 型定義 ──────────────────────────────────────────

/** LINE相談1件の型 */
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

// ─── 定数 ────────────────────────────────────────────

/** AIが使う：屋久島町LINE返答専用システムプロンプト */
const LINE_REPLY_SYSTEM_PROMPT = `あなたは屋久島町の行政職員向けLINE返答支援AIです。
住民からのLINE相談内容を見て、職員が送るための返答案を作成してください。

【返答作成のルール】
- 丁寧語・敬語を使い、温かみのあるトーンで（堅すぎず、でも親切に）
- 200字以内で簡潔にまとめる
- 必要な手続き・窓口・電話番号があれば含める
- 「いつもお問い合わせありがとうございます」などの書き出しを自然につける
- 屋久島町の特性（離島・観光地・高齢者多め）を意識する
- 追加情報が必要な場合は「折り返しご連絡します」と明示

【返答のみを出力】説明や前置きは不要。すぐに返答本文だけを出力してください。`

/** フィルタータブ */
const FILTER_TABS = [
  { key: '',       label: 'すべて',           emoji: '📋' },
  { key: '未対応', label: '未対応',           emoji: '🔴' },
  { key: '対応中', label: '対応中',           emoji: '🟡' },
  { key: '完了',   label: '完了',             emoji: '✅' },
]

/** 対応状況のスタイル */
function statusStyle(status: string) {
  switch (status) {
    case '未対応':        return 'bg-red-100 text-red-700 border-red-200'
    case '対応中':        return 'bg-amber-100 text-amber-700 border-amber-200'
    case '完了':          return 'bg-emerald-100 text-emerald-700 border-emerald-200'
    case 'エスカレーション': return 'bg-orange-100 text-orange-700 border-orange-200'
    default:             return 'bg-slate-100 text-slate-600 border-slate-200'
  }
}

// ─── メインコンポーネント ─────────────────────────────

export default function StaffLinePage() {

  // ── 一覧パネルの状態 ──
  const [records,      setRecords]      = useState<ConsultationRecord[]>([])
  const [activeFilter, setActiveFilter] = useState('')
  const [fetching,     setFetching]     = useState(true)
  const [selected,     setSelected]     = useState<ConsultationRecord | null>(null)

  // ── 対応パネルの状態 ──
  const [aiReply,      setAiReply]      = useState('')      // AI生成の返答案
  const [editedReply,  setEditedReply]  = useState('')      // 職員が編集した返答
  const [generating,   setGenerating]   = useState(false)   // AI生成中フラグ
  const [staffName,    setStaffName]    = useState('')      // 担当者名
  const [saveStatus,   setSaveStatus]   = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')

  // ── データ取得 ──
  const fetchRecords = useCallback(async (statusFilter?: string) => {
    setFetching(true)
    try {
      const url = statusFilter
        ? `/api/line-consultation?status=${encodeURIComponent(statusFilter)}`
        : '/api/line-consultation'
      const res  = await fetch(url)
      const data = await res.json()
      if (!data.error) setRecords(data.records ?? [])
    } catch {
      // サイレント処理
    } finally {
      setFetching(false)
    }
  }, [])

  useEffect(() => {
    fetchRecords(activeFilter || undefined)
  }, [activeFilter, fetchRecords])

  // 相談を選択したとき、AIの返答案・編集欄をリセット
  const handleSelect = (record: ConsultationRecord) => {
    setSelected(record)
    setAiReply('')
    setEditedReply(record.answer || '')
    setSaveStatus('idle')
  }

  // ── AI返答案を生成 ──
  const handleGenerateAI = async () => {
    if (!selected) return
    setGenerating(true)
    setAiReply('')

    try {
      // 相談内容をプロンプトに含めてAIに送る
      const userMessage = `以下の住民からのLINE相談に対する返答案を作成してください。\n\n【相談タイトル】${selected.title}\n【相談内容】${selected.content || '（内容の記録なし）'}\n【カテゴリ】${selected.category || '未分類'}`

      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:      userMessage,
          systemPrompt: LINE_REPLY_SYSTEM_PROMPT,
        }),
      })
      const data = await res.json()
      if (data.reply) {
        setAiReply(data.reply)
        // AI案をそのまま編集欄にも入れる（職員が上書き可能）
        setEditedReply(data.reply)
      } else {
        setAiReply('（AI返答案の生成に失敗しました。もう一度お試しください）')
      }
    } catch {
      setAiReply('（ネットワークエラーが発生しました）')
    } finally {
      setGenerating(false)
    }
  }

  // ── Notionに保存 ──
  const handleSave = async () => {
    if (!selected || !editedReply.trim()) return
    setSaveStatus('saving')
    try {
      const res = await fetch('/api/line-consultation', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          id:        selected.id,
          answer:    editedReply,
          status:    '対応中',
          staffName: staffName || selected.staffName,
        }),
      })
      const data = await res.json()
      if (data.error) {
        setSaveStatus('error')
      } else {
        setSaveStatus('saved')
        // 一覧のレコードも即時更新
        setRecords(prev => prev.map(r =>
          r.id === selected.id
            ? { ...r, answer: editedReply, status: '対応中', staffName: staffName || r.staffName }
            : r
        ))
        setTimeout(() => setSaveStatus('idle'), 3000)
      }
    } catch {
      setSaveStatus('error')
    }
  }

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col bg-slate-50">

      {/* ── ページヘッダー ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center text-lg">💬</div>
          <div>
            <h1 className="text-base font-bold text-slate-800">LINE業務対応 — AI返答提案</h1>
            <p className="text-xs text-slate-500">住民のLINE相談を選択 → AIが返答案を即時生成 → 編集してNotionに保存</p>
          </div>
        </div>
      </div>

      {/* ── 2カラムレイアウト ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ━━ 左パネル：相談一覧 ━━ */}
        <div className="w-72 flex-shrink-0 border-r border-slate-200 bg-white flex flex-col">

          {/* フィルタータブ */}
          <div className="p-2 border-b border-slate-100 flex gap-1">
            {FILTER_TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveFilter(tab.key)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  activeFilter === tab.key
                    ? 'bg-sky-600 text-white'
                    : 'text-slate-500 hover:bg-slate-100'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>

          {/* 相談リスト */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {fetching ? (
              <div className="p-4 text-center text-xs text-slate-400">読み込み中…</div>
            ) : records.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">相談がありません</div>
            ) : (
              records.map(record => (
                <button
                  key={record.id}
                  onClick={() => handleSelect(record)}
                  className={`w-full text-left px-3 py-3 hover:bg-slate-50 transition-colors ${
                    selected?.id === record.id ? 'bg-sky-50 border-l-2 border-sky-500' : ''
                  }`}
                >
                  {/* ステータスバッジ */}
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${statusStyle(record.status)}`}>
                      {record.status}
                    </span>
                    {record.category && (
                      <span className="text-xs text-slate-400 truncate">{record.category}</span>
                    )}
                  </div>
                  {/* タイトル */}
                  <p className="text-sm font-medium text-slate-700 leading-tight line-clamp-2">
                    {record.title}
                  </p>
                  {/* 受信日 */}
                  {record.receivedAt && (
                    <p className="text-xs text-slate-400 mt-1">
                      {record.receivedAt.slice(0, 10)}
                    </p>
                  )}
                </button>
              ))
            )}
          </div>

          {/* 件数表示 */}
          <div className="p-2 border-t border-slate-100 text-center">
            <span className="text-xs text-slate-400">{records.length} 件</span>
          </div>
        </div>

        {/* ━━ 右パネル：対応エリア ━━ */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {!selected ? (
            /* 未選択状態 */
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <p className="text-4xl mb-3">💬</p>
                <p className="text-slate-500 text-sm font-medium">左の一覧から相談を選んでください</p>
                <p className="text-slate-400 text-xs mt-1">AIが返答案を自動生成します</p>
              </div>
            </div>
          ) : (
            <>
              {/* ── 相談内容カード ── */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <h2 className="text-base font-bold text-slate-800">{selected.title}</h2>
                  <span className={`shrink-0 text-xs px-2.5 py-1 rounded-full border font-medium ${statusStyle(selected.status)}`}>
                    {selected.status}
                  </span>
                </div>

                {/* メタ情報 */}
                <div className="flex flex-wrap gap-3 text-xs text-slate-500 mb-3">
                  {selected.category && <span>📂 {selected.category}</span>}
                  {selected.channel  && <span>📱 {selected.channel}</span>}
                  {selected.receivedAt && <span>📅 受信: {selected.receivedAt.slice(0, 10)}</span>}
                  {selected.anonymousId && <span>👤 {selected.anonymousId}</span>}
                </div>

                {/* 相談本文 */}
                {selected.content ? (
                  <div className="bg-sky-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-sky-600 mb-1.5">📩 住民からのメッセージ</p>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{selected.content}</p>
                  </div>
                ) : (
                  <div className="bg-slate-50 rounded-lg p-3">
                    <p className="text-xs text-slate-400">（相談内容の詳細が記録されていません）</p>
                  </div>
                )}

                {/* AI振り分け結果 */}
                {selected.aiResult && (
                  <div className="mt-2 bg-violet-50 rounded-lg p-3">
                    <p className="text-xs font-semibold text-violet-600 mb-1">🤖 AI自動振り分け</p>
                    <p className="text-xs text-violet-700">{selected.aiResult}</p>
                  </div>
                )}
              </div>

              {/* ── AI返答案生成エリア ── */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-bold text-slate-700 flex items-center gap-2">
                    🤖 AI返答案を生成する
                  </h3>
                  <button
                    onClick={handleGenerateAI}
                    disabled={generating}
                    className="px-4 py-2 rounded-lg bg-sky-600 text-white text-xs font-bold hover:bg-sky-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 flex items-center gap-1.5"
                  >
                    {generating ? (
                      <>
                        <span className="inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        生成中…
                      </>
                    ) : (
                      <>✨ AI返答案を生成</>
                    )}
                  </button>
                </div>

                {/* AI生成結果の表示（生成済みの場合） */}
                {aiReply && (
                  <div className="mb-3 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <p className="text-xs font-semibold text-emerald-600 mb-1.5">✅ AIが生成した返答案（編集可能）</p>
                    <p className="text-xs text-emerald-700 whitespace-pre-wrap">{aiReply}</p>
                  </div>
                )}

                {!aiReply && !generating && (
                  <p className="text-xs text-slate-400 mb-3">
                    「AI返答案を生成」を押すと、相談内容をもとにAIが丁寧な返答案を作成します。
                  </p>
                )}
              </div>

              {/* ── 返答編集・保存エリア ── */}
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="text-sm font-bold text-slate-700">✍️ 返答内容を確認・編集して保存</h3>

                {/* 担当者名 */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">担当職員名</label>
                  <input
                    type="text"
                    value={staffName}
                    onChange={e => setStaffName(e.target.value)}
                    placeholder={selected.staffName || '例: 山田 太郎'}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300"
                  />
                </div>

                {/* 返答テキスト（編集可能） */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    返答内容
                    <span className="ml-1 text-slate-400 font-normal">（AI案を編集するか、直接入力してください）</span>
                  </label>
                  <textarea
                    value={editedReply}
                    onChange={e => setEditedReply(e.target.value)}
                    placeholder="住民への返答内容を入力してください…"
                    rows={6}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-sky-300 resize-none leading-relaxed"
                  />
                  <p className="text-xs text-slate-400 mt-1">{editedReply.length}文字</p>
                </div>

                {/* 保存ボタン */}
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || !editedReply.trim()}
                    className="px-5 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    {saveStatus === 'saving' ? '保存中…' : '💾 Notionに保存'}
                  </button>
                  {saveStatus === 'saved' && (
                    <span className="text-sm text-emerald-600 font-medium">✅ 保存しました</span>
                  )}
                  {saveStatus === 'error' && (
                    <span className="text-sm text-red-500">❌ 保存に失敗しました</span>
                  )}
                  {editedReply && (
                    <button
                      onClick={() => navigator.clipboard.writeText(editedReply)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      📋 コピー
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
