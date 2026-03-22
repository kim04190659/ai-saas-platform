/**
 * /well-being-quest/select
 * Make or Buy ゲーム v3 — カード選択ウィザード（4ステップ）
 *
 * STEP 0: 課題を選ぶ     (役割=問題・課題、1枚)
 * STEP 1: ペルソナを選ぶ  (役割=ペルソナ、複数可、課題テーマで絞り込み)
 * STEP 2: パートナーを選ぶ (役割=パートナー、複数可 → Buy決定)
 * STEP 3: アクション確認  (役割=ジョブタイプ、自動決定 → Make決定)
 *
 * 最後に logi_selectedCards を localStorage に保存して
 * /well-being-quest/result へ遷移する
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

// ─── 型定義 ────────────────────────────────────────────

// APIから返ってくるカードの型（cards/route.ts と対応）
type Card = {
  id: string;
  cardName: string;       // "♦2" など
  suit: string;           // "♦️ダイヤ" など（旧フィールド、互換用）
  rank: string;           // "A" | "2" | ... | "K"
  role: string;           // "問題・課題" | "ペルソナ" | "パートナー" | "ジョブタイプ"
  theme: string;          // "配送業・物流人材不足" など
  title: string;          // カードタイトル（短い名前）
  description: string;    // 説明テキスト
  flavorText: string;     // フレーバーテキスト（斜体で表示）
  marketSize: number;     // マーケットサイズ（万人）
  monthlyVolume: number;  // 月間販売見込数（件/月）
  unitPrice: number;      // 販売単価（円/件）
  variableCost: number;   // 変動費月額（円）
  feasibilityScore: number; // 実現可能性スコア（1-10）
  businessFunctions: string[]; // 業務機能タグ（例: ["配送・物流", "顧客対応"]）
  targetPersonas: string[];    // 対応ペルソナタグ
};

// localStorage に保存する選択結果の型
type SelectedCards = {
  kuraiCard: Card;        // 選んだ課題カード（1枚）
  personaCards: Card[];   // 選んだペルソナカード（複数）
  partnerCards: Card[];   // 選んだパートナーカード（Buy、複数）
  makeCards: Card[];      // 自動決定されたMakeカード（複数）
};

// ─── 定数 ──────────────────────────────────────────────

// 5つの業務機能（すべてをカバーするには最大5枚のMakeカードが必要）
const ALL_BUSINESS_FUNCTIONS = [
  "開発・製造",
  "販売・マーケティング",
  "配送・物流",
  "顧客対応",
  "管理・運営",
] as const;

// グレード表示色（Tailwindクラス名）
const GRADE_COLORS: Record<string, string> = {
  S: "bg-yellow-400 text-black",
  A: "bg-orange-400 text-black",
  B: "bg-blue-400 text-white",
  C: "bg-green-500 text-white",
  D: "bg-gray-500 text-white",
};

// ステップのラベル
const STEP_LABELS = [
  "課題を選ぶ",
  "ペルソナ",
  "パートナー（Buy）",
  "アクション確認",
];

// ─── ヘルパー関数 ───────────────────────────────────────

/**
 * カードのランク（A, 2〜K）をゲームグレード（S/A/B/C/D）に変換する
 * A → S (最高), K/Q → A, J/10/9 → B, 8/7/6/5 → C, 4/3/2 → D
 */
function rankToGrade(rank: string): "S" | "A" | "B" | "C" | "D" {
  if (rank === "A") return "S";
  if (rank === "K" || rank === "Q") return "A";
  if (rank === "J" || rank === "10" || rank === "9") return "B";
  if (rank === "8" || rank === "7" || rank === "6" || rank === "5") return "C";
  return "D"; // 4, 3, 2
}

// ─── サブコンポーネント ─────────────────────────────────

/**
 * カードを表示するカードコンポーネント
 * selected: 選択中かどうか（ハイライト表示）
 * disabled: クリック不可（Makeカードの自動表示に使用）
 * showNumbers: 数値（月間件数・単価など）を表示するか
 */
function CardItem({
  card,
  selected = false,
  onClick,
  disabled = false,
  showNumbers = false,
}: {
  card: Card;
  selected?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  showNumbers?: boolean;
}) {
  const grade = rankToGrade(card.rank);

  return (
    <div
      onClick={disabled ? undefined : onClick}
      className={[
        "relative rounded-xl border-2 p-4 transition-all duration-200",
        selected
          ? "border-cyan-400 bg-slate-700 shadow-lg shadow-cyan-400/20"
          : "border-slate-600 bg-slate-800",
        !disabled && !selected ? "hover:border-slate-400 cursor-pointer" : "",
        disabled ? "opacity-70 cursor-default" : "",
      ].join(" ")}
    >
      {/* グレードバッジ（右上） */}
      <span
        className={`absolute top-3 right-3 text-xs font-bold px-2 py-0.5 rounded-full ${GRADE_COLORS[grade]}`}
      >
        {grade}
      </span>

      {/* 選択チェックマーク（左上） */}
      {selected && (
        <span className="absolute top-3 left-3 text-cyan-400 text-lg font-bold">✓</span>
      )}

      {/* カード識別名（小さく、グレー） */}
      <div className="text-xs text-slate-500 mb-1 pr-10">{card.cardName}</div>

      {/* カードタイトル（メイン） */}
      <div className={`text-white font-semibold text-sm mb-2 ${selected ? "pl-5" : ""}`}>
        {card.title}
      </div>

      {/* 説明テキスト */}
      <div className="text-slate-300 text-xs leading-relaxed">{card.description}</div>

      {/* フレーバーテキスト（斜体） */}
      {card.flavorText && (
        <div className="mt-2 text-slate-500 text-xs italic">
          &ldquo;{card.flavorText}&rdquo;
        </div>
      )}

      {/* 月間件数・単価（課題カードとペルソナカードで表示） */}
      {showNumbers && (card.monthlyVolume > 0 || card.unitPrice > 0) && (
        <div className="mt-2 flex gap-3 text-xs text-slate-400">
          {card.monthlyVolume > 0 && (
            <span>📦 月間 {card.monthlyVolume.toLocaleString()} 件</span>
          )}
          {card.unitPrice > 0 && (
            <span>💰 単価 {card.unitPrice.toLocaleString()} 円</span>
          )}
        </div>
      )}

      {/* 業務機能タグ（パートナー・ジョブタイプで表示） */}
      {card.businessFunctions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {card.businessFunctions.map((fn) => (
            <span
              key={fn}
              className="text-xs bg-slate-700 text-slate-300 px-1.5 py-0.5 rounded"
            >
              {fn}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

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

// ─── メインコンポーネント ───────────────────────────────

export default function SelectPage() {
  const router = useRouter();

  // ── State ──
  const [step, setStep] = useState(0);    // 現在のステップ（0〜3）
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // APIから取得したカード一覧
  const [kuraiCards, setKuraiCards] = useState<Card[]>([]);     // 問題・課題カード
  const [personaCards, setPersonaCards] = useState<Card[]>([]); // ペルソナカード
  const [partnerCards, setPartnerCards] = useState<Card[]>([]); // パートナーカード

  // ユーザーが選んだカード
  const [selectedKurai, setSelectedKurai] = useState<Card | null>(null); // 課題（1枚）
  const [selectedPersonas, setSelectedPersonas] = useState<Card[]>([]);  // ペルソナ（複数）
  const [selectedPartners, setSelectedPartners] = useState<Card[]>([]);  // パートナーBuy（複数）
  const [autoMakeCards, setAutoMakeCards] = useState<Card[]>([]);        // Makeカード（自動）

  // ── API取得: STEP 0 → 課題カード ──
  useEffect(() => {
    async function fetchKuraiCards() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/well-being-quest/cards?role=問題・課題");
        if (!res.ok) throw new Error("課題カードの取得に失敗しました");
        const data = await res.json();
        setKuraiCards(data.cards ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchKuraiCards();
  }, []); // マウント時に1回だけ

  // ── API取得: STEP 1 → ペルソナカード（課題テーマで絞り込み） ──
  useEffect(() => {
    if (step !== 1 || !selectedKurai) return;

    async function fetchPersonaCards() {
      setLoading(true);
      setError(null);
      try {
        // 課題カードのテーマでペルソナを絞り込む
        const theme = encodeURIComponent(selectedKurai!.theme);
        const res = await fetch(
          `/api/well-being-quest/cards?role=ペルソナ&theme=${theme}`
        );
        if (!res.ok) throw new Error("ペルソナカードの取得に失敗しました");
        const data = await res.json();
        setPersonaCards(data.cards ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchPersonaCards();
  }, [step, selectedKurai]);

  // ── API取得: STEP 2 → パートナーカード（全件） ──
  useEffect(() => {
    if (step !== 2) return;

    async function fetchPartnerCards() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/well-being-quest/cards?role=パートナー");
        if (!res.ok) throw new Error("パートナーカードの取得に失敗しました");
        const data = await res.json();
        setPartnerCards(data.cards ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "エラーが発生しました");
      } finally {
        setLoading(false);
      }
    }
    fetchPartnerCards();
  }, [step]);

  // ── API取得: STEP 3 → ジョブタイプカード取得 → Makeカード自動決定 ──
  const determineMakeCards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/well-being-quest/cards?role=ジョブタイプ");
      if (!res.ok) throw new Error("ジョブタイプカードの取得に失敗しました");
      const data = await res.json();
      const allJobTypeCards: Card[] = data.cards ?? [];

      // パートナー（Buy）がカバーしている業務機能を収集
      const coveredFunctions = new Set<string>();
      for (const partner of selectedPartners) {
        for (const fn of partner.businessFunctions) {
          coveredFunctions.add(fn);
        }
      }

      // カバーされていない（＝Makeが必要な）業務機能を特定
      const uncoveredFunctions = ALL_BUSINESS_FUNCTIONS.filter(
        (fn) => !coveredFunctions.has(fn)
      );

      // 業務機能タグが設定されているカードが1枚でもあるか確認
      const hasTags = allJobTypeCards.some((c) => c.businessFunctions.length > 0);

      let makeCards: Card[];

      if (hasTags && uncoveredFunctions.length > 0) {
        // タグあり: カバーされていない業務機能に対応するカードを選ぶ
        // 同じカードが複数の機能に対応する場合は重複排除（Mapで管理）
        const makeMap = new Map<string, Card>(); // id → Card
        for (const fn of uncoveredFunctions) {
          const match = allJobTypeCards.find((c) =>
            c.businessFunctions.includes(fn)
          );
          if (match) makeMap.set(match.id, match);
        }
        makeCards = Array.from(makeMap.values());
      } else if (!hasTags) {
        // フォールバック: 業務機能タグが未設定の場合
        // → 課題と同テーマのジョブタイプカードを全部Makeとする
        makeCards = allJobTypeCards.filter(
          (c) => !selectedKurai || c.theme === selectedKurai.theme
        );
        // 同テーマも見つからなければ全件
        if (makeCards.length === 0) makeCards = allJobTypeCards;
      } else {
        // パートナーが全業務機能をカバー → Makeなし（フルBuy）
        makeCards = [];
      }

      setAutoMakeCards(makeCards);
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }, [selectedPartners, selectedKurai]);

  useEffect(() => {
    if (step === 3) {
      determineMakeCards();
    }
  }, [step, determineMakeCards]);

  // ── イベントハンドラ ──

  // 課題カード選択（1枚のみ）
  function selectKurai(card: Card) {
    setSelectedKurai(card);
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

  // STEP 0 → STEP 1 へ
  function goToStep1() {
    if (!selectedKurai) return;
    setSelectedPersonas([]);
    setStep(1);
  }

  // STEP 1 → STEP 2 へ
  function goToStep2() {
    if (selectedPersonas.length === 0) return;
    setSelectedPartners([]);
    setStep(2);
  }

  // STEP 2 → STEP 3 へ
  function goToStep3() {
    setStep(3);
  }

  // STEP 3 → 結果ページへ（localStorageに保存して遷移）
  function goToResult() {
    if (!selectedKurai) return;

    const payload: SelectedCards = {
      kuraiCard: selectedKurai,
      personaCards: selectedPersonas,
      partnerCards: selectedPartners,
      makeCards: autoMakeCards,
    };

    // v3専用キーで保存（古い wbq_* キーとは別物）
    localStorage.setItem("logi_selectedCards", JSON.stringify(payload));
    router.push("/well-being-quest/result");
  }

  // ── パートナー業務機能カバレッジ計算（STEP 2表示用） ──
  const coveredFunctionSet = new Set<string>();
  for (const partner of selectedPartners) {
    for (const fn of partner.businessFunctions) {
      coveredFunctionSet.add(fn);
    }
  }

  // ── ローディングスピナー ──
  function Spinner() {
    return (
      <div className="flex justify-center items-center py-16">
        <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin" />
        <span className="ml-3 text-slate-400 text-sm">カードを読み込み中...</span>
      </div>
    );
  }

  // ── レンダリング ──
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      {/* ヘッダー */}
      <div className="bg-slate-800 border-b border-slate-700 px-4 py-4">
        <h1 className="text-xl font-bold text-center text-green-400">
          🌿 Well-Being QUEST
        </h1>
        <p className="text-center text-slate-400 text-sm mt-1">
          限界自治体版 カードゲーム v4
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

      {/* ════ STEP 0: 課題を選ぶ ════ */}
      {step === 0 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 1 / 解決する課題を選ぶ
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              取り組みたい社会課題カードを1枚選んでください。
              このカードがサービスの土台になります。
            </p>
          </div>

          {loading ? (
            <Spinner />
          ) : kuraiCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              課題カードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {kuraiCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedKurai?.id === card.id}
                  onClick={() => selectKurai(card)}
                  showNumbers={true}
                />
              ))}
            </div>
          )}

          <div className="mt-6">
            <button
              onClick={goToStep1}
              disabled={!selectedKurai}
              className={[
                "w-full py-3 rounded-xl font-bold text-base transition-all duration-200",
                selectedKurai
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              次へ：ペルソナを選ぶ →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 1: ペルソナを選ぶ ════ */}
      {step === 1 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 2 / ペルソナを選ぶ
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              サービスを届けたい相手（ペルソナ）を選んでください。
              複数選択可。多いほど市場規模が広がります。
            </p>
            {selectedKurai && (
              <div className="mt-2 inline-block bg-slate-700 rounded px-2 py-1 text-xs text-slate-400">
                テーマ：{selectedKurai.theme}
              </div>
            )}
          </div>

          {loading ? (
            <Spinner />
          ) : personaCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              このテーマのペルソナカードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {personaCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedPersonas.some((c) => c.id === card.id)}
                  onClick={() => togglePersona(card)}
                  showNumbers={true}
                />
              ))}
            </div>
          )}

          {/* 選択中ペルソナのサマリー */}
          {selectedPersonas.length > 0 && (
            <div className="mt-3 p-3 bg-slate-800 rounded-xl border border-slate-600">
              <div className="text-xs text-slate-400 mb-1">選択中のペルソナ</div>
              <div className="text-white text-sm">
                {selectedPersonas.map((c) => c.title).join("、")}
              </div>
              <div className="text-cyan-400 text-xs mt-1">
                合計月間販売見込：
                {selectedPersonas
                  .reduce((sum, c) => sum + c.monthlyVolume, 0)
                  .toLocaleString()}{" "}
                件/月
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
              onClick={goToStep2}
              disabled={selectedPersonas.length === 0}
              className={[
                "flex-1 py-3 rounded-xl font-bold text-base transition-all duration-200",
                selectedPersonas.length > 0
                  ? "bg-cyan-500 hover:bg-cyan-400 text-black"
                  : "bg-slate-700 text-slate-500 cursor-not-allowed",
              ].join(" ")}
            >
              次へ：パートナー →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 2: パートナーを選ぶ（Buy） ════ */}
      {step === 2 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 3 / パートナーを選ぶ（Buy）
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              外部パートナーに委託する機能を選んでください（Buy決定）。
              <br />
              選ばなかった機能は自社で開発します（Make）。
            </p>
          </div>

          {loading ? (
            <Spinner />
          ) : partnerCards.length === 0 ? (
            <p className="text-slate-400 text-center py-8">
              パートナーカードが見つかりませんでした
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {partnerCards.map((card) => (
                <CardItem
                  key={card.id}
                  card={card}
                  selected={selectedPartners.some((c) => c.id === card.id)}
                  onClick={() => togglePartner(card)}
                />
              ))}
            </div>
          )}

          {/* 業務機能カバレッジ表示 */}
          <div className="mt-4 p-3 bg-slate-800 rounded-xl border border-slate-600">
            <div className="text-xs text-slate-400 mb-2">
              業務機能カバレッジ（Buy ✓ ／ Make ✗）
            </div>
            <div className="flex flex-wrap gap-2">
              {ALL_BUSINESS_FUNCTIONS.map((fn) => {
                const covered = coveredFunctionSet.has(fn);
                return (
                  <span
                    key={fn}
                    className={[
                      "text-xs px-2 py-1 rounded-full font-medium",
                      covered
                        ? "bg-green-700 text-green-100"
                        : "bg-slate-700 text-slate-400",
                    ].join(" ")}
                  >
                    {covered ? "✓ " : "✗ "}
                    {fn}
                  </span>
                );
              })}
            </div>
            {selectedPartners.length > 0 && (
              <div className="text-xs text-slate-500 mt-2">
                ✗ の機能は次のステップで自動的にMake（自社開発）になります
              </div>
            )}
          </div>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl bg-slate-700 hover:bg-slate-600 text-white font-bold transition-all"
            >
              ← 戻る
            </button>
            <button
              onClick={goToStep3}
              className="flex-1 py-3 rounded-xl font-bold text-base bg-cyan-500 hover:bg-cyan-400 text-black transition-all duration-200"
            >
              次へ：確認 →
            </button>
          </div>
        </div>
      )}

      {/* ════ STEP 3: アクション確認（Make自動決定） ════ */}
      {step === 3 && (
        <div className="p-4">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-cyan-400">
              STEP 4 / アクション確認（Make）
            </h2>
            <p className="text-slate-400 text-sm mt-1">
              パートナー未カバーの機能は自社で開発します（Make）。
              以下のアクションカードが自動的に適用されました。
            </p>
          </div>

          {loading ? (
            <Spinner />
          ) : autoMakeCards.length === 0 ? (
            <div className="p-4 bg-green-900 border border-green-600 rounded-xl text-green-200 text-sm">
              🎉 すべての業務機能がパートナーでカバーされました！
              <br />
              自社開発（Make）コストはゼロです。
            </div>
          ) : (
            <>
              <div className="mb-3 text-xs text-slate-500">
                以下のカードは自動適用されます（変更不可）
              </div>
              <div className="grid grid-cols-1 gap-3">
                {autoMakeCards.map((card) => (
                  <CardItem
                    key={card.id}
                    card={card}
                    selected={true}
                    disabled={true}
                  />
                ))}
              </div>
            </>
          )}

          {/* 全体の選択サマリー */}
          <div className="mt-5 p-4 bg-slate-800 rounded-xl border border-slate-600">
            <div className="text-sm font-bold text-slate-300 mb-3">
              📋 カード選択サマリー
            </div>
            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-500">♦ 課題：</span>
                <span className="text-white ml-2">
                  {selectedKurai?.title ?? "-"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">♥ ペルソナ：</span>
                <span className="text-white ml-2">
                  {selectedPersonas.length > 0
                    ? selectedPersonas.map((c) => c.title).join("、")
                    : "なし"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">♣ パートナー（Buy）：</span>
                <span className="text-white ml-2">
                  {selectedPartners.length > 0
                    ? selectedPartners.map((c) => c.title).join("、")
                    : "なし（全部Make）"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">♠ アクション（Make）：</span>
                <span className="text-white ml-2">
                  {autoMakeCards.length > 0
                    ? autoMakeCards.map((c) => c.title).join("、")
                    : "なし（全部Buy）"}
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
    </div>
  );
}
