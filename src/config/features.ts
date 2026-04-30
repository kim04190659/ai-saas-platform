/**
 * ════════════════════════════════════════════════════════
 *  src/config/features.ts
 *  RunWith プラットフォーム 機能登録簿（Feature Registry）
 * ════════════════════════════════════════════════════════
 *
 * ■ プラットフォームのビジョン（2026年4月改訂）
 *   RunWith Platform は自治体のWell-Beingを最大化する基盤。
 *   住民 → LINE → 職員 → エクセレントサービス → Well-Being向上
 *   という価値共創フロー（SDL）を5グループのメニューで体現する。
 *
 * ■ 4グループ構成（2026年4月 Sprint #74 再編）
 *   ── 基本機能（全自治体共通）────────────────────────
 *   ① 住民接点    : 住民とのLINEタッチポイント（sky）
 *   ② 職員支援    : エクセレントサービス提供支援（emerald）
 *   ③ 経営・政策  : 町長・議会向け見える化・AI提言（violet）
 *   ④ 研修・学習  : SDL体験型カードゲーム研修（purple）
 *   ── AI拡張機能（選択導入型）────────────────────────
 *   🏡 移住定着リスクAI / 🏥 往診優先順位AI / 🌱 CO2トラッカー
 *   🌾 農業マッチング / 👶 子育て流出リスク / 🏗️ 復興進捗
 *   🏭 地場産業6次産業化
 *   ── 自治体展開（自治体固有ページ）──────────────────
 *   🏙️ 霧島市 / 🏝️ 屋久島町 / 四万十市 ほか
 *   ── 運用管理 ─────────────────────────────────────
 *   ⑩ 基盤・設定  : ウィザード・IT管理・プラットフォーム設定（orange）
 *
 * ■ hidden 対応（Sprint #74）
 *   - department グループ（教育・警察消防・医療介護・公共設備）: hidden
 *   - koumuin（公務員連携）: hidden（将来の部門横断ビューで復活予定）
 *   - personal-coarc: hidden（別製品として分離検討）
 *   - NEC コーポレートIT: hidden（法人向け設計を固めてから再開）
 *
 * ■ 新機能を追加するとき
 *   1. 該当モジュールの pages[] に1エントリ追加
 *   2. src/app/(dashboard)/xxx/page.tsx を作成
 *   3. git push → Vercel 自動デプロイ
 *
 * ■ 新しい自治体を追加するとき
 *   1. group: 'municipality' のモジュールを追加
 *   2. Notionの「🏙️ 自治体・組織 展開ページ」直下にページ作成
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
  GraduationCap,
  Shield,
  Heart,
  Globe,
  BookOpen,
  type LucideIcon,
} from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────────

/**
 * モジュールのグループ分類
 *   core        : 基本機能（住民接点・職員支援・経営政策・研修）
 *   ai-ext      : AI拡張機能（課題特化型AIエンジン群・全自治体常時表示）
 *   department  : 部門別（教育・警察消防・医療介護・公共設備）← Sprint #75以降で順次実装
 *   cross       : 横断・研修（公務員連携）← 現在 hidden
 *   municipality: 自治体展開（霧島市・屋久島町・四万十市 など）
 *   platform    : 運用管理（ウィザード・IT管理・設定）
 */
export type ModuleGroup = 'core' | 'ai-ext' | 'department' | 'cross' | 'municipality' | 'platform';

/** サイドバーのセクションヘッダーラベル */
export const GROUP_LABELS: Record<ModuleGroup, string> = {
  core:         '🏛️ 基本機能',
  'ai-ext':     '🤖 AI拡張機能',
  department:   '🏢 部門別',        // hidden 中（実装まで非表示）
  cross:        '🌐 横断・研修',    // hidden 中
  municipality: '🏙️ 自治体ページ',
  platform:     '⚙️ 運用管理',
};

/** セクションの表示順（この順番でサイドバーに並ぶ）
 *  ※ department・cross はここに含めないことで非表示にしている
 */
export const GROUP_ORDER: ModuleGroup[] = ['core', 'ai-ext', 'municipality', 'platform'];

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
  group: ModuleGroup;   // サイドバーのセクション分類
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
  //  🎯 必須機能（essentials）Sprint #74 新設
  //  全自治体ページに必ず入れる4機能のみ。
  //  ここだけ見れば自治体DXの最低限が動く。
  //  アクセントカラー: blue（誠実さ・行政の信頼をイメージ）
  // ══════════════════════════════════════
  {
    id: 'essentials',
    group: 'core',
    icon: Users,
    emoji: '🎯',
    label: '必須機能',
    badge: '全自治体共通',
    description: 'ダッシュボード・LINE業務対応・AI窓口提案・職員コンディション。どの自治体にも必ず導入する4機能。',
    accent: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      sidebarActive: 'bg-blue-600 text-white',
      sidebarDot: 'bg-blue-400',
    },
    pages: [
      {
        id: 'essential-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '住民・職員のWell-Beingスコアを総合可視化。選択中の自治体データを自動切り替え',
      },
      {
        id: 'essential-line',
        label: '💬 LINE業務対応',
        href: '/staff/line',
        status: 'active',
        description: '住民からのLINE相談にAIが返答案を即時生成。職員が確認・編集してNotionに保存',
      },
      {
        id: 'essential-ai-suggest',
        label: '🤖 AI窓口即時提案',
        href: '/staff/ai-suggest',
        status: 'active',
        description: '窓口で住民が相談する内容を入力すると、AIが担当課・必要書類・手続き手順を即時提案',
      },
      {
        id: 'essential-staff',
        label: '💚 職員コンディション管理',
        href: '/gyosei/staff',
        status: 'active',
        description: '体調・業務負荷・チームWell-Beingを日次記録。離職リスクの早期検知に活用',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏘️ ① 住民接点（Sprint #74: basic-ai へ移動・非表示）
  //  住民がLINEで相談し、タッチポイント活動をNotionに蓄積する層
  //  アクセントカラー: sky（水色）
  // ══════════════════════════════════════
  {
    id: 'citizen',
    group: 'core',   // Sprint #74: ページは全てbasic-aiへ移動・hidden化
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
        // Sprint #74: basic-aiモジュールへ移動のためhidden
        id: 'citizen-services',
        label: '🏘️ 住民サービス状況',
        href: '/gyosei/services',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'citizen-line',
        label: '💬 LINE相談管理',
        href: '/gyosei/line-consultation',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'citizen-touchpoint',
        label: '📍 タッチポイント記録',
        href: '/gyosei/touchpoints',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'citizen-push-notifications',
        label: '🔔 住民プッシュ通知',
        href: '/gyosei/push-notifications',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
    ],
  },

  // ══════════════════════════════════════
  //  👥 ② 職員支援
  //  職員がエクセレントサービスを提供できるよう支援する層
  //  アクセントカラー: emerald（緑）
  //  ※ 研修カードゲームは ⑨研修・学習 へ分離
  // ══════════════════════════════════════
  {
    id: 'staff',
    group: 'core',   // 行政コア
    icon: UserCheck,
    emoji: '👥',
    label: '職員支援',
    badge: '職員・AI支援',
    description: '職員のコンディション管理からLINE業務対応・AI窓口即時提案まで。エクセレントサービスを現場で実現する。',
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
        // Sprint #74: essentials モジュールへ統合のためhidden
        id: 'staff-condition',
        label: '💚 職員コンディション',
        href: '/gyosei/staff',
        status: 'hidden',
        description: '必須機能モジュールへ移動済み',
      },
      {
        id: 'staff-line',
        label: '💬 LINE業務対応',
        href: '/staff/line',
        status: 'hidden',
        description: '必須機能モジュールへ移動済み',
      },
      {
        id: 'staff-ai-suggest',
        label: '🤖 AI窓口即時提案',
        href: '/staff/ai-suggest',
        status: 'hidden',
        description: '必須機能モジュールへ移動済み',
      },
      {
        // Sprint #74: basic-aiモジュールへ移動のためhidden
        id: 'staff-document-generator',
        label: '✨ AI文書自動起案',
        href: '/gyosei/document-generator',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'staff-predictive-alerts',
        label: '🔮 予兆検知ダッシュボード',
        href: '/gyosei/predictive-alerts',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'staff-citizen-radar',
        label: '🎯 住民困り事レーダー',
        href: '/gyosei/citizen-radar',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'staff-issue-policy',
        label: '💡 困り事 → 施策提案',
        href: '/gyosei/issue-policy',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'staff-weekly-summary',
        label: '📋 週次WBサマリー生成',
        href: '/gyosei/weekly-summary',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'staff-emergency-support',
        label: '🚨 緊急時住民支援',
        href: '/gyosei/emergency-support',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'staff-risk-scoring',
        label: '🔴 離職リスクスコアリング',
        href: '/gyosei/risk-scoring',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
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
    group: 'core',   // 行政コア
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
        // Sprint #74: essentials モジュールへ統合のためhidden
        id: 'executive-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'hidden',
        description: '必須機能モジュールへ移動済み',
      },
      {
        // Sprint #74: basic-aiモジュールへ移動のためhidden
        id: 'executive-ai-advisor',
        label: '🤖 AI Well-Being顧問',
        href: '/ai-advisor',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'executive-population',
        label: '📥 人口・地域データ',
        href: '/gyosei/population',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'executive-revenue',
        label: '💰 収益・財政データ',
        href: '/gyosei/revenue',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'executive-compare',
        label: '🔍 類似自治体比較分析',
        href: '/gyosei/compare',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'executive-document',
        label: '📋 AI政策文書生成',
        href: '/gyosei/document-gen',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'executive-shrink-scenario',
        label: '🗺️ 縮小シナリオ×地区WellBeing',
        href: '/gyosei/shrink-scenario',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        // Sprint #74: 職員支援グループへ移動のためhidden
        id: 'executive-weekly-summary',
        label: '📋 週次WBサマリー生成',
        href: '/gyosei/weekly-summary',
        status: 'hidden',
        description: '職員支援グループへ移動済み',
      },
      {
        // Sprint #74: 職員支援グループへ移動のためhidden
        id: 'gyosei-emergency-support',
        label: '🚨 緊急時住民支援',
        href: '/gyosei/emergency-support',
        status: 'hidden',
        description: '職員支援グループへ移動済み',
      },
      {
        // Sprint #74: 職員支援グループへ移動のためhidden
        id: 'executive-risk-scoring',
        label: '🔴 離職リスクスコアリング',
        href: '/gyosei/risk-scoring',
        status: 'hidden',
        description: '職員支援グループへ移動済み',
      },
      {
        // Sprint #74: basic-aiモジュールへ移動のためhidden
        id: 'gyosei-fiscal-health',
        label: '💴 財政健全化管理',
        href: '/gyosei/fiscal-health',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'gyosei-infra-aging',
        label: '🏗️ インフラ老朽化管理',
        href: '/gyosei/infra-aging',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'gyosei-management-dashboard',
        label: '🏛️ 経営ダッシュボード',
        href: '/gyosei/management-dashboard',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'gyosei-dx-effectiveness',
        label: '🔍 DX効果測定ダッシュボード',
        href: '/gyosei/dx-effectiveness',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        id: 'gyosei-quarterly-report',
        label: '📊 四半期AI分析レポート',
        href: '/gyosei/quarterly-report',
        status: 'hidden',
        description: 'basic-aiモジュールへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-migration-risk',
        label: '🏡 移住定着リスクAI',
        href: '/gyosei/migration-risk',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-visit-priority',
        label: '🏥 往診優先順位AI',
        href: '/gyosei/visit-priority',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-carbon-tracker',
        label: '🌱 CO2削減進捗トラッカー',
        href: '/gyosei/carbon-tracker',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-recovery-dashboard',
        label: '🏗️ 復興進捗ダッシュボード',
        href: '/gyosei/recovery-dashboard',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-farm-matching',
        label: '🌾 農業担い手マッチングAI',
        href: '/gyosei/farm-matching',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-local-industry',
        label: '🏭 地場産業6次産業化支援AI',
        href: '/gyosei/local-industry',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
      {
        // Sprint #74: AI拡張機能グループへ移動のためhidden
        id: 'gyosei-childcare-risk',
        label: '👶 子育て流出リスクAI',
        href: '/gyosei/childcare-risk',
        status: 'hidden',
        description: 'AI拡張機能グループへ移動済み',
      },
    ],
  },

  // ══════════════════════════════════════
  //  📦 基本AIセット（basic-ai）Sprint #74 新設
  //  旧・基本機能グループから移動した全機能。
  //  必須4機能以外の標準的な行政DX機能群。
  //  アクセントカラー: teal（実用・信頼・安定）
  // ══════════════════════════════════════
  {
    id: 'basic-ai',
    group: 'ai-ext',
    icon: BarChart3,
    emoji: '📦',
    label: '基本AIセット',
    badge: '標準機能・拡張',
    description: '住民接点強化・職員AI支援・経営分析・研修など、自治体DXの標準機能セット。必須4機能に追加して段階的に導入できる。',
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
      // ── 住民接点（旧・住民接点モジュール） ──
      {
        id: 'basic-citizen-services',
        label: '🏘️ 住民サービス状況',
        href: '/gyosei/services',
        status: 'active',
        description: '行政サービスの稼働状況・窓口待ち時間・満足度スコアを記録',
      },
      {
        id: 'basic-citizen-line',
        label: '💬 LINE相談管理',
        href: '/gyosei/line-consultation',
        status: 'active',
        description: '住民からのLINE相談を一覧確認し、対応状況・回答内容をNotionに記録',
      },
      {
        id: 'basic-citizen-touchpoint',
        label: '📍 タッチポイント記録',
        href: '/gyosei/touchpoints',
        status: 'active',
        description: '窓口・電話・訪問の接点をSDL価値共創スコアで可視化。AI顧問のRAGデータに活用',
      },
      {
        id: 'basic-citizen-push',
        label: '🔔 住民プッシュ通知',
        href: '/gyosei/push-notifications',
        status: 'active',
        description: '緊急アラート・手続き期限リマインド・行事案内をLINEで住民に先回り配信',
      },
      // ── 職員支援（旧・職員支援モジュールの拡張部分） ──
      {
        id: 'basic-staff-document',
        label: '✨ AI文書自動起案',
        href: '/gyosei/document-generator',
        status: 'active',
        description: '議事録・住民通知文・業務報告書をメモ入力だけでAIが起案。職員は確認・修正するだけ',
      },
      {
        id: 'basic-staff-predictive',
        label: '🔮 予兆検知ダッシュボード',
        href: '/gyosei/predictive-alerts',
        status: 'active',
        description: 'インフラ老朽化・離職リスク・住民満足度低下をAIが先回り検知。週次自動実行＋LINE通知',
      },
      {
        id: 'basic-staff-radar',
        label: '🎯 住民困り事レーダー',
        href: '/gyosei/citizen-radar',
        status: 'active',
        description: 'Webから住民の困り事を自動収集。AIがカテゴリ分類・優先度付けしてNotionに蓄積',
      },
      {
        id: 'basic-staff-issue-policy',
        label: '💡 困り事 → 施策提案',
        href: '/gyosei/issue-policy',
        status: 'active',
        description: '収集した困り事をカテゴリ別に集計・トレンド分析。AIが優先施策を提案するWell-Being向上サイクル',
      },
      {
        id: 'basic-staff-weekly',
        label: '📋 週次WBサマリー生成',
        href: '/gyosei/weekly-summary',
        status: 'active',
        description: '全部門のコンディションを集計しAIサマリーをNotionに保存。毎週月曜9時に自動実行',
      },
      {
        id: 'basic-staff-emergency',
        label: '🚨 緊急時住民支援',
        href: '/gyosei/emergency-support',
        status: 'active',
        description: '台風・地震などの緊急時に要支援スコアを算出し、地区別対応計画をAIが生成',
      },
      {
        id: 'basic-staff-risk',
        label: '🔴 離職リスクスコアリング',
        href: '/gyosei/risk-scoring',
        status: 'active',
        description: '過去4週間のWBスコア推移を職員ごとに分析。危険水準を自動検知しNotionにリスクレポートを保存',
      },
      // ── 経営・政策（旧・経営・政策モジュールの拡張部分） ──
      {
        id: 'basic-ai-advisor',
        label: '🤖 AI Well-Being顧問',
        href: '/ai-advisor',
        status: 'active',
        description: '蓄積データをAIが横断分析し、SDL五軸の視点で施策提言を行うチャット型顧問',
      },
      {
        id: 'basic-management-dashboard',
        label: '🏛️ 経営ダッシュボード',
        href: '/gyosei/management-dashboard',
        status: 'active',
        description: '財政健全化・インフラ老朽化・PDCA進捗・住民WBスコアの4領域を1画面に集約。市長・幹部向け',
      },
      {
        id: 'basic-fiscal-health',
        label: '💴 財政健全化管理',
        href: '/gyosei/fiscal-health',
        status: 'active',
        description: '実質公債費比率・将来負担比率・経常収支比率等をAIが分析。3シナリオで改善提言を生成',
      },
      {
        id: 'basic-infra-aging',
        label: '🏗️ インフラ老朽化管理',
        href: '/gyosei/infra-aging',
        status: 'active',
        description: '橋梁・市道・排水路・公共施設の健全度スコアをAIが分析。修繕計画を3シナリオで提言',
      },
      {
        id: 'basic-quarterly-report',
        label: '📊 四半期AI分析レポート',
        href: '/gyosei/quarterly-report',
        status: 'active',
        description: 'ISO 23592「エクセレントサービス」9要素で自治体をスコアリング。首長・議会向け説明資料を自動生成',
      },
      {
        id: 'basic-dx-effectiveness',
        label: '🔍 DX効果測定',
        href: '/gyosei/dx-effectiveness',
        status: 'active',
        description: '住民相談チャネルをカテゴリ別に集計。デジタル化率が低いサービスほど改善余地が大きいと判定',
      },
      {
        id: 'basic-population',
        label: '📥 人口・地域データ',
        href: '/gyosei/population',
        status: 'active',
        description: '自治体CSVをNotionに蓄積。人口・世帯・高齢化率の時系列管理',
      },
      {
        id: 'basic-revenue',
        label: '💰 収益・財政データ',
        href: '/gyosei/revenue',
        status: 'active',
        description: '観光・産品・宿泊など地域収益データを可視化。AI提言示唆を記録しAI顧問に供給',
      },
      {
        id: 'basic-shrink-scenario',
        label: '🗺️ 縮小シナリオ×地区WellBeing',
        href: '/gyosei/shrink-scenario',
        status: 'active',
        description: '地区を拠点/移行/終息に分類。30年縮小ロードマップと総幸福量を町長・議会向けに可視化',
      },
      {
        id: 'basic-compare',
        label: '🔍 類似自治体比較分析',
        href: '/gyosei/compare',
        status: 'active',
        description: '類似自治体のWell-Being・DX成熟度・財政力を比較。RunWith導入効果を可視化',
      },
      {
        id: 'basic-document-gen',
        label: '📋 AI政策文書生成',
        href: '/gyosei/document-gen',
        status: 'active',
        description: '蓄積データをAIが横断分析し、議会向けレポート・政策提言書を自動ドラフト',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🤖 課題特化型AI（ai-ext グループ）Sprint #74 新設
  //  課題特化型AIエンジン群（選択導入型）
  //  全自治体に常時表示。データが入っている自治体で機能する。
  //  ウィザードで選択した機能が各自治体ページにも表示される。
  //  アクセントカラー: violet（紫）
  // ══════════════════════════════════════
  {
    id: 'ai-engines',
    group: 'ai-ext',
    icon: BarChart3,
    emoji: '🤖',
    label: '課題特化型AI',
    badge: '拡張AI・選択導入',
    description: '農山村・離島・被災地・少子化など、自治体が抱える個別課題に特化したAIエンジン群。ウィザードで選択した機能が各自治体ページに自動追加される。',
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
        // Sprint #64: 移住定着リスクAI（農山村・限界集落型自治体向け）
        id: 'ai-ext-migration-risk',
        label: '🏡 移住定着リスクAI',
        href: '/gyosei/migration-risk',
        status: 'active',
        description: '移住相談DBの各レコードに「定着リスクスコア」を算出。就業・世帯・補助金・動機の5要素で0〜100点スコアリングし、担当職員が早期フォローすべき移住者を特定する',
      },
      {
        // Sprint #65: 往診優先順位AI（離島・高齢化型自治体向け）
        id: 'ai-ext-visit-priority',
        label: '🏥 往診優先順位AI',
        href: '/gyosei/visit-priority',
        status: 'active',
        description: '往診管理DBの各患者に「優先度スコア」を算出。年齢・要介護度・緊急フラグ・前回往診日の6要素で0〜100点スコアリングし、限られた医師が今週訪問すべき患者を一目で把握できるようにする',
      },
      {
        // Sprint #68: CO2削減進捗トラッカー（ゼロカーボン推進型自治体向け）
        id: 'ai-ext-carbon-tracker',
        label: '🌱 CO2削減進捗トラッカー',
        href: '/gyosei/carbon-tracker',
        status: 'active',
        description: 'ゼロカーボン宣言自治体の削減活動（再エネ・EV・廃棄物・森林吸収・省エネ）をカテゴリ別に可視化。達成スコアをゲージで表示し、Claude HaikuがAI四半期総括を自動生成',
      },
      {
        // Sprint #66: 農業担い手マッチングAI（農業後継者不足型自治体向け）
        id: 'ai-ext-farm-matching',
        label: '🌾 農業担い手マッチングAI',
        href: '/gyosei/farm-matching',
        status: 'active',
        description: '農地情報DBと移住就農希望者DBをAIがクロス分析。6要素でマッチングスコアを算出し「どの農地とどの担い手が最も相性が良いか」を一目で把握できるようにする',
      },
      {
        // Sprint #69: 子育て流出リスクAI（少子化・子育て世帯流出型自治体向け）
        id: 'ai-ext-childcare-risk',
        label: '👶 子育て流出リスクAI',
        href: '/gyosei/childcare-risk',
        status: 'active',
        description: '子育て相談DBの各世帯に「転出懸念スコア」を算出。保育所待機・医療・経済支援など6カテゴリの相談傾向をAIが分析し、転出しそうな世帯を早期検知する',
      },
      {
        // Sprint #67: 復興進捗ダッシュボード（被災自治体向け）
        id: 'ai-ext-recovery-dashboard',
        label: '🏗️ 復興進捗ダッシュボード',
        href: '/gyosei/recovery-dashboard',
        status: 'active',
        description: '復興事業進捗DBの全案件を可視化。住宅再建・インフラ・産業・医療の6カテゴリ別に進捗率・予算執行率・遅延リスクをスコアリングし、首長が今週対応すべき案件を一目で把握できるようにする',
      },
      {
        // Sprint #70: 地場産業6次産業化支援AI（地場産業衰退型自治体向け）
        id: 'ai-ext-local-industry',
        label: '🏭 地場産業6次産業化支援AI',
        href: '/gyosei/local-industry',
        status: 'active',
        description: '地場産業台帳DBの各産業に「後継者空白リスクスコア」を算出。5年後に消えるリスクがある産業×支援施策をClaude Haikuが産業ごとに提言する',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏫 ④ 教育（Sprint #74: hidden中 → Sprint #75以降で順次実装）
  //  学校・教職員支援層
  //  アクセントカラー: blue（青）
  // ══════════════════════════════════════
  {
    id: 'education',
    group: 'department',   // 部門別（GROUP_ORDERに含まれないため非表示）
    icon: GraduationCap,
    emoji: '🏫',
    label: '教育',
    badge: '学校・教職員',
    description: '教職員のコンディション管理から児童・生徒のWell-Being把握、AI教育政策提言まで。学校現場のDXを支援する。',
    accent: {
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: 'bg-blue-100 text-blue-600',
      text: 'text-blue-700',
      badge: 'bg-blue-100 text-blue-700',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
      sidebarActive: 'bg-blue-600 text-white',
      sidebarDot: 'bg-blue-400',
    },
    pages: [
      {
        // Sprint #74: 未実装のためhidden（Sprint #75以降で正式実装）
        id: 'education-staff',
        label: '👩‍🏫 教職員コンディション',
        href: '/education/staff',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'education-student-wellbeing',
        label: '👦 児童・生徒WellBeing',
        href: '/education/student-wellbeing',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'education-service',
        label: '🏫 学校サービス状況',
        href: '/education/service',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'education-policy',
        label: '📋 AI教育政策提言',
        href: '/education/policy',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
    ],
  },

  // ══════════════════════════════════════
  //  👮 ⑤ 警察・消防（Sprint #74: hidden中 → Sprint #75以降で順次実装）
  //  地域安全・防災支援層
  //  アクセントカラー: amber（琥珀）
  // ══════════════════════════════════════
  {
    id: 'safety',
    group: 'department',   // 部門別（GROUP_ORDERに含まれないため非表示）
    icon: Shield,
    emoji: '👮',
    label: '警察・消防',
    badge: '安全・防災',
    description: '隊員のコンディション管理から出動記録・地域安全ダッシュボードまで。限られた人員で地域の安全を守る。',
    accent: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      sidebarActive: 'bg-amber-600 text-white',
      sidebarDot: 'bg-amber-400',
    },
    pages: [
      {
        // Sprint #74: 未実装のためhidden
        id: 'safety-staff',
        label: '💪 隊員コンディション',
        href: '/safety/staff',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'safety-incident',
        label: '🚨 インシデント・出動記録',
        href: '/safety/incident',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'safety-dashboard',
        label: '🛡️ 地域安全ダッシュボード',
        href: '/safety/dashboard',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'safety-disaster',
        label: '🌊 防災・避難情報管理',
        href: '/safety/disaster',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏥 ⑥ 医療・介護（Sprint #74: hidden中 → Sprint #75以降で順次実装）
  //  高齢化社会を支える医療・福祉層
  //  アクセントカラー: rose（薔薇）
  // ══════════════════════════════════════
  {
    id: 'healthcare',
    group: 'department',   // 部門別（GROUP_ORDERに含まれないため非表示）
    icon: Heart,
    emoji: '🏥',
    label: '医療・介護',
    badge: '医療・福祉',
    description: '医療従事者・介護士のコンディション管理から高齢者WellBeingモニタリングまで。縮んでいく自治体で増え続ける医療・介護ニーズに対応する。',
    accent: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'bg-rose-100 text-rose-600',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700',
      button: 'bg-rose-600 hover:bg-rose-700 text-white',
      sidebarActive: 'bg-rose-600 text-white',
      sidebarDot: 'bg-rose-400',
    },
    pages: [
      {
        // Sprint #74: 未実装のためhidden
        id: 'healthcare-staff',
        label: '👩‍⚕️ 医療従事者コンディション',
        href: '/healthcare/staff',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'healthcare-service',
        label: '🏥 医療サービス状況',
        href: '/healthcare/service',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'healthcare-elderly',
        label: '👴 高齢者WellBeingモニタリング',
        href: '/healthcare/elderly',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'healthcare-care',
        label: '🤝 介護サービス連携',
        href: '/healthcare/care',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏗️ ⑦ 公共設備（Sprint #74: hidden中 → Sprint #75以降で順次実装）
  //  電気・水道・ガス・道路管理層
  //  アクセントカラー: cyan（シアン）
  // ══════════════════════════════════════
  {
    id: 'infrastructure',
    group: 'department',   // 部門別（GROUP_ORDERに含まれないため非表示）
    icon: Settings,
    emoji: '🏗️',
    label: '公共設備',
    badge: 'ライフライン',
    description: '電気・水道・ガス・道路のライフライン設備を一元管理。障害記録・点検状況・老朽化分析でインフラ維持を支援する。',
    accent: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      icon: 'bg-cyan-100 text-cyan-600',
      text: 'text-cyan-700',
      badge: 'bg-cyan-100 text-cyan-700',
      button: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      sidebarActive: 'bg-cyan-600 text-white',
      sidebarDot: 'bg-cyan-400',
    },
    pages: [
      {
        // Sprint #74: 未実装のためhidden
        id: 'infrastructure-staff',
        label: '👷 設備員コンディション',
        href: '/infrastructure/staff',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'infrastructure-service',
        label: '🔧 設備稼働・点検状況',
        href: '/infrastructure/service',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'infrastructure-incident',
        label: '🚨 障害・緊急修繕記録',
        href: '/infrastructure/incident',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'infrastructure-policy',
        label: '📋 AI設備維持管理提言',
        href: '/infrastructure/policy',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
      {
        id: 'infrastructure-fault-reports',
        label: '🚨 障害通報LINE受付',
        href: '/infrastructure/fault-reports',
        status: 'hidden',
        description: '未実装。Sprint #75以降で正式実装予定',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🌐 ⑧ 公務員連携（統合ビュー）Sprint #74: hidden中
  //  部門別グループが揃ったら復活予定
  //  アクセントカラー: indigo（藍）
  // ══════════════════════════════════════
  {
    id: 'koumuin',
    group: 'cross',   // 横断（GROUP_ORDERに含まれないため非表示）
    icon: Globe,
    emoji: '🌐',
    label: '公務員連携',
    badge: '部門横断',
    description: '縮んでいく自治体を公務員全体で支える。行政・教育・警察消防・医療介護の全部門WellBeingを一画面で俯瞰し、AIが横断提言を行う。',
    accent: {
      bg: 'bg-indigo-50',
      border: 'border-indigo-200',
      icon: 'bg-indigo-100 text-indigo-600',
      text: 'text-indigo-700',
      badge: 'bg-indigo-100 text-indigo-700',
      button: 'bg-indigo-600 hover:bg-indigo-700 text-white',
      sidebarActive: 'bg-indigo-600 text-white',
      sidebarDot: 'bg-indigo-400',
    },
    pages: [
      {
        // Sprint #74: 部門別グループ実装まで hidden
        id: 'koumuin-dashboard',
        label: '🌐 全部門 統合ダッシュボード',
        href: '/koumuin/dashboard',
        status: 'hidden',
        description: '部門別グループが揃った後に実装予定',
      },
      {
        id: 'koumuin-ai-advisor',
        label: '🤖 AI 全体最適化提言',
        href: '/koumuin/ai-advisor',
        status: 'hidden',
        description: '部門別グループが揃った後に実装予定',
      },
      {
        id: 'koumuin-cross-issue',
        label: '🔄 部門横断 課題連携',
        href: '/koumuin/cross-issue',
        status: 'hidden',
        description: '部門別グループが揃った後に実装予定',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏙️ 霧島市 RunWith（自治体展開）
  //  霧島市向けNotionオントロジー連携ダッシュボード
  //  8DB・9KPI・SDL五軸を実データで可視化
  //  アクセントカラー: teal（ティール）
  // ══════════════════════════════════════
  {
    id: 'kirishima',
    group: 'municipality',   // 自治体展開
    icon: MapPin,
    emoji: '🏙️',
    label: '霧島市 RunWith',
    badge: '霧島市',
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
        // Sprint #74: 必須ダッシュボード追加（共通WBダッシュボード）
        id: 'kirishima-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '霧島市の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで霧島市を選択）',
      },
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
      {
        id: 'kirishima-roads',
        label: '🛣️ 道路修復AI分析',
        href: '/kirishima/roads',
        status: 'active',
        description: '道路台帳×気象×交通量を結合しAIが修繕優先順位を自動算出。予算配分の最適化を支援',
      },
      {
        id: 'kirishima-waste',
        label: '♻️ ごみ管理最適化',
        href: '/kirishima/waste',
        status: 'active',
        description: '人口縮小に伴う収集路線の統廃合・焼却炉の広域化をAIが分析。3シナリオ（現状分析／路線統廃合／施設広域化）のコスト削減効果を試算し、Notionに提言レポートを保存',
      },
      {
        // Sprint #49 追加: 施策PDCA追跡（霧島市）
        id: 'kirishima-pdca-tracking',
        label: '📈 施策PDCA追跡',
        href: '/kirishima/pdca-tracking',
        status: 'active',
        description: '廃棄物管理・道路・観光・高齢者支援の施策実行状況を検討中→実施中→完了のカンバンで追跡。AIが完了施策の実施前後データを分析して次のアクションを提言',
      },
      {
        // Sprint #49 追加: 住民個人AIコーチ（霧島市）
        id: 'kirishima-resident-coach',
        label: '👤 住民個人AIコーチ',
        href: '/kirishima/resident-coach',
        status: 'active',
        description: '住民のLINE相談履歴をAIが分析し、WBスコアと個別コーチングメッセージを生成。職員が住民に寄り添う次のアクションを提示（霧島市版）',
      },
      {
        // Sprint #74: /gyosei/infra-aging（共通）と重複のためhidden
        id: 'kirishima-infra-aging',
        label: '🛣️ インフラ老朽化管理',
        href: '/kirishima/infra-aging',
        status: 'hidden',
        description: '共通ページ /gyosei/infra-aging に統合済み',
      },
      {
        // Sprint #74: /gyosei/fiscal-health（共通）と重複のためhidden
        id: 'kirishima-fiscal-health',
        label: '💴 財政健全化管理',
        href: '/kirishima/fiscal-health',
        status: 'hidden',
        description: '共通ページ /gyosei/fiscal-health に統合済み',
      },
      {
        // Sprint #74: /gyosei/management-dashboard（共通）と重複のためhidden
        id: 'kirishima-management-dashboard',
        label: '🏛️ 経営ダッシュボード',
        href: '/kirishima/management-dashboard',
        status: 'hidden',
        description: '共通ページ /gyosei/management-dashboard に統合済み',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🎮 ⑨ 研修・学習
  //  SDL体験型カードゲーム研修
  //  アクセントカラー: purple（紫）
  // ══════════════════════════════════════
  {
    id: 'training',
    group: 'ai-ext',   // Sprint #74: basic-aiグループの一部として ai-ext へ
    icon: BookOpen,
    emoji: '🎮',
    label: '研修・学習',
    badge: '研修・ゲーム',
    description: 'SDLの価値共創・DX推進・アジャイル・Well-Beingを体験型カードゲームで学ぶ。職員研修・新人研修・チームビルディングに活用。',
    accent: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'bg-purple-100 text-purple-600',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-700',
      button: 'bg-purple-600 hover:bg-purple-700 text-white',
      sidebarActive: 'bg-purple-600 text-white',
      sidebarDot: 'bg-purple-400',
    },
    pages: [
      {
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
  //  👨‍👩‍👧‍👦 Personal Coarc Sprint #74: hidden中（別製品として分離検討）
  //  アクセントカラー: purple（紫）
  // ══════════════════════════════════════
  {
    id: 'personal-coarc',
    group: 'cross',   // 横断（GROUP_ORDERに含まれないため非表示）
    icon: Users,
    emoji: '👨‍👩‍👧‍👦',
    label: 'Personal Coarc',
    badge: '家族・個人AI',
    description: '家族全員にAIアシスタントを。管理者がAPIキーを登録してQRコードを発行。家族はスキャンするだけで自分専用のAI支援ページがNotionに自動生成される。',
    accent: {
      bg: 'bg-purple-50',
      border: 'border-purple-200',
      icon: 'bg-purple-100 text-purple-600',
      text: 'text-purple-700',
      badge: 'bg-purple-100 text-purple-700',
      button: 'bg-purple-600 hover:bg-purple-700 text-white',
      sidebarActive: 'bg-purple-600 text-white',
      sidebarDot: 'bg-purple-400',
    },
    pages: [
      {
        // Sprint #74: 自治体DXアプリから分離検討のためhidden
        id: 'personal-coarc-worries',
        label: '📋 生活困り解決ダッシュボード',
        href: '/personal-coarc/worries',
        status: 'hidden',
        description: '別製品として分離検討中',
      },
      {
        id: 'personal-coarc-admin',
        label: '⚙️ 管理者セットアップ',
        href: '/personal-coarc/admin',
        status: 'hidden',
        description: '別製品として分離検討中',
      },
      {
        id: 'personal-coarc-join',
        label: '👤 家族登録',
        href: '/personal-coarc/join',
        status: 'hidden',
        description: '別製品として分離検討中',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏝️ 屋久島町 RunWith（自治体展開・準備中）
  //  屋久島町向け展開ページ（ウィザードで生成予定）
  //  アクセントカラー: green（緑）
  // ══════════════════════════════════════
  {
    id: 'yakushima',
    group: 'municipality',   // 自治体展開
    icon: MapPin,
    emoji: '🏝️',
    label: '屋久島町 RunWith',
    badge: '屋久島町',
    description: '屋久島町向けRunWith展開ページ。組織設計ウィザードで8DB・9KPI・マニュアルをNotionに自動生成する。',
    accent: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'bg-green-100 text-green-600',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
      button: 'bg-green-600 hover:bg-green-700 text-white',
      sidebarActive: 'bg-green-600 text-white',
      sidebarDot: 'bg-green-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'yakushima-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '屋久島町の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで屋久島町を選択）',
      },
      {
        id: 'yakushima-tourism',
        label: '🌿 観光・エコツーリズム管理',
        href: '/yakushima/tourism',
        status: 'active',
        description: '縄文杉・白谷雲水峡などの入込客数・環境負荷・満足度を管理。持続可能な世界遺産観光を実現',
      },
      {
        id: 'yakushima-migration',
        label: '🏡 移住・定住支援',
        href: '/yakushima/migration',
        status: 'active',
        description: '移住相談から定住・就農・起業まで伴走支援。島外担い手確保を数値で追跡',
      },
      {
        id: 'yakushima-revenue',
        label: '💰 収益・財政データ',
        href: '/gyosei/revenue',
        status: 'active',
        description: '観光入込・ふるさと納税・特産品EC（ヤクスギ・タンカン・サバ節）の収益データ分析',
      },
      {
        id: 'yakushima-line',
        label: '💬 LINE住民相談管理',
        href: '/gyosei/line-consultation',
        status: 'active',
        description: '移住・子育て・観光に関する住民・移住検討者からのLINE相談を一元管理',
      },
      {
        // Sprint #48 追加: 住民個人AIコーチ
        id: 'yakushima-resident-coach',
        label: '👤 住民個人AIコーチ',
        href: '/yakushima/resident-coach',
        status: 'active',
        description: '住民のLINE相談履歴をAIが分析し、WBスコアと個別コーチングメッセージを生成。職員が住民に寄り添う次のアクションを提示',
      },
      {
        // Sprint #47 追加: 施策PDCA追跡
        id: 'yakushima-pdca-tracking',
        label: '📈 施策PDCA追跡',
        href: '/yakushima/pdca-tracking',
        status: 'active',
        description: 'AIが提案した施策の実行状況を検討中→実施中→完了のカンバンで追跡。完了施策の実施前後データを突合してRunWithの導入効果をROIで可視化',
      },
      {
        // Sprint #46 追加: データ参照型AI施策エンジン
        id: 'yakushima-policy-engine',
        label: '🧩 データ参照型施策提案',
        href: '/yakushima/policy-engine',
        status: 'active',
        description: '学校・ICT・人口・移住・観光の5本のNotionDBを読み込み、実際の数値を引用した施策提案とデータ不足の指摘を生成する屋久島町専用エンジン',
      },
      {
        // Sprint #74: 運用管理グループのウィザードと重複のためhidden
        id: 'yakushima-setup',
        label: '🧠 組織設計ウィザード',
        href: '/runwith/org-wizard',
        status: 'hidden',
        description: '運用管理グループのウィザードへ誘導',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏝️ 海士町 RunWith（自治体展開）
  //  島根県隠岐郡海士町 — 人口約2,300人・隠岐諸島の中ノ島
  //  全国的な移住誘致先進事例でありながら定着率に課題
  //  Sprint #64 追加: 移住定着リスクAI の事例自治体
  //  アクセントカラー: cyan（シアン）
  // ══════════════════════════════════════
  {
    id: 'amacho',
    group: 'municipality',
    icon: MapPin,
    emoji: '🏝️',
    label: '海士町 RunWith',
    badge: '海士町',
    description: '島根県隠岐諸島・海士町向けRunWith展開ページ。移住定着リスクAIで「せっかく来てくれたのに1年で離島する」課題を解決する。',
    accent: {
      bg: 'bg-cyan-50',
      border: 'border-cyan-200',
      icon: 'bg-cyan-100 text-cyan-600',
      text: 'text-cyan-700',
      badge: 'bg-cyan-100 text-cyan-700',
      button: 'bg-cyan-600 hover:bg-cyan-700 text-white',
      sidebarActive: 'bg-cyan-600 text-white',
      sidebarDot: 'bg-cyan-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'amacho-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '海士町の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで海士町を選択）',
      },
      {
        // Sprint #64: 移住定着リスクAI（海士町事例）
        id: 'amacho-migration-risk',
        label: '🏡 移住定着リスクAI',
        href: '/gyosei/migration-risk',
        status: 'active',
        description: '移住相談DB（12件・岩牡蠣漁業・隠岐牛農業・テレワーク等）のリスクスコアをAIが分析。要フォロー移住者を担当職員が一目で把握できる',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏝️ 五島市 RunWith（自治体展開）
  //  長崎県・五島列島 — 人口約3.2万人・高齢化率約40%・深刻な医師不足
  //  Sprint #65 追加: 往診優先順位AI の事例自治体
  //  アクセントカラー: rose（ローズ）
  // ══════════════════════════════════════
  {
    id: 'goto',
    group: 'municipality',
    icon: MapPin,
    emoji: '🏝️',
    label: '五島市 RunWith',
    badge: '五島市',
    description: '長崎県五島列島・五島市向けRunWith展開ページ。往診優先順位AIで「誰を今週最優先で診るか」を限られた医師が即座に判断できるようにする。',
    accent: {
      bg: 'bg-rose-50',
      border: 'border-rose-200',
      icon: 'bg-rose-100 text-rose-600',
      text: 'text-rose-700',
      badge: 'bg-rose-100 text-rose-700',
      button: 'bg-rose-600 hover:bg-rose-700 text-white',
      sidebarActive: 'bg-rose-600 text-white',
      sidebarDot: 'bg-rose-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'goto-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '五島市の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで五島市を選択）',
      },
      {
        // Sprint #65: 往診優先順位AI（五島市事例）
        id: 'goto-visit-priority',
        label: '🏥 往診優先順位AI',
        href: '/gyosei/visit-priority',
        status: 'active',
        description: '往診管理DB（12件・福江・玉之浦・富江地区等）の優先度スコアをAIが分析。今週訪問すべき患者を担当医が一目で把握できる',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🌊 輪島市 RunWith（自治体展開）
  //  石川県輪島市 — 人口約2.4万人（地震前）・能登半島の中心都市
  //  2024年1月1日 能登半島地震で甚大な被害
  //  Sprint #67 追加: 復興進捗ダッシュボード の事例自治体
  //  アクセントカラー: orange（橙：復興の炎・活力をイメージ）
  // ══════════════════════════════════════
  {
    id: 'wajima',
    group: 'municipality',
    icon: MapPin,
    emoji: '🌊',
    label: '輪島市 RunWith',
    badge: '輪島市',
    description: '石川県輪島市向けRunWith展開ページ。復興進捗ダッシュボードで能登半島地震からの復興事業を一元管理。遅延リスクをAIが自動検知する。',
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
        // Sprint #74: 必須ダッシュボード追加
        id: 'wajima-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '輪島市の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで輪島市を選択）',
      },
      {
        // Sprint #67: 復興進捗ダッシュボード（輪島市事例）
        id: 'wajima-recovery-dashboard',
        label: '🏗️ 復興進捗ダッシュボード',
        href: '/gyosei/recovery-dashboard',
        status: 'active',
        description: '復興事業進捗DB（12件・住宅再建・インフラ・漆器産業等）の進捗をAIが分析。遅延中案件を担当課が一目で把握できる',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🌾 西粟倉村 RunWith（自治体展開）
  //  岡山県英田郡西粟倉村 — 人口約1,400人・「百年の森林」の村
  //  森林再生で有名だが農業後継者不足も深刻な課題
  //  Sprint #66 追加: 農業担い手マッチングAI の事例自治体
  //  アクセントカラー: amber（琥珀：黄金色の稲穂をイメージ）
  // ══════════════════════════════════════
  {
    id: 'nishiawakura',
    group: 'municipality',
    icon: MapPin,
    emoji: '🌾',
    label: '西粟倉村 RunWith',
    badge: '西粟倉村',
    description: '岡山県英田郡・西粟倉村向けRunWith展開ページ。農業担い手マッチングAIで「後継者がいなくて耕作放棄地になる」課題を解決する。',
    accent: {
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: 'bg-amber-100 text-amber-600',
      text: 'text-amber-700',
      badge: 'bg-amber-100 text-amber-700',
      button: 'bg-amber-600 hover:bg-amber-700 text-white',
      sidebarActive: 'bg-amber-600 text-white',
      sidebarDot: 'bg-amber-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'nishiawakura-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '西粟倉村の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで西粟倉村を選択）',
      },
      {
        // Sprint #66: 農業担い手マッチングAI（西粟倉村事例）
        id: 'nishiawakura-farm-matching',
        label: '🌾 農業担い手マッチングAI',
        href: '/gyosei/farm-matching',
        status: 'active',
        description: '農地情報DB（10件・棚田・黒大豆・しいたけ等）と移住就農希望者DB（10件）をAIがクロス分析。最もマッチする農地×担い手ペアをスコア順で表示',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🌿 上勝町 RunWith（自治体展開）
  //  徳島県勝浦郡上勝町 — 人口約1,500人・「ゼロ・ウェイスト宣言」で有名
  //  2020年にゼロカーボン宣言。45種類分別リサイクルで全国最高水準を誇る
  //  Sprint #68 追加: CO2削減進捗トラッカーの事例自治体
  //  アクセントカラー: green（緑：森と環境をイメージ）
  // ══════════════════════════════════════
  {
    id: 'kamikatsu',
    group: 'municipality',
    icon: MapPin,
    emoji: '🌿',
    label: '上勝町 RunWith',
    badge: '上勝町',
    description: '徳島県勝浦郡・上勝町向けRunWith展開ページ。CO2削減進捗トラッカーでゼロカーボン宣言の達成状況を可視化し、AI四半期総括で次の一手を提言する。',
    accent: {
      bg: 'bg-green-50',
      border: 'border-green-200',
      icon: 'bg-green-100 text-green-600',
      text: 'text-green-700',
      badge: 'bg-green-100 text-green-700',
      button: 'bg-green-600 hover:bg-green-700 text-white',
      sidebarActive: 'bg-green-600 text-white',
      sidebarDot: 'bg-green-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'kamikatsu-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '上勝町の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで上勝町を選択）',
      },
      {
        // Sprint #68: CO2削減進捗トラッカー（上勝町事例）
        id: 'kamikatsu-carbon-tracker',
        label: '🌱 CO2削減進捗トラッカー',
        href: '/gyosei/carbon-tracker',
        status: 'active',
        description: 'CO2削減活動DB（再エネ・EV・廃棄物・森林吸収・省エネ）をカテゴリ別に集計。ゼロカーボン達成スコアをゲージで表示し、Claude HaikuがAI四半期総括を生成',
      },
    ],
  },

  // ══════════════════════════════════════
  //  👶 神埼市 RunWith（自治体展開）
  //  佐賀県神埼市 — 人口約29,000人・少子化が深刻な中規模市
  //  福岡・佐賀市への子育て世帯流出が課題
  //  Sprint #69 追加: 子育て世帯流出リスク検知AI の事例自治体
  //  アクセントカラー: pink（ピンク：子育て・子どもをイメージ）
  // ══════════════════════════════════════
  {
    id: 'kanzaki',
    group: 'municipality',
    icon: MapPin,
    emoji: '👶',
    label: '神埼市 RunWith',
    badge: '神埼市',
    description: '佐賀県神埼市向けRunWith展開ページ。子育て世帯流出リスク検知AIで「保育所が足りない・医療が遠い・経済的に苦しい」を理由に転出しそうな子育て世帯を早期発見し、引き止め施策を提言する。',
    accent: {
      bg: 'bg-pink-50',
      border: 'border-pink-200',
      icon: 'bg-pink-100 text-pink-600',
      text: 'text-pink-700',
      badge: 'bg-pink-100 text-pink-700',
      button: 'bg-pink-600 hover:bg-pink-700 text-white',
      sidebarActive: 'bg-pink-600 text-white',
      sidebarDot: 'bg-pink-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'kanzaki-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '神埼市の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで神埼市を選択）',
      },
      {
        // Sprint #69: 子育て流出リスクAI（神埼市事例）
        id: 'kanzaki-childcare-risk',
        label: '👶 子育て流出リスクAI',
        href: '/gyosei/childcare-risk',
        status: 'active',
        description: '子育て相談DB（10件・保育所待機・医療・転出相談等）の転出懸念スコアをAIが分析。転出リスクが高い世帯と担当職員が今すぐ動くべき施策を一目で把握できる',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🐟 気仙沼市 RunWith（自治体展開）
  //  宮城県気仙沼市 — 人口約6.1万人・三陸沿岸の水産業都市
  //  カツオ一本釣り・フカヒレ世界シェア70%・カキ養殖など多様な水産資源を持つ
  //  Sprint #70 追加: 地場産業6次産業化支援AI の事例自治体
  //  アクセントカラー: red（赤：海の力強さ・情熱をイメージ）
  // ══════════════════════════════════════
  {
    id: 'kesennuma',
    group: 'municipality',
    icon: MapPin,
    emoji: '🐟',
    label: '気仙沼市 RunWith',
    badge: '気仙沼市',
    description: '宮城県気仙沼市向けRunWith展開ページ。地場産業6次産業化支援AIで「後継者がいなくて5年後に消えそうな産業」を早期検知し、水産業の衰退を止める支援施策を提言する。',
    accent: {
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: 'bg-red-100 text-red-600',
      text: 'text-red-700',
      badge: 'bg-red-100 text-red-700',
      button: 'bg-red-600 hover:bg-red-700 text-white',
      sidebarActive: 'bg-red-600 text-white',
      sidebarDot: 'bg-red-400',
    },
    pages: [
      {
        // Sprint #74: 必須ダッシュボード追加
        id: 'kesennuma-dashboard',
        label: '📊 Well-Beingダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '気仙沼市の住民・職員Well-Beingスコアをリアルタイム可視化（ヘッダーで気仙沼市を選択）',
      },
      {
        // Sprint #70: 地場産業6次産業化支援AI（気仙沼市事例）
        id: 'kesennuma-local-industry',
        label: '🏭 地場産業6次産業化支援AI',
        href: '/gyosei/local-industry',
        status: 'active',
        description: '地場産業台帳DB（12産業・水産・食品加工・観光等）の後継者リスクをAIが分析。5年以内に消えるリスクがある産業を担当職員が一目で把握できる',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏙️ 四万十市 RunWith（自治体展開）
  //  高知県四万十市 — 人口約3.1万人・四万十川流域の自然豊かな地域
  //  農業・林業・観光が主要産業。高齢化率が高く医療・移住促進が課題。
  //  Sprint #73 追加: オンボーディングウィザード2.0 で自動プロビジョニング
  //  アクセントカラー: teal（四万十川の清流をイメージ）
  // ══════════════════════════════════════
  {
    id: 'shimanto',
    group: 'municipality',
    icon: MapPin,
    emoji: '🏙️',
    label: '四万十市 RunWith',
    badge: '四万十市',
    description: '高知県四万十市向けRunWith展開ページ。LINE住民相談AI・WB+PDCAダッシュボード・移住定着リスクAI・往診優先順位AIの4機能をウィザードで自動プロビジョニング済み。',
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
        id: 'shimanto-dashboard',
        label: '📊 WB+PDCAダッシュボード',
        href: '/gyosei/dashboard',
        status: 'active',
        description: '住民WBスコアと施策進捗をリアルタイムで可視化（ヘッダーで四万十市を選択）',
      },
      {
        id: 'shimanto-line',
        label: '💬 LINE住民相談AI',
        href: '/gyosei/line-consultation',
        status: 'active',
        description: 'LINEからの相談をNotionに蓄積・AIが即時回答案を生成',
      },
      {
        id: 'shimanto-migration',
        label: '🏠 移住定着リスクAI',
        href: '/gyosei/migration-risk',
        status: 'active',
        description: '移住者の定着リスクをスコアリングし早期フォローを提案',
      },
      {
        id: 'shimanto-visit',
        label: '🏥 往診優先順位AI',
        href: '/gyosei/visit-priority',
        status: 'active',
        description: '患者の要介護度・緊急フラグを基にAIが往診順序を毎日最適化',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏢 NEC コーポレートIT RunWith（自治体展開・準備中）
  //  NEC コーポレートIT部門向け展開ページ
  //  アクセントカラー: slate（スレート）
  // ══════════════════════════════════════
  {
    id: 'nec',
    group: 'municipality',   // 自治体展開（法人組織も同グループで管理）
    icon: MapPin,
    emoji: '🏢',
    label: 'NEC コーポレートIT',
    badge: 'NEC',
    description: 'NECコーポレートIT部門向けRunWith展開ページ。組織設計ウィザードで部門ナレッジ基盤をNotionに自動生成する。',
    accent: {
      bg: 'bg-slate-50',
      border: 'border-slate-200',
      icon: 'bg-slate-100 text-slate-600',
      text: 'text-slate-700',
      badge: 'bg-slate-100 text-slate-700',
      button: 'bg-slate-600 hover:bg-slate-700 text-white',
      sidebarActive: 'bg-slate-600 text-white',
      sidebarDot: 'bg-slate-400',
    },
    pages: [
      {
        // Sprint #74: 法人向け設計を固めてから再開のためhidden
        id: 'nec-setup',
        label: '🧠 組織設計ウィザード起動',
        href: '/runwith/org-wizard',
        status: 'hidden',
        description: '法人向け設計を固めてから再開予定',
      },
    ],
  },

  // ══════════════════════════════════════
  //  ⚙️ ⑩ 基盤・設定
  //  NotionDB連携・IT基盤管理・プラットフォーム設定層
  //  アクセントカラー: orange（橙）
  // ══════════════════════════════════════
  {
    id: 'platform',
    group: 'platform',   // 基盤
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
        id: 'platform-cmdb',
        label: '🗂️ 構成管理（CMDB）',
        href: '/runwith/cmdb',
        status: 'active',
        description: 'IT資産・システム構成情報を登録・参照管理。更新期限アラートで契約更改を見逃さない',
      },
      {
        id: 'platform-knowledge',
        label: '🧠 集合知ナレッジブラウザ',
        href: '/runwith/knowledge',
        status: 'active',
        description: '限界自治体の課題解決ノウハウを集積・横展開。SDL軸・カテゴリ・キーワードで横断検索',
      },
      {
        id: 'platform-multi-tenant',
        label: '🌐 横展開設定',
        href: '/runwith/multi-tenant',
        status: 'active',
        description: '複数自治体へのRunWith展開を管理。テナント切り替え・オンボーディング進捗確認',
      },
      {
        id: 'platform-org-wizard',
        label: '🧠 組織設計ウィザード',
        href: '/runwith/org-wizard',
        status: 'active',
        description: '60分のヒアリング12問に答えるだけで8DB・9KPI・仕様書・マニュアルをNotionに自動生成。新規組織展開を大幅短縮',
      },
      {
        id: 'platform-mcp-gateway',
        label: '🔐 MCPゲートウェイ ログ',
        href: '/runwith/mcp-gateway',
        status: 'active',
        description: 'Notion操作の中継APIと監査ログ管理。notion_search/create_page/query_databaseを認証付きで中継し全操作をNotionに記録',
      },
      {
        id: 'platform-opendata',
        label: '📊 オープンデータ連携',
        href: '/gyosei/opendata',
        status: 'active',
        description: 'e-Stat API（人口動態）＋Notion蓄積データ＋Claude AIで自治体向け導入提案書を自動生成してNotionに保存',
      },
    ],
  },
];

// ─── ユーティリティ ──────────────────────────────────────

/** 指定IDのモジュールを取得 */
export function getModule(moduleId: string): FeatureModule | undefined {
  return FEATURE_MODULES.find((m) => m.id === moduleId);
}

/**
 * GROUP_ORDER の順番でグループ化されたモジュール一覧を返す
 * サイドバーでセクションヘッダーを描画するために使用
 */
export function getModulesByGroup(): {
  group: ModuleGroup;
  label: string;
  modules: FeatureModule[];
}[] {
  return GROUP_ORDER
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      modules: FEATURE_MODULES.filter((m) => m.group === group),
    }))
    .filter((g) => g.modules.length > 0);
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
