'use client'

// =====================================================
//  src/app/(dashboard)/ai-advisor/page.tsx
//  AI Well-Being顧問 チャット画面
//
//  ■ このページの役割
//    「左で蓄積したデータを右でAI分析する」体験を実現する核心ページ。
//    Notionに蓄積されたSDL学習ログ・IT運用データをAIが読み取り、
//    自治体のWell-Being向上に向けた具体的な提言をチャット形式で表示する。
//
//  ■ 技術ポイント
//    - 'use client' で React Hooks（useState, useRef, useEffect）を使用
//    - /api/ai-advisor に POST してAI回答を取得
//    - conversationHistory を保持して会話の文脈を維持する
// =====================================================

import { useState, useRef, useEffect } from 'react'

// ─── 型定義 ──────────────────────────────────────────

/** チャットメッセージ1件の型 */
interface Message {
  role: 'user' | 'assistant'  // 送信者（ユーザー or AI）
  content: string              // メッセージ本文
}

/** APIから返ってくるデータ件数の型 */
interface DataStats {
  learningLogLines: number     // 学習ログの参照件数
  platformRecordLines: number  // プラットフォーム記録の参照件数
}

// ─── 定数 ────────────────────────────────────────────

/**
 * サンプル質問ボタンのリスト
 * 自治体担当者が「何を聞けばいいか」迷わないよう典型的な質問を用意
 */
const SAMPLE_QUESTIONS = [
  '蓄積データから、この自治体の強みと弱みを教えてください',
  'SDL共創軸を高めるために、明日から取り組める施策を提案してください',
  '人口減少が進む中で、住民Well-Beingを維持するための優先課題は何ですか？',
  '職員の負担を増やさずにサービス品質を向上させるアイデアはありますか？',
  'クラウド障害に強い運用体制を作るには何から始めればよいですか？',
]

/** AIの最初のあいさつメッセージ */
const INITIAL_MESSAGE: Message = {
  role: 'assistant',
  content:
    'こんにちは！**RunWith Well-Being顧問AI**です。\n\n' +
    'このプラットフォームに蓄積されたデータ（エクセレントサービスゲームの学習ログ、' +
    'IT運用診断結果、クラウド監視ログ）を参照しながら、' +
    'あなたの自治体のWell-Being向上に向けた具体的な提言をお伝えします。\n\n' +
    'どのようなことでも気軽にご質問ください。',
}

// ─── メインコンポーネント ─────────────────────────────

export default function AIAdvisorPage() {
  // ── State: 画面表示用のチャット履歴 ──
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE])

  // ── State: API呼び出し用の会話履歴（システムプロンプトは含まない）
  const [conversationHistory, setConversationHistory] = useState<Message[]>([])

  // ── State: テキスト入力欄の値 ──
  const [inputText, setInputText] = useState('')

  // ── State: AI回答待ち中かどうか ──
  const [isLoading, setIsLoading] = useState(false)

  // ── State: 参照したデータ件数（バッジ表示用）──
  const [dataStats, setDataStats] = useState<DataStats | null>(null)

  // ── Ref: チャット末尾への自動スクロール用 ──
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // メッセージが増えるたびに最下部へスクロール
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // ─────────────────────────────────────────────────
  //  メッセージ送信処理
  //  1. ユーザーメッセージを画面に表示
  //  2. /api/ai-advisor を呼び出す
  //  3. AI回答を画面に表示し、会話履歴を更新
  // ─────────────────────────────────────────────────
  const sendMessage = async (text: string) => {
    // 空文字またはローディング中は無視
    if (!text.trim() || isLoading) return

    const userMessage = text.trim()
    setInputText('')      // 入力欄をクリア
    setIsLoading(true)    // ローディング開始

    // ユーザーのメッセージをチャット画面に追加
    setMessages(prev => [...prev, { role: 'user', content: userMessage }])

    try {
      // APIルートを呼び出し（Notionデータ取得 + Claude API呼び出しはサーバー側で行う）
      const res = await fetch('/api/ai-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          conversationHistory, // 過去の会話履歴を渡して文脈を維持
        }),
      })

      const data = await res.json()

      if (data.error) {
        // エラー時はエラーメッセージをAI発言として表示
        setMessages(prev => [
          ...prev,
          { role: 'assistant', content: `エラーが発生しました: ${data.error}` },
        ])
      } else {
        // AI回答をチャット画面に追加
        setMessages(prev => [...prev, { role: 'assistant', content: data.reply }])

        // 次回のリクエストのために会話履歴を更新
        setConversationHistory(data.updatedHistory)

        // データ参照件数バッジを更新
        if (data.dataStats) setDataStats(data.dataStats)
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'ネットワークエラーが発生しました。もう一度お試しください。',
        },
      ])
    } finally {
      setIsLoading(false) // ローディング終了
    }
  }

  // ─────────────────────────────────────────────────
  //  AIメッセージのテキストを簡易マークダウン変換
  //  **太字** → <strong>、\n → <br> に変換して表示
  // ─────────────────────────────────────────────────
  const formatMessage = (content: string) => {
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
  }

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-4">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                🤖 AI Well-Being顧問
              </h1>
              <p className="text-sm text-slate-500 mt-1">
                蓄積データをもとに、あなたの自治体のWell-Being向上を提言します
              </p>
            </div>

            {/* データ参照状況バッジ（最初の回答後に表示） */}
            {dataStats && (
              <div className="flex gap-2 flex-wrap">
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-sky-50 text-sky-700 border border-sky-200">
                  📚 学習ログ {dataStats.learningLogLines}件参照
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium bg-orange-50 text-orange-700 border border-orange-200">
                  📊 診断・監視 {dataStats.platformRecordLines}件参照
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ── SDL五軸インフォカード ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            📐 分析の視点：SDL価値共創 五軸
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '共創', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              { label: '文脈', color: 'bg-blue-50 text-blue-700 border-blue-200' },
              { label: '資源', color: 'bg-green-50 text-green-700 border-green-200' },
              { label: '統合', color: 'bg-amber-50 text-amber-700 border-amber-200' },
              { label: '価値', color: 'bg-rose-50 text-rose-700 border-rose-200' },
            ].map(axis => (
              <span
                key={axis.label}
                className={`px-3 py-1 rounded-full text-xs font-medium border ${axis.color}`}
              >
                {axis.label}軸
              </span>
            ))}
            <span className="text-xs text-slate-400 self-center ml-1">
              原浦龍典教授（東京大学）モデル準拠
            </span>
          </div>
        </div>

        {/* ── チャットエリア ── */}
        <div
          className="bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col"
          style={{ height: 'calc(100vh - 400px)', minHeight: '380px' }}
        >
          {/* メッセージ一覧（スクロール可能） */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-br-sm'         // ユーザー: 右側・紫
                      : 'bg-slate-100 text-slate-800 rounded-bl-sm border border-slate-200' // AI: 左側・グレー
                  }`}
                >
                  {msg.role === 'assistant' ? (
                    // AIメッセージ: HTMLとして描画（太字・改行を反映）
                    <span
                      dangerouslySetInnerHTML={{ __html: formatMessage(msg.content) }}
                    />
                  ) : (
                    // ユーザーメッセージ: テキストとしてそのまま表示
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {/* AI回答待ちのローディングアニメーション */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-100 border border-slate-200 rounded-2xl rounded-bl-sm px-4 py-3">
                  <div className="flex gap-1 items-center">
                    {/* 3つの点が順番に跳ねるアニメーション */}
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="text-xs text-slate-400 ml-2">データを分析中…</span>
                  </div>
                </div>
              </div>
            )}

            {/* チャット末尾へのスクロール位置マーカー */}
            <div ref={messagesEndRef} />
          </div>

          {/* テキスト入力エリア */}
          <div className="border-t border-slate-200 p-3">
            <div className="flex gap-2">
              <input
                type="text"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={e => {
                  // Enterキーで送信（Shift+Enterは改行として無視）
                  if (e.key === 'Enter' && !e.shiftKey) sendMessage(inputText)
                }}
                placeholder="質問を入力してください…"
                disabled={isLoading}
                className="flex-1 px-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 focus:border-transparent disabled:bg-slate-50 disabled:text-slate-400"
              />
              <button
                onClick={() => sendMessage(inputText)}
                disabled={isLoading || !inputText.trim()}
                className="px-4 py-2 rounded-xl bg-purple-600 text-white text-sm font-medium hover:bg-purple-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
              >
                送信
              </button>
            </div>
          </div>
        </div>

        {/* ── サンプル質問ボタン群 ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
          <p className="text-xs font-semibold text-slate-500 mb-2">
            💡 よく使われる質問（タップで送信）
          </p>
          <div className="flex flex-wrap gap-2">
            {SAMPLE_QUESTIONS.map((q, idx) => (
              <button
                key={idx}
                onClick={() => sendMessage(q)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl text-xs border border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-left"
              >
                {q}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}
