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
    recoveryDbId:     '1c408ef7dfe945aa8df1bb8e867a4315',  // 復興事業進捗DB（Sprint #67）
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
