'use client'

// =====================================================
//  src/components/dept/RiskScoringPanel.tsx
//  離職リスクスコアリング 手動実行パネル — Sprint #28
//
//  ■ 役割
//    「今すぐ分析」ボタンから /api/cron/risk-scoring を呼び出し、
//    職員のWBスコア低下傾向・リスクレベルを表示する。
//    部門別サマリー + 職員別リスクカードをその場で表示。
// =====================================================

import { useState } from 'react'
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  ExternalLink,
  RefreshCw,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Minus,
  Users,
} from 'lucide-react'
// Sprint #42: wbColor を共通モジュールからインポート
import { wbColor } from '@/components/ui/WbScore'

// ─── 型定義 ──────────────────────────────────────────

interface StaffRisk {
  staffName:     string
  department:    string
  deptId:        string
  deptEmoji:     string
  riskLevel:     'high' | 'mid' | 'low'
  latestWB:      number
  weeklyScores:  number[]
  trend:         number
  latestComment: string
  riskReason:    string
}

interface DeptRiskSummary {
  deptId:   string
  deptName: string
  emoji:    string
  total:    number
  highRisk: number
  midRisk:  number
  lowRisk:  number
  avgWB:    number
}

interface RiskResult {
  status:    'success' | 'error'
  dateLabel: string
  message:   string
  summary?: {
    total:       number
    highRisk:    number
    midRisk:     number
    lowRisk:     number
    deptSummary: DeptRiskSummary[]
    staffRisks:  StaffRisk[]
  }
  notionPage?: { id: string; url: string }
}

// ─── スタイルヘルパー ──────────────────────────────────

function riskBadge(level: 'high' | 'mid' | 'low') {
  if (level === 'high') return { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    label: '🔴 高リスク' }
  if (level === 'mid')  return { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  label: '🟡 中リスク' }
  return                       { bg: 'bg-emerald-100', text: 'text-emerald-700', border: 'border-emerald-300', label: '🟢 低リスク' }
}

// wbColor は src/components/ui/WbScore から共通インポート済み（Sprint #42）

/** 週スコアのミニバー（4週分を可視化）*/
function WeeklyBar({ scores }: { scores: number[] }) {
  return (
    <div className="flex items-end gap-0.5 h-8">
      {scores.map((score, i) => {
        const height = score < 0 ? 2 : Math.max(4, Math.round((score / 100) * 32))
        const color  = score < 0
          ? 'bg-gray-200'
          : score >= 70 ? 'bg-emerald-500'
          : score >= 55 ? 'bg-amber-400'
          : 'bg-red-400'
        return (
          <div key={i} className="flex flex-col items-center gap-0.5 w-4">
            <div
              className={`w-3 rounded-sm ${color} transition-all`}
              style={{ height: `${height}px` }}
              title={score < 0 ? 'データなし' : `${score}点`}
            />
          </div>
        )
      })}
    </div>
  )
}

/** トレンドアイコン */
function TrendIcon({ trend }: { trend: number }) {
  if (trend >= 5)  return <TrendingUp  size={14} className="text-emerald-500" />
  if (trend <= -5) return <TrendingDown size={14} className="text-red-500" />
  return <Minus size={14} className="text-gray-400" />
}

// ─── コンポーネント ───────────────────────────────────

export function RiskScoringPanel() {
  const [loading, setLoading] = useState(false)
  const [result,  setResult]  = useState<RiskResult | null>(null)
  const [elapsed, setElapsed] = useState(0)
  // 表示フィルター（all / high / mid）
  const [filter,  setFilter]  = useState<'all' | 'high' | 'mid'>('all')

  async function handleAnalyze() {
    setLoading(true)
    setResult(null)
    const start = Date.now()

    try {
      const res  = await fetch('/api/cron/risk-scoring')
      const data = await res.json() as RiskResult
      setElapsed(Math.round((Date.now() - start) / 1000))
      setResult(data)
    } catch (e) {
      setElapsed(Math.round((Date.now() - start) / 1000))
      setResult({
        status:    'error',
        dateLabel: '',
        message:   `通信エラー: ${e instanceof Error ? e.message : String(e)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  // 絞り込んだ職員リスト
  const filteredStaff = result?.summary?.staffRisks.filter(s => {
    if (filter === 'high') return s.riskLevel === 'high'
    if (filter === 'mid')  return s.riskLevel === 'high' || s.riskLevel === 'mid'
    return true
  }) ?? []

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ShieldAlert className="text-red-500" size={28} />
            離職リスクスコアリング
          </h1>
          <p className="mt-1 text-gray-500 text-sm">
            過去4週間のWBスコア推移を職員ごとに分析し、低下傾向・危険水準を自動検知します。
          </p>
        </div>
      </div>

      {/* 説明カード */}
      <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
        <Clock size={20} className="text-red-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="text-xs text-red-500 font-medium">分析対象期間</p>
          <p className="text-red-800 font-semibold text-sm">直近28日間（4週分）のコンディションデータ</p>
          <p className="text-xs text-red-600 mt-1">
            🔴 高リスク: WB40点未満 または WB55未満＋10点以上低下 ／
            🟡 中リスク: WB55点未満 または WB70未満＋5点以上低下
          </p>
        </div>
        <div className="ml-auto text-right shrink-0">
          <p className="text-xs text-red-500">自動実行</p>
          <p className="text-red-700 text-sm font-medium">毎週月曜 9:30 JST</p>
        </div>
      </div>

      {/* 実行ボタン */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 text-center space-y-4">
        <p className="text-gray-600 text-sm">
          ボタンを押すと、直近4週間のデータを集計・リスク分析してNotionにレポートを保存します。
        </p>
        <button
          onClick={handleAnalyze}
          disabled={loading}
          className="inline-flex items-center gap-2 px-8 py-3 bg-red-600 hover:bg-red-700
                     disabled:bg-red-300 text-white font-semibold rounded-xl
                     transition-colors shadow-sm text-base"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          {loading ? 'リスク分析中...' : '今すぐ分析する'}
        </button>
        {loading && (
          <p className="text-xs text-gray-400 animate-pulse">
            Notionからデータ取得 → 職員別トレンド分析 → AI提言生成中（20〜40秒かかります）
          </p>
        )}
      </div>

      {/* 結果表示 */}
      {result && (
        <div className={`border rounded-xl overflow-hidden ${
          result.status === 'success' ? 'border-gray-200' : 'border-red-200'
        }`}>

          {/* ステータスバー */}
          <div className={`px-5 py-3 flex items-center gap-2 ${
            result.status === 'success' ? 'bg-gray-50' : 'bg-red-50'
          }`}>
            {result.status === 'success'
              ? <CheckCircle size={18} className="text-emerald-600" />
              : <AlertTriangle size={18} className="text-red-500" />
            }
            <span className={`font-semibold text-sm ${
              result.status === 'success' ? 'text-gray-700' : 'text-red-600'
            }`}>
              {result.status === 'success' ? '分析完了' : 'エラーが発生しました'}
            </span>
            {elapsed > 0 && (
              <span className="ml-auto text-xs text-gray-400">{elapsed}秒</span>
            )}
          </div>

          <div className="bg-white p-5 space-y-6">

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
                Notionでリスクレポートを開く
              </a>
            )}

            {/* サマリーカード */}
            {result.summary && (
              <>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { label: '分析人数',     value: `${result.summary.total}名`,    alert: false },
                    { label: '🔴 高リスク', value: `${result.summary.highRisk}名`, alert: result.summary.highRisk > 0, cls: 'text-red-600' },
                    { label: '🟡 中リスク', value: `${result.summary.midRisk}名`,  alert: result.summary.midRisk  > 0, cls: 'text-amber-600' },
                    { label: '🟢 低リスク', value: `${result.summary.lowRisk}名`,  alert: false, cls: 'text-emerald-600' },
                  ].map(item => (
                    <div key={item.label}
                      className={`rounded-lg p-3 text-center border ${
                        item.alert ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'
                      }`}
                    >
                      <p className="text-xs text-gray-500">{item.label}</p>
                      <p className={`text-lg font-bold mt-0.5 ${item.cls ?? 'text-gray-800'}`}>
                        {item.value}
                      </p>
                    </div>
                  ))}
                </div>

                {/* 部門別サマリー */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Users size={12} />
                    部門別リスク分布
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.summary.deptSummary.map(dept => (
                      <div key={dept.deptId}
                        className={`flex items-center gap-2 rounded-lg px-3 py-2 border text-sm ${
                          dept.highRisk > 0 ? 'bg-red-50 border-red-200' :
                          dept.midRisk  > 0 ? 'bg-amber-50 border-amber-200' :
                          'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <span>{dept.emoji}</span>
                        <span className="font-medium text-gray-700 w-20 shrink-0">{dept.deptName}</span>
                        <span className="text-xs text-red-600">🔴 {dept.highRisk}</span>
                        <span className="text-xs text-amber-600">🟡 {dept.midRisk}</span>
                        <span className="text-xs text-emerald-600">🟢 {dept.lowRisk}</span>
                        <span className={`ml-auto text-sm font-bold ${wbColor(dept.avgWB)}`}>
                          avg {dept.avgWB}点
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* フィルタータブ */}
                <div>
                  <div className="flex gap-2 mb-3">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide self-center mr-2">
                      職員別リスク一覧
                    </p>
                    {[
                      { key: 'all',  label: `全員 (${result.summary.total})` },
                      { key: 'high', label: `🔴 高リスクのみ (${result.summary.highRisk})` },
                      { key: 'mid',  label: `🔴+🟡 (${result.summary.highRisk + result.summary.midRisk})` },
                    ].map(f => (
                      <button
                        key={f.key}
                        onClick={() => setFilter(f.key as typeof filter)}
                        className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                          filter === f.key
                            ? 'bg-gray-800 text-white border-gray-800'
                            : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                        }`}
                      >
                        {f.label}
                      </button>
                    ))}
                  </div>

                  {/* 職員リスクカード一覧 */}
                  <div className="space-y-2">
                    {filteredStaff.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-6">
                        {filter === 'high' ? '高リスク職員はいません ✅' : '対象データがありません'}
                      </p>
                    ) : (
                      filteredStaff.map((staff, i) => {
                        const badge = riskBadge(staff.riskLevel)
                        return (
                          <div key={i}
                            className={`flex items-start gap-3 rounded-xl px-4 py-3 border ${badge.bg} ${badge.border}`}
                          >
                            {/* 部門絵文字 */}
                            <span className="text-xl mt-0.5 shrink-0">{staff.deptEmoji}</span>

                            {/* 名前・部署 */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-gray-800 text-sm">
                                  {staff.staffName}
                                </span>
                                <span className="text-xs text-gray-500">{staff.department}</span>
                                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.bg} ${badge.text} border ${badge.border}`}>
                                  {badge.label}
                                </span>
                              </div>
                              <p className="text-xs text-gray-500 mt-0.5">{staff.riskReason}</p>
                              {staff.latestComment && (
                                <p className="text-xs text-gray-600 mt-1 italic">
                                  「{staff.latestComment}」
                                </p>
                              )}
                            </div>

                            {/* WBスコア + トレンド */}
                            <div className="flex flex-col items-end gap-1 shrink-0">
                              <div className="flex items-center gap-1">
                                <TrendIcon trend={staff.trend} />
                                <span className={`text-lg font-bold ${wbColor(staff.latestWB)}`}>
                                  {staff.latestWB}点
                                </span>
                              </div>
                              <WeeklyBar scores={staff.weeklyScores} />
                              <span className="text-xs text-gray-400">
                                {staff.trend > 0 ? `+${staff.trend}` : staff.trend}点（4週比）
                              </span>
                            </div>
                          </div>
                        )
                      })
                    )}
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
        <p>• 生成されたリスクレポートはNotionの「🌱 新RunWith Platform」配下に保存されます。</p>
        <p>• Vercel Cronにより毎週月曜9:30（JST）に自動実行されます（週次WBサマリーの直後）。</p>
        <p>• 🔴高リスク: WB40点未満 または（WB55未満＋10点以上低下） ／ 🟡中リスク: WB55点未満 または（WB70未満＋5点以上低下）</p>
        <p>• ⚠️ 本機能は職員を支援するためのものです。データは人事・管理者が適切に活用してください。</p>
      </div>
    </div>
  )
}
