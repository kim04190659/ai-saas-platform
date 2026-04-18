'use client'

// =====================================================
//  src/components/dept/FaultReportPanel.tsx
//  障害通報受付 管理パネル — Sprint #28
//
//  ■ 役割
//    住民LINEから届いた障害通報（断水・停電・ガス漏れ等）を
//    一覧表示し、対応状況を管理するWebUI。
//
//    障害通報のテスト送信フォームも兼ねており、
//    「模擬通報を送信」ボタンで分類エンジンの動作確認ができる。
// =====================================================

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Send,
  Zap,
  Flame,
  Droplets,
  Construction,
  WifiOff,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

// ─── 型定義 ──────────────────────────────────────────

interface SimulationResult {
  status:      'success' | 'error'
  faultType?:  string
  urgency?:    string
  location?:   string
  detail?:     string
  reply?:      string
  notionPage?: { id: string; url: string }
  message:     string
}

// ─── サンプル通報文 ───────────────────────────────────

const SAMPLE_REPORTS = [
  {
    icon: '🔥',
    label: 'ガス漏れ',
    text: '屋久島町宮之浦のアパートでガスの臭いがします。かなり強い臭いで危険な気がします。早急に対応してください。',
    urgency: 'critical',
  },
  {
    icon: '🚰',
    label: '断水',
    text: '朝から水が全く出ません。近所の人も同じ状況みたいです。断水の情報はありますか？場所は安房地区です。',
    urgency: 'high',
  },
  {
    icon: '⚡',
    label: '停電',
    text: '安房地区で1時間以上停電が続いています。電力会社に連絡しましたが繋がりません。街灯も全部消えています。',
    urgency: 'high',
  },
  {
    icon: '🛣️',
    label: '道路陥没',
    text: '県道沿いの道路に大きな穴が開いています。場所は屋久島町小瀬田の交差点付近です。車が通れなくなっています。',
    urgency: 'high',
  },
  {
    icon: '🔧',
    label: '下水道詰まり',
    text: '家の前の排水溝から汚水があふれています。近くの下水道が詰まっているようです。',
    urgency: 'normal',
  },
]

// ─── アイコン選択 ─────────────────────────────────────

function FaultIcon({ type, size = 20 }: { type: string; size?: number }) {
  if (type.includes('ガス'))     return <Flame size={size} className="text-orange-500" />
  if (type.includes('断水'))     return <Droplets size={size} className="text-blue-500" />
  if (type.includes('停電'))     return <Zap size={size} className="text-yellow-500" />
  if (type.includes('道路'))     return <Construction size={size} className="text-amber-600" />
  if (type.includes('通信'))     return <WifiOff size={size} className="text-gray-500" />
  return <AlertTriangle size={size} className="text-red-500" />
}

// ─── 緊急度バッジ ──────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === 'critical') {
    return <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full font-bold animate-pulse">🔥 最優先</span>
  }
  if (urgency === 'high') {
    return <span className="text-xs bg-orange-500 text-white px-2 py-0.5 rounded-full font-semibold">⚠️ 高</span>
  }
  return <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">📋 通常</span>
}

// ─── コンポーネント ───────────────────────────────────

export function FaultReportPanel() {
  const [testText,   setTestText]   = useState('')
  const [testing,    setTesting]    = useState(false)
  const [testResult, setTestResult] = useState<SimulationResult | null>(null)
  const [expanded,   setExpanded]   = useState(false)

  // 模擬通報をAPIに送信してテスト
  async function handleSimulate(text?: string) {
    const reportText = text ?? testText
    if (!reportText.trim()) return

    setTesting(true)
    setTestResult(null)

    try {
      // /api/fault-simulation エンドポイントに送信してテスト分類
      const res  = await fetch('/api/infrastructure/fault-simulation', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ text: reportText }),
      })
      const data = await res.json()
      setTestResult(data)
    } catch (e) {
      setTestResult({
        status:  'error',
        message: `通信エラー: ${e instanceof Error ? e.message : String(e)}`,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <AlertTriangle className="text-orange-500" size={28} />
          障害通報LINE受付
        </h1>
        <p className="mt-1 text-gray-500 text-sm">
          住民からLINEで届いた断水・停電・道路損傷などの障害通報をAIが自動分類し、担当課へ転送します。
        </p>
      </div>

      {/* フロー説明 */}
      <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-orange-600 mb-3">■ 障害通報の自動処理フロー</p>
        <div className="flex items-center gap-2 text-xs text-orange-800 flex-wrap">
          {[
            '住民がLINEに送信',
            'AIが種別・緊急度・場所を分類',
            '住民に受付確認を自動返信',
            'Notionに障害通報を記録',
          ].map((step, i, arr) => (
            <span key={i} className="flex items-center gap-2">
              <span className="bg-orange-200 rounded px-2 py-1 font-medium">{step}</span>
              {i < arr.length - 1 && <span className="text-orange-400">→</span>}
            </span>
          ))}
        </div>
      </div>

      {/* 対応種別一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700 hover:bg-gray-50"
        >
          <span>🗂️ 対応障害種別一覧（7種）</span>
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
        {expanded && (
          <div className="border-t border-gray-100 p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {[
              { emoji: '🔥', label: 'ガス漏れ',     dept: 'ガス供給課',      urgency: '🔴 最優先' },
              { emoji: '🚰', label: '断水',          dept: '上水道課',        urgency: '🟠 高' },
              { emoji: '⚡', label: '停電',          dept: '電気設備課',      urgency: '🟠 高' },
              { emoji: '🛣️', label: '道路損傷',     dept: '道路維持課',      urgency: '🟠 高' },
              { emoji: '🔧', label: '下水道',        dept: '下水道課',        urgency: '🔵 通常' },
              { emoji: '🌉', label: '橋梁損傷',      dept: '橋梁管理課',      urgency: '🟠 高' },
              { emoji: '🏗️', label: '公共施設損傷', dept: '公共設備（汎用）', urgency: '🔵 通常' },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                <span className="text-lg">{f.emoji}</span>
                <div>
                  <span className="font-medium text-gray-800">{f.label}</span>
                  <span className="text-gray-500 text-xs ml-2">→ {f.dept}</span>
                </div>
                <span className="ml-auto text-xs">{f.urgency}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* テスト用模擬通報フォーム */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
        <p className="text-sm font-semibold text-gray-700">🧪 分類エンジン動作テスト</p>
        <p className="text-xs text-gray-500">
          実際の住民からのLINEメッセージを模擬したテキストを入力して、AIの分類・返信内容を確認できます。
        </p>

        {/* サンプルボタン */}
        <div className="flex gap-2 flex-wrap">
          {SAMPLE_REPORTS.map(s => (
            <button
              key={s.label}
              onClick={() => setTestText(s.text)}
              className="text-xs px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg border border-gray-200 transition-colors"
            >
              {s.icon} {s.label}
            </button>
          ))}
        </div>

        {/* テキストエリア */}
        <textarea
          value={testText}
          onChange={e => setTestText(e.target.value)}
          rows={3}
          placeholder="通報メッセージを入力してください（例：「安房地区で朝から断水しています」）"
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-orange-300"
        />

        {/* 送信ボタン */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSimulate()}
            disabled={testing || !testText.trim()}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-orange-600 hover:bg-orange-700
                       disabled:bg-orange-300 text-white font-semibold rounded-xl
                       transition-colors text-sm"
          >
            <RefreshCw size={15} className={testing ? 'animate-spin' : ''} />
            {testing ? '分類中...' : 'AI分類をテスト'}
          </button>
          {testing && (
            <p className="text-xs text-gray-400 animate-pulse">
              AIが種別・緊急度・場所を分析中...
            </p>
          )}
        </div>
      </div>

      {/* テスト結果表示 */}
      {testResult && (
        <div className={`border rounded-xl overflow-hidden ${
          testResult.status === 'success' ? 'border-emerald-200' : 'border-red-200'
        }`}>
          {/* ステータスバー */}
          <div className={`px-5 py-3 flex items-center gap-2 ${
            testResult.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            {testResult.status === 'success'
              ? <CheckCircle size={18} className="text-emerald-600" />
              : <AlertTriangle size={18} className="text-red-500" />
            }
            <span className={`font-semibold text-sm ${
              testResult.status === 'success' ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {testResult.status === 'success' ? '分類完了' : 'エラー'}
            </span>
          </div>

          <div className="bg-white p-5 space-y-4">

            {testResult.status === 'success' && (
              <>
                {/* 分類結果グリッド */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: '障害種別',  value: testResult.faultType ?? '-' },
                    { label: '緊急度',    value: testResult.urgency   ?? '-',
                      badge: testResult.urgency },
                    { label: '発生場所',  value: testResult.location  ?? '-' },
                    { label: '担当課',    value: testResult.detail?.split('担当:')[1]?.split('/')[0]?.trim() ?? '-' },
                  ].map(item => (
                    <div key={item.label} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-xs text-gray-500">{item.label}</p>
                      {item.badge ? (
                        <div className="mt-0.5">
                          <UrgencyBadge urgency={item.badge} />
                        </div>
                      ) : (
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{item.value}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* 住民への返信メッセージプレビュー */}
                {testResult.reply && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-green-700 mb-2">
                      📱 住民LINEへの自動返信メッセージ（プレビュー）
                    </p>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {testResult.reply}
                    </pre>
                  </div>
                )}

                {/* Notionリンク */}
                {testResult.notionPage && (
                  <a
                    href={testResult.notionPage.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-violet-600 hover:text-violet-800
                               font-medium text-sm underline underline-offset-2"
                  >
                    <ExternalLink size={15} />
                    Notionで障害通報ページを開く
                  </a>
                )}
              </>
            )}

            {testResult.status === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {testResult.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* サンプル模擬通報一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-3">
        <p className="text-sm font-semibold text-gray-700">📋 サンプル通報シナリオ（クリックで即テスト）</p>
        <div className="space-y-2">
          {SAMPLE_REPORTS.map(s => (
            <div key={s.label}
              className={`flex items-start gap-3 rounded-xl px-4 py-3 border cursor-pointer
                         transition-colors hover:shadow-sm ${
                s.urgency === 'critical' ? 'bg-red-50 border-red-200 hover:bg-red-100' :
                s.urgency === 'high'     ? 'bg-orange-50 border-orange-200 hover:bg-orange-100' :
                                          'bg-blue-50 border-blue-200 hover:bg-blue-100'
              }`}
              onClick={() => { setTestText(s.text); handleSimulate(s.text) }}
            >
              <span className="text-2xl shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-gray-800 text-sm">{s.label}</span>
                  <UrgencyBadge urgency={s.urgency} />
                </div>
                <p className="text-xs text-gray-600 line-clamp-2">{s.text}</p>
              </div>
              <Send size={14} className="text-gray-400 shrink-0 mt-1" />
            </div>
          ))}
        </div>
      </div>

      {/* 補足説明 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>• 本番環境では、住民LINEに「断水」「停電」などのキーワードが含まれると自動で分類・返信が行われます。</p>
        <p>• 障害通報はNotionの「🌱 新RunWith Platform」配下にページとして記録されます（FAULT_REPORT_DB_ID 設定でDB記録に切替可能）。</p>
        <p>• ガス漏れは最優先（critical）扱いとなり、受付確認に緊急対応の旨が明記されます。</p>
      </div>
    </div>
  )
}
