/**
 * /well-being-quest - Well-Being QUEST トップページ（v4・限界自治体版）
 *
 * 人口1万人・高齢化率50%の自治体が持続可能な街を設計するシリアスゲーム。
 * 縮退をテーマにした行政向けカードゲーム。
 *
 * ゲームの流れ:
 *  1. 課題カード選択 → どんな住民課題を解決するか（高難度ほど高インパクト）
 *  2. ペルソナカード選択 → 支援対象の住民グループ（高齢者・移住者etc）
 *  3. パートナーカード選択（Buy=民間委託）→ 外部に委託するサービス
 *  4. アクション確認（Make=直営）→ 自治体が直接担う業務が自動決定
 *  結果: 財政収支・住民満足度・自治体ランクを評価
 */

"use client";

import { useRouter } from "next/navigation";

// ── ゲームの流れを説明するステップデータ ──────────────────────────
const GAME_STEPS = [
  {
    step: 1,
    icon: "♦",
    iconColor: "text-red-400",
    title: "課題を選ぶ",
    desc: "どんな住民課題を解決するか選ぶ。難しい課題ほど住民への影響が大きく、評価も高くなる。",
  },
  {
    step: 2,
    icon: "♥",
    iconColor: "text-pink-400",
    title: "ペルソナを選ぶ",
    desc: "支援対象の住民グループを選ぶ（高齢者・移住者・子育て世帯など）。多様なほど評価が上がる。",
  },
  {
    step: 3,
    icon: "♣",
    iconColor: "text-green-400",
    title: "民間委託を選ぶ（Buy）",
    desc: "民間や他自治体に委託するサービスを選ぶ。委託すると変動コストが上がるが、初期負担は下がる。",
  },
  {
    step: 4,
    icon: "♠",
    iconColor: "text-blue-400",
    title: "直営業務を確認（Make）",
    desc: "自治体が直接担う業務が自動で決まる。初期費用はかかるが、住民サービスの質を高く維持できる。",
  },
];

export default function WellBeingQuestTopPage() {
  const router = useRouter();

  return (
    // 背景: 屋久島・自然・持続可能性をイメージした深い緑系グラデーション
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at top, #0c2218 0%, #0a1e14 50%, #060f0a 100%)",
      }}
    >
      <div className="w-full max-w-lg">

        {/* ── タイトルエリア ── */}
        <div className="text-center mb-6">
          {/* トランプカード4枚のデコレーション */}
          <div className="flex justify-center gap-2 mb-5">
            {GAME_STEPS.map((s, i) => (
              <div
                key={i}
                className="flex flex-col items-center"
                style={{ transform: `rotate(${(i - 1.5) * 5}deg)` }}
              >
                <div className="w-12 h-16 bg-green-950 border border-green-700 rounded-lg shadow-lg flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${s.iconColor}`}>
                    {s.icon}
                  </span>
                  <span className="text-green-600 text-xs mt-0.5 font-normal leading-tight text-center px-0.5">
                    {s.title.split("（")[0].replace("を選ぶ", "").replace("を確認", "")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* タイトル */}
          <h1 className="text-3xl font-bold text-white mb-1">
            🌿 Well-Being QUEST
          </h1>
          <p className="text-green-400 text-sm mb-1">
            限界自治体版 カードゲーム v4
          </p>
          <p className="text-green-700 text-xs">
            人口1万人・高齢化率50%の自治体で持続可能な街を設計する
          </p>
        </div>

        {/* ── メインカード ── */}
        <div className="bg-green-950 border border-green-800 rounded-2xl shadow-2xl p-6">

          {/* ゲームコンセプト */}
          <div className="bg-green-900/50 border border-green-700 rounded-xl p-4 mb-5 text-center">
            <p className="text-white text-sm font-semibold leading-relaxed">
              縮退する自治体でも、サービスは維持できる！
            </p>
            <p className="text-green-400 text-xs mt-1 leading-relaxed">
              4枚のカードを選ぶだけで、<br />
              自動的に<span className="text-yellow-400 font-semibold">財政収支・住民満足度・自治体ランク</span>が評価される。
            </p>
          </div>

          {/* シナリオ設定 */}
          <div className="bg-green-900/30 border border-green-800 rounded-xl p-3 mb-5">
            <p className="text-xs font-bold text-green-400 mb-2">📍 ゲームの舞台（屋久島モデル）</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "人口", value: "1.2万人" },
                { label: "高齢化率", value: "39%" },
                { label: "財政力指数", value: "0.18" },
                { label: "職員数", value: "約12名" },
              ].map((item) => (
                <div key={item.label} className="flex justify-between">
                  <span className="text-green-600 text-xs">{item.label}</span>
                  <span className="text-white text-xs font-semibold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ゲームの流れ */}
          <h2 className="text-xs font-bold text-green-500 uppercase tracking-wide mb-3">
            📋 ゲームの流れ
          </h2>

          <div className="space-y-3 mb-6">
            {GAME_STEPS.map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                {/* ステップ番号 */}
                <div className="w-6 h-6 rounded-full bg-green-800 flex items-center justify-center text-xs font-bold text-green-300 flex-shrink-0 mt-0.5">
                  {s.step}
                </div>
                {/* スートとタイトル・説明 */}
                <div className="flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-base ${s.iconColor}`}>{s.icon}</span>
                    <span className="text-white text-sm font-semibold">
                      {s.title}
                    </span>
                  </div>
                  <p className="text-green-500 text-xs mt-0.5 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Make（直営） / Buy（民間委託）の説明 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-900/50 border border-blue-700 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🏛️</div>
              <div className="text-blue-300 font-bold text-sm">直営（Make）</div>
              <div className="text-green-600 text-xs mt-1 leading-relaxed">
                自治体が直接担う<br />
                初期費用↑<br />
                サービス品質↑
              </div>
            </div>
            <div className="bg-orange-900/50 border border-orange-700 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🤝</div>
              <div className="text-orange-300 font-bold text-sm">民間委託（Buy）</div>
              <div className="text-green-600 text-xs mt-1 leading-relaxed">
                外部に委託する<br />
                初期費用↓<br />
                変動コスト↑
              </div>
            </div>
          </div>

          {/* ランク説明 */}
          <div className="bg-green-900/30 rounded-xl p-3 mb-6">
            <p className="text-xs text-green-500 mb-2 font-semibold">
              🏆 最終ランクは回収期間と財政健全度で決まる
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { g: "S", color: "bg-yellow-400 text-black", hint: "3ヶ月未満+50%↑" },
                { g: "A", color: "bg-orange-400 text-black", hint: "6ヶ月未満+40%↑" },
                { g: "B", color: "bg-blue-400 text-white", hint: "12ヶ月未満+30%↑" },
                { g: "C", color: "bg-green-500 text-white", hint: "24ヶ月未満" },
                { g: "D", color: "bg-gray-500 text-white", hint: "財政赤字" },
              ].map((item) => (
                <div key={item.g} className="flex items-center gap-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${item.color}`}>
                    {item.g}
                  </span>
                  <span className="text-green-700 text-xs">{item.hint}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ゲーム開始ボタン */}
          <button
            onClick={() => router.push("/well-being-quest/select")}
            className="w-full py-4 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white text-lg font-bold rounded-xl shadow-lg transition-all duration-200 active:scale-95"
          >
            🌿 ゲームスタート！
          </button>
        </div>

        {/* フッター */}
        <p className="text-center text-green-900 text-xs mt-4">
          屋久島モデル × AI診断 × 行政OSと連携
        </p>
      </div>
    </div>
  );
}
