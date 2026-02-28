"use client";

/**
 * /card-game/select - カード選択ページ（メインゲームUI）
 * 4種類のスートから1枚ずつカードを選ぶ
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import PlayingCard, { CardData } from "@/components/card-game/PlayingCard";

// スートの表示順序と設定
const SUITS = [
  { key: "♥️ハート", label: "♥️ ペルソナ", subtitle: "誰のためのサービス？", color: "from-red-500 to-red-700" },
  { key: "♦️ダイヤ", label: "♦️ 問題・課題", subtitle: "何を解決する？", color: "from-orange-500 to-orange-700" },
  { key: "♣️クラブ", label: "♣️ パートナー", subtitle: "誰と組む？", color: "from-green-600 to-green-800" },
  { key: "♠️スペード", label: "♠️ ジョブタイプ", subtitle: "どう実現する？", color: "from-blue-700 to-blue-900" },
];

export default function CardSelectPage() {
  const router = useRouter();

  // ローディング状態
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // 現在どのスートを選んでいるか（0=ハート, 1=ダイヤ, 2=クラブ, 3=スペード）
  const [currentSuitIndex, setCurrentSuitIndex] = useState(0);

  // スート別のカード一覧
  const [cardsBySuit, setCardsBySuit] = useState<Record<string, CardData[]>>({});

  // 選択したカード（スートキー → カードデータ）
  const [selectedCards, setSelectedCards] = useState<Record<string, CardData>>({});

  // ページ読み込み時にNotionからカードデータを取得
  useEffect(() => {
    fetchAllCards();
  }, []);

  // 全スートのカードをAPIから取得する
  async function fetchAllCards() {
    setLoading(true);
    try {
      const results: Record<string, CardData[]> = {};

      // 4スートを順番に取得（並列でも可だが、API制限を考慮して順次）
      for (const suit of SUITS) {
        const res = await fetch(`/api/card-game/cards?suit=${encodeURIComponent(suit.key)}`);
        if (!res.ok) throw new Error(`${suit.key}のカード取得失敗`);
        const data = await res.json();
        results[suit.key] = data.cards;
      }

      setCardsBySuit(results);
    } catch (err) {
      console.error(err);
      setError("カードデータの読み込みに失敗しました。ページを再読み込みしてください。");
    } finally {
      setLoading(false);
    }
  }

  // カードをクリックしたとき
  function selectCard(suit: string, card: CardData) {
    setSelectedCards((prev) => ({
      ...prev,
      [suit]: card, // そのスートの選択を上書き（1枚だけ）
    }));
  }

  // 次のスートへ進む
  function goNext() {
    if (currentSuitIndex < SUITS.length - 1) {
      setCurrentSuitIndex((i) => i + 1);
      // スムーズにスクロール
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // 前のスートに戻る
  function goPrev() {
    if (currentSuitIndex > 0) {
      setCurrentSuitIndex((i) => i - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  // 企画書作成ページへ（全スート選択済みが必要）
  function goToPlan() {
    const allSelected = SUITS.every((s) => selectedCards[s.key]);
    if (!allSelected) {
      alert("全てのスートから1枚ずつカードを選んでください。");
      return;
    }
    // 選択カードをlocalStorageに保存
    localStorage.setItem("cardGame_selectedCards", JSON.stringify(selectedCards));
    router.push("/card-game/plan");
  }

  // 現在表示中のスート
  const currentSuit = SUITS[currentSuitIndex];
  const currentCards = cardsBySuit[currentSuit?.key] ?? [];
  const currentSelected = selectedCards[currentSuit?.key];

  // 全スート選択完了チェック
  const allSelected = SUITS.every((s) => selectedCards[s.key]);
  const selectedCount = Object.keys(selectedCards).length;

  // ===== レンダリング =====

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "radial-gradient(ellipse at center, #1a5c2e 0%, #0d3b1e 60%, #071f10 100%)" }}
      >
        <div className="text-center text-white">
          <div className="text-5xl mb-4 animate-bounce">🃏</div>
          <p className="text-lg">カードを準備中...</p>
          <p className="text-sm text-green-300 mt-1">Notionからデータを取得しています</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-4"
        style={{ background: "radial-gradient(ellipse at center, #1a5c2e 0%, #0d3b1e 60%, #071f10 100%)" }}
      >
        <div className="bg-white rounded-2xl p-6 max-w-md text-center">
          <p className="text-red-500 font-semibold mb-4">❌ {error}</p>
          <button
            onClick={fetchAllCards}
            className="px-6 py-3 bg-green-600 text-white rounded-xl"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{ background: "radial-gradient(ellipse at center, #1a5c2e 0%, #0d3b1e 60%, #071f10 100%)" }}
    >
      {/* ===== ヘッダー ===== */}
      <div className="sticky top-0 z-10 bg-black/40 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* 進捗インジケーター */}
          <div className="flex gap-2 items-center">
            {SUITS.map((suit, i) => (
              <button
                key={i}
                onClick={() => setCurrentSuitIndex(i)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                  i === currentSuitIndex
                    ? "bg-white text-gray-900 shadow-lg scale-105"
                    : selectedCards[suit.key]
                    ? "bg-yellow-400 text-yellow-900"
                    : "bg-white/20 text-white/70"
                }`}
              >
                {selectedCards[suit.key] ? "✓" : `${i + 1}`}
                <span className="hidden sm:inline">{suit.label.split(" ")[0]}</span>
              </button>
            ))}
          </div>

          {/* 選択状況 */}
          <div className="text-white text-sm">
            {selectedCount}/4 選択済み
          </div>
        </div>
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div className="max-w-5xl mx-auto px-4 py-6">
        {/* 現在のスートのタイトル */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white">{currentSuit.label}</h2>
          <p className="text-green-200 text-sm">{currentSuit.subtitle}</p>
          {currentSelected && (
            <p className="text-yellow-300 text-sm mt-1">
              ✓ 「{currentSelected.title}」を選択中
            </p>
          )}
        </div>

        {/* カード一覧 */}
        <div className="flex flex-wrap justify-center gap-3 mb-8">
          {currentCards.map((card) => (
            <PlayingCard
              key={card.id}
              card={card}
              isSelected={currentSelected?.id === card.id}
              onClick={() => selectCard(currentSuit.key, card)}
            />
          ))}
        </div>

        {/* 選択したカードの詳細 */}
        {currentSelected && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6 max-w-lg mx-auto">
            <h3 className="text-white font-bold mb-2">
              選択中: {currentSelected.rank} - {currentSelected.title}
            </h3>
            <p className="text-green-100 text-sm">{currentSelected.description}</p>
          </div>
        )}

        {/* ナビゲーションボタン */}
        <div className="flex gap-3 justify-center">
          {currentSuitIndex > 0 && (
            <button
              onClick={goPrev}
              className="px-6 py-3 bg-white/20 text-white rounded-xl hover:bg-white/30 transition"
            >
              ← 前へ
            </button>
          )}

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
              次のスートへ →
            </button>
          ) : (
            <button
              onClick={goToPlan}
              disabled={!allSelected}
              className={`px-8 py-3 rounded-xl font-bold transition ${
                allSelected
                  ? "bg-green-400 text-green-900 hover:bg-green-300 shadow-lg animate-pulse"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              🚀 企画書を作る！
            </button>
          )}
        </div>

        {/* 全スート完了時のまとめ表示 */}
        {allSelected && (
          <div className="mt-8 max-w-2xl mx-auto bg-white/10 backdrop-blur rounded-2xl p-5">
            <h3 className="text-white font-bold text-center mb-4">📋 選択したカード</h3>
            <div className="grid grid-cols-2 gap-3">
              {SUITS.map((suit) => {
                const card = selectedCards[suit.key];
                return (
                  <div key={suit.key} className="bg-white/10 rounded-xl p-3">
                    <p className="text-green-300 text-xs">{suit.label}</p>
                    <p className="text-white text-sm font-semibold">{card.rank} - {card.title}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
