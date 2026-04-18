// =====================================================
//  src/app/api/line-webhook/route.ts
//  LINE Webhook → Notion 自動連携エンジン — Sprint #26/#27
//
//  ■ 役割
//    LINEグループ（行政OS / 自治体G）に届いたメッセージを
//    リアルタイムでNotionの LINE相談ログDB に自動書き込みし、
//    住民へ自動受付メッセージを返信する。（Sprint #27追加）
//
//  ■ データフロー
//    LINE Platform（住民 or 職員がメッセージ送信）
//      ↓ Webhook POST
//    /api/line-webhook（このファイル）
//      ↓ 署名検証 → メッセージ抽出
//    Claude Haiku（相談種別を自動分類 + AI振り分け結果を生成）
//      ↓
//    Notion LINE相談ログ DB（新規ページを作成）
//
//  ■ 環境変数（Vercelに設定が必要）
//    LINE_CHANNEL_SECRET      : 署名検証キー（LINE Developers Console）
//    LINE_CHANNEL_ACCESS_TOKEN: 返信送信用トークン（現在は未使用）
//    LINE_GYOSEI_GROUP_ID     : 行政OSグループID → チャンネル: 職員LINE
//    LINE_JICHITAI_GROUP_ID   : 自治体GグループID → チャンネル: 住民LINE
//    NOTION_API_KEY           : 設定済み
//    ANTHROPIC_API_KEY        : 設定済み
//
//  ■ LINE相談ログ DB ID
//    d3c225835ec440f495bf79cd737eb862
//
//  ■ 署名検証の仕組み
//    LINE Platform は HMAC-SHA256(body, channelSecret) をBase64化した値を
//    X-Line-Signature ヘッダーに付与して送ってくる。
//    この値を検証することで、LINEからの正規リクエストのみ処理する。
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { createHmac }                from 'crypto'
import Anthropic                     from '@anthropic-ai/sdk'

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
const AUTO_REPLY_CITIZEN  = 'ご相談をお受けしました。担当者が内容を確認の上、ご連絡いたします。しばらくお待ちください。（屋久島町）'
const AUTO_REPLY_STAFF    = '【RunWith】メッセージを受け付けました。Webシステムで内容を確認してください。'

/**
 * LINE Messaging APIで自動受付メッセージを返信する。
 * replyToken は受信から30秒以内にしか使えない（Webhook直後に呼ぶこと）。
 */
async function sendAutoReply(
  replyToken: string,
  channel:    '住民LINE' | '職員LINE',
  accessToken: string,
): Promise<void> {
  // アクセストークン未設定の場合はスキップ（開発中）
  if (!accessToken) {
    console.warn('[line-webhook] LINE_CHANNEL_ACCESS_TOKEN 未設定 — 自動返信をスキップ')
    return
  }
  try {
    const text = channel === '住民LINE' ? AUTO_REPLY_CITIZEN : AUTO_REPLY_STAFF
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
          // 初期状態は「未対応」
          '対応状況': {
            select: { name: '未対応' },
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
    const channel     = detectChannel(groupId)

    // ユーザーIDを匿名IDに変換（表示用）
    const anonymousId = toAnonymousId(userId)

    // 相談タイトル = 先頭30文字（改行は除去）
    const title = messageText.replace(/\n/g, ' ').slice(0, 30) +
      (messageText.length > 30 ? '…' : '')

    // ── Sprint #27: 自動受付返信を送信（replyTokenは30秒で失効するため最優先） ──
    // Notionへの書き込みより前に実行することでタイムアウトを防ぐ
    if (event.replyToken && event.replyToken !== '00000000000000000000000000000000') {
      // replyToken が全0の場合はLINEのテスト送信なので返信不要
      await sendAutoReply(event.replyToken, channel, accessToken)
    }

    // AI分類（Claude Haiku で高速分類）
    const { category, aiResult } = anthropicKey
      ? await classifyWithAI(messageText, channel, anthropicKey)
      : { category: 'その他', aiResult: '（AIキー未設定）' }

    // Notionに保存
    // lineUserId（実際のユーザーID）を保存しておくと後で職員からプッシュ返信できる
    const saved = notionKey
      ? await saveToNotion({
          notionKey,
          title,
          content:    messageText,
          category,
          channel,
          anonymousId,
          lineUserId: userId,    // Sprint #27: 実際のLINEユーザーID（プッシュ返信用）
          receivedAt: timestamp,
          aiResult,
        })
      : null

    results.push({
      messageId:    event.message.id,
      channel,
      category,
      anonymousId,
      notionPageId: saved?.id ?? null,
      saved:        !!saved,
      autoReplied:  !!(event.replyToken && accessToken),
    })

    console.log(`[line-webhook] 処理完了: ${channel} | ${category} | ${anonymousId} | Notion: ${saved?.id ?? 'NG'} | 自動返信: ${!!(event.replyToken && accessToken) ? '✅' : '⏭️'}`)
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
