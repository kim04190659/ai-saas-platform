/**
 * datasource-registry.ts
 * 利用可能なデータソースの一覧管理
 *
 * 各機関が提供するデータソースを登録する。
 * 新しいデータソースを追加するときはここに1件追記するだけでよい。
 */

export type DataSourceType = 'csv' | 'excel'
export type DataSourceOrg = '市役所' | '学校' | '消防' | '警察' | '病院' | '老人ホーム' | 'その他'

export interface DataSourceDef {
  id: string               // 一意なID（クエリ時に使用）
  label: string            // 表示名
  description: string      // 何のデータか
  type: DataSourceType     // ファイル形式
  org: DataSourceOrg       // 担当機関
  municipality: string     // 自治体名
  filePath: string         // DATA_ROOT からの相対パス（拡張子なし）
  columns: string[]        // 利用可能なカラム一覧（Claudeへのヒント）
  sensitiveColumns: string[] // 個人情報を含むカラム（自動マスク対象の参考情報）
}

/**
 * 登録済みデータソース一覧
 *
 * 実際の運用では、各機関と協議して追加していく。
 * まず霧島市のサンプルCSVから始め、徐々に拡大する。
 */
export const DATA_SOURCES: DataSourceDef[] = [
  // ─── 霧島市役所 ───
  {
    id: 'kirishima/residents-stats',
    label: '霧島市 住民統計',
    description: '地区別・年齢層別の住民数統計（集計値のみ、個人情報なし）',
    type: 'csv',
    org: '市役所',
    municipality: '霧島市',
    filePath: 'kirishima/residents-stats',
    columns: ['地区名', '年度', '総人口', '65歳以上', '75歳以上', '15歳未満', '世帯数'],
    sensitiveColumns: [], // 集計データなので個人情報なし
  },
  {
    id: 'kirishima/welfare-summary',
    label: '霧島市 福祉サービス利用状況',
    description: '介護・障害・生活保護サービスの月別利用件数（匿名集計）',
    type: 'csv',
    org: '市役所',
    municipality: '霧島市',
    filePath: 'kirishima/welfare-summary',
    columns: ['年月', 'サービス種別', '利用件数', '新規件数', '終了件数', '地区名'],
    sensitiveColumns: [],
  },
  {
    id: 'kirishima/infrastructure',
    label: '霧島市 公共施設台帳',
    description: '市が管理する道路・橋梁・上下水道・建物の老朽化状況',
    type: 'excel',
    org: '市役所',
    municipality: '霧島市',
    filePath: 'kirishima/infrastructure',
    columns: ['施設名', '種別', '建設年度', '経過年数', '健全度', '優先度', '所在地区', '推定更新費用'],
    sensitiveColumns: [],
  },

  // ─── 霧島市消防 ───
  {
    id: 'kirishima/fire-dispatch-stats',
    label: '霧島市消防 出動統計',
    description: '月別・種別の消防出動件数（火災・救急・救助）',
    type: 'csv',
    org: '消防',
    municipality: '霧島市',
    filePath: 'kirishima/fire-dispatch-stats',
    columns: ['年月', '火災件数', '救急件数', '救助件数', '地区名', '平均到着時間(分)'],
    sensitiveColumns: [],
  },

  // ─── 霧島市内病院（将来追加予定） ───
  // {
  //   id: 'kirishima/hospital-capacity',
  //   label: '霧島市 病院稼働状況',
  //   description: '市内病院の月別稼働状況（匿名集計）',
  //   type: 'csv',
  //   org: '病院',
  //   municipality: '霧島市',
  //   filePath: 'kirishima/hospital-capacity',
  //   columns: ['年月', '病院名', '病床利用率', '救急受入件数', '外来患者数'],
  //   sensitiveColumns: [],
  // },
]

/**
 * IDでデータソース定義を取得する
 */
export function getDataSource(id: string): DataSourceDef | undefined {
  return DATA_SOURCES.find(ds => ds.id === id)
}

/**
 * 自治体名でフィルタリングして一覧を返す
 */
export function listDataSources(municipality?: string): DataSourceDef[] {
  if (!municipality) return DATA_SOURCES
  return DATA_SOURCES.filter(ds => ds.municipality === municipality)
}
