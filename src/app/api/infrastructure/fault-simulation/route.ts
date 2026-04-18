// =====================================================
//  src/app/api/infrastructure/fault-simulation/route.ts
//  障害通報 分類テスト API — Sprint #28
//
//  ■ 役割
//    FaultReportPanelの「AI分類テスト」ボタン向けエンドポイント。
//    テキストを受け取り、障害通報として分類・Notion記録を行い
//    結果をWebUIに返す。
//    実際のLINE Webhookと同じ分類エンジンを使用するため、
//    動作確認や担当者へのデモに活用できる。
//
//  ■ リクエスト
//    POST /api/infrastructure/fault-simulation
//    Body: { text: string }
//
//  ■ レスポンス
//    { status, faultType, urgency, location, detail, reply, notionPage }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  isFaultReport,
  classifyFault,
  saveFaultReport,
} from '@/lib/line-fault-classifier'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const text = (body.text ?? '').trim()

    if (!text) {
      return NextResponse.json({ status: 'error', message: 'テキストが空です' }, { status: 400 })
    }

    const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
    const notionKey    = process.env.NOTION_API_KEY    ?? ''

    // 障害通報かどうかキーワードチェック
    const isFault = isFaultReport(text)
    if (!isFault) {
      return NextResponse.json({
        status:  'success',
        isFault: false,
        message: '障害通報キーワードが検出されませんでした。一般相談として扱われます。',
      })
    }

    // AI分類を実行
    const fault = await classifyFault(text, anthropicKey)

    // Notionに記録（テストでも実際に記録して動作を確認できるようにする）
    let notionPage = null
    if (notionKey) {
      notionPage = await saveFaultReport({
        notionKey,
        title:       `[テスト] ${fault.notionTitle}`,
        detail:      fault.detail,
        faultType:   fault.faultType,
        urgency:     fault.urgency,
        location:    fault.location,
        messageText: text,
        lineUserId:  'simulation_test',
        reportedAt:  new Date().toISOString(),
      })
    }

    return NextResponse.json({
      status:    'success',
      isFault:   true,
      faultType: `${fault.faultType.emoji} ${fault.faultType.label}`,
      urgency:   fault.urgency,
      location:  fault.location,
      detail:    `${fault.detail} / 担当: ${fault.faultType.dept}`,
      reply:     fault.replyMessage,
      notionPage,
      message:   '分類・記録完了',
    })

  } catch (e) {
    console.error('[fault-simulation] エラー:', e)
    return NextResponse.json({
      status:  'error',
      message: `処理エラー: ${e instanceof Error ? e.message : String(e)}`,
    }, { status: 500 })
  }
}
