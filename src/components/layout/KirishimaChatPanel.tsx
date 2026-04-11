'use client';

/**
 * KirishimaChatPanel.tsx
 *
 * /kirishima 配下専用の AI チャットパネル。
 * 霧島市の8DB・9KPI・SDL五軸を熟知した専用システムプロンプトで動作する。
 */

import { useState } from 'react';
import { Send, X, Bot } from 'lucide-react';

// ─── 霧島市専用システムプロンプト ────────────────────────────
const KIRISHIMA_SYSTEM_PROMPT = `あなたは「霧島市AIアドバイザー」です。
霧島市が導入したRunWith Platform（市民Well-Being向上プラットフォーム）の
データを活用し、市の課題解決・施策立案を支援する専門AIアドバイザーです。

【霧島市の基本情報】
- 所在地: 鹿児島県霧島市
- 市民数: 約12万人（高齢者比率33%。農業・観光・子育て世代が主要セグメント）
- 職員数: 約1,200名（14部57課）
- 主管部署: デジタル推進課（8名）

【RunWith オントロジー（8DB）】
- DB01 Service      : 行政サービス一覧（窓口・デジタル・現場）
- DB02 TouchPoint   : 市民接触記録（チャネル・満足度・SDL軸・解決時間）
- DB03 Incident     : インシデント管理（重大度・根本原因・再発防止）
- DB04 Member       : 職員情報（役職・担当サービス）
- DB05 WellBeing    : 職員コンディション（WBスコア・体調・業務負荷・手応え）
- DB06 KPISnapshot  : 9KPI実績記録（E/T/L軸スナップショット）
- DB07 KnowledgeBase: ナレッジ記事（有効性スコア・SDL軸分類）
- DB08 VOEInsight   : 市民の声インサイト（ポジティブ率・SDL五軸スコア）

【9KPI体系（E/T/L軸）】
■ E軸（市民視点）: E1市民満足度/5.0、E2窓口待ち時間（分）↓、E3オンライン完結率%
■ T軸（提供者視点）: T1電話一次解決率%、T2新人OB期間（日）↓、T3ナレッジ活用率%
■ L軸（責任者視点）: L1DX施策ROI（倍）、L2研修完了率%、L3職員WBスコア/10

【SDL五軸（価値共創フレームワーク）】
- 共創: 市民と行政が一緒に価値をつくる度合い
- 文脈: 個々の状況を把握したサービス提供の度合い
- 資源: 組織の知識・スキル・人材の豊かさ
- 統合: サービス間の連携・統合の度合い
- 価値: 最終的に市民が得る幸福度

【回答の方針】
1. データや数値を具体的に引用して根拠を示す
2. SDL五軸のどの側面の改善かを明示する
3. 短期（1ヶ月）・中期（3ヶ月）のアクションに分けて提案する
4. 専門用語はかみ砕き、自治体職員が即実行できる内容にする
5. 回答は日本語で400字以内（簡潔・実践的に）
6. データがない場合は「Notionへのデータ蓄積」を促す`;

// ─── Markdownレンダラー ──────────────────────────────────

function renderMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n');
  const result: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuffer.length === 0) return;
    result.push(
      <ul key={key++} className="list-disc list-inside my-1 space-y-0.5">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm leading-relaxed">{renderInline(item)}</li>
        ))}
      </ul>
    );
    listBuffer = [];
  };

  for (const line of lines) {
    if (line.startsWith('## ')) {
      flushList();
      result.push(<p key={key++} className="font-bold text-sm mt-3 mb-1 text-gray-900">{renderInline(line.slice(3))}</p>);
    } else if (line.startsWith('### ')) {
      flushList();
      result.push(<p key={key++} className="font-semibold text-sm mt-2 mb-0.5 text-gray-800">{renderInline(line.slice(4))}</p>);
    } else if (line.match(/^[-*]\s/)) {
      listBuffer.push(line.slice(2));
    } else if (line.trim() === '') {
      flushList();
      result.push(<div key={key++} className="my-1" />);
    } else {
      flushList();
      result.push(<p key={key++} className="text-sm leading-relaxed">{renderInline(line)}</p>);
    }
  }
  flushList();
  return result;
}

function renderInline(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="font-bold">{part.slice(2, -2)}</strong>
      : <span key={i}>{part}</span>
  );
}

// ─── サジェスト質問 ──────────────────────────────────────

const SUGGEST_QUESTIONS = [
  'KPIの改善優先順位は？',
  '市民満足度を上げるには？',
  'WBスコアが低い職員へのサポートは？',
  'SDL価値共創とは何ですか？',
  '9KPIの見方を教えて',
];

// ─── メインコンポーネント ────────────────────────────────

export default function KirishimaChatPanel({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [messages, setMessages] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const userMessage = { role: 'user', content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          systemPrompt: KIRISHIMA_SYSTEM_PROMPT,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'APIエラー');
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: data.reply ?? 'エラー: 応答がありませんでした' },
      ]);
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'エラーが発生しました';
      setMessages((prev) => [...prev, { role: 'assistant', content: `❌ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="w-96 h-screen bg-white border-l border-gray-200 flex flex-col">

      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-teal-50">
        <div>
          <div className="flex items-center gap-2">
            <Bot size={18} className="text-teal-600" />
            <h2 className="font-semibold text-sm text-teal-800">霧島市AIアドバイザー</h2>
          </div>
          <div className="text-xs mt-0.5 text-teal-600 flex items-center gap-1">
            <span>🏙️</span>
            <span>8DB・9KPI・SDL五軸 対応</span>
          </div>
        </div>
        <button onClick={onClose} className="hover:bg-teal-100 p-2 rounded transition-colors">
          <X size={18} className="text-teal-700" />
        </button>
      </div>

      {/* メッセージ一覧 */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="bg-teal-50 border border-teal-100 rounded-xl p-3 text-sm text-teal-800">
            <p className="font-semibold mb-1">🏙️ 霧島市AIアドバイザー 起動中</p>
            <p className="text-xs text-teal-700 leading-relaxed">
              霧島市のKPI・市民タッチポイント・職員WellBeing・ナレッジ活用について
              データに基づいたアドバイスを提供します。SDL五軸・9KPIの視点から
              具体的な改善施策をご提案します。
            </p>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`p-3 rounded-xl ${
              msg.role === 'user'
                ? 'bg-teal-600 text-white text-sm leading-relaxed ml-8'
                : 'bg-gray-100 text-gray-800 mr-8'
            }`}
          >
            {msg.role === 'user' ? msg.content : renderMarkdown(msg.content)}
          </div>
        ))}

        {loading && (
          <div className="bg-gray-100 text-gray-500 p-3 rounded-xl mr-8 text-sm flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-teal-400 border-t-transparent rounded-full animate-spin" />
            AIが考えています...
          </div>
        )}
      </div>

      {/* 入力欄 */}
      <div className="p-4 border-t border-gray-200">
        {messages.length === 0 && (
          <div className="mb-3 flex flex-wrap gap-1">
            {SUGGEST_QUESTIONS.map((q) => (
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
              if (e.key === 'Enter' && !e.nativeEvent.isComposing && !loading) sendMessage();
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
