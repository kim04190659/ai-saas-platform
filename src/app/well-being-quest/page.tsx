"use client";

/**
 * /well-being-quest - Well-Being QUEST トップページ
 *
 * ゲームの説明と、チーム名・メンバー名・目標設定を入力してゲームを開始する。
 * ゲームテーマ: 限界自治体（人口10,000人）の公務員として、住民のWell-Beingを高める政策を立案する
 */

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function WellBeingQuestTopPage() {
  const router = useRouter();

  // フォームの入力値を管理する変数（useState = Reactの状態管理）
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [targetPopulation, setTargetPopulation] = useState(12000); // 目標人口（初期値12,000人）
  const [targetWellBeing, setTargetWellBeing] = useState(75);      // 目標WB指数（初期値75点）
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
    if (targetPopulation < 10001 || targetPopulation > 20000) {
      setError("目標人口は10,001〜20,000人の間で設定してください");
      return;
    }
    if (targetWellBeing < 40 || targetWellBeing > 100) {
      setError("目標Well-Being指数は40〜100の間で設定してください");
      return;
    }

    // チーム情報をブラウザのlocalStorageに保存（次のページで使う）
    // ゲームのデータは "wbq_" プレフィックスを付けて保存する
    localStorage.setItem("wbq_teamName", teamName.trim());
    localStorage.setItem("wbq_members", members.trim());
    localStorage.setItem("wbq_targetPopulation", String(targetPopulation));
    localStorage.setItem("wbq_targetWellBeing", String(targetWellBeing));

    // カード選択ページに移動
    router.push("/well-being-quest/select");
  };

  return (
    // 全画面: 秋の山里・限界自治体をイメージした深い緑〜茶のグラデーション背景
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at top, #2d4a22 0%, #1a3318 40%, #0f2010 100%)",
      }}
    >
      <div className="w-full max-w-lg">

        {/* タイトルエリア */}
        <div className="text-center mb-6">
          {/* トランプマーク4つ（スートカードのデコレーション）*/}
          <div className="flex justify-center gap-2 mb-4">
            {[
              { suit: "♠", label: "ペルソナ", color: "#f0f0f0" },
              { suit: "♣", label: "課題", color: "#f0f0f0" },
              { suit: "♦", label: "パートナー", color: "#ef4444" },
              { suit: "♥", label: "アクション", color: "#ef4444" },
            ].map((item, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ transform: `rotate(${(i - 1.5) * 4}deg)` }}
              >
                <div
                  className="w-12 h-16 bg-white rounded-lg shadow-lg flex flex-col items-center justify-center text-lg font-bold"
                  style={{ color: item.color }}
                >
                  {item.suit}
                  <span className="text-gray-400 text-xs font-normal">{item.label}</span>
                </div>
              </div>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-1">
            🏘️ Well-Being QUEST
          </h1>
          <p className="text-green-300 text-sm mb-1">
            限界自治体の公務員として、住民のWell-Beingを守る政策を立案する
          </p>
          <p className="text-green-400 text-xs">
            起点: 人口10,000人 / 高齢化率50%以上の限界自治体
          </p>
        </div>

        {/* 入力フォームカード */}
        <div className="bg-white/95 backdrop-blur rounded-2xl shadow-2xl p-6">
          <h2 className="text-base font-bold text-gray-800 mb-4 text-center">
            チーム情報と目標を設定してスタート！
          </h2>

          {/* チーム名入力 */}
          <div className="mb-4">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              チーム名 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={teamName}
              onChange={(e) => { setTeamName(e.target.value); setError(""); }}
              placeholder="例) チームA、まちの未来チーム"
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
              onChange={(e) => { setMembers(e.target.value); setError(""); }}
              placeholder={"例)\n山田太郎\n鈴木花子\n田中一郎"}
              rows={3}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-green-500 focus:outline-none text-gray-800 resize-none"
            />
            <p className="text-xs text-gray-400 mt-1">メンバー全員の名前を改行で区切って入力</p>
          </div>

          {/* 目標設定エリア */}
          <div className="mb-4 p-4 bg-amber-50 rounded-xl border border-amber-200">
            <p className="text-sm font-bold text-amber-800 mb-3">
              🎯 10年後の目標を設定する（起点: 人口10,000人、WB指数 50点）
            </p>

            {/* 目標人口 */}
            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                目標人口: <span className="text-green-700 font-bold">{targetPopulation.toLocaleString()}人</span>
              </label>
              <input
                type="range"
                min={10500}
                max={20000}
                step={500}
                value={targetPopulation}
                onChange={(e) => { setTargetPopulation(Number(e.target.value)); setError(""); }}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>10,500人</span>
                <span>20,000人</span>
              </div>
            </div>

            {/* 目標Well-Being指数 */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                目標Well-Being指数: <span className="text-green-700 font-bold">{targetWellBeing}点</span>
              </label>
              <input
                type="range"
                min={40}
                max={100}
                step={5}
                value={targetWellBeing}
                onChange={(e) => { setTargetWellBeing(Number(e.target.value)); setError(""); }}
                className="w-full accent-green-600"
              />
              <div className="flex justify-between text-xs text-gray-400">
                <span>40点（C以上）</span>
                <span>100点（S確定）</span>
              </div>
            </div>
          </div>

          {/* エラーメッセージ表示 */}
          {error && (
            <p className="text-red-500 text-sm mb-4 bg-red-50 rounded-lg px-3 py-2">
              ⚠️ {error}
            </p>
          )}

          {/* ゲーム開始ボタン */}
          <button
            onClick={handleStart}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-emerald-700 text-white text-lg font-bold rounded-xl shadow-lg hover:from-green-700 hover:to-emerald-800 transition-all active:scale-95"
          >
            🎮 政策立案スタート！
          </button>

          {/* ゲームの流れ説明 */}
          <div className="mt-4 p-3 bg-gray-50 rounded-xl text-xs text-gray-600 space-y-1">
            <p className="font-semibold text-gray-700 mb-1">📋 ゲームの流れ（約90分）</p>
            <p>① 4枚のカードを1枚ずつ選ぶ（ペルソナ・課題・パートナー・アクション）</p>
            <p>② 4枚のカードを組み合わせた政策提案書を作成する</p>
            <p>③ AIが政策を評価・Well-Being指数と人口シミュレーションを算出</p>
            <p>④ チームで発表・ディスカッション</p>
          </div>
        </div>

        {/* フッター注記 */}
        <p className="text-center text-green-600 text-xs mt-3">
          Powered by Groq AI × Notion DB
        </p>
      </div>
    </div>
  );
}
