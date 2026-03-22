/**
 * ChatPanel - AIチャットパネル（Sprint #4 更新）
 *
 * Sprint #4 変更点:
 * - ScenarioContext を読み込み、現在のモジュール・ゲーム結果・行政データを把握
 * - メッセージ送信時に buildSystemPrompt() で組み立てた文脈をAPIに渡す
 * - パネル上部に現在のモジュール名を表示（どの文脈でAIが動いているか可視化）
 */

"use client";

import { useState } from "react";
import { Send, X, Bot } from "lucide-react";
import { useScenario } from "@/contexts/ScenarioContext";

// モジュールごとの表示設定（アイコンと色）
const MODULE_DISPLAY: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  home:       { label: "ホーム",           icon: "🏠", color: "text-blue-400" },
  "card-game":{ label: "LOGI-TECH",        icon: "🏭", color: "text-cyan-400" },
  gyosei:     { label: "行政OS",           icon: "🏛️", color: "text-green-400" },
  runwith:    { label: "RunWith",          icon: "🔧", color: "text-orange-400" },
};

export default function ChatPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  // ScenarioContext からシステムプロンプト生成関数と現在の状態を取得
  const { currentModule, gameResult, buildSystemPrompt } = useScenario();
  const moduleDisplay = MODULE_DISPLAY[currentModule] ?? MODULE_DISPLAY["home"];

  // メッセージ送信処理
  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    try {
      // Sprint #4: ScenarioContext から組み立てたシステムプロンプトを一緒に送る
      const systemPrompt = buildSystemPrompt();

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: input,
          systemPrompt,          // ← 追加: モジュール・ゲーム結果などの文脈
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "APIエラーが発生しました");
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply ?? "エラー: 応答がありませんでした" },
      ]);
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "エラーが発生しました";
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `❌ ${errorMessage}` },
      ]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 h-screen bg-white border-l border-gray-200 flex flex-col">

      {/* ── ヘッダー ── */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
        <div>
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-blue-600" />
            <h2 className="font-semibold text-sm">RunWith AI</h2>
          </div>
          {/* 現在のモジュール表示 — AIがどの文脈で動いているか可視化 */}
          <div className={`text-xs mt-0.5 flex items-center gap-1 ${moduleDisplay.color}`}>
            <span>{moduleDisplay.icon}</span>
            <span>{moduleDisplay.label}モード</span>
            {/* ゲーム結果がある場合は小さく表示 */}
            {gameResult && (
              <span className="ml-1 bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded text-xs">
                {gameResult.grade}ランク取得済
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onClose}
          className="hover:bg-gray-200 p-2 rounded transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* ── メッセージ一覧 ── */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* 最初のメッセージ（挨拶） */}
        {messages.length === 0 && (
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-sm text-blue-800">
            <p className="font-semibold mb-1">
              {moduleDisplay.icon} {moduleDisplay.label}モードで起動中
            </p>
            <p className="text-xs text-blue-600 leading-relaxed">
              {currentModule === "card-game" &&
                "カードゲームのルール・戦略・Make or Buy の考え方について質問できます。"}
              {currentModule === "gyosei" &&
                "屋久島町の財政・人口・Well-Being指標について質問できます。" +
                (gameResult ? `カードゲーム（${gameResult.grade}ランク）の学びも踏まえて回答します。` : "")}
              {currentModule === "runwith" &&
                "IT運用管理・インシデント対応・成熟度向上について質問できます。"}
              {currentModule === "home" &&
                "RunWithプラットフォームについて何でも質問してください。"}
            </p>
          </div>
        )}

        {/* チャット履歴 */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl text-sm leading-relaxed ${
              msg.role === "user"
                ? "bg-blue-600 text-white ml-8"
                : "bg-gray-100 text-gray-800 mr-8"
            }`}
          >
            {msg.content}
          </div>
        ))}

        {/* ローディング表示 */}
        {loading && (
          <div className="bg-gray-100 text-gray-500 p-3 rounded-xl mr-8 text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
            AIが考えています...
          </div>
        )}
      </div>

      {/* ── 入力欄 ── */}
      <div className="p-4 border-t border-gray-200">
        {/* 現在のモジュールに応じたサジェスト */}
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {currentModule === "card-game" && [
              "Bランクを上げるには？",
              "Make と Buy どちらが有利？",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
            {currentModule === "gyosei" && [
              "財政力指数0.18は低い？",
              "高齢化率を下げる施策は？",
              gameResult ? `${gameResult.grade}ランクの学びを行政に活かすには？` : "屋久島の課題は？",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-2 py-1 rounded-full transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && sendMessage()}
            placeholder="AIに質問する..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
