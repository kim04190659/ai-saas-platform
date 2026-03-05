/**
 * /card-game/result
 * Make or Buy ゲーム v3 — 結果表示ページ
 *
 * localStorage の "logi_selectedCards" を読み込み、
 * クライアントサイドでMake or Buy計算を行い結果を表示する。
 * （v2以前のAI評価はなし）
 *
 * ── 計算ロジック ──
 * 1. 課題カードのランクからグレード（S/A/B/C/D）を決定
 * 2. グレードから販売単価を決定
 * 3. ペルソナカードの月間販売見込数を合算して月間販売数を決定
 * 4. Buyカード（パートナー）のグレードから変動費率の追加分を合算
 *    変動費率 = 5%（基準） + Buy追加分
 * 5. Makeカード（ジョブタイプ）のグレードから初期費用を合算
 * 6. 月次損益・回収月数・利益率を計算してランクS/A/B/C/Dを判定
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ─── 型定義 ────────────────────────────────────────────

type Card = {
  id: string;
  cardName: string;
  suit: string;
  rank: string;
  role: string;
  theme: string;
  title: string;
  description: string;
  flavorText: string;
  marketSize: number;
  monthlyVolume: number;
  unitPrice: number;
  variableCost: number;
  feasibilityScore: number;
  businessFunctions: string[];
  targetPersonas: string[];
};

type SelectedCards = {
  kuraiCard: Card;       // 課題カード（1枚）
  personaCards: Card[];  // ペルソナカード（複数）
  partnerCards: Card[];  // パートナーカード（Buy、複数）
  makeCards: Card[];     // アクションカード（Make、自動決定）
};

// ─── 計算定数 ──────────────────────────────────────────

// グレード別 販売単価（円/件）
// 課題カードのグレードで決まる（高ランクほど高単価）
const UNIT_PRICE_BY_GRADE: Record<string, number> = {
  S: 50_000,  // Sランク課題 = 高付加価値サービス
  A: 30_000,
  B: 15_000,
  C:  8_000,
  D:  3_000,
};

// グレード別 ペルソナ市場規模（人/月）
// ペルソナカードのランクで決まる（高ランクほど市場が大きい）
// 設計書: S=10,000, A=5,000, B=2,000, C=1,000, D=500 人/月
const MARKET_SIZE_BY_GRADE: Record<string, number> = {
  S: 10_000,
  A:  5_000,
  B:  2_000,
  C:  1_000,
  D:    500,
};

// 転換率（固定70%）
// 市場規模のうち実際に購買に至る割合
const CONVERSION_RATE = 0.7;

// グレード別 変動費率追加分（%）
// Buyカード（パートナー）ごとに加算される（委託コスト）
const VAR_COST_ADD_BY_GRADE: Record<string, number> = {
  S:  8,  // 高グレードパートナーは委託コストが高い
  A: 10,
  B: 12,
  C: 13,
  D: 15,
};

// グレード別 初期費用（円）
// Makeカード（ジョブタイプ）ごとに加算される（自社開発コスト）
const INITIAL_COST_BY_GRADE: Record<string, number> = {
  S: 5_000_000,  // 高グレードのMake = 高度なシステム開発
  A: 2_000_000,
  B: 1_000_000,
  C:   500_000,
  D:   100_000,
};

// 基準変動費率（%）：パートナーなしの場合の最低コスト
const BASE_VAR_COST_RATE = 5;

// ─── ヘルパー関数 ───────────────────────────────────────

/**
 * カードのランク（A, 2〜K）をゲームグレード（S/A/B/C/D）に変換
 */
function rankToGrade(rank: string): "S" | "A" | "B" | "C" | "D" {
  if (rank === "A") return "S";
  if (rank === "K" || rank === "Q") return "A";
  if (rank === "J" || rank === "10" || rank === "9") return "B";
  if (rank === "8" || rank === "7" || rank === "6" || rank === "5") return "C";
  return "D"; // 4, 3, 2
}

/**
 * 数値を日本円形式でフォーマット（例: 1,234,567 → "1,234,567円"）
 */
function formatYen(amount: number): string {
  return `${Math.round(amount).toLocaleString("ja-JP")} 円`;
}

/**
 * 万円単位でフォーマット（例: 5000000 → "500万円"）
 */
function formatManYen(amount: number): string {
  const man = Math.round(amount / 10_000);
  if (man >= 10_000) {
    return `${(man / 10_000).toFixed(1)}億円`;
  }
  return `${man.toLocaleString("ja-JP")}万円`;
}

/**
 * Make or Buy 総合評価を計算するメイン関数
 */
function calcMakeOrBuy(selected: SelectedCards) {
  const { kuraiCard, personaCards, partnerCards, makeCards } = selected;

  // ── 1. 課題グレード → 販売単価 ──
  const kuraiGrade = rankToGrade(kuraiCard.rank);
  const unitPrice = UNIT_PRICE_BY_GRADE[kuraiGrade] ?? 8_000;

  // ── 2. 月間販売数（ペルソナのランク別市場規模 × 転換率70%） ──
  // 設計書の計算式: 月間販売数 = ペルソナ市場規模合計 × 転換率（70%固定）
  // ペルソナカードのランクから市場規模（人/月）を決定し、合算する
  const monthlyVolumeBase = personaCards.reduce((sum, c) => {
    const g = rankToGrade(c.rank);
    return sum + (MARKET_SIZE_BY_GRADE[g] ?? 1_000);
  }, 0);
  // 70%の転換率をかけて実際の月間販売数を算出
  const monthlyVolume = Math.round(monthlyVolumeBase * CONVERSION_RATE);

  // ── 3. 月次売上 ──
  const monthlySales = unitPrice * monthlyVolume;

  // ── 4. 変動費率（5% + パートナーBuyカードのグレード別追加分） ──
  const varCostAddTotal = partnerCards.reduce((sum, c) => {
    const g = rankToGrade(c.rank);
    return sum + (VAR_COST_ADD_BY_GRADE[g] ?? 12);
  }, 0);
  const varCostRate = BASE_VAR_COST_RATE + varCostAddTotal; // %

  // ── 5. 月次変動費・月次粗利 ──
  const monthlyVarCost = monthlySales * (varCostRate / 100);
  const monthlyProfit = monthlySales - monthlyVarCost;

  // ── 6. 初期費用（Makeカードのグレード別合計） ──
  const initialCost = makeCards.reduce((sum, c) => {
    const g = rankToGrade(c.rank);
    return sum + (INITIAL_COST_BY_GRADE[g] ?? 500_000);
  }, 0);

  // ── 7. 回収月数・利益率 ──
  // 月次利益がゼロ以下の場合は回収不能（Infinity）
  const recoveryMonths =
    monthlyProfit > 0 ? initialCost / monthlyProfit : Infinity;

  // 粗利率（%）
  const profitRate = monthlySales > 0 ? (monthlyProfit / monthlySales) * 100 : 0;

  // ── 8. 総合ランク判定 ──
  // S: 回収3ヶ月未満 かつ 利益率50%以上
  // A: 回収6ヶ月未満 かつ 利益率40%以上
  // B: 回収12ヶ月未満 かつ 利益率30%以上
  // C: 回収24ヶ月未満（赤字でない）
  // D: 赤字 または 回収24ヶ月以上
  let finalGrade: "S" | "A" | "B" | "C" | "D";
  if (recoveryMonths < 3 && profitRate >= 50) {
    finalGrade = "S";
  } else if (recoveryMonths < 6 && profitRate >= 40) {
    finalGrade = "A";
  } else if (recoveryMonths < 12 && profitRate >= 30) {
    finalGrade = "B";
  } else if (monthlyProfit > 0 && recoveryMonths < 24) {
    finalGrade = "C";
  } else {
    finalGrade = "D";
  }

  return {
    kuraiGrade,
    unitPrice,
    monthlyVolumeBase, // 変換前の市場規模合計（人/月）
    monthlyVolume,     // 実際の月間販売数（件/月） = base × 70%
    monthlySales,
    varCostRate,
    monthlyVarCost,
    monthlyProfit,
    initialCost,
    recoveryMonths,
    profitRate,
    finalGrade,
  };
}

// ─── グレード別 表示設定 ────────────────────────────────

const GRADE_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; emoji: string; comment: string }
> = {
  S: {
    label: "S ランク",
    color: "text-yellow-400",
    bgColor: "bg-yellow-400",
    emoji: "🏆",
    comment: "超優秀！素早い回収と高い利益率を両立した最高の事業計画です。",
  },
  A: {
    label: "A ランク",
    color: "text-orange-400",
    bgColor: "bg-orange-400",
    emoji: "⭐",
    comment: "優秀！半年以内の回収と高い収益性が見込める優良事業計画です。",
  },
  B: {
    label: "B ランク",
    color: "text-blue-400",
    bgColor: "bg-blue-400",
    emoji: "👍",
    comment: "良好。1年以内に回収でき、安定した利益が期待できる事業計画です。",
  },
  C: {
    label: "C ランク",
    color: "text-green-400",
    bgColor: "bg-green-500",
    emoji: "📈",
    comment: "可能性あり。2年以内の回収が見込めます。コスト見直しで改善を狙えます。",
  },
  D: {
    label: "D ランク",
    color: "text-gray-400",
    bgColor: "bg-gray-500",
    emoji: "⚠️",
    comment: "要改善。赤字または回収に2年以上かかります。カード選択を見直しましょう。",
  },
};

// ─── メインコンポーネント ───────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedCards | null>(null);
  const [error, setError] = useState<string | null>(null);

  // localStorage からカード選択結果を読み込む
  useEffect(() => {
    try {
      const raw = localStorage.getItem("logi_selectedCards");
      if (!raw) {
        setError("カード選択データが見つかりません。最初からやり直してください。");
        return;
      }
      const data: SelectedCards = JSON.parse(raw);
      // 必須データのチェック
      if (!data.kuraiCard || !data.personaCards || !data.partnerCards) {
        setError("カードデータが不完全です。最初からやり直してください。");
        return;
      }
      setSelected(data);
    } catch {
      setError("データの読み込みに失敗しました。最初からやり直してください。");
    }
  }, []);

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-8">
        <div className="text-4xl mb-4">😵</div>
        <p className="text-red-400 text-center mb-6">{error}</p>
        <button
          onClick={() => router.push("/card-game/select")}
          className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-black font-bold rounded-xl"
        >
          カード選択に戻る
        </button>
      </div>
    );
  }

  // ローディング（localStorageの読み込みが終わるまで）
  if (!selected) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // ── 計算実行 ──
  const calc = calcMakeOrBuy(selected);
  const gradeConfig = GRADE_CONFIG[calc.finalGrade];

  // ── 各カードのグレード ──
  const kuraiGrade = rankToGrade(selected.kuraiCard.rank);

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-12">
      {/* ヘッダー */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <h1 className="text-xl font-bold text-center text-cyan-400">
          🏭 Mission in LOGI-TECH
        </h1>
        <p className="text-center text-slate-400 text-sm mt-1">
          Make or Buy 評価結果
        </p>
      </div>

      <div className="p-4 space-y-4">

        {/* ════ 総合ランク ════ */}
        <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 text-center">
          <div className="text-6xl mb-3">{gradeConfig.emoji}</div>
          <div
            className={`text-5xl font-black mb-2 ${gradeConfig.color}`}
          >
            {gradeConfig.label}
          </div>
          <p className="text-slate-300 text-sm leading-relaxed mt-3">
            {gradeConfig.comment}
          </p>
        </div>

        {/* ════ 月次損益サマリー ════ */}
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            📊 月次損益サマリー
          </h2>

          <div className="space-y-2">
            {/* 市場規模（内訳を表示） */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                ペルソナ市場規模（合計）
              </span>
              <span className="text-white font-semibold">
                {calc.monthlyVolumeBase.toLocaleString()} 人/月
              </span>
            </div>

            {/* 転換率 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                　× 転換率（70%）
              </span>
              <span className="text-white font-semibold">
                = {calc.monthlyVolume.toLocaleString()} 件/月
              </span>
            </div>

            {/* 販売単価 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                販売単価（課題グレード {kuraiGrade}）
              </span>
              <span className="text-white font-semibold">
                {formatYen(calc.unitPrice)}/件
              </span>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-slate-700 my-2" />

            {/* 月次売上 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">月次売上</span>
              <span className="text-cyan-400 font-bold text-lg">
                {formatManYen(calc.monthlySales)}
              </span>
            </div>

            {/* 変動費率 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                変動費率（基準5% + Buy追加 {calc.varCostRate - BASE_VAR_COST_RATE}%）
              </span>
              <span className="text-red-400 font-semibold">
                {calc.varCostRate.toFixed(0)}%
              </span>
            </div>

            {/* 月次変動費 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">月次変動費</span>
              <span className="text-red-400 font-semibold">
                − {formatManYen(calc.monthlyVarCost)}
              </span>
            </div>

            {/* 区切り線 */}
            <div className="border-t border-slate-700 my-2" />

            {/* 月次粗利 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm font-semibold">月次粗利</span>
              <span
                className={`font-bold text-xl ${
                  calc.monthlyProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {calc.monthlyProfit >= 0 ? "" : "▲ "}
                {formatManYen(Math.abs(calc.monthlyProfit))}
              </span>
            </div>

            {/* 粗利率 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">粗利率</span>
              <span
                className={`font-semibold ${
                  calc.profitRate >= 40
                    ? "text-green-400"
                    : calc.profitRate >= 20
                    ? "text-yellow-400"
                    : "text-red-400"
                }`}
              >
                {calc.profitRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* ════ Make / Buy コスト内訳 ════ */}
        <div className="grid grid-cols-2 gap-3">
          {/* Make（自社開発）コスト */}
          <div className="bg-slate-800 rounded-xl border border-blue-800 p-4">
            <div className="text-xs font-bold text-blue-400 mb-2 uppercase">
              🔨 Make（自社開発）
            </div>
            <div className="text-white font-bold text-lg">
              {formatManYen(calc.initialCost)}
            </div>
            <div className="text-slate-500 text-xs mt-1">初期開発費用</div>
            {selected.makeCards.length > 0 ? (
              <div className="mt-2 space-y-1">
                {selected.makeCards.map((c) => {
                  const g = rankToGrade(c.rank);
                  return (
                    <div key={c.id} className="text-xs text-slate-400">
                      {c.title} ({g}):{" "}
                      {formatManYen(INITIAL_COST_BY_GRADE[g] ?? 500_000)}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-xs text-green-400">
                Makeなし（コストゼロ）
              </div>
            )}
          </div>

          {/* Buy（外部委託）コスト */}
          <div className="bg-slate-800 rounded-xl border border-orange-800 p-4">
            <div className="text-xs font-bold text-orange-400 mb-2 uppercase">
              🤝 Buy（外部委託）
            </div>
            <div className="text-white font-bold text-lg">
              +{(calc.varCostRate - BASE_VAR_COST_RATE).toFixed(0)}%
            </div>
            <div className="text-slate-500 text-xs mt-1">変動費率追加分</div>
            {selected.partnerCards.length > 0 ? (
              <div className="mt-2 space-y-1">
                {selected.partnerCards.map((c) => {
                  const g = rankToGrade(c.rank);
                  return (
                    <div key={c.id} className="text-xs text-slate-400">
                      {c.title} ({g}): +{VAR_COST_ADD_BY_GRADE[g] ?? 12}%
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="mt-2 text-xs text-green-400">
                Buyなし（追加コストゼロ）
              </div>
            )}
          </div>
        </div>

        {/* ════ 投資回収分析 ════ */}
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            💰 投資回収分析
          </h2>

          <div className="space-y-3">
            {/* 初期投資額 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">初期投資額（Make合計）</span>
              <span className="text-white font-semibold">
                {formatManYen(calc.initialCost)}
              </span>
            </div>

            {/* 月次粗利 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">月次粗利（回収原資）</span>
              <span
                className={`font-semibold ${
                  calc.monthlyProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatManYen(calc.monthlyProfit)}/月
              </span>
            </div>

            {/* 回収月数 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-300 text-sm font-semibold">
                投資回収期間
              </span>
              <span
                className={`font-bold text-xl ${
                  calc.recoveryMonths === Infinity
                    ? "text-red-400"
                    : calc.recoveryMonths < 6
                    ? "text-green-400"
                    : calc.recoveryMonths < 12
                    ? "text-yellow-400"
                    : "text-orange-400"
                }`}
              >
                {calc.recoveryMonths === Infinity
                  ? "回収不能"
                  : calc.recoveryMonths < 1
                  ? "1ヶ月未満"
                  : `約 ${Math.ceil(calc.recoveryMonths)} ヶ月`}
              </span>
            </div>

            {/* 年間換算粗利（初期投資がある場合のみ表示） */}
            {calc.initialCost > 0 && calc.monthlyProfit > 0 && (
              <div className="flex justify-between items-center text-slate-500 text-xs">
                <span>年間粗利（回収後）</span>
                <span>{formatManYen(calc.monthlyProfit * 12)}/年</span>
              </div>
            )}
          </div>

          {/* 回収のビジュアル（初期投資あり かつ 回収可能の場合） */}
          {calc.initialCost > 0 && calc.recoveryMonths !== Infinity && (
            <div className="mt-4">
              <div className="text-xs text-slate-500 mb-1">回収進捗（24ヶ月）</div>
              <div className="w-full bg-slate-700 rounded-full h-3 overflow-hidden">
                <div
                  className="h-3 rounded-full bg-gradient-to-r from-cyan-500 to-green-400 transition-all"
                  style={{
                    width: `${Math.min(
                      (Math.ceil(calc.recoveryMonths) / 24) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-1 text-right">
                {Math.ceil(calc.recoveryMonths)} / 24 ヶ月
              </div>
            </div>
          )}
        </div>

        {/* ════ 選択カードサマリー ════ */}
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            🃏 選択カードまとめ
          </h2>

          <div className="space-y-3">
            {/* 課題カード */}
            <CardSummaryRow
              label="♦ 課題"
              cards={[selected.kuraiCard]}
              color="text-red-300"
            />

            {/* ペルソナカード */}
            <CardSummaryRow
              label="♥ ペルソナ"
              cards={selected.personaCards}
              color="text-pink-300"
            />

            {/* パートナーカード（Buy） */}
            <CardSummaryRow
              label="♣ パートナー（Buy）"
              cards={selected.partnerCards}
              color="text-green-300"
              emptyLabel="なし（全部Make）"
            />

            {/* Makeカード */}
            <CardSummaryRow
              label="♠ アクション（Make）"
              cards={selected.makeCards}
              color="text-blue-300"
              emptyLabel="なし（全部Buy）"
            />
          </div>
        </div>

        {/* ════ アクションボタン ════ */}
        <div className="space-y-3 pt-2">
          {/* もう一度プレイ */}
          <button
            onClick={() => {
              localStorage.removeItem("logi_selectedCards");
              router.push("/card-game/select");
            }}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-base transition-all duration-200"
          >
            🔄 もう一度プレイ
          </button>

          {/* カード選択に戻る（やり直し） */}
          <button
            onClick={() => router.push("/card-game/select")}
            className="w-full py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
          >
            ← カード選択に戻る
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── サブコンポーネント ─────────────────────────────────

/**
 * カードサマリー行（カード名のリストを表示）
 */
function CardSummaryRow({
  label,
  cards,
  color,
  emptyLabel = "なし",
}: {
  label: string;
  cards: Card[];
  color: string;
  emptyLabel?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-xs font-semibold whitespace-nowrap mt-0.5 ${color}`}>
        {label}
      </span>
      <div className="flex-1">
        {cards.length === 0 ? (
          <span className="text-slate-500 text-xs">{emptyLabel}</span>
        ) : (
          <div className="flex flex-wrap gap-1">
            {cards.map((c) => {
              const g = rankToGrade(c.rank);
              return (
                <span
                  key={c.id}
                  className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded"
                >
                  {c.title}
                  <span className="ml-1 text-slate-500">({g})</span>
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
