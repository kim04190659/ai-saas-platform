// =====================================================
//  src/app/api/gyosei/management-summary/route.ts
//  経営ダッシュボード 集約API — Sprint #56（/kirishima から昇格）
//                               Sprint #59 屋久島向けKPI追加
//
//  ■ GET  /api/gyosei/management-summary?municipalityId=kirishima
//    → 財政健全化・インフラ老朽化・PDCA進捗・住民WBの
//      4領域のKPIサマリーを並列取得してまとめて返す
//
//  ■ Sprint #59 追加（屋久島のみ）
//    municipalityId=yakushima の場合に
//    観光管理KPI・移住支援KPIを追加返却する
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchFiscalIndicators }   from '@/lib/fiscal-health-engine'
import { fetchInfraFacilities }    from '@/lib/infrastructure-aging-engine'
import { fetchPolicies }           from '@/lib/yakushima-pdca-engine'
import { fetchResidents }          from '@/lib/yakushima-resident-coach-engine'
import { getMunicipalityById }     from '@/config/municipalities'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 共通型・ヘルパー ─────────────────────────────────

type NProps = Record<string, Record<string, unknown>>
const nSelect = (p: NProps, k: string) => (p[k]?.select as {name:string})?.name ?? ''
const nNumber = (p: NProps, k: string) => (p[k]?.number as number) ?? 0
const nDate   = (p: NProps, k: string) => ((p[k]?.date as {start:string})?.start ?? '').slice(0, 7)

// ─── 屋久島向け観光KPI取得 ───────────────────────────

interface TourismKpi {
  totalVisitors:  number
  highCongestion: number
  envWarning:     number
  guideShortage:  number
}

async function fetchTourismKpi(notionKey: string): Promise<TourismKpi | null> {
  const dbConf = getMunicipalityDbConfig('yakushima')
  if (!dbConf?.tourismDbId) return null

  const res = await fetch(`${NOTION_API}/databases/${dbConf.tourismDbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({ sorts: [{ property: '年月', direction: 'descending' }], page_size: 30 }),
  })
  if (!res.ok) return null

  const data    = await res.json()
  const rows    = (data.results ?? []) as Array<{ properties: NProps }>
  if (rows.length === 0) return null

  // 最新月のみ集計
  const latestMonth = nDate(rows[0].properties, '年月')
  const lr          = rows.filter(r => nDate(r.properties, '年月') === latestMonth)

  return {
    totalVisitors:  lr.reduce((s, r) => s + nNumber(r.properties, '入込客数'), 0),
    highCongestion: lr.filter(r => nSelect(r.properties, '混雑度') === '高混雑').length,
    envWarning:     lr.filter(r => ['危険', '注意'].includes(nSelect(r.properties, '環境負荷レベル'))).length,
    guideShortage:  lr.filter(r => nNumber(r.properties, 'ガイド予約数') > 0 && nNumber(r.properties, 'ガイド充足率') < 0.9).length,
  }
}

// ─── 屋久島向け移住KPI取得 ───────────────────────────

interface MigrationKpi {
  total:          number
  settled:        number
  inProgress:     number
  dropped:        number
  subsidyGranted: number
}

async function fetchMigrationKpi(notionKey: string): Promise<MigrationKpi | null> {
  const dbConf = getMunicipalityDbConfig('yakushima')
  if (!dbConf?.migrationDbId) return null

  const res = await fetch(`${NOTION_API}/databases/${dbConf.migrationDbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({ page_size: 50 }),
  })
  if (!res.ok) return null

  const data  = await res.json()
  const rows  = (data.results ?? []) as Array<{ properties: NProps }>

  return {
    total:          rows.length,
    settled:        rows.filter(r => ['移住済み', '定住確定'].includes(nSelect(r.properties, '進捗ステータス'))).length,
    inProgress:     rows.filter(r => ['相談中', '見学予定', '移住準備中'].includes(nSelect(r.properties, '進捗ステータス'))).length,
    dropped:        rows.filter(r => nSelect(r.properties, '進捗ステータス') === '断念').length,
    subsidyGranted: rows.filter(r => nSelect(r.properties, '定住補助金申請') === '支給決定').length,
  }
}

export async function GET(req: NextRequest) {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  // municipalityId を動的に受け取る（省略時は kirishima）
  const municipalityId = searchParams.get('municipalityId') ?? 'kirishima'

  // 自治体マスタから表示名を取得
  const municipality = getMunicipalityById(municipalityId)
  const municipalName = municipality?.shortName ?? municipalityId

  // 屋久島町かどうかのフラグ（観光・移住KPIを追加取得するため）
  const isYakushima = municipalityId === 'yakushima'

  try {
    // 基本4領域 + 屋久島固有2領域を並列取得（Vercelタイムアウト対策）
    const [fiscalData, infraData, pdcaData, wbData, tourismData, migrationData] = await Promise.allSettled([
      fetchFiscalIndicators(notionKey, municipalityId),
      fetchInfraFacilities(notionKey, municipalityId),
      fetchPolicies(notionKey, municipalityId),
      fetchResidents(notionKey, municipalityId),
      isYakushima ? fetchTourismKpi(notionKey) : Promise.resolve(null),
      isYakushima ? fetchMigrationKpi(notionKey) : Promise.resolve(null),
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

    // ─── 観光KPI（屋久島のみ）────────────────────────
    const tourism = (() => {
      if (!isYakushima || tourismData.status !== 'fulfilled') return null
      return tourismData.value
    })()

    // ─── 移住KPI（屋久島のみ）────────────────────────
    const migration = (() => {
      if (!isYakushima || migrationData.status !== 'fulfilled') return null
      return migrationData.value
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
      // 屋久島固有KPI（他自治体では null が返る）
      tourism,
      migration,
    })

  } catch (e) {
    console.error('[gyosei/management-summary GET] エラー:', e)
    return NextResponse.json({
      status: 'error',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
