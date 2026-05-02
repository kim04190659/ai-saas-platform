// =====================================================
//  src/lib/line-ai-answer.ts
//  LINE AI自動回答エンジン — Sprint #28 / Sprint #88-B（自治体名動的化）
//
//  ■ 役割
//    住民のLINE相談に対して、Notionナレッジベースを参照しながら
//    Claude AIが実際の回答を生成する（RAG方式）。
//
//  ■ 処理フロー
//    1. searchNotionKnowledge()  : 相談内容でNotion全体を検索（上位5件）
//    2. generateAIAnswer()       : 検索結果を文脈にしてClaudeが回答生成
//    3. sendLineMessage()        : LINEに回答を送信
//
//  ■ 回答ポリシー
//    - 200字以内で簡潔に（LINEで読みやすい長さ）
//    - 専門用語を使わず業務視点で説明
//    - 分からない場合は窓口に案内
//    - 個人情報・具体的な申請内容には言及しない
//
//  ■ 使用モデル
//    claude-haiku-4-5-20251001（高速・低コスト）
// =====================================================

import Anthropic from '@anthropic-ai/sdk'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const LINE_API_REPLY  = 'https://api.line.me/v2/bot/message/reply'
const LINE_API_PUSH   = 'https://api.line.me/v2/bot/message/push'

// Sprint #88-B: 自治体名はハードコードせず、呼び出し元から受け取る
// （旧: const MUNICIPALITY_NAME = '屋久島町' → 廃止）

/** 回答末尾のフッターを自治体名つきで生成する */
function makeFooter(municipalityName: string): string {
  return `\n\n---\n※ このメッセージはAIが自動生成しました。\n詳細・手続きについては担当窓口へお問い合わせください。（${municipalityName}）`
}

// ─── 型定義 ──────────────────────────────────────────

/** Notion検索結果の1件 */
interface NotionSearchResult {
  title:   string
  url:     string
  excerpt: string  // ページ内テキストの断片（取得できた場合）
}

/** AI回答生成の結果 */
export interface AIAnswerResult {
  answer:        string   // 生成した回答テキスト（フッター含む）
  answerRaw:     string   // フッターなしの純粋な回答
  contextUsed:   string   // 参照したNotionページのタイトル一覧
  modelUsed:     string   // 使用したClaudeモデル名
}

// ─── Notionナレッジベース検索 ────────────────────────

/**
 * Notionワークスペース全体を相談内容で検索し、
 * 関連ページを最大5件取得して文脈テキストを返す。
 *
 * @param query    検索クエリ（住民の相談内容）
 * @param notionKey  Notion APIキー
 * @returns 関連ページの情報（タイトル・URL）と文脈文字列
 */
export async function searchNotionKnowledge(
  query: string,
  notionKey: string,
): Promise<{ context: string; sources: NotionSearchResult[] }> {

  // クエリが短すぎる場合は検索をスキップ
  if (!query || query.trim().length < 5) {
    return { context: '', sources: [] }
  }

  try {
    // Notion全文検索API（ページのみ対象）
    const res = await fetch(`${NOTION_API_BASE}/search`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        query:     query.slice(0, 100),  // 検索クエリは100字以内
        filter:    { value: 'page', property: 'object' },
        page_size: 5,  // 上位5件
        sort: {
          direction: 'descending',
          timestamp: 'last_edited_time',
        },
      }),
    })

    if (!res.ok) {
      console.warn('[line-ai] Notion検索失敗:', res.status)
      return { context: '', sources: [] }
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sources: NotionSearchResult[] = (data.results ?? []).map((page: any) => {
      // ページタイトルを取得（プロパティ名が異なる場合も考慮）
      const titleProp =
        page.properties?.title       ??
        page.properties?.['名前']    ??
        page.properties?.['相談タイトル'] ??
        page.properties?.['ページ名']
      const title =
        titleProp?.title?.[0]?.plain_text     ??
        titleProp?.rich_text?.[0]?.plain_text ??
        '（タイトルなし）'

      return {
        title,
        url:     page.url ?? '',
        excerpt: '',  // Notion検索APIは本文断片を返さないため空
      }
    })

    // 文脈テキストを組み立て（Claude へ渡す参考情報）
    const context = sources.length > 0
      ? `【RunWithナレッジベース検索結果（上位${sources.length}件）】\n` +
        sources.map((s, i) => `${i + 1}. ${s.title}`).join('\n')
      : ''

    console.log(`[line-ai] Notion検索完了: ${sources.length}件 / クエリ: ${query.slice(0, 30)}`)
    return { context, sources }

  } catch (e) {
    console.error('[line-ai] Notion検索エラー:', e)
    return { context: '', sources: [] }
  }
}

// ─── Claude AI回答生成 ───────────────────────────────

/**
 * 相談内容とNotionの文脈情報をもとに、Claude Haikuが回答を生成する。
 * LINEメッセージとして適切な200字以内の回答を返す。
 *
 * @param question    住民の相談内容
 * @param context     Notionから取得した文脈情報
 * @param anthropicKey  Anthropic APIキー
 * @returns AI回答の生成結果
 */
export async function generateAIAnswer(
  question:         string,
  context:          string,
  anthropicKey:     string,
  municipalityName: string = '自治体',  // Sprint #88-B: 自治体名を引数で受け取る
): Promise<AIAnswerResult> {

  const modelUsed = 'claude-haiku-4-5-20251001'

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // システムプロンプト: Sprint #88-B 改訂版
    // 方針: Notion参照情報を優先し、なければ日本の行政知識で具体的に回答する。
    //       「分からない → 窓口案内」で終わらず、住民が次の行動を取れる情報を提供する。
    const systemPrompt = `あなたは${municipalityName}の行政AIアシスタントです。
住民からのLINE相談に対して、具体的かつ丁寧に回答します。

【回答の優先順位】
1. 【参考情報】に関連データがある場合 → その内容を最優先で使って回答する
2. 参考情報がない・少ない場合 → 日本の自治体行政に関する一般知識で具体的に回答する
3. 個人の状況によって異なる内容（申請の可否・金額確定など）→ 窓口への確認を案内する

【回答スタイル】
- 200字以内で簡潔に（LINEで読みやすい長さ）
- 専門用語を使わず、誰でも分かる言葉で
- 手続きがある場合は「何を・どこに・いつまでに」を明示する
- ゴミ出し・証明書・各種申請など一般的な行政手続きは、日本の標準的なルールをもとに具体的に答える
- 曜日・金額・地区ごとの詳細など自治体固有の細かい情報は「詳しくは${municipalityName}役所へ」と添える
- 「分かりません」「お問い合わせください」だけで終わらない。必ず何らかの有益な情報を提供してから、窓口案内を添える
- 前置きや「回答します」などの定型文は不要。すぐに本題を答える

${context ? `【参考情報（Notionナレッジより）】\n${context}\n` : '【参考情報】なし（一般行政知識で回答してください）\n'}`

    const res = await anthropic.messages.create({
      model:      modelUsed,
      max_tokens: 500,  // Sprint #88-B: 300→500に拡張（具体的な回答に必要なトークン数）
      system:     systemPrompt,
      messages:   [{ role: 'user', content: question }],
    })

    const answerRaw = res.content[0].type === 'text'
      ? res.content[0].text.trim()
      : '申し訳ありませんが、回答の生成に失敗しました。担当窓口にお問い合わせください。'

    // 文字数制限チェック（350字超の場合は省略）
    // Sprint #88-B: 200字→350字に拡張（具体的な回答には一定の長さが必要）
    const truncated = answerRaw.length > 350
      ? answerRaw.slice(0, 347) + '…'
      : answerRaw

    const answer = truncated + makeFooter(municipalityName)

    console.log(`[line-ai] 回答生成完了: ${truncated.length}字`)
    return {
      answer,
      answerRaw:   truncated,
      contextUsed: context ? '（Notionナレッジ参照）' : '（一般知識）',
      modelUsed,
    }

  } catch (e) {
    console.error('[line-ai] AI回答生成エラー:', e)
    const fallback = `ご相談ありがとうございます。ただいまシステムに一時的な問題が発生しております。誠に恐れ入りますが、${municipalityName}の担当窓口に直接お問い合わせください。`
    return {
      answer:      fallback + makeFooter(municipalityName),
      answerRaw:   fallback,
      contextUsed: '（エラーフォールバック）',
      modelUsed,
    }
  }
}

// ─── LINE返信送信 ─────────────────────────────────────

/**
 * LINE Reply APIでメッセージを送信する（replyTokenを使用、30秒以内限定）。
 * replyTokenの有効期限切れに備え、失敗時はpush APIにフォールバックする。
 *
 * @param replyToken  LINE replyToken（Webhookイベントから取得）
 * @param lineUserId  実際のLINEユーザーID（フォールバック用）
 * @param text        送信するテキスト
 * @param accessToken  LINE Channel Access Token
 */
export async function sendLineAIAnswer(
  replyToken:  string,
  lineUserId:  string,
  text:        string,
  accessToken: string,
): Promise<boolean> {

  if (!accessToken) {
    console.warn('[line-ai] LINE_CHANNEL_ACCESS_TOKEN 未設定 — 送信スキップ')
    return false
  }

  // ── まずreply APIで試みる（高速・無料回数消費なし）──
  try {
    const replyRes = await fetch(LINE_API_REPLY, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        replyToken,
        messages: [{ type: 'text', text }],
      }),
    })

    if (replyRes.ok) {
      console.log('[line-ai] LINE reply送信成功')
      return true
    }

    // replyToken失効（400エラー）の場合はpushにフォールバック
    const errBody = await replyRes.json().catch(() => ({}))
    console.warn('[line-ai] reply失敗:', replyRes.status, errBody)

    // replyToken失効の典型エラーコード
    if (replyRes.status === 400 && lineUserId && lineUserId !== 'unknown') {
      console.log('[line-ai] push APIにフォールバック')
      const pushRes = await fetch(LINE_API_PUSH, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          to:       lineUserId,
          messages: [{ type: 'text', text }],
        }),
      })

      if (pushRes.ok) {
        console.log('[line-ai] LINE push送信成功（フォールバック）')
        return true
      }

      console.error('[line-ai] push失敗:', pushRes.status, await pushRes.text())
    }

    return false

  } catch (e) {
    console.error('[line-ai] LINE送信例外:', e)
    return false
  }
}
