'use client'
// =====================================================
//  src/app/(dashboard)/gyosei/opendata/page.tsx
//  オープンデータ連携・提案書生成UI — Sprint #18
//
//  ■ このページの役割
//    自治体名（＋任意で市区町村コード）を入力し、
//    POST /api/opendata を呼び出して提案書を生成。
//    生成した提案書のNotionリンクと本文をプレビュー表示する。
//
//  ■ 利用API
//    POST /api/opendata
//    { cityName: string, cityCode?: string }
//    → { success, cityName, notionUrl, proposalText, dataSource }
// =====================================================

import { useState } from 'react'

// ─── よく使う自治体のクイック入力リスト ─────────────────

const QUICK_CITIES = [
  { name: '屋久島町',   code: '46505' },
  { name: '霧島市',     code: '46213' },
  { name: 'みらい市',   code: ''      },  // 架空の自治体（デモ用）
  { name: '五島市',     code: '42211' },
  { name: '対馬市',     code: '42209' },
  { name: '宮古島市',   code: '47214' },
]

// ─── APIレスポンス型 ──────────────────────────────────

type ApiResult = {
  success:     boolean
  cityName:    string
  pageId:      string
  notionUrl:   string
  proposalText: string
  dataSource: {
    estat:  string
    notion: string
  }
}

// ─── メインコンポーネント ─────────────────────────────

export default function OpenDataPage() {
  const [cityName,   setCityName]   = useState('')
  const [cityCode,   setCityCode]   = useState('')
  const [generating, setGenerating] = useState(false)
  const [result,     setResult]     = useState<ApiResult | null>(null)
  const [error,      setError]      = useState('')
  const [copied,     setCopied]     = useState(false)

  // ── クイック入力ボタン ──
  const handleQuickSelect = (name: string, code: string) => {
    setCityName(name)
    setCityCode(code)
    setError('')
    setResult(null)
  }

  // ── 提案書生成 ──
  const handleGenerate = async () => {
    if (!cityName.trim()) {
      setError('自治体名を入力してください')
      return
    }
    setError('')
    setGenerating(true)
    setResult(null)
    setCopied(false)

    try {
      const res  = await fetch('/api/opendata', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          cityName: cityName.trim(),
          cityCode: cityCode.trim(),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '生成に失敗しました')
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
      await navigator.clipboard.writeText(result.proposalText)
      setCopied(true)
      setTimeout(() => setCopied(false), 3000)
    } catch {
      setError('コピーに失敗しました')
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">

      {/* ── ヘッダー ── */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📊 オープンデータ連携・提案書生成</h1>
        <p className="text-sm text-gray-500 mt-1">
          e-Stat API（人口動態）＋Notionデータ＋Claude AIで、自治体向けRunWith導入提案書を自動生成しNotionに保存します
        </p>
      </div>

      {/* ── データフロー説明 ── */}
      <div className="flex items-center gap-2 text-xs text-gray-500 bg-teal-50 border border-teal-100 rounded-xl px-4 py-3">
        <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded-full font-medium">e-Stat API</span>
        <span>→</span>
        <span className="bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-medium">Notionプロフィール</span>
        <span>→</span>
        <span className="bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">Claude AI分析</span>
        <span>→</span>
        <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded-full font-medium">Notionに提案書を保存</span>
      </div>

      {/* ── 入力フォーム ── */}
      <div className="space-y-4 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-700">① 自治体を指定する</h2>

        {/* クイック選択 */}
        <div>
          <p className="text-xs text-gray-500 mb-2">クイック選択（よく使う自治体）</p>
          <div className="flex flex-wrap gap-2">
            {QUICK_CITIES.map(city => (
              <button
                key={city.name}
                onClick={() => handleQuickSelect(city.name, city.code)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  cityName === city.name
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400 hover:text-teal-700'
                }`}
              >
                {city.name}
                {city.code && <span className="ml-1 opacity-60">({city.code})</span>}
              </button>
            ))}
          </div>
        </div>

        {/* 自治体名入力 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              自治体名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={cityName}
              onChange={e => { setCityName(e.target.value); setError(''); setResult(null) }}
              placeholder="例: 屋久島町、みらい市"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              市区町村コード
              <span className="text-gray-400 font-normal ml-1">（任意 — e-Stat人口データ取得に使用）</span>
            </label>
            <input
              type="text"
              value={cityCode}
              onChange={e => { setCityCode(e.target.value); setResult(null) }}
              placeholder="例: 46505（屋久島町）"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-300"
            />
          </div>
        </div>

        {/* エラー表示 */}
        {error && (
          <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
            ⚠️ {error}
          </div>
        )}

        {/* 生成ボタン */}
        <button
          onClick={handleGenerate}
          disabled={generating || !cityName.trim()}
          className="w-full md:w-auto bg-teal-600 hover:bg-teal-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold px-8 py-3 rounded-xl transition-colors text-sm"
        >
          {generating ? (
            <span className="flex items-center gap-2 justify-center">
              <span className="animate-spin">⏳</span>
              提案書を生成中... （30〜60秒かかります）
            </span>
          ) : (
            '🤖 提案書を生成してNotionに保存'
          )}
        </button>

        {/* 生成中のステップ表示 */}
        {generating && (
          <div className="text-xs text-gray-500 space-y-1 bg-gray-50 rounded-lg p-3">
            <p className="animate-pulse">📡 e-Stat APIから人口動態データを取得中...</p>
            <p className="animate-pulse">🗂️ Notionから自治体プロフィールを参照中...</p>
            <p className="animate-pulse">🤖 Claude AIが提案書を生成中（最大8,000文字）...</p>
            <p className="animate-pulse">💾 生成した提案書をNotionに保存中...</p>
          </div>
        )}
      </div>

      {/* ── 生成結果 ── */}
      {result && (
        <div className="space-y-4">

          {/* 成功バナー + Notionリンク */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-teal-800">
                ✅ {result.cityName} の導入提案書をNotionに保存しました
              </p>
              <p className="text-xs text-teal-600 mt-1">
                Notionページに開くと、フォーマット済みの提案書全文を確認できます
              </p>
              {/* 利用データソース */}
              <div className="flex flex-wrap gap-2 mt-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  result.dataSource.estat.includes('取得済み')
                    ? 'bg-teal-100 text-teal-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  📡 {result.dataSource.estat}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${
                  result.dataSource.notion.includes('あり')
                    ? 'bg-violet-100 text-violet-700'
                    : 'bg-gray-100 text-gray-500'
                }`}>
                  🗂️ {result.dataSource.notion}
                </span>
              </div>
            </div>
            <a
              href={result.notionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap"
            >
              Notionで開く →
            </a>
          </div>

          {/* アクションボタン */}
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={handleCopy}
              className={`text-sm px-4 py-2 rounded-lg border transition-colors ${
                copied
                  ? 'bg-green-500 text-white border-green-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:border-teal-400'
              }`}
            >
              {copied ? '✅ コピーしました' : '📋 全文コピー'}
            </button>
            <button
              onClick={() => { setResult(null); setCityName(''); setCityCode('') }}
              className="text-sm px-4 py-2 rounded-lg border border-gray-300 bg-white text-gray-600 hover:border-gray-400"
            >
              🔄 別の自治体で生成
            </button>
          </div>

          {/* 提案書プレビュー */}
          <div>
            <h2 className="text-sm font-semibold text-gray-700 mb-2">📄 提案書プレビュー</h2>
            <div className="bg-white rounded-xl border border-gray-200 p-6 overflow-auto max-h-[600px]">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-sans leading-relaxed">
                {result.proposalText}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* ── ガイダンス（初期表示） ── */}
      {!result && !generating && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 text-sm text-gray-600 space-y-3">
          <h3 className="font-semibold text-gray-700">💡 使い方</h3>
          <ol className="space-y-1.5 list-decimal list-inside">
            <li>対象の自治体名を入力（クイック選択ボタンも利用可）</li>
            <li>市区町村コードを入力すると e-Stat の人口動態データも取得</li>
            <li>「提案書を生成してNotionに保存」をクリック（30〜60秒）</li>
            <li>生成後、Notionリンクから提案書を確認・編集できます</li>
          </ol>
          <div className="text-xs text-gray-400 pt-1 border-t border-gray-200 space-y-1">
            <p>
              📡 <strong>e-Stat APIキー</strong>: {' '}
              未設定の場合でもClaude AIの知識で提案書を生成できます。
              APIキーを設定すると実際の統計データが加わり精度が向上します。
            </p>
            <p>
              🗂️ <strong>自治体プロフィール</strong>: {' '}
              NotionのMunicipalityProfile DBに自治体情報を登録すると、より具体的な提案書が生成されます。
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
