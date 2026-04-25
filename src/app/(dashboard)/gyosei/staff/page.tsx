'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/staff/page.tsx
//  職員コンディション入力ページ — Sprint #14
//
//  ■ このページの役割
//    「SDL学習スコアの低い職員はコンディションが低い傾向があるか」という
//    推論を可能にするために、職員の体調・業務負荷・チームWell-Beingを
//    日次で記録し、Notionに蓄積するページ。
//
//  ■ Phase 3 の起点
//    ここで蓄積したデータをSprint #15（四半期AIセマンティック分析）で
//    学習ログ・人口データ・サービスKPIと横断分析する。
//
//  ■ 技術ポイント
//    - 'use client' で React Hooks を使用
//    - /api/staff-condition に GET/POST してNotionと連携
//    - スコアボタン（1〜5）で直感的に入力できるUI
// =====================================================

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useMunicipality } from '@/contexts/MunicipalityContext'

// ─── 型定義 ──────────────────────────────────────────

/** 職員コンディション1件の型（APIレスポンス） */
interface StaffRecord {
  id:                 string
  staffName:          string
  municipalityName:   string
  department:         string
  healthScore:        number
  workloadScore:      number
  teamWellBeingScore: number
  wellbeingScore:     number
  comment:            string
  recordDate:         string
}

/** サマリー統計の型 */
interface Summary {
  totalCount:          number
  avgWellbeingScore:   number
  highWorkloadCount:   number
  departmentCount:     number
}

/** フォームの入力状態の型 */
interface FormState {
  staffName:           string
  municipalityName:    string
  department:          string
  healthScore:         number
  workloadScore:       number
  teamWellBeingScore:  number
  comment:             string
  recordDate:          string
}

// ─── 定数・設定 ──────────────────────────────────────

/** 体調スコアのラベル（1〜5） */
const HEALTH_LABELS = ['', '不調', '疲れ気味', '普通', '良好', '絶好調']

/** 業務負荷スコアのラベル（1〜5） */
const WORKLOAD_LABELS = ['', '余裕', 'やや余裕', '標準', 'やや多い', '限界']

/** チームWell-BeingスコアのラベルI（1〜5） */
const TEAM_LABELS = ['', '低い', 'やや低い', '普通', '良い', '非常に良い']

/** 部署のサンプル（クイック入力用） */
const SAMPLE_DEPARTMENTS = ['住民課', '総務課', '福祉課', '財政課', '情報政策課', '教育委員会']

/** フォームの初期値 */
const INITIAL_FORM: FormState = {
  staffName:          '',
  municipalityName:   '',
  department:         '',
  healthScore:        3,  // デフォルト: 普通
  workloadScore:      3,  // デフォルト: 標準
  teamWellBeingScore: 3,  // デフォルト: 普通
  comment:            '',
  recordDate:         new Date().toISOString().split('T')[0],
}

// ─── 子コンポーネント ─────────────────────────────────

/** サマリーカード（上部の4枚） */
function SummaryCard({
  icon, label, value, sub, color
}: {
  icon: string
  label: string
  value: string | number
  sub?: string
  color: string
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}

/**
 * スコア入力ボタン（1〜5）
 * 直感的にスコアを選択できるボタン群。
 * 選択中のボタンは色が濃くなる。
 */
function ScoreButtons({
  value,
  labels,
  onChange,
  colorClass,
}: {
  value: number
  labels: string[]
  onChange: (v: number) => void
  colorClass: string
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 min-w-[3rem] py-2 rounded-lg text-sm font-medium transition-all border ${
            value === n
              ? `${colorClass} text-white border-transparent shadow-md`
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <span className="block text-base font-bold">{n}</span>
          <span className="block text-xs opacity-80">{labels[n]}</span>
        </button>
      ))}
    </div>
  )
}

/**
 * Well-Being スコアバッジ
 * スコアに応じて色分けして表示する。
 */
function WBScoreBadge({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
              : score >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200'
              :               'bg-red-100 text-red-700 border-red-200'
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${color}`}>
      WB {score}
    </span>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function StaffConditionPage() {
  // Sprint #34: 選択中の自治体を Context から取得
  const { municipalityId, municipality } = useMunicipality()

  // ── State ──
  const [records,  setRecords]  = useState<StaffRecord[]>([])
  const [summary,  setSummary]  = useState<Summary | null>(null)
  // フォームの初期値に選択中の自治体名をセット
  const [form,     setForm]     = useState<FormState>({
    ...INITIAL_FORM,
    municipalityName: municipality.shortName,
  })
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null)

  // ── データ取得（municipalityId を渡してフィルタリング）──
  const fetchData = useCallback(async () => {
    setFetching(true)
    try {
      // Sprint #34: municipalityId をクエリパラメータで渡す
      const res  = await fetch(`/api/staff-condition?municipalityId=${municipalityId}`)
      const data = await res.json()
      if (!data.error) {
        setRecords(data.records ?? [])
        setSummary(data.summary ?? null)
      }
    } catch {
      // 取得失敗時はサイレントに処理
    } finally {
      setFetching(false)
    }
  }, [municipalityId])

  // 自治体が切り替わったらデータを再取得し、フォームの自治体名も更新
  useEffect(() => {
    fetchData()
    setForm(prev => ({ ...prev, municipalityName: municipality.shortName }))
  }, [municipalityId, municipality.shortName, fetchData])

  // ── フォーム送信 ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.staffName.trim()) {
      setMessage({ text: '職員名を入力してください', ok: false })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      // Sprint #34: municipalityId をボディに追加して自治体を特定させる
      const res  = await fetch('/api/staff-condition', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, municipalityId }),
      })
      const data = await res.json()

      if (data.error) {
        setMessage({ text: data.error, ok: false })
      } else {
        // 成功: フォームリセット・データ再取得
        setMessage({ text: data.message, ok: true })
        // リセット時も選択中の自治体名を維持する
        setForm({ ...INITIAL_FORM, municipalityName: municipality.shortName, recordDate: new Date().toISOString().split('T')[0] })
        await fetchData()
      }
    } catch {
      setMessage({ text: 'ネットワークエラーが発生しました', ok: false })
    } finally {
      setLoading(false)
    }
  }

  // ── フォームのフィールドを更新するヘルパー ──
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  // ── 業務負荷スコアの色（高いほど赤） ──
  const workloadColor = (score: number) =>
    score >= 4 ? 'bg-red-500'
    : score >= 3 ? 'bg-amber-500'
    : 'bg-emerald-500'

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            👥 職員コンディション入力
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            体調・業務負荷・チームWell-Beingを日次記録して、SDL学習スコアとの相関を分析します
          </p>
          {/* Phase 3 バッジ */}
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-violet-50 text-violet-700 border border-violet-200">
              🔬 Phase 3 — セマンティック推論 起点
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              📊 Notion StaffCondition DB に蓄積
            </span>
          </div>
        </div>

        {/* ── サマリーカード（4枚） ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon="👥"
            label="総記録件数"
            value={fetching ? '…' : summary?.totalCount ?? 0}
            sub="件"
            color="bg-white border-slate-200 text-slate-700"
          />
          <SummaryCard
            icon="💚"
            label="平均WBスコア"
            value={fetching ? '…' : summary?.avgWellbeingScore ?? 0}
            sub="/ 100pt"
            color="bg-emerald-50 border-emerald-200 text-emerald-700"
          />
          <SummaryCard
            icon="⚠️"
            label="高負荷職員"
            value={fetching ? '…' : summary?.highWorkloadCount ?? 0}
            sub="業務負荷4以上"
            color="bg-amber-50 border-amber-200 text-amber-700"
          />
          <SummaryCard
            icon="🏢"
            label="記録部署数"
            value={fetching ? '…' : summary?.departmentCount ?? 0}
            sub="部署"
            color="bg-blue-50 border-blue-200 text-blue-700"
          />
        </div>

        {/* ── 入力フォーム ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            📝 コンディション記録
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 行1: 職員名 / 自治体名 / 部署 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 職員名 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  職員名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.staffName}
                  onChange={e => setField('staffName', e.target.value)}
                  placeholder="例: 田中 太郎"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* 自治体名 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  自治体名
                </label>
                <input
                  type="text"
                  value={form.municipalityName}
                  onChange={e => setField('municipalityName', e.target.value)}
                  placeholder="例: 屋久島町"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* 部署（クイック選択付き） */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  部署名
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={e => setField('department', e.target.value)}
                  placeholder="例: 住民課"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 mb-1"
                />
                {/* 部署クイック選択ボタン */}
                <div className="flex flex-wrap gap-1">
                  {SAMPLE_DEPARTMENTS.map(dept => (
                    <button
                      key={dept}
                      type="button"
                      onClick={() => setField('department', dept)}
                      className="px-2 py-0.5 rounded-md text-xs border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      {dept}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 体調スコア */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                体調スコア
                <span className="ml-2 text-slate-400 font-normal">（40ptまで）</span>
              </label>
              <ScoreButtons
                value={form.healthScore}
                labels={HEALTH_LABELS}
                onChange={v => setField('healthScore', v)}
                colorClass="bg-emerald-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                1（不調）〜 5（絶好調）
              </p>
            </div>

            {/* 業務負荷スコア */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                業務負荷スコア
                <span className="ml-2 text-slate-400 font-normal">（低いほど高得点、40ptまで）</span>
              </label>
              <ScoreButtons
                value={form.workloadScore}
                labels={WORKLOAD_LABELS}
                onChange={v => setField('workloadScore', v)}
                colorClass="bg-amber-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                1（余裕）〜 5（限界）。業務負荷が少ないほどWell-Beingが上がります。
              </p>
            </div>

            {/* チームWell-Being */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                チームWell-Beingスコア
                <span className="ml-2 text-slate-400 font-normal">（20ptまで）</span>
              </label>
              <ScoreButtons
                value={form.teamWellBeingScore}
                labels={TEAM_LABELS}
                onChange={v => setField('teamWellBeingScore', v)}
                colorClass="bg-blue-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                1（低い）〜 5（非常に良い）。チームの雰囲気・連携・安心感を評価します。
              </p>
            </div>

            {/* 行2: コメント / 記録日 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  コメント（任意）
                </label>
                <textarea
                  value={form.comment}
                  onChange={e => setField('comment', e.target.value)}
                  placeholder="気になること、申し送り事項など…"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  記録日
                </label>
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={e => setField('recordDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
                {/* 予測スコアを即時表示 */}
                <div className="mt-2 p-2 rounded-lg bg-emerald-50 border border-emerald-200 text-center">
                  <p className="text-xs text-emerald-600 font-medium">予測 Well-Beingスコア</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {
                      // クライアント側でプレビュー計算
                      Math.min(100, Math.max(0,
                        (form.healthScore - 1) * 10 +
                        (5 - form.workloadScore) * 10 +
                        (form.teamWellBeingScore - 1) * 5
                      ))
                    }
                    <span className="text-xs font-normal"> / 100pt</span>
                  </p>
                </div>
              </div>
            </div>

            {/* メッセージ表示エリア */}
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                message.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-emerald-600 text-white font-medium text-sm hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
            >
              {loading ? '記録中…' : '💾 Notionに記録する'}
            </button>
          </form>
        </div>

        {/* ── 記録一覧テーブル ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            📋 コンディション記録一覧
          </h2>

          {fetching ? (
            <p className="text-sm text-slate-400 text-center py-8">読み込み中…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              まだ記録がありません。上のフォームから入力してください。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">職員名</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">部署</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">体調</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">業務負荷</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">チームWB</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">WBスコア</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">記録日</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-700">{r.staffName}</div>
                        {r.municipalityName && (
                          <div className="text-xs text-slate-400">{r.municipalityName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {r.department || '—'}
                      </td>
                      {/* 体調: 色付き数字 */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${
                          r.healthScore >= 4 ? 'bg-emerald-500' :
                          r.healthScore >= 3 ? 'bg-amber-400' : 'bg-red-400'
                        }`}>
                          {r.healthScore}
                        </span>
                      </td>
                      {/* 業務負荷: 高いほど赤 */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${workloadColor(r.workloadScore)}`}>
                          {r.workloadScore}
                        </span>
                      </td>
                      {/* チームWB */}
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${
                          r.teamWellBeingScore >= 4 ? 'bg-blue-500' :
                          r.teamWellBeingScore >= 3 ? 'bg-blue-300' : 'bg-slate-400'
                        }`}>
                          {r.teamWellBeingScore}
                        </span>
                      </td>
                      {/* WBスコアバッジ */}
                      <td className="py-2.5 px-3 text-center">
                        <WBScoreBadge score={r.wellbeingScore} />
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">
                        {r.recordDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Phase 3 ガイド ── */}
        <div className="bg-violet-50 rounded-2xl border border-violet-200 p-4">
          <p className="text-xs font-semibold text-violet-600 mb-2">
            🔬 Phase 3 — このデータが使われる場面
          </p>
          <p className="text-sm text-violet-700 leading-relaxed">
            ここで蓄積した職員コンディションデータは、
            <strong>Sprint #15（四半期AIセマンティック分析）</strong>で
            SDL学習スコア・人口データ・住民サービスKPIと横断分析されます。
            「学習スコアが低い部署は業務負荷が高い傾向がある」など、
            データに基づいた組織改善の洞察が自動生成されます。
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href="/ai-advisor"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors border border-violet-200"
            >
              🤖 AI Well-Being顧問で分析する
            </Link>
            <Link
              href="/gyosei/services"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors border border-emerald-200"
            >
              🏘️ 住民サービス状況も見る
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
