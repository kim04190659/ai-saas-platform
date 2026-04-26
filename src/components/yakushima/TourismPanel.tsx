'use client'
// =====================================================
//  src/components/yakushima/TourismPanel.tsx
//  屋久島町 観光管理パネル — Sprint #59
//
//  ■ 2タブ構成
//    Tab 1: スポット別状況  — 入込数・混雑度・環境負荷・ガイド充足率
//    Tab 2: 注意事項まとめ — 問題スポットを優先表示
//
//  ■ サマリーカード（4枚）
//    総入込数 / 高混雑スポット数 / 環境負荷警告数 / ガイド不足数
// =====================================================

import { useState, useEffect } from 'react'
import type { TourismRecord, TourismResponse } from '@/app/api/yakushima/tourism/route'

// ─── ユーティリティ ───────────────────────────────────

/** 混雑度に応じたバッジのスタイルを返す */
function congestionStyle(level: string): string {
  switch (level) {
    case '高混雑': return 'bg-red-100 text-red-700'
    case '中混雑': return 'bg-orange-100 text-orange-700'
    case '低混雑': return 'bg-green-100 text-green-700'
    default:       return 'bg-gray-100 text-gray-500'
  }
}

/** 環境負荷レベルに応じたバッジのスタイルを返す */
function envStyle(level: string): string {
  switch (level) {
    case '危険': return 'bg-red-100 text-red-700'
    case '注意': return 'bg-orange-100 text-orange-700'
    case '正常': return 'bg-blue-100 text-blue-700'
    case '良好': return 'bg-green-100 text-green-700'
    default:     return 'bg-gray-100 text-gray-500'
  }
}

/** ガイド充足率に応じた色クラスを返す */
function sufficiencyColor(rate: number): string {
  if (rate >= 0.95) return 'text-green-600'
  if (rate >= 0.85) return 'text-orange-600'
  return 'text-red-600'
}

// ─── スポット行コンポーネント ─────────────────────────

function SpotRow({ r }: { r: TourismRecord }) {
  return (
    <tr className="hover:bg-green-50 transition-colors">
      {/* スポット名 */}
      <td className="px-4 py-3 font-medium text-gray-800 text-sm">{r.spotName}</td>
      {/* 年月 */}
      <td className="px-4 py-3 text-gray-500 text-sm">{r.yearMonth}</td>
      {/* 入込客数 */}
      <td className="px-4 py-3 text-right font-semibold text-gray-800 text-sm">
        {r.visitors.toLocaleString()} 人
      </td>
      {/* 前月比 */}
      <td className="px-4 py-3 text-right text-sm">
        <span className={r.momChange >= 1 ? 'text-red-600' : 'text-blue-600'}>
          {r.momChange >= 1 ? '▲' : '▼'} {Math.abs((r.momChange - 1) * 100).toFixed(0)}%
        </span>
      </td>
      {/* 混雑度 */}
      <td className="px-4 py-3 text-center">
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${congestionStyle(r.congestion)}`}>
          {r.congestion}
        </span>
      </td>
      {/* 環境負荷 */}
      <td className="px-4 py-3 text-center">
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${envStyle(r.envLoad)}`}>
          {r.envLoad}
        </span>
      </td>
      {/* ガイド充足率 */}
      <td className="px-4 py-3 text-right text-sm">
        {r.guidedBookings > 0 ? (
          <span className={`font-semibold ${sufficiencyColor(r.guideSufficiency)}`}>
            {(r.guideSufficiency * 100).toFixed(0)}%
          </span>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
    </tr>
  )
}

// ─── 注意スポット行コンポーネント ─────────────────────

function AlertRow({ r, i }: { r: TourismRecord; i: number }) {
  const issues: string[] = []
  if (r.congestion === '高混雑') issues.push('混雑オーバー')
  if (r.envLoad === '危険' || r.envLoad === '注意') issues.push(`環境負荷${r.envLoad}`)
  if (r.guidedBookings > 0 && r.guideSufficiency < 0.9) issues.push('ガイド不足')

  return (
    <div className="border border-orange-200 rounded-lg p-4 bg-orange-50">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-orange-600 font-bold text-sm">#{i + 1}</span>
          <span className="font-semibold text-gray-800">{r.spotName}</span>
          <span className="text-xs text-gray-500">{r.yearMonth}</span>
        </div>
        <div className="flex gap-1 flex-wrap">
          {issues.map((iss) => (
            <span key={iss} className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-semibold">
              ⚠ {iss}
            </span>
          ))}
        </div>
      </div>
      {r.notes && (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">💬 {r.notes}</p>
      )}
      <div className="mt-2 flex gap-4 text-xs text-gray-500">
        <span>入込: {r.visitors.toLocaleString()}人</span>
        <span>ガイド: {r.guidedBookings}件</span>
        <span>充足率: {r.guidedBookings > 0 ? `${(r.guideSufficiency * 100).toFixed(0)}%` : '-'}</span>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export function TourismPanel() {
  const [data,    setData]    = useState<TourismResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<'list' | 'alerts'>('list')

  // データ取得
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/yakushima/tourism')
      .then(r => r.json())
      .then((json: TourismResponse) => {
        if (json.status !== 'success') throw new Error(json.message ?? 'データ取得失敗')
        setData(json)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  // ── ローディング表示 ─────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">観光データを読み込み中…</p>
        </div>
      </div>
    )
  }

  // ── エラー表示 ───────────────────────────────────────
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <p className="text-red-700 font-semibold">⚠ データ取得エラー</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) return null

  // 注意スポットを抽出（混雑・環境・ガイド不足のいずれかに該当）
  const alertRecords = data.records.filter(r =>
    r.congestion === '高混雑' ||
    r.envLoad === '危険' ||
    r.envLoad === '注意' ||
    (r.guidedBookings > 0 && r.guideSufficiency < 0.9)
  )

  return (
    <div className="space-y-6 p-4">

      {/* ── ヘッダー ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-700 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold">🌿 観光・エコツーリズム管理</h1>
        <p className="text-green-100 text-sm mt-1">
          屋久島町 — 縄文杉・白谷雲水峡などのスポット別入込状況・環境負荷をモニタリング
        </p>
      </div>

      {/* ── サマリーカード ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 総入込数 */}
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{data.summary.totalVisitors.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">今月 総入込数（人）</p>
        </div>
        {/* 高混雑 */}
        <div className={`rounded-xl border p-4 text-center ${data.summary.highCongestion > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-3xl font-bold ${data.summary.highCongestion > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {data.summary.highCongestion}
          </p>
          <p className="text-xs text-gray-500 mt-1">高混雑スポット数</p>
        </div>
        {/* 環境負荷警告 */}
        <div className={`rounded-xl border p-4 text-center ${data.summary.envWarning > 0 ? 'bg-orange-50 border-orange-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-3xl font-bold ${data.summary.envWarning > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {data.summary.envWarning}
          </p>
          <p className="text-xs text-gray-500 mt-1">環境負荷警告スポット</p>
        </div>
        {/* ガイド不足 */}
        <div className={`rounded-xl border p-4 text-center ${data.summary.guideShortage > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-3xl font-bold ${data.summary.guideShortage > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
            {data.summary.guideShortage}
          </p>
          <p className="text-xs text-gray-500 mt-1">ガイド不足スポット</p>
        </div>
      </div>

      {/* ── タブ切り替え ─────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200">
        {([['list', '📋 スポット別一覧'], ['alerts', `⚠️ 要注意 (${alertRecords.length})`]] as const).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 text-sm font-semibold border-b-2 transition-colors ${
              tab === key
                ? 'border-green-500 text-green-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Tab 1: スポット別一覧 ─────────────────────── */}
      {tab === 'list' && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-gray-200 rounded-xl overflow-hidden">
            <thead className="bg-green-50">
              <tr>
                {['スポット名', '年月', '入込客数', '前月比', '混雑度', '環境負荷', 'ガイド充足率'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data.records.map(r => <SpotRow key={r.id} r={r} />)}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Tab 2: 注意スポット ───────────────────────── */}
      {tab === 'alerts' && (
        <div className="space-y-3">
          {alertRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">✅</p>
              <p>現在、注意が必要なスポットはありません</p>
            </div>
          ) : (
            alertRecords.map((r, i) => <AlertRow key={r.id} r={r} i={i} />)
          )}
        </div>
      )}
    </div>
  )
}
