/**
 * /gyosei/dashboard
 * 行政OS — 地域診断ダッシュボード（マルチテナント対応版）
 *
 * Sprint #3  : 初期実装（屋久島固定）
 * Sprint #32 : useMunicipality() で自治体切り替えに対応
 *              霧島市データを追加、全表示を動的化
 *
 * ■ データ方針
 *   各自治体の診断データはこのファイルの MUNICIPALITY_DATA に静的定義する。
 *   将来的に Notion DB 化する場合は getDataForMunicipality() を API 呼び出しに差し替えればよい。
 */

'use client';

import { useState, useEffect } from 'react';
import { useScenario } from '@/contexts/ScenarioContext';
import { useMunicipality } from '@/contexts/MunicipalityContext';
import Link from 'next/link';
import {
  Zap,
  TrendingDown,
  Users,
  Heart,
  ChevronRight,
  MapPin,
  AlertCircle,
  CheckCircle,
  Loader2,
} from 'lucide-react';

// ─── 自治体診断データの型 ─────────────────────────────────

type PopulationPoint = { year: number; population: number };

type MunicipalityDiagnosisData = {
  name: string;
  prefecture: string;
  energySelfSufficiency: number;
  fiscalStrength: number;     // 表示用スコア（0〜100）
  fiscalIndex: number;        // 実際の財政力指数
  populationViability: number;
  wellBeingScore: number;
  currentPopulation: number;
  agingRate: number;
  populationForecast: PopulationPoint[];
  survivalRank: 'S' | 'A' | 'B' | 'C' | 'D';
  comments: {
    energy: string;
    fiscal: string;
    population: string;
    wellbeing: string;
  };
  aiPromptContext: string;
};

// ─── 自治体診断データ定義 ─────────────────────────────────

const MUNICIPALITY_DATA: Record<string, MunicipalityDiagnosisData> = {

  // ── 屋久島町 ──────────────────────────────────────────
  yakushima: {
    name: '屋久島町',
    prefecture: '鹿児島県',
    energySelfSufficiency: 99,
    fiscalStrength: 18,
    fiscalIndex: 0.18,
    populationViability: 53,
    wellBeingScore: 72,
    currentPopulation: 12200,
    agingRate: 39.2,
    populationForecast: [
      { year: 2024, population: 12200 },
      { year: 2034, population: 10100 },
      { year: 2044, population: 8200 },
      { year: 2054, population: 6500 },
    ],
    survivalRank: 'B',
    comments: {
      energy:     '水力発電でほぼ100%自給。脱炭素・エネルギー安全保障で全国トップ級',
      fiscal:     '全国平均(0.51)の1/3。国からの地方交付税に大きく依存している状態',
      population: '2054年に約6,500人（現在の53%）と推計。行政サービス維持が課題',
      wellbeing:  '豊かな自然・世界遺産・観光業が高スコアを支える。住民満足度は比較的高い',
    },
    aiPromptContext: `
【屋久島町データ】
- 現在人口: 12,200人（高齢化率 39.2%）
- 財政力指数: 0.18（全国平均0.51の約1/3。交付税依存度が高い）
- エネルギー自給率: 99%（水力発電）
- 2054年推計人口: 6,500人（現在の53%）
- 生存可能性ランク: B（要注意）
強み: 世界自然遺産、エネルギー自立、観光資源
弱み: 財政力低下、人口減少加速、IT人材不足`,
  },

  // ── 霧島市 ────────────────────────────────────────────
  kirishima: {
    name: '霧島市',
    prefecture: '鹿児島県',
    energySelfSufficiency: 45,
    fiscalStrength: 49,
    fiscalIndex: 0.49,
    populationViability: 75,
    wellBeingScore: 68,
    currentPopulation: 119000,
    agingRate: 31.0,
    populationForecast: [
      { year: 2024, population: 119000 },
      { year: 2034, population: 110000 },
      { year: 2044, population: 100000 },
      { year: 2054, population: 89000 },
    ],
    survivalRank: 'A',
    comments: {
      energy:     '地熱・太陽光等で約45%自給。霧島温泉を活かした地熱発電のさらなる活用が課題',
      fiscal:     '財政力指数0.49は全国平均水準。航空宇宙・観光・農業の多角的産業基盤が強み',
      population: '2054年に約89,000人（現在の75%）と推計。県内主要都市として中長期の人口維持が鍵',
      wellbeing:  '霧島温泉・自然公園・航空宇宙産業が生活満足度を支える。職員定着率の向上が課題',
    },
    aiPromptContext: `
【霧島市データ】
- 現在人口: 119,000人（高齢化率 31.0%）
- 財政力指数: 0.49（全国平均水準。比較的安定）
- エネルギー自給率: 45%（地熱・太陽光）
- 2054年推計人口: 89,000人（現在の75%）
- 生存可能性ランク: A（良好）
強み: 航空宇宙産業・霧島温泉・農業（茶・畜産）・財政安定
弱み: 高齢化進行、IT人材確保、中山間地域の過疎化`,
  },

  // ── NEC コーポレートIT部門（準備中） ─────────────────
  nec: {
    name: 'NEC コーポレートIT部門',
    prefecture: '東京都',
    energySelfSufficiency: 30,
    fiscalStrength: 85,
    fiscalIndex: 0.85,
    populationViability: 90,
    wellBeingScore: 74,
    currentPopulation: 5000,
    agingRate: 28.0,
    populationForecast: [
      { year: 2024, population: 5000 },
      { year: 2034, population: 4800 },
      { year: 2044, population: 4500 },
      { year: 2054, population: 4300 },
    ],
    survivalRank: 'A',
    comments: {
      energy:     '再生可能エネルギー調達を推進中。2030年カーボンニュートラル目標に向け取り組み強化',
      fiscal:     '安定した財務基盤。IT投資余力は十分あるが、ROI評価の厳格化が求められている',
      population: '従業員数は安定推移。デジタル人材の確保・育成が中長期の最重要課題',
      wellbeing:  'ワークスタイル改革・健康経営を推進。エンゲージメントスコア向上が次のテーマ',
    },
    aiPromptContext: `
【NEC コーポレートIT部門データ】
- 対象従業員: 約5,000人
- IT予算充足度: 高い（財政力指数相当: 0.85）
- エネルギー自給率: 30%（再エネ調達推進中）
- 人材維持率: 90%（デジタル人材確保が課題）
強み: 財務安定、技術力、グローバルネットワーク
弱み: デジタル人材不足、レガシーシステム刷新、組織変革スピード`,
  },
};

/** 選択中の自治体のデータを返す。未定義の場合は yakushima をフォールバック */
function getDataForMunicipality(id: string): MunicipalityDiagnosisData {
  return MUNICIPALITY_DATA[id] ?? MUNICIPALITY_DATA.yakushima;
}

// ─── 指標カードの設定（動的生成） ────────────────────────

type MetricConfig = {
  icon: React.ElementType;
  label: string;
  value: number;
  displayValue: string;
  unit: string;
  color: string;
  bgColor: string;
  borderColor: string;
  status: 'good' | 'warning' | 'danger';
  comment: string;
};

function buildMetrics(d: MunicipalityDiagnosisData): MetricConfig[] {
  return [
    {
      icon: Zap,
      label: 'エネルギー自給率',
      value: d.energySelfSufficiency,
      displayValue: `${d.energySelfSufficiency}%`,
      unit: '',
      color: d.energySelfSufficiency >= 80 ? 'text-yellow-600' : 'text-orange-600',
      bgColor: d.energySelfSufficiency >= 80 ? 'bg-yellow-50' : 'bg-orange-50',
      borderColor: d.energySelfSufficiency >= 80 ? 'border-yellow-200' : 'border-orange-200',
      status: d.energySelfSufficiency >= 80 ? 'good' : d.energySelfSufficiency >= 40 ? 'warning' : 'danger',
      comment: d.comments.energy,
    },
    {
      icon: TrendingDown,
      label: '財政力',
      value: d.fiscalStrength,
      displayValue: d.fiscalIndex.toFixed(2),
      unit: '（財政力指数）',
      color: d.fiscalStrength >= 45 ? 'text-green-600' : 'text-red-600',
      bgColor: d.fiscalStrength >= 45 ? 'bg-green-50' : 'bg-red-50',
      borderColor: d.fiscalStrength >= 45 ? 'border-green-200' : 'border-red-200',
      status: d.fiscalStrength >= 45 ? 'good' : d.fiscalStrength >= 25 ? 'warning' : 'danger',
      comment: d.comments.fiscal,
    },
    {
      icon: Users,
      label: '30年後の人口維持率',
      value: d.populationViability,
      displayValue: `${d.populationViability}%`,
      unit: '',
      color: d.populationViability >= 70 ? 'text-blue-600' : 'text-orange-600',
      bgColor: d.populationViability >= 70 ? 'bg-blue-50' : 'bg-orange-50',
      borderColor: d.populationViability >= 70 ? 'border-blue-200' : 'border-orange-200',
      status: d.populationViability >= 70 ? 'good' : d.populationViability >= 55 ? 'warning' : 'danger',
      comment: d.comments.population,
    },
    {
      icon: Heart,
      label: 'Well-Being スコア',
      value: d.wellBeingScore,
      displayValue: `${d.wellBeingScore}`,
      unit: '/ 100',
      color: d.wellBeingScore >= 70 ? 'text-green-600' : 'text-amber-600',
      bgColor: d.wellBeingScore >= 70 ? 'bg-green-50' : 'bg-amber-50',
      borderColor: d.wellBeingScore >= 70 ? 'border-green-200' : 'border-amber-200',
      status: d.wellBeingScore >= 70 ? 'good' : 'warning',
      comment: d.comments.wellbeing,
    },
  ];
}

// ─── 円形ゲージ ───────────────────────────────────────────

function CircleGauge({ value, color, size = 80 }: { value: number; color: string; size?: number }) {
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;
  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
      <circle
        cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth="8"
        strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
        strokeLinecap="round" className={color}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

// ─── 人口推計グラフ ───────────────────────────────────────

function PopulationChart({ data }: { data: PopulationPoint[] }) {
  const width = 320, height = 160;
  const pL = 60, pR = 20, pT = 20, pB = 40;
  const cW = width - pL - pR, cH = height - pT - pB;
  const maxPop = Math.max(...data.map(d => d.population)) * 1.15;
  const minPop = Math.min(...data.map(d => d.population)) * 0.85;
  const toX = (i: number) => pL + (i / (data.length - 1)) * cW;
  const toY = (v: number) => pT + cH - ((v - minPop) / (maxPop - minPop)) * cH;
  const points = data.map((d, i) => ({ x: toX(i), y: toY(d.population), ...d }));
  const polylinePoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const yTicks = [maxPop, (maxPop + minPop) / 2, minPop].map(v => Math.round(v / 1000) * 1000);
  const fmt = (v: number) => v >= 10000 ? `${(v / 10000).toFixed(1)}万` : `${(v / 1000).toFixed(0)}千`;

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={height} className="text-orange-500" style={{ minWidth: width }}>
        {yTicks.map(val => {
          const y = toY(val);
          return (
            <g key={val}>
              <line x1={pL} y1={y} x2={width - pR} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="4,4" />
              <text x={pL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="#9ca3af">{fmt(val)}</text>
            </g>
          );
        })}
        <polyline points={polylinePoints} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {points.map(p => (
          <g key={p.year}>
            <circle cx={p.x} cy={p.y} r="4" fill="white" stroke="currentColor" strokeWidth="2" />
            <text x={p.x} y={p.y - 10} textAnchor="middle" fontSize="10" fill="#f97316" fontWeight="600">{fmt(p.population)}</text>
            <text x={p.x} y={height - 6} textAnchor="middle" fontSize="11" fill="#6b7280">{p.year}</text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── 生存可能性ランクバッジ ───────────────────────────────

function SurvivalRankBadge({ rank }: { rank: string }) {
  const config: Record<string, { color: string; label: string }> = {
    S: { color: 'text-yellow-700 bg-yellow-100 border-yellow-300', label: 'S ランク — 持続可能' },
    A: { color: 'text-green-700 bg-green-100 border-green-300',   label: 'A ランク — 良好' },
    B: { color: 'text-blue-700 bg-blue-100 border-blue-300',      label: 'B ランク — 要注意' },
    C: { color: 'text-orange-700 bg-orange-100 border-orange-300', label: 'C ランク — 危機的' },
    D: { color: 'text-red-700 bg-red-100 border-red-300',         label: 'D ランク — 限界' },
  };
  const c = config[rank] ?? config.B;
  return <span className={`px-3 py-1 rounded-full text-sm font-bold border ${c.color}`}>{c.label}</span>;
}

// ─── メインコンポーネント ─────────────────────────────────

export default function GyoseiDashboard() {
  // Sprint #32: セレクターで選択中の自治体を Context から取得
  const { municipalityId } = useMunicipality();
  const d = getDataForMunicipality(municipalityId);
  const metrics = buildMetrics(d);

  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [notionSaveStatus, setNotionSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [notionPageUrl, setNotionPageUrl] = useState<string | null>(null);

  // ScenarioContext に自治体データを登録（ChatPanel の行政OSモード用）
  const { setModule, setGyoseiData } = useScenario();
  useEffect(() => {
    setModule('gyosei');
    setGyoseiData({
      townName: d.name,
      population: d.currentPopulation,
      agingRate: d.agingRate,
      fiscalIndex: d.fiscalIndex,
      survivalRank: d.survivalRank,
    });
  // 自治体が切り替わるたびに ChatPanel のコンテキストも更新する
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [municipalityId]);

  // 自治体切り替え時に AI診断・Notion保存状態をリセット
  useEffect(() => {
    setAiDiagnosis(null);
    setNotionSaveStatus('idle');
    setNotionPageUrl(null);
  }, [municipalityId]);

  /** Notion に行政データを保存する */
  async function saveGyoseiToNotion() {
    setNotionSaveStatus('saving');
    try {
      const response = await fetch('/api/notion/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          saveType: 'gyosei',
          data: {
            townName: d.name,
            population: d.currentPopulation,
            agingRate: d.agingRate,
            fiscalIndex: d.fiscalIndex,
            survivalRank: d.survivalRank,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotionSaveStatus('saved');
      setNotionPageUrl(result.pageUrl);
    } catch (err) {
      console.error('Notion保存エラー:', err);
      setNotionSaveStatus('error');
    }
  }

  /** Claude AI に地域戦略の診断を依頼する */
  async function handleAiDiagnosis() {
    setAiLoading(true);
    setAiDiagnosis(null);
    const prompt = `以下は${d.name}の地域診断データです。この自治体が持続可能な形で行政サービスを維持するための具体的な戦略を、IT担当者・自治体職員が実行できるレベルで3つ提案してください。
${d.aiPromptContext}
回答は箇条書きで、各提案に「①何をする」「②誰がやる」「③いつまでに」を明記してください。`;
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      if (!res.ok) throw new Error('AIの応答取得に失敗しました');
      const data = await res.json();
      setAiDiagnosis(data.response ?? data.content ?? data.text ?? JSON.stringify(data));
    } catch {
      setAiDiagnosis('AI診断を取得できませんでした。右上の「RunWithアシスタント」からご利用ください。');
    } finally {
      setAiLoading(false);
    }
  }

  const lastForecast = d.populationForecast[d.populationForecast.length - 1];

  return (
    <div className="space-y-6">

      {/* ── ページヘッダー ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <MapPin size={14} />
            <span>{d.prefecture}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            🏛️ {d.name} — 地域診断
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            行政OS Phase 1 | {d.name}モデル（実データ）
          </p>
        </div>
        <SurvivalRankBadge rank={d.survivalRank} />
      </div>

      {/* ── 4指標カード ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div key={m.label} className={`rounded-xl border p-5 ${m.bgColor} ${m.borderColor}`}>
            <div className="flex items-center gap-2 mb-3">
              <m.icon size={18} className={m.color} />
              <span className="text-sm font-semibold text-gray-700">{m.label}</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <CircleGauge value={m.value} color={m.color} size={72} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-base font-black ${m.color}`}>{m.value}</span>
                </div>
              </div>
              <div>
                <div className={`text-2xl font-black ${m.color}`}>
                  {m.displayValue}
                  <span className="text-xs font-normal text-gray-500 ml-1">{m.unit}</span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {m.status === 'good'
                    ? <CheckCircle size={12} className="text-green-500" />
                    : <AlertCircle size={12} className={m.status === 'danger' ? 'text-red-500' : 'text-orange-500'} />
                  }
                  <span className="text-xs text-gray-500">
                    {m.status === 'good' ? '良好' : m.status === 'warning' ? '要注意' : '危機的'}
                  </span>
                </div>
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">{m.comment}</p>
          </div>
        ))}
      </div>

      {/* ── 人口推計グラフ ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-4 flex items-center gap-2">
          <TrendingDown size={16} className="text-orange-500" />
          人口推計（2024〜2054年）
        </h2>
        <div className="flex flex-col sm:flex-row sm:items-end gap-4">
          <PopulationChart data={d.populationForecast} />
          <div className="space-y-2 text-sm text-gray-600 min-w-48">
            <div className="flex justify-between">
              <span className="text-gray-500">現在人口</span>
              <span className="font-bold text-gray-800">{d.currentPopulation.toLocaleString()}人</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">高齢化率</span>
              <span className="font-bold text-orange-600">{d.agingRate}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">30年後推計</span>
              <span className="font-bold text-red-600">{lastForecast.population.toLocaleString()}人</span>
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                現在の{d.populationViability}%まで変化する見込み。
                行政サービス水準の維持が重要課題。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI 地域診断 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          🤖 Claude AI — {d.name} 地域戦略の提案
        </h2>
        {aiDiagnosis ? (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
            {aiDiagnosis}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 mb-4">
            ボタンを押すと Claude が{d.name}の課題を分析し、具体的な戦略を提案します。
          </div>
        )}
        <button
          onClick={handleAiDiagnosis}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {aiLoading
            ? <><Loader2 size={16} className="animate-spin" />Claude が分析中...</>
            : <>🔍 AI に{d.name}の地域戦略を診断してもらう</>
          }
        </button>

        {/* Notion保存（Sprint #6） */}
        <div className="mt-3 flex items-center gap-2">
          {notionSaveStatus === 'idle' && (
            <button onClick={saveGyoseiToNotion}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-colors">
              📝 行政データをNotionに保存
            </button>
          )}
          {notionSaveStatus === 'saving' && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              保存中...
            </div>
          )}
          {notionSaveStatus === 'saved' && notionPageUrl && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 text-sm font-semibold">✅ Notionに保存しました</span>
              <a href={notionPageUrl} target="_blank" rel="noopener noreferrer"
                className="text-emerald-700 text-sm underline hover:text-emerald-600">🔗 開く</a>
            </div>
          )}
          {notionSaveStatus === 'error' && (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-sm">❌ 保存失敗</span>
              <button onClick={saveGyoseiToNotion}
                className="text-red-600 text-sm underline hover:text-red-500">再試行</button>
            </div>
          )}
        </div>
      </div>

      {/* ── RunWith への橋渡しバナー ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg mb-1 text-emerald-900">🔧 次のステップ：IT基盤を整える</h3>
            <p className="text-emerald-700 text-sm leading-relaxed">
              人口変化が進んでも行政サービスを維持するには、IT運用の効率化が不可欠です。
              RunWith で{d.name}の IT 成熟度を診断し、具体的な改善計画を立てましょう。
            </p>
          </div>
          <Link href="/runwith/maturity"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors whitespace-nowrap shadow-sm">
            RunWith を開く<ChevronRight size={16} />
          </Link>
        </div>
      </div>

    </div>
  );
}
