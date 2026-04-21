'use client';

/**
 * Sidebar.tsx
 *
 * src/config/features.ts の FEATURE_MODULES を読み込んで
 * サイドバーメニューを動的に生成する。
 *
 * ■ 新機能を追加するには
 *   features.ts を編集するだけ。このファイルは触らなくてよい。
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, ChevronDown, ChevronRight, Layers, MapPin } from 'lucide-react';
import { getVisiblePages, getModulesByGroup } from '@/config/features';

export default function Sidebar() {
  const pathname = usePathname();

  // グループ別モジュール一覧を取得（セクションヘッダー付き描画に使用）
  const groupedModules = getModulesByGroup();

  // デフォルトで全モジュールを開いた状態にする
  const [openModules, setOpenModules] = useState<string[]>(
    groupedModules.flatMap((g) => g.modules.map((m) => m.id))
  );

  /** モジュールの開閉を切り替える */
  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  /** 現在のURLと一致するか */
  const isActive = (href: string) => pathname === href;

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">

      {/* ── ロゴ ── */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <Layers size={22} className="text-slate-300 flex-shrink-0" />
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">RunWith Platform</h1>
            <p className="text-xs text-slate-400 mt-0.5">木村好孝のコンピタンス</p>
          </div>
        </div>
      </div>

      {/* ── ナビゲーション ── */}
      <nav className="flex-1 p-3 overflow-y-auto space-y-0.5">

        {/* ホーム */}
        <Link
          href="/"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            isActive('/') ? 'bg-slate-600 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Home size={16} />
          <span>ホーム</span>
        </Link>

        {/* 区切り */}
        <div className="border-t border-slate-800 my-2" />

        {/* ── モジュール一覧（グループ別セクションヘッダー付き）── */}
        {groupedModules.map((section, sectionIndex) => (
          <div key={section.group}>

            {/* セクションヘッダー（2番目以降は上部マージンを追加） */}
            <div className={`px-3 ${sectionIndex > 0 ? 'mt-4' : 'mt-1'} mb-1`}>
              <span className="text-xs font-semibold text-slate-500 tracking-wide">
                {section.label}
              </span>
              <div className="border-t border-slate-800 mt-1" />
            </div>

            {/* このセクションのモジュール */}
            {section.modules.map((mod) => {
              const visiblePages = getVisiblePages(mod.id);
              const isOpen = openModules.includes(mod.id);

              return (
                <div key={mod.id} className="mb-1">

                  {/* モジュールヘッダー（折りたたみボタン） */}
                  <button
                    onClick={() => toggleModule(mod.id)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full text-sm text-slate-300"
                  >
                    <mod.icon size={16} className="flex-shrink-0" />
                    <span className="flex-1 text-left font-medium">
                      {mod.emoji} {mod.label}
                    </span>
                    {/* バッジ */}
                    <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded">
                      {mod.badge}
                    </span>
                    {/* 開閉アイコン */}
                    {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                  </button>

                  {/* サブメニュー */}
                  {isOpen && (
                    <div className="ml-6 mt-1 space-y-0.5">
                      {visiblePages.map((page) => {
                        const active = isActive(page.href);

                        if (page.status === 'active') {
                          return (
                            <Link
                              key={page.id}
                              href={page.href}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs ${
                                active
                                  ? `${mod.accent.sidebarActive}`
                                  : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                              }`}
                            >
                              <span
                                className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                  active ? 'bg-white' : mod.accent.sidebarDot
                                }`}
                              />
                              <span className="leading-snug">{page.label}</span>
                            </Link>
                          );
                        }

                        // status === 'coming'
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
              );
            })}
          </div>
        ))}

        {/* 区切り */}
        <div className="border-t border-slate-800 my-2" />

        {/* 設定 */}
        <Link
          href="/settings"
          className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
            isActive('/settings') ? 'bg-slate-600 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Settings size={16} />
          <span>設定</span>
        </Link>
      </nav>

      {/* ── フッター ── */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-slate-600">
          <MapPin size={11} />
          <span>人口減少 × AI設計</span>
        </div>
      </div>
    </div>
  );
}
