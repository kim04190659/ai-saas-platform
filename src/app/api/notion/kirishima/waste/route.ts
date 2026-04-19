// =====================================================
//  src/app/api/notion/kirishima/waste/route.ts
//  霧島市 廃棄物管理データ取得 API
//
//  ■ エンドポイント
//    GET /api/notion/kirishima/waste
//
//  ■ レスポンス
//    { districts[], facilities[], routes[] }
//
//  ■ Notion DB ID（環境変数で上書き可能）
//    KIRISHIMA_WASTE_DISTRICT_DB_ID  — 地区別ごみ管理DB
//    KIRISHIMA_WASTE_FACILITY_DB_ID  — 焼却施設DB
//    KIRISHIMA_WASTE_ROUTE_DB_ID     — 収集ルートDB
// =====================================================

import { NextResponse } from 'next/server'

// ─── デフォルトDB ID（Notionで作成したDB） ──────────────
const DISTRICT_DB_ID = process.env.KIRISHIMA_WASTE_DISTRICT_DB_ID ?? '0bac5b57a15745a1bf8eaea27241e2e5'
const FACILITY_DB_ID = process.env.KIRISHIMA_WASTE_FACILITY_DB_ID ?? '1b7e2dbcebae43c1b26091af8de5f0de'
const ROUTE_DB_ID    = process.env.KIRISHIMA_WASTE_ROUTE_DB_ID    ?? '7b9d763f21154c5eb2e7f27f12abe984'

const NOTION_API  = 'https://api.notion.com/v1'
const NOTION_VER  = '2022-06-28'

// ─── Notion DBクエリ共通関数 ──────────────────────────

async function queryDB(dbId: string, notionKey: string): Promise<Record<string, unknown>[]> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method:  'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({ page_size: 100 }),
  })
  if (!res.ok) return []
  const data = await res.json()
  return (data.results ?? []) as Record<string, unknown>[]
}

// ─── プロパティ取得ヘルパー ───────────────────────────

function getTitle(props: Record<string, unknown>, key: string): string {
  const p = props[key] as { title?: Array<{ plain_text: string }> }
  return p?.title?.[0]?.plain_text ?? ''
}

function getNum(props: Record<string, unknown>, key: string): number | null {
  const p = props[key] as { number?: number }
  return p?.number ?? null
}

function getText(props: Record<string, unknown>, key: string): string {
  const p = props[key] as { rich_text?: Array<{ plain_text: string }> }
  return p?.rich_text?.[0]?.plain_text ?? ''
}

function getSelect(props: Record<string, unknown>, key: string): string {
  const p = props[key] as { select?: { name: string } }
  return p?.select?.name ?? ''
}

// ─── 型定義 ──────────────────────────────────────────

export interface DistrictWaste {
  id:            string
  name:          string
  pop2020:       number
  pop2025:       number
  pop2030:       number
  pop2035:       number
  wasteVolume:   number   // トン/年
  households:    number
  collectFreq:   number   // 週
  annualCost:    number   // 万円
  costPerHH:     number   // 円/世帯
  status:        string
  mergeCandidates: string
  note:          string
}

export interface Facility {
  id:            string
  name:          string
  location:      string
  capacity:      number   // トン/日
  age:           number   // 築年数
  annualVolume:  number   // トン/年
  utilization:   number   // %
  annualCost:    number   // 万円
  costPerTon:    number   // 円/トン
  nextRenovation: string
  status:        string
  note:          string
}

export interface CollectionRoute {
  id:            string
  name:          string
  district:      string
  households:    number
  distanceKm:    number
  weeksPerYear:  number
  annualCost:    number   // 万円
  costPerHH:     number   // 円
  efficiencyScore: number // 0〜100
  proposal:      string
  mergeTarget:   string
  note:          string
}

// ─── メインハンドラ ───────────────────────────────────

export async function GET() {
  const notionKey = process.env.NOTION_API_KEY ?? ''
  if (!notionKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY not set' }, { status: 500 })
  }

  // 3つのDBを並行取得
  const [districtRows, facilityRows, routeRows] = await Promise.all([
    queryDB(DISTRICT_DB_ID, notionKey),
    queryDB(FACILITY_DB_ID, notionKey),
    queryDB(ROUTE_DB_ID,    notionKey),
  ])

  // ── 地区データをマッピング ──
  const districts: DistrictWaste[] = districtRows.map(r => {
    const p = r.properties as Record<string, unknown>
    return {
      id:              r.id as string,
      name:            getTitle(p, '地区名'),
      pop2020:         getNum(p, '人口_2020')      ?? 0,
      pop2025:         getNum(p, '人口_2025推計')   ?? 0,
      pop2030:         getNum(p, '人口_2030推計')   ?? 0,
      pop2035:         getNum(p, '人口_2035推計')   ?? 0,
      wasteVolume:     getNum(p, 'ごみ排出量_トン_年') ?? 0,
      households:      getNum(p, '収集世帯数')       ?? 0,
      collectFreq:     getNum(p, '収集頻度_週')      ?? 0,
      annualCost:      getNum(p, '年間収集コスト_万円') ?? 0,
      costPerHH:       getNum(p, '1世帯あたりコスト_円') ?? 0,
      status:          getSelect(p, 'ステータス'),
      mergeCandidates: getText(p, '統合候補地区'),
      note:            getText(p, '備考'),
    }
  })

  // ── 焼却施設データをマッピング ──
  const facilities: Facility[] = facilityRows.map(r => {
    const p = r.properties as Record<string, unknown>
    return {
      id:              r.id as string,
      name:            getTitle(p, '施設名'),
      location:        getText(p,  '所在地区'),
      capacity:        getNum(p,   '処理能力_トン_日')    ?? 0,
      age:             getNum(p,   '築年数_年')            ?? 0,
      annualVolume:    getNum(p,   '年間処理量_トン')       ?? 0,
      utilization:     getNum(p,   '稼働率_%')              ?? 0,
      annualCost:      getNum(p,   '年間維持費_万円')       ?? 0,
      costPerTon:      getNum(p,   '1トンあたりコスト_円') ?? 0,
      nextRenovation:  getText(p,  '大規模改修時期'),
      status:          getSelect(p, '広域化対象'),
      note:            getText(p,  '備考'),
    }
  })

  // ── 収集ルートデータをマッピング ──
  const routes: CollectionRoute[] = routeRows.map(r => {
    const p = r.properties as Record<string, unknown>
    return {
      id:              r.id as string,
      name:            getTitle(p, 'ルート名'),
      district:        getText(p,  '担当地区'),
      households:      getNum(p,   '対象世帯数')            ?? 0,
      distanceKm:      getNum(p,   'ルート距離_km')          ?? 0,
      weeksPerYear:    getNum(p,   '週収集回数')              ?? 0,
      annualCost:      getNum(p,   '年間収集コスト_万円')    ?? 0,
      costPerHH:       getNum(p,   '1世帯あたりコスト_円')  ?? 0,
      efficiencyScore: getNum(p,   '効率スコア')              ?? 0,
      proposal:        getSelect(p, '最適化提案'),
      mergeTarget:     getText(p,  '統合先候補'),
      note:            getText(p,  '備考'),
    }
  })

  return NextResponse.json({ districts, facilities, routes })
}
