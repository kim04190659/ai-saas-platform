"use client";

/**
 * /well-being-quest/result - AI評価結果ページ
 *
 * Groq AIが算出した以下の結果を表示する:
 *   - 政策提案書（AIが整理した版）
 *   - Well-Being 8指標スコア（レーダー風バーグラフ）
 *   - 人口シミュレーション（施策あり・なし比較）
 *   - 目標達成判定・総合ランク（S/A/B/C/D）
 *   - 強み・課題・次のアクション
 *   - 総合評価コメント
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ===== 型定義 =====

// Groq AIから返ってくる評価結果の型
type AIResult = {
  proposal: string;             // AIが整理した政策提案書
  wellBeingScores: {            // Well-Being 8指標スコア
    economic: number;           // 経済的安定
    socialConnection: number;   // 社会的つながり
    healthMedical: number;      // 健康・医療
    autonomy: number;           // 自己決定の自由
    generosity: number;         // 助け合い・寛大さ
    trust: number;              // 行政への信頼
    safety: number;             // 安全・安心
    nature: number;             // 自然・住環境
    total: number;              // 合計（100点満点）
  };
  populationSim: {              // 人口シミュレーション
    withoutPolicy: { y5: number; y10: number; y20: number };
    withPolicy: { y5: number; y10: number; y20: number };
  };
  rankJudge: {                  // 目標達成判定
    populationAchieved: boolean;
    wellBeingAchieved: boolean;
    populationDiff: number;
    wellBeingDiff: number;
  };
  rank: "S" | "A" | "B" | "C" | "D";
  strengths: string[];
  challenges: string[];
  nextActions: string[];
  comment: string;              // 総合評価コメント
};

type SelectedCard = {
  title: string;
  description: string;
  cardName: string;
  rank: string;
};

// ===== 定数・ユーティリティ =====

// Well-Being 8指標の表示名
const WB_METRICS = [
  { key: "economic",         label: "経済的安定",        icon: "💰" },
  { key: "socialConnection", label: "社会的つながり",    icon: "🤝" },
  { key: "healthMedical",    label: "健康・医療",        icon: "🏥" },
  { key: "autonomy",         label: "自己決定の自由",    icon: "🗳️" },
  { key: "generosity",       label: "助け合い・寛大さ",  icon: "💝" },
  { key: "trust",            label: "行政への信頼",      icon: "🏛️" },
  { key: "safety",           label: "安全・安心",        icon: "🛡️" },
  { key: "nature",           label: "自然・住環境",      icon: "🌿" },
];

// ランク別の見た目設定
const RANK_CONFIG = {
  S: {
    color: "text-yellow-300",
    bg: "bg-yellow-500/20 border-yellow-500",
    label: "超優秀！人口増加転換を実現",
    emoji: "🏆",
  },
  A: {
    color: "text-green-300",
    bg: "bg-green-500/20 border-green-500",
    label: "優秀！目標を達成",
    emoji: "🥇",
  },
  B: {
    color: "text-blue-300",
    bg: "bg-blue-500/20 border-blue-500",
    label: "良好。目標の80%を達成",
    emoji: "👍",
  },
  C: {
    color: "text-gray-300",
    bg: "bg-gray-500/20 border-gray-500",
    label: "一部改善あり。さらなる工夫を",
    emoji: "🔧",
  },
  D: {
    color: "text-red-300",
    bg: "bg-red-500/20 border-red-500",
    label: "効果が限定的。抜本的な見直しを",
    emoji: "💪",
  },
};

// WBスコアを色で可視化（12.5点満点）
function getScoreBarColor(score: number): string {
  const pct = (score / 12.5) * 100;
  if (pct >= 80) return "bg-green-500";
  if (pct >= 60) return "bg-yellow-500";
  if (pct >= 40) return "bg-orange-500";
  return "bg-red-500";
}

// 人数を読みやすく表示
function formatPop(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}万人`;
  return `${n.toLocaleString()}人`;
}

// ===== メインコンポーネント =====

export default function WBQResultPage() {
  const router = useRouter();

  // localStorageから復元するデータ
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [targetPopulation, setTargetPopulation] = useState(12000);
  const [targetWellBeing, setTargetWellBeing] = useState(75);
  const [selectedCards, setSelectedCards] = useState<Record<string, SelectedCard> | null>(null);
  const [planText, setPlanText] = useState("");
  const [aiResult, setAiResult] = useState<AIResult | null>(null);

  // ページ読み込み時にlocalStorageから全データを復元
  useEffect(() => {
    setTeamName(localStorage.getItem("wbq_teamName") ?? "");
    setMembers(localStorage.getItem("wbq_members") ?? "");
    setTargetPopulation(Number(localStorage.getItem("wbq_targetPopulation") ?? "12000"));
    setTargetWellBeing(Number(localStorage.getItem("wbq_targetWellBeing") ?? "75"));
    setPlanText(localStorage.getItem("wbq_planText") ?? "");

    const savedCards = localStorage.getItem("wbq_selectedCards");
    if (savedCards) {
      try { setSelectedCards(JSON.parse(savedCards)); } catch { /* ignore */ }
    }

    const savedResult = localStorage.getItem("wbq_aiResult");
    if (savedResult) {
      try {
        setAiResult(JSON.parse(savedResult));
      } catch {
        router.push("/well-being-quest/plan");
      }
    } else {
      router.push("/well-being-quest/plan");
    }
  }, [router]);

  // データが揃うまでローディング表示
  if (!aiResult) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at top, #2d4a22 0%, #0f2010 100%)" }}
      >
        <div className="text-center text-white">
          <div className="text-5xl mb-4 animate-spin">⏳</div>
          <p>結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  const rankConf = RANK_CONFIG[aiResult.rank];

  // ===== レンダリング =====
  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse at top, #1a2f1a 0%, #0f1f0f 60%, #060d06 100%)",
      }}
    >
      {/* ===== ヘッダー ===== */}
      <div className="bg-black/60 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold">🏘️ Well-Being QUEST ─ 評価結果</h1>
            <p className="text-green-400/70 text-xs">
              {teamName} ｜ {members.split("\n").filter(Boolean).join("・")}
            </p>
          </div>
          <button
            onClick={() => router.push("/well-being-quest")}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            🔄 最初からやり直す
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ===== ① 総合ランク ===== */}
        <div className={`border-2 rounded-2xl p-6 text-center ${rankConf.bg}`}>
          <p className="text-4xl mb-1">{rankConf.emoji}</p>
          <p className="text-8xl font-black mb-2" style={{
            WebkitTextStroke: "2px rgba(255,255,255,0.3)",
          }}>
            <span className={rankConf.color}>{aiResult.rank}</span>
          </p>
          <p className={`text-lg font-bold ${rankConf.color}`}>{rankConf.label}</p>
          <p className="text-white/60 text-sm mt-1">
            目標: 人口{targetPopulation.toLocaleString()}人 / WB指数{targetWellBeing}点
          </p>

          {/* 目標達成バッジ */}
          <div className="flex justify-center gap-3 mt-4">
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
              aiResult.rankJudge.populationAchieved
                ? "bg-green-500/20 border-green-500 text-green-300"
                : "bg-red-500/20 border-red-500 text-red-300"
            }`}>
              人口目標: {aiResult.rankJudge.populationAchieved ? "✓ 達成" : "✗ 未達"}
              {aiResult.rankJudge.populationDiff !== 0 && (
                <span className="ml-1 text-xs">
                  ({aiResult.rankJudge.populationDiff > 0 ? "+" : ""}{aiResult.rankJudge.populationDiff.toLocaleString()}人)
                </span>
              )}
            </span>
            <span className={`px-4 py-1.5 rounded-full text-sm font-bold border ${
              aiResult.rankJudge.wellBeingAchieved
                ? "bg-green-500/20 border-green-500 text-green-300"
                : "bg-red-500/20 border-red-500 text-red-300"
            }`}>
              WB目標: {aiResult.rankJudge.wellBeingAchieved ? "✓ 達成" : "✗ 未達"}
              {aiResult.rankJudge.wellBeingDiff !== 0 && (
                <span className="ml-1 text-xs">
                  ({aiResult.rankJudge.wellBeingDiff > 0 ? "+" : ""}{aiResult.rankJudge.wellBeingDiff}点)
                </span>
              )}
            </span>
          </div>
        </div>

        {/* ===== ② Well-Being スコアと人口シミュ（2カラム） ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Well-Being 8指標スコア */}
          <div className="bg-white/5 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-white font-bold">📊 Well-Being スコア</h2>
              <div className="text-right">
                <span className="text-3xl font-black text-green-400">{aiResult.wellBeingScores.total}</span>
                <span className="text-gray-400 text-sm">/100点</span>
              </div>
            </div>

            {/* 合計スコアのバーゲージ */}
            <div className="mb-4">
              <div className="w-full bg-gray-700 rounded-full h-3 mb-1">
                <div
                  className="h-3 rounded-full transition-all"
                  style={{
                    width: `${Math.min(aiResult.wellBeingScores.total, 100)}%`,
                    background: "linear-gradient(to right, #22c55e, #10b981)",
                  }}
                />
              </div>
              <div className="flex justify-between text-xs text-gray-500">
                <span>0点</span>
                <span className="text-gray-400">
                  {aiResult.wellBeingScores.total >= 85 ? "S圏" :
                   aiResult.wellBeingScores.total >= 70 ? "A圏" :
                   aiResult.wellBeingScores.total >= 55 ? "B圏" :
                   aiResult.wellBeingScores.total >= 40 ? "C圏" : "D圏"}
                </span>
                <span>100点</span>
              </div>
            </div>

            {/* 8指標個別バー */}
            <div className="space-y-2">
              {WB_METRICS.map(({ key, label, icon }) => {
                const score = aiResult.wellBeingScores[key as keyof typeof aiResult.wellBeingScores] as number;
                const pct = (score / 12.5) * 100;
                return (
                  <div key={key}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-300">
                        {icon} {label}
                      </span>
                      <span className="text-white font-mono">
                        {score.toFixed(1)}<span className="text-gray-500">/12.5</span>
                      </span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${getScoreBarColor(score)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 人口シミュレーション */}
          <div className="bg-white/5 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-4">👥 人口シミュレーション</h2>

            {/* 現在値 */}
            <div className="text-center mb-4 bg-black/20 rounded-xl p-3">
              <p className="text-gray-400 text-xs mb-1">起点（現在）</p>
              <p className="text-white font-bold text-2xl">10,000人</p>
            </div>

            {/* 年別比較テーブル */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-2 text-gray-400 font-medium text-xs">時点</th>
                    <th className="text-right py-2 text-red-400 font-medium text-xs">施策なし</th>
                    <th className="text-right py-2 text-green-400 font-medium text-xs">施策あり</th>
                    <th className="text-right py-2 text-blue-400 font-medium text-xs">差分</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { label: "5年後", wKey: "y5" },
                    { label: "10年後", wKey: "y10" },
                    { label: "20年後", wKey: "y20" },
                  ].map(({ label, wKey }) => {
                    const without = aiResult.populationSim.withoutPolicy[wKey as "y5" | "y10" | "y20"];
                    const withPol = aiResult.populationSim.withPolicy[wKey as "y5" | "y10" | "y20"];
                    const diff = withPol - without;
                    return (
                      <tr key={label} className="border-b border-white/5">
                        <td className="py-2 text-gray-300 font-medium text-xs">{label}</td>
                        <td className="py-2 text-right text-red-300 text-xs">
                          {formatPop(without)}
                        </td>
                        <td className="py-2 text-right text-green-300 font-bold text-xs">
                          {formatPop(withPol)}
                        </td>
                        <td className={`py-2 text-right text-xs font-medium ${diff >= 0 ? "text-blue-300" : "text-orange-300"}`}>
                          {diff >= 0 ? "+" : ""}{formatPop(diff)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 目標人口ライン */}
            <div className="mt-4 bg-amber-900/30 border border-amber-500/30 rounded-xl p-3 text-center">
              <p className="text-amber-400/70 text-xs mb-1">🎯 チームの目標（10年後）</p>
              <p className="text-amber-300 font-bold">
                {targetPopulation.toLocaleString()}人
                <span className="ml-2 text-sm">
                  {aiResult.populationSim.withPolicy.y10 >= targetPopulation ? "✓ 達成" : "✗ 未達"}
                </span>
              </p>
            </div>

            {/* グラフ表現（シンプルな棒） */}
            <div className="mt-4">
              <p className="text-gray-400 text-xs mb-2 text-center">10年後の人口比較</p>
              <div className="flex items-end justify-center gap-4 h-20">
                {/* 施策なし */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="bg-red-500/60 rounded-t-sm w-12"
                    style={{
                      height: `${Math.min((aiResult.populationSim.withoutPolicy.y10 / 15000) * 80, 80)}px`,
                    }}
                  />
                  <p className="text-red-400 text-xs">施策なし</p>
                </div>
                {/* 施策あり */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="bg-green-500/60 rounded-t-sm w-12"
                    style={{
                      height: `${Math.min((aiResult.populationSim.withPolicy.y10 / 15000) * 80, 80)}px`,
                    }}
                  />
                  <p className="text-green-400 text-xs">施策あり</p>
                </div>
                {/* 目標 */}
                <div className="flex flex-col items-center gap-1">
                  <div
                    className="bg-amber-500/60 rounded-t-sm w-12 border-t-2 border-dashed border-amber-400"
                    style={{
                      height: `${Math.min((targetPopulation / 15000) * 80, 80)}px`,
                    }}
                  />
                  <p className="text-amber-400 text-xs">目標</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ===== ③ AIが整理した政策提案書 ===== */}
        <div className="bg-white/5 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-3">📄 AIが整理した政策提案書</h2>
          <div className="bg-black/20 rounded-xl p-4">
            <p className="text-green-100 text-sm leading-relaxed whitespace-pre-wrap">
              {aiResult.proposal}
            </p>
          </div>
        </div>

        {/* ===== ④ 強み・課題・次のアクション（3カラム） ===== */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 強み */}
          <div className="bg-green-900/20 border border-green-500/30 rounded-2xl p-4">
            <h3 className="text-green-300 font-bold mb-3">💪 この政策の強み</h3>
            <ul className="space-y-2">
              {aiResult.strengths.map((s, i) => (
                <li key={i} className="text-green-100/80 text-sm flex gap-2">
                  <span className="text-green-400 flex-shrink-0">✓</span>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 課題 */}
          <div className="bg-red-900/20 border border-red-500/30 rounded-2xl p-4">
            <h3 className="text-red-300 font-bold mb-3">⚠️ 課題・リスク</h3>
            <ul className="space-y-2">
              {aiResult.challenges.map((c, i) => (
                <li key={i} className="text-red-100/80 text-sm flex gap-2">
                  <span className="text-red-400 flex-shrink-0">△</span>
                  <span>{c}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* 次のアクション */}
          <div className="bg-blue-900/20 border border-blue-500/30 rounded-2xl p-4">
            <h3 className="text-blue-300 font-bold mb-3">🚀 次のアクション</h3>
            <ul className="space-y-2">
              {aiResult.nextActions.map((a, i) => (
                <li key={i} className="text-blue-100/80 text-sm flex gap-2">
                  <span className="text-blue-400 flex-shrink-0">{i + 1}.</span>
                  <span>{a}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ===== ⑤ 総合評価コメント ===== */}
        <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
          <h2 className="text-white font-bold mb-3">💬 AIからの総合コメント</h2>
          <p className="text-gray-200 text-sm leading-relaxed">{aiResult.comment}</p>
        </div>

        {/* ===== ⑥ 選択カード確認 ===== */}
        {selectedCards && (
          <div className="bg-white/5 rounded-2xl p-5">
            <h2 className="text-white font-bold mb-3">🃏 使用した4枚のカード</h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {[
                { key: "persona", symbol: "♠", label: "ペルソナ" },
                { key: "problem", symbol: "♣", label: "課題・問題" },
                { key: "partner", symbol: "♦", label: "パートナー" },
                { key: "action",  symbol: "♥", label: "アクション" },
              ].map(({ key, symbol, label }) => {
                const card = selectedCards[key];
                return (
                  <div key={key} className="bg-black/30 rounded-xl p-3 text-center">
                    <p className="text-gray-400 text-xs mb-1">{symbol} {label}</p>
                    <p className="text-white text-sm font-semibold">{card?.rank}</p>
                    <p className="text-gray-300 text-xs mt-0.5 line-clamp-2">
                      {card?.title}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ===== ⑦ アクションボタン ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-8">
          {/* もう一度チャレンジ */}
          <button
            onClick={() => router.push("/well-being-quest/plan")}
            className="py-4 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition"
          >
            ✍️ 政策を修正して再評価
          </button>

          {/* 最初からやり直し */}
          <button
            onClick={() => router.push("/well-being-quest")}
            className="py-4 bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white rounded-xl font-bold transition shadow-lg"
          >
            🔄 新しいチームで最初からやり直す
          </button>
        </div>

      </div>
    </div>
  );
}
