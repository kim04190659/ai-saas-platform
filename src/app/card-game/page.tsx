'use client';

/**
 * /card-game - カードゲーム選択ハブ（Sprint #2）
 *
 * 全4バージョンのカードゲームを一覧表示し、
 * 稼働中のゲームへの導線を明確にするハブページ。
 *
 * 新しいゲームを追加するときは `games` 配列にオブジェクトを追加するだけでOK。
 */

import Link from 'next/link';
import {
  Gamepad2,
  TrendingUp,
  Truck,
  Heart,
  ChevronRight,
  BookOpen,
} from 'lucide-react';

// ゲームの定義リスト
// 新しいゲームを追加するときはここにオブジェクトを追加するだけでOK
const games = [
  {
    id: 'pbl',
    version: 'v1',
    icon: Gamepad2,
    title: 'PBLカードゲーム',
    subtitle: '52枚・AI評価付き',
    description:
      'ITIL/SIAMの知見を「チームで体験」する形式に変換。1人では絶対に完成しない設計で、チームの必要性を肌で学べる。',
    target: '高専・大学生 / 企業新入社員・管理職研修 / 自治体職員研修',
    status: 'active' as const,
    href: '/card-game/select',
    color: 'border-blue-200 bg-blue-50',
    headerColor: 'bg-blue-600',
    badgeColor: 'bg-green-100 text-green-800',
  },
  {
    id: 'finance',
    version: 'v2',
    icon: TrendingUp,
    title: '5年間財務プロジェクション',
    subtitle: 'ビジネスプラン教育',
    description:
      '新規事業の5年間の財務シミュレーションをカードゲーム形式で学ぶ。AI評価で実現可能性をフィードバック。',
    target: '企業の事業企画担当 / 起業家・スタートアップ',
    status: 'coming' as const,
    href: '#',
    color: 'border-gray-200 bg-gray-50',
    headerColor: 'bg-gray-400',
    badgeColor: 'bg-gray-100 text-gray-600',
  },
  {
    id: 'logi-tech',
    version: 'v3',
    icon: Truck,
    title: 'LOGI-TECH',
    subtitle: '物流DXゲーム・ミッション機能付き',
    description:
      '物流業界のDX課題をゲーム化。ミッション形式で物流最適化・デジタル化の意思決定を体験する。',
    target: '物流・製造業の担当者 / PALTEK向け研修',
    status: 'coming' as const,
    href: '#',
    color: 'border-gray-200 bg-gray-50',
    headerColor: 'bg-gray-400',
    badgeColor: 'bg-gray-100 text-gray-600',
  },
  {
    id: 'well-being',
    version: 'v4',
    icon: Heart,
    title: 'Well-Being QUEST',
    subtitle: '限界自治体版',
    description:
      '人口1万人・高齢化率50%の自治体が持続可能な街を設計する。縮退をテーマにした行政向けシリアスゲーム。',
    target: '自治体職員 / 地域づくり担当者 / 屋久島実証予定',
    status: 'active' as const,
    href: '/well-being-quest',
    color: 'border-green-200 bg-green-50',
    headerColor: 'bg-green-600',
    badgeColor: 'bg-green-100 text-green-800',
  },
];

export default function CardGamePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* ページヘッダー */}
      <div className="bg-white border-b border-gray-200 px-6 py-5">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-3 mb-1">
            <BookOpen size={24} className="text-blue-600" />
            <h1 className="text-xl font-bold text-gray-800">🃏 カードゲーム</h1>
          </div>
          <p className="text-sm text-gray-500">
            35年のIT運用・ITIL/SIAMの知見を「体験学習」に変換。チームで学ぶシリアスゲーム集。
          </p>
        </div>
      </div>

      {/* ゲーム一覧 */}
      <div className="max-w-4xl mx-auto px-6 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {games.map((game) => (
            <div
              key={game.id}
              className={`rounded-xl border-2 ${game.color} overflow-hidden shadow-sm`}
            >
              {/* カードヘッダー：ゲーム名とバージョンを表示 */}
              <div className={`${game.headerColor} px-4 py-3 text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <game.icon size={20} />
                    <span className="font-bold text-sm">{game.title}</span>
                  </div>
                  {/* バージョン番号バッジ */}
                  <span className="text-xs opacity-75 bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                    {game.version}
                  </span>
                </div>
                <p className="text-xs opacity-80 mt-1">{game.subtitle}</p>
              </div>

              {/* カードボディ：説明・対象者・ボタン */}
              <div className="px-4 py-4">
                {/* ステータスバッジ：稼働中 or 準備中 */}
                <span
                  className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${
                    game.status === 'active'
                      ? game.badgeColor
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {game.status === 'active' ? '✅ 稼働中' : '🚧 準備中'}
                </span>

                {/* ゲーム説明 */}
                <p className="text-sm text-gray-600 leading-relaxed mb-3">
                  {game.description}
                </p>

                {/* 対象者 */}
                <p className="text-xs text-gray-400 mb-4">
                  <span className="font-medium">対象：</span>{game.target}
                </p>

                {/* アクションボタン：稼働中はリンク、準備中はグレーアウト */}
                {game.status === 'active' ? (
                  <Link
                    href={game.href}
                    className="flex items-center justify-center gap-2 w-full py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    このゲームを始める
                    <ChevronRight size={16} />
                  </Link>
                ) : (
                  // 準備中のゲームはクリックできないグレーボタン
                  <div className="flex items-center justify-center gap-2 w-full py-2 bg-gray-200 text-gray-400 text-sm rounded-lg cursor-not-allowed">
                    準備中
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* 開発ロードマップの案内メモ */}
        <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-lg">
          <p className="text-xs text-blue-700">
            💡 <strong>開発ロードマップ</strong>：v2（財務）・v3（LOGI-TECH）は順次Next.js版に移植予定。
            新しいゲームの追加はJSONファイルだけで対応できる設計にする。
          </p>
        </div>
      </div>
    </div>
  );
}
