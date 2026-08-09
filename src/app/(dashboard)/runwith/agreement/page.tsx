'use client'
// =====================================================
//  src/app/(dashboard)/runwith/agreement/page.tsx
//  合意形成レイヤー ハブページ — Sprint #94
//
//  ■ このページの役割
//    合意形成レイヤーの3つのMVP画面（REQ-01〜03）への入口。
//    離島経済新聞社（鯨本さん）提案起点の新機能。
//    詳細: https://app.notion.com/p/3b6960a91e238103bbfbe90e055f4a43
// =====================================================

import Link from 'next/link'

const CARDS = [
  {
    href: '/runwith/agreement/issues',
    emoji: '🗣️',
    title: '論点タイムライン',
    reqId: 'REQ-02',
    description: '論点ごとの賛成/反対/保留の推移を確認する。内訳は20件集まるまで非公開（k匿名性）。',
  },
  {
    href: '/runwith/agreement/stakeholders',
    emoji: '🧑‍🤝‍🧑',
    title: 'ステークホルダーマップ',
    reqId: 'REQ-01',
    description: '合意形成に関わる住民・事業者・職員・外部パートナーの一覧。匿名希望者は自動的にマスク表示。',
  },
  {
    href: '/runwith/agreement/voice',
    emoji: '📮',
    title: '意見を寄せる',
    reqId: 'REQ-03',
    description: '論点に対する立場を非同期・低圧力で記録する（てつだってのUIパターンを転用）。',
  },
  {
    href: '/runwith/agreement/vision',
    emoji: '🗺️',
    title: '画面イメージ案（議論用）',
    reqId: '仮説',
    description: 'KPI×合意形成の接続案を静的モックで先出し。8/10 鯨本さんMTGのたたき台（未実装・全て仮データ）。',
  },
]

export default function AgreementHubPage() {
  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">🤝 合意形成レイヤー</h1>
        <p className="text-sm text-gray-500 mt-1">
          「対立を可視化し、データで合意をつくる」。立場のズレを可視化し、合意の醸成プロセスを時系列で追跡します。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CARDS.map(c => (
          <Link
            key={c.href}
            href={c.href}
            className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md hover:border-teal-300 transition-all"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-2xl">{c.emoji}</span>
              <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full">{c.reqId}</span>
            </div>
            <h2 className="font-bold text-gray-800 mb-1">{c.title}</h2>
            <p className="text-xs text-gray-500 leading-relaxed">{c.description}</p>
          </Link>
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-700">
        ⚠️ このMVPで採用しているk匿名性の閾値（20件）は開発上の仮設計です。他自治体・他離島への展開前には専門家レビューが必要です。
      </div>
    </div>
  )
}
