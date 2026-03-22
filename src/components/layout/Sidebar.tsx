'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Home,
  Building2,
  Settings,
  ChevronDown,
  ChevronRight,
  Layers,
  Activity,
  Gamepad2,
  MapPin,
} from 'lucide-react';

type MenuItem = {
  icon: React.ElementType;
  label: string;
  href?: string;
  badge?: string;
  children?: { label: string; href: string; status: 'active' | 'coming' }[];
};

const menuStructure: MenuItem[] = [
  {
    icon: Home,
    label: 'ホーム',
    href: '/',
  },
  {
    icon: Gamepad2,
    label: '🃏 カードゲーム',
    badge: '教育',
    children: [
      { label: 'ゲームを始める', href: '/card-game', status: 'active' },
      { label: 'Well-Being QUEST', href: '/well-being-quest', status: 'active' },
      { label: 'IT運用改善ゲーム', href: '/card-game/it-ops', status: 'coming' },
    ],
  },
  {
    icon: Building2,
    label: '🏛️ 行政OS',
    badge: '自治体',
    children: [
      { label: 'Well-Being ダッシュボード', href: '/gyosei/dashboard', status: 'active' },
      { label: '住民サービス状況', href: '/gyosei/services', status: 'coming' },
      { label: '職員業務支援', href: '/gyosei/staff', status: 'coming' },
    ],
  },
  {
    icon: Activity,
    label: '🔧 RunWith',
    badge: '運用管理',
    children: [
      { label: '運用成熟度診断', href: '/runwith/maturity', status: 'coming' },
      { label: 'インシデント管理', href: '/runwith/incidents', status: 'coming' },
      { label: '運用KPIダッシュボード', href: '/runwith/kpi', status: 'coming' },
    ],
  },
  {
    icon: Settings,
    label: '設定',
    href: '/settings',
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>(['🃏 カードゲーム']);

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label) ? prev.filter((l) => l !== label) : [...prev, label]
    );
  };

  const isActive = (href: string) => pathname === href;

  return (
    <div className="w-64 h-screen bg-gray-900 text-white flex flex-col flex-shrink-0">
      {/* ロゴ */}
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center gap-2">
          <Layers size={24} className="text-blue-400" />
          <div>
            <h1 className="text-sm font-bold leading-tight">AI SaaS Platform</h1>
            <p className="text-xs text-gray-400">木村好孝のコンピタンス</p>
          </div>
        </div>
      </div>

      {/* ナビゲーション */}
      <nav className="flex-1 p-3 overflow-y-auto">
        {menuStructure.map((item) => (
          <div key={item.label} className="mb-1">
            {/* 子メニューなし */}
            {!item.children && item.href && (
              <Link
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm ${
                  isActive(item.href)
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-800 text-gray-300'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </Link>
            )}

            {/* 子メニューあり */}
            {item.children && (
              <>
                <button
                  onClick={() => toggleMenu(item.label)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-800 transition-colors w-full text-sm text-gray-300"
                >
                  <item.icon size={18} />
                  <span className="flex-1 text-left">{item.label}</span>
                  {item.badge && (
                    <span className="text-xs bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
                      {item.badge}
                    </span>
                  )}
                  {openMenus.includes(item.label) ? (
                    <ChevronDown size={14} />
                  ) : (
                    <ChevronRight size={14} />
                  )}
                </button>

                {openMenus.includes(item.label) && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.children.map((child) => (
                      <div key={child.href}>
                        {child.status === 'active' ? (
                          <Link
                            href={child.href}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md transition-colors text-xs ${
                              isActive(child.href)
                                ? 'bg-blue-600 text-white'
                                : 'hover:bg-gray-800 text-gray-400 hover:text-gray-200'
                            }`}
                          >
                            <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0" />
                            {child.label}
                          </Link>
                        ) : (
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-gray-600 cursor-not-allowed">
                            <span className="w-1 h-1 rounded-full bg-gray-600 flex-shrink-0" />
                            {child.label}
                            <span className="ml-auto text-xs text-gray-700">準備中</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </nav>

      {/* フッター */}
      <div className="p-3 border-t border-gray-700">
        <div className="flex items-center gap-2 px-3 py-2 text-xs text-gray-500">
          <MapPin size={12} />
          <span>人口減少 × AI設計</span>
        </div>
      </div>
    </div>
  );
}
