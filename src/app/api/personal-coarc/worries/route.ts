// =====================================================
//  src/app/api/personal-coarc/worries/route.ts
//  Personal Coarc 困りリスト API — Sprint #61
//
//  Notion「📋 Personal Coarc 困りマトリクス」DBから
//  生活環境タイプ・生活領域・AI解決策・実装状況を取得する。
//  （DB ID: eb45c6f6a15c4f409a3edc889d7584aa）
//
//  ※ @notionhq/client は未導入のため raw fetch を使用
// =====================================================

import { NextResponse } from 'next/server'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// Personal Coarc 困りマトリクスDBのID
const PERSONAL_COARC_DB_ID = 'eb45c6f6a15c4f409a3edc889d7584aa'

// ─── 型定義 ──────────────────────────────────────────

type NProps = Record<string, Record<string, unknown>>

const nTitle  = (p: NProps, k: string): string =>
  (p[k]?.title    as Array<{ plain_text: string }>)?.[0]?.plain_text ?? ''
const nSelect = (p: NProps, k: string): string =>
  (p[k]?.select   as { name: string })?.name ?? ''
const nRich   = (p: NProps, k: string): string =>
  (p[k]?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text ?? ''

/** 1困り分のレコード */
export interface WorryRecord {
  id:           string
  title:        string   // 困りタイトル
  lifeType:     string   // 生活環境タイプ（例: 👫 共働き子育て）
  domain:       string   // 生活領域（例: 🏠 家事・生活）
  detail:       string   // 困りの詳細
  rootCause:    string   // 根本原因
  aiSolution:   string   // AIによる解決策
  requiredData: string   // 必要なデータ
  dataMethod:   string   // データ収集方法
  priority:     string   // 優先度（高/中/低）
  status:       string   // 実装状況（✅ 実装済み 等）
  evidence:     string   // 調査根拠
}

/** API レスポンス全体 */
export interface WorriesResponse {
  status:   'success' | 'error'
  message?: string
  records:  WorryRecord[]
  summary: {
    total:        number   // 全件数
    implemented:  number   // ✅ 実装済み
    inProgress:   number   // 🔧 実装中
    planned:      number   // 📋 計画中
    idea:         number   // 💡 アイデア
    highPriority: number   // 優先度「高」の件数
  }
}

// ─── データ取得 ───────────────────────────────────────

async function fetchWorries(notionKey: string): Promise<WorryRecord[]> {
  const res = await fetch(`${NOTION_API}/databases/${PERSONAL_COARC_DB_ID}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    // 優先度の高い順に並べて取得
    body: JSON.stringify({ page_size: 50 }),
  })

  if (!res.ok) {
    console.error(`[personal-coarc/worries] Notion クエリ失敗: ${res.status}`)
    return []
  }

  const data = await res.json()
  const rows = (data.results ?? []) as Array<{ id: string; properties: NProps }>

  return rows.map(r => {
    const p = r.properties
    return {
      id:           r.id,
      title:        nTitle(p,  '困りタイトル'),
      lifeType:     nSelect(p, '生活環境タイプ'),
      domain:       nSelect(p, '生活領域'),
      detail:       nRich(p,   '困りの詳細'),
      rootCause:    nRich(p,   '根本原因'),
      aiSolution:   nRich(p,   'AIによる解決策'),
      requiredData: nRich(p,   '必要なデータ'),
      dataMethod:   nSelect(p, 'データ収集方法'),
      priority:     nSelect(p, '優先度'),
      status:       nSelect(p, '実装状況'),
      evidence:     nRich(p,   '調査根拠'),
    }
  })
}

// ─── サマリー計算 ─────────────────────────────────────

function calcSummary(records: WorryRecord[]): WorriesResponse['summary'] {
  return {
    total:        records.length,
    implemented:  records.filter(r => r.status === '✅ 実装済み').length,
    inProgress:   records.filter(r => r.status === '🔧 実装中').length,
    planned:      records.filter(r => r.status === '📋 計画中').length,
    idea:         records.filter(r => r.status === '💡 アイデア').length,
    highPriority: records.filter(r => r.priority === '高').length,
  }
}

// ─── APIハンドラ ──────────────────────────────────────

export async function GET(): Promise<NextResponse<WorriesResponse>> {
  try {
    const notionKey = process.env.NOTION_API_KEY ?? ''
    const records   = await fetchWorries(notionKey)
    const summary   = calcSummary(records)

    return NextResponse.json({ status: 'success', records, summary })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[personal-coarc/worries API]', message)
    return NextResponse.json({
      status:  'error',
      message,
      records: [],
      summary: { total: 0, implemented: 0, inProgress: 0, planned: 0, idea: 0, highPriority: 0 },
    }, { status: 500 })
  }
}
