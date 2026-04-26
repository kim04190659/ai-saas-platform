'use client'
// =====================================================
//  src/components/kirishima/KirishimaPdcaPanel.tsx
//  霧島市 PDCA 追跡パネル — Sprint #49
//
//  屋久島町版（YakushimaPdcaPanel）と同じ UI 構造。
//  APIエンドポイントを /api/kirishima/pdca-tracking に、
//  施策カテゴリを霧島市向けに変更。
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import { SummaryCard } from '@/components/ui/SummaryCard'
import type { PolicyRecord } from '@/lib/yakushima-pdca-engine'

// ─── ステータス設定 ────────────────────────────────────────
const STATUS_CONFIG: Record<PolicyRecord['ステータス'], {
  label: string; bg: string; border: string; badge: string; dot: string
}> = {
  '検討中': { label: '🔍 検討中', bg: 'bg-gray-50',   border: 'border-gray-200',  badge: 'bg-gray-100 text-gray-700',   dot: 'bg-gray-400'  },
  '実施中': { label: '⚡ 実施中', bg: 'bg-blue-50',   border: 'border-blue-200',  badge: 'bg-blue-100 text-blue-700',   dot: 'bg-blue-500'  },
  '完了':   { label: '✅ 完了',   bg: 'bg-green-50',  border: 'border-green-200', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  '却下':   { label: '❌ 却下',   bg: 'bg-red-50',    border: 'border-red-200',   badge: 'bg-red-100 text-red-700',     dot: 'bg-red-400'   },
}

// 緊急度ラベル
const URGENCY_LABEL: Record<string, string> = {
  immediate: '🔴 緊急', short: '🟡 短期', medium: '🟢 中期'
}

// ─── API レスポンス型 ─────────────────────────────────────

type KanbanData = Record<PolicyRecord['ステータス'], PolicyRecord[]>

type EvaluationResult = {
  status: string
  summary?: string
  completedPolicies?: number
  avgEffectScore?: number
  dataChanges?: { schoolTrend: string; ictTrend: string; migrationTrend: string; tourismTrend: string }
  recommendations?: string[]
}

// ─── 施策登録フォーム（霧島市向けカテゴリ） ──────────────

type RegisterFormProps = {
  onRegister: () => void
}

function RegisterForm({ onRegister }: RegisterFormProps) {
  const [open, setOpen]     = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm]     = useState<{
    施策名: string; カテゴリ: string
    緊急度: 'immediate' | 'short' | 'medium'
    担当部門: string; 期待効果: string; 根拠データ_実施前: string
  }>({
    施策名: '', カテゴリ: '廃棄物管理', 緊急度: 'short',
    担当部門: '', 期待効果: '', 根拠データ_実施前: ''
  })

  const handleSubmit = async () => {
    if (!form.施策名.trim()) return
    setSaving(true)
    await fetch('/api/kirishima/pdca-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', policy: form }),
    })
    setSaving(false)
    setOpen(false)
    setForm({ 施策名: '', カテゴリ: '廃棄物管理', 緊急度: 'short', 担当部門: '', 期待効果: '', 根拠データ_実施前: '' })
    onRegister()
  }

  if (!open) return (
    <button
      onClick={() => setOpen(true)}
      className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50 transition"
    >
      ➕ 施策を追加登録
    </button>
  )

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 space-y-4">
        <h3 className="font-bold text-gray-800">施策を登録（霧島市）</h3>

        <div className="space-y-3">
          <input
            type="text" placeholder="施策名（必須）"
            value={form.施策名}
            onChange={e => setForm(f => ({ ...f, 施策名: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
          <div className="grid grid-cols-2 gap-3">
            {/* 霧島市のカテゴリ */}
            <select
              value={form.カテゴリ}
              onChange={e => setForm(f => ({ ...f, カテゴリ: e.target.value }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              {['廃棄物管理','道路・インフラ','観光振興','高齢者支援','DX推進','その他'].map(c => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select
              value={form.緊急度}
              onChange={e => setForm(f => ({ ...f, 緊急度: e.target.value as 'immediate'|'short'|'medium' }))}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="immediate">🔴 緊急</option>
              <option value="short">🟡 短期</option>
              <option value="medium">🟢 中期</option>
            </select>
          </div>
          <input
            type="text" placeholder="担当部門（例：市民環境部）"
            value={form.担当部門}
            onChange={e => setForm(f => ({ ...f, 担当部門: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          <textarea
            placeholder="期待効果（どうなると良いか）"
            value={form.期待効果}
            onChange={e => setForm(f => ({ ...f, 期待効果: e.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
          <textarea
            placeholder="根拠データ（実施前の数値：例「可燃ゴミ収集量1,850t/月、リサイクル率18%」）"
            value={form.根拠データ_実施前}
            onChange={e => setForm(f => ({ ...f, 根拠データ_実施前: e.target.value }))}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button onClick={() => setOpen(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving || !form.施策名.trim()}
            className="px-5 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 disabled:opacity-50 transition"
          >
            {saving ? '登録中…' : '登録する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 施策カード ────────────────────────────────────────────

type PolicyCardProps = {
  policy: PolicyRecord
  onStatusChange: (pageId: string, status: string) => void
}

function PolicyCard({ policy, onStatusChange }: PolicyCardProps) {
  const cfg   = STATUS_CONFIG[policy.ステータス]
  const next  = policy.ステータス === '検討中' ? '実施中'
              : policy.ステータス === '実施中'  ? '完了'
              : null

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} p-4 space-y-2`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600">
          {policy.カテゴリ}
        </span>
        <span className="text-xs text-gray-400 shrink-0">
          {URGENCY_LABEL[policy.緊急度]}
        </span>
      </div>

      {/* 施策名 */}
      <p className="text-sm font-bold text-gray-800 leading-snug">{policy.施策名}</p>

      {/* 担当部門 */}
      {policy.担当部門 && (
        <p className="text-xs text-gray-500">担当: {policy.担当部門}</p>
      )}

      {/* 期待効果 */}
      {policy.期待効果 && (
        <p className="text-xs text-gray-600 bg-white rounded-lg p-2 border border-gray-100">
          {policy.期待効果}
        </p>
      )}

      {/* 実施前データ */}
      {policy.根拠データ_実施前 && (
        <div className="text-xs text-gray-500">
          <span className="font-medium">実施前: </span>{policy.根拠データ_実施前}
        </div>
      )}

      {/* 実施後データ（完了時のみ） */}
      {policy.ステータス === '完了' && policy.根拠データ_実施後 && (
        <div className="text-xs text-green-700 bg-green-50 rounded-lg p-2 border border-green-200">
          <span className="font-medium">✅ 実施後: </span>{policy.根拠データ_実施後}
        </div>
      )}

      {/* 効果スコア（完了時） */}
      {policy.ステータス === '完了' && policy.効果スコア !== null && (
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">効果スコア:</span>
          {[1,2,3,4,5].map(s => (
            <span key={s} className={`text-sm ${s <= (policy.効果スコア ?? 0) ? 'text-yellow-500' : 'text-gray-200'}`}>★</span>
          ))}
        </div>
      )}

      {/* ステータス変更ボタン */}
      {next && (
        <button
          onClick={() => onStatusChange(policy.id, next)}
          className="w-full text-xs py-1.5 bg-white border border-gray-300 text-gray-600 rounded-lg hover:bg-gray-50 transition mt-1"
        >
          → {next} に移動
        </button>
      )}
    </div>
  )
}

// ─── メインパネル ──────────────────────────────────────────

export function KirishimaPdcaPanel() {
  const [kanban, setKanban]         = useState<KanbanData | null>(null)
  const [loading, setLoading]       = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null)
  const [activeTab, setActiveTab]   = useState<'kanban' | 'evaluation'>('kanban')

  // ─── データ読み込み ──────────────────────────────────────
  const loadPolicies = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/kirishima/pdca-tracking')
      const data = await res.json() as { kanban: KanbanData }
      setKanban(data.kanban)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadPolicies() }, [loadPolicies])

  // ─── ステータス変更 ──────────────────────────────────────
  const handleStatusChange = async (pageId: string, status: string) => {
    const update: Record<string, unknown> = { ステータス: status }
    const today = new Date().toISOString().split('T')[0]
    if (status === '実施中') update.実施開始日 = today
    if (status === '完了')   update.実施完了日 = today

    await fetch('/api/kirishima/pdca-tracking', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'update', pageId, update }),
    })
    await loadPolicies()
  }

  // ─── AI 効果測定 ─────────────────────────────────────────
  const handleEvaluate = async () => {
    setEvaluating(true)
    try {
      const res = await fetch('/api/kirishima/pdca-tracking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'evaluate' }),
      })
      const data = await res.json() as EvaluationResult
      setEvaluation(data)
      setActiveTab('evaluation')
    } finally {
      setEvaluating(false)
    }
  }

  // ─── 集計 ───────────────────────────────────────────────
  const total     = kanban ? Object.values(kanban).flat().length : 0
  const completed = kanban?.['完了']?.length  ?? 0
  const running   = kanban?.['実施中']?.length ?? 0
  const pending   = kanban?.['検討中']?.length ?? 0

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📈 施策PDCA追跡</h1>
          <p className="text-sm text-gray-500 mt-1">
            提案された施策の実行状況を追跡し、データで効果を測定します（霧島市）
          </p>
        </div>
        <div className="flex gap-2">
          <RegisterForm onRegister={loadPolicies} />
          <button
            onClick={handleEvaluate}
            disabled={evaluating}
            className={`flex items-center gap-2 px-5 py-2 rounded-lg font-medium text-sm transition
              ${evaluating
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-teal-600 hover:bg-teal-700 text-white shadow-sm'
              }`}
          >
            {evaluating ? <><span className="animate-spin">⏳</span>AI 評価中…</> : '🤖 AI 効果測定を実行'}
          </button>
        </div>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard icon="📋" label="登録施策数" value={`${total}件`} colorClass="text-gray-600" />
        <SummaryCard icon="⚡" label="実施中" value={`${running}件`} colorClass="text-blue-600" />
        <SummaryCard icon="✅" label="完了" value={`${completed}件`} colorClass="text-green-600" />
        <SummaryCard icon="🔍" label="検討中" value={`${pending}件`} colorClass="text-gray-500" />
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        {([
          { key: 'kanban',     label: '📋 施策カンバン' },
          { key: 'evaluation', label: '📊 AI効果測定' },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition
              ${activeTab === tab.key ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── カンバンビュー ──────────────────────────────── */}
      {activeTab === 'kanban' && (
        loading ? (
          <div className="text-center py-16 text-gray-400">
            <span className="animate-spin text-3xl block mb-3">⏳</span>
            施策データを読み込み中…
          </div>
        ) : kanban ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {(['検討中', '実施中', '完了'] as const).map(status => {
              const cfg      = STATUS_CONFIG[status]
              const policies = kanban[status] ?? []
              return (
                <div key={status} className="space-y-3">
                  {/* カラムヘッダー */}
                  <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${cfg.bg} border ${cfg.border}`}>
                    <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                    <span className="text-sm font-semibold text-gray-700">{cfg.label}</span>
                    <span className="ml-auto text-xs text-gray-500 bg-white rounded-full px-2 py-0.5 border border-gray-200">
                      {policies.length}件
                    </span>
                  </div>

                  {/* カード一覧 */}
                  {policies.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">施策なし</p>
                  ) : (
                    policies.map(p => (
                      <PolicyCard key={p.id} policy={p} onStatusChange={handleStatusChange} />
                    ))
                  )}
                </div>
              )
            })}
          </div>
        ) : null
      )}

      {/* ─── AI 効果測定ビュー ───────────────────────────── */}
      {activeTab === 'evaluation' && (
        <div className="space-y-5">
          {!evaluation ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-4">📊</div>
              <p className="text-sm">「AI 効果測定を実行」ボタンで PDCA サイクルの評価を生成します</p>
            </div>
          ) : (
            <>
              {/* AI 総括 */}
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-5">
                <p className="text-xs font-semibold text-teal-600 mb-2">🤖 AI による PDCA 総括</p>
                <p className="text-sm text-gray-800 leading-relaxed">{evaluation.summary}</p>
              </div>

              {/* 効果スコア */}
              {evaluation.avgEffectScore !== undefined && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-4">
                  <div>
                    <p className="text-xs text-gray-500">完了施策の平均効果スコア</p>
                    <div className="flex items-center gap-1 mt-1">
                      {[1,2,3,4,5].map(s => (
                        <span key={s} className={`text-xl ${s <= (evaluation.avgEffectScore ?? 0) ? 'text-yellow-500' : 'text-gray-200'}`}>★</span>
                      ))}
                      <span className="text-sm text-gray-600 ml-2">
                        {evaluation.avgEffectScore}/5（{evaluation.completedPolicies}件）
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 次のアクション */}
              {evaluation.recommendations && evaluation.recommendations.length > 0 && (
                <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-2">
                  <p className="text-xs font-semibold text-gray-500 mb-3">💡 次のアクション（AI 提言）</p>
                  {evaluation.recommendations.map((rec, i) => (
                    <div key={i} className="flex items-start gap-3 bg-blue-50 rounded-lg p-3">
                      <span className="text-blue-400 font-bold shrink-0">{i + 1}</span>
                      <p className="text-sm text-gray-700">{rec}</p>
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
