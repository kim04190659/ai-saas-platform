// =====================================================
//  src/app/api/position-records/route.ts
//  立場表明（PositionRecord）API ルート — Sprint #94
//
//  ■ このファイルの役割
//    - POST: 論点に対する立場表明を PositionRecord DB に記録する
//            （REQ-03 非同期・低圧力の意見収集）
//
//  ■ 意図的に GET を実装していない
//    Sprint #93 の k匿名性設計書で「PositionRecordの生データを返す
//    APIは作らない」と定めたため。論点ごとの集計結果は
//    GET /api/issues のレスポンス（aggregate）から取得すること。
//    https://app.notion.com/p/3b7960a91e238115b886f90817505ff1
//
//  ■ 使用 Notion DB
//    PositionRecord DB: 22e32647e8c249df9a3b1a66e04f4d4c
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE       = 'https://api.notion.com/v1'
const NOTION_VERSION        = '2022-06-28'
const POSITION_RECORD_DB_ID = '22e32647e8c249df9a3b1a66e04f4d4c'

interface PositionRecordInput {
  issueId:      string   // 論点のNotionページID（必須）
  stakeholderId: string  // ステークホルダーのNotionページID（必須）
  stance:       string   // '賛成' | '反対' | '条件付き賛成' | '保留'
  sdlTags:      string[] // SDL軸タグ（複数選択）
  freeText:     string   // 自由記述（2000字以内）
  channel:      string   // 'てつだって' | 'ワークショップ' | '窓口' | 'その他'
}

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: PositionRecordInput = await req.json()

    if (!body.issueId) {
      return NextResponse.json({ error: '論点が選択されていません' }, { status: 400 })
    }
    if (!body.stakeholderId) {
      return NextResponse.json({ error: 'ステークホルダーが選択されていません' }, { status: 400 })
    }
    if (!body.stance) {
      return NextResponse.json({ error: '立場を選択してください' }, { status: 400 })
    }
    // Notion rich_text の実務上限に合わせて2000字でカット（要件定義書 制約条件）
    const freeText = (body.freeText ?? '').slice(0, 2000)

    const properties: Record<string, unknown> = {
      // タイトルは自動生成（人が読むための最低限のラベル）
      'レコードタイトル': { title: [{ text: { content: `${body.stance} / ${new Date().toISOString().slice(0, 10)}` } }] },
      '論点':            { relation: [{ id: body.issueId }] },
      'ステークホルダー': { relation: [{ id: body.stakeholderId }] },
      '立場':            { select: { name: body.stance } },
      '記録日時':        { date: { start: new Date().toISOString().slice(0, 10) } },
    }
    if (body.sdlTags?.length) {
      properties['SDL軸タグ'] = { multi_select: body.sdlTags.map(name => ({ name })) }
    }
    if (freeText.trim()) {
      properties['自由記述'] = { rich_text: [{ text: { content: freeText.trim() } }] }
    }
    if (body.channel) {
      properties['チャネル'] = { select: { name: body.channel } }
    }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({ parent: { database_id: POSITION_RECORD_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'あなたの立場を記録しました。ご協力ありがとうございます。',
    })
  } catch (err) {
    console.error('PositionRecords POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
