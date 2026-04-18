/**
 * ════════════════════════════════════════════════════════
 *  src/config/departments.ts
 *  部門設定ファイル（Department Registry）
 * ════════════════════════════════════════════════════════
 *
 *  ■ 役割
 *    行政・教育・警察消防・医療介護の各部門に関する設定を一元管理する。
 *    共通ページコンポーネントはこの設定を受け取り、
 *    部門ごとの見た目・ラベル・Notion DBを切り替える。
 *
 *  ■ 疎結合の設計
 *    各部門は独立した Notion DB を持つ。
 *    notionDbs に DB の ID を登録するだけで接続できる。
 *    行政DBに教育のデータが混入することはない。
 *
 *  ■ 新しい部門を追加するとき
 *    1. DeptId に新しい部門 ID を追加
 *    2. DEPARTMENTS に設定ブロックを追加
 *    3. Notion で新部門用の DB を作成し、ID を notionDbs に記入
 *    4. src/app/(dashboard)/[部門]/staff/page.tsx を作成（ラッパーだけ）
 */

// ─── 型定義 ──────────────────────────────────────────────

/** 部門 ID の一覧（Union 型） */
export type DeptId = 'gyosei' | 'education' | 'safety' | 'healthcare';

/** 各部門の Notion DB 設定（疎結合） */
export type DeptNotionDbs = {
  staffCondition: string;   // 職員コンディション DB の ID（空文字 = 未設定）
  serviceStatus:  string;   // サービス状況 DB の ID
  wellbeing:      string;   // WellBeing 集計 DB の ID
};

/** カラー設定（Tailwind クラス文字列） */
export type DeptColor = {
  primary:   string;   // ボタン・強調色  例: 'bg-emerald-600 hover:bg-emerald-700'
  bg:        string;   // カード背景      例: 'bg-emerald-50'
  border:    string;   // ボーダー        例: 'border-emerald-200'
  text:      string;   // テキスト        例: 'text-emerald-700'
  badge:     string;   // バッジ          例: 'bg-emerald-100 text-emerald-700'
  ring:      string;   // フォーカスリング 例: 'focus:ring-emerald-300'
  scoreBtn:  string;   // スコアボタン押下時 例: 'bg-emerald-500'
};

/** AI 政策文書生成のテンプレート定義 */
export type PolicyTemplate = {
  id:          string;
  icon:        string;
  label:       string;
  description: string;
  time:        string;   // 生成目安時間
};

/** 1 部門の完全な設定 */
export type DeptConfig = {
  id:                DeptId;
  name:              string;        // 部門名       例: '教育'
  fullName:          string;        // 正式名称      例: '教育委員会・学校'
  emoji:             string;        // 絵文字        例: '🏫'
  staffLabel:        string;        // 職員の呼称    例: '教職員'
  unitLabel:         string;        // 組織単位の呼称 例: '学校'
  color:             DeptColor;
  notionDbs:         DeptNotionDbs; // 疎結合 DB ID（Notion で確認して記入）
  deptOptions:       string[];      // 所属のクイック選択肢
  serviceCategories: string[];      // サービス状況のカテゴリ選択肢
  policyTemplates:   PolicyTemplate[]; // AI 政策文書のテンプレート一覧
  aiAdvisorHref:     string;        // AI 顧問ページへのリンク
};

// ─── 部門設定データ ───────────────────────────────────────

export const DEPARTMENTS: Record<DeptId, DeptConfig> = {

  // ══════════════════════════════
  //  行政
  // ══════════════════════════════
  gyosei: {
    id:         'gyosei',
    name:       '行政',
    fullName:   '自治体行政',
    emoji:      '🏛️',
    staffLabel: '職員',
    unitLabel:  '課',
    color: {
      primary:  'bg-emerald-600 hover:bg-emerald-700 text-white',
      bg:       'bg-emerald-50',
      border:   'border-emerald-200',
      text:     'text-emerald-700',
      badge:    'bg-emerald-100 text-emerald-700',
      ring:     'focus:ring-emerald-300',
      scoreBtn: 'bg-emerald-500',
    },
    notionDbs: {
      // ★ 既存の Notion DB ID を記入してください
      staffCondition: '',  // StaffCondition DB
      serviceStatus:  '',  // サービス状況 DB
      wellbeing:      '',  // WellBeing KPI DB
    },
    deptOptions: ['住民課', '総務課', '福祉課', '財政課', '情報政策課', '教育委員会'],
    serviceCategories: ['窓口サービス', '福祉サービス', '医療・健康', '教育・文化', '産業・観光', 'インフラ'],
    policyTemplates: [
      { id: 'assembly_report',  icon: '🏛️', label: '議会向け月次レポート',    description: '住民サービス・財政・人口動態を議会向けにまとめた報告書', time: '約30秒' },
      { id: 'sdl_proposal',     icon: '💡', label: 'SDL政策提言書',           description: 'SDL五軸に基づく具体的施策を提言する政策文書',            time: '約45秒' },
      { id: 'executive_brief',  icon: '📋', label: '首長向けブリーフィング',   description: '3分で読める1ページのエグゼクティブサマリー',              time: '約20秒' },
      { id: 'fiscal_report',    icon: '💰', label: '財政状況報告書',           description: '収益データ・財政力指数の分析と類似自治体比較',            time: '約40秒' },
    ],
    aiAdvisorHref: '/ai-advisor',
  },

  // ══════════════════════════════
  //  教育
  // ══════════════════════════════
  education: {
    id:         'education',
    name:       '教育',
    fullName:   '教育委員会・学校',
    emoji:      '🏫',
    staffLabel: '教職員',
    unitLabel:  '学校',
    color: {
      primary:  'bg-blue-600 hover:bg-blue-700 text-white',
      bg:       'bg-blue-50',
      border:   'border-blue-200',
      text:     'text-blue-700',
      badge:    'bg-blue-100 text-blue-700',
      ring:     'focus:ring-blue-300',
      scoreBtn: 'bg-blue-500',
    },
    notionDbs: {
      // ★ 教育部門専用の Notion DB を作成後、ID をここに記入
      staffCondition: '',  // 例: 'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'
      serviceStatus:  '',
      wellbeing:      '',
    },
    deptOptions: [
      '小学校', '中学校', '高等学校', '特別支援学校',
      '教育委員会事務局', '給食センター',
    ],
    serviceCategories: ['小学校', '中学校', '高等学校', '給食', '図書館', '社会教育'],
    policyTemplates: [
      { id: 'edu_report',     icon: '📚', label: '教育委員会報告',        description: '学力・出席・WellBeingの月次まとめ報告書',   time: '約30秒' },
      { id: 'futoko_plan',    icon: '🤝', label: '不登校対策提言',        description: 'データに基づく不登校リスク対応施策の提言',   time: '約45秒' },
      { id: 'teacher_wb',     icon: '💚', label: '教職員WellBeing改善案', description: '教職員の負担軽減と働き方改革に向けた施策',   time: '約35秒' },
      { id: 'facility_plan',  icon: '🏫', label: '学校施設整備計画',      description: '老朽化・統廃合を含む施設整備の優先順位提言', time: '約40秒' },
    ],
    aiAdvisorHref: '/koumuin/ai-advisor',
  },

  // ══════════════════════════════
  //  警察・消防
  // ══════════════════════════════
  safety: {
    id:         'safety',
    name:       '警察・消防',
    fullName:   '警察署・消防署',
    emoji:      '👮',
    staffLabel: '隊員',
    unitLabel:  '署',
    color: {
      primary:  'bg-amber-600 hover:bg-amber-700 text-white',
      bg:       'bg-amber-50',
      border:   'border-amber-200',
      text:     'text-amber-700',
      badge:    'bg-amber-100 text-amber-700',
      ring:     'focus:ring-amber-300',
      scoreBtn: 'bg-amber-500',
    },
    notionDbs: {
      // ★ 警察消防部門専用の Notion DB を作成後、ID をここに記入
      staffCondition: '',
      serviceStatus:  '',
      wellbeing:      '',
    },
    deptOptions: [
      '警察署 交番', '刑事課', '地域課', '交通課',
      '消防署 本署', '消防署 分署', '救急隊',
    ],
    serviceCategories: ['地域パトロール', '交通指導', '救急出動', '火災対応', '防災訓練', '避難所運営'],
    policyTemplates: [
      { id: 'safety_report',   icon: '🛡️', label: '治安状況報告',        description: '事件・事故・出動件数の月次分析報告書',        time: '約30秒' },
      { id: 'disaster_plan',   icon: '🌊', label: '防災計画提言',         description: 'リスク分析に基づく防災体制強化の提言',        time: '約45秒' },
      { id: 'staff_wb_safety', icon: '💪', label: '隊員WellBeing改善案', description: '過重労働・メンタルヘルス対策の施策提言',      time: '約35秒' },
      { id: 'equipment_plan',  icon: '🚒', label: '装備・施設整備計画',  description: '老朽化装備・施設の更新優先順位と予算計画',    time: '約40秒' },
    ],
    aiAdvisorHref: '/koumuin/ai-advisor',
  },

  // ══════════════════════════════
  //  医療・介護
  // ══════════════════════════════
  healthcare: {
    id:         'healthcare',
    name:       '医療・介護',
    fullName:   '病院・診療所・介護施設',
    emoji:      '🏥',
    staffLabel: '医療従事者',
    unitLabel:  '施設',
    color: {
      primary:  'bg-rose-600 hover:bg-rose-700 text-white',
      bg:       'bg-rose-50',
      border:   'border-rose-200',
      text:     'text-rose-700',
      badge:    'bg-rose-100 text-rose-700',
      ring:     'focus:ring-rose-300',
      scoreBtn: 'bg-rose-500',
    },
    notionDbs: {
      // ★ 医療介護部門専用の Notion DB を作成後、ID をここに記入
      staffCondition: '',
      serviceStatus:  '',
      wellbeing:      '',
    },
    deptOptions: [
      '内科', '外科', '小児科', '救急', '訪問診療',
      '特別養護老人ホーム', '居宅介護支援', '地域包括支援センター',
    ],
    serviceCategories: ['在宅医療', '外来診療', '救急対応', '介護サービス', '訪問看護', '地域包括ケア'],
    policyTemplates: [
      { id: 'medical_report',  icon: '🏥', label: '医療体制報告',           description: '診療科別稼働状況・医師充足率の月次報告書',        time: '約30秒' },
      { id: 'care_human',      icon: '👥', label: '介護人材確保提言',       description: '離職率改善・処遇向上に向けた施策提言',            time: '約45秒' },
      { id: 'elderly_wb_plan', icon: '👴', label: '高齢者WellBeing施策',   description: '孤独死リスク低減・生活支援充実のための施策',      time: '約35秒' },
      { id: 'care_network',    icon: '🤝', label: '地域医療連携計画',       description: '病院・診療所・介護施設の連携強化計画書',          time: '約40秒' },
    ],
    aiAdvisorHref: '/koumuin/ai-advisor',
  },
};

// ─── ユーティリティ ──────────────────────────────────────

/** ID で部門設定を取得（存在しない場合は gyosei を返す） */
export function getDept(id: DeptId): DeptConfig {
  return DEPARTMENTS[id] ?? DEPARTMENTS.gyosei;
}

/** 全部門の設定を配列で取得 */
export function getAllDepts(): DeptConfig[] {
  return Object.values(DEPARTMENTS);
}
