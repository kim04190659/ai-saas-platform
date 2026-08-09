// =====================================================
//  src/app/api/partners/route.ts
//  パートナー役割分担 API ルート — Sprint #91
//
//  ■ このファイルの役割
//    - GET  : ExternalPartner DB から地域外パートナー（離島経済新聞社など）の
//             役割分担・合意状況一覧を取得する
//    - POST : 管理者画面の登録フォームから新しいパートナーを
//             ExternalPartner DB に記録する
//    - PATCH: 既存パートナーの合意ステータス・合意日を更新する
//             （鯨本さんとの役割分担合意が成立した際に「完了」へ更新する用途）
//
//  ■ 背景（合意形成レイヤー構想）
//    RunWithに新規機能「合意形成レイヤー」を追加するにあたり、
//    離島経済新聞社（鯨本さん）のような地域外パートナーが
//    「何を担い」「何を求めているか」「役割分担にいつ合意したか」を
//    属人的な記憶ではなくRunWith管理者画面上に残すための機能。
//
//  ■ 使用 Notion DB
//    ExternalPartner DB: c84df6ce41bb4ccfb54ba379954252ba
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// ─── 定数 ─────────────────────────────────────────────
const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const PARTNER_DB_ID   = 'c84df6ce41bb4ccfb54ba379954252ba'

// ─── 型定義 ──────────────────────────────────────────

/** パートナー1件の型（APIレスポンス） */
interface PartnerRecord {
  id:              string
  name:            string
  roleAreas:       string[]
  agreementStatus: string   // '未着手' | '進行中' | '完了'
  agreementDate:   string
  offers:          string
  seeks:           string
  matchedIssues:   string
  municipalityIds: string
  notes:           string
}

/** POST リクエストの型（登録フォームから受け取るデータ） */
interface PartnerInput {
  name:            string   // パートナー名（タイトル、必須）
  roleAreas:       string[] // 担当領域（複数選択）
  agreementStatus: string   // 合意ステータス
  agreementDate:   string   // 合意日（YYYY-MM-DD、空欄可）
  offers:          string   // 提供できるもの
  seeks:           string   // 求めるもの
  matchedIssues:   string   // 関連Issue
  municipalityIds: string   // 対象municipality_id（複数はカンマ区切り、空欄は地域外主体）
  notes:           string   // 備考
}

// 担当領域の選択肢（ExternalPartner DBのmulti_selectと揃える）
export const ROLE_AREAS = [
  '信頼構築・出会い', '情報発信', '島間ネットワーク',
  '対面ファシリテーション', '定性的文脈理解', 'データマッチング',
]

// 合意ステータスの選択肢（ExternalPartner DBのstatusと揃える）
export const AGREEMENT_STATUSES = ['未着手', '進行中', '完了']

// ─── ヘルパー関数 ─────────────────────────────────────

/** Notion API 共通ヘッダーを生成 */
function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ハンドラ ─────────────────────────────────────
// パートナー一覧を取得

export async function GET() {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${PARTNER_DB_ID}/query`, {
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
    const records: PartnerRecord[] = data.results?.map((r: any) => {
      const p = r.properties
      return {
        id:              r.id,
        name:            p['パートナー名']?.title?.[0]?.plain_text                ?? '（名称未設定）',
        roleAreas:       (p['担当領域']?.multi_select ?? []).map((o: { name: string }) => o.name),
        agreementStatus: p['合意ステータス']?.status?.name                        ?? '未着手',
        agreementDate:   p['合意日']?.date?.start                                 ?? '',
        offers:          p['提供できるもの(offers)']?.rich_text?.[0]?.plain_text  ?? '',
        seeks:           p['求めるもの(seeks)']?.rich_text?.[0]?.plain_text       ?? '',
        matchedIssues:   p['関連Issue(matched_issues)']?.rich_text?.[0]?.plain_text ?? '',
        municipalityIds: p['対象municipality_id']?.rich_text?.[0]?.plain_text     ?? '',
        notes:           p['備考']?.rich_text?.[0]?.plain_text                    ?? '',
      }
    }) ?? []

    // ── サマリー集計 ──
    const total = records.length
    const byStatus: Record<string, number> = {}
    records.forEach(r => { byStatus[r.agreementStatus] = (byStatus[r.agreementStatus] ?? 0) + 1 })
    const unresolvedCount = records.filter(r => r.agreementStatus !== '完了').length

    return NextResponse.json({
      records,
      summary: { total, byStatus, unresolvedCount },
    })
  } catch (err) {
    console.error('Partners GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── POST ハンドラ ─────────────────────────────────────
// 新しいパートナーを ExternalPartner DB に記録する

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: PartnerInput = await req.json()

    // ── 入力バリデーション ──
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'パートナー名を入力してください' }, { status: 400 })
    }

    // ── Notion properties を構築 ──
    const properties: Record<string, unknown> = {
      // タイトル型
      'パートナー名': { title: [{ text: { content: body.name.trim() } }] },
      // ステータス型（合意ステータスが未指定の場合は「未着手」）
      '合意ステータス': { status: { name: body.agreementStatus || '未着手' } },
    }

    // multi_select 型
    if (body.roleAreas?.length) {
      properties['担当領域'] = { multi_select: body.roleAreas.map(name => ({ name })) }
    }

    // 日付型（未入力ならセットしない）
    if (body.agreementDate) {
      properties['合意日'] = { date: { start: body.agreementDate } }
    }

    // テキスト型
    if (body.offers?.trim()) {
      properties['提供できるもの(offers)'] = { rich_text: [{ text: { content: body.offers.trim() } }] }
    }
    if (body.seeks?.trim()) {
      properties['求めるもの(seeks)'] = { rich_text: [{ text: { content: body.seeks.trim() } }] }
    }
    if (body.matchedIssues?.trim()) {
      properties['関連Issue(matched_issues)'] = { rich_text: [{ text: { content: body.matchedIssues.trim() } }] }
    }
    if (body.municipalityIds?.trim()) {
      properties['対象municipality_id'] = { rich_text: [{ text: { content: body.municipalityIds.trim() } }] }
    }
    if (body.notes?.trim()) {
      properties['備考'] = { rich_text: [{ text: { content: body.notes.trim() } }] }
    }

    // ── Notion にページ（レコード）を作成 ──
    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({
        parent:     { database_id: PARTNER_DB_ID },
        properties,
      }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `パートナー「${body.name.trim()}」を登録しました`,
    })
  } catch (err) {
    console.error('Partners POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── PATCH ハンドラ ────────────────────────────────────
// 既存パートナーの合意ステータス・合意日を更新する
// （鯨本さんとの役割分担合意が成立した際に「完了」へ更新する用途を想定）

export async function PATCH(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: { pageId: string; agreementStatus: string; agreementDate?: string } = await req.json()

    if (!body.pageId) {
      return NextResponse.json({ error: 'pageId が指定されていません' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      '合意ステータス': { status: { name: body.agreementStatus } },
    }
    if (body.agreementDate) {
      properties['合意日'] = { date: { start: body.agreementDate } }
    }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages/${body.pageId}`, {
      method:  'PATCH',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({ properties }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion更新エラー: ${errText}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: '合意ステータスを更新しました' })
  } catch (err) {
    console.error('Partners PATCH エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
