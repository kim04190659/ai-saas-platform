'use client';

/**
 * (dashboard)/layout.tsx
 *
 * Sprint #32 更新点：
 *   - MunicipalityProvider でアプリ全体をラップ（マルチテナント対応）
 *   - 通常レイアウトのヘッダーに MunicipalitySelector を追加
 *
 * /kirishima 配下では霧島市専用レイアウト（KirishimaSidebar + KirishimaChatPanel）を使用。
 * それ以外のページは通常の RunWith Platform レイアウトを使用。
 */

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/layout/Sidebar';
import KirishimaSidebar from '@/components/layout/KirishimaSidebar';
import ChatPanel from '@/components/layout/ChatPanel';
import KirishimaChatPanel from '@/components/layout/KirishimaChatPanel';
import LanguageSwitcher from '@/components/common/LanguageSwitcher';
import MunicipalitySelector from '@/components/layout/MunicipalitySelector';
import { MunicipalityProvider } from '@/contexts/MunicipalityContext';
import { MessageSquare, MapPin } from 'lucide-react';

/**
 * レイアウト本体（MunicipalityProvider でラップしたものをエクスポート）
 * Provider 内でないと MunicipalitySelector が Context にアクセスできないため、
 * 内部コンポーネントとして分離している。
 */
function DashboardLayoutInner({
  children,
}: {
  children: React.ReactNode;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const pathname = usePathname();

  // /kirishima 配下かどうかを判定
  const isKirishima = pathname.startsWith('/kirishima');

  // ─── 霧島市専用レイアウト ──────────────────────────────
  if (isKirishima) {
    return (
      <div className="flex h-screen">
        <KirishimaSidebar />

        <div className="flex-1 flex flex-col">
          {/* 霧島市専用ヘッダー */}
          <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <MapPin size={18} className="text-teal-600" />
                霧島市 RunWith
              </h2>
              <p className="text-xs text-teal-600 ml-6">市民Well-Being向上プラットフォーム</p>
            </div>
            <div className="flex items-center gap-4">
              <LanguageSwitcher />
              <button
                onClick={() => setChatOpen(!chatOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <MessageSquare size={20} />
                霧島市AIアドバイザー
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-gray-50">
            {children}
          </main>
        </div>

        {/* 霧島市専用チャットパネル */}
        <KirishimaChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
      </div>
    );
  }

  // ─── 通常の RunWith Platform レイアウト ───────────────
  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col">
        <header className="bg-white border-b border-gray-200 p-4 flex justify-between items-center">
          <h2 className="text-xl font-semibold">RunWith Platform</h2>
          <div className="flex items-center gap-3">
            {/* Sprint #32: 自治体切り替えセレクター */}
            <MunicipalitySelector />
            <LanguageSwitcher />
            <button
              onClick={() => setChatOpen(!chatOpen)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <MessageSquare size={20} />
              RunWithアシスタント
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-auto bg-gray-50 p-6">
          {children}
        </main>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}

// ─── デフォルトエクスポート：MunicipalityProvider でラップ ──

/**
 * DashboardLayout
 *
 * MunicipalityProvider を最外層に配置し、
 * 全ての子コンポーネントが useMunicipality() フックを使えるようにする。
 */
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <MunicipalityProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </MunicipalityProvider>
  );
}
