'use client';

/**
 * well-being-quest/layout.tsx — Sprint #78
 *
 * Well-Being QUEST 系ページ（select / plan / result 等）に
 * RunWithアシスタントを提供するレイアウト。
 *
 * ■ 設計方針
 *   card-game/layout.tsx と同じパターン：
 *   - ゲームはフルスクリーン体験なので、右パネルは fixed でオーバーレイ表示
 *   - 右下固定のフローティングボタンでパネルを開閉する
 */

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import ChatPanel from '@/components/layout/ChatPanel';

export default function WellBeingQuestLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <>
      {/* ゲームページ本体（フルスクリーン表示を維持） */}
      {children}

      {/* ── フローティング RunWithアシスタント ボタン（右下固定） ── */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-full shadow-lg hover:bg-emerald-700 active:scale-95 transition-all text-sm font-medium"
          aria-label="RunWithアシスタントを開く"
        >
          <MessageSquare size={18} />
          <span>使い方ガイド</span>
        </button>
      )}

      {/* ── オーバーレイ式 ChatPanel（fixed で画面右端に表示） ── */}
      {chatOpen && (
        <div className="fixed top-0 right-0 z-50 h-screen shadow-2xl">
          <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      )}
    </>
  );
}
