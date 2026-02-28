"use client";

/**
 * /card-game/result - AI評価結果・企画書表示ページ
 * Claudeが生成した企画書と評価を美しく表示し、Notionに保存する
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CardData } from "@/components/card-game/PlayingCard";

// Claude AIから返ってくる結果の型定義
type AIResult = {
  improvedPlan: string;
  executiveSummary: string;
  targetCustomer: string;
  valueProposition: string;
  revenueModel: string;
  score: number;
  scoreBreakdown: {
    marketPotential: number;
    feasibility: number;
    differentiation: number;
    planQuality: number;
  };
  strengths: string[];
  issues: string[];
  nextActions: string[];
  mentorComment: string;
  metrics: {
    monthlyRevenue: number;
    monthlyProfit: number;
    variableCost: number;
    profitMargin: number;
    feasibilityScore: number;
    marketSize: number;
  };
};

// スコアに応じた色クラスを返す
function getScoreColor(score: number): string {
  if (score >= 80) return "text-green-400";
  if (score >= 60) return "text-yellow-400";
  if (score >= 40) return "text-orange-400";
  return "text-red-400";
}

// スコアに応じたメッセージを返す
function getScoreLabel(score: number): string {
  if (score >= 80) return "🌟 投資家に見せられる水準！";
  if (score >= 60) return "👍 良いアイデア！改善でさらに伸びる";
  if (score >= 40) return "🔧 方向性はOK！根本的な見直しを";
  return "💪 大幅な再設計が必要。でもあきらめるな！";
}

// 円の表示
function formatYen(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(0)}万円`;
  return `${num.toLocaleString()}円`;
}

export default function ResultPage() {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [notionUrl, setNotionUrl] = useState("");
  const [saveError, setSaveError] = useState("");

  // localStorageからデータ復元
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [selectedCards, setSelectedCards] = useState<Record<string, CardData>>({});
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [userInputs, setUserInputs] = useState<Record<string, string>>({});

  useEffect(() => {
    setTeamName(localStorage.getItem("cardGame_teamName") ?? "");
    setMembers(localStorage.getItem("cardGame_members") ?? "");

    const cards = localStorage.getItem("cardGame_selectedCards");
    const result = localStorage.getItem("cardGame_aiResult");
    const inputs = localStorage.getItem("cardGame_userInputs");

    if (!cards || !result) {
      router.push("/card-game");
      return;
    }

    setSelectedCards(JSON.parse(cards));
    setAiResult(JSON.parse(result));
    if (inputs) setUserInputs(JSON.parse(inputs));
  }, [router]);

  // Notionに保存
  async function saveToNotion() {
    setSaving(true);
    setSaveError("");

    try {
      const res = await fetch("/api/card-game/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName, members,
          solutionName: userInputs.solutionName,
          heartCard: selectedCards["♥️ハート"],
          diamondCard: selectedCards["♦️ダイヤ"],
          clubCard: selectedCards["♣️クラブ"],
          spadeCard: selectedCards["♠️スペード"],
          aiResult,
          userInputs,
        }),
      });

      if (!res.ok) throw new Error("保存に失敗しました");

      const data = await res.json();
      setNotionUrl(data.pageUrl);
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "保存エラー");
    } finally {
      setSaving(false);
    }
  }

  if (!aiResult) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-white text-center">
          <div className="text-4xl mb-4 animate-spin">⏳</div>
          <p>結果を読み込み中...</p>
        </div>
      </div>
    );
  }

  const { score, metrics, strengths, issues, nextActions } = aiResult;

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3 print:hidden">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">📊 企画書 &amp; AI評価結果</h1>
            <p className="text-gray-400 text-xs">{teamName}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => window.print()}
              className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600"
            >
              🖨️ 印刷
            </button>
            <button
              onClick={() => router.push("/card-game/select")}
              className="px-3 py-1.5 bg-gray-700 text-gray-200 rounded-lg text-sm hover:bg-gray-600"
            >
              🔄 もう一度
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">

        {/* ===== AI評価スコア ===== */}
        <div className="bg-gray-900 rounded-2xl p-6 border border-gray-700 text-center">
          <p className="text-gray-400 text-sm mb-2">Claude AI 評価スコア</p>
          <div className={`text-7xl font-black mb-2 ${getScoreColor(score)}`}>
            {score}
            <span className="text-2xl text-gray-500">/100</span>
          </div>
          <p className="text-lg font-semibold">{getScoreLabel(score)}</p>

          {/* スコア内訳 */}
          {aiResult.scoreBreakdown && (
            <div className="mt-4 grid grid-cols-4 gap-2">
              {(
                [
                  { key: "marketPotential", label: "市場性" },
                  { key: "feasibility", label: "実現性" },
                  { key: "differentiation", label: "差別化" },
                  { key: "planQuality", label: "品質" },
                ] as const
              ).map(({ key, label }) => {
                const val = aiResult.scoreBreakdown[key];
                return (
                  <div key={key} className="bg-gray-800 rounded-xl p-2">
                    <p className="text-xs text-gray-400">{label}</p>
                    <p className={`text-lg font-bold ${getScoreColor(val * 4)}`}>{val}/25</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ===== エグゼクティブサマリー ===== */}
        <div className="bg-gradient-to-br from-blue-900/50 to-purple-900/50 border border-blue-700/50 rounded-2xl p-5">
          <h2 className="text-base font-bold text-blue-300 mb-2">🎯 エグゼクティブサマリー</h2>
          <p className="text-white text-sm leading-relaxed">{aiResult.executiveSummary}</p>
        </div>

        {/* ===== 企画書メインコンテンツ ===== */}
        <div className="bg-white text-gray-900 rounded-2xl p-6 shadow-2xl">
          {/* 企画書ヘッダー */}
          <div className="border-b-2 border-gray-200 pb-4 mb-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-500 mb-1">ビジネス企画書</p>
                <h2 className="text-2xl font-black text-gray-900">{userInputs.solutionName}</h2>
              </div>
              <div className="text-right text-sm text-gray-500">
                <p>チーム: {teamName}</p>
                <p>{new Date().toLocaleDateString("ja-JP")}</p>
              </div>
            </div>

            {/* 選択カードバッジ */}
            <div className="flex flex-wrap gap-2 mt-3">
              {[
                { suit: "♥️ハート", card: selectedCards["♥️ハート"] },
                { suit: "♦️ダイヤ", card: selectedCards["♦️ダイヤ"] },
                { suit: "♣️クラブ", card: selectedCards["♣️クラブ"] },
                { suit: "♠️スペード", card: selectedCards["♠️スペード"] },
              ].map(({ suit, card }) => card && (
                <span key={suit} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  {suit.split("️")[0]} {card.rank} - {card.title}
                </span>
              ))}
            </div>
          </div>

          {/* ビジネス指標サマリー */}
          <div className="grid grid-cols-4 gap-3 mb-5">
            <div className="text-center p-3 bg-green-50 rounded-xl">
              <p className="text-xs text-gray-500">月間売上試算</p>
              <p className="text-sm font-bold text-green-700">{formatYen(metrics.monthlyRevenue)}</p>
            </div>
            <div className="text-center p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-gray-500">月間利益試算</p>
              <p className={`text-sm font-bold ${metrics.monthlyProfit >= 0 ? "text-blue-700" : "text-red-700"}`}>
                {formatYen(metrics.monthlyProfit)}
              </p>
            </div>
            <div className="text-center p-3 bg-yellow-50 rounded-xl">
              <p className="text-xs text-gray-500">利益率</p>
              <p className="text-sm font-bold text-yellow-700">{metrics.profitMargin}%</p>
            </div>
            <div className="text-center p-3 bg-purple-50 rounded-xl">
              <p className="text-xs text-gray-500">実現可能性</p>
              <p className="text-sm font-bold text-purple-700">{metrics.feasibilityScore}/10</p>
            </div>
          </div>

          {/* バリュープロポジション */}
          <div className="bg-gray-50 rounded-xl p-4 mb-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1">Value Proposition</h3>
            <p className="text-base font-semibold text-gray-800">{aiResult.valueProposition}</p>
          </div>

          {/* ターゲット顧客 */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-1">👤 ターゲット顧客</h3>
            <p className="text-sm text-gray-600">{aiResult.targetCustomer}</p>
          </div>

          {/* 収益モデル */}
          <div className="mb-4">
            <h3 className="text-sm font-bold text-gray-700 mb-1">💰 収益モデル</h3>
            <p className="text-sm text-gray-600">{aiResult.revenueModel}</p>
          </div>

          {/* AIが改善したビジネスプラン */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-2">📋 改善されたビジネスプラン</h3>
            <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-xl p-4">
              {aiResult.improvedPlan}
            </div>
          </div>
        </div>

        {/* ===== AI評価フィードバック ===== */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 強み */}
          <div className="bg-green-900/30 border border-green-700/50 rounded-2xl p-4">
            <h3 className="font-bold text-green-400 mb-3">💪 このビジネスの強み</h3>
            <ul className="space-y-2">
              {strengths.map((s, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-green-100">
                  <span className="text-green-400 mt-0.5">✓</span>
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* 課題・リスク */}
          <div className="bg-red-900/30 border border-red-700/50 rounded-2xl p-4">
            <h3 className="font-bold text-red-400 mb-3">⚠️ 課題・リスク</h3>
            <ul className="space-y-2">
              {issues.map((issue, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-red-100">
                  <span className="text-red-400 mt-0.5">!</span>
                  {issue}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* 明日のグループワークで検討すること */}
        <div className="bg-blue-900/30 border border-blue-700/50 rounded-2xl p-4">
          <h3 className="font-bold text-blue-400 mb-3">🎯 明日のグループワークで検討すること</h3>
          <ul className="space-y-2">
            {nextActions.map((action, i) => (
              <li key={i} className="flex items-start gap-2 text-sm text-blue-100">
                <span className="text-blue-400 font-bold">{i + 1}.</span>
                {action}
              </li>
            ))}
          </ul>
        </div>

        {/* メンターコメント */}
        <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-2xl p-4">
          <h3 className="font-bold text-yellow-400 mb-2">💬 メンターからの総評</h3>
          <p className="text-yellow-100 text-sm leading-relaxed">{aiResult.mentorComment}</p>
        </div>

        {/* ===== Notionに保存ボタン ===== */}
        <div className="text-center py-4 print:hidden">
          {saved ? (
            <div className="space-y-3">
              <p className="text-green-400 font-semibold text-lg">✅ Notionに保存しました！</p>
              {notionUrl && (
                <a
                  href={notionUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block px-6 py-3 bg-gray-700 text-white rounded-xl hover:bg-gray-600 text-sm"
                >
                  📝 Notionで企画書を見る →
                </a>
              )}
            </div>
          ) : (
            <>
              {saveError && (
                <p className="text-red-400 text-sm mb-3">⚠️ {saveError}</p>
              )}
              <button
                onClick={saveToNotion}
                disabled={saving}
                className={`px-8 py-4 rounded-xl text-lg font-bold transition-all ${
                  saving
                    ? "bg-gray-600 cursor-not-allowed"
                    : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg"
                }`}
              >
                {saving ? "⏳ 保存中..." : "📝 Notionに企画書を保存する"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
