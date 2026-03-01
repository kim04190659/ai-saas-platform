"use client";

/**
 * /well-being-quest/select - カード選択ページ
 *
 * 4種類のスートから1枚ずつカードを選ぶ。
 * スートの意味:
 *   ♠ ペルソナ   → 誰の課題に取り組むか
 *   ♣ 課題・問題 → 何が起きているか
 *   ♦ パートナー → 誰と組むか
 *   ♥ アクション → 何をするか
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ===== 型定義 =====

// Notionから取得したカードデータの型（APIから返ってくる形式）
type WBCard = {
  id: string;
  cardName: string;       // 例: "♠A: 75歳・一人暮らしの農家"
  suit: string;           // 例: "♠️スペード"
  rank: string;           // 例: "A"
  title: string;          // 短いタイトル
  description: string;    // 説明テキスト
  flavorText: string;     // フレーバーテキスト（雰囲気づくり）
  wellBeingScore: number; // Well-Being改善への貢献度（1〜10）
  feasibilityScore: number; // 実現可能性（1〜10）
  affectedResidents: number; // 影響住民数（人）
  implementationMonths: number; // 実施期間（ヶ月）
  budgetMillionYen: number; // 必要予算（百万円/年）
};

// ===== スート設定 =====

// 表示順序: ペルソナ → 課題 → パートナー → アクション
const SUITS = [
  {
    key: "♠️スペード",
    symbol: "♠",
    label: "ペルソナ",
    subtitle: "誰の課題に取り組む？",
    color: "#f0f0f0",       // 黒スートは白字で表示
    bgFrom: "from-gray-700",
    bgTo: "to-gray-900",
    headerBg: "bg-gray-800",
    role: "persona",        // AIへ渡すときのキー名
  },
  {
    key: "♣️クラブ",
    symbol: "♣",
    label: "課題・問題",
    subtitle: "何が起きているか？",
    color: "#f0f0f0",
    bgFrom: "from-emerald-700",
    bgTo: "to-emerald-900",
    headerBg: "bg-emerald-800",
    role: "problem",
  },
  {
    key: "♦️ダイヤ",
    symbol: "♦",
    label: "パートナー",
    subtitle: "誰と組む？",
    color: "#ef4444",       // 赤スートは赤字
    bgFrom: "from-amber-600",
    bgTo: "to-amber-800",
    headerBg: "bg-amber-700",
    role: "partner",
  },
  {
    key: "♥️ハート",
    symbol: "♥",
    label: "アクション",
    subtitle: "何をする？",
    color: "#ef4444",
    bgFrom: "from-rose-600",
    bgTo: "to-rose-800",
    headerBg: "bg-rose-700",
    role: "action",
  },
];

// ===== ユーティリティ =====

// スコアを★で表示（1〜10 → ★0〜5、2点で★1つ）
function renderStars(score: number, maxStars: number = 5) {
  const filled = Math.round(score / 2);
  return (
    <span className="text-yellow-400 text-xs">
      {"★".repeat(filled)}{"☆".repeat(maxStars - filled)}
    </span>
  );
}

// 人数を読みやすく表示
function formatPeople(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(0)}万人`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}千人`;
  return `${n}人`;
}

// ===== メインコンポーネント =====

export default function WBQSelectPage() {
  const router = useRouter();

  // ローカルストレージからチーム情報を読み込み（表示用）
  const [teamName, setTeamName] = useState("");

  // ローディング・エラー状態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 現在表示中のスートのインデックス（0=ペルソナ, 1=課題, 2=パートナー, 3=アクション）
  const [currentSuitIndex, setCurrentSuitIndex] = useState(0);

  // スート別カード一覧 { "♠️スペード": [...], "♣️クラブ": [...], ... }
  const [cardsBySuit, setCardsBySuit] = useState<Record<string, WBCard[]>>({});

  // 選択済みカード { "♠️スペード": card, "♣️クラブ": card, ... }
  const [selectedCards, setSelectedCards] = useState<Record<string, WBCard>>({});

  // マウント時にデータ取得
  useEffect(() => {
    // localStorageからチーム名を取得
    setTeamName(localStorage.getItem("wbq_teamName") ?? "チーム");
    fetchAllCards();
  }, []);

  // ===== Notion APIからカードを取得 =====
  async function fetchAllCards() {
    setLoading(true);
    setError("");
    try {
      const results: Record<string, WBCard[]> = {};
      // 4スートを順番に取得
      for (const suit of SUITS) {
        const res = await fetch(
          `/api/well-being-quest/cards?suit=${encodeURIComponent(suit.key)}`
        );
        if (!res.ok) throw new Error(`${suit.label}のカード取得に失敗しました`);
        const data = await res.json();
        results[suit.key] = data.cards ?? [];
      }
      setCardsBySuit(results);
    } catch (err) {
      console.error("カード取得エラー:", err);
      setError("カードの読み込みに失敗しました。ページを再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  }

  // ===== カード選択処理 =====
  function selectCard(suitKey: string, card: WBCard) {
    setSelectedCards((prev) => ({
      ...prev,
      [suitKey]: card, // そのスートの選択を上書き（1枚のみ）
    }));
  }

  // ===== ページ遷移 =====
  function goNext() {
    if (currentSuitIndex < SUITS.length - 1) {
      setCurrentSuitIndex((i) => i + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function goPrev() {
    if (currentSuitIndex > 0) {
      setCurrentSuitIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // 4枚すべて選択済みなら政策入力ページへ
  function goToPlan() {
    const allSelected = SUITS.every((s) => selectedCards[s.key]);
    if (!allSelected) {
      alert("全てのスートから1枚ずつ選んでください");
      return;
    }

    // localStorageに保存する形式に変換
    // { persona: {title, description}, problem: {...}, partner: {...}, action: {...} }
    const cardsForSave: Record<string, { title: string; description: string; cardName: string; rank: string }> = {};
    for (const suit of SUITS) {
      const card = selectedCards[suit.key];
      cardsForSave[suit.role] = {
        title: card.title,
        description: card.description,
        cardName: card.cardName,
        rank: card.rank,
      };
    }
    localStorage.setItem("wbq_selectedCards", JSON.stringify(cardsForSave));

    router.push("/well-being-quest/plan");
  }

  // ===== 表示用変数 =====
  const currentSuit = SUITS[currentSuitIndex];
  const currentCards = cardsBySuit[currentSuit?.key] ?? [];
  const currentSelected = selectedCards[currentSuit?.key];
  const allSelected = SUITS.every((s) => selectedCards[s.key]);
  const selectedCount = Object.keys(selectedCards).length;

  // ===== ローディング画面 =====
  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at top, #2d4a22 0%, #1a3318 40%, #0f2010 100%)",
        }}
      >
        <div className="text-center text-white">
          <div className="text-5xl mb-4 animate-bounce">🃏</div>
          <p className="text-lg font-bold">カードを準備中...</p>
          <p className="text-sm text-green-300 mt-1">Notionからカードデータを取得しています</p>
        </div>
      </div>
    );
  }

  // ===== エラー画面 =====
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{
          background: "radial-gradient(ellipse at top, #2d4a22 0%, #1a3318 40%, #0f2010 100%)",
        }}
      >
        <div className="bg-white rounded-2xl p-6 max-w-md text-center shadow-xl">
          <p className="text-red-500 font-bold mb-2">❌ 読み込みエラー</p>
          <p className="text-gray-600 text-sm mb-4">{error}</p>
          <button
            onClick={fetchAllCards}
            className="px-6 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  // ===== メイン画面 =====
  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse at top, #2d4a22 0%, #1a3318 40%, #0f2010 100%)",
      }}
    >
      {/* ===== 上部ステータスバー ===== */}
      <div className="sticky top-0 z-10 bg-black/50 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* スート進捗ボタン */}
          <div className="flex gap-2 items-center">
            {SUITS.map((suit, i) => (
              <button
                key={i}
                onClick={() => setCurrentSuitIndex(i)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                  i === currentSuitIndex
                    ? "bg-white text-gray-900 shadow-lg scale-105"
                    : selectedCards[suit.key]
                    ? "bg-yellow-400 text-yellow-900"
                    : "bg-white/20 text-white/70"
                }`}
              >
                {selectedCards[suit.key] ? "✓" : `${i + 1}`}
                <span
                  className="text-sm"
                  style={{ color: selectedCards[suit.key] || i === currentSuitIndex ? undefined : suit.color }}
                >
                  {suit.symbol}
                </span>
                <span className="hidden sm:inline">{suit.label}</span>
              </button>
            ))}
          </div>
          {/* 選択数 */}
          <div className="text-white text-sm font-medium">
            {teamName} | {selectedCount}/4 選択
          </div>
        </div>
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div className="max-w-5xl mx-auto px-4 py-6">

        {/* 現在のスートのヘッダー */}
        <div className="text-center mb-6">
          <div
            className="inline-block text-4xl mb-2"
            style={{ color: currentSuit.color }}
          >
            {currentSuit.symbol}
          </div>
          <h2 className="text-2xl font-bold text-white">
            {currentSuit.label}カード
          </h2>
          <p className="text-green-200 text-sm mt-1">{currentSuit.subtitle}</p>
          <p className="text-green-400 text-xs mt-1">
            STEP {currentSuitIndex + 1} / 4 ── 1枚を選んでください
          </p>
          {currentSelected && (
            <p className="text-yellow-300 text-sm mt-2 font-medium">
              ✓ 「{currentSelected.title}」を選択中
            </p>
          )}
        </div>

        {/* ===== カード一覧 ===== */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-8">
          {currentCards.map((card) => {
            const isSelected = currentSelected?.id === card.id;
            return (
              <button
                key={card.id}
                onClick={() => selectCard(currentSuit.key, card)}
                className={`text-left rounded-2xl p-4 transition-all border-2 ${
                  isSelected
                    ? "border-yellow-400 bg-white/20 scale-105 shadow-xl shadow-yellow-400/20"
                    : "border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/30"
                }`}
              >
                {/* カードヘッダー（スート記号 + ランク） */}
                <div className="flex items-center justify-between mb-2">
                  <span
                    className="text-2xl font-bold"
                    style={{ color: currentSuit.color }}
                  >
                    {currentSuit.symbol}
                  </span>
                  <span className="text-white/60 text-sm font-mono bg-white/10 px-2 py-0.5 rounded">
                    {card.rank}
                  </span>
                  {isSelected && (
                    <span className="text-yellow-400 font-bold">✓</span>
                  )}
                </div>

                {/* タイトル */}
                <h3 className="text-white font-bold text-sm mb-1 leading-snug">
                  {card.title}
                </h3>

                {/* 説明テキスト */}
                <p className="text-green-100/80 text-xs mb-3 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>

                {/* Well-Being数値バッジ */}
                <div className="grid grid-cols-2 gap-1.5 text-xs">
                  {/* WB改善スコア */}
                  <div className="bg-black/20 rounded-lg px-2 py-1">
                    <p className="text-green-400/70 text-[10px]">WB改善</p>
                    <div className="flex items-center gap-1">
                      {renderStars(card.wellBeingScore)}
                    </div>
                  </div>
                  {/* 実現可能性 */}
                  <div className="bg-black/20 rounded-lg px-2 py-1">
                    <p className="text-blue-400/70 text-[10px]">実現性</p>
                    <div className="flex items-center gap-1">
                      {renderStars(card.feasibilityScore)}
                    </div>
                  </div>
                  {/* 影響住民数 */}
                  <div className="bg-black/20 rounded-lg px-2 py-1">
                    <p className="text-amber-400/70 text-[10px]">影響住民</p>
                    <p className="text-white font-medium">{formatPeople(card.affectedResidents)}</p>
                  </div>
                  {/* 予算 */}
                  <div className="bg-black/20 rounded-lg px-2 py-1">
                    <p className="text-red-400/70 text-[10px]">予算/年</p>
                    <p className="text-white font-medium">{card.budgetMillionYen}M円</p>
                  </div>
                </div>

                {/* フレーバーテキスト */}
                {card.flavorText && (
                  <p className="mt-2 text-white/40 text-[10px] italic line-clamp-1">
                    「{card.flavorText}」
                  </p>
                )}
              </button>
            );
          })}
        </div>

        {/* ===== 選択カードの詳細プレビュー ===== */}
        {currentSelected && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-5 mb-6 max-w-2xl mx-auto border border-yellow-400/30">
            <h3 className="text-yellow-300 font-bold mb-2 text-sm">
              ✓ 選択: {currentSuit.symbol}{currentSelected.rank} ─ {currentSelected.title}
            </h3>
            <p className="text-green-100 text-sm leading-relaxed mb-3">
              {currentSelected.description}
            </p>
            <div className="grid grid-cols-4 gap-2 text-center text-xs">
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-green-400/70 mb-1">WB改善</p>
                <p className="text-white font-bold text-base">{currentSelected.wellBeingScore}</p>
                <p className="text-white/40">/10</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-blue-400/70 mb-1">実現性</p>
                <p className="text-white font-bold text-base">{currentSelected.feasibilityScore}</p>
                <p className="text-white/40">/10</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-amber-400/70 mb-1">影響住民</p>
                <p className="text-white font-bold text-base">{formatPeople(currentSelected.affectedResidents)}</p>
              </div>
              <div className="bg-black/20 rounded-lg p-2">
                <p className="text-red-400/70 mb-1">実施期間</p>
                <p className="text-white font-bold text-base">{currentSelected.implementationMonths}</p>
                <p className="text-white/40">ヶ月</p>
              </div>
            </div>
          </div>
        )}

        {/* ===== ナビゲーションボタン ===== */}
        <div className="flex gap-3 justify-center mb-8">
          {/* 前へ */}
          {currentSuitIndex > 0 && (
            <button
              onClick={goPrev}
              className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition font-medium"
            >
              ← 前へ
            </button>
          )}

          {/* 次へ or 政策入力へ */}
          {currentSuitIndex < SUITS.length - 1 ? (
            <button
              onClick={goNext}
              disabled={!currentSelected}
              className={`px-8 py-3 rounded-xl font-bold transition ${
                currentSelected
                  ? "bg-yellow-400 text-yellow-900 hover:bg-yellow-300 shadow-lg"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              次のカードへ →
            </button>
          ) : (
            <button
              onClick={goToPlan}
              disabled={!allSelected}
              className={`px-8 py-3 rounded-xl font-bold transition ${
                allSelected
                  ? "bg-green-400 text-green-900 hover:bg-green-300 shadow-lg"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              📝 政策を立案する！
            </button>
          )}
        </div>

        {/* ===== 全スート選択完了時: 選択カードまとめ ===== */}
        {allSelected && (
          <div className="max-w-2xl mx-auto bg-white/10 backdrop-blur rounded-2xl p-5 border border-green-400/30">
            <h3 className="text-white font-bold text-center mb-4">
              🃏 選択した4枚のカード
            </h3>
            <div className="grid grid-cols-2 gap-3">
              {SUITS.map((suit) => {
                const card = selectedCards[suit.key];
                return (
                  <div key={suit.key} className="bg-black/20 rounded-xl p-3">
                    <p className="text-xs mb-1" style={{ color: suit.color === "#f0f0f0" ? "#9ca3af" : "#f87171" }}>
                      {suit.symbol} {suit.label}
                    </p>
                    <p className="text-white text-sm font-semibold leading-tight">
                      {card.rank} - {card.title}
                    </p>
                    <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{card.description}</p>
                  </div>
                );
              })}
            </div>
            <button
              onClick={goToPlan}
              className="w-full mt-4 py-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold text-lg rounded-xl shadow-lg hover:from-green-600 hover:to-emerald-700 transition-all"
            >
              📝 この4枚で政策を立案する！
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
