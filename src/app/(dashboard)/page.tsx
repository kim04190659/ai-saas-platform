'use client';

/**
 * src/app/(dashboard)/page.tsx — サイドバー配下のホーム
 *
 * FEATURE_MODULES を読み込んでショートカットカードを動的生成する。
 */

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { FEATURE_MODULES, getActivePages } from '@/config/features';

export default function Dashboard() {
  return (
    <div className="p-6">

      {/* ページタイトル */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">ホーム</h1>
        <p className="text-slate-500 text-sm mt-1">各モジュールの稼働中機能へのショートカット</p>
      </div>

      {/* モジュールショートカット（features.ts から動的生成） */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {FEATURE_MODULES.map((mod) => {
          const activePages = getActivePages(mod.id);
          // 各モジュールの最初のactiveページへのリンク
          const primaryPage = activePages[0];

          return (
            <div
              key={mod.id}
              className={`bg-white rounded-xl border shadow-sm overflow-hidden ${mod.accent.border}`}
            >
              {/* カードヘッダー */}
              <div className={`${mod.accent.bg} px-4 py-4 border-b ${mod.accent.border}`}>
                <div className="flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${mod.accent.icon}`}>
                    <mod.icon size={18} />
                  </div>
                  <div>
                    <p className={`text-sm font-bold ${mod.accent.text}`}>
                      {mod.emoji} {mod.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">{mod.badge}</p>
                  </div>
                </div>
              </div>

              {/* ページリスト */}
              <div className="px-4 py-3 space-y-1">
                {activePages.length > 0 ? (
                  activePages.map((page) => (
                    <Link key={page.id} href={page.href}>
                      <div className="flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-slate-50 transition-colors cursor-pointer group">
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${mod.accent.sidebarDot}`} />
                        <span className={`text-xs flex-1 ${mod.accent.text} group-hover:underline`}>
                          {page.label}
                        </span>
                        <ChevronRight size={12} className="text-slate-300" />
                      </div>
                    </Link>
                  ))
                ) : (
                  <p className="text-xs text-slate-400 px-2 py-1">準備中</p>
                )}
              </div>

              {/* プライマリCTA */}
              {primaryPage && (
                <div className="px-4 pb-4">
                  <Link href={primaryPage.href}>
                    <button className={`w-full py-2 rounded-lg text-xs font-medium transition-colors shadow-sm ${mod.accent.button}`}>
                      開く → {primaryPage.label}
                    </button>
                  </Link>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* テーゼ */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">📍 テーゼ</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          生産人口が減っても、生産量は増やせる。
          それは人の数の問題ではなく、<strong className="text-slate-900">設計の問題</strong>だ。
        </p>
      </div>

    </div>
  );
}
