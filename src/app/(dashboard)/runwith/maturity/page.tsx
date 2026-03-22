/**
 * /runwith/maturity - IT運用成熟度診断ページ（Sprint #5）
 *
 * 中堅企業のIT担当者向けに、5つの領域（インシデント管理・変更管理・
 * 監視・ドキュメント・セキュリティ）を5段階で診断する。
 * 結果は ScenarioContext に保存され、AIアシスタントが成熟度に合わせた
 * アドバイスを行えるようになる。
 */

"use client";

import { useState, useEffect } from "react";
import { useScenario } from "@/contexts/ScenarioContext";
import Link from "next/link";

// Notion保存ボタンの状態管理用の型
type SaveStatus = "idle" | "saving" | "saved" | "error";

// ─── 定数：成熟度レベルの定義 ────────────────────────────────

const MATURITY_LEVELS = [
  { level: 1, label: "初期",   color: "bg-red-500",    textColor: "text-red-600",    desc: "場当たり対応。担当者の経験に依存している" },
  { level: 2, label: "反復",   color: "bg-orange-500", textColor: "text-orange-600", desc: "一部に標準手順があるが、徹底されていない" },
  { level: 3, label: "定義",   color: "bg-yellow-500", textColor: "text-yellow-600", desc: "プロセスが文書化・定義されている" },
  { level: 4, label: "管理",   color: "bg-blue-500",   textColor: "text-blue-600",   desc: "数値で計測・管理されており、予測可能" },
  { level: 5, label: "最適化", color: "bg-green-500",  textColor: "text-green-600",  desc: "継続的改善のサイクルが回っている" },
];

// ─── 定数：診断質問 ───────────────────────────────────────────

type Question = {
  id: string;
  area: string;        // 診断領域
  areaIcon: string;
  text: string;        // 質問文
  options: { label: string; score: number }[];
};

const QUESTIONS: Question[] = [
  // ① インシデント管理
  {
    id: "q1",
    area: "インシデント管理",
    areaIcon: "🚨",
    text: "システム障害が発生した際、対応手順はどうなっていますか？",
    options: [
      { label: "担当者が個人の判断で対応している",             score: 1 },
      { label: "簡単なチェックリストはあるが徹底されていない", score: 2 },
      { label: "手順書があり、基本的に従っている",             score: 3 },
      { label: "手順書に沿って対応し、事後に記録・振り返りをしている", score: 4 },
      { label: "過去のデータを分析し、障害予防の仕組みがある", score: 5 },
    ],
  },
  {
    id: "q2",
    area: "インシデント管理",
    areaIcon: "🚨",
    text: "障害の検知はどのように行っていますか？",
    options: [
      { label: "ユーザーや担当者が気づいてから対応する",       score: 1 },
      { label: "一部のシステムだけ監視ツールを使っている",     score: 2 },
      { label: "主要なシステムはすべて監視している",           score: 3 },
      { label: "監視 + アラートで自動通知される",             score: 4 },
      { label: "AIや予兆検知で障害前に自動対処できる",         score: 5 },
    ],
  },
  // ② 変更管理
  {
    id: "q3",
    area: "変更管理",
    areaIcon: "🔄",
    text: "システムへの変更・更新作業はどのように管理していますか？",
    options: [
      { label: "必要になったら都度実施する（計画なし）",       score: 1 },
      { label: "作業前に担当者間で口頭確認している",           score: 2 },
      { label: "変更申請・承認フローが一部ある",               score: 3 },
      { label: "すべての変更を記録・承認し、影響範囲を評価している", score: 4 },
      { label: "変更リスクを自動評価し、テスト後に展開している", score: 5 },
    ],
  },
  {
    id: "q4",
    area: "変更管理",
    areaIcon: "🔄",
    text: "緊急の変更（セキュリティパッチ適用など）はどう対応しますか？",
    options: [
      { label: "気づいた時に対応する",                         score: 1 },
      { label: "担当者の判断で緊急対応する",                   score: 2 },
      { label: "緊急変更の手順はあるが、記録が不十分",         score: 3 },
      { label: "緊急変更でも記録・承認を簡略化した形で実施",   score: 4 },
      { label: "自動化された緊急パッチ適用と記録の仕組みがある", score: 5 },
    ],
  },
  // ③ 監視・モニタリング
  {
    id: "q5",
    area: "監視・モニタリング",
    areaIcon: "📊",
    text: "サーバーやネットワークのリソース状況（CPU・メモリ等）はどう把握していますか？",
    options: [
      { label: "定期的に手作業で確認している",                 score: 1 },
      { label: "ツールで見られるが、誰も常に見ていない",       score: 2 },
      { label: "定期レポートで月次・週次に確認している",       score: 3 },
      { label: "リアルタイムで監視し、閾値超えでアラートが届く", score: 4 },
      { label: "自動スケーリングや自動対処の仕組みがある",     score: 5 },
    ],
  },
  // ④ ドキュメント管理
  {
    id: "q6",
    area: "ドキュメント管理",
    areaIcon: "📄",
    text: "システム構成やIT手順書はどのように管理されていますか？",
    options: [
      { label: "ドキュメントはほぼない（担当者の頭の中）",     score: 1 },
      { label: "一部あるが、バラバラで最新かどうか不明",       score: 2 },
      { label: "主要なシステムの手順書がある",                 score: 3 },
      { label: "一元管理・定期更新され、誰でも参照できる",     score: 4 },
      { label: "ナレッジベースと連携し、検索・更新が自動化",   score: 5 },
    ],
  },
  {
    id: "q7",
    area: "ドキュメント管理",
    areaIcon: "📄",
    text: "担当者が変わった時の引き継ぎはどうしていますか？",
    options: [
      { label: "ほぼ口頭引き継ぎで、業務が止まることがある",   score: 1 },
      { label: "引き継ぎメモを作るが、品質にばらつきがある",   score: 2 },
      { label: "引き継ぎドキュメントの雛型・手順がある",       score: 3 },
      { label: "標準化された引き継ぎプロセスで問題なく移行できる", score: 4 },
      { label: "引き継ぎ不要なレベルでナレッジが共有されている", score: 5 },
    ],
  },
  // ⑤ セキュリティ対策
  {
    id: "q8",
    area: "セキュリティ対策",
    areaIcon: "🔒",
    text: "情報セキュリティのルール・ポリシーはありますか？",
    options: [
      { label: "特定のルールはなく、担当者任せ",               score: 1 },
      { label: "情報管理のルールはあるが、周知不足",           score: 2 },
      { label: "セキュリティポリシーがあり、定期的に確認している", score: 3 },
      { label: "年1回以上の社員教育と監査を実施している",     score: 4 },
      { label: "継続的な教育・脅威監視・自動対策が整っている", score: 5 },
    ],
  },
  {
    id: "q9",
    area: "セキュリティ対策",
    areaIcon: "🔒",
    text: "サイバー攻撃やデータ漏洩への備えはどうなっていますか？",
    options: [
      { label: "特に対策は考えていない",                       score: 1 },
      { label: "ウイルス対策ソフトは入れている",               score: 2 },
      { label: "バックアップ + 復旧手順がある",               score: 3 },
      { label: "インシデントレスポンス計画を定め、訓練もしている", score: 4 },
      { label: "脅威インテリジェンスを活用し、予防的に対策している", score: 5 },
    ],
  },
];

// 診断領域の一覧（重複なし）
const AREAS = [...new Set(QUESTIONS.map((q) => q.area))];

// ─── メインコンポーネント ─────────────────────────────────────

type Phase = "intro" | "quiz" | "result";

export default function MaturityPage() {
  const { setModule, setRunwithData } = useScenario();

  // ページが表示されたらモジュールを runwith に切り替える
  useEffect(() => {
    setModule("runwith");
  }, []);

  const [phase, setPhase] = useState<Phase>("intro");
  // 回答: { 質問ID → 選択したスコア }
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [currentQ, setCurrentQ] = useState(0); // 現在の質問インデックス
  // Notion保存ステータス
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [savedPageUrl, setSavedPageUrl] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  // ── 回答選択処理 ──
  const selectAnswer = (questionId: string, score: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: score }));
  };

  // ── 次の質問へ ──
  const goNext = () => {
    if (currentQ < QUESTIONS.length - 1) {
      setCurrentQ((prev) => prev + 1);
    } else {
      // 全問回答 → 結果計算
      calcAndShowResult();
    }
  };

  // ── 結果計算 ──
  const calcAndShowResult = () => {
    // 領域別スコアを集計する
    const areaScores: Record<string, { total: number; count: number }> = {};
    for (const q of QUESTIONS) {
      if (!areaScores[q.area]) areaScores[q.area] = { total: 0, count: 0 };
      const score = answers[q.id] ?? 1;
      areaScores[q.area].total += score;
      areaScores[q.area].count += 1;
    }

    // 各領域の平均スコア（小数点1位）を計算
    const areaAvg: Record<string, number> = {};
    for (const area of AREAS) {
      const { total, count } = areaScores[area];
      areaAvg[area] = Math.round((total / count) * 10) / 10;
    }

    // 全体の合計・最大スコア
    const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
    const maxScore = QUESTIONS.length * 5;

    // 成熟度レベルを算出（合計スコアを最大スコアで割った比率で決める）
    const ratio = totalScore / maxScore;
    let maturityLevel = 1;
    if (ratio >= 0.85) maturityLevel = 5;
    else if (ratio >= 0.68) maturityLevel = 4;
    else if (ratio >= 0.50) maturityLevel = 3;
    else if (ratio >= 0.32) maturityLevel = 2;
    else maturityLevel = 1;

    const levelInfo = MATURITY_LEVELS[maturityLevel - 1];

    // スコアが最も低い2領域を「弱点領域」とする
    const sortedAreas = AREAS.slice().sort((a, b) => areaAvg[a] - areaAvg[b]);
    const weakAreas = sortedAreas.slice(0, 2);

    // ScenarioContext に保存（AIアシスタントが参照する）
    setRunwithData({
      maturityLevel,
      maturityLabel: levelInfo.label,
      totalScore,
      maxScore,
      areaScores: areaAvg,
      weakAreas,
      completedAt: new Date().toISOString(),
    });

    setPhase("result");
  };

  // ── Notionへ保存 ──
  const saveToNotion = async () => {
    setSaveStatus("saving");
    setSaveErrorMsg(null);
    try {
      const response = await fetch("/api/notion/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saveType: "runwith-maturity",
          data: {
            maturityLevel,
            maturityLabel: levelInfo.label,
            totalScore,
            maxScore,
            areaScores: areaAvgForResult,
            weakAreas,
            completedAt: new Date().toISOString(),
          },
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      setSaveStatus("saved");
      setSavedPageUrl(result.pageUrl);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error("Notion保存エラー:", msg);
      setSaveErrorMsg(msg);
      setSaveStatus("error");
    }
  };

  // ── 現在の質問が回答済みかチェック ──
  const currentQuestion = QUESTIONS[currentQ];
  const isAnswered = currentQuestion && answers[currentQuestion.id] !== undefined;

  // ── 結果データの取得（result フェーズのみ） ──
  const totalScore = Object.values(answers).reduce((sum, s) => sum + s, 0);
  const maxScore = QUESTIONS.length * 5;
  const ratio = totalScore / maxScore;
  let maturityLevel = 1;
  if (ratio >= 0.85) maturityLevel = 5;
  else if (ratio >= 0.68) maturityLevel = 4;
  else if (ratio >= 0.50) maturityLevel = 3;
  else if (ratio >= 0.32) maturityLevel = 2;
  const levelInfo = MATURITY_LEVELS[maturityLevel - 1];

  // 領域別平均スコアの計算（result フェーズ用）
  const areaAvgForResult: Record<string, number> = {};
  for (const area of AREAS) {
    const areaQs = QUESTIONS.filter((q) => q.area === area);
    const total = areaQs.reduce((sum, q) => sum + (answers[q.id] ?? 1), 0);
    areaAvgForResult[area] = Math.round((total / areaQs.length) * 10) / 10;
  }
  const sortedAreasForResult = AREAS.slice().sort(
    (a, b) => areaAvgForResult[a] - areaAvgForResult[b]
  );
  const weakAreas = sortedAreasForResult.slice(0, 2);

  // ─── レンダリング ─────────────────────────────────────────

  return (
    // ── ライトビジネストーン：白背景 + slate系テキスト ──
    <div className="min-h-screen bg-slate-50 p-6">
      <div className="max-w-2xl mx-auto">

        {/* ── ヘッダー ── */}
        <div className="mb-6">
          <div className="flex items-center gap-2 text-orange-600 text-sm mb-1 font-medium">
            <span>🔧</span>
            <span>RunWith</span>
            <span className="text-slate-400">/</span>
            <span className="text-slate-500">IT運用成熟度診断</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800">IT運用成熟度診断</h1>
          <p className="text-slate-500 text-sm mt-1">
            自社のIT運用レベルを5段階で診断し、改善の優先課題を明らかにします
          </p>
        </div>

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* イントロ画面 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {phase === "intro" && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-800 mb-4">診断について</h2>

            {/* 5つの診断領域 */}
            <div className="grid grid-cols-1 gap-2 mb-6">
              {[
                { icon: "🚨", label: "インシデント管理", desc: "障害対応・検知体制" },
                { icon: "🔄", label: "変更管理",         desc: "更新・リリースの制御" },
                { icon: "📊", label: "監視・モニタリング", desc: "リソース・稼働状況の把握" },
                { icon: "📄", label: "ドキュメント管理", desc: "手順書・ナレッジの整備" },
                { icon: "🔒", label: "セキュリティ対策", desc: "情報保護・対策の充実度" },
              ].map((area) => (
                <div
                  key={area.label}
                  className="flex items-center gap-3 bg-slate-50 rounded-xl px-4 py-3 border border-slate-100"
                >
                  <span className="text-xl">{area.icon}</span>
                  <div>
                    <p className="text-slate-700 text-sm font-semibold">{area.label}</p>
                    <p className="text-slate-400 text-xs">{area.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
              <p className="text-orange-700 text-sm">
                📋 全 <strong>{QUESTIONS.length}問</strong>、所要時間は約5分です。
                各質問で、現状に最も近い選択肢を選んでください。
              </p>
            </div>

            <button
              onClick={() => setPhase("quiz")}
              className="w-full py-3.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-base transition-all shadow-sm"
            >
              診断を開始する →
            </button>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 質問画面 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {phase === "quiz" && currentQuestion && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            {/* 進捗バー */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                <span className="font-medium">
                  {currentQuestion.areaIcon} {currentQuestion.area}
                </span>
                <span>{currentQ + 1} / {QUESTIONS.length}</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5">
                <div
                  className="bg-orange-500 h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQ + 1) / QUESTIONS.length) * 100}%` }}
                />
              </div>
            </div>

            {/* 質問文 */}
            <h2 className="text-slate-800 font-bold text-base mb-5 leading-relaxed">
              Q{currentQ + 1}. {currentQuestion.text}
            </h2>

            {/* 選択肢 */}
            <div className="space-y-2 mb-6">
              {currentQuestion.options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.score;
                return (
                  <button
                    key={opt.score}
                    onClick={() => selectAnswer(currentQuestion.id, opt.score)}
                    className={`w-full text-left px-4 py-3 rounded-xl border text-sm transition-all ${
                      isSelected
                        ? "bg-orange-50 border-orange-400 text-orange-800 font-semibold"
                        : "bg-white border-slate-200 text-slate-600 hover:border-orange-300 hover:bg-orange-50/50"
                    }`}
                  >
                    <span className={`text-xs mr-2 font-mono ${isSelected ? "text-orange-500" : "text-slate-400"}`}>
                      Lv.{opt.score}
                    </span>
                    {opt.label}
                  </button>
                );
              })}
            </div>

            {/* ナビゲーションボタン */}
            <div className="flex gap-3">
              {currentQ > 0 && (
                <button
                  onClick={() => setCurrentQ((prev) => prev - 1)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm transition-colors"
                >
                  ← 前の質問
                </button>
              )}
              <button
                onClick={goNext}
                disabled={!isAnswered}
                className={`flex-1 py-2.5 rounded-xl font-bold text-sm transition-all ${
                  isAnswered
                    ? "bg-orange-600 hover:bg-orange-700 text-white shadow-sm"
                    : "bg-slate-100 text-slate-400 cursor-not-allowed"
                }`}
              >
                {currentQ < QUESTIONS.length - 1 ? "次の質問 →" : "診断結果を見る"}
              </button>
            </div>
          </div>
        )}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {/* 結果画面 */}
        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {phase === "result" && (
          <div className="space-y-4">
            {/* 総合レベルカード */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm text-center">
              <p className="text-slate-500 text-sm mb-2">あなたのIT運用成熟度</p>
              <div className="text-5xl font-black text-slate-800 mb-1">
                Lv.{maturityLevel}
              </div>
              <div className={`text-xl font-bold mb-2 ${levelInfo.textColor}`}>
                {levelInfo.label}
              </div>
              <p className="text-slate-500 text-sm">{levelInfo.desc}</p>

              {/* スコアバー */}
              <div className="mt-5">
                <div className="flex justify-between text-xs text-slate-400 mb-1.5">
                  <span>スコア</span>
                  <span className="font-medium">{totalScore} / {maxScore}点</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5">
                  <div
                    className={`${levelInfo.color} h-2.5 rounded-full transition-all duration-700`}
                    style={{ width: `${(totalScore / maxScore) * 100}%` }}
                  />
                </div>
              </div>

              {/* 5段階のレベルインジケーター */}
              <div className="flex gap-1 mt-4">
                {MATURITY_LEVELS.map((lv) => (
                  <div
                    key={lv.level}
                    className={`flex-1 py-1.5 rounded text-xs font-bold ${
                      lv.level <= maturityLevel
                        ? `${lv.color} text-white`
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {lv.level}
                  </div>
                ))}
              </div>
            </div>

            {/* 領域別スコア */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-slate-800 font-bold mb-4">📊 領域別スコア</h3>
              <div className="space-y-3">
                {AREAS.map((area) => {
                  const areaQ = QUESTIONS.find((q) => q.area === area);
                  const avg = areaAvgForResult[area];
                  const isWeak = weakAreas.includes(area);
                  return (
                    <div key={area}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className={`flex items-center gap-1.5 ${isWeak ? "text-red-600" : "text-slate-600"}`}>
                          {areaQ?.areaIcon} {area}
                          {isWeak && (
                            <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded font-medium">
                              要改善
                            </span>
                          )}
                        </span>
                        <span className="text-slate-400 text-xs font-mono">{avg} / 5.0</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5">
                        <div
                          className={`${isWeak ? "bg-red-400" : "bg-orange-400"} h-1.5 rounded-full transition-all`}
                          style={{ width: `${(avg / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 改善ポイント */}
            <div className="bg-white rounded-2xl p-6 border border-orange-200 shadow-sm">
              <h3 className="text-slate-800 font-bold mb-3">🎯 優先的に改善すべき領域</h3>
              <div className="space-y-2">
                {weakAreas.map((area, i) => {
                  const areaQ = QUESTIONS.find((q) => q.area === area);
                  return (
                    <div key={area} className="flex items-center gap-3 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
                      <span className="text-orange-600 font-bold text-sm w-6">#{i + 1}</span>
                      <span className="text-lg">{areaQ?.areaIcon}</span>
                      <span className="text-slate-700 text-sm font-semibold">{area}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* AIアシスタントへの誘導バナー */}
            <div className="bg-white rounded-2xl p-5 border border-blue-200 shadow-sm">
              <p className="text-slate-800 text-sm font-semibold mb-1">
                🤖 AIアシスタントに詳しく聞いてみる
              </p>
              <p className="text-slate-500 text-xs mb-3">
                Lv.{maturityLevel}「{levelInfo.label}」段階での具体的な改善方法を、
                AIアシスタントが提案します。右側のチャットパネルを開いてください。
              </p>
              <div className="bg-blue-50 rounded-lg px-3 py-2 text-xs text-blue-700 border border-blue-100">
                💡 おすすめの質問例：
                「{weakAreas[0]}をLv.{maturityLevel}から上げるには何から始めればいいですか？」
              </div>
            </div>

            {/* Notion保存ボタン */}
            <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm">
              <p className="text-slate-600 text-sm font-semibold mb-3">
                📝 診断結果をNotionに保存する
              </p>
              {saveStatus === "idle" && (
                <button
                  onClick={saveToNotion}
                  className="w-full py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm transition-all shadow-sm"
                >
                  Notionに保存する
                </button>
              )}
              {saveStatus === "saving" && (
                <div className="flex items-center justify-center gap-2 py-2.5 text-slate-500 text-sm">
                  <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                  保存中...
                </div>
              )}
              {saveStatus === "saved" && savedPageUrl && (
                <div className="space-y-2">
                  <p className="text-emerald-600 text-sm font-semibold text-center">✅ Notionに保存しました</p>
                  <a
                    href={savedPageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block w-full py-2 rounded-xl border border-emerald-300 text-emerald-600 text-sm text-center hover:bg-emerald-50 transition-colors"
                  >
                    🔗 Notionで開く
                  </a>
                </div>
              )}
              {saveStatus === "error" && (
                <div className="space-y-2">
                  <p className="text-red-500 text-sm text-center">❌ 保存に失敗しました</p>
                  {saveErrorMsg && (
                    <p className="text-red-500 text-xs bg-red-50 border border-red-100 rounded px-2 py-1 break-all">
                      {saveErrorMsg}
                    </p>
                  )}
                  <button
                    onClick={saveToNotion}
                    className="w-full py-2 rounded-xl border border-red-300 text-red-500 text-sm hover:bg-red-50 transition-colors"
                  >
                    再試行する
                  </button>
                </div>
              )}
            </div>

            {/* もう一度診断・トップへ */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setAnswers({});
                  setCurrentQ(0);
                  setPhase("intro");
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-50 text-sm transition-colors"
              >
                🔄 もう一度診断する
              </button>
              <Link href="/" className="flex-1">
                <button className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-sm font-semibold transition-colors">
                  🏠 ホームへ
                </button>
              </Link>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
