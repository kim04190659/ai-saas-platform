'use client'

// =====================================================
//  src/app/(dashboard)/staff/ai-suggest/page.tsx
//  AI窓口即時提案 — 窓口職員向けリアルタイムAI対応支援（Sprint #25）
//
//  ■ このページの役割
//    窓口で住民が相談してきた内容を入力すると、
//    AIが即座に「担当課・必要書類・手続き手順・関連制度・費用・所要時間」を
//    構造化して提示する。職員が迷わず対応できるようにする。
//
//  ■ 使い方
//    ① 住民の相談内容を入力（よくある相談のクイックボタンも用意）
//    ② AIが分析して即時提案を表示
//    ③ 提案を見ながら住民に案内する
//    ④ 必要に応じてコピー／印刷して渡す
//
//  ■ AIへのリクエスト
//    /api/chat に専用システムプロンプトと住民の相談内容を送信し、
//    構造化されたMarkdown形式の回答を受け取る。
// =====================================================

import { useState, useRef } from 'react'

// ─── 型定義 ──────────────────────────────────────────

/** よくある相談のクイック入力テンプレート */
interface QuickTemplate {
  emoji:   string
  label:   string
  input:   string
  category: string
}

// ─── 定数 ────────────────────────────────────────────

/** 窓口AI専用システムプロンプト */
const COUNTER_AI_SYSTEM_PROMPT = `あなたは屋久島町の窓口業務支援AIです。
住民が窓口で相談している内容を職員が入力すると、職員向けに対応情報を即時提案します。

【必ず以下のフォーマットで回答してください】

## 📂 担当課
〇〇課（内線: XXX、または「確認が必要」）

## 📋 必要書類
- 書類1（なければ「なし」と記載）
- 書類2

## 📝 手続き手順
1. 最初にすること
2. 次にすること
3. 完了

## 💡 関連制度・補助金
該当する制度や補助金があれば記載。なければ「なし」

## ⏱️ 所要時間・費用
- 時間: 約〇〇分（窓口対応）
- 費用: 〇円（無料の場合は「無料」）

## ⚠️ 注意事項
対応で特に気をつけること。なければ省略可。

【回答ルール】
- 屋久島町の自治体業務に即した内容にする
- 不明な点は「△△課に確認が必要です」と記載する
- 専門用語は使わず、誰でも理解できる言葉で書く
- 高齢者・障害者・転入者など相談者の状況を考慮する
- 島の特性（離島・観光・世界遺産）を意識する`

/** よくある相談のクイックボタン一覧 */
const QUICK_TEMPLATES: QuickTemplate[] = [
  {
    emoji:    '🏠',
    label:    '転入届',
    category: '住民登録',
    input:    '他の市区町村から屋久島町に引っ越してきた方が転入届を出したいと言っています。',
  },
  {
    emoji:    '🏚️',
    label:    '転出届',
    category: '住民登録',
    input:    '屋久島町から他の市区町村に引っ越す予定の方が転出届を出したいと言っています。',
  },
  {
    emoji:    '📄',
    label:    '住民票の取得',
    category: '証明書',
    input:    '住民票の写しが必要だと言っています。何部必要かはまだ確認していません。',
  },
  {
    emoji:    '💳',
    label:    'マイナンバーカード',
    category: '証明書',
    input:    'マイナンバーカードを作りたいと言っています。何をすればいいか聞いています。',
  },
  {
    emoji:    '👴',
    label:    '介護認定申請',
    category: '福祉',
    input:    '高齢の家族の介護認定を申請したいと言っています。初めての申請です。',
  },
  {
    emoji:    '👶',
    label:    '出生届',
    category: '戸籍',
    input:    '赤ちゃんが生まれたので出生届を提出したいと言っています。',
  },
  {
    emoji:    '🏥',
    label:    '国保加入',
    category: '医療・健康保険',
    input:    '会社を辞めたので国民健康保険に加入したいと言っています。',
  },
  {
    emoji:    '🌿',
    label:    '移住相談',
    category: '移住・定住',
    input:    '屋久島に移住したいと考えていると言っています。支援制度や手続きについて知りたいそうです。',
  },
  {
    emoji:    '💰',
    label:    '給付金・補助金',
    category: '福祉',
    input:    '給付金や補助金について聞きたいと言っています。具体的にどんな制度があるか確認中です。',
  },
  {
    emoji:    '🗑️',
    label:    'ごみの捨て方',
    category: '環境・生活',
    input:    '引っ越してきたばかりで、ごみの分別や収集日を知りたいと言っています。',
  },
]

// ─── サブコンポーネント ───────────────────────────────

/** 提案結果をカード形式で表示するコンポーネント */
function SuggestionDisplay({ text }: { text: string }) {
  // Markdown風のテキストをセクション別に解析して表示する
  const sections = text.split('\n## ').filter(Boolean)

  if (sections.length <= 1) {
    // セクション分割できない場合はプレーンテキスト表示
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{text}</p>
      </div>
    )
  }

  const sectionStyles: Record<string, string> = {
    '📂 担当課':         'bg-blue-50   border-blue-200   text-blue-800',
    '📋 必要書類':       'bg-amber-50  border-amber-200  text-amber-800',
    '📝 手続き手順':     'bg-emerald-50 border-emerald-200 text-emerald-800',
    '💡 関連制度・補助金': 'bg-violet-50 border-violet-200 text-violet-800',
    '⏱️ 所要時間・費用':  'bg-slate-50  border-slate-200  text-slate-700',
    '⚠️ 注意事項':       'bg-red-50    border-red-200    text-red-800',
  }

  return (
    <div className="space-y-3">
      {sections.map((section, i) => {
        const firstNewline = section.indexOf('\n')
        const heading = (i === 0 ? section.split('\n')[0] : '## ' + section.split('\n')[0]).replace(/^## /, '')
        const body = firstNewline > -1 ? section.slice(firstNewline + 1).trim() : ''

        // heading に一致するスタイルを探す（絵文字込みキーで検索）
        const styleKey = Object.keys(sectionStyles).find(k => heading.includes(k.replace(/^[^\s]+\s/, '').slice(0, 4))) || heading
        const cardStyle = sectionStyles[heading] || 'bg-white border-slate-200 text-slate-700'

        return (
          <div key={i} className={`rounded-xl border p-4 ${cardStyle}`}>
            <p className="text-sm font-bold mb-2">{heading}</p>
            <p className="text-sm whitespace-pre-wrap leading-relaxed">{body}</p>
          </div>
        )
      })}
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function AiSuggestPage() {

  const [inputText,   setInputText]   = useState('')
  const [suggestion,  setSuggestion]  = useState('')
  const [generating,  setGenerating]  = useState(false)
  const [history,     setHistory]     = useState<{ input: string; output: string; timestamp: string }[]>([])
  const [activeTab,   setActiveTab]   = useState<'suggest' | 'history'>('suggest')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // ── AI提案を生成 ──
  const handleGenerate = async () => {
    if (!inputText.trim()) return
    setGenerating(true)
    setSuggestion('')

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          message:      `以下の住民相談に対して、対応手順を提案してください。\n\n【住民の相談内容】\n${inputText}`,
          systemPrompt: COUNTER_AI_SYSTEM_PROMPT,
        }),
      })
      const data = await res.json()
      const reply = data.reply || '（提案の生成に失敗しました。もう一度お試しください）'
      setSuggestion(reply)

      // 履歴に追加
      setHistory(prev => [{
        input:     inputText,
        output:    reply,
        timestamp: new Date().toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      }, ...prev].slice(0, 10)) // 最大10件保持

    } catch {
      setSuggestion('（ネットワークエラーが発生しました）')
    } finally {
      setGenerating(false)
    }
  }

  // クイックボタンをクリック
  const handleQuickTemplate = (template: QuickTemplate) => {
    setInputText(template.input)
    setSuggestion('')
    textareaRef.current?.focus()
  }

  // 入力クリア
  const handleClear = () => {
    setInputText('')
    setSuggestion('')
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── ページヘッダー ── */}
      <div className="bg-white border-b border-slate-200 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center text-lg">🤖</div>
          <div>
            <h1 className="text-base font-bold text-slate-800">AI窓口即時提案</h1>
            <p className="text-xs text-slate-500">住民の相談内容を入力 → AIが担当課・書類・手順を即時提案 → 住民に案内する</p>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-4">

        {/* ── タブ ── */}
        <div className="flex gap-2">
          <button
            onClick={() => setActiveTab('suggest')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'suggest'
                ? 'bg-emerald-600 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            🤖 AI提案
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'history'
                ? 'bg-slate-700 text-white'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            📋 対応履歴 {history.length > 0 && `(${history.length})`}
          </button>
        </div>

        {activeTab === 'suggest' && (
          <>
            {/* ── 入力エリア ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
              <h2 className="text-sm font-bold text-slate-700">
                📩 住民の相談内容を入力してください
              </h2>

              <textarea
                ref={textareaRef}
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder="例：「他の市から引っ越してきたので転入届を出したい。マイナンバーカードも持ってきました。」"
                rows={4}
                className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none leading-relaxed"
              />

              <div className="flex items-center gap-2">
                <button
                  onClick={handleGenerate}
                  disabled={generating || !inputText.trim()}
                  className="flex-1 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      AIが分析中…（数秒かかります）
                    </>
                  ) : (
                    <>✨ AI提案を生成する</>
                  )}
                </button>
                {inputText && (
                  <button
                    onClick={handleClear}
                    className="px-4 py-2.5 rounded-lg border border-slate-200 text-sm text-slate-500 hover:bg-slate-50"
                  >
                    クリア
                  </button>
                )}
              </div>
            </div>

            {/* ── よくある相談クイックボタン ── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
              <h2 className="text-xs font-bold text-slate-600 mb-3">
                ⚡ よくある相談（クリックで入力）
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                {QUICK_TEMPLATES.map(template => (
                  <button
                    key={template.label}
                    onClick={() => handleQuickTemplate(template)}
                    className="flex flex-col items-center gap-1 px-2 py-3 rounded-lg border border-slate-200 hover:bg-emerald-50 hover:border-emerald-200 transition-colors text-center"
                  >
                    <span className="text-xl">{template.emoji}</span>
                    <span className="text-xs font-medium text-slate-600">{template.label}</span>
                    <span className="text-xs text-slate-400">{template.category}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* ── AI提案結果 ── */}
            {suggestion && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h2 className="text-sm font-bold text-slate-700">
                    🤖 AI提案結果
                  </h2>
                  <div className="flex gap-2">
                    <button
                      onClick={() => navigator.clipboard.writeText(suggestion)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      📋 全文コピー
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 hover:bg-slate-50"
                    >
                      🖨️ 印刷
                    </button>
                  </div>
                </div>

                {/* 相談内容の確認 */}
                <div className="bg-slate-100 rounded-lg px-3 py-2">
                  <p className="text-xs text-slate-500 font-medium">【相談内容】</p>
                  <p className="text-xs text-slate-700 mt-0.5">{inputText}</p>
                </div>

                {/* 提案結果を構造化表示 */}
                <SuggestionDisplay text={suggestion} />

                {/* フィードバック */}
                <div className="bg-white rounded-xl border border-slate-200 p-3">
                  <p className="text-xs text-slate-500">
                    💡 提案内容は参考情報です。複雑なケースや判断が必要な場合は、上位の担当者に確認してください。
                  </p>
                </div>
              </div>
            )}

            {/* 初期状態のガイド */}
            {!suggestion && !generating && (
              <div className="bg-white rounded-xl border border-slate-200 p-6 text-center">
                <p className="text-3xl mb-2">🏛️</p>
                <p className="text-sm font-medium text-slate-600 mb-1">住民の相談内容を入力してください</p>
                <p className="text-xs text-slate-400">AIが担当課・必要書類・手続き手順を即座に提案します</p>
              </div>
            )}
          </>
        )}

        {/* ── 対応履歴タブ ── */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            {history.length === 0 ? (
              <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                <p className="text-slate-400 text-sm">まだ対応履歴がありません</p>
              </div>
            ) : (
              history.map((item, index) => (
                <div key={index} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-medium text-slate-600">対応 #{history.length - index} — {item.timestamp}</span>
                    <button
                      onClick={() => {
                        setInputText(item.input)
                        setSuggestion(item.output)
                        setActiveTab('suggest')
                      }}
                      className="text-xs text-emerald-600 hover:underline"
                    >
                      再表示
                    </button>
                  </div>
                  <div className="p-3">
                    <p className="text-xs text-slate-500 font-medium mb-1">相談内容</p>
                    <p className="text-xs text-slate-700 bg-slate-50 rounded p-2 line-clamp-2">{item.input}</p>
                  </div>
                </div>
              ))
            )}
            {history.length > 0 && (
              <div className="text-center">
                <button
                  onClick={() => setHistory([])}
                  className="text-xs text-slate-400 hover:text-slate-600 underline"
                >
                  履歴をクリア
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
