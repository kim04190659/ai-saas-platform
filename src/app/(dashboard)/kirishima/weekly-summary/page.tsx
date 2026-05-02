/**
 * /kirishima/weekly-summary — 霧島市専用 週次WBサマリー
 *
 * Sprint #87 追加：
 *   /gyosei/weekly-summary?municipalityId=kirishima へ遷移すると
 *   Kirishimaレイアウトの外に出てしまうため、/kirishima/* 配下にラッパーページを新設。
 *   WeeklyWBSummaryPanel は MunicipalityContext から自治体を取得するため、
 *   MunicipalitySearchParamsSync が kirishima を設定済みであれば正しく動作する。
 */

import { WeeklyWBSummaryPanel } from '@/components/dept/WeeklyWBSummaryPanel'

export default function KirishimaWeeklySummaryPage() {
  return <WeeklyWBSummaryPanel />
}
