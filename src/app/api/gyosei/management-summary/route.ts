// =====================================================
//  src/app/api/gyosei/management-summary/route.ts
//  経営ダッシュボード 集約API — Sprint #56（/kirishima から昇格）
//
//  ■ GET  /api/gyosei/management-summary?municipalityId=kirishima
//    → 財政健全化・インフラ老朽化・PDCA進捗・住民WBの
//      4領域のKPIサマリーを並列取得してまとめて返す
//
//  ■ 変更点（kirishima版との違い）
//    MUNICIPALITY_ID をハードコードせず、
//    クエリパラメータから動的に取得する
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchFiscalIndicators }   from '@/lib/fiscal-health-engine'
import { fetchInfraFacilities }    from '@/lib/infrastructure-aging-engine'
import { fetchPolicies }           from '@/lib/yakushima-pdca-engine'
import { fetchResidents }          from '@/lib/yakushima-resident-coach-engine'
import { getMunicipalityById }     from '@/config/municipalities'

export async function GET(req: NextRequest) {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  // municipalityId を動的に受け取る（省略時は kirishima）
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'

  // 自治体マスタから表示名を取得
  const municipality = getMunicipalityById(municipalityId)
  const municipalName = municipality?.shortName ?? municipalityId

  try {
    // 4領域のデータを並列取得（Vercelタイムアウト対策）
    const [fiscalData, infraData, pdcaData, wbData] = await Promise.allSettled([
      fetchFiscalIndicators(notionKey, municipalityId),
      fetchInfraFacilities(notionKey, municipalityId),
      fetchPolicies(notionKey, municipalityId),
      fetchResidents(notionKey, municipalityId),
    ])

    // ─── 財政健全化 サマリー ─────────────────────────
    const fiscal = (() => {
      if (fiscalData.status !== 'fulfilled') return null
      const indicators = fiscalData.value
      const assessmentCount = {
        danger:    indicators.filter(i => i.assessment === '危険').length,
        caution:   indicators.filter(i => i.assessment === '警戒').length,
        watch:     indicators.filter(i => i.assessment === '注意').length,
        good:      indicators.filter(i => i.assessment === '良好').length,
        excellent: indicators.filter(i => i.assessment === '優良').length,
      }
      // 代表的な指標を取り出す
      const keiken   = indicators.find(i => i.name === '経常収支比率')
      const kosaishi = indicators.find(i => i.name === '実質公債費比率')
      const shoraiF  = indicators.find(i => i.name === '将来負担比率')
      const kichiku  = indicators.find(i => i.name === '財政調整基金残高')
      return {
        total: indicators.length,
        assessmentCount,
        criticalCount: assessmentCount.danger + assessmentCount.caution,
        keyMetrics: {
          keijo:    keiken   ? { value: keiken.value,   assessment: keiken.assessment }   : null,
          kosaishi: kosaishi ? { value: kosaishi.value, assessment: kosaishi.assessment } : null,
          shorai:   shoraiF  ? { value: shoraiF.value,  assessment: shoraiF.assessment }  : null,
          kichiku:  kichiku  ? { value: kichiku.value,  assessment: kichiku.assessment }  : null,
        },
      }
    })()

    // ─── インフラ老朽化 サマリー ─────────────────────
    const infra = (() => {
      if (infraData.status !== 'fulfilled') return null
      const facilities = infraData.value
      const urgentCount    = facilities.filter(f => f.urgency === '緊急修繕').length
      const plannedCount   = facilities.filter(f => f.urgency === '計画修繕').length
      const totalRepairCost = facilities.reduce((s, f) => s + f.repairCost, 0)
      // 健全度スコア平均
      const avgScore = facilities.length > 0
        ? Math.round(facilities.reduce((s, f) => s + f.score, 0) / facilities.length)
        : 0
      // 最も深刻な施設（上位3件）
      const criticalFacilities = [...facilities]
        .sort((a, b) => a.score - b.score)
        .slice(0, 3)
        .map(f => ({ name: f.name, type: f.type, score: f.score, urgency: f.urgency }))
      return {
        total: facilities.length,
        urgentCount,
        plannedCount,
        totalRepairCost, // 万円
        avgScore,
        criticalFacilities,
      }
    })()

    // ─── PDCA進捗 サマリー ───────────────────────────
    const pdca = (() => {
      if (pdcaData.status !== 'fulfilled') return null
      const policies = pdcaData.value
      const statusCount = {
        検討中: policies.filter(p => p.ステータス === '検討中').length,
        実施中: policies.filter(p => p.ステータス === '実施中').length,
        完了:   policies.filter(p => p.ステータス === '完了').length,
        却下:   policies.filter(p => p.ステータス === '却下').length,
      }
      // 完了率
      const doneRate = policies.length > 0
        ? Math.round((statusCount.完了 / policies.length) * 100)
        : 0
      // 緊急度「immediate」で実施中の施策
      const highPriorityActive = policies
        .filter(p => p.緊急度 === 'immediate' && p.ステータス === '実施中')
        .slice(0, 3)
        .map(p => p.施策名)
      return {
        total: policies.length,
        statusCount,
        doneRate,
        highPriorityActive,
      }
    })()

    // ─── 住民WBスコア サマリー ───────────────────────
    const wb = (() => {
      if (wbData.status !== 'fulfilled') return null
      const residents = wbData.value
      if (residents.length === 0) return { total: 0, avgScore: 0, lowScoreCount: 0, recentAlerts: [] }
      // WBスコア平均
      const avgScore = Math.round(
        residents.reduce((s, r) => s + (r.WBスコア ?? 5), 0) / residents.length * 10
      ) / 10
      // スコア3以下（要支援）の住民数
      const lowScoreCount = residents.filter(r => (r.WBスコア ?? 10) <= 3).length
      // 最近コーチングが必要な住民（スコア低い順・上位3件）
      const recentAlerts = [...residents]
        .sort((a, b) => (a.WBスコア ?? 10) - (b.WBスコア ?? 10))
        .slice(0, 3)
        .map(r => ({ name: r.住民名 ?? '—', score: r.WBスコア ?? 0 }))
      return {
        total: residents.length,
        avgScore,
        lowScoreCount,
        recentAlerts,
      }
    })()

    return NextResponse.json({
      status: 'success',
      municipalityId,
      municipal: municipalName,
      updatedAt: new Date().toISOString(),
      fiscal,
      infra,
      pdca,
      wb,
    })

  } catch (e) {
    console.error('[gyosei/management-summary GET] エラー:', e)
    return NextResponse.json({
      status: 'error',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
