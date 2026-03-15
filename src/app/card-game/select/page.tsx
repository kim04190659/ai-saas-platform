/**
 * /card-game/select
 * Mission in LOGI-TECH — カード選択ウィザード（v4.2）
 *
 * STEP 0: 課題を選ぶ      (♦️ダイヤ、1枚固定)
 * STEP 1: ペルソナを選ぶ  (♥️ハート、複数可)
 * STEP 2: パートナーを選ぶ (♣️クラブ、複数可)
 * STEP 3: ジョブタイプを選ぶ (♠️スペード、複数可・ユーザーが選択)
 *
 * 選択後 logi_selectedCards_v42 を localStorage に保存して
 * /card-game/result へ遷移する
 *
 * v4.2 Sprint#2 追加: カードイメージ表示対応
 * - public/images/card_PR01.png 形式の画像をカードに表示
 * - cardName（例: "♦A-PR01"）の "-" 以降を画像IDとして使用
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ─── 型定義 ────────────────────────────────────────────

// APIから返ってくるカードの型（v4.2: cards/route.ts と対応）
type Card = {
  id: string;
  cardName: string;         // "♦A-PR01" など
  suit: string;             // "♦️ダイヤ" など
  rank: string;             // "A" | "K" | ... | "2"
  role: string;             // "問題・課題" | "ペルソナ" | "パートナー" | "ジョブタイプ"
  baseValue: number;        // A=13, K=12, ... 2=1
  title: string;            // カードタイトル
  description: string;      // 説明テキスト
  // v4.2 財務パラメーター
  unitPrice: number;        // ♦️ダイヤ専用: 万円/社/年
  potentialCustomers: number; // ♥️ハート専用: 社
  costVarianceRate: number;   // ♣️クラブ専用: %
  successContribution: number; // ♣️♠️共通: %
  initialInvestment: number;   // ♠️スペード専用: 万円
};

// localStorageに保存する選択結果の型
type SelectedCards = {
  problemCard: Card;      // ♦️課題カード（1枚）
  personaCards: Card[];   // ♥️ペルソナカード（複数）
  partnerCards: Card[];   // ♣️パートナーカード（複数）
  jobCards: Card[];       // ♠️ジョブタイプカード（複数）
};

// ─── 定数 ──────────────────────────────────────────────

// ステップラベル
const STEP_LABELS = [
  "♦️ 課題",
  "♥️ ペルソナ",
  "♣️ パートナー",
  "♠️ ジョブタイプ",
];

// グレードバッジの色（Tailwindクラス名）
const GRADE_COLORS: Record<string, string> = {
  S: "bg-yellow-400 text-black",
  A: "bg-orange-400 text-black",
  B: "bg-blue-400 text-white",
  C: "bg-green-500 text-white",
  D: "bg-gray-500 text-white",
};

// ─── ヘルパー関数 ───────────────────────────────────────

/**
 * ランク（A, K, Q, ... 2）をグレード（S/A/B/C/D）に変換
 */
function rankToGrade(rank: string): "S" | "A" | "B" | "C" | "D" {
  if (rank === "A") return "S";
  if (rank === "K" || rank === "Q") return "A";
  if (rank === "J" || rank === "10" || rank === "9") return "B";
  if (rank === "8" || rank === "7" || rank === "6" || rank === "5") return "C";
  return "D";
}

/**
 * v4.2 事業成功率の計算（プレビュー用）
 * = 5% + Σ(パートナー成功率貢献) + Σ(ジョブタイプ成功率貢献)、上限70%
 */
function calcSuccessRate(partners: Card[], jobs: Card[]): number {
  const partnerSum = partners.reduce((s, c) => s + c.successContribution, 0);
  const jobSum = jobs.reduce((s, c) => s + c.successContribution, 0);
  return Math.min(5 + partnerSum + jobSum, 70);
}

/**
 * v4.2 3年間累計利益のプレビュー計算（選択中にリアルタイム表示）
 */
function calcProfit3yearsPreview(
  problem: Card | null,
  personas: Card[],
  partners: Card[],
  jobs: Card[]
): number | null {
  if (!problem || personas.length === 0) return null;

  // 事業成功率（%）
  const successRate = calcSuccessRate(partners, jobs) / 100;
  // 市場規模（社）= ペルソナの潜在顧客数合計
  const marketSize = personas.reduce((s, c) => s + c.potentialCustomers, 0);
  // 年間売上（万円）= 単価 × 市場規模 × 成功率
  const annualRevenue = problem.unitPrice * marketSize * successRate;
  // コスト変動比率合計 = 30%固定 + パートナーのコスト変動比率合計
  const costRate = (30 + partners.reduce((s, c) => s + c.costVarianceRate, 0)) / 100;
  // 年間コスト（万円）
  const annualCost = annualRevenue * costRate;
  // 初期費（万円）= ジョブタイプの初期投資合計
  const initialCost = jobs.reduce((s, c) => s + c.initialInvestment, 0);
  // 3年間累計利益（万円）
  return (annualRevenue - annualCost) * 3 - initialCost;
}

/**
 * 万円 → 億円/万円の見やすい形式でフォーマット
 */
function formatManYen(amount: number | null): string {
  if (amount === null) return "-";
  if (amount >= 10000) return `${(amount / 10000).toFixed(1)}億円`;
  if (amount <= -10000) return `▲${(Math.abs(amount) / 10000).toFixed(1)}億円`;
  if (amount < 0) return `▲${Math.abs(Math.round(amount)).toLocaleString()}万円`;
  return `${Math.round(amount).toLocaleString()}万円`;
}

// ─── サブコンポーネント ─────────────────────────────────

/**
 * ステップインジケーター（上部のナビゲーション）
 */
function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-start justify-between px-3 py-3 bg-slate-800 border-b border-slate-700">
      {STEP_LABELS.map((label, i) => (
        <div key={i} className="flex items-center flex-1">
          <div className="flex flex-col items-center flex-1 min-w-0">
            {/* ステップ番号の丸 */}
            <div
              className={[
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold",
                i < currentStep
                  ? "bg-cyan-400 text-black"
                  : i === currentStep
                  ? "bg-cyan-600 text-white ring-2 ring-cyan-400"
                  : "bg-slate-700 text-slate-400",
              ].join(" ")}
            >
              {i < currentStep ? "✓" : i + 1}
            </div>
            {/* ステップラベル */}
            <div
              className={`text-xs mt-1 text-center leading-tight px-0.5 ${
                i === currentStep ? "text-cyan-400" : "text-slate-500"
              }`}
            >
              {label}
            </div>
          </div>
          {/* ステップ間の接続線 */}
          {i < STEP_LABELS.length - 1 && (
            <div
              className={`h-0.5 w-3 flex-shrink-0 mb-4 ${
                i < currentStep ? "bg-cyan-400" : "bg-slate-700"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

/**
 * cardName（例: "♦A-PR01"）から画像ファイル名を取得するヘルパー
 * "-" 以降の文字列を取り出して "/images/card_PR01.png" 形式に変換する
 */
function getCardImagePath(cardName: string): string {
  const parts = cardName.split("-");
  if (parts.length < 2) return "";
  return `/images/card_${parts[1]}.png`;
}

/**
 * カード1枚を表示するコンポーネント（コンパクト版・5列対応）
 *
 * レイアウト:
 *   [カード画像（クリック領域全体）]
 *   [グレードバッジ・カードID：画像に重ねて表示]
 *   [選択済み：シアンのオーバーレイ＋✓マーク]
 *   [タイトル：画像の下に小さく]
 */
function CardItem({
  card,
  selected = false,
  onClick,
  disabled = false,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  showFinancial?: boolean; // 5列コンパクト表示では使用しない（互換性のため残す）
}) {
  const grade = rankToGrade(card.rank);
  const imagePath = getCardImagePath(card.cardName);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={[
        "relative rounded-lg border-2 overflow-hidden transition-all duration-150 select-none",
        selected
          ? "border-cyan-400 shadow-md shadow-cyan-400/30 scale-[1.03]"
          : "border-slate-600 bg-slate-800",
        !disabled && !selected ? "hover:border-slate-400 hover:scale-[1.02] cursor-pointer" : "",
        disabled ? "opacity-60 cursor-default" : "",
      ].join(" ")}
    >
      {/* ── カード画像 ── */}
      {/* img タグを使用（Next.js Image より確実に表示される） */}
      <div className="relative w-full aspect-[2/3] bg-slate-700 overflow-hidden">
        {imagePath ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imagePath}
            alt={card.title}
            className="w-full h-full object-cover"
          />
        ) : (
          /* 画像がない場合のフォールバック */
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-slate-500 text-xs">{card.cardName}</span>
          </div>
        )}

        {/* 選択済みオーバーレイ（シアン半透明＋大きな✓） */}
        {selected && (
          <div className="absolute inset-0 bg-cyan-500/40 flex items-center justify-center">
            <span className="text-4xl font-black text-white drop-shadow-lg">✓</span>
          </div>
        )}

        {/* グレードバッジ（右上） */}
        <span
          className={`absolute top-1 right-1 text-xs font-black px-1.5 py-0.5 rounded-full shadow ${GRADE_COLORS[grade]}`}
        >
          {grade}
        </span>
      </div>

      {/* ── タイトル（画像下・コンパクト） ── */}
      <div
        className={[
          "px-1 py-1 text-center",
          selected ? "bg-cyan-900/60" : "bg-slate-800",
        ].join(" ")}
      >
        <div className="text-white text-xs font-semibold leading-tight line-clamp-2">
          {card.title}
        </div>
      </div>
    </div>
  );
}

/**
 * リアルタイム利益プレビューバー（画面下部に固定表示）
 */
function ProfitPreviewBar({
  profit,
  successRate,
}: {
  profit: number | null;
  successRate: number;
}) {
  if (profit === null) return null;

  // ランク判定（v4.2）
  let grade = "D";
  let gradeColor = "text-gray-400";
  if (profit >= 20000) { grade = "S"; gradeColor = "text-yellow-400"; }
  else if (profit >= 10000) { grade = "A"; gradeColor = "text-orange-400"; }
  else if (profit >= 5000) { grade = "B"; gradeColor = "text-blue-400"; }
  else if (profit >= 0) { grade = "C"; gradeColor = "text-green-400"; }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-slate-900 border-t border-slate-700 px-4 py-2 z-10">
      <div className="flex items-center justify-between">
        <div className="text-xs text-slate-400">
          成功率 <span className="text-cyan-400 font-bold">{successRate}%</span>
        </div>
        <div className="text-center">
          <div className="text-xs text-slate-500">3年間累計利益（予測）</div>
          <div className={`font-bold text-lg ${gradeColor}`}>
            {formatManYen(profit)}
          </div>
        </div>
        <div className={`text-2xl font-black ${gradeColor}`}>
          {grade}ランク
        </div>
      </div>
    </div>
  );
}

// ─── メインコンポーネント ───────────────────────────────

export default function SelectPage() {
  const router = useRouter();

  // ── State ──
  const [step, setStep] = useState(0);         // 現在のステップ（0〜3）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // APIから取得したカード一覧（スートごとに保持）
  const [problemCards, setProblemCards] = useState<Card[]>([]);   // ♦️課題カード
  const [personaCards, setPersonaCards] = useState<Card[]>([]);   // ♥️ペルソナカード
  const [partnerCards, setPartnerCards] = useState<Card[]>([]);   // ♣️パートナーカード
  const [jobCards, setJobCards] = useState<Card[]>([]);           // ♠️ジョブタイプカード

  // ユーザーが選んだカード
  const [selectedProblem, setSelectedProblem] = useState<Card | null>(null); // 1枚固定
  const [selectedPersonas, setSelectedPersonas] = useState<Card[]>([]);      // 複数可
  const [selectedPartners, setSelectedPartners] = useState<Card[]>([]);      // 複数可
  const [selectedJobs, setSelectedJobs] = useState<Card[]>([]);              // 複数可

  // ── ローディングスピナー ──
  function Spinner() {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-slate-400 text-sm">カードを読み込み中...</span>
      </div>
    );
  }

  // ── API取得: マウント時に全カードを一括取得（キャッシュ活用） ──
  useEffect(() => {
    async function fetchAllCards() {
      setLoading(true);
      setError(null);
      try {
        // 4スーツを並行して取得（Promise.all で高速化）
        const [pRes, peRes, paRes, jRes] = await Promise.all([
          fetch("/api/card-game/cards?role=問題・課題"),
          fetch("/api/card-game/cards?role=ペルソナ"),
          fetch("/api/card-game/cards?role=パートナー"),
          fetch("/api/card-game/cards?role=ジョブタイプ"),
        ]);

        if (!pRes.ok || !peRes.ok || !paRes.ok || !jRes.ok) {
          throw new Error("カードの取得に失敗しました");
        }

        const [pData, peData, paData, jData] = await Promise.all([
          pRes.json(),
          peRes.json(),
          paRes.json(),
          jRes.json(),
        ]);

        setProblemCards(pData.cards ?? []);
        setPersonaCards(peData.cards ?? []);
        setPartnerCards(paData.cards ?? []);
        setJobCards(jData.cards ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchAllCards();
  }, []); // マウント時に1回だけ実行

  // ── リアルタイムプレビュー計算 ──
  const previewProfit = calcProfit3yearsPreview(
    selectedProblem,
    selectedPersonas,
    selectedPartners,
    selectedJobs
  );
  const previewSuccessRate = calcSuccessRate(selectedPartners, selectedJobs);

  // ── イベントハンドラ ──

  // 課題カード選択（1枚のみ）
  function selectProblem(card: Card) {
    setSelectedProblem(card);
  }

  // ペルソナカードのトグル選択（複数可）
  function togglePersona(card: Card) {
    setSelectedPersonas((prev) =>
      prev.find((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  }

  // パートナーカードのトグル選択（複数可）
  function togglePartner(card: Card) {
    setSelectedPartners((prev) =>
      prev.find((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  }

  // ジョブタイプカードのトグル選択（複数可）
  function toggleJob(card: Card) {
    setSelectedJobs((prev) =>
      prev.find((c) => c.id === card.id)
        ? prev.filter((c) => c.id !== card.id)
        : [...prev, card]
    );
  }

  // 結果ページへ遷移（localStorageに保存してから遷移）
  function goToResult() {
    if (!selectedProblem) return;

    // v4.2 専用キーで保存
    const payload: SelectedCards = {
      problemCard: selectedProblem,
      personaCards: selectedPersonas,
      partnerCards: selectedPartners,
      jobCards: selectedJobs,
    };

    localStorage.setItem("logi_selectedCards_v42", JSON.stringify(payload));
    router.push("/card-game/result");
  }

  // ── レンダリング ──
  return (
    <div className="min-h-screen bg-slate-900 text-white pb-20">

      {/* ヘッダー */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <h1 className="text-xl font-bold text-center text-cyan-400">
          🏭 Mission in LOGI-TECH
        </h1>
        <p className="text-center text-slate-400 text-sm mt-1">
          ビジネスプランを立案せよ！ v4.2
        </p>
      </div>

      {/* ステップインジケーター */}
      <StepIndicator currentStep={step} />

      {/* エラーメッセージ */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-900 border border-red-600 rounded-lg text-red-200 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* 全ステップ共通ローディング */}
      {loading && step === 0 && <Spinner />}

      {/* ════ STEP 0: ♦️課題を選ぶ ════ */}
      {!loading && step === 0 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 1 / ♦️ 解決する課題を選ぶ（1枚）
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              取り組む物流課題を1枚選んでください。
              高ランクほど深刻な課題で、単価が高くなります。
            </p>
          </div>

          {problemCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              課題カードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {problemCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedProblem?.id === card.id}
                  onClick={() => selectProblem(card)}
                  showFinancial={true}
                />
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={() => setStep(1)}
              disabled={!selectedProblem}
              className={[
                "w-full py-3 rounded-xl font-bold text-base transition-all duration-200",
                selectedProblem
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              次へ：♥️ ペルソナを選ぶ →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 1: ♥️ペルソナを選ぶ ════ */}
      {step === 1 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 2 / ♥️ ペルソナを選ぶ（複数可）
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              サービスを届けたい相手を選んでください。
              複数選ぶほど市場規模が広がります。
            </p>
          </div>

          {personaCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              ペルソナカードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {personaCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedPersonas.some((c) => c.id === card.id)}
                  onClick={() => togglePersona(card)}
                  showFinancial={true}
                />
              ))}
            </div>
          )}

          {/* 選択中ペルソナのサマリー */}
          {selectedPersonas.length > 0 && (
            <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-600">
              <div className="text-xs text-slate-400 mb-1">
                選択中（市場規模合計）
              </div>
              <div className="text-cyan-400 text-sm font-bold">
                潜在顧客:{" "}
                {selectedPersonas.reduce((s, c) => s + c.potentialCustomers, 0).toLocaleString()} 社
              </div>
              <div className="text-white text-xs mt-1">
                {selectedPersonas.map((c) => c.title).join("、")}
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(0)}
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
            >
              ← 戻る
            </button>
            <button
              onClick={() => setStep(2)}
              disabled={selectedPersonas.length === 0}
              className={[
                "flex-1 py-3 rounded-xl font-bold text-base transition-all duration-200",
                selectedPersonas.length > 0
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              次へ：♣️ パートナー →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 2: ♣️パートナーを選ぶ ════ */}
      {step === 2 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 3 / ♣️ パートナーを選ぶ（複数可）
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              外部パートナーを選んでください。
              高ランクほど成功率への貢献は大きいですが、コストも上がります。
            </p>
          </div>

          {partnerCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              パートナーカードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {partnerCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedPartners.some((c) => c.id === card.id)}
                  onClick={() => togglePartner(card)}
                  showFinancial={true}
                />
              ))}
            </div>
          )}

          {/* 選択中パートナーのサマリー */}
          {selectedPartners.length > 0 && (
            <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-600">
              <div className="text-xs text-slate-400 mb-1">選択中パートナーの合計</div>
              <div className="flex gap-4 text-xs">
                <span className="text-red-400">
                  コスト +{selectedPartners.reduce((s, c) => s + c.costVarianceRate, 0)}%
                </span>
                <span className="text-green-400">
                  成功率 +{selectedPartners.reduce((s, c) => s + c.successContribution, 0)}%
                </span>
              </div>
            </div>
          )}

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
            >
              ← 戻る
            </button>
            <button
              onClick={() => setStep(3)}
              className="flex-1 py-3 rounded-xl font-bold text-base bg-cyan-500 hover:bg-cyan-400 text-black transition-all duration-200"
            >
              次へ：♠️ ジョブタイプ →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 3: ♠️ジョブタイプを選ぶ ════ */}
      {step === 3 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 4 / ♠️ ジョブタイプを選ぶ（複数可）
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              自社で採用・育成する職種を選んでください。
              高ランクほど初期費用が高いですが、成功率が上がります。
            </p>
          </div>

          {jobCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              ジョブタイプカードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-5 gap-2">
              {jobCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedJobs.some((c) => c.id === card.id)}
                  onClick={() => toggleJob(card)}
                  showFinancial={true}
                />
              ))}
            </div>
          )}

          {/* 選択中ジョブのサマリー */}
          {selectedJobs.length > 0 && (
            <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-600">
              <div className="text-xs text-slate-400 mb-1">選択中ジョブタイプの合計</div>
              <div className="flex gap-4 text-xs">
                <span className="text-blue-400">
                  初期費 {selectedJobs.reduce((s, c) => s + c.initialInvestment, 0).toLocaleString()}万円
                </span>
                <span className="text-green-400">
                  成功率 +{selectedJobs.reduce((s, c) => s + c.successContribution, 0)}%
                </span>
              </div>
            </div>
          )}

          {/* 全体の選択サマリー */}
          <div className="mt-4 p-4 bg-slate-800 rounded-xl border border-slate-600">
            <div className="text-sm font-bold text-slate-300 mb-3">
              📋 カード選択サマリー
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500">♦️ 課題：</span>
                <span className="text-white ml-2">
                  {selectedProblem?.title ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">♥️ ペルソナ：</span>
                <span className="text-white ml-2">
                  {selectedPersonas.length > 0
                    ? selectedPersonas.map((c) => c.title).join("、")
                    : "未選択"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">♣️ パートナー：</span>
                <span className="text-white ml-2">
                  {selectedPartners.length > 0
                    ? selectedPartners.map((c) => c.title).join("、")
                    : "なし"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">♠️ ジョブタイプ：</span>
                <span className="text-white ml-2">
                  {selectedJobs.length > 0
                    ? selectedJobs.map((c) => c.title).join("、")
                    : "なし"}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(2)}
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
            >
              ← 戻る
            </button>
            <button
              onClick={goToResult}
              className="flex-1 py-3 rounded-xl font-bold text-base bg-yellow-400 hover:bg-yellow-300 text-black transition-all duration-200"
            >
              🚀 結果を見る →
            </button>
          </div>
        </div>
      )}

      {/* リアルタイム利益プレビューバー（課題＋ペルソナが選択済みの場合に表示） */}
      <ProfitPreviewBar
        profit={previewProfit}
        successRate={previewSuccessRate}
      />
    </div>
  );
}
