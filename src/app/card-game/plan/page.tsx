"use client";

/**
 * /card-game/plan - 企画書作成ページ
 * 選択したカードの情報を表示しながら、ビジネスプランの詳細を入力する
 * 5年間財務プロジェクション（編集可能）を含む
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CardData } from "@/components/card-game/PlayingCard";

// ============================================================
// 型定義
// ============================================================

/** 1年分の入力パラメータ（ユーザーが編集可能） */
interface YearParam {
  year: number;           // 年次（1〜5）
  monthlySales: number;   // 月間販売数（件）
  unitPrice: number;      // 販売単価（円）
  variableCostPerUnit: number; // 変動費/件（円）
}

/** 1年分の計算結果（入力パラメータ + 自動計算） */
interface YearResult extends YearParam {
  annualRevenue: number;  // 年間売上 = monthlySales × unitPrice × 12
  annualCost: number;     // 年間変動費 = monthlySales × variableCostPerUnit × 12
  annualProfit: number;   // 年間利益 = annualRevenue - annualCost
  profitMargin: number;   // 利益率（%）
}

// ============================================================
// ヘルパー関数
// ============================================================

/** 数値を見やすい日本語形式に変換 */
function formatYen(num: number): string {
  const abs = Math.abs(num);
  const sign = num < 0 ? "-" : "";
  if (abs >= 100000000) return `${sign}${(abs / 100000000).toFixed(1)}億円`;
  if (abs >= 10000) return `${sign}${(abs / 10000).toFixed(0)}万円`;
  return `${sign}${abs.toLocaleString()}円`;
}

/** 1年分のYearParamから計算結果を返す */
function calcYear(p: YearParam): YearResult {
  const annualRevenue = p.monthlySales * p.unitPrice * 12;
  const annualCost = p.monthlySales * p.variableCostPerUnit * 12;
  const annualProfit = annualRevenue - annualCost;
  const profitMargin = annualRevenue > 0
    ? Math.round((annualProfit / annualRevenue) * 100)
    : 0;
  return { ...p, annualRevenue, annualCost, annualProfit, profitMargin };
}

/** 5年間の合計YearResultを計算 */
function calcTotal(rows: YearResult[]): Omit<YearResult, "year" | "monthlySales" | "unitPrice" | "variableCostPerUnit"> {
  const annualRevenue = rows.reduce((s, r) => s + r.annualRevenue, 0);
  const annualCost = rows.reduce((s, r) => s + r.annualCost, 0);
  const annualProfit = annualRevenue - annualCost;
  const profitMargin = annualRevenue > 0
    ? Math.round((annualProfit / annualRevenue) * 100)
    : 0;
  return { annualRevenue, annualCost, annualProfit, profitMargin };
}

// ============================================================
// メインコンポーネント
// ============================================================

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

  // 5年間プロジェクション（編集可能パラメータ）
  const [projectionParams, setProjectionParams] = useState<YearParam[]>([]);
  // 一括成長率（%）
  const [growthRate, setGrowthRate] = useState(20);

  // ページ読み込み時にlocalStorageからデータ復元
  useEffect(() => {
    const savedTeam = localStorage.getItem("cardGame_teamName") ?? "";
    const savedMembers = localStorage.getItem("cardGame_members") ?? "";
    const savedCards = localStorage.getItem("cardGame_selectedCards");

    setTeamName(savedTeam);
    setMembers(savedMembers);

    if (savedCards) {
      try {
        const cards = JSON.parse(savedCards);
        setSelectedCards(cards);
      } catch {
        // パース失敗時は選択画面に戻す
        router.push("/card-game/select");
      }
    } else {
      // カードが選択されていなければ選択画面へ
      router.push("/card-game/select");
    }
  }, [router]);

  // カードデータが揃ったら5年プロジェクションの初期値を設定
  useEffect(() => {
    const heartCard = selectedCards["♥️ハート"];
    const diamondCard = selectedCards["♦️ダイヤ"];
    const clubCard = selectedCards["♣️クラブ"];

    if (!heartCard || !diamondCard || !clubCard) return;
    if (projectionParams.length > 0) return; // 既に初期化済みなら再設定しない

    // Year 1 はカードデータから、Year 2〜5 は20%成長で初期化
    const baseSales = heartCard.monthlySales || 10;
    const basePrice = diamondCard.unitPrice || 10000;
    const baseCostPerUnit = clubCard.variableCost || 1000;

    const initial: YearParam[] = Array.from({ length: 5 }, (_, i) => {
      // 複利成長率20%で初期化
      const factor = Math.pow(1.2, i);
      return {
        year: i + 1,
        monthlySales: Math.round(baseSales * factor),
        unitPrice: basePrice,
        variableCostPerUnit: baseCostPerUnit,
      };
    });
    setProjectionParams(initial);
  }, [selectedCards, projectionParams.length]);

  // 選択カードのヘルパー
  const heartCard = selectedCards["♥️ハート"];
  const diamondCard = selectedCards["♦️ダイヤ"];
  const clubCard = selectedCards["♣️クラブ"];
  const spadeCard = selectedCards["♠️スペード"];

  // 月次指標（現在月の計算 - バグ修正済み）
  // ❌ 旧: monthlyProfit = monthlyRevenue - variableCost（固定費として扱っていた）
  // ✅ 新: monthlyProfit = monthlyRevenue - variableCostPerUnit × monthlySales
  const monthlySales = heartCard?.monthlySales ?? 0;
  const unitPrice = diamondCard?.unitPrice ?? 0;
  const variableCostPerUnit = clubCard?.variableCost ?? 0;
  const monthlyRevenue = monthlySales * unitPrice;
  const monthlyCost = variableCostPerUnit * monthlySales; // 変動費 × 販売数（修正済み）
  const monthlyProfit = monthlyRevenue - monthlyCost;
  const profitMargin = monthlyRevenue > 0
    ? Math.round((monthlyProfit / monthlyRevenue) * 100)
    : 0;

  // プロジェクション計算結果（入力が変わるたびに自動再計算）
  const projectionResults: YearResult[] = projectionParams.map(calcYear);
  const total = projectionResults.length > 0 ? calcTotal(projectionResults) : null;

  // プロジェクションの1つのセルを更新するハンドラ
  const updateProjection = useCallback(
    (yearIndex: number, field: keyof Omit<YearParam, "year">, value: number) => {
      setProjectionParams((prev) =>
        prev.map((p, i) => (i === yearIndex ? { ...p, [field]: value } : p))
      );
    },
    []
  );

  // 成長率を適用して販売数を更新するハンドラ
  const applyGrowthRate = useCallback(() => {
    setProjectionParams((prev) => {
      if (prev.length === 0) return prev;
      const base = prev[0].monthlySales;
      return prev.map((p, i) => ({
        ...p,
        monthlySales: Math.round(base * Math.pow(1 + growthRate / 100, i)),
      }));
    });
  }, [growthRate]);

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
          // 5年プロジェクションデータも送信
          projection: projectionResults,
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
      localStorage.setItem("cardGame_projection", JSON.stringify(projectionResults));

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

      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ===== 上段：選択カードと入力フォーム（2カラム） ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 左側：選択カードと月次指標 */}
          <div>
            <h2 className="text-base font-bold mb-3 text-gray-300">🃏 選択したカード</h2>

            {/* カードサマリー */}
            <div className="space-y-3">
              {[
                { label: "♥️ ペルソナ", card: heartCard, color: "border-red-500/50 bg-red-950/30" },
                { label: "♦️ ミッション（課題）", card: diamondCard, color: "border-orange-500/50 bg-orange-950/30" },
                { label: "♣️ パートナー", card: clubCard, color: "border-green-500/50 bg-green-950/30" },
                { label: "♠️ ソリューション", card: spadeCard, color: "border-blue-500/50 bg-blue-950/30" },
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

            {/* 月次ビジネス指標（自動計算・バグ修正済み） */}
            <div className="mt-4 bg-gray-800 rounded-xl p-4">
              <h3 className="text-sm font-bold text-gray-300 mb-1">💰 月次ビジネス指標（カード初期値）</h3>
              <p className="text-xs text-gray-500 mb-3">変動費 = 変動費/件 × 月間販売数</p>
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

          {/* 右側：企画書入力フォーム */}
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
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* 自社の強みと差異化 */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  ⚡ 自社の強みと他社との差異化 <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">競合他社と何が違う？なぜ勝てる？</p>
                <textarea
                  value={advantage}
                  onChange={(e) => { setAdvantage(e.target.value); setError(""); }}
                  placeholder="例) 既存の配送管理システムはルート最適化のみだが、本サービスは気象・交通・ドライバーの疲労度まで考慮したリアルタイムAI分析で差別化する。"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>

              {/* ビジネスプランの修正・補足 */}
              <div>
                <label className="block text-sm font-semibold text-gray-300 mb-1">
                  🔧 ビジネスプランの修正・補足 <span className="text-red-400">*</span>
                </label>
                <p className="text-xs text-gray-500 mb-1">追加したい戦略、数字の修正方針など自由に記述</p>
                <textarea
                  value={planRevision}
                  onChange={(e) => { setPlanRevision(e.target.value); setError(""); }}
                  placeholder="例) 初年度は大手物流会社とレベニューシェア契約で固定費を0にする。初期は無料トライアルで10社に導入し、口コミで拡大する。"
                  rows={3}
                  className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        {/* ===== 下段：5年間財務プロジェクション（全幅） ===== */}
        <div className="bg-gray-900 border border-gray-700 rounded-xl p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <div>
              <h2 className="text-base font-bold text-gray-200">📊 5年間 財務プロジェクション</h2>
              <p className="text-xs text-gray-500 mt-0.5">
                青いセルは編集可能です。数値を変えると売上・利益が自動計算されます。
              </p>
            </div>
            {/* 成長率一括適用 */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">年間成長率:</span>
              <input
                type="number"
                value={growthRate}
                onChange={(e) => setGrowthRate(Number(e.target.value))}
                min={-50}
                max={200}
                className="w-16 px-2 py-1 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm text-center focus:border-blue-500 focus:outline-none"
              />
              <span className="text-sm text-gray-400">%</span>
              <button
                onClick={applyGrowthRate}
                className="px-3 py-1 bg-blue-700 hover:bg-blue-600 rounded-lg text-sm text-white transition-colors"
              >
                販売数に適用
              </button>
            </div>
          </div>

          {/* プロジェクションテーブル */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left py-2 pr-3 text-gray-400 font-medium whitespace-nowrap">年次</th>
                  {/* 編集可能列 */}
                  <th className="text-right py-2 px-2 text-blue-400 font-medium whitespace-nowrap">
                    月間販売数<br /><span className="text-xs font-normal">(件/月)</span>
                  </th>
                  <th className="text-right py-2 px-2 text-blue-400 font-medium whitespace-nowrap">
                    販売単価<br /><span className="text-xs font-normal">(円)</span>
                  </th>
                  <th className="text-right py-2 px-2 text-blue-400 font-medium whitespace-nowrap">
                    変動費/件<br /><span className="text-xs font-normal">(円)</span>
                  </th>
                  {/* 自動計算列 */}
                  <th className="text-right py-2 px-2 text-green-400 font-medium whitespace-nowrap">
                    年間売上
                  </th>
                  <th className="text-right py-2 px-2 text-orange-400 font-medium whitespace-nowrap">
                    年間変動費
                  </th>
                  <th className="text-right py-2 px-2 text-cyan-400 font-medium whitespace-nowrap">
                    年間利益
                  </th>
                  <th className="text-right py-2 pl-2 text-yellow-400 font-medium whitespace-nowrap">
                    利益率
                  </th>
                </tr>
              </thead>
              <tbody>
                {projectionResults.map((row, i) => (
                  <tr key={row.year} className="border-b border-gray-800 hover:bg-gray-800/30">
                    <td className="py-2 pr-3 font-semibold text-gray-300 whitespace-nowrap">
                      {row.year}年目
                    </td>

                    {/* 編集可能：月間販売数 */}
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        value={projectionParams[i]?.monthlySales ?? 0}
                        onChange={(e) => updateProjection(i, "monthlySales", Number(e.target.value))}
                        min={0}
                        className="w-20 px-2 py-1 bg-blue-950/40 border border-blue-700/50 rounded-lg text-white text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </td>

                    {/* 編集可能：販売単価 */}
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        value={projectionParams[i]?.unitPrice ?? 0}
                        onChange={(e) => updateProjection(i, "unitPrice", Number(e.target.value))}
                        min={0}
                        className="w-24 px-2 py-1 bg-blue-950/40 border border-blue-700/50 rounded-lg text-white text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </td>

                    {/* 編集可能：変動費/件 */}
                    <td className="py-1 px-2">
                      <input
                        type="number"
                        value={projectionParams[i]?.variableCostPerUnit ?? 0}
                        onChange={(e) => updateProjection(i, "variableCostPerUnit", Number(e.target.value))}
                        min={0}
                        className="w-24 px-2 py-1 bg-blue-950/40 border border-blue-700/50 rounded-lg text-white text-right text-sm focus:border-blue-400 focus:outline-none"
                      />
                    </td>

                    {/* 自動計算：年間売上 */}
                    <td className="py-2 px-2 text-right text-green-400 font-medium whitespace-nowrap">
                      {formatYen(row.annualRevenue)}
                    </td>

                    {/* 自動計算：年間変動費 */}
                    <td className="py-2 px-2 text-right text-orange-400 whitespace-nowrap">
                      {formatYen(row.annualCost)}
                    </td>

                    {/* 自動計算：年間利益 */}
                    <td className={`py-2 px-2 text-right font-medium whitespace-nowrap ${row.annualProfit >= 0 ? "text-cyan-400" : "text-red-400"}`}>
                      {formatYen(row.annualProfit)}
                    </td>

                    {/* 自動計算：利益率 */}
                    <td className={`py-2 pl-2 text-right font-medium whitespace-nowrap ${row.profitMargin >= 30 ? "text-yellow-400" : row.profitMargin >= 0 ? "text-gray-300" : "text-red-400"}`}>
                      {row.profitMargin}%
                    </td>
                  </tr>
                ))}

                {/* 5年合計行 */}
                {total && (
                  <tr className="border-t-2 border-gray-600 bg-gray-800/50">
                    <td className="py-2 pr-3 font-bold text-white whitespace-nowrap" colSpan={4}>
                      📌 5年間 合計
                    </td>
                    <td className="py-2 px-2 text-right text-green-300 font-bold whitespace-nowrap">
                      {formatYen(total.annualRevenue)}
                    </td>
                    <td className="py-2 px-2 text-right text-orange-300 font-bold whitespace-nowrap">
                      {formatYen(total.annualCost)}
                    </td>
                    <td className={`py-2 px-2 text-right font-bold whitespace-nowrap ${total.annualProfit >= 0 ? "text-cyan-300" : "text-red-400"}`}>
                      {formatYen(total.annualProfit)}
                    </td>
                    <td className={`py-2 pl-2 text-right font-bold whitespace-nowrap ${total.profitMargin >= 30 ? "text-yellow-300" : "text-gray-300"}`}>
                      {total.profitMargin}%
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 計算式の説明 */}
          <div className="mt-3 text-xs text-gray-500 space-y-0.5">
            <p>計算式: 年間売上 = 月間販売数 × 販売単価 × 12ヶ月</p>
            <p>　　　　年間変動費 = 月間販売数 × 変動費/件 × 12ヶ月　（変動費バグ修正済み）</p>
          </div>
        </div>

        {/* ===== エラー表示 ===== */}
        {error && (
          <div className="bg-red-900/50 border border-red-500 rounded-xl px-4 py-3 text-red-200 text-sm">
            ⚠️ {error}
          </div>
        )}

        {/* ===== 送信ボタン ===== */}
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
  );
}
