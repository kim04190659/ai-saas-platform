// =====================================================
//  src/config/municipalities.ts
//  展開済み自治体マスタ定義 — Sprint #32
//
//  ■ このファイルの役割
//    RunWith Platform に展開済み（または準備中）の自治体を一元管理する。
//    新しい自治体を追加するときは、このファイルに1件追加するだけでよい。
//
//  ■ 自治体を追加するときの手順
//    1. ここに Municipality 型のオブジェクトを追加する
//    2. src/config/features.ts に municipality グループのモジュールを追加
//    3. Notion の「🏙️ 自治体・組織 展開ページ」直下に自治体ページを作成
//    4. 共通DBに「自治体名」プロパティが設定されていることを確認
//    5. npx tsc --noEmit でエラーがないことを確認してから push
//
//  ■ status の意味
//    'active'  → 本番運用中（セレクターで選択可能）
//    'coming'  → 準備中（グレーアウト表示）
//    'demo'    → デモ専用（選択可能だがデモデータのみ）
// =====================================================

/** 実装済み機能フラグ（セレクターやダッシュボードに表示） */
export type ImplementedFeature = {
  /** 絵文字アイコン */
  emoji: string;
  /** 短い機能名（10文字以内推奨） */
  label: string;
};

/** 展開済み自治体の型定義 */
export type Municipality = {
  /** 英字ID（クエリパラメータ等に使用。例: 'kirishima'） */
  id: string;
  /** 表示名（例: '霧島市役所'） */
  name: string;
  /** 短縮名（Notion DB フィルタリングに使用。例: '霧島市'） */
  shortName: string;
  /** Notion 上の自治体ページID */
  notionPageId: string;
  /** テーマカラー（Tailwind クラス名。例: 'teal'） */
  color: string;
  /** 運用状況 */
  status: 'active' | 'coming' | 'demo';
  /**
   * 実装済み機能フラグ（オプション）
   * セレクタードロップダウン・ダッシュボードにバッジで表示する
   * 新機能を追加したときにここも更新すること
   */
  implementedFeatures?: ImplementedFeature[];
};

/**
 * 展開済み自治体の一覧
 * 先頭の自治体がデフォルト選択になる。
 */
export const MUNICIPALITIES: Municipality[] = [
  {
    id:           'kirishima',
    name:         '霧島市役所',
    shortName:    '霧島市',
    notionPageId: '33e960a91e23811184acf4044da2dd1b',
    color:        'teal',
    status:       'active',
    implementedFeatures: [
      { emoji: '♻️', label: '廃棄物最適化' },
      { emoji: '🛣️', label: '道路修復AI' },
      { emoji: '🏗️', label: 'インフラ老朽化' },
      { emoji: '💴', label: '財政健全化' },
      { emoji: '📈', label: '施策PDCA' },
      { emoji: '👤', label: '住民AIコーチ' },
      { emoji: '🏛️', label: '経営ダッシュボード' },
    ],
  },
  {
    id:           'yakushima',
    name:         '屋久島町役場',
    shortName:    '屋久島町',
    notionPageId: '347960a91e2381ac9999d0bad0d8646e',
    color:        'emerald',
    status:       'active',
    implementedFeatures: [
      { emoji: '🌿', label: '観光管理' },
      { emoji: '🏡', label: '移住支援' },
      { emoji: '🏗️', label: 'インフラ老朽化' },
      { emoji: '💴', label: '財政健全化' },
      { emoji: '📈', label: '施策PDCA' },
      { emoji: '👤', label: '住民AIコーチ' },
      { emoji: '🔍', label: 'DX効果測定' },
    ],
  },
  {
    // Sprint #64 追加: 海士町（移住定着リスクAI 事例自治体）
    id:           'amacho',
    name:         '海士町役場',
    shortName:    '海士町',
    notionPageId: '351960a91e2381bb9fdee42be45613be',
    color:        'cyan',
    status:       'active',
    implementedFeatures: [
      { emoji: '🏡', label: '移住定着リスクAI' },
    ],
  },
  {
    // Sprint #65 追加: 五島市（往診優先順位AI 事例自治体）
    // 長崎県・五島列島。人口約3.2万人・高齢化率約40%・医師不足が深刻な離島自治体
    id:           'goto',
    name:         '五島市役所',
    shortName:    '五島市',
    notionPageId: '351960a91e2381e8abb4de89c3cdd85f',
    color:        'rose',
    status:       'active',
    implementedFeatures: [
      { emoji: '🏥', label: '往診優先順位AI' },
    ],
  },
  {
    // Sprint #67 追加: 輪島市（復興進捗ダッシュボード 事例自治体）
    // 石川県輪島市 — 2024年能登半島地震で甚大な被害を受けた能登半島の中心都市
    id:           'wajima',
    name:         '輪島市役所',
    shortName:    '輪島市',
    notionPageId: '351960a91e238197805fe4d2509db486',
    color:        'orange',
    status:       'active',
    implementedFeatures: [
      { emoji: '🏗️', label: '復興進捗ダッシュボード' },
    ],
  },
  {
    // Sprint #66 追加: 西粟倉村（農業担い手マッチングAI 事例自治体）
    // 岡山県英田郡・人口約1,400人・「百年の森林」で知られる山村
    id:           'nishiawakura',
    name:         '西粟倉村役場',
    shortName:    '西粟倉村',
    notionPageId: '351960a91e23819cbd28ca3db3112c87',
    color:        'amber',
    status:       'active',
    implementedFeatures: [
      { emoji: '🌾', label: '農業担い手マッチング' },
    ],
  },
  {
    // Sprint #69 追加: 神埼市（佐賀県）— 子育て世帯流出リスク検知AI 事例自治体
    // 人口約29,000人・少子化・子育て世帯の福岡・佐賀市への流出が課題
    id:           'kanzaki',
    name:         '神埼市役所',
    shortName:    '神埼市',
    notionPageId: '351960a91e2381bea5aaea91c2c862ad',
    color:        'pink',
    status:       'active',
    implementedFeatures: [
      { emoji: '👶', label: '子育て流出リスクAI' },
    ],
  },
  {
    // Sprint #68 追加: 上勝町（徳島県勝浦郡）— CO2削減進捗トラッカー 事例自治体
    // 人口約1,500人・「ゼロ・ウェイスト宣言」で全国的に知られ、2020年にゼロカーボン宣言
    id:           'kamikatsu',
    name:         '上勝町役場',
    shortName:    '上勝町',
    notionPageId: '351960a91e2381e2805ec9ad52ed5e26',
    color:        'green',
    status:       'active',
    implementedFeatures: [
      { emoji: '🌱', label: 'CO2削減トラッカー' },
    ],
  },
  {
    id:           'nec',
    name:         'NEC コーポレートIT部門',
    shortName:    'NEC',
    notionPageId: '340960a91e2381a8be6fe82945e9a6ce',
    color:        'blue',
    status:       'coming',
  },
];

/**
 * デフォルト自治体（一覧の先頭、通常は霧島市）
 */
export const DEFAULT_MUNICIPALITY = MUNICIPALITIES[0];

/**
 * ID で自治体を検索する。見つからない場合はデフォルト自治体を返す。
 * @param id 英字ID（例: 'kirishima'）
 */
export function getMunicipalityById(id: string): Municipality {
  return MUNICIPALITIES.find(m => m.id === id) ?? DEFAULT_MUNICIPALITY;
}

/**
 * shortName（Notion の「自治体名」プロパティ値）で自治体を検索する。
 * @param shortName 短縮名（例: '霧島市'）
 */
export function getMunicipalityByShortName(shortName: string): Municipality | undefined {
  return MUNICIPALITIES.find(m => m.shortName === shortName);
}
