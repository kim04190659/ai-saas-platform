// =====================================================
//  src/app/api/yakushima/tourism/route.ts
//  屋久島町 観光管理 API — Sprint #59
//
//  NotionのDB「観光管理DB（屋久島町）」からデータを取得し、
//  スポット別・月次の入込状況・環境負荷・混雑度をまとめて返す。
//  ※ @notionhq/client は未導入のため raw fetch を使用
// =====================================================

import { NextResponse } from 'next/server'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ──────────────────────────────────────────

/** 1スポット1ヶ月分のデータ */
export interface TourismRecord {
  id:                string
  spotName:          string
  yearMonth:         string   // 'YYYY-MM'
  visitors:          number
  momChange:         number   // 前月比（小数: 1.18 = 18%増）
  congestion:        string   // 高混雑 / 中混雑 / 低混雑
  envLoad:           string   // 危険 / 注意 / 正常 / 良好
  guidedBookings:    number
  guideSufficiency:  number   // ガイド充足率（0.0〜1.0）
  notes:             string
}

/** API レスポンス全体 */
export interface TourismResponse {
  status:   'success' | 'error'
  message?: string
  records:  TourismRecord[]
  summary: {
    totalVisitors:  number   // 最新月の合計入込数
    highCongestion: number   // 高混雑スポット数
    envWarning:     number   // 環境負荷「危険」「注意」スポット数
    guideShortage:  number   // ガイド充足率90%未満のスポット数
  }
}

// ─── Notion プロパティ取得ヘルパー ──────────────────────

type NotionProps = Record<string, Record<string, unknown>>

const getTitle   = (p: NotionProps, k: string): string =>
  (p[k]?.title   as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''
const getNumber  = (p: NotionProps, k: string): number =>
  (p[k]?.number  as number) ?? 0
const getSelect  = (p: NotionProps, k: string): string =>
  (p[k]?.select  as {name:string})?.name ?? ''
const getRich    = (p: NotionProps, k: string): string =>
  (p[k]?.rich_text as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''
const getDate    = (p: NotionProps, k: string): string =>
  ((p[k]?.date   as {start:string})?.start ?? '').slice(0, 7)

// ─── データ取得 ───────────────────────────────────────

async function fetchTourismData(notionKey: string, dbId: string): Promise<TourismRecord[]> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    // 年月の新しい順に取得
    body: JSON.stringify({
      sorts: [{ property: '年月', direction: 'descending' }],
      page_size: 50,
    }),
  })

  if (!res.ok) {
    console.error(`[tourism API] Notion クエリ失敗: ${res.status}`)
    return []
  }

  const data = await res.json()
  const rows = (data.results ?? []) as Array<{ id: string; properties: NotionProps }>

  return rows.map(r => {
    const p = r.properties
    return {
      id:               r.id,
      spotName:         getTitle(p,  'スポット名'),
      yearMonth:        getDate(p,   '年月'),
      visitors:         getNumber(p, '入込客数'),
      momChange:        getNumber(p, '前月比'),
      congestion:       getSelect(p, '混雑度'),
      envLoad:          getSelect(p, '環境負荷レベル'),
      guidedBookings:   getNumber(p, 'ガイド予約数'),
      guideSufficiency: getNumber(p, 'ガイド充足率'),
      notes:            getRich(p,   '特記事項'),
    }
  })
}

// ─── サマリー計算 ─────────────────────────────────────

function calcSummary(records: TourismRecord[]): TourismResponse['summary'] {
  if (records.length === 0) {
    return { totalVisitors: 0, highCongestion: 0, envWarning: 0, guideShortage: 0 }
  }
  // 降順ソート済みなので先頭が最新月
  const latestMonth = records[0].yearMonth
  const lr = records.filter(r => r.yearMonth === latestMonth)

  return {
    totalVisitors:  lr.reduce((s, r) => s + r.visitors, 0),
    highCongestion: lr.filter(r => r.congestion === '高混雑').length,
    envWarning:     lr.filter(r => r.envLoad === '危険' || r.envLoad === '注意').length,
    guideShortage:  lr.filter(r => r.guidedBookings > 0 && r.guideSufficiency < 0.9).length,
  }
}

// ─── APIハンドラ ──────────────────────────────────────

export async function GET(): Promise<NextResponse<TourismResponse>> {
  try {
    const notionKey = process.env.NOTION_API_KEY ?? ''
    const dbConf    = getMunicipalityDbConfig('yakushima')

    if (!dbConf?.tourismDbId) {
      return NextResponse.json({
        status:  'error',
        message: '観光管理DB IDが設定されていません（municipality-db-config.ts を確認）',
        records: [],
        summary: { totalVisitors: 0, highCongestion: 0, envWarning: 0, guideShortage: 0 },
      }, { status: 500 })
    }

    const records = await fetchTourismData(notionKey, dbConf.tourismDbId)
    const summary = calcSummary(records)

    return NextResponse.json({ status: 'success', records, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[tourism API]', message)
    return NextResponse.json({
      status:  'error',
      message,
      records: [],
      summary: { totalVisitors: 0, highCongestion: 0, envWarning: 0, guideShortage: 0 },
    }, { status: 500 })
  }
}
