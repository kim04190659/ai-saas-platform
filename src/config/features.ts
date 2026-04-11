/**
 * ════════════════════════════════════════════════════════
 *  src/config/features.ts
 *  RunWith プラットフォーム 機能登録簿（Feature Registry）
 * ════════════════════════════════════════════════════════
 *
 * ■ プラットフォームのビジョン（2026年4月改訂）
 *   RunWith Platform は自治体のWell-Beingを最大化する基盤。
 *   住民 → LINE → 職員 → エクセレントサービス → Well-Being向上
 *   という価値共創フロー（SDL）を4層のメニューで体現する。
 *
 * ■ 4モジュール構成
 *   ① 住民接点  : 住民とのLINEタッチポイント（sky）
 *   ② 職員支援  : エクセレントサービス提供支援（emerald）
 *   ③ 経営・政策: 町長・議会向け見える化・AI提言（violet）
 *   ④ 基盤・設定: データ蓄積・IT管理・プラットフォーム設定（orange）
 *
 * ■ 新機能を追加するとき
 *   1. 該当モジュールの pages[] に1エントリ追加
 *   2. src/app/(dashboard)/xxx/page.tsx を作成
 *   3. git push → Vercel 自動デプロイ
 *
 * ■ status の意味
 *   'active'  → リンク有効、緑ドット表示
 *   'coming'  → グレーアウト、「準備中」表示
 *   'hidden'  → サイドバーに表示しない
 */

import {
  Users,
  UserCheck,
  BarChart3,
  Settings,
  MapPin,
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
  badge: string;        // バッジテキスト
  description: string;  // ホーム画面カードの説明文
  accent: {
    bg: string;
    border: string;
    icon: string;
    text: string;
    badge: string;
    button: string;
    sidebarActive: string;
    sidebarDot: string;
  };
  pages: FeaturePage[];
};

// ─── 機能登録簿（メインデータ）────────────────────────────
//
// ★ 新機能を追加するときはここを編集してください ★
//

export const FEATURE_MODULES: FeatureModule[] = [

  // ══════════════════════════════════════
  //  🏘️ ① 住民接点
  //  住民がLINEで相談し、タッチポイント活動をNotionに蓄積する層
  //  アクセントカラー: sky（水色）
  // ══════════════════════════════════════
  {
    id: 'citizen',
    icon: Users,
    emoji: '🏘️',
    label: '住民接点',
    badge: '住民・LINE',
    description: '住民がLINEで相談し、タッチポイントでの活動をNotionに蓄積。住民満足度をリアルタイムで把握する。',
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
        // ★ Notionオフロード対象: WellBeingKPI DBのフォームビューで代替可能
        // Webページは「記録確認・AI分析連携」用に残し、
        // 日次入力はNotionフォームで運用することを推奨
        id: 'citizen-services',
        label: '🏘️ 住民サービス状況',
        href: '/gyosei/services',
        status: 'active',
        description: '行政サービスの稼働状況・窓口待ち時間・満足度スコアを記録。日次入力はNotionフォームでも可',
      },
      {
        // Sprint #15 で実装完了
        id: 'citizen-line',
        label: '💬 LINE相談管理',
        href: '/gyosei/line-consultation',
        status: 'active',
        description: '住民からのLINE相談を一覧確認し、対応状況・回答内容をNotionに記録',
      },
      {
        // Sprint #16 で実装完了
        id: 'citizen-touchpoint',
        label: '📍 タッチポイント記録',
        href: '/gyosei/touchpoints',
        status: 'active',
        description: '窓口・電話・訪問の接点をSDL価値共創スコアで可視化。AI顧問のRAGデータに活用',
      },
    ],
  },

  // ══════════════════════════════════════
  //  👥 ② 職員支援
  //  職員がエクセレントサービスを提供できるよう支援する層
  //  アクセントカラー: emerald（緑）
  // ══════════════════════════════════════
  {
    id: 'staff',
    icon: UserCheck,
    emoji: '👥',
    label: '職員支援',
    badge: '職員・研修',
    description: '職員のコンディション管理からAI即時提案、SDL研修カードゲームまで。エクセレントサービスを現場で実現する。',
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
        // ★ Notionオフロード対象: StaffCondition DBのフォームビューで代替可能
        // Webページはスコア可視化・AI連携用に残し、
        // 日次入力はNotionフォームで運用することを推奨
        id: 'staff-condition',
        label: '💚 職員コンディション',
        href: '/gyosei/staff',
        status: 'active',
        description: '体調・業務負荷・チームWell-Beingを日次記録。入力はNotionフォームでも可・AI顧問の推論データに活用',
      },
      {
        id: 'staff-line',
        label: '💬 LINE業務対応',
        href: '/staff/line',
        status: 'active',
        description: '住民からのLINE相談にAIが返答案を即時生成。職員が確認・編集してNotionに保存',
      },
      {
        id: 'staff-ai-suggest',
        label: '🤖 AI窓口即時提案',
        href: '/staff/ai-suggest',
        status: 'active',
        description: '窓口で住民が相談する内容を入力すると、AIが担当課・必要書類・手続き手順を即時提案',
      },
      {
        // ── 研修カードゲーム ────────────────────────────────
        id: 'training-logi-tech',
        label: '🏭 Mission in LOGI-TECH',
        href: '/card-game/select',
        status: 'active',
        description: '物流会社の経営課題をカードで解決するビジネスシミュレーション',
      },
      {
        id: 'training-agile',
        label: '🥬 八百屋アジャイル道場',
        href: '/card-game/agile-yasai',
        status: 'active',
        description: 'アジャイル5要素を体験する研修カードゲーム',
      },
      {
        id: 'training-gyosei-dx',
        label: '🏛️ 行政DXチャレンジ',
        href: '/card-game/gyosei-dx',
        status: 'active',
        description: '新人IT職員として5つのDX課題に挑戦する行政DX体験ゲーム',
      },
      {
        id: 'training-wellbeing-quest',
        label: '💚 Well-Being QUEST',
        href: '/well-being-quest',
        status: 'active',
        description: '職員の働き方改革をテーマにしたカードゲーム',
      },
    ],
  },

  // ══════════════════════════════════════
  //  📊 ③ 経営・政策ダッシュボード
  //  町長・議会が意思決定するための見える化・AI提言層
  //  アクセントカラー: violet（紫）
  // ══════════════════════════════════════
  {
    id: 'executive',
    icon: BarChart3,
    emoji: '📊',
    label: '経営・政策',
    badge: '町長・議会',
    description: '人口・財政・住民WBスコアをAIが横断分析。町長・議会がWell-Beingな街づくりに必要な情報を一画面で確認できる。',
    accent: {
      bg: 'bg-violet-50',
      border: 'border-violet-200',
      icon: 'bg-violet-100 text-violet-600',
      text: 'text-violet-700',
      badge: 'bg-violet-100 text-violet-700',
      button: 'bg-violet-600 hover:bg-violet-700 text-white',
      sidebarActive: 'bg-violet-600 text-white',
      sidebarDot: 'bg-violet-400',
    },
    pages: [
      {
        id: 'executive-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '住民・職員のWell-Beingスコアを総合可視化。人口・財政データと連動',
      },
      {
        id: 'executive-ai-advisor',
        label: '🤖 AI Well-Being顧問',
        href: '/ai-advisor',
        status: 'active',
        description: '4DBのデータをAIが横断分析し、SDL五軸の視点で施策提言を行うチャット',
      },
      {
        // ★ Notionオフロード対象: NotionのCSVインポート機能で代替可能
        // Webのドラッグ&ドロップUIは補助的に残すが、
        // Notionの標準CSVインポートで直接PopulationData DBに取り込める
        id: 'executive-population',
        label: '📥 人口・地域データ',
        href: '/gyosei/population',
        status: 'active',
        description: '自治体CSVをNotionに蓄積。人口・世帯・高齢化率の時系列管理（Notion標準インポートでも可）',
      },
      {
        // Sprint #17 で実装完了
        id: 'executive-revenue',
        label: '💰 収益・財政データ',
        href: '/gyosei/revenue',
        status: 'active',
        description: '観光・産品・宿泊など地域収益データを可視化。AI提言示唆を記録しAI顧問に供給',
      },
      {
        // Sprint #18 で実装完了
        id: 'executive-compare',
        label: '🔍 類似自治体比較分析',
        href: '/gyosei/compare',
        status: 'active',
        description: '類似自治体のWell-Being・DX成熟度・財政力を比較。RunWith導入効果を可視化',
      },
      {
        // Sprint #22 で実装完了
        id: 'executive-document',
        label: '📋 AI政策文書生成',
        href: '/gyosei/document-gen',
        status: 'active',
        description: '蓄積データをAIが横断分析し、議会向けレポート・政策提言書を自動ドラフト',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏙️ ⑤ 霧島市展開（実証モジュール）
  //  霧島市向けNotionオントロジー連携ダッシュボード
  //  8DB・9KPI・SDL五軸を実データで可視化
  //  アクセントカラー: teal（ティール）
  // ══════════════════════════════════════
  {
    id: 'kirishima',
    icon: MapPin,
    emoji: '🏙️',
    label: '霧島市展開',
    badge: '霧島市・実証',
    description: '霧島市向けNotionオントロジー（8DB・9KPI）をリアルタイム可視化。KPI総合・市民接触・WellBeing・ナレッジの4視点ダッシュボード。',
    accent: {
      bg: 'bg-teal-50',
      border: 'border-teal-200',
      icon: 'bg-teal-100 text-teal-600',
      text: 'text-teal-700',
      badge: 'bg-teal-100 text-teal-700',
      button: 'bg-teal-600 hover:bg-teal-700 text-white',
      sidebarActive: 'bg-teal-600 text-white',
      sidebarDot: 'bg-teal-400',
    },
    pages: [
      {
        id: 'kirishima-kpi',
        label: '📊 KPI総合ダッシュボード',
        href: '/kirishima/kpi',
        status: 'active',
        description: 'E軸（市民）・T軸（提供者）・L軸（責任者）の9KPIをゲージと進捗バーでリアルタイム可視化',
      },
      {
        id: 'kirishima-touchpoints',
        label: '🎯 市民接触・満足度分析',
        href: '/kirishima/touchpoints',
        status: 'active',
        description: 'Notion DB02タッチポイントデータをチャネル・カテゴリ・SDL軸で多角的に分析',
      },
      {
        id: 'kirishima-wellbeing',
        label: '💚 チームWellBeing',
        href: '/kirishima/wellbeing',
        status: 'active',
        description: 'Notion DB05のメンバーWBスコア・体調・業務負荷をラジアルゲージで可視化',
      },
      {
        id: 'kirishima-knowledge',
        label: '📚 ナレッジ活用状況',
        href: '/kirishima/knowledge',
        status: 'active',
        description: 'ナレッジベース・VoEインサイト・インシデントの3DBを統合表示。SDL五軸レーダーチャート付き',
      },
    ],
  },

  // ══════════════════════════════════════
  //  ⚙️ ④ 基盤・設定
  //  NotionDB連携・IT基盤管理・プラットフォーム設定層
  //  アクセントカラー: orange（橙）
  // ══════════════════════════════════════
  {
    id: 'platform',
    icon: Settings,
    emoji: '⚙️',
    label: '基盤・設定',
    badge: '管理・IT',
    description: '自治体プロフィール設定からIT成熟度診断・CMDB・集合知ナレッジまで。RunWithの土台を管理する。',
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
        // ★ Notionオフロード対象: MunicipalityProfile DBを直接編集でも代替可能
        // AI顧問への差し込み（Layer 2）は設定内容を読むだけなので
        // Notionで直接編集しても同じ効果が得られる。
        // Webページは初回設定ガイド・視覚確認用として残す。
        id: 'platform-profile',
        label: '⚙️ 自治体プロフィール設定',
        href: '/gyosei/settings',
        status: 'active',
        description: '選ぶだけでAI顧問が自治体専用の言葉に変わるLayer 2設定（Notion直接編集でも可）',
      },
      {
        id: 'platform-maturity',
        label: '📋 IT運用成熟度診断',
        href: '/runwith/maturity',
        status: 'active',
        description: '5領域×9問のチェックで組織のIT成熟度レベルを診断',
      },
      {
        id: 'platform-monitoring',
        label: '📡 サービス監視',
        href: '/runwith/monitoring',
        status: 'active',
        description: 'AWS・Azure・GCP・SalesforceをAIがリアルタイム監視',
      },
      {
        // Sprint #20 で実装完了
        id: 'platform-cmdb',
        label: '🗂️ 構成管理（CMDB）',
        href: '/runwith/cmdb',
        status: 'active',
        description: 'IT資産・システム構成情報を登録・参照管理。更新期限アラートで契約更改を見逃さない',
      },
      {
        // Sprint #21 で実装完了
        id: 'platform-knowledge',
        label: '🧠 集合知ナレッジブラウザ',
        href: '/runwith/knowledge',
        status: 'active',
        description: '限界自治体の課題解決ノウハウを集積・横展開。SDL軸・カテゴリ・キーワードで横断検索',
      },
      {
        // Sprint #23 で実装完了
        id: 'platform-multi-tenant',
        label: '🌐 横展開設定',
        href: '/runwith/multi-tenant',
        status: 'active',
        description: '複数自治体へのRunWith展開を管理。テナント切り替え・オンボーディング進捗確認',
      },
      {
        // Sprint #24 で実装完了 — オントロジー設計フレームワーク統合
        id: 'platform-org-wizard',
        label: '🧠 組織設計ウィザード',
        href: '/runwith/org-wizard',
        status: 'active',
        description: '60分のヒアリング12問に答えるだけで8DB・9KPI・仕様書・マニュアルをNotionに自動生成。新規組織展開を大幅短縮',
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
