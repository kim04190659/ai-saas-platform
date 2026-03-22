"use client";

/**
 * src/app/page.tsx — ホーム画面
 *
 * FEATURE_MODULES を読み込んでモジュールカードを動的生成する。
 * 新モジュールは features.ts に追加するだけでここに自動反映される。
 */

import { useState } from "react";
import Link from "next/link";
import Sidebar from "@/components/layout/Sidebar";
import ChatPanel from "@/components/layout/ChatPanel";
import { MessageSquare, ChevronRight, ArrowRight } from "lucide-react";
import { FEATURE_MODULES, getActivePages } from "@/config/features";

export default function Home() {
  const [chatOpen, setChatOpen] = useState(false);

  return (
    <div className="flex h-screen">
      <Sidebar />

      <div className="flex-1 flex flex-col overflow-hidden">

        {/* ── ヘッダー ── */}
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-slate-800">RunWith プラットフォーム</h2>
            <p className="text-xs text-slate-400 mt-0.5">生産人口が減っても、生産量は増やせる。</p>
          </div>
          <button
            onClick={() => setChatOpen(!chatOpen)}
            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-sm font-medium transition-colors"
          >
            <MessageSquare size={15} />
            AIアシスタント
          </button>
        </header>

        {/* ── メインコンテンツ ── */}
        <main className="flex-1 overflow-auto bg-slate-50 p-6">
          <div className="max-w-3xl mx-auto">

            {/* ページタイトル */}
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-800">
                木村好孝のコンピタンスをソフトウェアで実装する
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                35年のIT運用経験 × ITIL/SIAM × カードゲーム教育 を3つのモジュールに集約
              </p>
            </div>

            {/* ── モジュールカード（features.ts から動的生成）── */}
            <div className="space-y-4">
              {FEATURE_MODULES.map((mod) => {
                const activePages = getActivePages(mod.id);

                return (
                  <div
                    key={mod.id}
                    className={`bg-white rounded-2xl border shadow-sm overflow-hidden ${mod.accent.border}`}
                  >
                    {/* カードヘッダー */}
                    <div className={`${mod.accent.bg} px-6 py-5 border-b ${mod.accent.border}`}>
                      <div className="flex items-center gap-3">
                        {/* アイコン */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${mod.accent.icon}`}>
                          <mod.icon size={20} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className={`text-base font-bold ${mod.accent.text}`}>
                              {mod.emoji} {mod.label}
                            </h3>
                            {/* 稼働中ページ数バッジ */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mod.accent.badge}`}>
                              {activePages.length > 0 ? `${activePages.length}機能 稼働中` : mod.badge}
                            </span>
                          </div>
                          <p className="text-slate-500 text-xs mt-0.5">{mod.badge}</p>
                        </div>
                      </div>
                      {/* 説明 */}
                      <p className="text-slate-600 text-sm leading-relaxed mt-3">
                        {mod.description}
                      </p>
                    </div>

                    {/* カードフッター（activeページのリンクボタン） */}
                    <div className="px-6 py-4 bg-white">
                      {activePages.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {activePages.map((page) => (
                            <Link key={page.id} href={page.href}>
                              <button className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors shadow-sm ${mod.accent.button}`}>
                                {page.label}
                                <ChevronRight size={14} />
                              </button>
                            </Link>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400">メニューから開発状況を確認できます</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* ── テーゼ ── */}
            <div className="mt-6 p-5 bg-white border border-slate-200 rounded-2xl shadow-sm">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">📍 テーゼ</p>
              <p className="text-sm text-slate-700 leading-relaxed">
                生産人口が減っても、生産量は増やせる。
                それは人の数の問題ではなく、<strong className="text-slate-900">設計の問題</strong>だ。
              </p>
              <div className="mt-3 flex items-center gap-1 text-xs text-slate-400">
                <ArrowRight size={12} />
                <span>AIアシスタントに質問する → 右上「AIアシスタント」ボタン</span>
              </div>
            </div>

          </div>
        </main>
      </div>

      <ChatPanel isOpen={chatOpen} onClose={() => setChatOpen(false)} />
    </div>
  );
}
