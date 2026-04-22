'use client'

// Personal Coarc チャット画面
// Notionプロフィールを参照しながらAIが由美子さんにパーソナライズ回答を返す

import { useState, useEffect, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Message = {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

// サジェスト質問（最初の話しかけのきっかけ）
const SUGGESTIONS = [
  '今日の体調について相談したい',
  '家計の節約、何から始めればいい？',
  '睡眠をよくするには？',
  '今週やるべきことを整理して',
]

function ChatContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [notionPageId, setNotionPageId] = useState('')
  const [userName, setUserName] = useState('あなた')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  // URLパラメータまたはlocalStorageからセッション情報を取得
  useEffect(() => {
    const t = searchParams.get('token') ?? localStorage.getItem('pc_token') ?? ''
    const pid = searchParams.get('pageId') ?? localStorage.getItem('pc_pageId') ?? ''
    const name = localStorage.getItem('pc_name') ?? 'あなた'
    if (!t || !pid) {
      // 情報がなければjoinページへ
      router.push('/personal-coarc/join')
      return
    }
    setToken(t)
    setNotionPageId(pid)
    setUserName(name)

    // 最初の挨拶メッセージ
    setMessages([
      {
        role: 'assistant',
        content: `こんにちは、${name}さん！😊\nあなた専用のAIアシスタントです。\n困っていることや相談したいことを何でも話しかけてください。`,
        timestamp: now(),
      },
    ])
  }, [searchParams, router])

  // 新しいメッセージが追加されたら下へスクロール
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  function now() {
    return new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return
    const userMsg: Message = { role: 'user', content: text.trim(), timestamp: now() }
    const history = messages.map(m => ({ role: m.role, content: m.content }))
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/personal-coarc/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, notionPageId, message: text.trim(), history }),
      })
      const data = await res.json() as { reply?: string; error?: string }
      if (!res.ok) throw new Error(data.error ?? 'AIの応答に失敗しました')
      setMessages(prev => [
        ...prev,
        { role: 'assistant', content: data.reply ?? '', timestamp: now() },
      ])
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '通信エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-b from-purple-50 to-white">
      {/* ヘッダー */}
      <div className="bg-white border-b border-purple-100 px-4 py-3 flex items-center gap-3 shadow-sm">
        <div className="w-10 h-10 rounded-2xl bg-purple-600 flex items-center justify-center text-xl shadow-md">
          🤖
        </div>
        <div className="flex-1">
          <h1 className="text-sm font-bold text-slate-800">{userName}さんのAIアシスタント</h1>
          <p className="text-xs text-purple-500">Personal Coarc · あなた専用</p>
        </div>
        <a
          href={`https://notion.so`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-slate-400 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-100"
        >
          📋 記録を見る
        </a>
      </div>

      {/* メッセージエリア */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-sm mr-2 mt-1 flex-shrink-0">
                🤖
              </div>
            )}
            <div className={`max-w-[78%] ${msg.role === 'user' ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
              <div
                className={`px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-purple-600 text-white rounded-tr-sm'
                    : 'bg-white text-slate-700 border border-purple-100 rounded-tl-sm shadow-sm'
                }`}
              >
                {msg.content}
              </div>
              <span className="text-xs text-slate-300 px-1">{msg.timestamp}</span>
            </div>
          </div>
        ))}

        {/* ローディング */}
        {loading && (
          <div className="flex justify-start">
            <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center text-sm mr-2 flex-shrink-0">
              🤖
            </div>
            <div className="bg-white border border-purple-100 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
              <div className="flex gap-1 items-center h-5">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="text-center text-xs text-red-400 bg-red-50 rounded-xl py-2 px-4">
            ⚠️ {error}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* サジェスト（最初のみ表示） */}
      {messages.length <= 1 && (
        <div className="px-4 pb-2">
          <p className="text-xs text-slate-400 mb-2">💬 よく使われる相談</p>
          <div className="flex flex-wrap gap-2">
            {SUGGESTIONS.map(s => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="text-xs bg-white border border-purple-100 text-purple-600 px-3 py-1.5 rounded-xl hover:bg-purple-50 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 入力エリア */}
      <div className="bg-white border-t border-slate-100 px-4 py-3 shadow-lg">
        <div className="flex gap-2 items-end">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="相談したいことを入力... (Enter で送信)"
            rows={1}
            className="flex-1 px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none"
            style={{ maxHeight: '120px' }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            className="w-12 h-12 rounded-2xl bg-purple-600 text-white flex items-center justify-center shadow-md shadow-purple-200 disabled:opacity-40 transition-transform active:scale-95 flex-shrink-0"
          >
            {loading ? '⏳' : '➤'}
          </button>
        </div>
        <p className="text-center text-xs text-slate-300 mt-2">
          会話はNotionに自動保存されます
        </p>
      </div>
    </div>
  )
}

export default function PersonalCoarcChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">読み込み中...</div>}>
      <ChatContent />
    </Suspense>
  )
}
