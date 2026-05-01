'use client';

/**
 * Sidebar.tsx — Sprint #76 全面リデザイン
 *
 * ■ 改善点
 *   ① 空モジュール（全ページ hidden）を完全非表示
 *      → 住民接点・職員支援・経営・政策 が消える（必須機能に統合済みのため）
 *   ② 必須機能は常時展開（トグルなし）
 *      → 最初に開いた人が4つのコア機能をすぐ把握できる
 *   ③ AI拡張・自治体・運用管理はデフォルト閉じる
 *      → 縦長解消＋「閉じてもすぐ戻る」問題を解消
 *   ④ モジュールヘッダーのバッジを削除・テキスト truncate
 *      → 「基本AIセット」「課題特化型AI」の折り返し解消
 *   ⑤ isActive をパス比較に変更（クエリパラメータ無視）
 *      → ?municipalityId=xxx リンクでもアクティブ表示が正しく動く
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Settings, ChevronDown, ChevronRight, Layers, MapPin } from 'lucide-react';
import { getVisiblePages, getModulesByGroup } from '@/config/features';

export default function Sidebar() {
  const pathname = usePathname();
  const groupedModules = getModulesByGroup();

  /**
   * デフォルト開閉状態
   * ・必須機能（essentials）: 常時展開（トグルなし）→ openModules に含めなくてよい
   * ・それ以外: デフォルト閉じる → 全体像が一覧できる＋縦長にならない
   */
  const [openModules, setOpenModules] = useState<string[]>([]);

  /** 開閉を切り替える */
  const toggleModule = (moduleId: string) => {
    setOpenModules((prev) =>
      prev.includes(moduleId)
        ? prev.filter((id) => id !== moduleId)
        : [...prev, moduleId]
    );
  };

  /**
   * アクティブ判定
   * クエリパラメータ（?municipalityId=xxx）を除いたパスで比較する。
   * ページ全体としての「現在地」を示す目的なので、自治体単位の区別は不要。
   */
  const isActive = (href: string) => {
    const hrefPath = href.split('?')[0];
    return pathname === hrefPath;
  };

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">

      {/* ── ロゴ ────────────────────────────────── */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <Layers size={20} className="text-emerald-400 flex-shrink-0" />
          <div>
            <h1 className="text-sm font-bold text-white leading-tight">RunWith Platform</h1>
            <p className="text-xs text-slate-400 mt-0.5">自治体 WB × SDL × DX</p>
          </div>
        </div>
      </div>

      {/* ── ナビゲーション ───────────────────────── */}
      <nav className="flex-1 p-3 overflow-y-auto">

        {/* ホーム */}
        <Link
          href="/"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm mb-1 ${
            isActive('/') ? 'bg-slate-600 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Home size={15} />
          <span>ホーム</span>
        </Link>

        <div className="border-t border-slate-800 my-2" />

        {/* ── グループ別レンダリング ─────────────── */}
        {groupedModules.map((section, sectionIndex) => {

          // 表示可能ページがあるモジュールだけに絞る
          // （住民接点・職員支援・経営は全ページ hidden のため除外される）
          const validModules = section.modules.filter(
            (mod) => getVisiblePages(mod.id).length > 0
          );
          if (validModules.length === 0) return null;

          return (
            <div key={section.group}>

              {/* セクションヘッダー */}
              <div className={`px-3 ${sectionIndex > 0 ? 'mt-5' : 'mt-1'} mb-1.5`}>
                <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                  {section.label}
                </span>
                <div className="border-t border-slate-800 mt-1" />
              </div>

              {validModules.map((mod) => {
                const visiblePages = getVisiblePages(mod.id);
                // 必須機能は常時展開でトグルなし
                const isEssentials = mod.id === 'essentials';
                const isOpen = isEssentials || openModules.includes(mod.id);

                return (
                  <div key={mod.id} className="mb-0.5">

                    {/* モジュールヘッダー */}
                    {isEssentials ? (
                      // ── 必須機能: ラベルのみ（クリック不要・常時展開） ──
                      <div className="flex items-center gap-2 px-3 py-1 mt-1">
                        <span className="text-xs font-semibold text-slate-400 tracking-wide">
                          {mod.emoji} {mod.label}
                        </span>
                      </div>
                    ) : (
                      // ── その他: 折りたたみトグル ──
                      <button
                        onClick={() => toggleModule(mod.id)}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 transition-colors w-full text-left"
                      >
                        <mod.icon size={14} className="flex-shrink-0 text-slate-500" />
                        {/* min-w-0 + truncate でテキスト折り返し防止 */}
                        <span className="flex-1 min-w-0 truncate text-sm font-medium text-slate-300">
                          {mod.emoji} {mod.label}
                        </span>
                        {isOpen
                          ? <ChevronDown size={12} className="flex-shrink-0 text-slate-500" />
                          : <ChevronRight size={12} className="flex-shrink-0 text-slate-500" />
                        }
                      </button>
                    )}

                    {/* サブメニュー（展開時のみ） */}
                    {isOpen && (
                      <div className={`${isEssentials ? 'ml-2' : 'ml-5'} mt-0.5 space-y-0.5 mb-1`}>
                        {visiblePages.map((page) => {
                          const active = isActive(page.href);

                          if (page.status === 'active') {
                            return (
                              <Link
                                key={page.id}
                                href={page.href}
                                className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-xs ${
                                  active
                                    ? `${mod.accent.sidebarActive} font-medium`
                                    : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                                }`}
                              >
                                <span
                                  className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                                    active ? 'bg-white' : mod.accent.sidebarDot
                                  }`}
                                />
                                {/* leading-snug で行間を詰め、min-w-0 で折り返しを許容 */}
                                <span className="leading-snug min-w-0">{page.label}</span>
                              </Link>
                            );
                          }

                          // status === 'coming'
                          return (
                            <div
                              key={page.id}
                              className="flex items-center gap-2 px-2.5 py-1.5 rounded-md text-xs text-slate-700 cursor-not-allowed"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-800 flex-shrink-0" />
                              <span className="flex-1 leading-snug">{page.label}</span>
                              <span className="text-slate-700 text-xs flex-shrink-0 ml-1">準備中</span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="border-t border-slate-800 my-2" />

        {/* 設定 */}
        <Link
          href="/settings"
          className={`flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-sm ${
            isActive('/settings') ? 'bg-slate-600 text-white' : 'hover:bg-slate-800 text-slate-300'
          }`}
        >
          <Settings size={15} />
          <span>設定</span>
        </Link>
      </nav>

      {/* ── フッター ─────────────────────────────── */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600">
          <MapPin size={11} />
          <span>人口減少 × AI × WellBeing</span>
        </div>
      </div>
    </div>
  );
}
