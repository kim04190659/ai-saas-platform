'use client'
// =====================================================
//  src/components/yakushima/MigrationPanel.tsx
//  屋久島町 移住・定住支援パネル — Sprint #59
//
//  ■ 2タブ構成
//    Tab 1: 相談者一覧  — 全相談者を進捗ステータス順に表示
//    Tab 2: 断念・保留  — フォローアップが必要なケースを抽出
//
//  ■ サマリーカード（4枚）
//    相談総数 / 定住達成数 / 進行中 / 断念数
// =====================================================

import { useState, useEffect } from 'react'
import type { MigrationRecord, MigrationResponse } from '@/app/api/yakushima/migration-support/route'

// ─── ユーティリティ ───────────────────────────────────

/** 進捗ステータスに応じたバッジのスタイルを返す */
function statusStyle(s: string): string {
  switch (s) {
    case '定住確定':  return 'bg-green-200 text-green-800'
    case '移住済み':  return 'bg-green-100 text-green-700'
    case '移住準備中': return 'bg-yellow-100 text-yellow-700'
    case '見学予定':  return 'bg-blue-100 text-blue-700'
    case '相談中':    return 'bg-sky-100 text-sky-700'
    case '保留':      return 'bg-gray-100 text-gray-600'
    case '断念':      return 'bg-red-100 text-red-700'
    default:         return 'bg-gray-100 text-gray-500'
  }
}

/** 動機に応じたアイコンを返す */
function motivationIcon(m: string): string {
  switch (m) {
    case '自然環境':     return '🌿'
    case '子育て環境':   return '👶'
    case '就農・農業':   return '🌾'
    case '起業・テレワーク': return '💻'
    case 'UIターン':     return '🏡'
    default:            return '📋'
  }
}

// ─── 相談者カードコンポーネント ──────────────────────

function RecordCard({ r }: { r: MigrationRecord }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 hover:border-green-300 transition-colors">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">{motivationIcon(r.motivation)}</span>
          <div>
            <p className="font-semibold text-gray-800 text-sm">{r.name}</p>
            <p className="text-xs text-gray-500">{r.origin} · {r.ageGroup} · {r.householdType}</p>
          </div>
        </div>
        <span className={`text-xs px-2 py-1 rounded-full font-semibold ${statusStyle(r.status)}`}>
          {r.status}
        </span>
      </div>

      {/* 詳細情報 */}
      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        {r.motivation && (
          <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded">
            動機: {r.motivation}
          </span>
        )}
        {r.occupation && r.occupation !== '未定' && (
          <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
            就業: {r.occupation}
          </span>
        )}
        {r.subsidyStatus === '支給決定' && (
          <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-semibold">
            💴 補助金支給決定
          </span>
        )}
        {r.subsidyStatus === '申請中' && (
          <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded">
            補助金申請中
          </span>
        )}
      </div>

      {/* 備考 */}
      {r.notes && (
        <p className="mt-2 text-xs text-gray-600 leading-relaxed border-t border-gray-100 pt-2">
          {r.notes}
        </p>
      )}

      {/* 担当・相談日 */}
      <div className="mt-2 flex justify-between text-xs text-gray-400">
        <span>担当: {r.staffName || '未定'}</span>
        <span>{r.consultDate}</span>
      </div>
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export function MigrationPanel() {
  const [data,    setData]    = useState<MigrationResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState<string | null>(null)
  const [tab,     setTab]     = useState<'all' | 'followup'>('all')

  // データ取得
  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch('/api/yakushima/migration-support')
      .then(r => r.json())
      .then((json: MigrationResponse) => {
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
          <p className="text-gray-500 text-sm">移住相談データを読み込み中…</p>
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

  // フォローアップ対象（保留・断念）
  const followupRecords = data.records.filter(r => r.status === '保留' || r.status === '断念')

  // 定住達成率を計算
  const settleRate = data.summary.total > 0
    ? Math.round((data.summary.settled / data.summary.total) * 100)
    : 0

  return (
    <div className="space-y-6 p-4">

      {/* ── ヘッダー ─────────────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-700 rounded-xl p-6 text-white">
        <h1 className="text-xl font-bold">🏡 移住・定住支援</h1>
        <p className="text-emerald-100 text-sm mt-1">
          屋久島町 — 移住相談から定住・就農・起業まで伴走支援を管理
        </p>
      </div>

      {/* ── サマリーカード ──────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {/* 相談総数 */}
        <div className="bg-white rounded-xl border border-green-200 p-4 text-center">
          <p className="text-3xl font-bold text-green-700">{data.summary.total}</p>
          <p className="text-xs text-gray-500 mt-1">相談総数</p>
        </div>
        {/* 定住達成 */}
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 text-center">
          <p className="text-3xl font-bold text-emerald-700">{data.summary.settled}</p>
          <p className="text-xs text-gray-500 mt-1">定住達成（{settleRate}%）</p>
        </div>
        {/* 進行中 */}
        <div className="bg-blue-50 rounded-xl border border-blue-200 p-4 text-center">
          <p className="text-3xl font-bold text-blue-700">{data.summary.inProgress}</p>
          <p className="text-xs text-gray-500 mt-1">進行中（相談〜準備）</p>
        </div>
        {/* 断念 */}
        <div className={`rounded-xl border p-4 text-center ${data.summary.dropped > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
          <p className={`text-3xl font-bold ${data.summary.dropped > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {data.summary.dropped}
          </p>
          <p className="text-xs text-gray-500 mt-1">断念件数</p>
        </div>
      </div>

      {/* 補助金情報 */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
        <span className="text-2xl">💴</span>
        <div>
          <p className="font-semibold text-emerald-800 text-sm">
            定住補助金 支給決定: {data.summary.subsidyGranted} 件
          </p>
          <p className="text-xs text-emerald-600">
            島への移住・定住を経済面からサポートしています
          </p>
        </div>
      </div>

      {/* ── タブ切り替え ─────────────────────────────── */}
      <div className="flex gap-2 border-b border-gray-200">
        {([['all', `📋 全相談者 (${data.summary.total}件)`], ['followup', `🔄 フォロー必要 (${followupRecords.length}件)`]] as const).map(([key, label]) => (
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

      {/* ── Tab 1: 全相談者一覧 ───────────────────────── */}
      {tab === 'all' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.records.map(r => <RecordCard key={r.id} r={r} />)}
        </div>
      )}

      {/* ── Tab 2: フォローアップ対象 ─────────────────── */}
      {tab === 'followup' && (
        <div>
          {followupRecords.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <p className="text-2xl mb-2">✅</p>
              <p>フォローアップが必要な案件はありません</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                💬 保留・断念となった方への再アプローチ・制度改善の参考にしてください。
                特に断念理由「就職先なし」「コワーキング不足」は、インフラ整備で解決できる可能性があります。
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {followupRecords.map(r => <RecordCard key={r.id} r={r} />)}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
