// =====================================================
//  src/app/api/municipality-profile/route.ts
//  自治体プロフィール API ルート — Sprint #14.8 / Sprint #32 更新
//
//  ■ このファイルの役割
//    - GET: MunicipalityProfile DB から指定自治体のプロフィールを1件取得する
//    - POST: フォームの入力値を MunicipalityProfile DB に書き込む
//
//  ■ Sprint #32 変更点
//    クエリパラメータ ?municipalityId=kirishima を受け取り、
//    自治体名でフィルタリングするように修正した（マルチテナント対応）。
//    旧実装（全件取得して最新1件）は自治体データが混在するバグの原因だった。
//
//  ■ このAPIの核心的な役割
//    取得したプロフィールを /api/ai-advisor のシステムプロンプトに
//    差し込むことで、AI回答が「この自治体専用」の言葉になる（Layer 2設計）
//
//  ■ 使用NotionDB
//    MunicipalityProfile DB: 1488c8cb1d7346e39cb18998fa9b39c3（既存）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityById } from '@/config/municipalities'

const NOTION_API_BASE        = 'https://api.notion.com/v1'
const NOTION_VERSION         = '2022-06-28'
const MUNICIPALITY_PROFILE_DB = '1488c8cb1d7346e39cb18998fa9b39c3'

// ─── 型定義 ──────────────────────────────────────────

/** 自治体プロフィールの型 */
export interface MunicipalityProfile {
  id?:                 string
  municipalityName:    string                     // 自治体名
  populationSize:      string                     // 人口規模（select）
  mainChallenges:      string[]                   // 主要課題（multi-select）
  serviceAreas:        string[]                   // 重点サービス領域（multi-select）
  sdlAxes:             string[]                   // SDL強化重点軸（multi-select）
  advisorStyle:        string                     // AI顧問スタイル（select）
  regionNote:          string                     // 地域の特色メモ
  introducedDate?:     string                     // 導入日
}

// ─── ヘルパー ────────────────────────────────────────

function notionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET: 指定自治体のプロフィールを1件取得 ──────────

export async function GET(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  // ── Sprint #32: クエリパラメータから自治体IDを取得 ──
  const { searchParams } = new URL(req.url)
  const municipalityId  = searchParams.get('municipalityId') ?? 'kirishima'
  const municipality    = getMunicipalityById(municipalityId)

  try {
    // 自治体名でフィルタリングして取得（マルチテナント対応）
    // 旧実装（全件取得して最新1件）は廃止。自治体名プロパティで必ず絞り込む。
    const res = await fetch(`${NOTION_API_BASE}/databases/${MUNICIPALITY_PROFILE_DB}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey),
      body: JSON.stringify({
        filter: {
          property: '自治体名',
          title: { equals: municipality.shortName },
        },
        page_size: 1,
        sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${errText}` }, { status: 500 })
    }

    const data = await res.json()

    if (!data.results || data.results.length === 0) {
      // まだ設定されていない場合は空のデフォルト値を返す
      return NextResponse.json({ profile: null })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data.results[0] as any
    const p = r.properties

    const profile: MunicipalityProfile = {
      id:               r.id,
      municipalityName: p['自治体名']?.title?.[0]?.plain_text ?? '',
      populationSize:   p['人口規模']?.select?.name ?? '',
      // multi_select は options の配列 → name だけを抽出
      mainChallenges:   p['主要課題']?.multi_select?.map((o: { name: string }) => o.name) ?? [],
      serviceAreas:     p['重点サービス領域']?.multi_select?.map((o: { name: string }) => o.name) ?? [],
      sdlAxes:          p['SDL強化重点軸']?.multi_select?.map((o: { name: string }) => o.name) ?? [],
      advisorStyle:     p['AI顧問スタイル']?.select?.name ?? '',
      regionNote:       p['地域の特色メモ']?.rich_text?.[0]?.plain_text ?? '',
      introducedDate:   p['導入日']?.date?.start ?? '',
    }

    return NextResponse.json({ profile })
  } catch (err) {
    console.error('MunicipalityProfile GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── POST: プロフィールを Notion に書き込む ──────────

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: MunicipalityProfile = await req.json()

    // バリデーション
    if (!body.municipalityName?.trim()) {
      return NextResponse.json({ error: '自治体名は必須です' }, { status: 400 })
    }

    // ── Notion の properties オブジェクトを構築 ──
    const properties: Record<string, unknown> = {
      // タイトル型
      '自治体名': {
        title: [{ text: { content: body.municipalityName.trim() } }],
      },
      // multi_select型: 配列から options 形式に変換
      '主要課題': {
        multi_select: (body.mainChallenges ?? []).map(name => ({ name })),
      },
      '重点サービス領域': {
        multi_select: (body.serviceAreas ?? []).map(name => ({ name })),
      },
      'SDL強化重点軸': {
        multi_select: (body.sdlAxes ?? []).map(name => ({ name })),
      },
    }

    // select型: 値がある場合のみセット
    if (body.populationSize) {
      properties['人口規模'] = { select: { name: body.populationSize } }
    }
    if (body.advisorStyle) {
      properties['AI顧問スタイル'] = { select: { name: body.advisorStyle } }
    }
    // テキスト型
    if (body.regionNote?.trim()) {
      properties['地域の特色メモ'] = {
        rich_text: [{ text: { content: body.regionNote.trim() } }],
      }
    }
    // 日付型
    if (body.introducedDate) {
      properties['導入日'] = { date: { start: body.introducedDate } }
    }

    // Notion にページ（レコード）を新規作成
    // ※ 将来的には既存レコードの更新（PATCH）に対応予定
    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey),
      body: JSON.stringify({
        parent:     { database_id: MUNICIPALITY_PROFILE_DB },
        properties,
      }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    const created = await notionRes.json()
    return NextResponse.json({
      success: true,
      id:      created.id,
      message: `${body.municipalityName}のプロフィールを保存しました`,
    })
  } catch (err) {
    console.error('MunicipalityProfile POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
