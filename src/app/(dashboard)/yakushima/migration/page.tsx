'use client';

/**
 * 屋久島町 移住・定住支援ページ
 * /yakushima/migration
 *
 * 屋久島への移住相談から定住・就農・起業までの伴走支援状況を可視化する。
 * 「島外からの担い手確保」が町の最重要課題の一つ。
 */

import Link from 'next/link';

// ─── サンプルデータ ──────────────────────────────────

/** 移住支援のフェーズ別件数（funnel） */
const MIGRATION_FUNNEL = [
  { phase: '問い合わせ・相談',   count: 148, icon: '📩', color: 'bg-sky-100 text-sky-700 border-sky-200' },
  { phase: '現地訪問・体験',     count: 62,  icon: '✈️', color: 'bg-teal-100 text-teal-700 border-teal-200' },
  { phase: '移住決定',           count: 28,  icon: '🏡', color: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
  { phase: '定住（1年以上）',    count: 21,  icon: '🌱', color: 'bg-green-100 text-green-700 border-green-200' },
  { phase: '就農・起業',         count: 8,   icon: '🌾', color: 'bg-lime-100 text-lime-700 border-lime-200' },
];

/** 移住者の属性内訳 */
const MIGRANT_PROFILES = [
  { label: '30代・子育て世代',  pct: 38, icon: '👪', color: '#0ea5e9' },
  { label: '20代・移住就農',    pct: 25, icon: '🌾', color: '#22c55e' },
  { label: '40代・テレワーク',  pct: 20, icon: '💻', color: '#8b5cf6' },
  { label: '50代以上・リタイア', pct: 17, icon: '🏖️', color: '#f59e0b' },
];

/** 支援制度の利用状況 */
const SUPPORT_PROGRAMS = [
  { name: '移住支援金（最大100万円）',  used: 18, capacity: 30, status: '募集中',   color: 'text-emerald-600' },
  { name: '空き家バンク活用',            used: 12, capacity: 20, status: '空き多数', color: 'text-sky-600' },
  { name: '農業体験プログラム',          used: 24, capacity: 24, status: '満員',     color: 'text-red-600' },
  { name: '起業支援（創業補助金）',      used: 5,  capacity: 10, status: '募集中',   color: 'text-emerald-600' },
  { name: 'オンライン移住相談（月2回）', used: 31, capacity: 40, status: '受付中',   color: 'text-sky-600' },
];

// ─── メインコンポーネント ─────────────────────────────

export default function YakushimaMigrationPage() {
  const totalMigrants   = MIGRATION_FUNNEL.find(f => f.phase === '移住決定')?.count ?? 0;
  const settlementRate  = Math.round(
    ((MIGRATION_FUNNEL.find(f => f.phase === '定住（1年以上）')?.count ?? 0) / totalMigrants) * 100
  );
  const consultations   = MIGRATION_FUNNEL[0].count;
  const conversionRate  = Math.round((totalMigrants / consultations) * 100);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏡 移住・定住支援</h1>
          <p className="text-gray-500 mt-1 text-sm">
            屋久島町 — 問い合わせから定住・就農まで「島での暮らし」を丸ごと伴走支援します
          </p>
        </div>
        <Link
          href="/yakushima"
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          ← 屋久島トップ
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '📩', label: '年間相談件数',   value: consultations,         unit: '件',  color: 'bg-sky-50 border-sky-200' },
          { icon: '🏡', label: '移住決定者',     value: totalMigrants,         unit: '名',  color: 'bg-emerald-50 border-emerald-200' },
          { icon: '📈', label: '相談→移住転換率', value: `${conversionRate}`,  unit: '%',   color: 'bg-teal-50 border-teal-200' },
          { icon: '🌱', label: '1年定住率',      value: `${settlementRate}`,   unit: '%',   color: settlementRate >= 70 ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-xs text-gray-500 mb-1">{c.icon} {c.label}</p>
            <p className="text-2xl font-bold text-gray-800">
              {c.value}
              <span className="text-sm font-normal ml-1 text-gray-500">{c.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* 移住ファネル */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">🪜 移住サポートファネル（今年度累計）</h2>
        <div className="space-y-3">
          {MIGRATION_FUNNEL.map((f, i) => {
            const maxCount = MIGRATION_FUNNEL[0].count;
            const barWidth = Math.round((f.count / maxCount) * 100);
            return (
              <div key={f.phase} className="flex items-center gap-4">
                <div className="w-32 shrink-0 flex items-center gap-2">
                  <span className="text-lg">{f.icon}</span>
                  <span className="text-xs text-gray-600 leading-tight">{f.phase}</span>
                </div>
                <div className="flex-1 bg-gray-100 rounded-full h-6 overflow-hidden">
                  <div
                    className={`h-6 rounded-full flex items-center justify-end pr-2 transition-all border ${f.color}`}
                    style={{ width: `${barWidth}%` }}
                  >
                    <span className="text-xs font-bold">{f.count}名</span>
                  </div>
                </div>
                {i > 0 && (
                  <span className="text-xs text-gray-400 w-16 text-right shrink-0">
                    前段比 {Math.round((f.count / MIGRATION_FUNNEL[i-1].count) * 100)}%
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 移住者属性 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">👥 移住者の属性内訳</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {MIGRANT_PROFILES.map((p) => (
            <div key={p.label} className="bg-gray-50 rounded-xl p-4 text-center border border-gray-200">
              <div className="text-2xl mb-1">{p.icon}</div>
              <div className="text-2xl font-bold" style={{ color: p.color }}>{p.pct}%</div>
              <div className="text-xs text-gray-500 mt-1 leading-tight">{p.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 支援制度利用状況 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">🎁 支援制度の利用状況</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {SUPPORT_PROGRAMS.map((p) => {
            const pct = Math.round((p.used / p.capacity) * 100);
            return (
              <div key={p.name} className="px-6 py-3 flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm text-gray-700">{p.name}</span>
                    <span className={`text-xs font-medium ${p.color}`}>【{p.status}】</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${pct >= 100 ? 'bg-red-400' : pct >= 70 ? 'bg-amber-400' : 'bg-emerald-400'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-gray-500 shrink-0">{p.used} / {p.capacity}枠</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ガイドバナー */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2">
          💡 移住促進 × RunWith の活用方法
        </h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          LINE相談から入ってきた移住希望者の問い合わせを本ページで追跡管理します。
          AI顧問は移住者データと地域課題データを統合して「どの支援策が最も定住率向上に効くか」を分析・提言します。
        </p>
        <div className="flex gap-2 mt-3">
          <Link href="/ai-advisor"
            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
            🤖 AI顧問で移住施策を分析する
          </Link>
          <Link href="/gyosei/line-consultation"
            className="text-xs bg-white text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition">
            💬 LINE相談を見る
          </Link>
        </div>
      </div>

    </div>
  );
}
