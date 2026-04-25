'use client'
// =====================================================
//  src/components/dept/PredictiveAlertPanel.tsx
//  予兆検知ダッシュボード — Sprint #29
//
//  ■ 3種類の予兆を手動実行・結果確認できる管理画面
//    1. 🔧 インフラ老朽化アラート
//    2. 💚 リスク職員 1on1 リマインド
//    3. 📊 住民満足度モニタリング
// =====================================================

import { useState } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'

// ─── 型定義 ──────────────────────────────────────────

interface AlertItem {
  level:    'critical' | 'warning' | 'info'
  title:    string
  action?:  string
  score?:   number
  targetDept?: string
}

interface RunResult {
  status:     'success' | 'error'
  alertCount?: number
  alerts?:    AlertItem[]
  notionPage?: { id: string; url: string } | null
  message?:   string
}

type DetectorKey = 'infra' | 'oneonone' | 'satisfaction'

// ─── 検知器の定義 ─────────────────────────────────────

const DETECTORS: {
  key:         DetectorKey
  emoji:       string
  title:       string
  description: string
  schedule:    string
  endpoint:    string
  color: {
    bg:     string
    border: string
    badge:  string
    btn:    string
    text:   string
  }
}[] = [
  {
    key:         'infra',
    emoji:       '🔧',
    title:       'インフラ老朽化アラート',
    description: '設備点検データを分析し、次の障害発生リスクが高い設備を自動検知。担当職員に事前アラートを送信します。',
    schedule:    '毎週月曜 10:00 自動実行',
    endpoint:    '/api/cron/infra-aging-alert',
    color: {
      bg:     'bg-amber-50',
      border: 'border-amber-200',
      badge:  'bg-amber-100 text-amber-700',
      btn:    'bg-amber-600 hover:bg-amber-700 text-white',
      text:   'text-amber-700',
    },
  },
  {
    key:         'oneonone',
    emoji:       '💚',
    title:       'リスク職員 1on1 リマインド',
    description: '離職リスクHIGH（赤信号）の職員がいる部署の管理職に、1on1 面談を促す LINE 通知を自動送信します。',
    schedule:    '毎週火曜 10:00 自動実行',
    endpoint:    '/api/cron/risk-oneonone-reminder',
    color: {
      bg:     'bg-emerald-50',
      border: 'border-emerald-200',
      badge:  'bg-emerald-100 text-emerald-700',
      btn:    'bg-emerald-600 hover:bg-emerald-700 text-white',
      text:   'text-emerald-700',
    },
  },
  {
    key:         'satisfaction',
    emoji:       '📊',
    title:       '住民満足度モニタリング',
    description: 'タッチポイント評価の週次トレンドを分析。満足度の低下傾向を早期検知し、担当課に改善アクションを提案します。',
    schedule:    '毎週月曜 08:00 自動実行',
    endpoint:    '/api/cron/satisfaction-monitor',
    color: {
      bg:     'bg-sky-50',
      border: 'border-sky-200',
      badge:  'bg-sky-100 text-sky-700',
      btn:    'bg-sky-600 hover:bg-sky-700 text-white',
      text:   'text-sky-700',
    },
  },
]

// ─── アラートバッジ ───────────────────────────────────

function LevelBadge({ level }: { level: AlertItem['level'] }) {
  if (level === 'critical') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">
      🔴 緊急
    </span>
  )
  if (level === 'warning') return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">
      🟡 注意
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
      🟢 正常
    </span>
  )
}

// ─── 検知器カード ─────────────────────────────────────

function DetectorCard({
  detector,
  municipalityId,
}: {
  detector: typeof DETECTORS[0]
  municipalityId: string
}) {
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<RunResult | null>(null)
  const [showDetail, setShowDetail] = useState(false)

  async function handleRun() {
    setLoading(true)
    setResult(null)
    try {
      // POST ボディに municipalityId を含めて自治体別処理を実行
      const res  = await fetch(detector.endpoint, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ municipalityId }),
      })
      const data = await res.json() as RunResult
      setResult(data)
      setShowDetail(true)
    } catch (e) {
      setResult({ status: 'error', message: String(e) })
    } finally {
      setLoading(false)
    }
  }

  const { color } = detector

  return (
    <div className={`rounded-xl border-2 p-5 ${color.bg} ${color.border}`}>

      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{detector.emoji}</span>
          <div>
            <h3 className={`font-bold text-base ${color.text}`}>{detector.title}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full ${color.badge}`}>
              🕐 {detector.schedule}
            </span>
          </div>
        </div>

        {/* 実行ボタン */}
        <button
          onClick={handleRun}
          disabled={loading}
          className={`shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 ${color.btn}`}
        >
          {loading ? '🔄 実行中…' : '▶ 今すぐ実行'}
        </button>
      </div>

      {/* 説明 */}
      <p className="text-sm text-gray-600 mb-4 leading-relaxed">{detector.description}</p>

      {/* 実行結果 */}
      {result && (
        <div className="mt-3 space-y-2">
          {result.status === 'error' ? (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              ❌ エラー: {result.message}
            </div>
          ) : (
            <>
              {/* サマリーバー */}
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-700">
                  ✅ 検知完了 — {result.alertCount ?? 0} 件のアラート
                </span>
                <div className="flex items-center gap-2">
                  {result.notionPage && (
                    <a
                      href={result.notionPage.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline"
                    >
                      📝 Notionで確認
                    </a>
                  )}
                  {(result.alerts?.length ?? 0) > 0 && (
                    <button
                      onClick={() => setShowDetail(v => !v)}
                      className="text-xs text-gray-500 hover:text-gray-700"
                    >
                      {showDetail ? '▲ 閉じる' : '▼ 詳細'}
                    </button>
                  )}
                </div>
              </div>

              {/* アラート詳細 */}
              {showDetail && result.alerts && result.alerts.length > 0 && (
                <div className="space-y-2">
                  {result.alerts.map((alert, i) => (
                    <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <LevelBadge level={alert.level} />
                        <span className="font-medium text-gray-800">{alert.title}</span>
                      </div>
                      {alert.action && (
                        <p className="text-gray-600 text-xs mt-1">
                          👉 {alert.action}
                        </p>
                      )}
                      {alert.targetDept && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          🏢 対象: {alert.targetDept}
                        </p>
                      )}
                      {alert.score != null && (
                        <p className="text-gray-500 text-xs mt-0.5">
                          📊 スコア: {alert.score} / 5
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── メインパネル ─────────────────────────────────────

export function PredictiveAlertPanel() {
  // 選択中の自治体（マルチテナント対応）
  const { municipalityId, municipality } = useMunicipality()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* タイトル */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">🔮 予兆検知ダッシュボード</h1>
        <p className="text-gray-500 text-sm">
          {municipality.name} — AIが問題を先回りして検知し、職員・管理者に自動通知します。<br />
          各カードの「今すぐ実行」で手動テストができます。本番では自動でスケジュール実行されます。
        </p>
      </div>

      {/* 自動実行スケジュール凡例 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">📅 週次自動実行スケジュール</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-gray-600">
          <div className="flex items-center gap-2">
            <span className="font-medium text-amber-700">月曜 10:00</span>
            <span>🔧 インフラ老朽化チェック</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-emerald-700">火曜 10:00</span>
            <span>💚 1on1 リマインド送信</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-sky-700">月曜 08:00</span>
            <span>📊 満足度モニタリング</span>
          </div>
        </div>
      </div>

      {/* 検知器カード — municipalityId を渡して自治体別に実行 */}
      <div className="space-y-4">
        {DETECTORS.map(d => (
          <DetectorCard key={d.key} detector={d} municipalityId={municipalityId} />
        ))}
      </div>

      {/* 注記 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>※ LINE通知はLINE_CHANNEL_ACCESS_TOKENが設定されている場合のみ送信されます</p>
        <p>※ 設備点検DBが未設定の場合はサンプルデータで動作確認できます</p>
        <p>※ 個人情報保護のため、1on1リマインドでは職員名を伏せた通知を送信します</p>
      </div>
    </div>
  )
}
