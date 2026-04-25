'use client'
// =====================================================
//  src/components/dept/CitizenRadarPanel.tsx
//  住民困り事レーダー 管理パネル — Sprint #43
//
//  ■ 役割
//    「今すぐ収集」ボタンから /api/cron/citizen-radar を呼び出し、
//    インターネット上の住民の困り事を収集・分類して一覧表示する。
//    結果は Notion にも自動保存される。
// =====================================================

import { useState } from 'react'
import { useMunicipality } from '@/contexts/MunicipalityContext'
import { SummaryCard }  from '@/components/ui/SummaryCard'
import { StatusBadge }  from '@/components/ui/StatusBadge'

// ─── 型定義 ──────────────────────────────────────────

interface IssueItem {
  level:      'critical' | 'warning' | 'info'
  title:      string
  action?:    string
  targetDept?: string
}

interface RadarResult {
  status:      'success' | 'error'
  issueCount?: number
  alerts?:     IssueItem[]
  notionPage?: { id: string; url: string } | null
  message?:    string
}

// ─── カテゴリ別アイコン ───────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  '道路・インフラ': '🛣️',
  'ゴミ・環境':    '♻️',
  '子育て・教育':  '👶',
  '高齢者・福祉':  '👴',
  '防災・安全':    '🚨',
  '観光・交流':    '🗺️',
  '行政手続き':    '📋',
  '騒音・生活':    '🔊',
  'その他':        '📌',
}

// カテゴリ名を title から推測するヘルパー
function guessIcon(title: string): string {
  for (const [cat, icon] of Object.entries(CATEGORY_ICONS)) {
    if (title.includes(cat)) return icon
  }
  return '📌'
}

// ─── コンポーネント ───────────────────────────────────

export function CitizenRadarPanel() {
  const { municipalityId, municipality } = useMunicipality()

  const [loading,    setLoading]    = useState(false)
  const [result,     setResult]     = useState<RadarResult | null>(null)
  const [showDetail, setShowDetail] = useState(true)
  const [filter,     setFilter]     = useState<'all' | 'critical' | 'warning'>('all')

  // ─── 収集実行 ────────────────────────────────────

  async function handleRun() {
    setLoading(true)
    setResult(null)
    try {
      const res  = await fetch('/api/cron/citizen-radar', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ municipalityId }),
      })
      const data = await res.json() as RadarResult
      setResult(data)
      setShowDetail(true)
    } catch (e) {
      setResult({ status: 'error', message: String(e) })
    } finally {
      setLoading(false)
    }
  }

  // ─── フィルタリング ───────────────────────────────

  const filteredAlerts = result?.alerts?.filter((a) => {
    if (filter === 'critical') return a.level === 'critical'
    if (filter === 'warning')  return a.level === 'critical' || a.level === 'warning'
    return true
  }) ?? []

  const criticalCount = result?.alerts?.filter((a) => a.level === 'critical').length ?? 0
  const warningCount  = result?.alerts?.filter((a) => a.level === 'warning').length  ?? 0
  const infoCount     = result?.alerts?.filter((a) => a.level === 'info').length     ?? 0

  // ─── 描画 ─────────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* タイトル */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">
          🎯 住民困り事レーダー
        </h1>
        <p className="text-gray-500 text-sm">
          {municipality.name} — インターネット上の住民の声を自動収集・AIで分類します。<br />
          収集源: Google News / Yahoo知恵袋 / 教えて!goo / 発言小町 / 自治体HP / LINE相談ログ
        </p>
      </div>

      {/* 収集源バッジ */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-slate-700 mb-2">📡 収集ソース（すべて無償）</h2>
        <div className="flex flex-wrap gap-2">
          {[
            { label: 'Google News RSS', color: 'bg-blue-100 text-blue-700' },
            { label: 'Yahoo知恵袋',     color: 'bg-red-100 text-red-700' },
            { label: '教えて!goo',       color: 'bg-green-100 text-green-700' },
            { label: '発言小町',         color: 'bg-purple-100 text-purple-700' },
            { label: '自治体公式HP',     color: 'bg-amber-100 text-amber-700' },
            { label: 'LINE相談ログ',    color: 'bg-emerald-100 text-emerald-700' },
          ].map((src) => (
            <span key={src.label} className={`text-xs px-2.5 py-1 rounded-full font-medium ${src.color}`}>
              {src.label}
            </span>
          ))}
        </div>
      </div>

      {/* 実行カード */}
      <div className="rounded-xl border-2 p-5 bg-teal-50 border-teal-200">

        {/* ヘッダー */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🔍</span>
            <div>
              <h3 className="font-bold text-base text-teal-700">住民の声を収集・分析する</h3>
              <span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
                🕐 毎週月曜 07:00 自動実行
              </span>
            </div>
          </div>

          {/* 実行ボタン */}
          <button
            onClick={handleRun}
            disabled={loading}
            className="shrink-0 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-60 bg-teal-600 hover:bg-teal-700 text-white"
          >
            {loading ? '🔄 収集中…（1〜2分かかります）' : '▶ 今すぐ収集'}
          </button>
        </div>

        <p className="text-sm text-gray-600 mb-4 leading-relaxed">
          複数のWebサイトを横断して{municipality.name}に関する住民の困り事を収集します。
          Claude AIがカテゴリ分類・深刻度スコアリングを行い、自治体が対応すべき課題を優先順位付けします。
        </p>

        {/* 実行結果 */}
        {result && (
          <div className="mt-3 space-y-3">

            {result.status === 'error' ? (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                ❌ エラー: {result.message}
              </div>
            ) : (
              <>
                {/* サマリーカード */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <SummaryCard
                    icon="📋" label="収集件数" value={result.issueCount ?? 0} sub="件"
                    colorClass="bg-white border-slate-200 text-slate-700"
                  />
                  <SummaryCard
                    icon="🔴" label="緊急" value={criticalCount} sub="件"
                    colorClass="bg-red-50 border-red-200 text-red-700"
                  />
                  <SummaryCard
                    icon="🟡" label="注意" value={warningCount} sub="件"
                    colorClass="bg-amber-50 border-amber-200 text-amber-700"
                  />
                  <SummaryCard
                    icon="🟢" label="情報" value={infoCount} sub="件"
                    colorClass="bg-emerald-50 border-emerald-200 text-emerald-700"
                  />
                </div>

                {/* Notion リンク + 詳細トグル */}
                <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                  <span className="text-sm text-gray-700">
                    ✅ 分析完了 — {result.issueCount ?? 0} 件の困り事を検出
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
                        onClick={() => setShowDetail((v) => !v)}
                        className="text-xs text-gray-500 hover:text-gray-700"
                      >
                        {showDetail ? '▲ 閉じる' : '▼ 詳細'}
                      </button>
                    )}
                  </div>
                </div>

                {/* フィルター */}
                {showDetail && (result.alerts?.length ?? 0) > 0 && (
                  <div className="flex gap-2">
                    {[
                      { key: 'all',      label: '全件' },
                      { key: 'critical', label: '🔴 緊急のみ' },
                      { key: 'warning',  label: '🟡 注意以上' },
                    ].map((f) => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key as 'all' | 'critical' | 'warning')}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          filter === f.key
                            ? 'bg-teal-600 text-white border-teal-600'
                            : 'bg-white text-gray-600 border-gray-300 hover:border-teal-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* 困り事リスト */}
                {showDetail && filteredAlerts.length > 0 && (
                  <div className="space-y-2">
                    {filteredAlerts.map((issue, i) => (
                      <div key={i} className="p-3 bg-white rounded-lg border border-gray-200 text-sm">
                        <div className="flex items-start gap-2">
                          {/* 深刻度バッジ */}
                          <StatusBadge status={issue.level} />
                          <div className="flex-1">
                            {/* タイトル（カテゴリアイコン付き） */}
                            <p className="font-medium text-gray-800">
                              {guessIcon(issue.title)} {issue.title}
                            </p>
                            {/* 詳細 */}
                            {issue.action && (
                              <p className="text-gray-500 text-xs mt-1">
                                💬 {issue.action}
                              </p>
                            )}
                            {/* 出典 */}
                            {issue.targetDept && (
                              <p className="text-gray-400 text-xs mt-0.5">
                                📰 出典: {issue.targetDept}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {/* 注記 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>※ 外部サイトの構造変更により一部ソースが取得できない場合があります（他のソースは継続動作）</p>
        <p>※ 個人を特定できる情報は収集・保存しません。テキスト内容のみを分析対象とします</p>
        <p>※ 収集したデータは {municipality.name} の行政改善目的のみに使用します</p>
      </div>
    </div>
  )
}
