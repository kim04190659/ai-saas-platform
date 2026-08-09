// =====================================================
//  src/app/api/stakeholders/route.ts
//  ステークホルダー API ルート — Sprint #94
//
//  ■ このファイルの役割
//    - GET : Stakeholder DB から登録済みステークホルダー一覧を取得する
//            （REQ-01 ステークホルダーマップの表示元データ）
//    - POST: 新しいステークホルダーを Stakeholder DB に登録する
//
//  ■ プライバシーへの配慮
//    「匿名希望」がオンの人は、名前をそのまま画面に出さない。
//    GET のレスポンスでは、匿名希望の人の名前を「匿名希望の方」に
//    差し替えてから返す（Notion上の実名はそのまま保持する）。
//
//  ■ 使用 Notion DB
//    Stakeholder DB: 6f452e104900477c9cabd3a02ca7c3bf
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE   = 'https://api.notion.com/v1'
const NOTION_VERSION    = '2022-06-28'
const STAKEHOLDER_DB_ID = '6f452e104900477c9cabd3a02ca7c3bf'

interface StakeholderRecord {
  id:              string
  name:            string   // 匿名希望の場合は表示用にマスクされる
  type:            string   // '個人' | '団体'
  affiliation:     string
  role:            string   // '住民' | '事業者' | '職員' | '外部パートナー' | 'その他'
  isAnonymous:     boolean
  municipalityIds: string
  notes:           string
}

interface StakeholderInput {
  name:            string
  type:            string
  affiliation:     string
  role:            string
  isAnonymous:     boolean
  municipalityIds: string
  notes:           string
}

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ハンドラ ─────────────────────────────────────

export async function GET() {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${STAKEHOLDER_DB_ID}/query`, {
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
    const records: StakeholderRecord[] = data.results?.map((r: any) => {
      const p = r.properties
      const isAnonymous = p['匿名希望']?.checkbox ?? false
      const rawName     = p['名前']?.title?.[0]?.plain_text ?? '（名称未設定）'
      return {
        id:              r.id,
        // 匿名希望の人は一覧上で実名を出さない
        name:            isAnonymous ? '匿名希望の方' : rawName,
        type:            p['種別']?.select?.name ?? '',
        affiliation:     p['所属組織']?.rich_text?.[0]?.plain_text ?? '',
        role:            p['役割']?.select?.name ?? '',
        isAnonymous,
        municipalityIds: p['対象municipality_id']?.rich_text?.[0]?.plain_text ?? '',
        notes:           p['備考']?.rich_text?.[0]?.plain_text ?? '',
      }
    }) ?? []

    // ── 役割ごとの件数（ステークホルダーマップのグルーピング用） ──
    const byRole: Record<string, number> = {}
    records.forEach(r => { if (r.role) byRole[r.role] = (byRole[r.role] ?? 0) + 1 })

    return NextResponse.json({
      records,
      summary: { total: records.length, byRole },
    })
  } catch (err) {
    console.error('Stakeholders GET エラー:', err)
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
    const body: StakeholderInput = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: '名前を入力してください' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      '名前':     { title: [{ text: { content: body.name.trim() } }] },
      '匿名希望': { checkbox: !!body.isAnonymous },
    }
    if (body.type) properties['種別'] = { select: { name: body.type } }
    if (body.role) properties['役割'] = { select: { name: body.role } }
    if (body.affiliation?.trim()) {
      properties['所属組織'] = { rich_text: [{ text: { content: body.affiliation.trim() } }] }
    }
    if (body.municipalityIds?.trim()) {
      properties['対象municipality_id'] = { rich_text: [{ text: { content: body.municipalityIds.trim() } }] }
    }
    if (body.notes?.trim()) {
      properties['備考'] = { rich_text: [{ text: { content: body.notes.trim() } }] }
    }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({ parent: { database_id: STAKEHOLDER_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    const created = await notionRes.json()

    return NextResponse.json({
      success: true,
      id:      created.id,
      message: `ステークホルダー「${body.name.trim()}」を登録しました`,
    })
  } catch (err) {
    console.error('Stakeholders POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
