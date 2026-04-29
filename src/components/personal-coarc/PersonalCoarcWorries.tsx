'use client'
// =====================================================
//  src/components/personal-coarc/PersonalCoarcWorries.tsx
//  Personal Coarc 生活困り解決ダッシュボード — Sprint #61
//
//  ■ 表示内容
//    - 6つの生活困りカテゴリ（Notionから取得）
//    - フィルター: 生活環境タイプ / 生活領域 / 実装状況
//    - 各困りカード: タイトル・AI解決策・優先度・実装状況
//
//  ■ データソース: /api/personal-coarc/worries
// =====================================================

import { useState, useEffect } from 'react'
import type { WorryRecord, WorriesResponse } from '@/app/api/personal-coarc/worries/route'

// ─── ユーティリティ ───────────────────────────────────

/** 実装状況に応じたバッジスタイル */
function statusStyle(s: string): string {
  if (s.includes('実装済み')) return 'bg-green-100 text-green-700'
  if (s.includes('実装中'))   return 'bg-yellow-100 text-yellow-700'
  if (s.includes('計画中'))   return 'bg-blue-100 text-blue-700'
  if (s.includes('アイデア')) return 'bg-gray-100 text-gray-600'
  return 'bg-gray-100 text-gray-500'
}

/** 優先度に応じたバッジスタイル */
function priorityStyle(p: string): string {
  if (p === '高') return 'bg-red-100 text-red-700'
  if (p === '中') return 'bg-yellow-100 text-yellow-700'
  return 'bg-gray-100 text-gray-500'
}

/** 生活領域に応じたアイコン */
function domainIcon(domain: string): string {
  if (domain.includes('お金'))   return '💰'
  if (domain.includes('健康'))   return '🏥'
  if (domain.includes('家事'))   return '🏠'
  if (domain.includes('子育て')) return '👶'
  if (domain.includes('介護'))   return '👴'
  if (domain.includes('仕事'))   return '💼'
  if (domain.includes('人間'))   return '🤝'
  if (domain.includes('学習'))   return '📚'
  return '📋'
}

// ─── 困りカードコンポーネント ─────────────────────────

function WorryCard({ r }: { r: WorryRecord }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-purple-300 transition-colors">
      {/* ヘッダー行 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <span className="text-xl mt-0.5">{domainIcon(r.domain)}</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm leading-snug">{r.title}</p>
            <p className="text-xs text-gray-400 mt-0.5">{r.lifeType} · {r.domain}</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${statusStyle(r.status)}`}>
            {r.status}
          </span>
          {r.priority && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priorityStyle(r.priority)}`}>
              優先度: {r.priority}
            </span>
          )}
        </div>
      </div>

      {/* AI解決策 */}
      {r.aiSolution && (
        <div className="mt-3 bg-purple-50 rounded-lg p-3 border border-purple-100">
          <p className="text-xs font-semibold text-purple-700 mb-1">🤖 AI解決策</p>
          <p className="text-xs text-gray-700 leading-relaxed">{r.aiSolution}</p>
        </div>
      )}

      {/* 展開ボタン */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="mt-2 text-xs text-purple-600 hover:text-purple-800 font-medium"
      >
        {expanded ? '▲ 詳細を閉じる' : '▼ 詳細・根本原因を見る'}
      </button>

      {/* 展開時の詳細 */}
      {expanded && (
        <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
          {r.detail && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-0.5">📝 困りの詳細</p>
              <p className="text-xs text-gray-600 leading-relaxed">{r.detail}</p>
            </div>
          )}
          {r.rootCause && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-0.5">🔍 根本原因</p>
              <p className="text-xs text-gray-600 leading-relaxed">{r.rootCause}</p>
            </div>
          )}
          {r.requiredData && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-0.5">📊 必要なデータ</p>
              <p className="text-xs text-gray-500">{r.requiredData}</p>
            </div>
          )}
          {r.dataMethod && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-0.5">🔄 データ収集方法</p>
              <p className="text-xs text-gray-500">{r.dataMethod}</p>
            </div>
          )}
          {r.evidence && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-0.5">📎 調査根拠</p>
              <p className="text-xs text-gray-400 leading-relaxed">{r.evidence}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export function PersonalCoarcWorries() {
  const [data,         setData]         = useState<WorriesResponse | null>(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState<string | null>(null)
  const [filterType,   setFilterType]   = useState<string>('all')   // 生活環境タイプ
  const [filterDomain, setFilterDomain] = useState<string>('all')   // 生活領域
  const [filterStatus, setFilterStatus] = useState<string>('all')   // 実装状況

  useEffect(() => {
    fetch('/api/personal-coarc/worries')
      .then(r => r.json())
      .then((json: WorriesResponse) => {
        if (json.status !== 'success') throw new Error(json.message ?? 'データ取得失敗')
        setData(json)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full mx-auto mb-3" />
          <p className="text-gray-500 text-sm">生活困りデータを読み込み中…</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
        <p className="text-red-700 font-semibold">⚠ データ取得エラー</p>
        <p className="text-red-600 text-sm mt-1">{error}</p>
      </div>
    )
  }

  if (!data) return null

  // ユニークなフィルター選択肢を抽出
  const lifeTypes = ['all', ...Array.from(new Set(data.records.map(r => r.lifeType).filter(Boolean)))]
  const domains   = ['all', ...Array.from(new Set(data.records.map(r => r.domain).filter(Boolean)))]
  const statuses  = ['all', ...Array.from(new Set(data.records.map(r => r.status).filter(Boolean)))]

  // フィルタリング
  const filtered = data.records.filter(r => {
    if (filterType   !== 'all' && r.lifeType !== filterType)   return false
    if (filterDomain !== 'all' && r.domain   !== filterDomain) return false
    if (filterStatus !== 'all' && r.status   !== filterStatus) return false
    return true
  })

  return (
    <div className="space-y-6 p-4">

      {/* ── ヘッダー ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-purple-600 to-violet-700 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold">🧑‍👩‍👧‍👦 Personal Coarc 生活困り解決ダッシュボード</h1>
        <p className="text-purple-100 text-sm mt-1">
          生活の困りごとをAIが分析し、データに基づいた解決策を提案します
        </p>
      </div>

      {/* ── サマリーカード ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-xl border border-purple-200 p-3 text-center">
          <p className="text-2xl font-bold text-purple-700">{data.summary.total}</p>
          <p className="text-xs text-gray-500">困りカテゴリ数</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-3 text-center">
          <p className="text-2xl font-bold text-green-700">{data.summary.implemented}</p>
          <p className="text-xs text-gray-500">✅ 実装済み</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-3 text-center">
          <p className="text-2xl font-bold text-yellow-700">{data.summary.inProgress}</p>
          <p className="text-xs text-gray-500">🔧 実装中</p>
        </div>
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-3 text-center">
          <p className="text-2xl font-bold text-blue-700">{data.summary.planned}</p>
          <p className="text-xs text-gray-500">📋 計画中</p>
        </div>
        <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
          <p className="text-2xl font-bold text-red-700">{data.summary.highPriority}</p>
          <p className="text-xs text-gray-500">🔴 優先度高</p>
        </div>
      </div>

      {/* ── フィルター ──────────────────────────────── */}
      <div className="flex flex-wrap gap-3 bg-gray-50 rounded-xl p-4">
        {/* 生活環境タイプ */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">生活環境:</label>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
          >
            {lifeTypes.map(t => (
              <option key={t} value={t}>{t === 'all' ? '全て' : t}</option>
            ))}
          </select>
        </div>
        {/* 生活領域 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">生活領域:</label>
          <select
            value={filterDomain}
            onChange={e => setFilterDomain(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
          >
            {domains.map(d => (
              <option key={d} value={d}>{d === 'all' ? '全て' : d}</option>
            ))}
          </select>
        </div>
        {/* 実装状況 */}
        <div className="flex items-center gap-2">
          <label className="text-xs text-gray-500 font-semibold">実装状況:</label>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
          >
            {statuses.map(s => (
              <option key={s} value={s}>{s === 'all' ? '全て' : s}</option>
            ))}
          </select>
        </div>
        {/* 件数 */}
        <div className="ml-auto text-xs text-gray-400 self-center">
          {filtered.length} 件表示
        </div>
      </div>

      {/* ── 困りカード一覧 ──────────────────────────── */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-2xl mb-2">🔍</p>
          <p>条件に合う困りカテゴリがありません</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map(r => <WorryCard key={r.id} r={r} />)}
        </div>
      )}
    </div>
  )
}
