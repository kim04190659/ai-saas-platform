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
