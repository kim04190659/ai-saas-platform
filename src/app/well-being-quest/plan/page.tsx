"use client";

/**
 * /well-being-quest/plan - 政策提案書入力ページ
 *
 * 選択した4枚のカードを確認しながら、政策提案の文章を入力する。
 * 入力後に「AIに評価してもらう」ボタンを押すと、
 * Groq AI（llama-3.3-70b）がWell-Being指数・人口シミュレーション・ランクを算出する。
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// ===== 型定義 =====

// localStorageに保存されたカード選択データの型
type SelectedCard = {
  title: string;
  description: string;
  cardName: string;
  rank: string;
};

type SelectedCards = {
  persona: SelectedCard;
  problem: SelectedCard;
  partner: SelectedCard;
  action: SelectedCard;
};

// ===== スート表示設定 =====
const SUIT_CONFIG = [
  {
    role: "persona" as const,
    symbol: "♠",
    label: "ペルソナ",
    subtitle: "誰の課題に取り組むか",
    borderColor: "border-gray-500/50",
    bgColor: "bg-gray-800/40",
    textColor: "text-gray-300",
  },
  {
    role: "problem" as const,
    symbol: "♣",
    label: "課題・問題",
    subtitle: "何が起きているか",
    borderColor: "border-emerald-500/50",
    bgColor: "bg-emerald-900/30",
    textColor: "text-emerald-300",
  },
  {
    role: "partner" as const,
    symbol: "♦",
    label: "パートナー",
    subtitle: "誰と組むか",
    borderColor: "border-amber-500/50",
    bgColor: "bg-amber-900/30",
    textColor: "text-amber-300",
  },
  {
    role: "action" as const,
    symbol: "♥",
    label: "アクション",
    subtitle: "何をするか",
    borderColor: "border-rose-500/50",
    bgColor: "bg-rose-900/30",
    textColor: "text-rose-300",
  },
];

// ===== 入力ガイド（政策提案書のひな型） =====
const PLAN_PLACEHOLDER = `【政策提案のひな型（自由に書き換えてください）】

■ 政策タイトル:
  例）○○連携による□□支援プログラム

■ 政策の目的・背景:
  （選択したペルソナ・課題カードをもとに説明）

■ 具体的な施策内容:
  1. ...
  2. ...
  3. ...

■ パートナーとの連携方法:
  （選択したパートナーカードをどう活用するか）

■ 期待する効果:
  ・住民のWell-Being改善（特にどの指標か）
  ・5〜10年後の人口への影響

■ 実施スケジュール（おおよそ）:
  1年目: ...
  3年目: ...
  5〜10年目: ...`;

// ===== メインコンポーネント =====

export default function WBQPlanPage() {
  const router = useRouter();

  // フォーム状態
  const [planText, setPlanText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // localStorageから読み込むデータ
  const [teamName, setTeamName] = useState("");
  const [members, setMembers] = useState("");
  const [targetPopulation, setTargetPopulation] = useState(12000);
  const [targetWellBeing, setTargetWellBeing] = useState(75);
  const [selectedCards, setSelectedCards] = useState<SelectedCards | null>(null);

  // ページ読み込み時にlocalStorageから情報を復元
  useEffect(() => {
    const savedTeam = localStorage.getItem("wbq_teamName") ?? "";
    const savedMembers = localStorage.getItem("wbq_members") ?? "";
    const savedPop = Number(localStorage.getItem("wbq_targetPopulation") ?? "12000");
    const savedWB = Number(localStorage.getItem("wbq_targetWellBeing") ?? "75");
    const savedCards = localStorage.getItem("wbq_selectedCards");

    setTeamName(savedTeam);
    setMembers(savedMembers);
    setTargetPopulation(savedPop);
    setTargetWellBeing(savedWB);

    if (savedCards) {
      try {
        setSelectedCards(JSON.parse(savedCards));
      } catch {
        // パース失敗なら選択ページへ戻す
        router.push("/well-being-quest/select");
      }
    } else {
      // カードが未選択なら選択ページへ
      router.push("/well-being-quest/select");
    }
  }, [router]);

  // ===== AI評価送信 =====
  async function handleSubmit() {
    if (!planText.trim()) {
      setError("政策提案の内容を入力してください");
      return;
    }
    if (!selectedCards) {
      setError("カードが選択されていません。選択ページに戻ってください。");
      return;
    }

    setLoading(true);
    setError("");

    try {
      // Groq AI評価APIにリクエスト
      const res = await fetch("/api/well-being-quest/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teamName,
          members,
          targetPopulation,
          targetWellBeing,
          selectedCards,
          planText: planText.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error ?? "AI評価に失敗しました");
      }

      const aiResult = await res.json();

      // 結果をlocalStorageに保存して結果ページへ
      localStorage.setItem("wbq_aiResult", JSON.stringify(aiResult));
      localStorage.setItem("wbq_planText", planText.trim());

      router.push("/well-being-quest/result");
    } catch (err) {
      console.error("評価エラー:", err);
      setError(err instanceof Error ? err.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  // カードが読み込まれていない間は何も表示しない
  if (!selectedCards) return null;

  // ===== レンダリング =====
  return (
    <div
      className="min-h-screen"
      style={{
        background: "radial-gradient(ellipse at top, #1a2f1a 0%, #0f1f0f 50%, #080f08 100%)",
      }}
    >
      {/* ===== ヘッダー ===== */}
      <div className="sticky top-0 z-10 bg-black/60 backdrop-blur border-b border-white/10 px-4 py-3">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-white font-bold text-base">📝 政策提案書を作成する</h1>
            <p className="text-green-400/70 text-xs">
              {teamName} ｜ 目標: 人口{targetPopulation.toLocaleString()}人 / WB指数{targetWellBeing}点
            </p>
          </div>
          <button
            onClick={() => router.push("/well-being-quest/select")}
            className="text-sm text-gray-400 hover:text-white transition"
          >
            ← カード選択に戻る
          </button>
        </div>
      </div>

      {/* ===== メインコンテンツ ===== */}
      <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* ===== 上段: 2カラム（選択カード + 入力フォーム） ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* ── 左側: 選択カードの確認 ── */}
          <div>
            <h2 className="text-green-300 font-bold text-sm mb-3">🃏 選択した4枚のカード</h2>

            <div className="space-y-3">
              {SUIT_CONFIG.map(({ role, symbol, label, subtitle, borderColor, bgColor, textColor }) => {
                const card = selectedCards[role];
                return (
                  <div
                    key={role}
                    className={`border rounded-xl p-3 ${borderColor} ${bgColor}`}
                  >
                    <p className={`text-xs mb-1 ${textColor}`}>
                      {symbol} {label}（{subtitle}）
                    </p>
                    <p className="text-white font-semibold text-sm">
                      {card.rank} ─ {card.title}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5 line-clamp-2">
                      {card.description}
                    </p>
                  </div>
                );
              })}
            </div>

            {/* 目標設定の再確認 */}
            <div className="mt-4 bg-amber-900/30 border border-amber-500/40 rounded-xl p-4">
              <p className="text-amber-300 font-bold text-sm mb-2">🎯 チームの目標（10年後）</p>
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-amber-400/70 text-xs mb-1">目標人口</p>
                  <p className="text-white font-bold text-lg">
                    {targetPopulation.toLocaleString()}人
                  </p>
                  <p className="text-gray-500 text-xs">起点: 10,000人</p>
                </div>
                <div className="bg-black/20 rounded-lg p-3">
                  <p className="text-amber-400/70 text-xs mb-1">目標WB指数</p>
                  <p className="text-white font-bold text-lg">{targetWellBeing}点</p>
                  <p className="text-gray-500 text-xs">起点: 50点</p>
                </div>
              </div>
            </div>

            {/* Well-Being 8指標の説明（参考） */}
            <div className="mt-4 bg-white/5 rounded-xl p-4">
              <p className="text-green-300 text-xs font-bold mb-2">📊 Well-Being 8指標（評価基準）</p>
              <div className="grid grid-cols-2 gap-1 text-xs text-gray-400">
                {[
                  "① 経済的安定",
                  "② 社会的つながり",
                  "③ 健康・医療",
                  "④ 自己決定の自由",
                  "⑤ 助け合い・寛大さ",
                  "⑥ 行政への信頼",
                  "⑦ 安全・安心",
                  "⑧ 自然・住環境",
                ].map((item) => (
                  <p key={item} className="truncate">{item}</p>
                ))}
              </div>
              <p className="text-gray-500 text-xs mt-2">
                各指標12.5点 × 8 = 100点満点でAIが評価します
              </p>
            </div>
          </div>

          {/* ── 右側: 政策提案テキスト入力 ── */}
          <div>
            <h2 className="text-green-300 font-bold text-sm mb-3">✍️ 政策提案の内容を入力する</h2>

            <p className="text-gray-400 text-xs mb-2 leading-relaxed">
              4枚のカードを組み合わせて、限界自治体の住民のWell-Beingを高める政策を考えましょう。
              自由形式で記入してください（200〜400字程度が目安）。
            </p>

            {/* テキストエリア */}
            <textarea
              value={planText}
              onChange={(e) => { setPlanText(e.target.value); setError(""); }}
              placeholder={PLAN_PLACEHOLDER}
              rows={18}
              className="w-full px-4 py-3 bg-gray-900 border-2 border-gray-700 rounded-xl text-white placeholder-gray-600 focus:border-green-500 focus:outline-none resize-none text-sm leading-relaxed"
            />

            {/* 文字数表示 */}
            <div className="flex justify-between items-center mt-1">
              <p className="text-gray-500 text-xs">
                200〜400字程度が評価精度のベストです
              </p>
              <p className={`text-xs ${planText.length < 50 ? "text-red-400" : planText.length < 200 ? "text-yellow-400" : "text-green-400"}`}>
                {planText.length}字
              </p>
            </div>

            {/* ===== エラーメッセージ ===== */}
            {error && (
              <div className="mt-3 bg-red-900/40 border border-red-500/50 rounded-xl px-4 py-3 text-red-200 text-sm">
                ⚠️ {error}
              </div>
            )}

            {/* ===== AI評価ボタン ===== */}
            <button
              onClick={handleSubmit}
              disabled={loading || planText.trim().length < 20}
              className={`w-full mt-4 py-4 rounded-xl text-lg font-bold transition-all ${
                loading
                  ? "bg-gray-600 cursor-not-allowed text-gray-400"
                  : planText.trim().length < 20
                  ? "bg-gray-700 cursor-not-allowed text-gray-500"
                  : "bg-gradient-to-r from-green-600 to-emerald-700 text-white hover:from-green-700 hover:to-emerald-800 shadow-lg shadow-green-900/50"
              }`}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="inline-block animate-spin">⏳</span>
                  AIが政策を評価中...（30〜60秒ほどお待ちください）
                </span>
              ) : (
                "🤖 Groq AIに政策を評価してもらう！"
              )}
            </button>

            {/* 処理中のガイド */}
            {loading && (
              <div className="mt-3 bg-green-900/20 border border-green-500/30 rounded-xl p-4 text-sm">
                <p className="text-green-300 font-bold mb-2">🧠 AIが以下を算出中です...</p>
                <ul className="text-green-400/70 text-xs space-y-1">
                  <li>✓ Well-Being 8指標のスコア（各12.5点）</li>
                  <li>✓ 人口シミュレーション（5年後・10年後・20年後）</li>
                  <li>✓ 目標達成判定（人口・WB指数）</li>
                  <li>✓ 総合ランク（S/A/B/C/D）</li>
                  <li>✓ 強み・課題・次のアクション提案</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* ===== 評価ランクの説明 ===== */}
        <div className="bg-white/5 rounded-xl p-4">
          <p className="text-white font-bold text-sm mb-3">🏆 総合ランク基準</p>
          <div className="grid grid-cols-5 gap-2 text-center text-xs">
            {[
              { rank: "S", desc: "人口増加転換\nWB 85点以上", color: "bg-yellow-500/20 border-yellow-500/50 text-yellow-300" },
              { rank: "A", desc: "人口目標達成\nWB 70点以上", color: "bg-green-500/20 border-green-500/50 text-green-300" },
              { rank: "B", desc: "目標80%達成\nWB 55点以上", color: "bg-blue-500/20 border-blue-500/50 text-blue-300" },
              { rank: "C", desc: "一部改善あり\nWB 40点以上", color: "bg-gray-500/20 border-gray-500/50 text-gray-300" },
              { rank: "D", desc: "効果限定的\nWB 40点未満", color: "bg-red-500/20 border-red-500/50 text-red-300" },
            ].map(({ rank, desc, color }) => (
              <div key={rank} className={`border rounded-xl p-3 ${color}`}>
                <p className="text-2xl font-bold mb-1">{rank}</p>
                <p className="whitespace-pre-line leading-tight">{desc}</p>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
