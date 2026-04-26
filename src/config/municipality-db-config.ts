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
