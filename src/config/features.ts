/**
 * ════════════════════════════════════════════════════════
 *  src/config/features.ts
 *  RunWith プラットフォーム 機能登録簿（Feature Registry）
 * ════════════════════════════════════════════════════════
 *
 * ■ このファイルの役割
 *   サイドバーのメニュー構造と全ページの定義を一元管理する。
 *   新機能を追加するとき、このファイルに1エントリ加えるだけで
 *   サイドバーが自動的に更新される。
 *
 * ■ Claudeとの会話で機能を追加する手順
 *   1. このファイルの該当モジュールの pages[] に1行追加
 *      例: { id: 'new-page', label: '新機能', href: '/runwith/new-page', status: 'coming' }
 *   2. src/app/(dashboard)/runwith/new-page/page.tsx を PAGE_TEMPLATE を元に作成
 *   3. git push → Vercel 自動デプロイ
 *
 * ■ status の意味
 *   'active'  → リンク有効、緑ドット表示
 *   'coming'  → グレーアウト、「準備中」表示（メニューには載る）
 *   'hidden'  → サイドバーに表示しない（開発中で非公開）
 */

import {
  Gamepad2,
  Building2,
  Activity,
  type LucideIcon,
} from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────────

/** ページ1件の定義 */
export type FeaturePage = {
  id: string;          // 一意のID（英数字・ハイフン）
  label: string;       // サイドバーに表示するラベル
  href: string;        // URLパス
  status: 'active' | 'coming' | 'hidden';
  description?: string; // ホーム画面カードに表示する説明（任意）
};

/** モジュール（グループ）1件の定義 */
export type FeatureModule = {
  id: string;           // 一意のID
  icon: LucideIcon;     // lucide-react アイコン
  emoji: string;        // 絵文字（ラベル前につける）
  label: string;        // サイドバーのグループ名
  badge: string;        // バッジテキスト（教育/自治体/運用管理 など）
  description: string;  // ホーム画面カードの説明文
  // ── アクセントカラー（モジュール固有）──
  // Tailwind クラスを文字列で保持する（動的生成ではクラスが消えるため）
  accent: {
    bg: string;       // 例: 'bg-sky-50'
    border: string;   // 例: 'border-sky-200'
    icon: string;     // 例: 'bg-sky-100 text-sky-600'
    text: string;     // 例: 'text-sky-700'
    badge: string;    // 例: 'bg-sky-100 text-sky-700'
    button: string;   // 例: 'bg-sky-600 hover:bg-sky-700 text-white'
    // サイドバー（ダーク背景）用
    sidebarActive: string; // 例: 'bg-sky-600 text-white'
    sidebarDot: string;    // 例: 'bg-sky-400'
  };
  pages: FeaturePage[];
};

// ─── 機能登録簿（メインデータ）────────────────────────────
//
// ★ 新機能を追加するときはここを編集してください ★
//

export const FEATURE_MODULES: FeatureModule[] = [

  // ══════════════════════════════════════
  //  🃏 カードゲーム（LOGI-TECH）
  //  アクセントカラー: sky（水色）
  // ══════════════════════════════════════
  {
    id: 'card-game',
    icon: Gamepad2,
    emoji: '🃏',
    label: 'カードゲーム',
    badge: '教育',
    description: 'ITIL/SIAMの知見を体験学習。高専・企業研修・自治体職員研修でITサービス管理を楽しく習得。',
    accent: {
      bg: 'bg-sky-50',
      border: 'border-sky-200',
      icon: 'bg-sky-100 text-sky-600',
      text: 'text-sky-700',
      badge: 'bg-sky-100 text-sky-700',
      button: 'bg-sky-600 hover:bg-sky-700 text-white',
      sidebarActive: 'bg-sky-600 text-white',
      sidebarDot: 'bg-sky-400',
    },
    pages: [
      {
        id: 'logi-tech',
        label: '🏭 Mission in LOGI-TECH',
        href: '/card-game/select',
        status: 'active',
        description: '物流会社の経営課題をカードで解決するビジネスシミュレーション',
      },
      {
        id: 'agile-yasai',
        label: '🥬 八百屋アジャイル道場',
        href: '/card-game/agile-yasai',
        status: 'active',
        description: '八百屋のスムージー経営でアジャイルの5要素を体験！最上先生が導くカードゲーム。',
      },
      {
        id: 'gyosei-dx',
        label: '🏛️ 行政DXチャレンジ',
        href: '/card-game/gyosei-dx',
        status: 'active',
        description: '新人IT職員として5つのDX課題に挑戦！高専生向け行政DX体験ゲーム',
      },
      {
        id: 'well-being-quest',
        label: '💚 Well-Being QUEST',
        href: '/well-being-quest',
        status: 'active',
        description: '職員の働き方改革をテーマにしたカードゲーム',
      },
      {
        id: 'it-ops-game',
        label: '⚙️ IT運用改善ゲーム',
        href: '/card-game/it-ops',
        status: 'coming',
        description: 'インシデント対応をテーマにしたシミュレーション（開発中）',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏛️ 行政OS
  //  アクセントカラー: emerald（緑）
  // ══════════════════════════════════════
  {
    id: 'gyosei',
    icon: Building2,
    emoji: '🏛️',
    label: '行政OS',
    badge: '自治体',
    description: '限界自治体が職員12名で大都市と同等のサービスを提供できる仕組み。屋久島PoC進行中。',
    accent: {
      bg: 'bg-emerald-50',
      border: 'border-emerald-200',
      icon: 'bg-emerald-100 text-emerald-600',
      text: 'text-emerald-700',
      badge: 'bg-emerald-100 text-emerald-700',
      button: 'bg-emerald-600 hover:bg-emerald-700 text-white',
      sidebarActive: 'bg-emerald-600 text-white',
      sidebarDot: 'bg-emerald-400',
    },
    pages: [
      {
        id: 'gyosei-dashboard',
        label: '📊 Well-Being ダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '屋久島の人口・財政・SDGsデータを可視化',
      },
      {
        id: 'gyosei-services',
        label: '🏘️ 住民サービス状況',
        href: '/gyosei/services',
        status: 'coming',
        description: '行政サービスの充足率・利用状況を管理',
      },
      {
        id: 'gyosei-staff',
        label: '👥 職員業務支援',
        href: '/gyosei/staff',
        status: 'coming',
        description: '職員のタスク・業務負荷を見える化',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🔧 RunWith
  //  アクセントカラー: orange（橙）
  // ══════════════════════════════════════
  {
    id: 'runwith',
    icon: Activity,
    emoji: '🔧',
    label: 'RunWith',
    badge: '運用管理',
    description: '35年のIT運用知見をソフトウェアに実装。ITIL/SIAMベースの運用管理ツールで組織のIT成熟度を可視化。',
    accent: {
      bg: 'bg-orange-50',
      border: 'border-orange-200',
      icon: 'bg-orange-100 text-orange-600',
      text: 'text-orange-700',
      badge: 'bg-orange-100 text-orange-700',
      button: 'bg-orange-600 hover:bg-orange-700 text-white',
      sidebarActive: 'bg-orange-600 text-white',
      sidebarDot: 'bg-orange-400',
    },
    pages: [
      {
        id: 'runwith-maturity',
        label: '📋 IT運用成熟度診断',
        href: '/runwith/maturity',
        status: 'active',
        description: '5領域×9問のチェックで組織のIT成熟度レベルを診断',
      },
      {
        id: 'monitoring',
        label: '📡 サービス監視',
        href: '/runwith/monitoring',
        status: 'active',
        description: 'AWS・Azure・GCP・SalesforceをAIがリアルタイム監視。Downdetector情報と公式ステータスを統合表示。',
      },
      {
        id: 'runwith-incidents',
        label: '🚨 インシデント管理',
        href: '/runwith/incidents',
        status: 'coming',
        description: 'インシデントの記録・分析・再発防止管理',
      },
      {
        id: 'runwith-kpi',
        label: '📈 運用KPIダッシュボード',
        href: '/runwith/kpi',
        status: 'coming',
        description: '運用品質のKPI指標をリアルタイム監視',
      },
    ],
  },
];

// ─── ユーティリティ ──────────────────────────────────────

/** 指定IDのモジュールを取得 */
export function getModule(moduleId: string): FeatureModule | undefined {
  return FEATURE_MODULES.find((m) => m.id === moduleId);
}

/** activeなページだけを取得（ホーム画面カードのリンクに使用） */
export function getActivePages(moduleId: string): FeaturePage[] {
  const mod = getModule(moduleId);
  return mod?.pages.filter((p) => p.status === 'active') ?? [];
}

/** サイドバーに表示するページ（hidden 以外）を取得 */
export function getVisiblePages(moduleId: string): FeaturePage[] {
  const mod = getModule(moduleId);
  return mod?.pages.filter((p) => p.status !== 'hidden') ?? [];
}
