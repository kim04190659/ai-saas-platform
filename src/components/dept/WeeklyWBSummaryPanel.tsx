'use client'

// =====================================================
//  src/components/dept/WeeklyWBSummaryPanel.tsx
//  週次WBサマリー 手動実行パネル — Sprint #28
//
//  ■ 役割
//    「今すぐ生成」ボタンから /api/cron/weekly-wb-summary を呼び出し、
//    全部門のWBサマリーをNotionに保存する。
//    結果（部門別スコア・Notionリンク）をその場で表示する。
// =====================================================

import { useState } from 'react'
import { FileText, RefreshCw, ExternalLink, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { useMunicipality } from '@/contexts/MunicipalityContext'

// ─── 型定義 ──────────────────────────────────────────

/** APIレスポンスに municipalityName を追加 */
interface DeptStat {
  deptId:       string
  deptName:     string
  emoji:        string
  avgWB:        number
  prevAvgWB:    number
  trend:        number
  count:        number
  riskCount:    number
  warningCount: number
}

interface SummaryResult {
  status:           'success' | 'error'
  weekLabel:        string
  message:          string
  municipalityName?: string
  summary?: {
    deptCount:  number
    totalStaff: number
    totalRisk:  number
    deptStats:  DeptStat[]
  }
  notionPage?: { id: string; url: string }
}

// ─── WBスコアに応じた色クラス ──────────────────────────

function wbColor(score: number): string {
  if (score === 0)  return 'text-gray-400'
  if (score >= 70)  return 'text-emerald-600'
  if (score >= 55)  return 'text-amber-500'
  return 'text-red-500'
}

function wbBg(score: number): string {
  if (score === 0)  return 'bg-gray-50'
  if (score >= 70)  return 'bg-emerald-50'
  if (score >= 55)  return 'bg-amber-50'
  return 'bg-red-50'
}

function wbBar(score: number): string {
  if (score === 0)  return 'bg-gray-200'
  if (score >= 70)  return 'bg-emerald-500'
  if (score >= 55)  return 'bg-amber-500'
  return 'bg-red-500'
}

// ─── コンポーネント ───────────────────────────────────

export function WeeklyWBSummaryPanel() {
  const [loading,   setLoading]   = useState(false)
  const [result,    setResult]    = useState<SummaryResult | null>(null)
  const [elapsed,   setElapsed]   = useState<number>(0)

  // 選択中の自治体（マルチテナント対応）
  const { municipalityId, municipality } = useMunicipality()

  // 「今すぐ生成」ボタンのハンドラ
  async function handleGenerate() {
    setLoading(true)
    setResult(null)
    const start = Date.now()

    try {
      // municipalityId をクエリパラメータで渡す
      const res  = await fetch(`/api/cron/weekly-wb-summary?municipalityId=${municipalityId}`)
      const data = await res.json() as SummaryResult
      setElapsed(Math.round((Date.now() - start) / 1000))
      setResult(data)
    } catch (e) {
      setElapsed(Math.round((Date.now() - start) / 1000))
      setResult({
        status:    'error',
        weekLabel: '',
        message:   `通信エラーが発生しました: ${e instanceof Error ? e.message : String(e)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  // 今週の日付範囲を表示用に計算
  const today       = new Date()
  const weekStart   = new Date(today); weekStart.setDate(today.getDate() - 6)
  const weekLabel   = `${weekStart.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}（${['日','月','火','水','木','金','土'][weekStart.getDay()]}）〜 ${today.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' })}（${['日','月','火','水','木','金','土'][today.getDay()]}）`

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <FileText className="text-violet-600" size={28} />
            週次 WellBeing サマリー
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            {municipality.name} — 全5部門の職員コンディションを集計し、AIサマリーをNotionに自動保存します。
          </p>
        </div>
      </div>

      {/* 集計期間カード */}
      <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
        <Clock size={20} className="text-violet-500 shrink-0" />
        <div>
          <p className="text-xs text-violet-500 font-medium">今週の集計期間</p>
          <p className="text-violet-800 font-semibold">{weekLabel}</p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-xs text-violet-500">自動実行</p>
          <p className="text-violet-700 text-sm font-medium">毎週月曜 9:00 JST</p>
        </div>
      </div>

      {/* 生成ボタン */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
        <p className="text-gray-600 text-sm">
          ボタンを押すと、今週分のデータを今すぐ集計・生成してNotionに保存します。
        </p>
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-violet-600 hover:bg-violet-700
                     disabled:bg-violet-300 text-white font-semibold rounded-xl
                     transition-colors shadow-sm text-base"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'サマリー生成中...' : '今すぐ生成する'}
        </button>
        {loading && (
          <p className="text-xs text-gray-400 animate-pulse">
            Notionからデータ取得 → AI分析 → ページ作成中（20〜30秒かかります）
          </p>
        )}
      </div>

      {/* 結果表示 */}
      {result && (
        <div className={`border rounded-xl overflow-hidden ${
          result.status === 'success'
            ? 'border-emerald-200'
            : 'border-red-200'
        }`}>

          {/* ステータスバー */}
          <div className={`px-5 py-3 flex items-center gap-2 ${
            result.status === 'success' ? 'bg-emerald-50' : 'bg-red-50'
          }`}>
            {result.status === 'success'
              ? <CheckCircle size={18} className="text-emerald-600" />
              : <AlertTriangle size={18} className="text-red-500" />
            }
            <span className={`font-semibold text-sm ${
              result.status === 'success' ? 'text-emerald-700' : 'text-red-600'
            }`}>
              {result.status === 'success' ? '生成完了' : 'エラーが発生しました'}
            </span>
            {elapsed > 0 && (
              <span className="ml-auto text-xs text-gray-400">{elapsed}秒</span>
            )}
          </div>

          <div className="bg-white p-5 space-y-5">

            {/* Notionリンク */}
            {result.notionPage && (
              <a
                href={result.notionPage.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-violet-600 hover:text-violet-800
                           font-medium text-sm underline underline-offset-2"
              >
                <ExternalLink size={15} />
                Notionでサマリーページを開く
              </a>
            )}

            {/* サマリー統計 */}
            {result.summary && (
              <>
                {/* 全体サマリー */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: '集計部門数',     value: `${result.summary.deptCount}部門` },
                    { label: '総提出件数',     value: `${result.summary.totalStaff}件` },
                    { label: '要注意スタッフ', value: `${result.summary.totalRisk}名`,
                      alert: result.summary.totalRisk > 0 },
                  ].map(item => (
                    <div key={item.label}
                      className={`rounded-lg p-3 text-center border ${
                        item.alert ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className={`text-lg font-bold mt-0.5 ${item.alert ? 'text-red-600' : 'text-gray-800'}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 部門別スコア */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
                    部門別 WBスコア（今週）
                  </p>
                  <div className="space-y-2">
                    {result.summary.deptStats.map(dept => (
                      <div key={dept.deptId}
                        className={`flex items-center gap-3 rounded-lg px-4 py-3 ${wbBg(dept.avgWB)}`}
                      >
                        {/* 部門名 */}
                        <span className="text-base">{dept.emoji}</span>
                        <span className="text-sm font-medium text-gray-700 w-20 shrink-0">
                          {dept.deptName}
                        </span>

                        {/* スコアバー */}
                        <div className="flex-1 bg-white/70 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${wbBar(dept.avgWB)}`}
                            style={{ width: `${dept.count > 0 ? dept.avgWB : 0}%` }}
                          />
                        </div>

                        {/* スコア数値 */}
                        <span className={`text-sm font-bold w-12 text-right ${wbColor(dept.avgWB)}`}>
                          {dept.count > 0 ? `${dept.avgWB}点` : 'データなし'}
                        </span>

                        {/* 前週比 */}
                        {dept.count > 0 && dept.prevAvgWB > 0 && (
                          <span className={`text-xs w-12 text-right ${
                            dept.trend > 0 ? 'text-emerald-600' :
                            dept.trend < 0 ? 'text-red-500' : 'text-gray-400'
                          }`}>
                            {dept.trend > 0 ? `↑+${dept.trend}` :
                             dept.trend < 0 ? `↓${dept.trend}` : '→±0'}
                          </span>
                        )}

                        {/* アラート */}
                        {dept.riskCount > 0 && (
                          <span className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-medium">
                            🔴 {dept.riskCount}名
                          </span>
                        )}
                        {dept.riskCount === 0 && dept.warningCount > 0 && (
                          <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full font-medium">
                            ⚠️ {dept.warningCount}名
                          </span>
                        )}
                        {dept.count > 0 && dept.riskCount === 0 && dept.warningCount === 0 && (
                          <span className="text-xs text-emerald-500">✅</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* エラーメッセージ */}
            {result.status === 'error' && (
              <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                {result.message}
              </p>
            )}
          </div>
        </div>
      )}

      {/* 補足説明 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>• 生成されたサマリーはNotionの「{municipality.name} RunWith」ページ配下に保存されます。</p>
        <p>• Vercel Cronにより毎週月曜9:00（JST）に自動実行されます（Proプラン必要）。</p>
        <p>• WB40点未満 🔴要注意 / 55点未満 ⚠️注意 / 70点以上 ✅良好</p>
      </div>
    </div>
  )
}
