'use client';

/**
 * YakushimaSidebar.tsx
 *
 * /yakushima 配下専用のサイドバー。
 * 屋久島町展開モジュール（観光・移住・収益・LINE相談）のみを表示し、
 * ブランドも「屋久島町 RunWith」に統一する。
 *
 * テーマカラー: emerald（エメラルド）← 自然・世界遺産を象徴
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { MapPin, ChevronDown, ChevronRight } from 'lucide-react';
import { FEATURE_MODULES, getVisiblePages } from '@/config/features';

// 屋久島町モジュールのみ抽出
const YAKUSHIMA_MODULE = FEATURE_MODULES.find((m) => m.id === 'yakushima')!;

export default function YakushimaSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(true);

  // 現在のパスが指定パスと一致するかを確認
  const isActive = (href: string) => pathname === href;

  // サイドバーに表示するページ（hidden 以外）を取得
  const pages = YAKUSHIMA_MODULE ? getVisiblePages(YAKUSHIMA_MODULE.id) : [];

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">

      {/* ── ロゴ（屋久島町専用） ── */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          {/* エメラルドグリーンのアイコン（自然・世界遺産を象徴） */}
          <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <span className="text-sm">🏝️</span>
          </div>
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">屋久島町 RunWith</h1>
            <p className="text-xs text-emerald-400 mt-0.5">世界遺産 × 自然共生型DX</p>
          </div>
        </div>
      </div>

      {/* ── ナビゲーション ── */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

        {/* トップページ（屋久島ハブ） */}
        <Link
          href="/yakushima"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            isActive('/yakushima')
              ? 'bg-emerald-600 text-white'
              : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <span>🏝️</span>
          <span>屋久島ホーム</span>
        </Link>

        <div className="border-t border-slate-800 my-2" />

        {/* 屋久島展開モジュール */}
        {YAKUSHIMA_MODULE && (
          <div className="mb-1">
            {/* モジュールヘッダー（折りたたみ可能） */}
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full text-sm text-slate-300"
            >
              <YAKUSHIMA_MODULE.icon size={16} className="flex-shrink-0" />
              <span className="flex-1 text-left font-medium">
                {YAKUSHIMA_MODULE.emoji} {YAKUSHIMA_MODULE.label}
              </span>
              <span className="text-xs bg-emerald-900 text-emerald-300 px-1.5 py-0.5 rounded">
                {YAKUSHIMA_MODULE.badge}
              </span>
              {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
            </button>

            {/* サブメニュー（アクティブ/準備中で表示を分ける） */}
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
                            ? 'bg-emerald-600 text-white'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${active ? 'bg-white' : 'bg-emerald-400'}`} />
                        <span className="leading-snug">{page.label}</span>
                      </Link>
                    );
                  }
                  // 準備中ページはグレーアウト表示
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
          <MapPin size={11} className="text-emerald-500" />
          <span>屋久島町 × RunWith 実証</span>
        </div>
        <div className="px-3 pb-1 text-xs text-slate-700">Powered by RunWith Platform</div>
      </div>
    </div>
  );
}
