/**
 * /gyosei/dashboard
 * 行政OS — 屋久島町 地域診断ダッシュボード（Phase 1）
 *
 * Sprint #3 実装
 * 屋久島町の実際のデータをもとに、地域の健全性を4つの指標で可視化する。
 * Claude AI が地域の課題と戦略を提案する。
 * RunWith（IT運用管理）への橋渡しボタンを提供する。
 *
 * 使用データ（屋久島町 2024年度概算）:
 * - 人口: 12,200人（2024年推計）
 * - 高齢化率: 39.2%
 * - 財政力指数: 0.18（全国平均0.51の約1/3）
 * - エネルギー自給率: 99%（川内川ダム等、水力100%近く）
 * - 30年後推計人口: 約6,500人（現在の53%）
 */

'use client';

import { useState, useEffect } from 'react';
import { useScenario } from '@/contexts/ScenarioContext';
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

// ─── 屋久島データ定義 ────────────────────────────────────

// 屋久島町の診断データ（実データに基づく固定値）
const yakushima = {
  name: '屋久島町',
  prefecture: '鹿児島県',
  // 4つの主要指標
  energySelfSufficiency: 99,   // エネルギー自給率(%) ← 強み：水力発電
  fiscalStrength: 18,          // 財政力指数を100倍して%表示 (0.18 → 18点)
  populationViability: 53,     // 30年後の人口維持率(%) ← 現12,200→推計6,500
  wellBeingScore: 72,          // Well-Beingスコア（自然・観光資源を考慮した独自算出）
  // 詳細数値
  currentPopulation: 12200,
  agingRate: 39.2,
  fiscalIndex: 0.18,
  // 人口推計（10年ごと）
  populationForecast: [
    { year: 2024, population: 12200 },
    { year: 2034, population: 10100 },
    { year: 2044, population: 8200 },
    { year: 2054, population: 6500 },
  ],
  // 生存可能性ランク
  survivalRank: 'B',
};

// ─── 指標カードの設定 ────────────────────────────────────

type MetricConfig = {
  icon: React.ElementType;
  label: string;
  value: number;        // 0〜100 のスコア
  displayValue: string; // 表示用の値
  unit: string;
  color: string;        // Tailwind の色クラス
  bgColor: string;
  borderColor: string;
  status: 'good' | 'warning' | 'danger';
  comment: string;
};

// 4つの指標の設定
const metrics: MetricConfig[] = [
  {
    icon: Zap,
    label: 'エネルギー自給率',
    value: yakushima.energySelfSufficiency,
    displayValue: '99%',
    unit: '',
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
    status: 'good',
    comment: '水力発電でほぼ100%自給。脱炭素・エネルギー安全保障で全国トップ級',
  },
  {
    icon: TrendingDown,
    label: '財政力',
    value: yakushima.fiscalStrength,
    displayValue: '0.18',
    unit: '（財政力指数）',
    color: 'text-red-600',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-200',
    status: 'danger',
    comment: '全国平均(0.51)の1/3。国からの地方交付税に大きく依存している状態',
  },
  {
    icon: Users,
    label: '30年後の人口維持率',
    value: yakushima.populationViability,
    displayValue: '53%',
    unit: '',
    color: 'text-orange-600',
    bgColor: 'bg-orange-50',
    borderColor: 'border-orange-200',
    status: 'warning',
    comment: '2054年に約6,500人（現在の53%）と推計。行政サービス維持が課題',
  },
  {
    icon: Heart,
    label: 'Well-Being スコア',
    value: yakushima.wellBeingScore,
    displayValue: '72',
    unit: '/ 100',
    color: 'text-green-600',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    status: 'good',
    comment: '豊かな自然・世界遺産・観光業が高スコアを支える。住民満足度は比較的高い',
  },
];

// ─── ゲージコンポーネント ─────────────────────────────────

/**
 * 円形ゲージ（SVGで描画）
 * value: 0〜100 のパーセンテージ
 */
function CircleGauge({
  value,
  color,
  size = 80,
}: {
  value: number;
  color: string;
  size?: number;
}) {
  // SVGの円周計算
  const radius = size / 2 - 8;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (value / 100) * circumference;

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      {/* 背景の円 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth="8"
      />
      {/* 値を示す円弧 */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth="8"
        strokeDasharray={circumference}
        strokeDashoffset={strokeDashoffset}
        strokeLinecap="round"
        className={color}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }}
      />
    </svg>
  );
}

// ─── 人口推計グラフ（SVG） ───────────────────────────────

/**
 * 人口推計の折れ線グラフ（SVG手書き）
 * シンプルな折れ線グラフを外部ライブラリなしで実装
 */
function PopulationChart() {
  const data = yakushima.populationForecast;

  // グラフの描画サイズ
  const width = 320;
  const height = 160;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // データの最大・最小値
  const maxPop = 14000;
  const minPop = 5000;

  // データを SVG 座標に変換
  const points = data.map((d, i) => {
    const x = paddingLeft + (i / (data.length - 1)) * chartWidth;
    const y = paddingTop + chartHeight - ((d.population - minPop) / (maxPop - minPop)) * chartHeight;
    return { x, y, ...d };
  });

  // polylineのpoints文字列を生成
  const polylinePoints = points.map((p) => `${p.x},${p.y}`).join(' ');

  return (
    <div className="overflow-x-auto">
      <svg
        width={width}
        height={height}
        className="text-orange-500"
        style={{ minWidth: width }}
      >
        {/* Y軸の目盛り線（3本） */}
        {[14000, 10000, 6000].map((val) => {
          const y = paddingTop + chartHeight - ((val - minPop) / (maxPop - minPop)) * chartHeight;
          return (
            <g key={val}>
              <line
                x1={paddingLeft}
                y1={y}
                x2={width - paddingRight}
                y2={y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4,4"
              />
              <text
                x={paddingLeft - 6}
                y={y + 4}
                textAnchor="end"
                fontSize="10"
                fill="#9ca3af"
              >
                {(val / 10000).toFixed(1)}万
              </text>
            </g>
          );
        })}

        {/* 折れ線グラフ */}
        <polyline
          points={polylinePoints}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* データポイントの円と年ラベル */}
        {points.map((p) => (
          <g key={p.year}>
            {/* データポイントの円 */}
            <circle
              cx={p.x}
              cy={p.y}
              r="4"
              fill="white"
              stroke="currentColor"
              strokeWidth="2"
            />
            {/* 人口の数値 */}
            <text
              x={p.x}
              y={p.y - 10}
              textAnchor="middle"
              fontSize="10"
              fill="#f97316"
              fontWeight="600"
            >
              {(p.population / 10000).toFixed(1)}万
            </text>
            {/* 年ラベル */}
            <text
              x={p.x}
              y={height - 6}
              textAnchor="middle"
              fontSize="11"
              fill="#6b7280"
            >
              {p.year}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}

// ─── ステータスバッジ ─────────────────────────────────────

/**
 * 生存可能性ランク（S/A/B/C/D）のバッジ
 */
function SurvivalRankBadge({ rank }: { rank: string }) {
  const config = {
    S: { color: 'text-yellow-700 bg-yellow-100 border-yellow-300', label: 'S ランク — 持続可能' },
    A: { color: 'text-green-700 bg-green-100 border-green-300', label: 'A ランク — 良好' },
    B: { color: 'text-blue-700 bg-blue-100 border-blue-300', label: 'B ランク — 要注意' },
    C: { color: 'text-orange-700 bg-orange-100 border-orange-300', label: 'C ランク — 危機的' },
    D: { color: 'text-red-700 bg-red-100 border-red-300', label: 'D ランク — 限界' },
  };
  const c = config[rank as keyof typeof config] ?? config.B;

  return (
    <span className={`px-3 py-1 rounded-full text-sm font-bold border ${c.color}`}>
      {c.label}
    </span>
  );
}

// ─── メインコンポーネント ─────────────────────────────────

export default function GyoseiDashboard() {
  // AI診断の状態管理
  const [aiDiagnosis, setAiDiagnosis] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  // Sprint #6: Notion保存ステータス
  const [notionSaveStatus, setNotionSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [notionPageUrl, setNotionPageUrl] = useState<string | null>(null);

  // Sprint #4: ScenarioContext にモジュールと屋久島データを登録
  // これにより ChatPanel が「行政OSモード」で動作し、屋久島データを把握して回答できる
  const { setModule, setGyoseiData } = useScenario();
  useEffect(() => {
    setModule('gyosei');
    setGyoseiData({
      townName: yakushima.name,
      population: yakushima.currentPopulation,
      agingRate: yakushima.agingRate,
      fiscalIndex: yakushima.fiscalIndex,
      survivalRank: yakushima.survivalRank,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Sprint #6: 行政OSデータをNotionに保存する
   */
  async function saveGyoseiToNotion() {
    setNotionSaveStatus("saving");
    try {
      const response = await fetch("/api/notion/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveType: "gyosei",
          data: {
            townName: yakushima.name,
            population: yakushima.currentPopulation,
            agingRate: yakushima.agingRate,
            fiscalIndex: yakushima.fiscalIndex,
            survivalRank: yakushima.survivalRank,
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setNotionSaveStatus("saved");
      setNotionPageUrl(result.pageUrl);
    } catch (err) {
      console.error("Notion保存エラー:", err);
      setNotionSaveStatus("error");
    }
  }

  /**
   * 「AI診断を依頼する」ボタンの処理
   * /api/chat を呼び出し、屋久島のデータを送って Claude から戦略提案をもらう
   */
  async function handleAiDiagnosis() {
    setAiLoading(true);
    setAiDiagnosis(null);

    // Claude に送るプロンプト（屋久島のデータを含める）
    const prompt = `以下は屋久島町の地域診断データです。この自治体が「縮みながらも豊かに暮らせる街」を実現するための具体的な戦略を、IT担当者・自治体職員が実行できるレベルで3つ提案してください。

【屋久島町データ】
- 現在人口: 12,200人（高齢化率 39.2%）
- 財政力指数: 0.18（全国平均0.51の約1/3。交付税依存度が高い）
- エネルギー自給率: 99%（水力発電、強み）
- 2054年推計人口: 6,500人（現在の53%）
- 生存可能性ランク: B（要注意）

強み: 世界自然遺産、エネルギー自立、観光資源
弱み: 財政力低下、人口減少加速、IT人材不足

回答は箇条書きで、各提案に「①何をする」「②誰がやる」「③いつまでに」を明記してください。`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt }),
      });
      if (!res.ok) throw new Error('AIの応答取得に失敗しました');
      const data = await res.json();
      // レスポンスの形式に応じて取り出す（既存APIに合わせる）
      setAiDiagnosis(data.response ?? data.content ?? data.text ?? JSON.stringify(data));
    } catch {
      setAiDiagnosis('AI診断を取得できませんでした。右上の「AI Chat」ボタンからご利用ください。');
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* ── ページヘッダー ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
            <MapPin size={14} />
            <span>{yakushima.prefecture}</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            🏛️ {yakushima.name} — 地域診断
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            行政OS Phase 1 | 屋久島モデル（実データ）
          </p>
        </div>
        <SurvivalRankBadge rank={yakushima.survivalRank} />
      </div>

      {/* ── 4指標カード ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        {metrics.map((m) => (
          <div
            key={m.label}
            className={`rounded-xl border p-5 ${m.bgColor} ${m.borderColor}`}
          >
            {/* アイコンとラベル */}
            <div className="flex items-center gap-2 mb-3">
              <m.icon size={18} className={m.color} />
              <span className="text-sm font-semibold text-gray-700">{m.label}</span>
            </div>

            {/* ゲージと数値 */}
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                {/* 円形ゲージ */}
                <CircleGauge
                  value={m.value}
                  color={m.color}
                  size={72}
                />
                {/* ゲージ中央の数値 */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={`text-base font-black ${m.color}`}>
                    {m.value}
                  </span>
                </div>
              </div>

              <div>
                <div className={`text-2xl font-black ${m.color}`}>
                  {m.displayValue}
                  <span className="text-xs font-normal text-gray-500 ml-1">
                    {m.unit}
                  </span>
                </div>
                {/* ステータスアイコン */}
                <div className="flex items-center gap-1 mt-1">
                  {m.status === 'good' ? (
                    <CheckCircle size={12} className="text-green-500" />
                  ) : (
                    <AlertCircle size={12} className={m.status === 'danger' ? 'text-red-500' : 'text-orange-500'} />
                  )}
                  <span className="text-xs text-gray-500">
                    {m.status === 'good' ? '良好' : m.status === 'warning' ? '要注意' : '危機的'}
                  </span>
                </div>
              </div>
            </div>

            {/* コメント */}
            <p className="text-xs text-gray-600 mt-3 leading-relaxed">
              {m.comment}
            </p>
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
          <PopulationChart />

          {/* 補足情報 */}
          <div className="space-y-2 text-sm text-gray-600 min-w-48">
            <div className="flex justify-between">
              <span className="text-gray-500">現在人口</span>
              <span className="font-bold text-gray-800">
                {yakushima.currentPopulation.toLocaleString()}人
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">高齢化率</span>
              <span className="font-bold text-orange-600">
                {yakushima.agingRate}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">30年後推計</span>
              <span className="font-bold text-red-600">
                6,500人
              </span>
            </div>
            <div className="border-t border-gray-100 pt-2">
              <p className="text-xs text-gray-400 leading-relaxed">
                現在の人口の53%まで減少。
                行政サービス水準の維持が最大の課題。
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── AI 地域診断 ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
          🤖 Claude AI — 地域戦略の提案
        </h2>

        {/* AI診断の表示 */}
        {aiDiagnosis ? (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed whitespace-pre-wrap mb-4">
            {aiDiagnosis}
          </div>
        ) : (
          <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-500 mb-4">
            ボタンを押すと Claude が屋久島町の課題を分析し、具体的な戦略を提案します。
          </div>
        )}

        {/* AI診断ボタン */}
        <button
          onClick={handleAiDiagnosis}
          disabled={aiLoading}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white rounded-lg text-sm font-semibold transition-colors"
        >
          {aiLoading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Claude が分析中...
            </>
          ) : (
            <>
              🔍 AI に地域戦略を診断してもらう
            </>
          )}
        </button>

        {/* Notion保存ボタン（Sprint #6） */}
        <div className="mt-3 flex items-center gap-2">
          {notionSaveStatus === "idle" && (
            <button
              onClick={saveGyoseiToNotion}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-sm font-semibold transition-colors"
            >
              📝 行政データをNotionに保存
            </button>
          )}
          {notionSaveStatus === "saving" && (
            <div className="flex items-center gap-2 text-slate-400 text-sm">
              <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
              保存中...
            </div>
          )}
          {notionSaveStatus === "saved" && notionPageUrl && (
            <div className="flex items-center gap-2">
              <span className="text-emerald-700 text-sm font-semibold">✅ Notionに保存しました</span>
              <a href={notionPageUrl} target="_blank" rel="noopener noreferrer"
                className="text-emerald-700 text-sm underline hover:text-emerald-600">
                🔗 開く
              </a>
            </div>
          )}
          {notionSaveStatus === "error" && (
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-sm">❌ 保存失敗</span>
              <button onClick={saveGyoseiToNotion}
                className="text-red-600 text-sm underline hover:text-red-500">
                再試行
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── RunWith への橋渡しバナー ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-bold text-lg mb-1 text-emerald-900">
              🔧 次のステップ：IT基盤を整える
            </h3>
            <p className="text-emerald-700 text-sm leading-relaxed">
              人口減少が進んでも行政サービスを維持するには、IT運用の効率化が不可欠です。
              RunWith で屋久島町の IT 成熟度を診断し、具体的な改善計画を立てましょう。
            </p>
          </div>
          <Link
            href="/runwith/maturity"
            className="flex-shrink-0 flex items-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-sm transition-colors whitespace-nowrap shadow-sm"
          >
            RunWith を開く
            <ChevronRight size={16} />
          </Link>
        </div>
      </div>

    </div>
  );
}
