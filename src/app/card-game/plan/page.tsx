"use client";

/**
 * /card-game/plan - 企画書作成ページ
 * 選択したカードの情報を表示しながら、ビジネスプランの詳細を入力する
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CardData } from "@/components/card-game/PlayingCard";

// 数値を見やすい形式に変換
function formatYen(num: number): string {
  if (num >= 10000) return `${(num / 10000).toFixed(0)}万円`;
  return `${num.toLocaleString()}円`;
}

export default function PlanPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // localStorageから復元するデータ
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [selectedCards, setSelectedCards] = useState<Record<string, CardData>>({});

  // ユーザー入力フォーム
  const [solutionName, setSolutionName] = useState("");
  const [userBenefit, setUserBenefit] = useState("");
  const [advantage, setAdvantage] = useState("");
  const [planRevision, setPlanRevision] = useState("");

  // ページ読み込み時にlocalStorageからデータ復元
  useEffect(() => {
    const savedTeam = localStorage.getItem("cardGame_teamName") ?? "";
    const savedMembers = localStorage.getItem("cardGame_members") ?? "";
    const savedCards = localStorage.getItem("cardGame_selectedCards");

    setTeamName(savedTeam);
    setMembers(savedMembers);

    if (savedCards) {
      try {
        setSelectedCards(JSON.parse(savedCards));
      } catch {
        // パース失敗時は選択画面に戻す
        router.push("/card-game/select");
      }
    } else {
      // カードが選択されていなければ選択画面へ
      router.push("/card-game/select");
    }
  }, [router]);

  // 選択カードのヘルパー
  const heartCard = selectedCards["♥️ハート"];
  const diamondCard = selectedCards["♦️ダイヤ"];
  const clubCard = selectedCards["♣️クラブ"];
  const spadeCard = selectedCards["♠️スペード"];

  // 自動計算指標
  const monthlyRevenue = (heartCard?.monthlySales ?? 0) * (diamondCard?.unitPrice ?? 0);
  const monthlyProfit = monthlyRevenue - (clubCard?.variableCost ?? 0);
  const profitMargin = monthlyRevenue > 0 ? Math.round((monthlyProfit / monthlyRevenue) * 100) : 0;

  // 「AIに評価してもらう」ボタン
  async function handleSubmit() {
    // 入力バリデーション
    if (!solutionName.trim()) { setError("ソリューション名を入力してください"); return; }
    if (!userBenefit.trim()) { setError("ユーザーベネフィットを入力してください"); return; }
    if (!advantage.trim()) { setError("強みと差異化を入力してください"); return; }
    if (!planRevision.trim()) { setError("ビジネスプランの修正・補足を入力してください"); return; }

    setLoading(true);
    setError("");

    try {
      // Claude AIにビジネスプラン生成・評価を依頼
      const res = await fetch("/api/card-game/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName, members,
          heartCard, diamondCard, clubCard, spadeCard,
          solutionName: solutionName.trim(),
          userBenefit: userBenefit.trim(),
          advantage: advantage.trim(),
          planRevision: planRevision.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI生成に失敗しました");
      }

      const aiResult = await res.json();

      // 結果をlocalStorageに保存して結果ページへ
      localStorage.setItem("cardGame_aiResult", JSON.stringify(aiResult));
      localStorage.setItem("cardGame_userInputs", JSON.stringify({
        solutionName, userBenefit, advantage, planRevision,
      }));

      router.push("/card-game/result");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* ヘッダー */}
      <div className="bg-gray-900 border-b border-gray-700 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">📝 企画書を作成する</h1>
            <p className="text-gray-400 text-xs">{teamName} | {members.split("\n").join("、")}</p>
          </div>
          <button
            onClick={() => router.push("/card-game/select")}
            className="text-sm text-gray-400 hover:text-white"
          >
            ← カード選択に戻る
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ===== 左側：選択カードと指標 ===== */}
        <div>
          <h2 className="text-base font-bold mb-3 text-gray-300">🃏 選択したカード</h2>

          {/* カードサマリー */}
          <div className="space-y-3">
            {[
              { label: "♥️ ペルソナ", card: heartCard, color: "border-red-500/50 bg-red-950/30" },
              { label: "♦️ 問題・課題", card: diamondCard, color: "border-orange-500/50 bg-orange-950/30" },
              { label: "♣️ パートナー", card: clubCard, color: "border-green-500/50 bg-green-950/30" },
              { label: "♠️ ジョブタイプ", card: spadeCard, color: "border-blue-500/50 bg-blue-950/30" },
            ].map(({ label, card, color }) => (
              <div key={label} className={`border rounded-xl p-3 ${color}`}>
                <p className="text-xs text-gray-400 mb-1">{label}</p>
                {card ? (
                  <>
                    <p className="font-semibold text-sm">{card.rank} - {card.title}</p>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{card.description}</p>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">未選択</p>
                )}
              </div>
            ))}
          </div>

          {/* ビジネス指標（自動計算） */}
          <div className="mt-4 bg-gray-800 rounded-xl p-4">
            <h3 className="text-sm font-bold text-gray-300 mb-3">💰 ビジネス指標（自動計算）</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="text-center">
                <p className="text-xs text-gray-400">月間売上試算</p>
                <p className="text-lg font-bold text-green-400">{formatYen(monthlyRevenue)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">月間利益試算</p>
                <p className={`text-lg font-bold ${monthlyProfit >= 0 ? "text-blue-400" : "text-red-400"}`}>
                  {formatYen(monthlyProfit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">利益率</p>
                <p className="text-lg font-bold text-yellow-400">{profitMargin}%</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-gray-400">実現可能性</p>
                <p className="text-lg font-bold text-purple-400">{spadeCard?.feasibilityScore ?? 0}/10</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===== 右側：企画書入力フォーム ===== */}
        <div>
          <h2 className="text-base font-bold mb-3 text-gray-300">✍️ ビジネスプランを入力</h2>

          <div className="space-y-4">
            {/* ソリューション名 */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                💡 ソリューション名 <span className="text-red-400">*</span>
              </label>
              <input
                value={solutionName}
                onChange={(e) => { setSolutionName(e.target.value); setError(""); }}
                placeholder="例) LogiSmart - AI配送最適化プラットフォーム"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* ユーザーベネフィット */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                👥 利用者ベネフィットの追求 <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">このサービスで利用者は何が嬉しくなる？どんな課題が解決する？</p>
              <textarea
                value={userBenefit}
                onChange={(e) => { setUserBenefit(e.target.value); setError(""); }}
                placeholder="例) 配送ドライバーは最適なルートをAIが自動提案することで、残業が月30時間削減。EC事業者は再配達率が50%改善し、顧客満足度が向上する。"
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* 自社の強みと差異化 */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                ⚡ 自社の強みと他社との差異化 <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">競合他社（ヤマト、佐川など）と何が違う？なぜ勝てる？</p>
              <textarea
                value={advantage}
                onChange={(e) => { setAdvantage(e.target.value); setError(""); }}
                placeholder="例) 既存の配送管理システムはルート最適化のみだが、本サービスは気象・交通・ドライバーの疲労度まで考慮したリアルタイムAI分析で差別化する。"
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* ビジネスプランの修正・補足 */}
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                🔧 ビジネスプランの修正・補足 <span className="text-red-400">*</span>
              </label>
              <p className="text-xs text-gray-500 mb-1">自動計算の数字から変えたい点、追加したい戦略など自由に記述</p>
              <textarea
                value={planRevision}
                onChange={(e) => { setPlanRevision(e.target.value); setError(""); }}
                placeholder="例) 初年度は大手物流会社とレベニューシェア契約で固定費を0にする。初期は無料トライアルで10社に導入し、口コミで拡大する。"
                rows={4}
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
              />
            </div>

            {/* エラー表示 */}
            {error && (
              <div className="bg-red-900/50 border border-red-500 rounded-xl px-4 py-3 text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              onClick={handleSubmit}
              disabled={loading}
              className={`w-full py-4 rounded-xl text-lg font-bold transition-all ${
                loading
                  ? "bg-gray-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 shadow-lg shadow-purple-900/50"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">⏳</span>
                  AIが企画書を生成・評価中...（30秒ほどお待ちください）
                </span>
              ) : (
                "🤖 Claudeに企画書を生成・評価してもらう！"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
