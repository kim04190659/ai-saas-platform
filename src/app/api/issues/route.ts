// =====================================================
//  src/app/api/issues/route.ts
//  論点（Issue）API ルート — Sprint #94
//
//  ■ このファイルの役割
//    - GET : Issue DB から論点一覧を取得し、それぞれの論点について
//            PositionRecord DB を集計して「賛成/反対/保留」の内訳を返す
//            （REQ-02 論点タイムラインの表示元データ）
//    - POST: 新しい論点を Issue DB に登録する
//
//  ■ k匿名性のルール（Sprint #93 設計書に準拠）
//    https://app.notion.com/p/3b7960a91e238115b886f90817505ff1
//    論点ごとの立場内訳は、母数（PositionRecordの件数）が
//    20件に満たない場合は非公開とし、件数のみを返す。
//    生のPositionRecord（誰がどう答えたか）を返すエンドポイントは
//    このAPIには存在しない（意図的に作らない）。
//
//  ■ 使用 Notion DB
//    Issue DB          : 2e40917a105042efa2f0df2ee700df2f
//    PositionRecord DB : 22e32647e8c249df9a3b1a66e04f4d4c
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE     = 'https://api.notion.com/v1'
const NOTION_VERSION      = '2022-06-28'
const ISSUE_DB_ID         = '2e40917a105042efa2f0df2ee700df2f'
const POSITION_RECORD_DB_ID = '22e32647e8c249df9a3b1a66e04f4d4c'

// k匿名性の閾値（Sprint #93設計書 第3章）。この件数未満は内訳を非公開にする。
const K_ANONYMITY_THRESHOLD = 20

interface AggregateResult {
  total:      number
  suppressed: boolean          // true の場合、byStance は非公開
  byStance:   Record<string, number> | null
}

interface IssueRecord {
  id:              string
  title:           string
  domain:          string
  status:          string
  level:           string   // '市町村' | '県' | '地域全体'
  municipalityIds: string
  relatedProject:  string
  notes:           string
  aggregate:       AggregateResult
}

interface IssueInput {
  title:           string
  domain:          string
  status:          string
  level:           string
  municipalityIds: string
  relatedProject:  string
  notes:           string
}

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

/** 指定した論点(issuePageId)に対するPositionRecordを集計する */
async function aggregatePositions(apiKey: string, issuePageId: string): Promise<AggregateResult> {
  const res = await fetch(`${NOTION_API_BASE}/databases/${POSITION_RECORD_DB_ID}/query`, {
    method:  'POST',
    headers: notionHeaders(apiKey),
    body:    JSON.stringify({
      filter:    { property: '論点', relation: { contains: issuePageId } },
      page_size: 100,
    }),
  })

  if (!res.ok) {
    // 集計に失敗しても論点一覧自体は返したいので、0件扱いにする
    return { total: 0, suppressed: true, byStance: null }
  }

  const data = await res.json()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = data.results ?? []
  const total = results.length

  if (total < K_ANONYMITY_THRESHOLD) {
    return { total, suppressed: true, byStance: null }
  }

  const byStance: Record<string, number> = {}
  results.forEach(r => {
    const stance = r.properties?.['立場']?.select?.name
    if (stance) byStance[stance] = (byStance[stance] ?? 0) + 1
  })

  return { total, suppressed: false, byStance }
}

// ─── GET ハンドラ ─────────────────────────────────────

export async function GET() {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${ISSUE_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({
        page_size: 100,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${errText}` }, { status: 500 })
    }

    const data = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawIssues: any[] = data.results ?? []

    // 論点ごとにPositionRecordを集計（件数が多くない前提のSprint#94 MVP実装）
    const records: IssueRecord[] = await Promise.all(rawIssues.map(async r => {
      const p = r.properties
      const aggregate = await aggregatePositions(notionApiKey, r.id)
      return {
        id:              r.id,
        title:           p['論点タイトル']?.title?.[0]?.plain_text ?? '（タイトル未設定）',
        domain:          p['ドメイン']?.select?.name ?? '',
        status:          p['ステータス']?.select?.name ?? '提起',
        level:           p['対象レベル']?.select?.name ?? '',
        municipalityIds: p['対象municipality_id']?.rich_text?.[0]?.plain_text ?? '',
        relatedProject:  p['関連プロジェクト']?.rich_text?.[0]?.plain_text ?? '',
        notes:           p['備考']?.rich_text?.[0]?.plain_text ?? '',
        aggregate,
      }
    }))

    // ── ステータス内訳（サマリーカード用） ──
    const byStatus: Record<string, number> = {}
    records.forEach(r => { byStatus[r.status] = (byStatus[r.status] ?? 0) + 1 })

    return NextResponse.json({
      records,
      summary: { total: records.length, byStatus },
    })
  } catch (err) {
    console.error('Issues GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── POST ハンドラ ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: IssueInput = await req.json()

    if (!body.title?.trim()) {
      return NextResponse.json({ error: '論点タイトルを入力してください' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      '論点タイトル': { title: [{ text: { content: body.title.trim() } }] },
      'ステータス':   { select: { name: body.status || '提起' } },
    }
    if (body.domain) properties['ドメイン']   = { select: { name: body.domain } }
    if (body.level)  properties['対象レベル'] = { select: { name: body.level } }
    if (body.municipalityIds?.trim()) {
      properties['対象municipality_id'] = { rich_text: [{ text: { content: body.municipalityIds.trim() } }] }
    }
    if (body.relatedProject?.trim()) {
      properties['関連プロジェクト'] = { rich_text: [{ text: { content: body.relatedProject.trim() } }] }
    }
    if (body.notes?.trim()) {
      properties['備考'] = { rich_text: [{ text: { content: body.notes.trim() } }] }
    }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({ parent: { database_id: ISSUE_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    const created = await notionRes.json()

    return NextResponse.json({
      success: true,
      id:      created.id,
      message: `論点「${body.title.trim()}」を登録しました`,
    })
  } catch (err) {
    console.error('Issues POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
