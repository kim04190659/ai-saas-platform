// =====================================================
//  src/types/api.ts
//  共通 API レスポンス型定義 — Sprint #42
//
//  ■ 用途
//    複数のパネル・ページで共通して使う型を集約。
//    個別ファイルでの interface の重複を防ぐ。
//
//  ■ 使い方
//    import type { NotionPage, DeptStat, SummaryResult } from '@/types/api'
// =====================================================

// ─── 汎用型 ──────────────────────────────────────────

/** Notion ページリンク（APIレスポンス共通） */
export interface NotionPage {
  id:  string
  url: string
}

/** API 共通レスポンスのベース */
export interface BaseApiResponse {
  status:   'success' | 'error'
  message?: string
}

// ─── WBサマリー関連 ───────────────────────────────────

/** 部門別 WellBeing 統計（週次WBサマリーAPIのレスポンス内） */
export interface DeptStat {
  deptId:       string
  deptName:     string
  emoji:        string
  avgWB:        number
  prevAvgWB:    number
  trend:        number
  count:        number
  riskCount:    number
  warningCount: number
}

/** 週次WBサマリーAPIのレスポンス */
export interface WBSummaryResult extends BaseApiResponse {
  weekLabel:         string
  municipalityName?: string
  summary?: {
    deptCount:  number
    totalStaff: number
    totalRisk:  number
    deptStats:  DeptStat[]
  }
  notionPage?: NotionPage
}

// ─── リスクスコアリング関連 ───────────────────────────

/** 離職リスクレベル */
export type RiskLevel = 'high' | 'mid' | 'low'

/** 職員離職リスク情報 */
export interface StaffRisk {
  staffName:     string
  department:    string
  deptId:        string
  deptEmoji:     string
  riskLevel:     RiskLevel
  latestWB:      number
  weeklyScores:  number[]
  trend:         number
  latestComment: string
  riskReason:    string
}

/** 部門別リスクサマリー */
export interface DeptRiskSummary {
  deptId:   string
  deptName: string
  emoji:    string
  total:    number
  highRisk: number
  midRisk:  number
  lowRisk:  number
  avgWB:    number
}

/** 離職リスクスコアリングAPIのレスポンス */
export interface RiskScoringResult extends BaseApiResponse {
  dateLabel: string
  summary?: {
    total:       number
    highRisk:    number
    midRisk:     number
    lowRisk:     number
    deptSummary: DeptRiskSummary[]
    staffRisks:  StaffRisk[]
  }
  notionPage?: NotionPage
}

// ─── 予兆検知関連 ─────────────────────────────────────

/** アラートの重要度レベル */
export type AlertLevel = 'critical' | 'warning' | 'info'

/** 予兆検知アラート 1 件 */
export interface AlertItem {
  level:       AlertLevel
  title:       string
  action?:     string
  score?:      number
  targetDept?: string
}

/** 予兆検知APIの共通レスポンス */
export interface PredictiveAlertResult extends BaseApiResponse {
  alertCount?: number
  alerts?:     AlertItem[]
  notionPage?: NotionPage
}

// ─── 住民サービス関連 ─────────────────────────────────

/** 住民サービスの稼働ステータス */
export type ServiceStatus = '稼働中' | '制限中' | '停止中'

/** サービス記録 1 件 */
export interface ServiceRecord {
  id:              string
  serviceName:     string
  deptId:          string
  municipalityName: string
  status:          ServiceStatus
  satisfaction:    number
  wellbeing:       number
  userCount:       number
  reportDate:      string
}

/** 住民サービスAPIのサマリー */
export interface ServiceSummary {
  totalCount:      number
  activeCount:     number
  avgSatisfaction: number
  avgWellbeing:    number
}
