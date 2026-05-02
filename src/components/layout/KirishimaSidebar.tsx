'use client';

/**
 * KirishimaSidebar.tsx — Sprint #87 全面リデザイン
 *
 * /kirishima 配下専用のサイドバー。
 * features.ts には依存せず、霧島市固有の4グループ構成をハードコードする。
 *
 * ■ グループ構成
 *   1. 必須機能  ── 常時展開（ホーム・LINE相談・タッチポイント）
 *   2. 基本AI    ── 折りたたみ可（KPI・WB・経営ダッシュ・PDCA・週次サマリー）
 *   3. 課題特化型AI ── 折りたたみ可（道路・廃棄物・財政・インフラ・住民コーチ）
 *   4. 研修・学習   ── 折りたたみ可（ナレッジ・WBクエスト・カードゲーム）
 */

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  MapPin,
  ChevronDown,
  ChevronRight,
  Home,
  MessageSquare,
  Users,
  BarChart2,
  Heart,
  Briefcase,
  RefreshCw,
  CalendarDays,
  Truck,
  Trash2,
  PiggyBank,
  Building2,
  UserCheck,
  BookOpen,
  Zap,
  Gamepad2,
} from 'lucide-react';

// ─── 型定義 ────────────────────────────────────────────────

/** メニュー1項目の定義 */
interface MenuItem {
  id:    string;
  label: string;
  href:  string;
  icon:  React.ElementType;
}

/** グループの定義 */
interface MenuGroup {
  id:       string;
  label:    string;
  emoji:    string;
  items:    MenuItem[];
  /** true の場合は常時展開（トグルなし） */
  alwaysOpen?: boolean;
}

// ─── メニュー定義（ハードコード） ──────────────────────────

const MENU_GROUPS: MenuGroup[] = [
  // ── ① 必須機能（常時展開） ─────────────────────────────
  {
    id:        'essentials',
    label:     '必須機能',
    emoji:     '⚡',
    alwaysOpen: true,
    items: [
      {
        id:    'dashboard',
        label: 'WBダッシュボード',
        href:  '/kirishima/dashboard?municipalityId=kirishima',
        icon:  Home,
      },
      {
        id:    'line-consultation',
        label: '住民LINE相談',
        href:  '/kirishima/line-consultation',
        icon:  MessageSquare,
      },
      {
        id:    'touchpoints',
        label: '住民タッチポイント',
        href:  '/kirishima/touchpoints',
        icon:  Users,
      },
    ],
  },

  // ── ② 基本AI ──────────────────────────────────────────
  {
    id:    'basic-ai',
    label: '基本AI',
    emoji: '🤖',
    items: [
      {
        id:    'kpi',
        label: 'KPI総合',
        href:  '/kirishima/kpi',
        icon:  BarChart2,
      },
      {
        id:    'wellbeing',
        label: 'チームWellBeing',
        href:  '/kirishima/wellbeing',
        icon:  Heart,
      },
      {
        id:    'management-dashboard',
        label: '経営ダッシュボード',
        href:  '/kirishima/management-dashboard',
        icon:  Briefcase,
      },
      {
        id:    'pdca-tracking',
        label: '施策PDCA',
        href:  '/kirishima/pdca-tracking',
        icon:  RefreshCw,
      },
      {
        id:    'weekly-summary',
        label: '週次WBサマリー',
        href:  '/kirishima/weekly-summary',
        icon:  CalendarDays,
      },
    ],
  },

  // ── ③ 課題特化型AI ─────────────────────────────────────
  {
    id:    'specialized-ai',
    label: '課題特化型AI',
    emoji: '🎯',
    items: [
      {
        id:    'roads',
        label: '道路修復AI',
        href:  '/kirishima/roads',
        icon:  Truck,
      },
      {
        id:    'waste',
        label: 'ごみ管理最適化',
        href:  '/kirishima/waste',
        icon:  Trash2,
      },
      {
        id:    'fiscal-health',
        label: '財政健全化',
        href:  '/kirishima/fiscal-health',
        icon:  PiggyBank,
      },
      {
        id:    'infra-aging',
        label: 'インフラ老朽化',
        href:  '/kirishima/infra-aging',
        icon:  Building2,
      },
      {
        id:    'resident-coach',
        label: '住民個人AIコーチ',
        href:  '/kirishima/resident-coach',
        icon:  UserCheck,
      },
    ],
  },

  // ── ④ 研修・学習 ───────────────────────────────────────
  {
    id:    'learning',
    label: '研修・学習',
    emoji: '📚',
    items: [
      {
        id:    'knowledge',
        label: 'ナレッジ活用',
        href:  '/kirishima/knowledge',
        icon:  BookOpen,
      },
      {
        id:    'wb-quest',
        label: 'Well-Being QUEST',
        href:  '/kirishima/well-being-quest',
        icon:  Zap,
      },
      {
        id:    'card-game',
        label: 'カードゲーム',
        href:  '/kirishima/card-game',
        icon:  Gamepad2,
      },
    ],
  },
];

// ─── コンポーネント ─────────────────────────────────────────

export default function KirishimaSidebar() {
  const pathname = usePathname();

  /**
   * デフォルト開閉状態：必須機能は alwaysOpen なので openGroups に含めなくてよい。
   * 基本AI・課題特化型AI・研修・学習はデフォルト閉じる。
   */
  const [openGroups, setOpenGroups] = useState<string[]>([]);

  /** グループの開閉を切り替える */
  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId]
    );
  };

  /**
   * アクティブ判定：クエリパラメータを除いたパスで比較する。
   * ?municipalityId=xxx を含むリンクでも正しく判定できる。
   */
  const isActive = (href: string) => {
    const hrefPath = href.split('?')[0];
    return pathname === hrefPath;
  };

  return (
    <div className="w-64 h-screen bg-slate-900 text-white flex flex-col flex-shrink-0">

      {/* ── ロゴ（霧島市専用） ─────────────────────────── */}
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

      {/* ── ナビゲーション ──────────────────────────────── */}
      <nav className="flex-1 p-3 overflow-y-auto">

        {MENU_GROUPS.map((group, groupIndex) => {
          const isAlwaysOpen = group.alwaysOpen === true;
          const isOpen       = isAlwaysOpen || openGroups.includes(group.id);

          return (
            <div key={group.id}>

              {/* セクション区切り（2番目以降のグループの上） */}
              {groupIndex > 0 && (
                <div className={`px-3 mt-4 mb-1.5`}>
                  {isAlwaysOpen ? (
                    // 必須機能はラベルのみ（クリック不要）
                    <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                      {group.emoji} {group.label}
                    </span>
                  ) : (
                    // その他：折りたたみボタン
                    <button
                      onClick={() => toggleGroup(group.id)}
                      className="flex items-center gap-2 w-full text-left rounded-lg hover:bg-slate-800 px-0 py-1 transition-colors"
                    >
                      <span className="flex-1 text-xs font-semibold text-slate-400 tracking-wider uppercase">
                        {group.emoji} {group.label}
                      </span>
                      {isOpen
                        ? <ChevronDown size={12} className="text-slate-500 flex-shrink-0" />
                        : <ChevronRight size={12} className="text-slate-500 flex-shrink-0" />
                      }
                    </button>
                  )}
                  <div className="border-t border-slate-800 mt-1" />
                </div>
              )}

              {/* 必須機能（最初のグループ）のラベル */}
              {groupIndex === 0 && (
                <div className="px-3 mt-1 mb-1.5">
                  <span className="text-xs font-semibold text-slate-500 tracking-wider uppercase">
                    {group.emoji} {group.label}
                  </span>
                  <div className="border-t border-slate-800 mt-1" />
                </div>
              )}

              {/* メニュー項目（展開時のみ表示） */}
              {isOpen && (
                <div className={`${isAlwaysOpen ? 'ml-2' : 'ml-3'} mt-0.5 space-y-0.5 mb-1`}>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon   = item.icon;
                    return (
                      <Link
                        key={item.id}
                        href={item.href}
                        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-colors text-xs ${
                          active
                            ? 'bg-teal-600 text-white font-medium'
                            : 'hover:bg-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <Icon
                          size={13}
                          className={`flex-shrink-0 ${active ? 'text-white' : 'text-teal-500'}`}
                        />
                        <span className="leading-snug min-w-0">{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        <div className="border-t border-slate-800 my-3" />

        {/* 全メニューへ戻るリンク */}
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-500 hover:text-slate-300 transition-colors text-xs"
        >
          <Home size={13} className="flex-shrink-0" />
          <span>RunWith トップへ</span>
        </Link>
      </nav>

      {/* ── フッター ───────────────────────────────────── */}
      <div className="p-3 border-t border-slate-800">
        <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-slate-600">
          <MapPin size={11} className="text-teal-600" />
          <span>霧島市 × RunWith 実証</span>
        </div>
        <div className="px-3 pb-1 text-xs text-slate-700">Powered by RunWith Platform</div>
      </div>
    </div>
  );
}
