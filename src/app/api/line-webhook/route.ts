// =====================================================
//  src/app/api/line-webhook/route.ts
//  LINE Webhook → AI自動回答エンジン — Sprint #26/#27/#28
//
//  ■ 役割
//    LINEグループ（行政OS / 自治体G）に届いたメッセージを
//    リアルタイムで処理し、住民に「AI実回答」を返信する。
//    （Sprint #28 追加: 障害通報（断水・停電等）を自動分類→担当転送）
//
//  ■ データフロー（Sprint #28 アップグレード後）
//    LINE Platform（住民がメッセージ送信）
//      ↓ Webhook POST
//    /api/line-webhook（このファイル）
//      ↓ 署名検証 → メッセージ抽出
//
//    ── 障害通報の場合（isFaultReport() が true）──
//    classifyFault()          AIが種別・緊急度・場所を抽出
//      ↓
//    送信: 障害受付確認メッセージ（担当課・対応予定を含む）
//      ↓
//    Notion障害通報ページ保存 ＋ LINE相談ログDB保存（'障害通報'カテゴリ）
//
//    ── 一般相談の場合 ──
//    searchNotionKnowledge()  Notionナレッジを検索（RAG）
//      ↓
//    generateAIAnswer()       Claude Haikuが200字以内で回答生成
//      ↓
//    sendLineAIAnswer()       住民のLINEに実回答を送信
//      ↓
//    Notion LINE相談ログ DB   質問＋AI回答をセットで保存
//
//  ■ チャンネル別動作
//    住民LINE → 障害通報: 受付確認＋Notion転送 / 一般相談: AI実回答
//    職員LINE → 受付確認メッセージを送信（従来通り）
//
//  ■ 環境変数（Vercelに設定が必要）
//    LINE_CHANNEL_SECRET        : 署名検証キー
//    LINE_CHANNEL_ACCESS_TOKEN  : 返信送信用トークン
//    LINE_GYOSEI_GROUP_ID       : 行政OSグループID → 職員LINE
//    LINE_JICHITAI_GROUP_ID     : 自治体GグループID → 住民LINE（屋久島テスト用）
//    LINE_DEFAULT_MUNICIPALITY  : デフォルト自治体名（例: '霧島市'）※未設定時は'霧島市'
//    KIRISHIMA_CITIZEN_GROUP_ID : 霧島市住民テスト用グループID（設定すると霧島市として判定）
//    NOTION_API_KEY             : 設定済み
//    ANTHROPIC_API_KEY          : 設定済み
//    FAULT_REPORT_DB_ID         : 障害通報DB（任意・未設定でもページとして保存）
//
//  ■ LINE相談ログ DB ID
//    d3c225835ec440f495bf79cd737eb862
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'
import Anthropic                     from '@anthropic-ai/sdk'
import {
  searchNotionKnowledge,
  generateAIAnswer,
  sendLineAIAnswer,
} from '@/lib/line-ai-answer'
import {
  isFaultReport,
  classifyFault,
  saveFaultReport,
} from '@/lib/line-fault-classifier'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE   = 'https://api.notion.com/v1'
const NOTION_VERSION    = '2022-06-28'

// LINE相談ログDB のID
const LINE_LOG_DB_ID    = 'd3c225835ec440f495bf79cd737eb862'

// 匿名ID生成用のソルト（ユーザーIDをそのまま保存しないためのハッシュ用）
const ANON_SALT         = 'runwith-line-anon-v1'

// ─── 型定義 ──────────────────────────────────────────

/** LINE Webhookイベントの型（テキストメッセージのみ処理） */
interface LineTextEvent {
  type:       string
  message:    { type: string; id: string; text: string }
  source:     { type: string; userId?: string; groupId?: string; roomId?: string }
  timestamp:  number
  replyToken: string
}

interface LineWebhookBody {
  destination: string
  events:      LineTextEvent[]
}

// ─── ヘルパー関数群 ──────────────────────────────────

/** Notion API 共通ヘッダー */
function notionHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// LINE Messaging API エンドポイント
const LINE_API_REPLY = 'https://api.line.me/v2/bot/message/reply'

// 住民向け自動受付メッセージ（チャンネル別）
// Sprint #88-B: 自治体名は detectMunicipalityName() で動的に取得するため定数から除外
const AUTO_REPLY_STAFF    = '【RunWith】メッセージを受け付けました。Webシステムで内容を確認してください。'

/**
 * LINE Messaging APIで自動受付メッセージを返信する。
 * replyToken は受信から30秒以内にしか使えない（Webhook直後に呼ぶこと）。
 */
async function sendAutoReply(
  replyToken:       string,
  channel:          '住民LINE' | '職員LINE',
  accessToken:      string,
  municipalityName: string = '自治体',  // Sprint #88-B: 自治体名を動的に渡す
): Promise<void> {
  // アクセストークン未設定の場合はスキップ（開発中）
  if (!accessToken) {
    console.warn('[line-webhook] LINE_CHANNEL_ACCESS_TOKEN 未設定 — 自動返信をスキップ')
    return
  }
  try {
    // 住民向け受付メッセージは自治体名を動的に埋め込む
    const citizenReply = `ご相談をお受けしました。担当者が内容を確認の上、ご連絡いたします。しばらくお待ちください。（${municipalityName}）`
    const text = channel === '住民LINE' ? citizenReply : AUTO_REPLY_STAFF
    const res = await fetch(LINE_API_REPLY, {
      method:  'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      console.error('[line-webhook] 自動返信失敗:', res.status, errText)
    } else {
      console.log(`[line-webhook] 自動返信成功: ${channel}`)
    }
  } catch (e) {
    console.error('[line-webhook] 自動返信エラー:', e)
  }
}

/**
 * LINE署名を検証する。
 * X-Line-Signature ヘッダーの値が正規のLINEリクエストであることを確認する。
 */
function verifyLineSignature(body: string, signature: string, secret: string): boolean {
  const hash = createHmac('sha256', secret)
    .update(body, 'utf8')
    .digest('base64')
  return hash === signature
}

/**
 * ユーザーIDを匿名IDに変換する。
 * 同一ユーザーIDは常に同じ匿名IDになるが、元のIDは復元できない。
 * 形式: "U" + 先頭8文字（例: U3a9f2b1c）
 */
function toAnonymousId(userId: string): string {
  const hash = createHmac('sha256', ANON_SALT)
    .update(userId)
    .digest('hex')
  return `U${hash.slice(0, 8)}`
}

/**
 * グループIDからチャンネル種別を判定する。
 * 行政OSグループ → 職員LINE
 * 自治体Gグループ → 住民LINE
 * 不明 → 住民LINE（デフォルト）
 */
function detectChannel(groupId: string | undefined): '住民LINE' | '職員LINE' {
  const gyoseiGroupId  = process.env.LINE_GYOSEI_GROUP_ID   ?? ''
  const jichitaiGroupId = process.env.LINE_JICHITAI_GROUP_ID ?? ''

  if (gyoseiGroupId  && groupId === gyoseiGroupId)  return '職員LINE'
  if (jichitaiGroupId && groupId === jichitaiGroupId) return '住民LINE'
  return '住民LINE' // デフォルトは住民LINE
}

/**
 * Sprint #88-B: グループIDから自治体名を判定する。
 *
 * 判定優先順位:
 *  1. KIRISHIMA_CITIZEN_GROUP_ID と一致 → '霧島市'
 *  2. LINE_JICHITAI_GROUP_ID と一致    → '屋久島町'（既存テスト環境）
 *  3. LINE_DEFAULT_MUNICIPALITY 環境変数が設定されていればその値
 *  4. 上記いずれも該当しない1対1チャット → LINE_DEFAULT_MUNICIPALITY または '霧島市'
 *
 * 将来的に自治体を追加する場合はこの関数にマッピングを追加する。
 */
function detectMunicipalityName(groupId: string | undefined): string {
  const kirishimaGroupId = process.env.KIRISHIMA_CITIZEN_GROUP_ID ?? ''
  const yakushimaGroupId = process.env.LINE_JICHITAI_GROUP_ID     ?? ''
  const defaultName      = process.env.LINE_DEFAULT_MUNICIPALITY  ?? '霧島市'

  if (kirishimaGroupId && groupId === kirishimaGroupId) return '霧島市'
  if (yakushimaGroupId && groupId === yakushimaGroupId) return '屋久島町'
  // グループなし（1対1チャット）またはマッピング外のグループ
  return defaultName
}

// ─── AI分類処理 ─────────────────────────────────────

/**
 * Claude Haikuでメッセージを自動分類する。
 * 相談種別（5カテゴリ）とAI振り分け結果コメントを返す。
 */
async function classifyWithAI(
  messageText: string,
  channel:     '住民LINE' | '職員LINE',
  anthropicKey: string,
): Promise<{ category: string; aiResult: string }> {

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const prompt = `以下のLINEメッセージを分析してください。

【メッセージ】
${messageText}

【チャンネル】${channel}

タスク1: 以下の5種別のうち最も適切なものを1つだけ選んでください。
- 住民サービス（窓口・証明書・手続き全般）
- 手続き・申請（許可申請・給付金・転入出など）
- インフラ・施設（道路・公園・ゴミ・水道など）
- 観光・移住（観光情報・移住相談・イベントなど）
- その他（上記に当てはまらない）

タスク2: このメッセージの要点と推奨担当部署を1文で示してください。

回答フォーマット（必ずこの形式で）:
種別: [種別名]
振り分け: [要点と推奨担当部署]`

    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 200,
      messages:   [{ role: 'user', content: prompt }],
    })

    const text     = res.content[0].type === 'text' ? res.content[0].text : ''
    const kindLine = text.match(/種別:\s*(.+)/)?.[1]?.trim()  ?? 'その他'
    const aiLine   = text.match(/振り分け:\s*(.+)/)?.[1]?.trim() ?? ''

    // 有効な種別かチェック
    const validCategories = ['住民サービス', '手続き・申請', 'インフラ・施設', '観光・移住', 'その他']
    const category = validCategories.includes(kindLine) ? kindLine : 'その他'

    return { category, aiResult: aiLine }
  } catch (e) {
    console.error('[line-webhook] AI分類エラー:', e)
    return { category: 'その他', aiResult: '（AI分類エラー）' }
  }
}

// ─── Notionへの書き込み ───────────────────────────────

/**
 * LINE相談ログDBに新規ページを作成する。
 * 1通のLINEメッセージが1件のNotionレコードになる。
 *
 * lineUserId: 実際のLINEユーザーID（職員からの返信に必要）
 *             Notionの LINE_UserID フィールドに保存する
 */
async function saveToNotion(params: {
  notionKey:   string
  title:       string
  content:     string
  category:    string
  channel:     '住民LINE' | '職員LINE'
  anonymousId: string
  lineUserId:  string   // Sprint #27追加: 実際のLINEユーザーID（プッシュ返信用）
  receivedAt:  string   // ISO 8601形式
  aiResult:    string
  aiAnswer?:   string   // Sprint #28追加: AI実回答内容（住民LINEのみ）
}): Promise<{ id: string; url: string } | null> {
  try {
    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(params.notionKey),
      body: JSON.stringify({
        parent: { database_id: LINE_LOG_DB_ID },
        properties: {
          // タイトル（相談の件名 = メッセージ先頭30文字）
          '相談タイトル': {
            title: [{ text: { content: params.title } }],
          },
          // 相談本文
          '相談内容': {
            rich_text: [{ text: { content: params.content.slice(0, 2000) } }],
          },
          // AI自動分類した種別
          '相談種別': {
            select: { name: params.category },
          },
          // グループから判定したチャンネル
          'チャンネル': {
            select: { name: params.channel },
          },
          // 受信時刻（LINEのタイムスタンプ）
          '受信日時': {
            date: { start: params.receivedAt },
          },
          // ハッシュ化した匿名ユーザーID（表示用）
          '匿名ID': {
            rich_text: [{ text: { content: params.anonymousId } }],
          },
          // 実際のLINEユーザーID（職員からの返信送信に使用）
          'LINE_UserID': {
            rich_text: [{ text: { content: params.lineUserId } }],
          },
          // AIによる振り分けコメント
          'AI振り分け結果': {
            rich_text: [{ text: { content: params.aiResult } }],
          },
          // Sprint #28: AI実回答内容（住民LINEの場合のみ記録）
          ...(params.aiAnswer ? {
            '回答内容': {
              rich_text: [{ text: { content: params.aiAnswer.slice(0, 2000) } }],
            },
          } : {}),
          // 対応状況: AI回答を送信済みの場合は「AI回答済み」、それ以外は「未対応」
          '対応状況': {
            select: { name: params.aiAnswer ? 'AI回答済み' : '未対応' },
          },
        },
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      console.error('[line-webhook] Notion書き込みエラー:', err)
      return null
    }

    const page = await res.json()
    return { id: page.id, url: page.url }
  } catch (e) {
    console.error('[line-webhook] Notion例外:', e)
    return null
  }
}

// ─── POST ハンドラ（LINE Webhookの受け口） ─────────────

export async function POST(req: NextRequest) {
  const notionKey     = process.env.NOTION_API_KEY             ?? ''
  const anthropicKey  = process.env.ANTHROPIC_API_KEY          ?? ''
  const channelSecret = process.env.LINE_CHANNEL_SECRET        ?? ''
  // Sprint #27: 自動返信に使用するアクセストークン
  const accessToken   = process.env.LINE_CHANNEL_ACCESS_TOKEN  ?? ''

  // ── 1. リクエストボディを取得（署名検証に生テキストが必要） ──
  const rawBody = await req.text()

  // ── 2. LINE署名を検証（セキュリティ: 偽のリクエストを弾く） ──
  if (channelSecret) {
    const signature = req.headers.get('x-line-signature') ?? ''
    if (!signature || !verifyLineSignature(rawBody, signature, channelSecret)) {
      console.warn('[line-webhook] 署名検証失敗 — 不正なリクエストを拒否')
      return NextResponse.json({ error: '署名検証失敗' }, { status: 401 })
    }
  } else {
    // 開発中: 環境変数未設定時は警告ログのみ（本番では必ず設定すること）
    console.warn('[line-webhook] LINE_CHANNEL_SECRET 未設定 — 署名検証をスキップ（開発モード）')
  }

  // ── 3. イベントを解析 ──
  let body: LineWebhookBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'JSONパース失敗' }, { status: 400 })
  }

  // LINE検証リクエスト（eventsが空の場合）は即200を返す
  if (!body.events || body.events.length === 0) {
    return NextResponse.json({ status: 'ok', message: 'LINE verify OK' })
  }

  // ── 4. テキストメッセージのみ処理 ──
  const textEvents = body.events.filter(
    e => e.type === 'message' && e.message?.type === 'text'
  )

  const results = []

  for (const event of textEvents) {
    const messageText = event.message.text
    const groupId     = event.source.groupId
    const userId      = event.source.userId ?? 'unknown'
    const timestamp   = new Date(event.timestamp).toISOString()

    // グループIDからチャンネル種別を判定
    const channel          = detectChannel(groupId)

    // Sprint #88-B: グループIDから自治体名を動的に取得
    const municipalityName = detectMunicipalityName(groupId)

    // ★ デバッグ用ログ: Vercel Logs でユーザーIDとグループIDを確認できる
    console.log(`[line-webhook] 受信 userId=${userId} groupId=${groupId ?? '（1対1）'} channel=${channel} municipality=${municipalityName}`)

    // ユーザーIDを匿名IDに変換（表示用）
    const anonymousId = toAnonymousId(userId)

    // 相談タイトル = 先頭30文字（改行は除去）
    const title = messageText.replace(/\n/g, ' ').slice(0, 30) +
      (messageText.length > 30 ? '…' : '')

    // ── Sprint #28: チャンネル別・メッセージ種別処理 ─────────────────
    //
    //  【優先度 高】住民LINE × 障害通報 → 自動分類・受付確認・Notion転送
    //  【優先度 中】住民LINE × 一般相談 → Notion RAG + AI実回答
    //  【優先度 低】職員LINE             → 受付確認メッセージ
    //
    // ※ replyTokenは30秒以内に使用しないと失効する

    let aiAnswerRaw  = ''
    let aiAnswerSent = false
    let category     = 'その他'
    let aiResult     = ''

    const isTestToken  = event.replyToken === '00000000000000000000000000000000'
    const isFaultMsg   = channel === '住民LINE' && isFaultReport(messageText)

    if (channel === '住民LINE' && isFaultMsg && anthropicKey && !isTestToken) {
      // ═══════════════════════════════════════════════
      //  🚨 住民LINE × 障害通報パス
      //  断水・停電・ガス漏れ・道路陥没など
      // ═══════════════════════════════════════════════

      // 1. AI で障害を詳細分類（種別・緊急度・場所・詳細を一括抽出）
      const fault = await classifyFault(messageText, anthropicKey)

      category = `障害通報（${fault.faultType.label}）`
      aiResult = `担当: ${fault.faultType.dept} / 緊急度: ${fault.urgency} / 場所: ${fault.location}`

      // 2. 住民へ受付確認を送信（担当課・対応方針を含む）
      if (event.replyToken && accessToken) {
        try {
          const replyRes = await fetch('https://api.line.me/v2/bot/message/reply', {
            method:  'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type':  'application/json',
            },
            body: JSON.stringify({
              replyToken: event.replyToken,
              messages:   [{ type: 'text', text: fault.replyMessage }],
            }),
          })
          aiAnswerSent = replyRes.ok
          if (!replyRes.ok) console.error('[line-webhook] 障害通報返信失敗:', replyRes.status)
        } catch (e) {
          console.error('[line-webhook] 障害通報返信エラー:', e)
        }
      }

      // 3. Notionに障害通報ページを記録（公共設備管理の記録として）
      if (notionKey) {
        await saveFaultReport({
          notionKey,
          title:       fault.notionTitle,
          detail:      fault.detail,
          faultType:   fault.faultType,
          urgency:     fault.urgency,
          location:    fault.location,
          messageText,
          lineUserId:  userId,
          reportedAt:  timestamp,
        })
      }

      // 4. LINE相談ログDBにも記録（全相談の一元管理）
      await saveToNotion({
        notionKey,
        title,
        content:    messageText,
        category,
        channel,
        anonymousId,
        lineUserId: userId,
        receivedAt: timestamp,
        aiResult,
        aiAnswer:   fault.replyMessage,
      })

      console.log(`[line-webhook] 🚨 障害通報: ${fault.faultType.label} / 緊急度: ${fault.urgency} / 場所: ${fault.location} | 返信: ${aiAnswerSent ? '✅' : '❌'}`)

    } else if (channel === '住民LINE' && anthropicKey && !isTestToken) {
      // ═══════════════════════════════════════════════
      //  💬 住民LINE × 一般相談パス（RAG + AI実回答）
      // ═══════════════════════════════════════════════

      const [classifyResult, knowledgeResult] = await Promise.all([
        classifyWithAI(messageText, channel, anthropicKey),
        searchNotionKnowledge(messageText, notionKey),
      ])

      category = classifyResult.category
      aiResult = classifyResult.aiResult

      // AI回答を生成（Sprint #88-B: 自治体名を動的に渡す）
      const aiResult2 = await generateAIAnswer(
        messageText,
        knowledgeResult.context,
        anthropicKey,
        municipalityName,
      )
      aiAnswerRaw = aiResult2.answerRaw

      // LINEに回答を送信
      if (event.replyToken && accessToken) {
        aiAnswerSent = await sendLineAIAnswer(
          event.replyToken,
          userId,
          aiResult2.answer,
          accessToken,
        )
      }

      // Notionに保存
      await saveToNotion({
        notionKey,
        title,
        content:    messageText,
        category,
        channel,
        anonymousId,
        lineUserId: userId,
        receivedAt: timestamp,
        aiResult,
        aiAnswer:   aiAnswerRaw,
      })

      console.log(`[line-webhook] 住民LINE AI回答: ${aiAnswerRaw.length}字 | 送信: ${aiAnswerSent ? '✅' : '❌'} | 参照: ${aiResult2.contextUsed}`)

    } else {
      // ═══════════════════════════════════════════════
      //  👷 職員LINE または テストトークン
      // ═══════════════════════════════════════════════
      if (event.replyToken && !isTestToken) {
        // Sprint #88-B: 自治体名を動的に渡す
        await sendAutoReply(event.replyToken, channel, accessToken, municipalityName)
      }
      const classified = anthropicKey
        ? await classifyWithAI(messageText, channel, anthropicKey)
        : { category: 'その他', aiResult: '（AIキー未設定）' }
      category = classified.category
      aiResult = classified.aiResult

      await saveToNotion({
        notionKey,
        title,
        content:    messageText,
        category,
        channel,
        anonymousId,
        lineUserId: userId,
        receivedAt: timestamp,
        aiResult,
      })
    }

    results.push({
      messageId:    event.message.id,
      channel,
      category,
      anonymousId,
      isFault:      isFaultMsg,
      saved:        true,
      aiAnswerSent,
    })

    console.log(`[line-webhook] 完了: ${channel} | ${category} | ${anonymousId} | AI返信: ${aiAnswerSent ? '✅' : '⏭️'}`)
  }

  // LINE Platformには必ず200を返す（タイムアウト防止）
  return NextResponse.json({ status: 'ok', processed: results.length, results })
}

// ─── GET ハンドラ（ヘルスチェック＆設定確認） ────────────

export async function GET() {
  const channelSecret     = process.env.LINE_CHANNEL_SECRET        ?? ''
  const accessToken       = process.env.LINE_CHANNEL_ACCESS_TOKEN  ?? ''
  const gyoseiGroupId     = process.env.LINE_GYOSEI_GROUP_ID       ?? ''
  const jichitaiGroupId   = process.env.LINE_JICHITAI_GROUP_ID     ?? ''
  const notionKey         = process.env.NOTION_API_KEY             ?? ''
  const anthropicKey      = process.env.ANTHROPIC_API_KEY          ?? ''

  return NextResponse.json({
    status:      'ok',
    sprint:      '#26',
    description: 'LINE Webhook → Notion LINE相談ログDB 自動連携',
    webhookUrl:  'https://ai-saas-platform-gules.vercel.app/api/line-webhook',
    envVars: {
      LINE_CHANNEL_SECRET:       channelSecret   ? '✅ 設定済み' : '❌ 未設定（LINE Developers Console → チャンネルシークレット）',
      LINE_CHANNEL_ACCESS_TOKEN: accessToken     ? '✅ 設定済み' : '❌ 未設定（LINE Developers Console → チャンネルアクセストークン）',
      LINE_GYOSEI_GROUP_ID:      gyoseiGroupId   ? '✅ 設定済み' : '❌ 未設定（行政OSグループのグループID）',
      LINE_JICHITAI_GROUP_ID:    jichitaiGroupId ? '✅ 設定済み' : '❌ 未設定（自治体GグループのグループID）',
      NOTION_API_KEY:            notionKey       ? '✅ 設定済み' : '❌ 未設定',
      ANTHROPIC_API_KEY:         anthropicKey    ? '✅ 設定済み' : '❌ 未設定',
    },
    targetDatabase: {
      name: 'LINE相談ログ DB',
      id:   LINE_LOG_DB_ID,
      url:  `https://www.notion.so/${LINE_LOG_DB_ID.replace(/-/g, '')}`,
    },
    groupMapping: {
      gyosei:   gyoseiGroupId   || '（未設定）',
      jichitai: jichitaiGroupId || '（未設定）',
    },
    setup: {
      step1: 'LINE Developers Console で Messaging API チャンネルを作成',
      step2: '以下の環境変数を Vercel に設定: LINE_CHANNEL_SECRET, LINE_CHANNEL_ACCESS_TOKEN',
      step3: '各LINEグループにボットを追加し、グループIDを取得して LINE_GYOSEI_GROUP_ID, LINE_JICHITAI_GROUP_ID に設定',
      step4: 'LINE Developers Console → Messaging API → Webhook URL に以下を設定:',
      webhookUrl: 'https://ai-saas-platform-gules.vercel.app/api/line-webhook',
    },
  })
}
