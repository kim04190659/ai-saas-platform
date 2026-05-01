'use client';

// =====================================================
//  src/app/portal/page.tsx
//  住民ポータル — 相談状況確認ページ — Sprint #82-B
//
//  ■ 役割
//    住民が LINE 相談後に「自分の相談がどうなっているか」を
//    自分で確認できる公開ページ。
//
//  ■ アクセス方法
//    - ダッシュボード認証不要（公開ページ）
//    - URLは /portal
//
//  ■ 操作の流れ
//    ① 住民が受付番号（匿名ID）を入力
//    ② 「確認する」ボタンを押す
//    ③ API に照会 → 相談の状況・回答を表示
// =====================================================

import { useState } from 'react'
import { Search, MessageSquare, CheckCircle, Clock, AlertCircle, HelpCircle } from 'lucide-react'

// ─── 型定義 ──────────────────────────────────────────

interface ConsultationStatus {
  found:       boolean
  status?:     string
  category?:   string
  receivedAt?: string
  answeredAt?: string
  answer?:     string
  department?: string
  error?:      string
}

// ─── ステータスに応じた表示設定 ──────────────────────

function getStatusConfig(status: string) {
  switch (status) {
    case '完了':
      return {
        icon:      <CheckCircle size={20} className="text-green-600" />,
        label:     '対応完了',
        badgeCls:  'bg-green-100 text-green-800',
        message:   '相談への対応が完了しました。回答をご確認ください。',
      }
    case '対応中':
      return {
        icon:      <Clock size={20} className="text-blue-600" />,
        label:     '対応中',
        badgeCls:  'bg-blue-100 text-blue-800',
        message:   '担当者が対応中です。回答が届くまでしばらくお待ちください。',
      }
    case 'エスカレーション':
      return {
        icon:      <AlertCircle size={20} className="text-orange-600" />,
        label:     '上位担当者へ引き継ぎ',
        badgeCls:  'bg-orange-100 text-orange-800',
        message:   '専門の担当者に引き継ぎました。改めてご連絡いたします。',
      }
    default: // 未対応
      return {
        icon:      <HelpCircle size={20} className="text-gray-500" />,
        label:     '受付済み・対応待ち',
        badgeCls:  'bg-gray-100 text-gray-700',
        message:   '相談を受け付けました。担当者が確認次第ご連絡します。',
      }
  }
}

// ─── 日時フォーマット ─────────────────────────────────

function formatDate(dateStr: string | undefined) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleString('ja-JP', {
    timeZone: 'Asia/Tokyo',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

// ─── メインコンポーネント ─────────────────────────────

export default function PortalPage() {
  // 入力された受付番号
  const [anonymousId, setAnonymousId] = useState('')
  // APIレスポンスの状態
  const [result,      setResult]      = useState<ConsultationStatus | null>(null)
  // ローディング中フラグ
  const [loading,     setLoading]     = useState(false)

  // ── 照会ボタンを押したときの処理 ─────────────────────
  const handleSearch = async () => {
    const trimmed = anonymousId.trim()
    if (!trimmed) return

    setLoading(true)
    setResult(null)

    try {
      const res  = await fetch(
        `/api/portal/consultation-status?anonymousId=${encodeURIComponent(trimmed)}`
      )
      const data = await res.json() as ConsultationStatus
      setResult(data)
    } catch {
      setResult({ found: false, error: '通信エラーが発生しました。しばらくしてから再度お試しください。' })
    } finally {
      setLoading(false)
    }
  }

  // Enter キーで照会できるようにする
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleSearch()
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">

      {/* ── ヘッダー ──────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-2xl mx-auto flex items-center gap-3">
          <div className="bg-blue-600 text-white rounded-lg p-2">
            <MessageSquare size={22} />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-800">RunWith 住民ポータル</h1>
            <p className="text-xs text-gray-500">相談状況の確認サービス</p>
          </div>
        </div>
      </header>

      {/* ── メインコンテンツ ───────────────────────────── */}
      <main className="max-w-2xl mx-auto px-4 py-10">

        {/* ── 説明文 ── */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            相談の状況を確認する
          </h2>
          <p className="text-gray-600 text-sm leading-relaxed">
            LINE でご相談いただいた際にお知らせした<br />
            <span className="font-semibold text-blue-600">受付番号</span>
            を入力してください。
          </p>
        </div>

        {/* ── 入力フォーム ── */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            受付番号（例: anon-yk-001）
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={anonymousId}
              onChange={e => setAnonymousId(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="受付番号を入力"
              className="flex-1 border border-gray-300 rounded-lg px-4 py-2.5 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <button
              onClick={handleSearch}
              disabled={loading || !anonymousId.trim()}
              className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white
                         rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Search size={16} />
              {loading ? '確認中...' : '確認する'}
            </button>
          </div>
        </div>

        {/* ── 結果表示 ── */}
        {result && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">

            {/* レコードが見つからない場合 */}
            {!result.found && (
              <div className="text-center py-4">
                <AlertCircle size={40} className="mx-auto text-gray-400 mb-3" />
                <p className="text-gray-600 font-medium">
                  {result.error ?? '該当する相談が見つかりませんでした。'}
                </p>
                <p className="text-gray-400 text-sm mt-1">
                  受付番号をご確認の上、再度お試しください。
                </p>
              </div>
            )}

            {/* レコードが見つかった場合 */}
            {result.found && result.status && (() => {
              const cfg = getStatusConfig(result.status)
              return (
                <div className="space-y-5">

                  {/* ステータスバッジ */}
                  <div className="flex items-center gap-3">
                    {cfg.icon}
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${cfg.badgeCls}`}>
                      {cfg.label}
                    </span>
                  </div>

                  {/* ステータスメッセージ */}
                  <p className="text-gray-700 text-sm bg-gray-50 rounded-lg px-4 py-3">
                    {cfg.message}
                  </p>

                  {/* 詳細情報 */}
                  <div className="divide-y divide-gray-100">
                    {result.category && (
                      <div className="py-3 flex justify-between text-sm">
                        <span className="text-gray-500">相談の種類</span>
                        <span className="font-medium text-gray-800">{result.category}</span>
                      </div>
                    )}
                    {result.receivedAt && (
                      <div className="py-3 flex justify-between text-sm">
                        <span className="text-gray-500">受付日時</span>
                        <span className="font-medium text-gray-800">{formatDate(result.receivedAt)}</span>
                      </div>
                    )}
                    {result.department && (
                      <div className="py-3 flex justify-between text-sm">
                        <span className="text-gray-500">担当部署</span>
                        <span className="font-medium text-gray-800">{result.department}</span>
                      </div>
                    )}
                    {result.answeredAt && (
                      <div className="py-3 flex justify-between text-sm">
                        <span className="text-gray-500">対応完了日</span>
                        <span className="font-medium text-gray-800">{formatDate(result.answeredAt)}</span>
                      </div>
                    )}
                  </div>

                  {/* 回答内容（対応中・完了の場合のみ表示） */}
                  {result.answer && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">担当者からの回答</p>
                      <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {result.answer}
                      </div>
                    </div>
                  )}

                </div>
              )
            })()}
          </div>
        )}

        {/* ── 注意書き ── */}
        <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
          受付番号は LINE でご相談いただいた際にお送りしたメッセージに記載されています。<br />
          ご不明な点は各自治体の窓口にお問い合わせください。
        </p>

      </main>
    </div>
  )
}
