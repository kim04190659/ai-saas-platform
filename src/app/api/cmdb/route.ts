// =====================================================
//  src/app/api/cmdb/route.ts
//  CMDB（IT資産管理）API ルート — Sprint #20
//
//  ■ このファイルの役割
//    - GET : CMDB DB からIT資産一覧を取得。稼働状態・資産種別・
//            担当部署でフィルタ可能。サマリー集計付き
//    - POST: 新しいIT資産を CMDB DB に登録する
//
//  ■ 使用 Notion DB
//    CMDB（IT資産管理）DB: e9b083f7b88e4b709517ff304e812010
//
//  ■ データ項目
//    資産名 / 管理番号 / 資産種別 / 稼働状態 / 担当部署 /
//    契約種別 / 月額費用 / ベンダー名 / 設置場所 /
//    関連サービス / 備考 / 導入日 / 更新・更改予定日
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const CMDB_DB_ID      = 'e9b083f7b88e4b709517ff304e812010'

/** Notion API 共通ヘッダー */
function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ─────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  const { searchParams } = new URL(req.url)
  const filterStatus   = searchParams.get('status')   ?? '' // 稼働状態
  const filterType     = searchParams.get('assetType') ?? '' // 資産種別
  const filterDept     = searchParams.get('dept')     ?? '' // 担当部署

  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${CMDB_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({
        page_size: 100,
        sorts: [{ property: '資産名', direction: 'ascending' }],
      }),
    })

    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${t}` }, { status: 500 })
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let records = (data.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id:             r.id,
        name:           p['資産名']?.title?.[0]?.plain_text           ?? '（名称なし）',
        managementNo:   p['管理番号']?.rich_text?.[0]?.plain_text      ?? '',
        assetType:      p['資産種別']?.select?.name                    ?? '',
        status:         p['稼働状態']?.select?.name                    ?? '',
        dept:           p['担当部署']?.select?.name                    ?? '',
        contractType:   p['契約種別']?.select?.name                    ?? '',
        monthlyCost:    p['月額費用（円）']?.number                    ?? null,
        vendor:         p['ベンダー名']?.rich_text?.[0]?.plain_text    ?? '',
        location:       p['設置場所']?.rich_text?.[0]?.plain_text      ?? '',
        relatedService: p['関連サービス']?.rich_text?.[0]?.plain_text  ?? '',
        notes:          p['備考']?.rich_text?.[0]?.plain_text          ?? '',
        installedDate:  p['導入日']?.date?.start                       ?? '',
        renewalDate:    p['更新・更改予定日']?.date?.start             ?? '',
      }
    })

    // ── フィルタ ──
    if (filterStatus) records = records.filter((r: { status: string }) => r.status === filterStatus)
    if (filterType)   records = records.filter((r: { assetType: string }) => r.assetType === filterType)
    if (filterDept)   records = records.filter((r: { dept: string }) => r.dept === filterDept)

    // ── サマリー集計 ──
    const total = records.length

    // 稼働状態別件数
    const byStatus: Record<string, number> = {}
    records.forEach((r: { status: string }) => {
      if (r.status) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1
    })

    // 資産種別別件数
    const byType: Record<string, number> = {}
    records.forEach((r: { assetType: string }) => {
      if (r.assetType) byType[r.assetType] = (byType[r.assetType] ?? 0) + 1
    })

    // 月額費用合計（数値ありのもの）
    const totalMonthlyCost = records
      .filter((r: { monthlyCost: number | null }) => r.monthlyCost !== null)
      .reduce((s: number, r: { monthlyCost: number }) => s + r.monthlyCost, 0)

    // 更新・更改予定日が今後90日以内の資産（期限アラート）
    const today  = new Date()
    const in90d  = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
    const renewalAlert = records.filter((r: { renewalDate: string; status: string }) => {
      if (!r.renewalDate) return false
      const d = new Date(r.renewalDate)
      return d >= today && d <= in90d && r.status !== '廃棄済'
    })

    return NextResponse.json({
      records,
      summary: {
        total,
        byStatus,
        byType,
        totalMonthlyCost,
        renewalAlertCount: renewalAlert.length,
        renewalAlerts: renewalAlert, // アラート対象を全件返す
      },
    })
  } catch (err) {
    console.error('CMDB GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  try {
    const body = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: '資産名を入力してください' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      '資産名': { title: [{ text: { content: body.name.trim() } }] },
    }

    // テキスト型
    if (body.managementNo?.trim())
      properties['管理番号'] = { rich_text: [{ text: { content: body.managementNo.trim() } }] }
    if (body.vendor?.trim())
      properties['ベンダー名'] = { rich_text: [{ text: { content: body.vendor.trim() } }] }
    if (body.location?.trim())
      properties['設置場所'] = { rich_text: [{ text: { content: body.location.trim() } }] }
    if (body.relatedService?.trim())
      properties['関連サービス'] = { rich_text: [{ text: { content: body.relatedService.trim() } }] }
    if (body.notes?.trim())
      properties['備考'] = { rich_text: [{ text: { content: body.notes.trim() } }] }

    // select 型
    if (body.assetType)    properties['資産種別'] = { select: { name: body.assetType } }
    if (body.status)       properties['稼働状態'] = { select: { name: body.status } }
    if (body.dept)         properties['担当部署'] = { select: { name: body.dept } }
    if (body.contractType) properties['契約種別'] = { select: { name: body.contractType } }

    // 数値型
    if (body.monthlyCost !== undefined && body.monthlyCost !== '')
      properties['月額費用（円）'] = { number: Number(body.monthlyCost) }

    // 日付型
    if (body.installedDate)
      properties['導入日'] = { date: { start: body.installedDate } }
    if (body.renewalDate)
      properties['更新・更改予定日'] = { date: { start: body.renewalDate } }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({ parent: { database_id: CMDB_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const t = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${t}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `「${body.name}」を登録しました` })
  } catch (err) {
    console.error('CMDB POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
