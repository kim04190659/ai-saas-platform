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
  // 移住定着リスクAI の事例自治体。Sprint #74 で基本3機能DB追加。
  amacho: {
    pdcaDbId:         '90202acaae6d42ca9e892080db618818',  // 施策実行記録DB（Sprint #74）
    consultationDbId: 'a73c926b2420457ca1a310ff4c3e2501',  // 住民相談DB（Sprint #74）
    coachingDbId:     '49f248b0bbb94e879df97a70b97dddc1',  // 住民WBコーチングDB（Sprint #74）
    migrationDbId:    'a0b7e20ffe2f46f890f152982a08e101',  // 移住相談DB（Sprint #64）
  },

  // ── 五島市（長崎県）── Sprint #65 追加 ──────────────
  // 往診優先順位AI の事例自治体。Sprint #74 で基本3機能DB追加。
  // 離島・人口約3.2万人・高齢化率約40%・医師不足が深刻
  goto: {
    pdcaDbId:         'd572caa60aad4a128adb983ecebc83a1',  // 施策実行記録DB（Sprint #74）
    consultationDbId: 'b221fa6870384846b16fde1188f40223',  // 住民相談DB（Sprint #74）
    coachingDbId:     'c58038ed3ad44f4fba1c960ef7a89446',  // 住民WBコーチングDB（Sprint #74）
    visitDbId:        'dd61e9fcdee44c48880ab26cc1d8675d',  // 往診管理DB（Sprint #65）
  },

  // ── 輪島市（石川県）── Sprint #67 追加 ──────────────
  // 復興進捗ダッシュボード の事例自治体。Sprint #74 で基本3機能DB追加。
  // 2024年1月1日 能登半島地震で甚大な被害。
  wajima: {
    pdcaDbId:         'd8675b569cf747cbb747d01e9e60a2ef',  // 施策実行記録DB（Sprint #74）
    consultationDbId: 'cfaeb57fa81c450ea4e7280456b27374',  // 住民相談DB（Sprint #74）
    coachingDbId:     'b6c1a3212d2a4e4d82a2a6eaf2256618',  // 住民WBコーチングDB（Sprint #74）
    recoveryDbId:     'ff40f22ee2b749819fe2790cf071e1f8',  // 復興事業進捗DB（Sprint #67）
  },

  // ── 西粟倉村（岡山県英田郡）── Sprint #66 追加 ──────
  // 農業担い手マッチングAI の事例自治体。Sprint #74 で基本3機能DB追加。
  // 「百年の森林」で全国的に知られる村だが農業後継者不足も深刻。
  nishiawakura: {
    pdcaDbId:         '8247e3edd26147e6b196f389619ab348',  // 施策実行記録DB（Sprint #74）
    consultationDbId: 'a1fecf8c024e4364a335b2da83a1ba8e',  // 住民相談DB（Sprint #74）
    coachingDbId:     '822e3e5de98a406cb26acbda6d7c133a',  // 住民WBコーチングDB（Sprint #74）
    farmDbId:         '8c77f269212f4ac4a0527f99bd5f4c1d',  // 農地情報DB（Sprint #66）
    farmerDbId:       '2f633b13b9314ea48642ae33ad72ff6e',  // 移住就農希望者DB（Sprint #66）
  },

  // ── 神埼市（佐賀県）── Sprint #69 追加 ──────────────
  // 子育て世帯流出リスク検知AI の事例自治体。Sprint #74 で基本3機能DB追加。
  // 佐賀県中東部・人口約29,000人・少子化が深刻で年間出生数が激減中。
  kanzaki: {
    pdcaDbId:         'dfce9f0af7d0403e9ef397f94764f693',  // 施策実行記録DB（Sprint #74）
    consultationDbId: '1b91cf67c9614f8199859f7ccbd00669',  // 住民相談DB（Sprint #74）
    coachingDbId:     'a20d06caea8a43e29ab02d9d0e899250',  // 住民WBコーチングDB（Sprint #74）
    childcareDbId:    '465b6d131ed04e67a3ced4708c8f40d0',  // 子育て相談DB（Sprint #69）
  },

  // ── 上勝町（徳島県）── Sprint #68 追加 ──────────────
  // CO2削減進捗トラッカー の事例自治体。Sprint #74 で基本3機能DB追加。
  // 「ゼロ・ウェイスト宣言」で全国的に知られる。2020年にゼロカーボン宣言。
  kamikatsu: {
    pdcaDbId:         'b5f2a6f8b837406792ab941d11627cdd',  // 施策実行記録DB（Sprint #74）
    consultationDbId: 'd4d9304289e2464eb14a6a0d78414135',  // 住民相談DB（Sprint #74）
    coachingDbId:     '88a31c1ebf6946f9adc78a56bd0d7f92',  // 住民WBコーチングDB（Sprint #74）
    carbonDbId:       '30179aa96448400399ccc069e0f10b29',  // CO2削減活動DB（Sprint #68）
  },

  // ── 気仙沼市（宮城県）── Sprint #70 追加 ──────────────
  // 地場産業6次産業化支援AI の事例自治体。Sprint #74 で基本3機能DB追加。
  // 水産業都市・人口約6.1万人・フカヒレ世界シェア70%を誇る三陸沿岸の中核都市。
  kesennuma: {
    pdcaDbId:            '55cde6eec46447f38a4b31d24fd234c4',  // 施策実行記録DB（Sprint #74）
    consultationDbId:    '4dc0ec0857d44f22b85351da4deb5a1d',  // 住民相談DB（Sprint #74）
    coachingDbId:        '90d7eca0376749abb539511ce2c83304',  // 住民WBコーチングDB（Sprint #74）
    localIndustryDbId:   '8fcf8d3e7c084d34904df8b5468b8f91',  // 地場産業台帳DB（Sprint #70）
  },

  // ── 四万十市（高知県）── Sprint #73 自動プロビジョニングで作成 ──
  // オンボーディングウィザード Step 10 で自動生成。基本3機能＋移住定着・往診AI。
  shimanto: {
    consultationDbId: '352960a91e23811db515c59977be6661',  // 住民相談DB
    pdcaDbId:         '352960a91e23817eb3c2f9e7ca59e6fd',  // 施策実行記録DB
    coachingDbId:     '352960a91e23818b9c8af83d335febd9',  // 住民WBコーチングDB
    migrationDbId:    '352960a91e238139a6c1c8ee3c3e79bd',  // 移住相談DB
    visitDbId:        '352960a91e23813e8addd2ea840e3b3b',  // 往診管理DB
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
