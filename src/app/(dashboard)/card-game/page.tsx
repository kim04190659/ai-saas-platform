/**
 * /card-game - カードゲーム選択ハブ
 *
 * ※ Sprint #3 修正: このページを (dashboard) ルートグループ内に移動。
 *   これにより、カードゲームのトップページで Sidebar が常に表示される。
 *   実際のゲーム（select/plan/result）はフルスクリーン体験のため
 *   dashboard レイアウト外の app/card-game/ 以下に残す。
 *
 * 全4バージョンのカードゲームを一覧表示し、
 * 稼働中のゲームへの導線を明確にするハブページ。
 */

'use client';

import Link from 'next/link';
import {
  Gamepad2,
  TrendingUp,
  Truck,
  Heart,
  ChevronRight,
} from 'lucide-react';

// ─── ゲーム定義リスト ────────────────────────────────────
// 新しいゲームを追加するときはここにオブジェクトを追加するだけでOK

const games = [
  {
    id: 'pbl',
    version: 'v1〜v4.3',
    icon: Gamepad2,
    title: 'PBL カードゲーム',
    subtitle: '52枚・AI評価付き',
    description:
      'ITIL/SIAMの知見を「チームで体験」する形式に変換。1人では絶対に完成しない設計で、チームの必要性を肌で学べる。結果を行政OSに連携できます。',
    target: '高専・大学生 / 企業新入社員・管理職研修 / 自治体職員研修',
    status: 'active' as const,
    href: '/card-game/select',
    color: 'border-blue-200 bg-blue-50',
    headerColor: 'bg-blue-600',
    badgeColor: 'bg-green-100 text-green-800',
    highlight: true,
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
    highlight: false,
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
    highlight: false,
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
    highlight: false,
  },
];

// ─── メインコンポーネント ─────────────────────────────────

export default function CardGameHubPage() {
  return (
    <div>
      {/* ── ページヘッダー ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">🃏 カードゲーム</h1>
        <p className="text-gray-500 text-sm mt-1">
          35年のIT運用・ITIL/SIAMの知見を「体験学習」に変換。チームで学ぶシリアスゲーム集。
        </p>
      </div>

      {/* ── シナリオ連携バナー ── */}
      {/*
        Sprint #3: カードゲーム → 行政OS のシナリオ連携を案内するバナー。
        PBLカードゲームをプレイすると、結果画面から行政OSへ移動できる。
      */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl">
        <p className="text-sm text-blue-800 font-semibold mb-1">
          💡 シナリオ連携：カードゲーム → 行政OS → RunWith
        </p>
        <p className="text-xs text-blue-600 leading-relaxed">
          PBLカードゲームをプレイすると、ゲーム結果の画面から
          「行政OS」で屋久島の実際のデータを使った本格診断に進めます。
        </p>
      </div>

      {/* ── ゲーム一覧（2列グリッド） ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {games.map((game) => (
          <div
            key={game.id}
            className={`rounded-xl border-2 ${game.color} overflow-hidden shadow-sm ${
              game.highlight ? 'ring-2 ring-blue-400 ring-offset-2' : ''
            }`}
          >
            {/* カードヘッダー */}
            <div className={`${game.headerColor} px-4 py-3 text-white`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <game.icon size={20} />
                  <span className="font-bold text-sm">{game.title}</span>
                </div>
                {/* バージョンバッジ */}
                <span className="text-xs opacity-75 bg-white bg-opacity-20 px-2 py-0.5 rounded-full">
                  {game.version}
                </span>
              </div>
              <p className="text-xs opacity-80 mt-1">{game.subtitle}</p>
            </div>

            {/* カードボディ */}
            <div className="px-4 py-4">
              {/* ステータスバッジ */}
              <span
                className={`inline-block text-xs px-2 py-0.5 rounded-full font-medium mb-3 ${
                  game.status === 'active' ? game.badgeColor : 'bg-gray-100 text-gray-500'
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

              {/* アクションボタン */}
              {game.status === 'active' ? (
                <Link
                  href={game.href}
                  className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-700 transition-colors font-medium"
                >
                  このゲームを始める
                  <ChevronRight size={16} />
                </Link>
              ) : (
                <div className="flex items-center justify-center gap-2 w-full py-2.5 bg-gray-200 text-gray-400 text-sm rounded-lg cursor-not-allowed">
                  準備中
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* ── 開発ロードマップ案内 ── */}
      <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs text-gray-600">
          💡 <strong>開発ロードマップ</strong>：v2（財務）・v3（LOGI-TECH）は順次Next.js版に移植予定。
          PBLカードゲームのゲーム結果から行政OSへの連携機能が利用できます。
        </p>
      </div>
    </div>
  );
}
