'use client';

/**
 * 霧島市 RunWith トップページ
 * /kirishima
 *
 * 霧島市展開の4ダッシュボードへのハブページ
 */

import Link from 'next/link';

const DASHBOARDS = [
  {
    href: '/kirishima/kpi',
    icon: '📊',
    title: 'KPI総合ダッシュボード',
    desc: 'E軸（市民）・T軸（提供者）・L軸（責任者）の9KPIをリアルタイム可視化。目標値との差異をゲージで表示。',
    color: 'border-teal-300 bg-teal-50 hover:bg-teal-100',
    badgeColor: 'bg-teal-100 text-teal-700',
    badge: 'DB06 KPISnapshot',
  },
  {
    href: '/kirishima/touchpoints',
    icon: '🎯',
    title: '市民接触・満足度分析',
    desc: 'チャネル別（窓口・LINE・Web・電話・市民センター）のタッチポイント状況とSDL軸分布を分析。',
    color: 'border-sky-300 bg-sky-50 hover:bg-sky-100',
    badgeColor: 'bg-sky-100 text-sky-700',
    badge: 'DB02 TouchPoint',
  },
  {
    href: '/kirishima/wellbeing',
    icon: '💚',
    title: 'チームWellBeing',
    desc: '職員のWBスコア・体調・仕事の手応え・業務負荷を個人別ラジアルゲージで可視化。要サポート者を自動検出。',
    color: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    badge: 'DB05 WellBeing',
  },
  {
    href: '/kirishima/knowledge',
    icon: '📚',
    title: 'ナレッジ活用状況',
    desc: 'ナレッジベース・VoEインサイト（SDL五軸レーダー）・インシデントのナレッジ化率を統合表示。',
    color: 'border-violet-300 bg-violet-50 hover:bg-violet-100',
    badgeColor: 'bg-violet-100 text-violet-700',
    badge: 'DB07 + DB08 + DB03',
  },
];

export default function KirishimaTopPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* ヘッダー */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-teal-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🏙️</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">霧島市 RunWith</h1>
        <p className="text-teal-600 font-medium mt-1">市民Well-Being向上プラットフォーム</p>
        <p className="text-gray-500 text-sm mt-2">
          鹿児島県霧島市役所 × RunWith Platform 実証
        </p>
      </div>

      {/* 概要バッジ */}
      <div className="flex flex-wrap justify-center gap-3">
        {[
          { label: '市民数', value: '約12万人' },
          { label: '職員数', value: '約1,200名' },
          { label: '管理DB', value: '8DB' },
          { label: 'KPI数', value: '9指標' },
          { label: 'SDL軸', value: '5軸' },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center shadow-sm">
            <div className="text-lg font-bold text-teal-700">{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ダッシュボード一覧 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          ダッシュボード一覧
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {DASHBOARDS.map((dash) => (
            <Link
              key={dash.href}
              href={dash.href}
              className={`block border-2 rounded-xl p-5 transition-colors cursor-pointer ${dash.color}`}
            >
              <div className="flex items-start gap-3">
                <span className="text-3xl">{dash.icon}</span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-800">{dash.title}</h3>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-2">{dash.desc}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${dash.badgeColor}`}>
                    {dash.badge}
                  </span>
                </div>
                <span className="text-gray-400 text-lg">→</span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* SDL五軸の説明 */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-teal-800 mb-3">🔵 SDL五軸（価値共創フレームワーク）</h2>
        <div className="grid grid-cols-5 gap-2 text-center">
          {[
            { label: '共創', color: '#0ea5e9', desc: '市民と共に' },
            { label: '文脈', color: '#8b5cf6', desc: '個別状況把握' },
            { label: '資源', color: '#22c55e', desc: '組織の知識' },
            { label: '統合', color: '#f59e0b', desc: 'サービス連携' },
            { label: '価値', color: '#14b8a6', desc: '市民幸福度' },
          ].map((axis) => (
            <div key={axis.label} className="bg-white rounded-lg p-2 shadow-sm">
              <div className="text-sm font-bold" style={{ color: axis.color }}>{axis.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{axis.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* フッター */}
      <div className="text-center text-xs text-gray-400 pb-4">
        データソース：Notion 8DB（DB01〜DB08）リアルタイム連携
        <br />
        Powered by RunWith Platform × Claude AI
      </div>
    </div>
  );
}
