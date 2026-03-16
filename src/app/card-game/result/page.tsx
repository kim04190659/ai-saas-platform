/**
 * /card-game/result
 * Mission in LOGI-TECH — 結果表示ページ（v4.2）
 *
 * localStorage の "logi_selectedCards_v42" を読み込み、
 * v4.2の財務計算を行い結果を表示する。
 * Claude AIによるビジネスプラン評価も行う。
 *
 * ── v4.2 計算ロジック ──
 * 1. 事業成功率 = 5% + Σパートナー成功率貢献 + Σジョブ成功率貢献（上限70%）
 * 2. 市場規模（社）= Σペルソナの潜在顧客数
 * 3. 年間売上 = 単価（万円）× 市場規模（社）× 事業成功率
 * 4. 年間コスト = 年間売上 × (30% + Σパートナーコスト変動比率)
 * 5. 初期費 = Σジョブタイプ初期投資（万円）
 * 6. 3年間累計利益 = (年間売上 - 年間コスト) × 3 - 初期費
 *
 * ── ランク判定 ──
 * S: 2億円以上（20,000万円以上）
 * A: 1億円以上（10,000万円以上）
 * B: 5,000万円以上
 * C: 黒字（0円以上）
 * D: 赤字（0円未満）
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

// ─── 型定義 ────────────────────────────────────────────

// v4.2 カードの型
type Card = {
  id: string;
  cardName: string;
  suit: string;
  rank: string;
  role: string;
  baseValue: number;
  title: string;
  description: string;
  unitPrice: number;
  potentialCustomers: number;
  costVarianceRate: number;
  successContribution: number;
  initialInvestment: number;
};

// localStorage に保存された選択結果の型
type SelectedCards = {
  problemCard: Card;      // ♦️課題カード（1枚）
  personaCards: Card[];   // ♥️ペルソナカード（複数）
  partnerCards: Card[];   // ♣️パートナーカード（複数）
  jobCards: Card[];       // ♠️ジョブタイプカード（複数）
};

// v4.2 計算結果の型
type CalcResult = {
  successRate: number;     // 事業成功率（%）
  marketSize: number;      // 市場規模（社）
  annualRevenue: number;   // 年間売上（万円）
  totalCostRate: number;   // コスト変動比率合計（%）
  annualCost: number;      // 年間コスト（万円）
  annualProfit: number;    // 年間利益（万円）
  initialCost: number;     // 初期費（万円）
  profit3years: number;    // 3年間累計利益（万円）
  grade: "S" | "A" | "B" | "C" | "D"; // ランク
};

// ─── エネルギー自立ゲーム 維持日数計算 ────────────────

/**
 * エネルギー自立シミュレーション用カードの型
 */
type EnergyCard = {
  cardId: string;
  cardName: string;
  suit: string;
  cardNumber: string;
  baseValue?: number;        // ♦カード：基礎貢献値
  riskFlag?: boolean;        // ♦カード：リスクフラグ
  riskPenalty?: number;      // ♦カード：リスクペナルティ
  skillBonus?: number;       // ♥カード：スキルボーナス
  compatibleDiamond?: string[]; // ♥カード：相性のある♦カード番号リスト
  penaltyLevel?: "軽" | "中" | "重"; // ♠カード：危機レベル
  crisisPenalty?: number;    // ♠カード：危機ペナルティ（負の値）
  actionBonus?: number;      // ♣カード：アクションボーナス
};

/**
 * 維持日数の計算結果型
 */
type EnergyCalcResult = {
  diamondBaseTotal: number;  // ♦基礎貢献値合計
  heartSkillBonus: number;   // ♥スキルボーナス合計
  spadePenalty: number;      // ♠危機ペナルティ合計（負の値）
  riskPenalty: number;       // ♦リスクペナルティ合計（負の値）
  maintenanceDays: number;   // 維持日数（最低保証3日）
};

/**
 * エネルギー自立シミュレーション用維持日数計算
 *
 * 維持日数 = ♦基礎貢献値
 *          + ♥スキルボーナス（compatibleDiamond一致なら+5、不一致なら0）
 *          - ♠危機ペナルティ（軽:0・中:-3・重:-7）
 *          - ♦リスクペナルティ（riskFlag:trueのカードで-3）
 *
 * 最低保証：3日（計算結果が3日未満の場合は3日とする）
 */
function calcEnergyMaintenanceDays(
  diamondCards: EnergyCard[],
  heartCards: EnergyCard[],
  spadeCards: EnergyCard[],
): EnergyCalcResult {
  // ♦基礎貢献値合計
  const diamondBaseTotal = diamondCards.reduce(
    (sum, c) => sum + (c.baseValue ?? 0),
    0
  );

  // ♦リスクペナルティ合計（riskFlag:trueのカードで-3）
  const riskPenalty = diamondCards.reduce(
    (sum, c) => sum + (c.riskFlag ? -(c.riskPenalty ?? 3) : 0),
    0
  );

  // ♥スキルボーナス（選択中の♦カード番号と compatibleDiamond が一致する場合のみ+5）
  const selectedDiamondNumbers = diamondCards.map((c) => `♦${c.cardNumber}`);
  const heartSkillBonus = heartCards.reduce((sum, c) => {
    if (!c.compatibleDiamond) return sum;
    const isCompatible = c.compatibleDiamond.some((d) =>
      selectedDiamondNumbers.includes(d)
    );
    return sum + (isCompatible ? (c.skillBonus ?? 5) : 0);
  }, 0);

  // ♠危機ペナルティ合計（軽:0・中:-3・重:-7）
  const spadePenalty = spadeCards.reduce((sum, c) => {
    return sum + (c.crisisPenalty ?? 0);
  }, 0);

  // 維持日数計算（最低保証3日）
  const rawDays = diamondBaseTotal + heartSkillBonus + riskPenalty + spadePenalty;
  const maintenanceDays = Math.max(3, rawDays);

  return {
    diamondBaseTotal,
    heartSkillBonus,
    spadePenalty,
    riskPenalty,
    maintenanceDays,
  };
}

// ─── v4.2 財務計算メイン関数 ───────────────────────────

/**
 * 選択カードから v4.2 財務計算を行う
 */
function calcV42(selected: SelectedCards): CalcResult {
  const { problemCard, personaCards, partnerCards, jobCards } = selected;

  // Step 1: 事業成功率 = 5% + Σパートナー成功率貢献 + Σジョブ成功率貢献（上限70%）
  const partnerSuccessSum = partnerCards.reduce(
    (sum, c) => sum + c.successContribution,
    0
  );
  const jobSuccessSum = jobCards.reduce(
    (sum, c) => sum + c.successContribution,
    0
  );
  const successRate = Math.min(5 + partnerSuccessSum + jobSuccessSum, 70);

  // Step 2: 市場規模（社）= Σペルソナの潜在顧客数
  const marketSize = personaCards.reduce(
    (sum, c) => sum + c.potentialCustomers,
    0
  );

  // Step 3: 年間売上（万円）= 単価 × 市場規模 × 事業成功率
  const annualRevenue = problemCard.unitPrice * marketSize * (successRate / 100);

  // Step 4: 年間コスト = 年間売上 × (30%固定 + Σパートナーコスト変動比率)
  const partnerCostSum = partnerCards.reduce(
    (sum, c) => sum + c.costVarianceRate,
    0
  );
  const totalCostRate = 30 + partnerCostSum; // %
  const annualCost = annualRevenue * (totalCostRate / 100);

  // Step 5: 年間利益
  const annualProfit = annualRevenue - annualCost;

  // Step 6: 初期費（万円）= Σジョブタイプ初期投資
  const initialCost = jobCards.reduce((sum, c) => sum + c.initialInvestment, 0);

  // Step 7: 3年間累計利益（万円）
  const profit3years = annualProfit * 3 - initialCost;

  // Step 8: ランク判定
  let grade: "S" | "A" | "B" | "C" | "D";
  if (profit3years >= 20000) {
    grade = "S"; // 2億円以上
  } else if (profit3years >= 10000) {
    grade = "A"; // 1億円以上
  } else if (profit3years >= 5000) {
    grade = "B"; // 5,000万円以上
  } else if (profit3years >= 0) {
    grade = "C"; // 黒字
  } else {
    grade = "D"; // 赤字
  }

  return {
    successRate,
    marketSize,
    annualRevenue,
    totalCostRate,
    annualCost,
    annualProfit,
    initialCost,
    profit3years,
    grade,
  };
}

// ─── ヘルパー関数 ───────────────────────────────────────

/**
 * 万円単位の数値を見やすい形式でフォーマット
 * 例: 17530 → "1.8億円", -500 → "▲500万円"
 */
function formatManYen(amount: number): string {
  const abs = Math.abs(Math.round(amount));
  const sign = amount < 0 ? "▲" : "";
  if (abs >= 10000) {
    return `${sign}${(abs / 10000).toFixed(1)}億円`;
  }
  return `${sign}${abs.toLocaleString("ja-JP")}万円`;
}

// ─── グレード別 表示設定 ────────────────────────────────

const GRADE_CONFIG: Record<
  string,
  { label: string; color: string; emoji: string; comment: string }
> = {
  S: {
    label: "S ランク",
    color: "text-yellow-400",
    emoji: "⭐",
    comment:
      "卓越したビジネスプラン！3年間で2億円以上の利益。持続的な成長が期待できます。",
  },
  A: {
    label: "A ランク",
    color: "text-orange-400",
    emoji: "🥇",
    comment:
      "優秀なプラン。3年間で1〜2億円の利益。しっかり黒字を出せる戦略です。",
  },
  B: {
    label: "B ランク",
    color: "text-blue-400",
    emoji: "🥈",
    comment:
      "良いプラン。3年間で5,000万〜1億円の利益。小さいながら確実に利益を出せます。",
  },
  C: {
    label: "C ランク",
    color: "text-green-400",
    emoji: "🥉",
    comment:
      "黒字ですが薄利。もう一工夫で大きく伸ばせます。カードの組み合わせを見直しましょう。",
  },
  D: {
    label: "D ランク",
    color: "text-gray-400",
    emoji: "😰",
    comment:
      "3年以内に回収できません。戦略の見直しが必要です。高ランクカードの活用を検討してください。",
  },
};

// ─── メインコンポーネント ───────────────────────────────

export default function ResultPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<SelectedCards | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  // localStorage からカード選択結果を読み込む
  useEffect(() => {
    try {
      const raw = localStorage.getItem("logi_selectedCards_v42");
      if (!raw) {
        // 旧バージョンのデータが残っている場合の互換対応
        setError("カード選択データが見つかりません。最初からやり直してください。");
        return;
      }
      const data: SelectedCards = JSON.parse(raw);
      if (!data.problemCard || !data.personaCards) {
        setError("カードデータが不完全です。最初からやり直してください。");
        return;
      }
      setSelected(data);
    } catch {
      setError("データの読み込みに失敗しました。最初からやり直してください。");
    }
  }, []);

  // カードデータ読み込み後に AI評価を取得
  useEffect(() => {
    if (!selected) return;
    const calc = calcV42(selected);
    fetchAiEvaluation(selected, calc);
  }, [selected]);

  // AI評価APIを呼び出す関数
  async function fetchAiEvaluation(cards: SelectedCards, calc: CalcResult) {
    setAiLoading(true);
    try {
      const res = await fetch("/api/card-game/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected: cards, calcResult: calc }),
      });
      if (!res.ok) throw new Error("AI評価の取得に失敗しました");
      const data = await res.json();
      setAiEvaluation(data.evaluation ?? data.plan ?? null);
    } catch {
      // AI評価が失敗してもゲームは続行（評価欄は空のまま）
      setAiEvaluation("AI評価を取得できませんでした。");
    } finally {
      setAiLoading(false);
    }
  }

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
  const calc = calcV42(selected);
  const gradeConfig = GRADE_CONFIG[calc.grade];

  return (
    <div className="min-h-screen bg-slate-900 text-white pb-12">

      {/* ヘッダー */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <h1 className="text-xl font-bold text-center text-cyan-400">
          🏭 Mission in LOGI-TECH
        </h1>
        <p className="text-center text-slate-400 text-sm mt-1">
          ビジネスプラン評価結果 v4.2
        </p>
      </div>

      <div className="p-4 space-y-4">

        {/* ════ 総合ランク ════ */}
        <div className="bg-slate-800 rounded-2xl border border-slate-600 p-6 text-center">
          <div className="text-6xl mb-3">{gradeConfig.emoji}</div>
          <div className={`text-5xl font-black mb-2 ${gradeConfig.color}`}>
            {gradeConfig.label}
          </div>
          {/* 3年間累計利益（メインスコア） */}
          <div className="text-3xl font-bold text-white mt-3">
            {formatManYen(calc.profit3years)}
          </div>
          <div className="text-slate-400 text-sm">3年間累計利益</div>
          <p className="text-slate-300 text-sm leading-relaxed mt-3">
            {gradeConfig.comment}
          </p>
        </div>

        {/* ════ 財務計算サマリー（v4.2） ════ */}
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            📊 財務計算サマリー
          </h2>

          <div className="space-y-2">

            {/* 事業成功率 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">事業成功率</span>
              <span className="text-cyan-400 font-bold text-lg">
                {calc.successRate}%
              </span>
            </div>

            {/* 成功率の内訳 */}
            <div className="text-xs text-slate-500 ml-4 space-y-0.5">
              <div>基本: 5%</div>
              <div>
                パートナー貢献:{" "}
                +{selected.partnerCards.reduce((s, c) => s + c.successContribution, 0)}%
              </div>
              <div>
                ジョブ貢献:{" "}
                +{selected.jobCards.reduce((s, c) => s + c.successContribution, 0)}%
                {5 +
                  selected.partnerCards.reduce((s, c) => s + c.successContribution, 0) +
                  selected.jobCards.reduce((s, c) => s + c.successContribution, 0) >
                  70 && " → 上限70%に丸め"}
              </div>
            </div>

            <div className="border-t border-slate-700 my-2" />

            {/* 市場規模 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                市場規模（潜在顧客合計）
              </span>
              <span className="text-white font-semibold">
                {calc.marketSize.toLocaleString()} 社
              </span>
            </div>

            {/* 単価 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                単価（課題カード）
              </span>
              <span className="text-white font-semibold">
                {selected.problemCard.unitPrice.toLocaleString()} 万円/社/年
              </span>
            </div>

            {/* 年間売上 */}
            <div className="flex justify-between items-center border-t border-slate-700 pt-2">
              <span className="text-slate-300 text-sm font-semibold">年間売上</span>
              <span className="text-cyan-400 font-bold text-lg">
                {formatManYen(calc.annualRevenue)}
              </span>
            </div>

            <div className="border-t border-slate-700 my-2" />

            {/* コスト変動比率 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                コスト変動比率（30%固定 + パートナー{" "}
                {selected.partnerCards.reduce((s, c) => s + c.costVarianceRate, 0)}%）
              </span>
              <span className="text-red-400 font-semibold">
                {calc.totalCostRate}%
              </span>
            </div>

            {/* 年間コスト */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">年間コスト</span>
              <span className="text-red-400 font-semibold">
                − {formatManYen(calc.annualCost)}
              </span>
            </div>

            {/* 年間利益 */}
            <div className="flex justify-between items-center border-t border-slate-700 pt-2">
              <span className="text-slate-300 text-sm font-semibold">年間利益</span>
              <span
                className={`font-bold text-lg ${
                  calc.annualProfit >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatManYen(calc.annualProfit)}
              </span>
            </div>

            <div className="border-t border-slate-700 my-2" />

            {/* 初期費 */}
            <div className="flex justify-between items-center">
              <span className="text-slate-400 text-sm">
                初期費（ジョブタイプ合計）
              </span>
              <span className="text-red-400 font-semibold">
                − {formatManYen(calc.initialCost)}
              </span>
            </div>

            {/* 3年間累計利益 */}
            <div className="flex justify-between items-center border-t border-slate-700 pt-2 mt-2">
              <span className="text-white text-sm font-bold">
                3年間累計利益
                <span className="text-xs text-slate-500 ml-1">
                  （年間利益×3 - 初期費）
                </span>
              </span>
              <span
                className={`font-black text-xl ${
                  calc.profit3years >= 0 ? "text-green-400" : "text-red-400"
                }`}
              >
                {formatManYen(calc.profit3years)}
              </span>
            </div>
          </div>
        </div>

        {/* ════ 選択カードサマリー ════ */}
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            🃏 選択カードまとめ
          </h2>

          <div className="space-y-3">
            {/* 課題カード */}
            <CardSummaryRow
              label="♦️ 課題"
              cards={[selected.problemCard]}
              color="text-amber-300"
              paramLabel={`単価 ${selected.problemCard.unitPrice.toLocaleString()}万円/社/年`}
            />

            {/* ペルソナカード */}
            <CardSummaryRow
              label="♥️ ペルソナ"
              cards={selected.personaCards}
              color="text-pink-300"
              paramLabel={`合計 ${calc.marketSize}社`}
            />

            {/* パートナーカード */}
            <CardSummaryRow
              label="♣️ パートナー"
              cards={selected.partnerCards}
              color="text-green-300"
              emptyLabel="なし"
              paramLabel={
                selected.partnerCards.length > 0
                  ? `コスト +${selected.partnerCards.reduce((s, c) => s + c.costVarianceRate, 0)}% / 成功率 +${selected.partnerCards.reduce((s, c) => s + c.successContribution, 0)}%`
                  : ""
              }
            />

            {/* ジョブタイプカード */}
            <CardSummaryRow
              label="♠️ ジョブタイプ"
              cards={selected.jobCards}
              color="text-blue-300"
              emptyLabel="なし"
              paramLabel={
                selected.jobCards.length > 0
                  ? `初期費 ${formatManYen(calc.initialCost)} / 成功率 +${selected.jobCards.reduce((s, c) => s + c.successContribution, 0)}%`
                  : ""
              }
            />
          </div>
        </div>

        {/* ════ Claude AI ビジネスプラン評価 ════ */}
        <div className="bg-slate-800 rounded-xl border border-slate-600 p-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wide">
            🤖 AI ビジネスプラン評価
          </h2>

          {aiLoading ? (
            <div className="flex items-center gap-3 py-4 text-slate-400">
              <div className="w-5 h-5 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin flex-shrink-0" />
              <span className="text-sm">Claude AI が評価中...</span>
            </div>
          ) : aiEvaluation ? (
            <div className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">
              {aiEvaluation}
            </div>
          ) : (
            <p className="text-slate-500 text-sm">評価を取得できませんでした。</p>
          )}
        </div>

        {/* ════ アクションボタン ════ */}
        <div className="space-y-3 pt-2">
          {/* もう一度プレイ */}
          <button
            onClick={() => {
              localStorage.removeItem("logi_selectedCards_v42");
              router.push("/card-game/select");
            }}
            className="w-full py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-bold text-base transition-all duration-200"
          >
            🔄 もう一度プレイ
          </button>

          {/* カード選択に戻る */}
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
  paramLabel = "",
}: {
  label: string;
  cards: Card[];
  color: string;
  emptyLabel?: string;
  paramLabel?: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <span className={`text-xs font-semibold whitespace-nowrap mt-0.5 min-w-24 ${color}`}>
        {label}
      </span>
      <div className="flex-1">
        {cards.length === 0 ? (
          <span className="text-slate-500 text-xs">{emptyLabel}</span>
        ) : (
          <>
            <div className="flex flex-wrap gap-1">
              {cards.map((c) => (
                <span
                  key={c.id}
                  className="text-xs bg-slate-700 text-slate-200 px-2 py-0.5 rounded"
                >
                  {c.title}
                </span>
              ))}
            </div>
            {paramLabel && (
              <div className="text-xs text-slate-500 mt-0.5">{paramLabel}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
