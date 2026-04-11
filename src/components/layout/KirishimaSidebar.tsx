'use client';

/**
 * KirishimaSidebar.tsx
 *
 * /kirishima 配下専用のサイドバー。
 * 霧島市展開モジュール（4画面）のみを表示し、
 * ブランドも「霧島市 RunWith」に統一する。
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { FEATURE_MODULES, getVisiblePages } from '@/config/features';

// 霧島市モジュールのみ抽出
const KIRISHIMA_MODULE = FEATURE_MODULES.find((m) => m.id === 'kirishima')!;

export default function KirishimaSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  const isActive = (href: string) => pathname === href;
  const pages = KIRISHIMA_MODULE ? getVisiblePages(KIRISHIMA_MODULE.id) : [];

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">

      {/* ── ロゴ（霧島市専用） ── */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center flex-shrink-0">
            <MapPin size={16} className="text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">霧島市 RunWith</h1>
            <p className="text-xs text-teal-400 mt-0.5">市民Well-Being向上プラットフォーム</p>
          </div>
        </div>
      </div>

      {/* ── ナビゲーション ── */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

        {/* トップページ */}
        <Link
          href="/kirishima"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            isActive('/kirishima')
              ? 'bg-teal-600 text-white'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span>🏙️</span>
          <span>ホーム</span>
        </Link>

        <div className="border-t border-slate-800 my-2" />

        {/* 霧島市展開モジュール */}
        {KIRISHIMA_MODULE && (
          <div className="mb-1">
            {/* モジュールヘッダー */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full text-sm text-slate-300"
            >
              <KIRISHIMA_MODULE.icon size={16} className="flex-shrink-0" />
              <span className="flex-1 text-left font-medium">
                {KIRISHIMA_MODULE.emoji} {KIRISHIMA_MODULE.label}
              </span>
              <span className="text-xs bg-teal-900 text-teal-300 px-1.5 py-0.5 rounded">
                {KIRISHIMA_MODULE.badge}
              </span>
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>

            {/* サブメニュー */}
            {isOpen && (
              <div className="ml-6 mt-1 space-y-0.5">
                {pages.map((page) => {
                  const active = isActive(page.href);
                  if (page.status === 'active') {
                    return (
                      <Link
                        key={page.id}
                        href={page.href}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs ${
                          active
                            ? 'bg-teal-600 text-white'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white' : 'bg-teal-400'}`} />
                        <span className="leading-snug">{page.label}</span>
                      </Link>
                    );
                  }
                  return (
                    <div
                      key={page.id}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-slate-600 cursor-not-allowed"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-700 flex-shrink-0" />
                      <span className="flex-1 leading-snug">{page.label}</span>
                      <span className="text-slate-700 text-xs">準備中</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </nav>

      {/* ── フッター ── */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-500">
          <MapPin size={11} className="text-teal-500" />
          <span>霧島市 × RunWith 実証</span>
        </div>
        <div className="px-3 pb-1 text-xs text-slate-700">Powered by RunWith Platform</div>
      </div>
    </div>
  );
}
