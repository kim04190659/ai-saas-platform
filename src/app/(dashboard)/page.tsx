'use client';

import Link from 'next/link';
import { Gamepad2, Building2, Activity, ChevronRight } from 'lucide-react';

// ─── ダッシュボードホーム ────────────────────────────────
// サイドバーレイアウト配下のホームページ
// モジュールへのショートカットと概要を表示する

const shortcuts = [
  {
    icon: Gamepad2,
    label: 'LOGI-TECH カードゲーム',
    description: 'ビジネスプランを体験学習',
    href: '/card-game',
    accentBg: 'bg-sky-50',
    accentBorder: 'border-sky-200',
    accentIcon: 'bg-sky-100 text-sky-600',
    accentText: 'text-sky-700',
  },
  {
    icon: Building2,
    label: '行政OS ダッシュボード',
    description: '屋久島データで自治体診断',
    href: '/gyosei/dashboard',
    accentBg: 'bg-emerald-50',
    accentBorder: 'border-emerald-200',
    accentIcon: 'bg-emerald-100 text-emerald-600',
    accentText: 'text-emerald-700',
  },
  {
    icon: Activity,
    label: 'RunWith 成熟度診断',
    description: 'IT運用の現状レベルを把握',
    href: '/runwith/maturity',
    accentBg: 'bg-orange-50',
    accentBorder: 'border-orange-200',
    accentIcon: 'bg-orange-100 text-orange-600',
    accentText: 'text-orange-700',
  },
];

export default function Dashboard() {
  return (
    <div className="p-6">

      {/* ── ページタイトル ── */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">ホーム</h1>
        <p className="text-slate-500 text-sm mt-1">
          各モジュールへのショートカット
        </p>
      </div>

      {/* ── モジュールショートカット ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {shortcuts.map((item) => (
          <Link key={item.href} href={item.href}>
            <div
              className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-shadow cursor-pointer ${item.accentBorder}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${item.accentIcon}`}>
                  <item.icon size={20} />
                </div>
                <div>
                  <p className={`text-sm font-bold ${item.accentText}`}>{item.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{item.description}</p>
                </div>
              </div>
              <div className={`flex items-center gap-1 text-xs font-medium ${item.accentText}`}>
                <span>開く</span>
                <ChevronRight size={12} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* ── テーゼ ── */}
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
