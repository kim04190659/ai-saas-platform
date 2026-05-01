'use client';

/**
 * card-game/layout.tsx — Sprint #78
 *
 * カードゲーム系ページ（select / result / agile-yasai / gyosei-dx 等）に
 * RunWithアシスタントを提供するレイアウト。
 *
 * ■ 設計方針
 *   - ゲームページはフルスクリーン体験なので、右パネルは fixed でオーバーレイ表示
 *   - フローティングボタン（右下固定）でパネルを開閉する
 *   - ハブページ（/card-game）はすでに ChatPanel を内包しているため、
 *     このレイアウトは「追加の」パネルを提供しないよう pathname で判定している
 *     → 実際は pathname 判定を省き、ハブページ側から ChatPanel を削除して統一する
 */

import { useState } from 'react';
import { MessageSquare } from 'lucide-react';
import ChatPanel from '@/components/layout/ChatPanel';

export default function CardGameLayout({
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
      {/* パネルが閉じているときだけボタンを表示 */}
      {!chatOpen && (
        <button
          onClick={() => setChatOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 active:scale-95 transition-all text-sm font-medium"
          aria-label="RunWithアシスタントを開く"
        >
          <MessageSquare size={18} />
          <span>使い方ガイド</span>
        </button>
      )}

      {/* ── オーバーレイ式 ChatPanel（fixed で画面右端に表示） ── */}
      {/* ゲームUIを覆わず右端にスライドインする */}
      {chatOpen && (
        <div className="fixed top-0 right-0 z-50 h-screen shadow-2xl">
          <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
        </div>
      )}
    </>
  );
}
