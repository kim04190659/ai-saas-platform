'use client';

/**
 * /kirishima/roads — 道路修復AI分析ダッシュボード
 *
 * 3つのデータを結合してAIが修繕優先度を算出：
 *   1. 道路台帳（劣化度・点検記録）
 *   2. 気象データ（JMA AMeDAS 降水量）
 *   3. 交通量データ（日交通台数・大型車比率）
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, Cloud, Car, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

// ─── 型定義 ────────────────────────────────────────────────

interface RoadData {
  id: string;
  roadName: string;
  sectionName: string;
  roadType: string;
  lengthM: number;
  constructionYear: number;
  ageYears: number;
  deteriorationScore: number;
  lastInspectionDate: string;
  inspectionNotes: string;
  estimatedRepairCostYen: number;
  dailyTraffic: number;
  heavyVehicleRatio: number;
  areaName: string;
  priorityScore: number;
  priorityLevel: '緊急修繕' | '修繕要' | '小修繕' | '良好';
  priorityReason: string;
  weatherImpact: string;
}

interface Summary {
  totalSegments: number;
  urgentCount: number;
  repairNeededCount: number;
  minorRepairCount: number;
  goodCount: number;
  totalRepairCostYen: number;
  urgentRepairCostYen: number;
}

interface Weather {
  totalRainfallMm30d: number;
  maxRainfallMm30d: number;
  heavyRainDays30d: number;
  source: string;
}

interface ApiResponse {
  summary: Summary;
  weather: Weather;
  roads: RoadData[];
  generatedAt: string;
}

// ─── カラー定義 ────────────────────────────────────────────

const LEVEL_CONFIG = {
  '緊急修繕': { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300',    bar: 'bg-red-500',    dot: '🔴' },
  '修繕要':   { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', bar: 'bg-orange-500', dot: '🟠' },
  '小修繕':   { bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', bar: 'bg-yellow-500', dot: '🟡' },
  '良好':     { bg: 'bg-green-100',  text: 'text-green-700',  border: 'border-green-300',  bar: 'bg-green-500',  dot: '🟢' },
};

// ─── サブコンポーネント ────────────────────────────────────

/** 万円単位で金額を表示 */
function formatCost(yen: number): string {
  if (yen >= 1_000_000_000) return `${(yen / 1_000_000_000).toFixed(1)}億円`;
  if (yen >= 10_000_000)    return `${(yen / 10_000_000).toFixed(1)}千万円`;
  if (yen >= 1_000_000)     return `${(yen / 1_000_000).toFixed(1)}百万円`;
  return `${(yen / 10_000).toFixed(0)}万円`;
}

/** スコアバー（横棒グラフ） */
function ScoreBar({ score, level }: { score: number; level: string }) {
  const config = LEVEL_CONFIG[level as keyof typeof LEVEL_CONFIG] ?? LEVEL_CONFIG['良好'];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.bar} rounded-full transition-all duration-700`}
          style={{ width: `${Math.min(score, 100)}%` }}
        />
      </div>
      <span className="text-xs font-bold text-slate-600 w-8 text-right">{score}</span>
    </div>
  );
}

/** 劣化度インジケーター（10マス） */
function DeteriorationBar({ score }: { score: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className={`h-2 w-3 rounded-sm ${
            i < score
              ? score >= 8 ? 'bg-red-500' : score >= 6 ? 'bg-orange-400' : 'bg-yellow-400'
              : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

/** サマリーバッジ */
function SummaryCard({
  label, value, subLabel, color,
}: { label: string; value: string | number; subLabel?: string; color: string }) {
  return (
    <div className={`rounded-xl p-4 border ${color}`}>
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-slate-800">{value}</p>
      {subLabel && <p className="text-xs text-slate-400 mt-1">{subLabel}</p>}
    </div>
  );
}

/** 道路1件のカード */
function RoadCard({ road, rank }: { road: RoadData; rank: number }) {
  const [open, setOpen] = useState(false);
  const cfg = LEVEL_CONFIG[road.priorityLevel];

  return (
    <div className={`rounded-xl border ${cfg.border} bg-white overflow-hidden shadow-sm`}>
      {/* ヘッダー行 */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full text-left p-4 hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-start gap-3">
          {/* 順位 */}
          <span className="text-lg font-bold text-slate-400 w-6 flex-shrink-0 pt-0.5">
            {rank}
          </span>
          {/* メイン情報 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.text}`}>
                {cfg.dot} {road.priorityLevel}
              </span>
              <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                {road.roadType}
              </span>
              <span className="text-xs text-slate-400">{road.areaName}</span>
            </div>
            <p className="font-semibold text-slate-800 mt-1 leading-snug">{road.roadName}</p>
            <p className="text-xs text-slate-500 mt-0.5">{road.sectionName}</p>
            {/* スコアバー */}
            <div className="mt-2">
              <ScoreBar score={road.priorityScore} level={road.priorityLevel} />
            </div>
          </div>
          {/* 右側：費用 + 展開ボタン */}
          <div className="flex-shrink-0 text-right">
            <p className="text-sm font-bold text-slate-700">{formatCost(road.estimatedRepairCostYen)}</p>
            <p className="text-xs text-slate-400">概算費用</p>
            {open ? <ChevronUp size={14} className="ml-auto mt-1 text-slate-400" /> : <ChevronDown size={14} className="ml-auto mt-1 text-slate-400" />}
          </div>
        </div>
      </button>

      {/* 詳細パネル（展開） */}
      {open && (
        <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
          {/* 劣化度 */}
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-500 w-20 flex-shrink-0">劣化度</span>
            <DeteriorationBar score={road.deteriorationScore} />
            <span className="text-xs font-bold text-slate-600">{road.deteriorationScore}/10</span>
          </div>
          {/* 基本情報グリッド */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div><span className="text-slate-400">延長</span> <span className="font-medium text-slate-700">{road.lengthM.toLocaleString()}m</span></div>
            <div><span className="text-slate-400">築年数</span> <span className="font-medium text-slate-700">{road.constructionYear}年（{road.ageYears}年）</span></div>
            <div><span className="text-slate-400">日交通量</span> <span className="font-medium text-slate-700">{road.dailyTraffic.toLocaleString()}台</span></div>
            <div><span className="text-slate-400">大型車比率</span> <span className="font-medium text-slate-700">{road.heavyVehicleRatio}%</span></div>
            <div><span className="text-slate-400">最終点検</span> <span className="font-medium text-slate-700">{road.lastInspectionDate}</span></div>
            <div><span className="text-slate-400">舗装種別</span> <span className="font-medium text-slate-700">—</span></div>
          </div>
          {/* 点検所見 */}
          <div>
            <p className="text-xs text-slate-400 mb-1">点検所見</p>
            <p className="text-xs text-slate-600 leading-relaxed bg-white rounded-lg p-2 border border-slate-200">
              {road.inspectionNotes}
            </p>
          </div>
          {/* AI優先理由 */}
          <div className={`rounded-lg p-2 border ${cfg.border} ${cfg.bg}`}>
            <p className="text-xs font-semibold text-slate-600 mb-1">🤖 AI優先理由</p>
            <p className={`text-xs ${cfg.text} leading-relaxed`}>{road.priorityReason}</p>
          </div>
        </div>
      )}
    </div>
  );
}

/** 劣化度分布の横棒グラフ */
function DistributionChart({ summary }: { summary: Summary }) {
  const total = summary.totalSegments;
  const data = [
    { label: '緊急修繕', count: summary.urgentCount,       color: 'bg-red-500' },
    { label: '修繕要',   count: summary.repairNeededCount, color: 'bg-orange-400' },
    { label: '小修繕',   count: summary.minorRepairCount,  color: 'bg-yellow-400' },
    { label: '良好',     count: summary.goodCount,         color: 'bg-green-400' },
  ];
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-2">
          <span className="text-xs text-slate-500 w-16 flex-shrink-0">{d.label}</span>
          <div className="flex-1 h-4 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={`h-full ${d.color} rounded-full transition-all duration-700`}
              style={{ width: `${(d.count / total) * 100}%` }}
            />
          </div>
          <span className="text-xs font-bold text-slate-600 w-8 text-right">{d.count}件</span>
        </div>
      ))}
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export default function RoadsPage() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterLevel, setFilterLevel] = useState<string>('all');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/kirishima/roads');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json: ApiResponse = await res.json();
      setData(json);
    } catch (e) {
      setError(`データ取得エラー: ${e}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const filteredRoads = data?.roads.filter(
    (r) => filterLevel === 'all' || r.priorityLevel === filterLevel
  ) ?? [];

  // ─── ローディング ──────────────────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-slate-500">道路データ・気象データを取得中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { summary, weather } = data;

  // ─── 本体 ──────────────────────────────────────────────

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">🛣️ 道路修復AI分析</h1>
          <p className="text-sm text-slate-500 mt-1">
            道路台帳 × 気象データ × 交通量 を結合してAIが修繕優先順位を算出
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-600 text-white text-xs rounded-lg hover:bg-teal-700 transition-colors"
        >
          <RefreshCw size={12} />
          <span>更新</span>
        </button>
      </div>

      {/* ── 3データソースバナー ── */}
      <div className="grid grid-cols-3 gap-3">
        <div className="flex items-center gap-2 bg-teal-50 border border-teal-200 rounded-xl p-3">
          <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={16} className="text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-teal-700">道路台帳</p>
            <p className="text-xs text-teal-500">{summary.totalSegments}路線・劣化度記録</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-xl p-3">
          <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Cloud size={16} className="text-blue-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-blue-700">気象庁AMeDAS</p>
            <p className="text-xs text-blue-500">30日降水量 {weather.totalRainfallMm30d}mm</p>
          </div>
        </div>
        <div className="flex items-center gap-2 bg-purple-50 border border-purple-200 rounded-xl p-3">
          <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Car size={16} className="text-purple-600" />
          </div>
          <div>
            <p className="text-xs font-semibold text-purple-700">交通量データ</p>
            <p className="text-xs text-purple-500">日交通量・大型車比率</p>
          </div>
        </div>
      </div>

      {/* ── サマリーカード ── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <SummaryCard
          label="🔴 緊急修繕"
          value={summary.urgentCount}
          subLabel="件"
          color="bg-red-50 border-red-200"
        />
        <SummaryCard
          label="🟠 修繕要"
          value={summary.repairNeededCount}
          subLabel="件"
          color="bg-orange-50 border-orange-200"
        />
        <SummaryCard
          label="💰 緊急修繕費概算"
          value={formatCost(summary.urgentRepairCostYen)}
          subLabel="今年度対応分"
          color="bg-slate-50 border-slate-200"
        />
        <SummaryCard
          label="📊 総修繕費概算"
          value={formatCost(summary.totalRepairCostYen)}
          subLabel="全路線合計"
          color="bg-slate-50 border-slate-200"
        />
      </div>

      {/* ── 2カラムレイアウト：気象パネル + 分布グラフ ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

        {/* 気象影響パネル */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Cloud size={16} className="text-blue-600" />
            <h3 className="text-sm font-bold text-blue-800">気象影響（直近30日）</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-xl font-bold text-blue-700">{weather.totalRainfallMm30d}</p>
              <p className="text-xs text-blue-500">累積降水量(mm)</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-700">{weather.maxRainfallMm30d}</p>
              <p className="text-xs text-blue-500">最大日雨量(mm)</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-blue-700">{weather.heavyRainDays30d}</p>
              <p className="text-xs text-blue-500">大雨日数(日)</p>
            </div>
          </div>
          <p className="text-xs text-blue-400 mt-3">{weather.source}</p>
          {weather.totalRainfallMm30d >= 300 && (
            <div className="mt-2 flex items-start gap-1.5 bg-blue-100 rounded-lg p-2">
              <AlertTriangle size={12} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                降水量が多く、路面劣化が加速しています。緊急修繕路線を優先してください。
              </p>
            </div>
          )}
        </div>

        {/* 状態分布 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <h3 className="text-sm font-bold text-slate-700 mb-3">路線状態分布</h3>
          <DistributionChart summary={summary} />
          <div className="mt-3 pt-3 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              管理路線 {summary.totalSegments}件のうち、
              緊急・修繕要が {summary.urgentCount + summary.repairNeededCount}件（
              {Math.round(((summary.urgentCount + summary.repairNeededCount) / summary.totalSegments) * 100)}%）
            </p>
          </div>
        </div>
      </div>

      {/* ── AI優先度ランキング ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-slate-800">🤖 AI修繕優先度ランキング</h2>
          {/* フィルター */}
          <div className="flex gap-1.5">
            {['all', '緊急修繕', '修繕要', '小修繕', '良好'].map((level) => (
              <button
                key={level}
                onClick={() => setFilterLevel(level)}
                className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                  filterLevel === level
                    ? 'bg-teal-600 text-white border-teal-600'
                    : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                }`}
              >
                {level === 'all' ? 'すべて' : level}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredRoads.map((road, idx) => (
            <RoadCard key={road.id} road={road} rank={idx + 1} />
          ))}
          {filteredRoads.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-sm">
              該当する路線がありません
            </div>
          )}
        </div>
      </div>

      {/* ── データ更新日時 ── */}
      <div className="text-center">
        <p className="text-xs text-slate-300">
          最終更新: {new Date(data.generatedAt).toLocaleString('ja-JP')}
          　|　気象データ: {weather.source}
        </p>
      </div>
    </div>
  );
}
