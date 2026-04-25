'use client';

/**
 * 屋久島町 RunWith トップページ
 * /yakushima
 *
 * 屋久島町展開モジュールへのハブページ。
 * 世界遺産の島・自然共生型DXの拠点として、
 * 観光・移住・環境保全の3軸でデータを統合管理する。
 */

import Link from 'next/link';

const DASHBOARDS = [
  {
    href: '/yakushima/tourism',
    icon: '🌿',
    title: '観光・エコツーリズム管理',
    desc: '縄文杉トレッキング・白谷雲水峡などの入込客数・満足度・環境負荷をリアルタイム把握。持続可能な観光を実現。',
    color: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    badge: '観光 × 環境',
  },
  {
    href: '/yakushima/migration',
    icon: '🏡',
    title: '移住・定住支援',
    desc: '移住相談者の追跡・定住率・就農支援状況を管理。島外からの移住者を「屋久島の担い手」へと育てる伴走支援。',
    color: 'border-sky-300 bg-sky-50 hover:bg-sky-100',
    badgeColor: 'bg-sky-100 text-sky-700',
    badge: '移住支援 × SDL',
  },
  {
    href: '/gyosei/revenue',
    icon: '💰',
    title: '収益・財政データ分析',
    desc: '観光入込・ふるさと納税・特産品EC販売（ヤクスギ・タンカン・サバ節）の収益データを時系列で分析。',
    color: 'border-violet-300 bg-violet-50 hover:bg-violet-100',
    badgeColor: 'bg-violet-100 text-violet-700',
    badge: '収益データ DB',
  },
  {
    href: '/gyosei/line-consultation',
    icon: '💬',
    title: 'LINE住民相談管理',
    desc: '住民・移住検討者からのLINE相談を一元管理。移住・子育て・観光に関する問い合わせへの対応状況をリアルタイム把握。',
    color: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
    badgeColor: 'bg-amber-100 text-amber-700',
    badge: 'LINE相談ログ DB',
  },
];

export default function YakushimaTopPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">

      {/* ヘッダー */}
      <div className="text-center py-6">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-600 rounded-2xl mb-4 shadow-lg">
          <span className="text-3xl">🏝️</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-800">屋久島町 RunWith</h1>
        <p className="text-emerald-600 font-medium mt-1">世界遺産の島 × 自然共生型DXプラットフォーム</p>
        <p className="text-gray-500 text-sm mt-2">
          鹿児島県屋久島町役場 × RunWith Platform 実証
        </p>
      </div>

      {/* 概要バッジ */}
      <div className="flex flex-wrap justify-center gap-3">
        {[
          { label: '人口',     value: '約1.1万人' },
          { label: '面積',     value: '504 km²' },
          { label: '世界遺産', value: '登録済み' },
          { label: '観光入込', value: '年32万人' },
          { label: '移住者数', value: '増加中' },
        ].map((item) => (
          <div key={item.label} className="bg-white border border-gray-200 rounded-xl px-4 py-2 text-center shadow-sm">
            <div className="text-lg font-bold text-emerald-700">{item.value}</div>
            <div className="text-xs text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      {/* ダッシュボード一覧 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-500 mb-3 uppercase tracking-wide">
          屋久島町 専用ダッシュボード
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

      {/* 屋久島の強み */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-emerald-800 mb-3">🌿 屋久島DXの3本柱</h2>
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { label: '自然共生',   color: '#10b981', desc: '環境負荷を見える化', icon: '🌲' },
            { label: '関係人口',   color: '#0ea5e9', desc: '移住者を地域の力に', icon: '🏡' },
            { label: '持続可能性', color: '#8b5cf6', desc: '次世代へつなぐ島', icon: '♻️' },
          ].map((axis) => (
            <div key={axis.label} className="bg-white rounded-lg p-3 shadow-sm">
              <div className="text-2xl mb-1">{axis.icon}</div>
              <div className="text-sm font-bold" style={{ color: axis.color }}>{axis.label}</div>
              <div className="text-xs text-gray-500 mt-0.5">{axis.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* フッター */}
      <div className="text-center text-xs text-gray-400 pb-4">
        データソース：Notion 標準DB（共通13本）リアルタイム連携
        <br />
        Powered by RunWith Platform × Claude AI
      </div>
    </div>
  );
}
