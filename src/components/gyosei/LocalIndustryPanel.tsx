'use client';

// =====================================================
//  src/components/gyosei/LocalIndustryPanel.tsx
//  地場産業6次産業化支援AI パネル — Sprint #70
//
//  ■ 表示内容
//    - KPIカード4枚（産業総数・高リスク件数・5年以内消滅リスク・合計年商）
//    - リスクフィルター（ALL / HIGH / MEDIUM / LOW）
//    - 産業種別サマリーバー
//    - 産業一覧（モバイル: カード / デスクトップ: テーブル）
//    - AI支援施策提言（赤グラデーション）
//
//  ■ 対応自治体
//    気仙沼市（デフォルト）+ municipalityId 対応で全自治体展開可能
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useMunicipality } from '@/contexts/MunicipalityContext';
import type {
  LocalIndustryResponse,
  LocalIndustryRecord,
  IndustryTypeSummary,
  AiRecommendation,
} from '@/app/api/gyosei/local-industry/route';

// ─── リスクカラー設定 ─────────────────────────────────────
const RISK_CONFIG = {
  HIGH:   { label: '高リスク',  bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    dot: 'bg-red-500'    },
  MEDIUM: { label: '中リスク',  bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300',  dot: 'bg-amber-500'  },
  LOW:    { label: '低リスク',  bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  dot: 'bg-green-500'  },
} as const;

// ─── 後継者有無カラー設定 ────────────────────────────────
const SUCCESSOR_CONFIG: Record<string, string> = {
  'あり':     'bg-green-100 text-green-700',
  'なし':     'bg-red-100 text-red-700',
  '一部あり': 'bg-amber-100 text-amber-700',
  '不明':     'bg-gray-100 text-gray-600',
};

// ─── 6次産業化カラー設定 ─────────────────────────────────
const SIXTH_CONFIG: Record<string, string> = {
  '実施済み': 'bg-green-100 text-green-700',
  '試行中':   'bg-blue-100 text-blue-700',
  '検討中':   'bg-amber-100 text-amber-700',
  '未着手':   'bg-gray-100 text-gray-500',
};

// ─── 産業種絵文字 ────────────────────────────────────────
const INDUSTRY_TYPE_EMOJI: Record<string, string> = {
  '水産業':        '🐟',
  '農業':          '🌾',
  '林業':          '🌲',
  '製造業':        '🏭',
  '観光':          '🗺️',
  '食品加工':      '🍱',
  '工芸・伝統産業': '🎨',
};

// ─── KPIカード ───────────────────────────────────────────
function KpiCard({ label, value, sub, color }: {
  label: string; value: string | number; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <div className="text-xs font-medium text-gray-500 mb-1">{label}</div>
      <div className="text-2xl font-bold text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

// ─── 産業種別サマリーバー ────────────────────────────────
function IndustryTypeRow({ summary }: { summary: IndustryTypeSummary }) {
  const emoji = INDUSTRY_TYPE_EMOJI[summary.industryType] ?? '🏢';
  const highRiskRate = summary.count > 0
    ? Math.round((summary.highRiskCount / summary.count) * 100)
    : 0;

  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-lg w-6 flex-shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700 truncate">{summary.industryType}</span>
          <span className="text-xs text-gray-500 ml-2 flex-shrink-0">
            {summary.count}産業 / 年商{summary.totalRevenue.toLocaleString()}百万円
          </span>
        </div>
        {/* 高リスク率バー */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              highRiskRate >= 70 ? 'bg-red-500' : highRiskRate >= 40 ? 'bg-amber-400' : 'bg-green-400'
            }`}
            style={{ width: `${highRiskRate}%` }}
          />
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          高リスク率 {highRiskRate}% / 平均事業者年齢 {summary.avgOwnerAge}歳
        </div>
      </div>
    </div>
  );
}

// ─── 産業カード（モバイル） ──────────────────────────────
function IndustryCard({ record }: { record: LocalIndustryRecord }) {
  const riskCfg = RISK_CONFIG[record.successorRisk];
  const successorClass = SUCCESSOR_CONFIG[record.successorStatus] ?? 'bg-gray-100 text-gray-600';
  const sixthClass = SIXTH_CONFIG[record.sixthIndustryStatus] ?? 'bg-gray-100 text-gray-500';
  const emoji = INDUSTRY_TYPE_EMOJI[record.industryType] ?? '🏢';

  return (
    <div className={`rounded-xl border-l-4 ${riskCfg.border} bg-white border border-gray-200 p-4 shadow-sm`}>
      {/* ヘッダー行 */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xl">{emoji}</span>
          <div>
            <div className="font-semibold text-gray-800 text-sm">{record.industryName}</div>
            <div className="text-xs text-gray-500">{record.industryType}</div>
          </div>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${riskCfg.bg} ${riskCfg.text}`}>
          {record.successorRisk}
        </span>
      </div>

      {/* バッジ行 */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className={`text-xs px-2 py-0.5 rounded-full ${successorClass}`}>
          後継者: {record.successorStatus}
        </span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${sixthClass}`}>
          6次: {record.sixthIndustryStatus}
        </span>
        {record.subsidyEligible && (
          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">補助金対象</span>
        )}
      </div>

      {/* 数値行 */}
      <div className="grid grid-cols-3 gap-2 text-center mb-2">
        <div>
          <div className="text-sm font-bold text-gray-800">{record.businessCount}</div>
          <div className="text-xs text-gray-400">事業者数</div>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">{record.avgOwnerAge}歳</div>
          <div className="text-xs text-gray-400">平均年齢</div>
        </div>
        <div>
          <div className="text-sm font-bold text-gray-800">{record.annualRevenue.toLocaleString()}</div>
          <div className="text-xs text-gray-400">年商(百万)</div>
        </div>
      </div>

      {/* 課題メモ */}
      {record.issueMemo && (
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2 line-clamp-2">
          {record.issueMemo}
        </div>
      )}
    </div>
  );
}

// ─── 産業行（デスクトップテーブル） ──────────────────────
function IndustryRow({ record }: { record: LocalIndustryRecord }) {
  const riskCfg = RISK_CONFIG[record.successorRisk];
  const successorClass = SUCCESSOR_CONFIG[record.successorStatus] ?? 'bg-gray-100 text-gray-600';
  const sixthClass = SIXTH_CONFIG[record.sixthIndustryStatus] ?? 'bg-gray-100 text-gray-500';
  const emoji = INDUSTRY_TYPE_EMOJI[record.industryType] ?? '🏢';

  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">{emoji}</span>
          <div>
            <div className="font-medium text-gray-800 text-sm">{record.industryName}</div>
            <div className="text-xs text-gray-400">{record.industryType}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-xs font-bold px-2 py-1 rounded-full ${riskCfg.bg} ${riskCfg.text}`}>
          {record.successorRisk}
        </span>
      </td>
      <td className="px-4 py-3 text-sm text-center text-gray-700">{record.businessCount}社</td>
      <td className="px-4 py-3 text-sm text-center text-gray-700">{record.avgOwnerAge}歳</td>
      <td className="px-4 py-3 text-sm text-center text-gray-700">{record.annualRevenue.toLocaleString()}百万</td>
      <td className="px-4 py-3 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${successorClass}`}>
          {record.successorStatus}
        </span>
      </td>
      <td className="px-4 py-3 text-center">
        <span className={`text-xs px-2 py-0.5 rounded-full ${sixthClass}`}>
          {record.sixthIndustryStatus}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">
        {record.issueMemo}
      </td>
    </tr>
  );
}

// ─── AI提言カード ────────────────────────────────────────
function RecommendationCard({ rec, index }: { rec: AiRecommendation; index: number }) {
  const riskCfg = rec.riskLevel === 'HIGH' ? RISK_CONFIG.HIGH : RISK_CONFIG.MEDIUM;
  return (
    <div className="bg-white/60 rounded-xl p-4 border border-red-100">
      <div className="flex items-start gap-3">
        <div className="w-7 h-7 rounded-full bg-red-600 text-white flex items-center justify-center text-sm font-bold flex-shrink-0">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-gray-800 text-sm">{rec.industryName}</span>
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${riskCfg.bg} ${riskCfg.text}`}>
              {rec.riskLevel}
            </span>
          </div>
          <p className="text-sm text-gray-700 leading-relaxed">{rec.policy}</p>
        </div>
      </div>
    </div>
  );
}

// ─── メインパネル ────────────────────────────────────────
export function LocalIndustryPanel() {
  const { municipalityId } = useMunicipality();

  const [data, setData]       = useState<LocalIndustryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gyosei/local-industry?municipalityId=${municipalityId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'データ取得エラー');
      setData(json as LocalIndustryResponse);
    } catch (e) {
      setError(e instanceof Error ? e.message : '不明なエラー');
    } finally {
      setLoading(false);
    }
  }, [municipalityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── エラー表示 ────────────────────────────────────────
  if (!loading && error) {
    // この自治体に地場産業DBが設定されていない場合
    if (error.includes('localIndustryDbId が設定されていません')) {
      return (
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-center">
            <div className="text-3xl mb-3">🏭</div>
            <h3 className="font-bold text-red-800 mb-2">この機能は気仙沼市（地場産業6次産業化）のデモ専用です</h3>
            <p className="text-red-600 text-sm">
              セレクターで「気仙沼市役所」を選択してください。
              他の自治体への展開は地場産業台帳DBの作成後に対応します。
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-red-500 text-xl">⚠️</span>
          <div>
            <div className="font-semibold text-red-700">データ取得エラー</div>
            <div className="text-red-600 text-sm">{error}</div>
          </div>
          <button
            onClick={fetchData}
            className="ml-auto text-sm text-red-700 border border-red-300 px-3 py-1 rounded-lg hover:bg-red-100 transition-colors"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // ── ローディング ─────────────────────────────────────
  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-xl" />
          ))}
        </div>
        <div className="h-48 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!data) return null;

  // ── フィルタリング ───────────────────────────────────
  const filteredRecords: LocalIndustryRecord[] = riskFilter === 'ALL'
    ? data.records
    : data.records.filter((r) => r.successorRisk === riskFilter);

  const filterButtons: Array<{ key: typeof riskFilter; label: string; count: number; style: string; activeStyle: string }> = [
    { key: 'ALL',    label: 'すべて', count: data.totalRecords,   style: 'text-gray-600 border-gray-300',  activeStyle: 'bg-gray-700 text-white border-gray-700' },
    { key: 'HIGH',   label: '高リスク', count: data.highRiskCount,   style: 'text-red-600 border-red-300',     activeStyle: 'bg-red-600 text-white border-red-600'   },
    { key: 'MEDIUM', label: '中リスク', count: data.mediumRiskCount, style: 'text-amber-600 border-amber-300', activeStyle: 'bg-amber-500 text-white border-amber-500' },
    { key: 'LOW',    label: '低リスク', count: data.lowRiskCount,    style: 'text-green-600 border-green-300', activeStyle: 'bg-green-600 text-white border-green-600' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">

      {/* ── ヘッダー ────────────────────────────────── */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-xl font-bold text-gray-800">🏭 地場産業6次産業化支援AI</h2>
          <p className="text-sm text-gray-500 mt-1">
            {data.municipalityName} / {data.fetchedAt ? new Date(data.fetchedAt).toLocaleString('ja-JP') : ''}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="text-sm text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors flex items-center gap-1"
        >
          🔄 更新
        </button>
      </div>

      {/* ── KPIカード ───────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="地場産業総数"
          value={`${data.totalRecords}産業`}
          sub={`合計 ${data.totalRevenue.toLocaleString()} 百万円`}
          color="bg-gray-50 border-gray-200"
        />
        <KpiCard
          label="高リスク産業"
          value={data.highRiskCount}
          sub="後継者空白リスク HIGH"
          color="bg-red-50 border-red-200"
        />
        <KpiCard
          label="5年以内消滅リスク"
          value={`${data.extinctionRisk5yr}産業`}
          sub="HIGH + 後継者なしMEDIUM"
          color="bg-orange-50 border-orange-200"
        />
        <KpiCard
          label="平均事業者年齢"
          value={`${data.avgOwnerAge}歳`}
          sub="全産業平均"
          color="bg-amber-50 border-amber-200"
        />
      </div>

      {/* ── 産業種別サマリー ────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
        <h3 className="font-semibold text-gray-700 mb-3 text-sm">📊 産業種別 後継者リスク状況</h3>
        <div className="space-y-1">
          {data.typeSummaries.map((s) => (
            <IndustryTypeRow key={s.industryType} summary={s} />
          ))}
        </div>
      </div>

      {/* ── フィルターボタン ────────────────────────── */}
      <div className="flex flex-wrap gap-2">
        {filterButtons.map(({ key, label, count, style, activeStyle }) => (
          <button
            key={key}
            onClick={() => setRiskFilter(key)}
            className={`text-sm px-3 py-1.5 rounded-full border font-medium transition-all ${
              riskFilter === key ? activeStyle : style + ' bg-white hover:bg-gray-50'
            }`}
          >
            {label} <span className="ml-1 font-normal">({count})</span>
          </button>
        ))}
      </div>

      {/* ── 産業一覧（モバイル: カード / デスクトップ: テーブル） ── */}

      {/* モバイルカード */}
      <div className="md:hidden space-y-3">
        {filteredRecords.length === 0 ? (
          <p className="text-center text-gray-400 py-8">該当する産業がありません</p>
        ) : (
          filteredRecords.map((r) => <IndustryCard key={r.id} record={r} />)
        )}
      </div>

      {/* デスクトップテーブル */}
      <div className="hidden md:block bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-600">産業名</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">リスク</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">事業者数</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">平均年齢</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">年商</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">後継者</th>
              <th className="px-4 py-3 text-center font-semibold text-gray-600">6次産業化</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-600">課題</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filteredRecords.length === 0 ? (
              <tr><td colSpan={8} className="py-8 text-center text-gray-400">該当する産業がありません</td></tr>
            ) : (
              filteredRecords.map((r) => <IndustryRow key={r.id} record={r} />)
            )}
          </tbody>
        </table>
      </div>

      {/* ── AI支援施策提言 ──────────────────────────── */}
      {data.recommendations.length > 0 && (
        <div className="bg-gradient-to-br from-red-50 to-orange-50 rounded-2xl border border-red-100 p-5">
          <h3 className="font-bold text-red-800 mb-4 flex items-center gap-2">
            <span>🤖</span>
            <span>AI施策提言 — 今すぐ実施すべき6次産業化・後継者育成支援</span>
          </h3>
          <div className="space-y-3">
            {data.recommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} />
            ))}
          </div>
          <p className="text-xs text-red-400 mt-4 text-right">
            ※ Claude Haiku による分析。実際の施策立案は担当職員・専門家と協議のうえ実施してください。
          </p>
        </div>
      )}
    </div>
  );
}
