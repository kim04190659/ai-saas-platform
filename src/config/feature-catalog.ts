// =====================================================
//  src/config/feature-catalog.ts
//  RunWith Platform 機能カタログ定義 — Sprint #71
//
//  ■ 役割
//    ウィザード Step 7（基本機能確認）・Step 8（拡張AI機能選択）で
//    表示する機能リストと、各機能のメタデータを一元管理する。
//
//  ■ 利用箇所
//    - org-wizard/page.tsx（Step 7/8 の表示）
//    - api/runwith/seed-data/route.ts（テストデータ登録先DB特定）
//    - api/runwith/provision/route.ts（Notion DB 自動作成）
// =====================================================

// ─── 型定義 ──────────────────────────────────────────────

/** Notion DB のプロパティ定義（自動プロビジョニング用） */
export type NotionPropertyDef = {
  name: string   // プロパティ名（日本語）
  type: 'title' | 'rich_text' | 'number' | 'select' | 'multi_select' | 'date' | 'checkbox' | 'url' | 'email'
}

/** 1つのNotion DBのスキーマ定義 */
export type NotionDbSchema = {
  name: string                    // DB名（Notion上の表示名）
  properties: NotionPropertyDef[] // カラム定義（title を必ず1件含む）
}

/** 1機能の定義 */
export type FeatureDef = {
  id: string               // 機能ID（英字、ユニーク）
  name: string             // 表示名
  description: string      // 一言説明
  sprint: number           // 実装スプリント番号
  dbKeys: string[]         // municipality-db-config.ts に追加するキー名
  route: string            // メインアプリ画面のルート
  sampleMunicipality: string  // 事例自治体名
  requiredDataItems: string[] // テストデータとして必要な入力項目（Step 9 用）
  icon: string             // 表示アイコン（絵文字）
}

// ─── 必須基本機能（全自治体共通） ──────────────────────────

/**
 * 必須基本機能リスト
 * 全自治体が RunWith Platform を導入する際に必ず有効になる機能。
 * ウィザード Step 7 で「これは標準搭載です」と案内する。
 */
export const BASIC_FEATURES: FeatureDef[] = [
  {
    id: 'line_consultation',
    name: 'LINE住民相談 + AI自動回答',
    description: '住民からのLINE相談をNotionに蓄積し、AIが即時回答案を生成',
    sprint: 6,
    dbKeys: ['consultationDbId'],
    route: '/citizen/line',
    sampleMunicipality: '霧島市・屋久島町',
    requiredDataItems: [
      '相談カテゴリ例（最低5件）',
      'FAQ例（自動回答OKの問い合わせ 最低5件）',
    ],
    icon: '💬',
  },
  {
    id: 'wb_dashboard',
    name: '住民Well-Being + PDCA ダッシュボード',
    description: '住民WBスコアと施策進捗をリアルタイムで可視化',
    sprint: 10,
    dbKeys: ['pdcaDbId', 'coachingDbId'],
    route: '/gyosei/dashboard',
    sampleMunicipality: '霧島市・屋久島町',
    requiredDataItems: [
      '施策実行記録サンプル（最低5件）',
      '住民WBスコアサンプル（最低5件）',
    ],
    icon: '📊',
  },
  {
    id: 'staff_condition',
    name: '職員コンディション管理',
    description: '職員の燃え尽きリスクを予兆検知し、1on1リマインドを自動化',
    sprint: 15,
    dbKeys: [],  // 既存の共通DBを使用するため追加不要
    route: '/staff/condition',
    sampleMunicipality: '全自治体共通',
    requiredDataItems: [
      '職員ダミーデータ（最低5名分：氏名・所属・役職）',
    ],
    icon: '👥',
  },
]

// ─── 拡張AI機能カタログ（Sprint #64〜#70） ──────────────

/**
 * 拡張AI機能リスト
 * Sprint #64〜#70 で開発した地域特化AI機能。
 * ウィザード Step 8 で自治体が必要なものを選択する。
 * 0件でも可（基本機能だけで運用可能）。
 */
export const EXTENDED_FEATURES: FeatureDef[] = [
  {
    id: 'migration_risk',
    name: '移住定着リスクAI',
    description: '移住者の定着リスクをスコアリングし、早期フォローを自動提案',
    sprint: 64,
    dbKeys: ['migrationDbId'],
    route: '/gyosei/migration',
    sampleMunicipality: '海士町（島根県）',
    requiredDataItems: [
      '移住相談者サンプル（最低5件：氏名・移住時期・定住状況）',
    ],
    icon: '🏠',
  },
  {
    id: 'visit_priority',
    name: '往診優先順位AI',
    description: '患者の要介護度・緊急フラグを基にAIが往診順序を毎日最適化',
    sprint: 65,
    dbKeys: ['visitDbId'],
    route: '/gyosei/visit-priority',
    sampleMunicipality: '五島市（長崎県）',
    requiredDataItems: [
      '患者サンプル（最低5件：要介護度・緊急フラグ・前回往診日）',
    ],
    icon: '🏥',
  },
  {
    id: 'farmer_matching',
    name: '農業担い手マッチングAI',
    description: '農地情報と移住就農希望者をAIがマッチングし後継者候補を提案',
    sprint: 66,
    dbKeys: ['farmDbId', 'farmerDbId'],
    route: '/gyosei/farmer-matching',
    sampleMunicipality: '西粟倉村（岡山県）',
    requiredDataItems: [
      '農地サンプル（最低5件：面積・作物・補助金対象）',
      '就農希望者サンプル（最低5件：経験・世帯構成・移住希望時期）',
    ],
    icon: '🌾',
  },
  {
    id: 'recovery_progress',
    name: '復興進捗ダッシュボード',
    description: '復興事業の進捗率・予算消化・遅延フラグをリアルタイム集計',
    sprint: 67,
    dbKeys: ['recoveryDbId'],
    route: '/gyosei/recovery',
    sampleMunicipality: '輪島市（石川県）',
    requiredDataItems: [
      '復興案件サンプル（最低5件：進捗率・予算・遅延フラグ）',
    ],
    icon: '🔨',
  },
  {
    id: 'carbon_tracker',
    name: 'CO2削減進捗トラッカー',
    description: '再エネ・EV・廃棄物・森林カテゴリ別のCO2削減量を自動集計',
    sprint: 68,
    dbKeys: ['carbonDbId'],
    route: '/gyosei/carbon',
    sampleMunicipality: '上勝町（徳島県）',
    requiredDataItems: [
      'CO2削減活動サンプル（最低5件：カテゴリ・削減量・実施日）',
    ],
    icon: '🌿',
  },
  {
    id: 'childcare_risk',
    name: '子育て世帯流出リスク検知AI',
    description: '転出懸念スコアの高い子育て世帯を検知し、施策介入を自動提案',
    sprint: 69,
    dbKeys: ['childcareDbId'],
    route: '/gyosei/childcare-risk',
    sampleMunicipality: '神埼市（佐賀県）',
    requiredDataItems: [
      '子育て相談サンプル（最低5件：相談カテゴリ・転出懸念フラグ）',
    ],
    icon: '👶',
  },
  {
    id: 'local_industry',
    name: '地場産業6次産業化支援AI',
    description: '後継者空白リスクが高い産業を特定し、6次産業化施策をAIが提言',
    sprint: 70,
    dbKeys: ['localIndustryDbId'],
    route: '/gyosei/local-industry',
    sampleMunicipality: '気仙沼市（宮城県）',
    requiredDataItems: [
      '地場産業サンプル（最低5件：産業名・後継者有無・事業者平均年齢）',
    ],
    icon: '🐟',
  },
]

// ─── DB スキーマ定義（Notion 自動プロビジョニング用） ────

/**
 * 各 dbKey に対応する Notion DB のスキーマ。
 * Sprint #73 の provision API がこれを参照して DB を自動作成する。
 */
export const DB_SCHEMAS: Record<string, NotionDbSchema> = {

  // ── 基本機能 ──────────────────────────────────────────
  consultationDbId: {
    name: '住民相談DB',
    properties: [
      { name: '相談内容',   type: 'title' },
      { name: '自治体名',   type: 'select' },
      { name: '相談日時',   type: 'date' },
      { name: 'カテゴリ',   type: 'select' },
      { name: 'AI回答案',   type: 'rich_text' },
      { name: '対応状況',   type: 'select' },
    ],
  },
  pdcaDbId: {
    name: '施策実行記録DB',
    properties: [
      { name: '施策名',     type: 'title' },
      { name: '自治体名',   type: 'select' },
      { name: 'ステータス', type: 'select' },
      { name: '担当者',     type: 'rich_text' },
      { name: '開始日',     type: 'date' },
      { name: '進捗メモ',   type: 'rich_text' },
    ],
  },
  coachingDbId: {
    name: '住民WBコーチングDB',
    properties: [
      { name: '住民ID',       type: 'title' },
      { name: '自治体名',     type: 'select' },
      { name: 'WBスコア',     type: 'number' },
      { name: '計測日',       type: 'date' },
      { name: 'コーチング文', type: 'rich_text' },
      { name: '送信済み',     type: 'checkbox' },
    ],
  },

  // ── 拡張AI機能 ────────────────────────────────────────
  migrationDbId: {
    name: '移住相談DB',
    properties: [
      { name: '氏名',           type: 'title' },
      { name: '自治体名',       type: 'select' },
      { name: '移住時期',       type: 'date' },
      { name: '定住状況',       type: 'select' },
      { name: '定着リスクスコア', type: 'number' },
      { name: '転出懸念フラグ', type: 'checkbox' },
    ],
  },
  visitDbId: {
    name: '往診管理DB',
    properties: [
      { name: '患者名',     type: 'title' },
      { name: '自治体名',   type: 'select' },
      { name: '要介護度',   type: 'select' },
      { name: '緊急フラグ', type: 'checkbox' },
      { name: '前回往診日', type: 'date' },
      { name: '優先スコア', type: 'number' },
    ],
  },
  farmDbId: {
    name: '農地情報DB',
    properties: [
      { name: '農地名',       type: 'title' },
      { name: '自治体名',     type: 'select' },
      { name: '面積（a）',    type: 'number' },
      { name: '主要作物',     type: 'select' },
      { name: '農地状態',     type: 'select' },
      { name: '補助金対象',   type: 'checkbox' },
    ],
  },
  farmerDbId: {
    name: '移住就農希望者DB',
    properties: [
      { name: '氏名',           type: 'title' },
      { name: '自治体名',       type: 'select' },
      { name: '農業経験',       type: 'select' },
      { name: '世帯構成',       type: 'select' },
      { name: '移住希望時期',   type: 'date' },
      { name: 'マッチングスコア', type: 'number' },
    ],
  },
  recoveryDbId: {
    name: '復興事業進捗DB',
    properties: [
      { name: '事業名',     type: 'title' },
      { name: '自治体名',   type: 'select' },
      { name: '進捗率（%）', type: 'number' },
      { name: '予算（万円）', type: 'number' },
      { name: '遅延フラグ', type: 'checkbox' },
      { name: '最終更新日', type: 'date' },
    ],
  },
  carbonDbId: {
    name: 'CO2削減活動DB',
    properties: [
      { name: '活動名',           type: 'title' },
      { name: '自治体名',         type: 'select' },
      { name: 'カテゴリ',         type: 'select' },
      { name: '削減量（t-CO2）',  type: 'number' },
      { name: '実施日',           type: 'date' },
      { name: '補助金活用',       type: 'checkbox' },
    ],
  },
  childcareDbId: {
    name: '子育て相談DB',
    properties: [
      { name: '世帯ID',         type: 'title' },
      { name: '自治体名',       type: 'select' },
      { name: '相談カテゴリ',   type: 'select' },
      { name: '転出懸念フラグ', type: 'checkbox' },
      { name: '転出懸念スコア', type: 'number' },
      { name: '相談日',         type: 'date' },
    ],
  },
  localIndustryDbId: {
    name: '地場産業台帳DB',
    properties: [
      { name: '産業名',           type: 'title' },
      { name: '自治体名',         type: 'select' },
      { name: '産業種',           type: 'select' },
      { name: '事業者平均年齢',   type: 'number' },
      { name: '後継者有無',       type: 'select' },
      { name: '後継者空白リスク', type: 'select' },
    ],
  },
}

// ─── ユーティリティ ───────────────────────────────────────

/**
 * 機能IDから FeatureDef を取得する
 * 基本機能・拡張機能の両方を検索する
 */
export function getFeatureById(id: string): FeatureDef | undefined {
  return (
    BASIC_FEATURES.find((f) => f.id === id) ??
    EXTENDED_FEATURES.find((f) => f.id === id)
  )
}

/**
 * 選択された機能IDリストから、必要な dbKeys をすべて収集する
 * 重複は除去して返す
 */
export function collectDbKeys(featureIds: string[]): string[] {
  const keys = featureIds.flatMap((id) => getFeatureById(id)?.dbKeys ?? [])
  return [...new Set(keys)]
}
