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

/** 1 部門の完全な設定 */
export type DeptConfig = {
  id:           DeptId;
  name:         string;        // 部門名       例: '教育'
  fullName:     string;        // 正式名称      例: '教育委員会・学校'
  emoji:        string;        // 絵文字        例: '🏫'
  staffLabel:   string;        // 職員の呼称    例: '教職員'
  unitLabel:    string;        // 組織単位の呼称 例: '学校'
  color:        DeptColor;
  notionDbs:    DeptNotionDbs; // 疎結合 DB ID（Notion で確認して記入）
  deptOptions:  string[];      // 所属のクイック選択肢
  aiAdvisorHref: string;       // AI 顧問ページへのリンク
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
