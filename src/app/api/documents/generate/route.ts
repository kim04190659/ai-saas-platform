// =====================================================
//  src/app/api/documents/generate/route.ts
//  行政文書 AI自動起案 API — Sprint #29
//
//  ■ リクエスト
//    POST /api/documents/generate
//    Body: DocumentRequest（document-generator.ts を参照）
//
//  ■ レスポンス
//    { status, kind, title, content, wordCount, notionPage? }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  generateDocument,
  saveDocumentToNotion,
  type DocumentRequest,
} from '@/lib/document-generator'

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const notionKey    = process.env.NOTION_API_KEY    ?? ''

  try {
    const body = await req.json() as DocumentRequest & { saveToNotion?: boolean }

    // 必須フィールドのチェック
    if (!body.kind || !body.title) {
      return NextResponse.json(
        { status: 'error', message: 'kind と title は必須です' },
        { status: 400 },
      )
    }

    // ① 文書を生成
    const result = await generateDocument(body, anthropicKey)

    if (!result.success) {
      return NextResponse.json({
        status:  'error',
        message: result.error ?? '文書生成に失敗しました',
      }, { status: 500 })
    }

    // ② Notion へ保存（saveToNotion フラグが true の場合）
    let notionPage = null
    if (body.saveToNotion && notionKey && result.success) {
      notionPage = await saveDocumentToNotion(result, notionKey)
    }

    return NextResponse.json({
      status:    'success',
      kind:      result.kind,
      title:     result.title,
      content:   result.content,
      wordCount: result.wordCount,
      notionPage,
    })

  } catch (e) {
    console.error('[doc-generate] エラー:', e)
    return NextResponse.json({
      status:  'error',
      message: `処理エラー: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 500 })
  }
}
