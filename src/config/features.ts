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
 * ■ 5グループ構成（2026年4月 再編）
 *   ── 行政コア（標準機能・全自治体共通）──────────────
 *   ① 住民接点    : 住民とのLINEタッチポイント（sky）
 *   ② 職員支援    : エクセレントサービス提供支援（emerald）
 *   ③ 経営・政策  : 町長・議会向け見える化・AI提言（violet）
 *   ── 部門別（標準機能・全自治体共通）──────────────
 *   ④ 教育        : 学校・教職員支援（blue）
 *   ⑤ 警察・消防  : 地域安全・防災支援（amber）
 *   ⑥ 医療・介護  : 高齢化社会を支える医療・福祉（rose）
 *   ⑦ 公共設備    : ライフライン設備管理（cyan）
 *   ── 横断・研修（標準機能・全自治体共通）────────────
 *   ⑧ 公務員連携  : 全部門横断ビュー・AI横断提言（indigo）
 *   ⑨ 研修・学習  : SDL体験型カードゲーム研修（purple）
 *   ── 自治体展開（自治体固有ページ）──────────────────
 *   🏙️ 霧島市      : 霧島市向け実証ダッシュボード（teal）
 *   🏝️ 屋久島町    : 屋久島町向け展開（準備中）
 *   🏢 NEC         : NECコーポレートIT（準備中）
 *   ── 基盤 ────────────────────────────────────────
 *   ⑩ 基盤・設定  : データ蓄積・IT管理・プラットフォーム設定（orange）
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
 *   core        : 行政コア（住民接点・職員支援・経営政策）
 *   department  : 部門別（教育・警察消防・医療介護・公共設備）
 *   cross       : 横断・研修（公務員連携・研修学習）
 *   municipality: 自治体展開（霧島市・屋久島町・NEC など）
 *   platform    : 基盤・設定
 */
export type ModuleGroup = 'core' | 'department' | 'cross' | 'municipality' | 'platform';

/** サイドバーのセクションヘッダーラベル */
export const GROUP_LABELS: Record<ModuleGroup, string> = {
  core:         '🏛️ 行政コア',
  department:   '🏢 部門別',
  cross:        '🌐 横断・研修',
  municipality: '🏙️ 自治体展開',
  platform:     '⚙️ 基盤',
};

/** セクションの表示順（この順番でサイドバーに並ぶ） */
export const GROUP_ORDER: ModuleGroup[] = ['core', 'department', 'cross', 'municipality', 'platform'];

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
  //  🏘️ ① 住民接点
  //  住民がLINEで相談し、タッチポイント活動をNotionに蓄積する層
  //  アクセントカラー: sky（水色）
  // ══════════════════════════════════════
  {
    id: 'citizen',
    group: 'core',   // 行政コア
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
        id: 'citizen-services',
        label: '🏘️ 住民サービス状況',
        href: '/gyosei/services',
        status: 'active',
        description: '行政サービスの稼働状況・窓口待ち時間・満足度スコアを記録。日次入力はNotionフォームでも可',
      },
      {
        id: 'citizen-line',
        label: '💬 LINE相談管理',
        href: '/gyosei/line-consultation',
        status: 'active',
        description: '住民からのLINE相談を一覧確認し、対応状況・回答内容をNotionに記録',
      },
      {
        id: 'citizen-touchpoint',
        label: '📍 タッチポイント記録',
        href: '/gyosei/touchpoints',
        status: 'active',
        description: '窓口・電話・訪問の接点をSDL価値共創スコアで可視化。AI顧問のRAGデータに活用',
      },
      {
        id: 'citizen-push-notifications',
        label: '🔔 住民プッシュ通知',
        href: '/gyosei/push-notifications',
        status: 'active',
        description: '緊急アラート・手続き期限リマインド・行事案内をLINEで住民に先回り配信。職員が対応する前に問題を解決',
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
        id: 'staff-document-generator',
        label: '✨ AI文書自動起案',
        href: '/gyosei/document-generator',
        status: 'active',
        description: '議事録・住民通知文・業務報告書・職員回覧をメモ入力だけでAIが起案。職員は確認・修正するだけ',
      },
      {
        id: 'staff-predictive-alerts',
        label: '🔮 予兆検知ダッシュボード',
        href: '/gyosei/predictive-alerts',
        status: 'active',
        description: 'インフラ老朽化・離職リスク1on1・住民満足度低下をAIが先回り検知。週次自動実行＋LINE通知でゼロ見逃しを実現',
      },
      {
        // Sprint #43 追加: 住民困り事レーダー
        id: 'staff-citizen-radar',
        label: '🎯 住民困り事レーダー',
        href: '/gyosei/citizen-radar',
        status: 'active',
        description: 'Yahoo知恵袋・Google News・発言小町などから住民の困り事を自動収集。AIがカテゴリ分類・優先度付けしてNotionに蓄積する',
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
        id: 'executive-population',
        label: '📥 人口・地域データ',
        href: '/gyosei/population',
        status: 'active',
        description: '自治体CSVをNotionに蓄積。人口・世帯・高齢化率の時系列管理（Notion標準インポートでも可）',
      },
      {
        id: 'executive-revenue',
        label: '💰 収益・財政データ',
        href: '/gyosei/revenue',
        status: 'active',
        description: '観光・産品・宿泊など地域収益データを可視化。AI提言示唆を記録しAI顧問に供給',
      },
      {
        id: 'executive-compare',
        label: '🔍 類似自治体比較分析',
        href: '/gyosei/compare',
        status: 'active',
        description: '類似自治体のWell-Being・DX成熟度・財政力を比較。RunWith導入効果を可視化',
      },
      {
        id: 'executive-document',
        label: '📋 AI政策文書生成',
        href: '/gyosei/document-gen',
        status: 'active',
        description: '蓄積データをAIが横断分析し、議会向けレポート・政策提言書を自動ドラフト',
      },
      {
        id: 'executive-shrink-scenario',
        label: '🗺️ 縮小シナリオ×地区WellBeing',
        href: '/gyosei/shrink-scenario',
        status: 'active',
        description: '20地区を拠点/移行/終息に分類。30年縮小ロードマップと総幸福量を町長・議会向けに可視化',
      },
      {
        id: 'executive-weekly-summary',
        label: '📋 週次WBサマリー生成',
        href: '/gyosei/weekly-summary',
        status: 'active',
        description: '全5部門のコンディションを集計しAIサマリーをNotionに保存。毎週月曜9時に自動実行、手動実行も可',
      },
      {
        id: 'executive-risk-scoring',
        label: '🔴 離職リスクスコアリング',
        href: '/gyosei/risk-scoring',
        status: 'active',
        description: '過去4週間のWBスコア推移を職員ごとに分析。低下傾向・危険水準を自動検知しNotionにリスクレポートを保存',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏫 ④ 教育
  //  学校・教職員支援層
  //  アクセントカラー: blue（青）
  // ══════════════════════════════════════
  {
    id: 'education',
    group: 'department',   // 部門別
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
        id: 'education-staff',
        label: '👩‍🏫 教職員コンディション',
        href: '/education/staff',
        status: 'active',
        description: '教職員の体調・業務負荷・バーンアウトリスクを日次記録。早期サポートに活用',
      },
      {
        id: 'education-student-wellbeing',
        label: '👦 児童・生徒WellBeing',
        href: '/education/student-wellbeing',
        status: 'active',
        description: '学校生活満足度・不登校リスク・いじめ兆候をAIが早期検知',
      },
      {
        id: 'education-service',
        label: '🏫 学校サービス状況',
        href: '/education/service',
        status: 'active',
        description: '各校の行事・給食・授業進捗・施設状況を一元把握',
      },
      {
        id: 'education-policy',
        label: '📋 AI教育政策提言',
        href: '/education/policy',
        status: 'active',
        description: '学力・出席・WellBeingデータをAIが分析し、教育委員会向け政策案を自動ドラフト',
      },
    ],
  },

  // ══════════════════════════════════════
  //  👮 ⑤ 警察・消防
  //  地域安全・防災支援層
  //  アクセントカラー: amber（琥珀）
  // ══════════════════════════════════════
  {
    id: 'safety',
    group: 'department',   // 部門別
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
        id: 'safety-staff',
        label: '💪 隊員コンディション',
        href: '/safety/staff',
        status: 'active',
        description: '警察官・消防隊員の体調・勤務状況・ストレスレベルを管理。過重労働を早期検知',
      },
      {
        id: 'safety-incident',
        label: '🚨 インシデント・出動記録',
        href: '/safety/incident',
        status: 'active',
        description: '事件・事故・火災・救急出動を記録。AIがパターン分析し予防策を提言',
      },
      {
        id: 'safety-dashboard',
        label: '🛡️ 地域安全ダッシュボード',
        href: '/safety/dashboard',
        status: 'active',
        description: '犯罪・火災・救急出動件数の時系列推移と地域マップを可視化',
      },
      {
        id: 'safety-disaster',
        label: '🌊 防災・避難情報管理',
        href: '/safety/disaster',
        status: 'active',
        description: '災害発生時の避難所開設状況・要支援者リスト・物資管理を一元管理',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏥 ⑥ 医療・介護
  //  高齢化社会を支える医療・福祉層
  //  アクセントカラー: rose（薔薇）
  // ══════════════════════════════════════
  {
    id: 'healthcare',
    group: 'department',   // 部門別
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
        id: 'healthcare-staff',
        label: '👩‍⚕️ 医療従事者コンディション',
        href: '/healthcare/staff',
        status: 'active',
        description: '医師・看護師・介護士の疲労度・充足率をモニタリング。離職リスクを早期検知',
      },
      {
        id: 'healthcare-service',
        label: '🏥 医療サービス状況',
        href: '/healthcare/service',
        status: 'active',
        description: '診療科別の稼働状況・待ち時間・在宅医療カバー率を可視化',
      },
      {
        id: 'healthcare-elderly',
        label: '👴 高齢者WellBeingモニタリング',
        href: '/healthcare/elderly',
        status: 'active',
        description: '要介護認定者の生活状況・訪問頻度・孤独死リスクをAIが継続追跡',
      },
      {
        id: 'healthcare-care',
        label: '🤝 介護サービス連携',
        href: '/healthcare/care',
        status: 'active',
        description: '居宅介護・施設介護・地域包括支援センターの連携状況を一元管理',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🏗️ ⑦ 公共設備
  //  電気・水道・ガス・道路管理層
  //  アクセントカラー: cyan（シアン）
  // ══════════════════════════════════════
  {
    id: 'infrastructure',
    group: 'department',   // 部門別
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
        id: 'infrastructure-staff',
        label: '👷 設備員コンディション',
        href: '/infrastructure/staff',
        status: 'active',
        description: '電気・水道・道路担当員の体調・業務負荷を日次記録。現場安全管理に活用',
      },
      {
        id: 'infrastructure-service',
        label: '🔧 設備稼働・点検状況',
        href: '/infrastructure/service',
        status: 'active',
        description: '電気・水道・ガス・道路の定期点検結果・稼働状況・老朽化度を一元把握',
      },
      {
        id: 'infrastructure-incident',
        label: '🚨 障害・緊急修繕記録',
        href: '/infrastructure/incident',
        status: 'active',
        description: '停電・断水・ガス漏れ・道路陥没などの障害発生〜復旧完了を記録。影響世帯数を追跡',
      },
      {
        id: 'infrastructure-policy',
        label: '📋 AI設備維持管理提言',
        href: '/infrastructure/policy',
        status: 'active',
        description: '点検・障害データをAIが分析し、修繕優先順位・老朽化対策・予算計画を自動ドラフト',
      },
      {
        id: 'infrastructure-fault-reports',
        label: '🚨 障害通報LINE受付',
        href: '/infrastructure/fault-reports',
        status: 'active',
        description: '住民LINEからの断水・停電・ガス漏れ等の通報をAIが自動分類。担当課へ転送・Notionに記録',
      },
    ],
  },

  // ══════════════════════════════════════
  //  🌐 ⑧ 公務員連携（統合ビュー）
  //  自治体職員・教育・警察消防・医療介護を横断し
  //  「縮んでいく街を公務員全体で支える」モデルを可視化
  //  アクセントカラー: indigo（藍）
  // ══════════════════════════════════════
  {
    id: 'koumuin',
    group: 'cross',   // 横断・研修
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
        id: 'koumuin-dashboard',
        label: '🌐 全部門 統合ダッシュボード',
        href: '/koumuin/dashboard',
        status: 'active',
        description: '行政・教育・警察消防・医療介護の全公務員WellBeingを一画面で俯瞰。街全体の支援力を可視化',
      },
      {
        id: 'koumuin-ai-advisor',
        label: '🤖 AI 全体最適化提言',
        href: '/koumuin/ai-advisor',
        status: 'active',
        description: '全部門データをAIが横断分析し、人員配置・連携強化ポイントを提言',
      },
      {
        id: 'koumuin-cross-issue',
        label: '🔄 部門横断 課題連携',
        href: '/koumuin/cross-issue',
        status: 'active',
        description: '部門をまたぐ課題（高齢者・子育て・障害者等）を一元管理し、担当部門が連携して解決',
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
    ],
  },

  // ══════════════════════════════════════
  //  🎮 ⑨ 研修・学習
  //  SDL体験型カードゲーム研修
  //  アクセントカラー: purple（紫）
  // ══════════════════════════════════════
  {
    id: 'training',
    group: 'cross',   // 横断・研修
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
  //  👨‍👩‍👧‍👦 Personal Coarc
  //  家族向け個人AIアシスタント（BYOK方式）
  //  アクセントカラー: purple（紫）
  // ══════════════════════════════════════
  {
    id: 'personal-coarc',
    group: 'cross',   // 横断・研修
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
        id: 'personal-coarc-admin',
        label: '⚙️ 管理者セットアップ',
        href: '/personal-coarc/admin',
        status: 'active',
        description: 'APIキー登録・QRコード招待',
      },
      {
        id: 'personal-coarc-join',
        label: '👤 家族登録',
        href: '/personal-coarc/join',
        status: 'active',
        description: 'QRスキャン後の登録フォーム',
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
        id: 'yakushima-setup',
        label: '🧠 組織設計ウィザード',
        href: '/runwith/org-wizard',
        status: 'coming',
        description: '組織設計ウィザードを使って屋久島町のNotionページを自動生成',
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
        id: 'nec-setup',
        label: '🧠 組織設計ウィザード起動',
        href: '/runwith/org-wizard',
        status: 'coming',
        description: '組織設計ウィザードを使ってNECコーポレートITのNotionページを自動生成',
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
