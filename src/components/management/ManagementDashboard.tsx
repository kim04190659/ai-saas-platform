'use client'
// =====================================================
//  src/components/management/ManagementDashboard.tsx
//  経営ダッシュボード — Sprint #53
//
//  ■ 対象読者
//    市長・副市長・議会・部長級幹部
//
//  ■ 表示内容（4領域）
//    財政健全化 / インフラ老朽化 / PDCA進捗 / 住民WBスコア
//
//  ■ データソース
//    GET /api/kirishima/management-summary
//    （4つのエンジンを並列取得してまとめて返す集約API）
// =====================================================

import { useState, useEffect } from 'react'

// ─── APIレスポンス型 ──────────────────────────────────

interface AssessmentCount {
  danger: number; caution: number; watch: number
  good: number;   excellent: number
}

interface FiscalSummary {
  total: number
  assessmentCount: AssessmentCount
  criticalCount: number
  keyMetrics: {
    keijo:    { value: number; assessment: string } | null
    kosaishi: { value: number; assessment: string } | null
    shorai:   { value: number; assessment: string } | null
    kichiku:  { value: number; assessment: string } | null
  }
}

interface InfraSummary {
  total: number
  urgentCount: number
  plannedCount: number
  totalRepairCost: number
  avgScore: number
  criticalFacilities: Array<{ name: string; type: string; score: number; urgency: string }>
}

interface PdcaSummary {
  total: number
  statusCount: { 検討中: number; 実施中: number; 完了: number; 却下: number }
  doneRate: number
  highPriorityActive: string[]
}

interface WbSummary {
  total: number
  avgScore: number
  lowScoreCount: number
  recentAlerts: Array<{ name: string; score: number }>
}

// 屋久島固有KPI（Sprint #59）
interface TourismKpi {
  totalVisitors:  number
  highCongestion: number
  envWarning:     number
  guideShortage:  number
}

interface MigrationKpi {
  total:          number
  settled:        number
  inProgress:     number
  dropped:        number
  subsidyGranted: number
}

interface ManagementSummaryResponse {
  status: string
  municipal: string
  updatedAt: string
  fiscal:    FiscalSummary | null
  infra:     InfraSummary | null
  pdca:      PdcaSummary | null
  wb:        WbSummary | null
  // 屋久島固有（他自治体では null）
  tourism:   TourismKpi | null
  migration: MigrationKpi | null
}

// ─── ユーティリティ ───────────────────────────────────

// 評価 → 色クラス変換
function assessmentColor(a: string): string {
  return (
    a === '危険' ? 'text-red-700 bg-red-100'     :
    a === '警戒' ? 'text-orange-700 bg-orange-100' :
    a === '注意' ? 'text-yellow-700 bg-yellow-100' :
    a === '良好' ? 'text-blue-700 bg-blue-100'   :
    a === '優良' ? 'text-green-700 bg-green-100'  :
    'text-gray-700 bg-gray-100'
  )
}

// 健全度スコア → 色
function scoreColor(score: number): string {
  return score < 35 ? 'text-red-600' : score < 55 ? 'text-orange-500' : score < 70 ? 'text-yellow-600' : 'text-green-600'
}

// ステータスバッジ
function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  )
}

// ─── KPIカードの枠組み ────────────────────────────────

function KpiCard({
  title, icon, alert, children, href,
}: {
  title: string; icon: string; alert?: number
  children: React.ReactNode; href: string
}) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow">
      {/* カードヘッダー */}
      <div className="flex items-center justify-between px-5 pt-4 pb-2 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <span className="text-xl">{icon}</span>
          <span className="font-semibold text-gray-700 text-sm">{title}</span>
        </div>
        {alert != null && alert > 0 && (
          <span className="text-xs font-bold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
            ⚠️ 要対応 {alert}件
          </span>
        )}
      </div>
      {/* カードボディ */}
      <div className="px-5 py-4">{children}</div>
      {/* 詳細リンク */}
      <div className="px-5 pb-4">
        <a
          href={href}
          className="text-xs text-teal-600 hover:text-teal-800 hover:underline font-medium"
        >
          詳細を見る →
        </a>
      </div>
    </div>
  )
}

// ─── 財政健全化カード ─────────────────────────────────

function FiscalCard({ data }: { data: FiscalSummary }) {
  const { assessmentCount: ac, criticalCount, keyMetrics: km } = data
  return (
    <KpiCard title="財政健全化" icon="💴" alert={criticalCount} href="/kirishima/fiscal-health">
      {/* 評価分布バー */}
      <div className="flex gap-1 mb-3 h-2 rounded-full overflow-hidden">
        {ac.danger    > 0 && <div className="bg-red-500"    style={{ flex: ac.danger }}    />}
        {ac.caution   > 0 && <div className="bg-orange-400" style={{ flex: ac.caution }}   />}
        {ac.watch     > 0 && <div className="bg-yellow-400" style={{ flex: ac.watch }}     />}
        {ac.good      > 0 && <div className="bg-blue-400"   style={{ flex: ac.good }}      />}
        {ac.excellent > 0 && <div className="bg-green-500"  style={{ flex: ac.excellent }} />}
      </div>
      <div className="flex gap-2 text-xs mb-4 flex-wrap">
        {ac.danger    > 0 && <span className="text-red-600">●危険 {ac.danger}</span>}
        {ac.caution   > 0 && <span className="text-orange-500">●警戒 {ac.caution}</span>}
        {ac.watch     > 0 && <span className="text-yellow-600">●注意 {ac.watch}</span>}
        {ac.good      > 0 && <span className="text-blue-500">●良好 {ac.good}</span>}
        {ac.excellent > 0 && <span className="text-green-600">●優良 {ac.excellent}</span>}
      </div>
      {/* 代表指標 */}
      <div className="space-y-2">
        {km.keijo && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">経常収支比率</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-sm">{km.keijo.value}%</span>
              <Badge label={km.keijo.assessment} color={assessmentColor(km.keijo.assessment)} />
            </span>
          </div>
        )}
        {km.kosaishi && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">実質公債費比率</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-sm">{km.kosaishi.value}%</span>
              <Badge label={km.kosaishi.assessment} color={assessmentColor(km.kosaishi.assessment)} />
            </span>
          </div>
        )}
        {km.kichiku && (
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-500">財政調整基金</span>
            <span className="flex items-center gap-1">
              <span className="font-bold text-sm">{km.kichiku.value.toLocaleString()}百万円</span>
              <Badge label={km.kichiku.assessment} color={assessmentColor(km.kichiku.assessment)} />
            </span>
          </div>
        )}
      </div>
    </KpiCard>
  )
}

// ─── インフラ老朽化カード ─────────────────────────────

function InfraCard({ data }: { data: InfraSummary }) {
  const repairBillion = (data.totalRepairCost / 10000).toFixed(1) // 万円 → 億円
  return (
    <KpiCard title="インフラ老朽化" icon="🛣️" alert={data.urgentCount} href="/kirishima/infra-aging">
      {/* 主要指標 */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-red-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-red-600">{data.urgentCount}</div>
          <div className="text-xs text-gray-500">緊急修繕</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-3 text-center">
          <div className="text-2xl font-bold text-yellow-600">{data.plannedCount}</div>
          <div className="text-xs text-gray-500">計画修繕</div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-500">修繕費合計（見積）</span>
        <span className="font-bold text-sm text-gray-800">{repairBillion}億円</span>
      </div>
      <div className="flex justify-between items-center mb-3">
        <span className="text-xs text-gray-500">健全度スコア平均</span>
        <span className={`font-bold text-sm ${scoreColor(data.avgScore)}`}>{data.avgScore} / 100</span>
      </div>
      {/* 要注意施設 */}
      {data.criticalFacilities.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">要注意施設（上位）</div>
          <div className="space-y-1">
            {data.criticalFacilities.map((f, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-700 truncate max-w-[120px]">{f.name}</span>
                <span className={`font-medium ${scoreColor(f.score)}`}>スコア {f.score}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </KpiCard>
  )
}

// ─── PDCA進捗カード ───────────────────────────────────

function PdcaCard({ data }: { data: PdcaSummary }) {
  const { statusCount: sc } = data
  return (
    <KpiCard title="PDCA進捗" icon="📋" href="/kirishima/pdca-tracking">
      {/* 完了率リング風 */}
      <div className="flex items-center gap-4 mb-4">
        <div className="relative w-16 h-16 flex-shrink-0">
          <svg viewBox="0 0 36 36" className="w-16 h-16 -rotate-90">
            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#e5e7eb" strokeWidth="3" />
            <circle
              cx="18" cy="18" r="15.9" fill="none"
              stroke="#10b981" strokeWidth="3"
              strokeDasharray={`${data.doneRate} ${100 - data.doneRate}`}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-green-700">{data.doneRate}%</span>
          </div>
        </div>
        <div className="space-y-1 text-xs">
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">✅ 完了</span>
            <span className="font-bold text-green-700">{sc.完了}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">🔄 実施中</span>
            <span className="font-bold text-blue-600">{sc.実施中}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">💬 検討中</span>
            <span className="font-bold text-yellow-600">{sc.検討中}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span className="text-gray-500">総施策数</span>
            <span className="font-bold">{data.total}</span>
          </div>
        </div>
      </div>
      {/* 緊急実施中施策 */}
      {data.highPriorityActive.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">緊急対応中の施策</div>
          <div className="space-y-1">
            {data.highPriorityActive.map((name, i) => (
              <div key={i} className="text-xs text-gray-700 flex items-start gap-1">
                <span className="text-orange-500 mt-0.5">▶</span>
                <span className="line-clamp-1">{name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </KpiCard>
  )
}

// ─── 住民WBカード ─────────────────────────────────────

function WbCard({ data }: { data: WbSummary }) {
  const scoreColorClass =
    data.avgScore <= 4 ? 'text-red-600' :
    data.avgScore <= 6 ? 'text-yellow-600' :
    'text-green-600'
  return (
    <KpiCard title="住民Well-Being" icon="🌱" alert={data.lowScoreCount} href="/kirishima/resident-coach">
      {/* 平均WBスコア */}
      <div className="text-center mb-4">
        <div className={`text-4xl font-bold ${scoreColorClass}`}>{data.avgScore}</div>
        <div className="text-xs text-gray-400 mt-1">平均WBスコア（10点満点）</div>
        <div className="text-xs text-gray-500 mt-1">{data.total}名が対象</div>
      </div>
      <div className="bg-red-50 rounded-lg px-3 py-2 mb-3 flex justify-between items-center">
        <span className="text-xs text-red-700">要支援（スコア3以下）</span>
        <span className="text-lg font-bold text-red-700">{data.lowScoreCount}名</span>
      </div>
      {/* 要支援住民 */}
      {data.recentAlerts.length > 0 && (
        <div>
          <div className="text-xs text-gray-400 mb-1">優先支援対象（スコア低順）</div>
          <div className="space-y-1">
            {data.recentAlerts.map((r, i) => (
              <div key={i} className="flex justify-between text-xs">
                <span className="text-gray-700">{r.name}</span>
                <span className={`font-bold ${r.score <= 3 ? 'text-red-600' : 'text-yellow-600'}`}>
                  WB {r.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </KpiCard>
  )
}

// ─── 観光KPIカード（屋久島専用）─────────────────────────

function TourismCard({ data }: { data: TourismKpi }) {
  const alertCount = data.highCongestion + data.envWarning + data.guideShortage
  return (
    <KpiCard title="観光・エコツーリズム" icon="🌿" alert={alertCount > 0 ? alertCount : undefined} href="/yakushima/tourism">
      <div className="text-center mb-4">
        <div className="text-3xl font-bold text-green-700">{data.totalVisitors.toLocaleString()}</div>
        <div className="text-xs text-gray-400 mt-1">今月 総入込数（人）</div>
      </div>
      <div className="grid grid-cols-3 gap-2">
        <div className={`rounded-lg p-2 text-center ${data.highCongestion > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
          <div className={`text-lg font-bold ${data.highCongestion > 0 ? 'text-red-600' : 'text-gray-400'}`}>
            {data.highCongestion}
          </div>
          <div className="text-xs text-gray-500">高混雑</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${data.envWarning > 0 ? 'bg-orange-50' : 'bg-gray-50'}`}>
          <div className={`text-lg font-bold ${data.envWarning > 0 ? 'text-orange-600' : 'text-gray-400'}`}>
            {data.envWarning}
          </div>
          <div className="text-xs text-gray-500">環境警告</div>
        </div>
        <div className={`rounded-lg p-2 text-center ${data.guideShortage > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
          <div className={`text-lg font-bold ${data.guideShortage > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
            {data.guideShortage}
          </div>
          <div className="text-xs text-gray-500">ガイド不足</div>
        </div>
      </div>
    </KpiCard>
  )
}

// ─── 移住KPIカード（屋久島専用）─────────────────────────

function MigrationCard({ data }: { data: MigrationKpi }) {
  const settleRate = data.total > 0 ? Math.round((data.settled / data.total) * 100) : 0
  return (
    <KpiCard title="移住・定住支援" icon="🏡" href="/yakushima/migration">
      <div className="flex items-center gap-4 mb-4">
        <div className="text-center">
          <div className="text-3xl font-bold text-emerald-700">{settleRate}%</div>
          <div className="text-xs text-gray-400">定住達成率</div>
        </div>
        <div className="flex-1 space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-gray-500">✅ 定住達成</span>
            <span className="font-bold text-emerald-700">{data.settled}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">🔄 進行中</span>
            <span className="font-bold text-blue-600">{data.inProgress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">❌ 断念</span>
            <span className={`font-bold ${data.dropped > 0 ? 'text-red-600' : 'text-gray-400'}`}>{data.dropped}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-500">💴 補助金決定</span>
            <span className="font-bold text-green-700">{data.subsidyGranted}</span>
          </div>
        </div>
      </div>
      {data.dropped > 0 && (
        <div className="bg-orange-50 rounded-lg px-3 py-2 text-xs text-orange-700">
          ⚠ 断念{data.dropped}件 — 就職・コワーキング環境の整備が課題
        </div>
      )}
    </KpiCard>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export function ManagementDashboard({
  municipalityName,
  apiBase = '/api/kirishima/management-summary',  // デフォルトは霧島市API（後方互換）
}: {
  municipalityName: string
  apiBase?: string
}) {
  const [data, setData]       = useState<ManagementSummaryResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState<string | null>(null)

  useEffect(() => {
    // apiBase（自治体切り替え）が変わるたびに再取得する
    setLoading(true)
    setError(null)
    setData(null)
    fetch(apiBase)
      .then(r => r.json())
      .then((json: ManagementSummaryResponse) => {
        if (json.status !== 'success') throw new Error('データ取得に失敗しました')
        setData(json)
      })
      .catch(e => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false))
  }, [apiBase])  // ← apiBase を依存配列に追加（自治体切り替え時に再フェッチ）

  const updatedAt = data?.updatedAt
    ? new Date(data.updatedAt).toLocaleString('ja-JP', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* ヘッダー */}
      <div className="mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">
              🏛️ 経営ダッシュボード
              <span className="text-sm font-normal text-gray-500 ml-2">{municipalityName}</span>
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              財政・インフラ・施策・住民Well-Beingの4領域を一画面で把握。市長・幹部向け総合KPIビュー。
            </p>
          </div>
          {updatedAt && (
            <span className="text-xs text-gray-400 mt-1 flex-shrink-0">
              🔄 {updatedAt} 更新
            </span>
          )}
        </div>
      </div>

      {/* ローディング */}
      {loading && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-4xl mb-3 animate-pulse">⏳</div>
          <div>各部門のデータを読み込んでいます...</div>
        </div>
      )}

      {/* エラー */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          ⚠️ データ取得エラー: {error}
        </div>
      )}

      {/* ダッシュボード本体 */}
      {!loading && !error && data && (
        <>
          {/* 全体アラート帯 */}
          {((data.fiscal?.criticalCount ?? 0) > 0 || (data.infra?.urgentCount ?? 0) > 0 || (data.wb?.lowScoreCount ?? 0) > 0) && (
            <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg flex flex-wrap gap-3 text-sm">
              <span className="font-semibold text-red-700">🔴 要対応事項：</span>
              {(data.fiscal?.criticalCount ?? 0) > 0 && (
                <span className="text-red-700">
                  財政警戒・危険指標 {data.fiscal!.criticalCount}件
                </span>
              )}
              {(data.infra?.urgentCount ?? 0) > 0 && (
                <span className="text-red-700">
                  緊急修繕施設 {data.infra!.urgentCount}件
                </span>
              )}
              {(data.wb?.lowScoreCount ?? 0) > 0 && (
                <span className="text-red-700">
                  要支援住民 {data.wb!.lowScoreCount}名
                </span>
              )}
            </div>
          )}

          {/* 4領域KPIカード（+ 屋久島固有2領域） */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {data.fiscal    && <FiscalCard    data={data.fiscal}    />}
            {data.infra     && <InfraCard     data={data.infra}     />}
            {data.pdca      && <PdcaCard      data={data.pdca}      />}
            {data.wb        && <WbCard        data={data.wb}        />}
            {/* 屋久島専用KPI（tourism/migration が null でない場合のみ表示） */}
            {data.tourism   && <TourismCard   data={data.tourism}   />}
            {data.migration && <MigrationCard data={data.migration} />}
          </div>

          {/* フッター注記 */}
          <div className="mt-6 text-xs text-gray-400 text-right">
            ※ データはNotionから取得。各カードの「詳細を見る」から詳細画面・AI提言へアクセスできます。
          </div>
        </>
      )}
    </div>
  )
}
