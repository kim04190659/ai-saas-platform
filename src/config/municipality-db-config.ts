// =====================================================
//  src/config/municipality-db-config.ts
//  自治体別 Notion DB ID マッピング — Sprint #49
//
//  各エンジン（PDCA・住民コーチ）がこのファイルを参照して
//  municipalityId に応じた正しいDBにアクセスする。
//
//  新しい自治体を追加するときはここに1エントリ追加するだけ。
// =====================================================

/** 1自治体分のDB設定 */
export type MunicipalityDbConfig = {
  /** 施策実行記録DB（PDCAカンバン） */
  pdcaDbId: string
  /** 住民相談DB（LINE相談履歴） */
  consultationDbId: string
  /** 住民WBコーチングDB（WBスコア・コーチングメッセージ） */
  coachingDbId: string
  /** インフラ老朽化DB（施設・橋梁・道路の健全度管理）— Sprint #51〜 */
  infraDbId?: string
  /** 財政健全化指標DB（健全化判断比率・財政構造指標等）— Sprint #52〜 */
  fiscalDbId?: string
  /** 観光管理DB（入込客数・混雑度・環境負荷・ガイド予約）— Sprint #59〜 */
  tourismDbId?: string
  /** 移住相談DB（相談者情報・進捗・定住状況）— Sprint #59〜 */
  migrationDbId?: string
  /** 往診管理DB（患者情報・前回往診日・要介護度・緊急フラグ）— Sprint #65〜 */
  visitDbId?: string
  /** 農地情報DB（農地・作物・規模・補助金対象・農地状態）— Sprint #66〜 */
  farmDbId?: string
  /** 移住就農希望者DB（候補者・経験・世帯構成・移住希望時期）— Sprint #66〜 */
  farmerDbId?: string
  /** 復興事業進捗DB（案件・進捗率・予算・遅延フラグ）— Sprint #67〜 */
  recoveryDbId?: string
  /** CO2削減活動DB（再エネ・EV・廃棄物・森林カテゴリ別削減量）— Sprint #68〜 */
  carbonDbId?: string
  /** 子育て相談DB（転出懸念フラグ・スコア・相談カテゴリ）— Sprint #69〜 */
  childcareDbId?: string
  /** 地場産業台帳DB（産業種・事業者数・後継者有無・年商・販路・6次産業化状況）— Sprint #70〜 */
  localIndustryDbId?: string
}

/**
 * 自治体別 DB ID マッピング
 *
 * ■ 屋久島町（yakushima）
 *   Sprint #47 で作成した施策実行記録DB
 *   Sprint #48 で作成した住民相談DB・住民WBコーチングDB
 *
 * ■ 霧島市（kirishima）
 *   Sprint #49 で作成した3本のDB
 */
export const MUNICIPALITY_DB_CONFIG: Record<string, MunicipalityDbConfig> = {

  // ── 屋久島町 ──────────────────────────────────────
  yakushima: {
    pdcaDbId:         'b2685f135ee14a529041f2ebc178d048',  // 施策実行記録DB
    consultationDbId: 'a4826a3c83d24d74a6f60b955f87454a',  // 住民相談DB
    coachingDbId:     'a610367ac47b48a996eae41d72ac821e',  // 住民WBコーチングDB
    fiscalDbId:       'b9359471ec62448eaf451c41e359ece1',  // 財政健全化指標DB（Sprint #57）
    infraDbId:        '6f408b0e8f894ad7817935aea5234e37',  // インフラ老朽化DB（Sprint #57）
    tourismDbId:      '8ecf873915ac4ee1a7f4a662f790ae46',  // 観光管理DB（Sprint #59）
    migrationDbId:    'dbf5cbe558a04a48ba1c21cbb25d22c0',  // 移住相談DB（Sprint #59）
  },

  // ── 海士町（島根県隠岐諸島）── Sprint #64 追加 ──────
  // 移住定着リスクAI の事例自治体。移住相談DBのみ設定。
  amacho: {
    pdcaDbId:         '',                                   // 未設定（将来追加）
    consultationDbId: '',                                   // 未設定（将来追加）
    coachingDbId:     '',                                   // 未設定（将来追加）
    migrationDbId:    'a0b7e20ffe2f46f890f152982a08e101',  // 移住相談DB（Sprint #64）
  },

  // ── 五島市（長崎県）── Sprint #65 追加 ──────────────
  // 往診優先順位AI の事例自治体。往診管理DBのみ設定。
  // 離島・人口約3.2万人・高齢化率約40%・医師不足が深刻
  goto: {
    pdcaDbId:         '',                                   // 未設定（将来追加）
    consultationDbId: '',                                   // 未設定（将来追加）
    coachingDbId:     '',                                   // 未設定（将来追加）
    visitDbId:        'dd61e9fcdee44c48880ab26cc1d8675d',  // 往診管理DB（Sprint #65）
  },

  // ── 輪島市（石川県）── Sprint #67 追加 ──────────────
  // 復興進捗ダッシュボード の事例自治体。
  // 2024年1月1日 能登半島地震で甚大な被害。復興事業進捗DBのみ設定。
  wajima: {
    pdcaDbId:         '',                                   // 未設定（将来追加）
    consultationDbId: '',                                   // 未設定（将来追加）
    coachingDbId:     '',                                   // 未設定（将来追加）
    recoveryDbId:     'ff40f22ee2b749819fe2790cf071e1f8',  // 復興事業進捗DB（Sprint #67）
  },

  // ── 西粟倉村（岡山県英田郡）── Sprint #66 追加 ──────
  // 農業担い手マッチングAI の事例自治体。
  // 「百年の森林」で全国的に知られる村だが農業後継者不足も深刻。
  nishiawakura: {
    pdcaDbId:         '',                                   // 未設定（将来追加）
    consultationDbId: '',                                   // 未設定（将来追加）
    coachingDbId:     '',                                   // 未設定（将来追加）
    farmDbId:         '8c77f269212f4ac4a0527f99bd5f4c1d',  // 農地情報DB（Sprint #66）
    farmerDbId:       '2f633b13b9314ea48642ae33ad72ff6e',  // 移住就農希望者DB（Sprint #66）
  },

  // ── 神埼市（佐賀県）── Sprint #69 追加 ──────────────
  // 子育て世帯流出リスク検知AI の事例自治体。
  // 佐賀県中東部・人口約29,000人・少子化が深刻で年間出生数が激減中。
  kanzaki: {
    pdcaDbId:         '',                                   // 未設定（将来追加）
    consultationDbId: '',                                   // 未設定（将来追加）
    coachingDbId:     '',                                   // 未設定（将来追加）
    childcareDbId:    '465b6d131ed04e67a3ced4708c8f40d0',  // 子育て相談DB（Sprint #69）
  },

  // ── 上勝町（徳島県）── Sprint #68 追加 ──────────────
  // CO2削減進捗トラッカー の事例自治体。
  // 「ゼロ・ウェイスト宣言」で全国的に知られる。2020年にゼロカーボン宣言。
  kamikatsu: {
    pdcaDbId:         '',                                   // 未設定（将来追加）
    consultationDbId: '',                                   // 未設定（将来追加）
    coachingDbId:     '',                                   // 未設定（将来追加）
    carbonDbId:       '30179aa96448400399ccc069e0f10b29',  // CO2削減活動DB（Sprint #68）
  },

  // ── 気仙沼市（宮城県）── Sprint #70 追加 ──────────────
  // 地場産業6次産業化支援AI の事例自治体。
  // 水産業都市・人口約6.1万人・フカヒレ世界シェア70%を誇る三陸沿岸の中核都市。
  kesennuma: {
    pdcaDbId:            '',                                   // 未設定（将来追加）
    consultationDbId:    '',                                   // 未設定（将来追加）
    coachingDbId:        '',                                   // 未設定（将来追加）
    localIndustryDbId:   '154df0b60fce4695a0a2a1548e8e2b0e',  // 地場産業台帳DB（Sprint #70）
  },

  // ── 霧島市 ──────────────────────────────────────
  kirishima: {
    pdcaDbId:         '1b2da85d1f9444a9ab69e1e78883ac84',  // 施策実行記録DB
    consultationDbId: '52035e8fa8cc4839ab54a83bf202c027',  // 住民相談DB
    coachingDbId:     '0cc71d5ee76244ad8a65a917be4f9fd3',  // 住民WBコーチングDB
    infraDbId:        '941dfec2baa445cb9f79475f801d0083',  // インフラ施設DB（Sprint #51）
    fiscalDbId:       '6b4381510d7f4182b5249284024f6622',  // 財政健全化指標DB（Sprint #52）
  },
}

/**
 * municipalityId からDB設定を取得する
 * 該当しない場合は undefined を返す
 */
export function getMunicipalityDbConfig(
  municipalityId: string
): MunicipalityDbConfig | undefined {
  return MUNICIPALITY_DB_CONFIG[municipalityId]
}
