'use client'
// =====================================================
//  src/app/(dashboard)/gyosei/document-gen/page.tsx
//  AI政策文書生成ページ — Sprint #22
//
//  ■ このページの役割
//    蓄積データを元にAIが政策文書を自動生成する。
//    テンプレート選択 → 期間設定 → 生成 → コピー/保存
//    の流れで、議会向けレポートや政策提言書を数分で作成。
//
//  ■ 生成できる文書
//    1. 議会向け月次レポート
//    2. SDL政策提言書
//    3. 首長向けブリーフィング
//    4. 財政状況報告書
//    5. IT運用成熟度報告書
//    6. 類似自治体比較レポート
// =====================================================

import { useState } from 'react'

// ─── テンプレート定義 ─────────────────────────────────

const TEMPLATES = [
  {
    id:          'assembly_report',
    icon:        '🏛️',
    label:       '議会向け月次レポート',
    description: '住民サービス・財政・人口動態を議会議員向けにまとめた報告書',
    color:       'border-blue-200 bg-blue-50',
    activeColor: 'border-blue-500 bg-blue-100',
    badgeColor:  'bg-blue-100 text-blue-700',
    time:        '約30秒',
  },
  {
    id:          'sdl_proposal',
    icon:        '💡',
    label:       'SDL政策提言書',
    description: 'SDL五軸に基づく具体的施策を提言する政策文書',
    color:       'border-purple-200 bg-purple-50',
    activeColor: 'border-purple-500 bg-purple-100',
    badgeColor:  'bg-purple-100 text-purple-700',
    time:        '約45秒',
  },
  {
    id:          'executive_brief',
    icon:        '📋',
    label:       '首長向けブリーフィング',
    description: '3分で読める1ページのエグゼクティブサマリー',
    color:       'border-orange-200 bg-orange-50',
    activeColor: 'border-orange-500 bg-orange-100',
    badgeColor:  'bg-orange-100 text-orange-700',
    time:        '約20秒',
  },
  {
    id:          'fiscal_report',
    icon:        '💰',
    label:       '財政状況報告書',
    description: '収益データ・財政力指数の分析と類似自治体比較',
    color:       'border-green-200 bg-green-50',
    activeColor: 'border-green-500 bg-green-100',
    badgeColor:  'bg-green-100 text-green-700',
    time:        '約30秒',
  },
  {
    id:          'it_maturity_report',
    icon:        '🖥️',
    label:       'IT運用成熟度報告書',
    description: 'CMDB・IT診断データからシステム構成と課題を整理',
    color:       'border-gray-200 bg-gray-50',
    activeColor: 'border-gray-500 bg-gray-100',
    badgeColor:  'bg-gray-100 text-gray-700',
    time:        '約25秒',
  },
  {
    id:          'benchmark_report',
    icon:        '🔍',
    label:       '類似自治体比較レポート',
    description: 'Well-Being・DX成熟度・財政力を他自治体と比較分析',
    color:       'border-violet-200 bg-violet-50',
    activeColor: 'border-violet-500 bg-violet-100',
    badgeColor:  'bg-violet-100 text-violet-700',
    time:        '約30秒',
  },
]

// ─── メインコンポーネント ─────────────────────────────

export default function DocumentGenPage() {
  const [selectedTemplate, setSelectedTemplate] = useState('')
  const [period,            setPeriod]           = useState('')
  const [generating,        setGenerating]       = useState(false)
  const [result,            setResult]           = useState<{
    document: string
    templateLabel: string
    period: string
    generatedAt: string
    dataStats: {
      wellBeingLines: number
      revenueLines:   number
      compareLines:   number
      knowledgeLines: number
      profileSet:     boolean
    }
  } | null>(null)
  const [error,   setError]   = useState('')
  const [copied,  setCopied]  = useState(false)

  // ── 文書生成 ──
  const handleGenerate = async () => {
    if (!selectedTemplate) { setError('テンプレートを選択してください'); return }
    if (!period.trim())    { setError('対象期間を入力してください'); return }
    setError('')
    setGenerating(true)
    setResult(null)
    setCopied(false)

    try {
      const res  = await fetch('/api/document-gen', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ templateId: selectedTemplate, period: period.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '生成失敗')
      setResult(json)
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成中にエラーが発生しました')
    } finally {
      setGenerating(false)
    }
  }

  // ── クリップボードコピー ──
  const handleCopy = async () => {
    if (!result) return
    try {
      await navigator.clipboard.writeText(result.document)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setError('コピーに失敗しました')
    }
  }

  const selectedTpl = TEMPLATES.find(t => t.id === selectedTemplate)

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── ヘッダー ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📋 AI政策文書生成</h1>
        <p className="text-sm text-gray-500 mt-1">
          蓄積データをAIが横断分析し、議会向けレポート・政策提言書を自動ドラフト
        </p>
      </div>

      {/* ── テンプレート選択 ── */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-600">① 文書テンプレートを選択</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {TEMPLATES.map(tpl => (
            <button
              key={tpl.id}
              onClick={() => { setSelectedTemplate(tpl.id); setError(''); setResult(null) }}
              className={`text-left rounded-xl border-2 p-4 transition-all ${
                selectedTemplate === tpl.id ? tpl.activeColor + ' border-2' : tpl.color + ' hover:shadow-sm'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-2xl">{tpl.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-gray-800 text-sm">{tpl.label}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${tpl.badgeColor}`}>{tpl.time}</span>
                  </div>
                  <p className="text-xs text-gray-500">{tpl.description}</p>
                </div>
                {selectedTemplate === tpl.id && (
                  <span className="text-green-500 font-bold text-lg">✓</span>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── 対象期間の入力 ── */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-gray-600">② 対象期間を入力</h2>
        <div className="flex gap-3 items-center">
          <input
            type="text"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            placeholder="例: 2026年3月、2026年第1四半期、2025年度"
            className="flex-1 text-sm border border-gray-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          {/* クイック入力ボタン */}
          <div className="flex gap-1">
            {['今月', '今四半期', '今年度'].map(label => {
              const getVal = () => {
                const now = new Date()
                if (label === '今月') return `${now.getFullYear()}年${now.getMonth() + 1}月`
                if (label === '今四半期') {
                  const q = Math.ceil((now.getMonth() + 1) / 3)
                  return `${now.getFullYear()}年第${q}四半期`
                }
                const fy = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1
                return `${fy}年度`
              }
              return (
                <button
                  key={label}
                  onClick={() => setPeriod(getVal())}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1.5 rounded whitespace-nowrap"
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* ── 生成ボタン ── */}
      <div>
        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            ⚠️ {error}
          </div>
        )}
        <button
          onClick={handleGenerate}
          disabled={generating || !selectedTemplate || !period.trim()}
          className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {generating ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="animate-spin">⏳</span>
              AIが文書を生成中... {selectedTpl?.time}かかります
            </span>
          ) : (
            '🤖 文書を生成する'
          )}
        </button>

        {/* 利用データの説明 */}
        {selectedTemplate && (
          <p className="text-xs text-gray-400 mt-2">
            ※ Notionに蓄積されたWellBeingKPI・収益・人口・比較・タッチポイント等の全DBデータを横断分析して生成します
          </p>
        )}
      </div>

      {/* ── 生成結果 ── */}
      {result && (
        <div className="space-y-4">

          {/* ヘッダー情報 */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h2 className="font-semibold text-gray-800">
                {result.templateLabel} — {result.period}
              </h2>
              <p className="text-xs text-gray-400 mt-0.5">
                生成日時: {new Date(result.generatedAt).toLocaleString('ja-JP')}
              </p>
            </div>

            {/* データ参照バッジ */}
            <div className="flex flex-wrap gap-1.5">
              {result.dataStats.profileSet && (
                <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">
                  ⚙️ プロフィール設定済
                </span>
              )}
              {result.dataStats.wellBeingLines > 0 && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full">
                  💚 WBデータ {result.dataStats.wellBeingLines}件
                </span>
              )}
              {result.dataStats.revenueLines > 0 && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                  💰 収益データ {result.dataStats.revenueLines}件
                </span>
              )}
              {result.dataStats.compareLines > 0 && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                  🔍 比較 {result.dataStats.compareLines}件
                </span>
              )}
              {result.dataStats.knowledgeLines > 0 && (
                <span className="text-xs bg-pink-100 text-pink-700 px-2 py-0.5 rounded-full">
                  🧠 ナレッジ {result.dataStats.knowledgeLines}件
                </span>
              )}
            </div>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-violet-400'
              }`}
            >
              {copied ? '✅ コピーしました' : '📋 全文コピー'}
            </button>
            <button
              onClick={() => { setResult(null); setSelectedTemplate(''); setPeriod('') }}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-gray-400"
            >
              🔄 別の文書を生成
            </button>
          </div>

          {/* 生成された文書（マークダウン風に表示） */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-auto">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
              {result.document}
            </pre>
          </div>
        </div>
      )}

      {/* ── ガイダンス（初期表示） ── */}
      {!result && !generating && (
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-5 text-sm text-gray-600">
          <h3 className="font-semibold text-violet-700 mb-2">💡 AI政策文書生成の使い方</h3>
          <ol className="space-y-1 list-decimal list-inside">
            <li>作成したい文書のテンプレートを選ぶ</li>
            <li>対象期間を入力する（「今月」ボタンで自動入力も可）</li>
            <li>「文書を生成する」をクリックすると、NotionのDBデータをAIが横断分析</li>
            <li>生成された文書を確認・コピーして活用する</li>
          </ol>
          <p className="mt-3 text-xs text-gray-400">
            ※ データが少ない項目は「（データなし）」と表示されます。各DBにデータを蓄積するほど精度が上がります。
          </p>
        </div>
      )}
    </div>
  )
}
