"use client";

/**
 * /card-game - カードゲーム入口ページ
 * チーム名とメンバー名を入力してゲームを開始する
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CardGameTopPage() {
  const router = useRouter();
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [error, setError] = useState("");

  // 「ゲーム開始」ボタンを押したとき
  const handleStart = () => {
    // 入力チェック
    if (!teamName.trim()) {
      setError("チーム名を入力してください");
      return;
    }
    if (!members.trim()) {
      setError("メンバー名を入力してください");
      return;
    }

    // チーム情報をブラウザのlocalStorageに保存（次のページで使う）
    localStorage.setItem("cardGame_teamName", teamName.trim());
    localStorage.setItem("cardGame_members", members.trim());

    // カード選択ページに移動
    router.push("/card-game/select");
  };

  return (
    // 全画面：緑のカードテーブル風の背景
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: "radial-gradient(ellipse at center, #1a5c2e 0%, #0d3b1e 60%, #071f10 100%)",
      }}
    >
      {/* カードゲームのロゴと開始フォーム */}
      <div className="w-full max-w-md">
        {/* タイトルエリア */}
        <div className="text-center mb-8">
          {/* デコレーションカード */}
          <div className="flex justify-center gap-2 mb-4">
            {["♥", "♦", "♣", "♠"].map((suit, i) => (
              <div
                key={i}
                className="w-12 h-16 bg-white rounded-lg shadow-lg flex items-center justify-center text-2xl"
                style={{
                  color: i < 2 ? "#ef4444" : "#1f2937",
                  transform: `rotate(${(i - 1.5) * 5}deg)`,
                }}
              >
                {suit}
              </div>
            ))}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">
            🃏 PBLカードゲーム
          </h1>
          <p className="text-green-200 text-sm">
            配送業・物流人材不足テーマ
          </p>
        </div>

        {/* 入力フォームカード */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
            チーム情報を入力してスタート！
          </h2>

          {/* チーム名入力 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              チーム名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => {
                setTeamName(e.target.value);
                setError(""); // 入力のたびにエラーをクリア
              }}
              placeholder="例) チームA、配送革命チーム"
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-gray-800"
              maxLength={50}
            />
          </div>

          {/* メンバー名入力 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              メンバー名 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={members}
              onChange={(e) => {
                setMembers(e.target.value);
                setError("");
              }}
              placeholder={"例)\n山田太郎\n鈴木花子\n田中一郎"}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-gray-800 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">メンバー全員の名前を改行で区切って入力</p>
          </div>

          {/* エラーメッセージ */}
          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* ゲーム開始ボタン */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-green-700 text-white text-lg font-bold rounded-xl shadow-lg hover:from-green-700 hover:to-green-800 transition-all active:scale-95"
          >
            🎮 ゲームスタート！
          </button>

          {/* ゲームの説明 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600">
            <p className="font-semibold mb-1">🎯 ゲームの流れ</p>
            <p>① 各スートからカードを1枚選ぶ（4枚）</p>
            <p>② ビジネスプランを入力する</p>
            <p>③ AIがプランを改善・厳格評価！</p>
          </div>
        </div>
      </div>
    </div>
  );
}
