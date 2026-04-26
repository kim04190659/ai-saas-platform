// =====================================================
//  src/app/api/yakushima/migration-support/route.ts
//  屋久島町 移住支援 API — Sprint #59
//
//  NotionのDB「移住相談DB（屋久島町）」からデータを取得し、
//  進捗ステータス別・移住動機別の相談状況サマリーを返す。
//  ※ @notionhq/client は未導入のため raw fetch を使用
// =====================================================

import { NextResponse } from 'next/server'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ──────────────────────────────────────────

/** 移住相談1件分のデータ */
export interface MigrationRecord {
  id:            string
  name:          string   // 相談者名（仮名）
  consultDate:   string   // 相談日 'YYYY-MM-DD'
  origin:        string   // 出身地
  ageGroup:      string
  householdType: string
  motivation:    string   // 移住動機
  status:        string   // 進捗ステータス
  occupation:    string   // 就農・就業状況
  subsidyStatus: string   // 定住補助金申請
  staffName:     string   // 担当職員
  notes:         string
}

/** API レスポンス全体 */
export interface MigrationResponse {
  status:   'success' | 'error'
  message?: string
  records:  MigrationRecord[]
  summary: {
    total:          number   // 相談総数
    settled:        number   // 移住済み + 定住確定
    inProgress:     number   // 相談中 + 見学予定 + 移住準備中
    dropped:        number   // 断念
    subsidyGranted: number   // 補助金支給決定数
  }
}

// ─── Notion プロパティ取得ヘルパー ──────────────────────

type NotionProps = Record<string, Record<string, unknown>>

const getTitle  = (p: NotionProps, k: string): string =>
  (p[k]?.title   as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''
const getSelect = (p: NotionProps, k: string): string =>
  (p[k]?.select  as {name:string})?.name ?? ''
const getDate   = (p: NotionProps, k: string): string =>
  (p[k]?.date    as {start:string})?.start ?? ''
const getRich   = (p: NotionProps, k: string): string =>
  (p[k]?.rich_text as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''

// ─── データ取得 ───────────────────────────────────────

async function fetchMigrationData(notionKey: string, dbId: string): Promise<MigrationRecord[]> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    // 相談日の新しい順に取得
    body: JSON.stringify({
      sorts: [{ property: '相談日', direction: 'descending' }],
      page_size: 50,
    }),
  })

  if (!res.ok) {
    console.error(`[migration API] Notion クエリ失敗: ${res.status}`)
    return []
  }

  const data = await res.json()
  const rows = (data.results ?? []) as Array<{ id: string; properties: NotionProps }>

  return rows.map(r => {
    const p = r.properties
    return {
      id:            r.id,
      name:          getTitle(p,  '相談者名'),
      consultDate:   getDate(p,   '相談日'),
      origin:        getRich(p,   '出身地'),
      ageGroup:      getSelect(p, '年代'),
      householdType: getSelect(p, '世帯構成'),
      motivation:    getSelect(p, '移住動機'),
      status:        getSelect(p, '進捗ステータス'),
      occupation:    getSelect(p, '就農・就業状況'),
      subsidyStatus: getSelect(p, '定住補助金申請'),
      staffName:     getRich(p,   '担当職員'),
      notes:         getRich(p,   '備考'),
    }
  })
}

// ─── サマリー計算 ─────────────────────────────────────

function calcSummary(records: MigrationRecord[]): MigrationResponse['summary'] {
  return {
    total:          records.length,
    settled:        records.filter(r => ['移住済み', '定住確定'].includes(r.status)).length,
    inProgress:     records.filter(r => ['相談中', '見学予定', '移住準備中'].includes(r.status)).length,
    dropped:        records.filter(r => r.status === '断念').length,
    subsidyGranted: records.filter(r => r.subsidyStatus === '支給決定').length,
  }
}

// ─── APIハンドラ ──────────────────────────────────────

export async function GET(): Promise<NextResponse<MigrationResponse>> {
  try {
    const notionKey = process.env.NOTION_API_KEY ?? ''
    const dbConf    = getMunicipalityDbConfig('yakushima')

    if (!dbConf?.migrationDbId) {
      return NextResponse.json({
        status:  'error',
        message: '移住相談DB IDが設定されていません（municipality-db-config.ts を確認）',
        records: [],
        summary: { total: 0, settled: 0, inProgress: 0, dropped: 0, subsidyGranted: 0 },
      }, { status: 500 })
    }

    const records = await fetchMigrationData(notionKey, dbConf.migrationDbId)
    const summary = calcSummary(records)

    return NextResponse.json({ status: 'success', records, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[migration-support API]', message)
    return NextResponse.json({
      status:  'error',
      message,
      records: [],
      summary: { total: 0, settled: 0, inProgress: 0, dropped: 0, subsidyGranted: 0 },
    }, { status: 500 })
  }
}
