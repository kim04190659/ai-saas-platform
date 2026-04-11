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

/**
 * シンプルなMarkdownレンダラー
 * AIの応答に含まれる ## / ** / - などを読みやすく表示する
 * 外部ライブラリ不要で動作する
 */
function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split("\n");
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  // バッファに溜まったリスト項目を <ul> として出力
  const flushList = () => {
    if (listBuffer.length === 0) return;
    result.push(
      <ul key={key++} className="list-disc list-inside my-1 space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">
            {renderInline(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const line of lines) {
    // ## 見出し
    if (line.startsWith("## ")) {
      flushList();
      result.push(
        <p key={key++} className="font-bold text-sm mt-3 mb-1 text-gray-900">
          {renderInline(line.slice(3))}
        </p>
      );
    }
    // ### 見出し（小）
    else if (line.startsWith("### ")) {
      flushList();
      result.push(
        <p key={key++} className="font-semibold text-sm mt-2 mb-0.5 text-gray-800">
          {renderInline(line.slice(4))}
        </p>
      );
    }
    // - リスト項目
    else if (line.match(/^[-*]\s/)) {
      listBuffer.push(line.slice(2));
    }
    // 空行
    else if (line.trim() === "") {
      flushList();
      result.push(<div key={key++} className="my-1" />);
    }
    // 通常テキスト
    else {
      flushList();
      result.push(
        <p key={key++} className="text-sm leading-relaxed">
          {renderInline(line)}
        </p>
      );
    }
  }
  flushList();
  return result;
}

/**
 * インライン要素のレンダリング（**太字** のみ対応）
 */
function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

// 霧島市向けモジュール表示設定
const MODULE_DISPLAY: Record<
  string,
  { label: string; icon: string; color: string }
> = {
  home:        { label: "ホーム",            icon: "🏙️", color: "text-teal-400" },
  kirishima:   { label: "霧島市",            icon: "🏙️", color: "text-teal-400" },
  "card-game": { label: "研修",              icon: "🎓", color: "text-cyan-400" },
  gyosei:      { label: "行政",              icon: "🏛️", color: "text-green-400" },
  runwith:     { label: "基盤",              icon: "🔧", color: "text-orange-400" },
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
            <Bot size={18} className="text-teal-600" />
            <h2 className="font-semibold text-sm text-teal-800">霧島市AIアドバイザー</h2>
          </div>
          {/* 現在のモジュール表示 */}
          <div className={`text-xs mt-0.5 flex items-center gap-1 ${moduleDisplay.color}`}>
            <span>{moduleDisplay.icon}</span>
            <span>{moduleDisplay.label}モード</span>
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
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-sm text-teal-800">
            <p className="font-semibold mb-1">
              🏙️ 霧島市AIアドバイザー 起動中
            </p>
            <p className="text-xs text-teal-700 leading-relaxed">
              霧島市のKPI・市民タッチポイント・職員WellBeing・ナレッジ活用について
              データに基づいたアドバイスを提供します。SDL五軸・9KPIの視点から
              具体的な改善施策をご提案します。
            </p>
          </div>
        )}

        {/* チャット履歴 */}
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl ${
              msg.role === "user"
                ? "bg-blue-600 text-white text-sm leading-relaxed ml-8"
                : "bg-gray-100 text-gray-800 mr-8"
            }`}
          >
            {msg.role === "user"
              ? msg.content  // ユーザーメッセージはそのまま表示
              : renderMarkdown(msg.content)  // AIの応答はMarkdownとして表示
            }
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
            {[
              "KPIの改善優先順位は？",
              "市民満足度を上げるには？",
              "WellBeingスコアが低い職員へのサポートは？",
              "SDLの価値共創とは？",
              "9KPIの見方を教えて",
            ].map((q) => (
              <button
                key={q}
                onClick={() => setInput(q)}
                className="text-xs bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 px-2 py-1 rounded-full transition-colors"
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
            onKeyDown={(e) => {
              // IME変換中（日本語入力の文字確定Enter）は無視する
              // isComposing が true = まだ変換中なので送信しない
              if (e.key === "Enter" && !e.nativeEvent.isComposing && !loading) {
                sendMessage();
              }
            }}
            placeholder="霧島市の課題について質問する..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="px-3 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 disabled:opacity-40 transition-colors"
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
