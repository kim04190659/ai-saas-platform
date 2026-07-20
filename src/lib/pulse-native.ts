// =====================================================
//  src/lib/pulse-native.ts
//  Pulse-native型変換エンジン — 【結(YUI)】Signal/Pulse基盤
//
//  ■ このファイルの役割
//    GNH8領域のうち、「てつだって」の会話Signalを経由せず、
//    RunWith/Coarcが既に持っている行政・企業データを
//    そのままPulseとして扱う領域(Pulse-native型)を変換する。
//
//    対象(2026-07-20時点):
//      ⑥良い統治            ← fiscal-health(財政健全化データ)
//      ⑤文化多様性と回復力   ← migration-risk(移住定着リスクデータ)
//
//  ■ Signal→Pulse型との違い(重要)
//    Signal→Pulse型(personal-coarcの会話由来)は、母数が閾値未満の
//    カテゴリは件数を隠す「k-匿名性」の仕組みが必須だった。
//    Pulse-native型は、もともと自治体が持つ統計データであり、
//    個人が特定できる情報を含まないため、k-匿名性のチェックは行わない。
//
//  ■ 表示の物差しをそろえる
//    財政健全化は「優良/良好/注意/警戒/危険」の5段階、
//    移住定着リスクは「HIGH/MID/LOW」の3段階と、
//    領域ごとに評価の物差しがバラバラなため、
//    このファイルで「良好/要注意/危険/データなし」の4段階に統一する。
// =====================================================

import { fetchFiscalIndicators } from './fiscal-health-engine'
import { fetchMigrationRiskSummary } from '@/app/api/gyosei/migration-risk/route'

export type PulseLevel = '良好' | '要注意' | '危険' | 'データなし'

export interface PulseNativeDomain {
  /** GNH領域名(表示用) */
  domain: string
  /** データの出所(表示用。「◯◯由来」とバッジ表示するために使う) */
  source: string
  /** 4段階に正規化した評価 */
  level: PulseLevel
  /** 一言サマリー(職員向け画面にそのまま出す) */
  detail: string
  /** このデータをいつ取得したか */
  updatedAt: string
}

// ─── ⑥良い統治: 財政健全化データから算出 ───────────────

export async function getGoodGovernancePulse(
  notionKey: string,
  municipalityId: string,
): Promise<PulseNativeDomain> {
  const now = new Date().toISOString()

  const indicators = await fetchFiscalIndicators(notionKey, municipalityId)
  if (indicators.length === 0) {
    return {
      domain: '⑥良い統治',
      source: '財政健全化データ',
      level: 'データなし',
      detail: 'この自治体の財政指標データがまだ登録されていません',
      updatedAt: now,
    }
  }

  const danger  = indicators.filter(i => i.assessment === '危険').length
  const caution = indicators.filter(i => i.assessment === '警戒').length
  const watch   = indicators.filter(i => i.assessment === '注意').length

  // 1つでも「危険」があれば危険、「警戒」か「注意」があれば要注意、それ以外は良好
  let level: PulseLevel = '良好'
  if (danger > 0) level = '危険'
  else if (caution > 0 || watch > 0) level = '要注意'

  return {
    domain: '⑥良い統治',
    source: '財政健全化データ(fiscal-health)',
    level,
    detail: `危険${danger}件・警戒${caution}件・注意${watch}件(全${indicators.length}指標中)`,
    updatedAt: now,
  }
}

// ─── ⑤文化多様性と回復力: 移住定着リスクデータから算出 ──

export async function getCulturalResiliencePulse(
  notionKey: string,
  municipalityId: string,
): Promise<PulseNativeDomain> {
  const now = new Date().toISOString()

  const result = await fetchMigrationRiskSummary(notionKey, municipalityId)
  if (!result || result.summary.total === 0) {
    return {
      domain: '⑤文化多様性と回復力',
      source: '移住定着リスクデータ',
      level: 'データなし',
      detail: 'この自治体の移住相談データがまだ登録されていません',
      updatedAt: now,
    }
  }

  const { summary } = result
  // 定着リスク高が全体の3割を超えたら危険、1件でもいれば要注意、なければ良好
  let level: PulseLevel = '良好'
  const highRatio = summary.total > 0 ? summary.highRisk / summary.total : 0
  if (highRatio > 0.3) level = '危険'
  else if (summary.highRisk > 0) level = '要注意'

  return {
    domain: '⑤文化多様性と回復力',
    source: '移住定着リスクデータ(migration-risk)',
    level,
    detail: `定着リスク高${summary.highRisk}件・中${summary.midRisk}件(全${summary.total}件中、定住確定${summary.settled}件)`,
    updatedAt: now,
  }
}

// ─── まとめて取得(職員向け画面用) ───────────────────

export async function fetchAllPulseNativeDomains(
  notionKey: string,
  municipalityId: string,
): Promise<PulseNativeDomain[]> {
  const [governance, culture] = await Promise.all([
    getGoodGovernancePulse(notionKey, municipalityId),
    getCulturalResiliencePulse(notionKey, municipalityId),
  ])
  return [governance, culture]
}
