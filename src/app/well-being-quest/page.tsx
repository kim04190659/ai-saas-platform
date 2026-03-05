/**
 * /well-being-quest - Mission in LOGI-TECH トップページ（v3）
 *
 * ゲームの紹介とルール説明を表示し、
 * 「ゲーム開始」ボタンで /well-being-quest/select に遷移する。
 *
 * v3変更点:
 * - Well-Being QUESTから「Mission in LOGI-TECH」にリブランド
 * - チーム名・目標人口の入力フォームは不要（select画面でゲームが始まる）
 * - Make or Buy のコンセプトを簡単に説明するランディングページ
 */

"use client";

import { useRouter } from "next/navigation";

// ゲームの流れを表示するステップデータ
const GAME_STEPS = [
  {
    step: 1,
    icon: "♦",
    iconColor: "text-red-400",
    title: "課題を選ぶ",
    desc: "どんな社会課題を解決するか選ぶ。難しい課題ほど単価が高くなる。",
  },
  {
    step: 2,
    icon: "♥",
    iconColor: "text-pink-400",
    title: "ペルソナを選ぶ",
    desc: "サービスを届ける相手（ペルソナ）を選ぶ。多いほど市場が広がる。",
  },
  {
    step: 3,
    icon: "♣",
    iconColor: "text-green-400",
    title: "パートナーを選ぶ（Buy）",
    desc: "外部に委託する機能を選ぶ。委託すると変動費が上がるが初期費用は下がる。",
  },
  {
    step: 4,
    icon: "♠",
    iconColor: "text-blue-400",
    title: "アクション確認（Make）",
    desc: "自社でやる機能が自動で決まる。初期費用はかかるが、長期の利益率が上がる。",
  },
];

export default function LogiTechTopPage() {
  const router = useRouter();

  return (
    // 背景: 工業・物流をイメージした深いネイビー系グラデーション
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background:
          "radial-gradient(ellipse at top, #0c1a2e 0%, #0a1628 50%, #060e1a 100%)",
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
                <div className="w-12 h-16 bg-slate-800 border border-slate-600 rounded-lg shadow-lg flex flex-col items-center justify-center">
                  <span className={`text-xl font-bold ${s.iconColor}`}>
                    {s.icon}
                  </span>
                  <span className="text-slate-500 text-xs mt-0.5 font-normal leading-tight text-center px-0.5">
                    {s.title.split("（")[0].replace("を選ぶ", "").replace("確認", "")}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <h1 className="text-3xl font-bold text-white mb-1">
            🏭 Mission in LOGI-TECH
          </h1>
          <p className="text-cyan-400 text-sm mb-1">
            Make or Buy カードゲーム v3
          </p>
          <p className="text-slate-500 text-xs">
            鹿児島高専 物流テーマPBL授業用
          </p>
        </div>

        {/* ── メインカード ── */}
        <div className="bg-slate-800 border border-slate-600 rounded-2xl shadow-2xl p-6">

          {/* ゲームコンセプト */}
          <div className="bg-slate-700 rounded-xl p-4 mb-5 text-center">
            <p className="text-white text-sm font-semibold leading-relaxed">
              物流課題を解決するサービスを設計しよう！
            </p>
            <p className="text-slate-400 text-xs mt-1 leading-relaxed">
              4枚のカードを選ぶだけで、<br />
              自動的に<span className="text-cyan-400 font-semibold">利益・回収期間・ランク</span>が計算される。
            </p>
          </div>

          {/* ゲームの流れ */}
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-3">
            📋 ゲームの流れ
          </h2>

          <div className="space-y-3 mb-6">
            {GAME_STEPS.map((s) => (
              <div key={s.step} className="flex items-start gap-3">
                {/* ステップ番号 */}
                <div className="w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-xs font-bold text-slate-300 flex-shrink-0 mt-0.5">
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
                  <p className="text-slate-400 text-xs mt-0.5 leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Make or Buy の説明 */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-blue-900/50 border border-blue-700 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🔨</div>
              <div className="text-blue-300 font-bold text-sm">Make</div>
              <div className="text-slate-400 text-xs mt-1 leading-relaxed">
                自社でつくる<br />
                初期費用↑<br />
                長期利益率↑
              </div>
            </div>
            <div className="bg-orange-900/50 border border-orange-700 rounded-xl p-3 text-center">
              <div className="text-2xl mb-1">🤝</div>
              <div className="text-orange-300 font-bold text-sm">Buy</div>
              <div className="text-slate-400 text-xs mt-1 leading-relaxed">
                外部に委託する<br />
                初期費用↓<br />
                変動費率↑
              </div>
            </div>
          </div>

          {/* ランク説明 */}
          <div className="bg-slate-700 rounded-xl p-3 mb-6">
            <p className="text-xs text-slate-400 mb-2 font-semibold">
              🏆 最終ランクは回収期間と利益率で決まる
            </p>
            <div className="flex gap-1.5 flex-wrap">
              {[
                { g: "S", color: "bg-yellow-400 text-black", hint: "3ヶ月未満+50%↑" },
                { g: "A", color: "bg-orange-400 text-black", hint: "6ヶ月未満+40%↑" },
                { g: "B", color: "bg-blue-400 text-white", hint: "12ヶ月未満+30%↑" },
                { g: "C", color: "bg-green-500 text-white", hint: "24ヶ月未満" },
                { g: "D", color: "bg-gray-500 text-white", hint: "赤字/24ヶ月以上" },
              ].map((item) => (
                <div key={item.g} className="flex items-center gap-1">
                  <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${item.color}`}>
                    {item.g}
                  </span>
                  <span className="text-slate-500 text-xs">{item.hint}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ゲーム開始ボタン */}
          <button
            onClick={() => router.push("/well-being-quest/select")}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-lg font-bold rounded-xl shadow-lg transition-all duration-200 active:scale-95"
          >
            🚀 ゲームスタート！
          </button>
        </div>

        {/* フッター */}
        <p className="text-center text-slate-600 text-xs mt-4">
          Powered by Notion DB × Next.js on Vercel
        </p>
      </div>
    </div>
  );
}
