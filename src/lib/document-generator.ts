// =====================================================
//  src/lib/document-generator.ts
//  行政文書 AI自動起案ライブラリ — Sprint #29
//
//  ■ 役割
//    職員が「箇条書きのメモ」を入力するだけで、
//    Claude Haiku が正式な行政文書の下書きを生成する。
//    職員は確認・加筆して完成させるだけ。
//
//  ■ 対応文書種別（4種）
//    minutes    : 会議・打合せ議事録
//    notice     : 住民向け通知文・案内文
//    report     : 月次・週次業務報告書
//    circular   : 職員向け回覧文書・通達
//
//  ■ 出力
//    - 生成した文書テキスト（markdown形式）
//    - Notionページとして保存（任意）
// =====================================================

import Anthropic from '@anthropic-ai/sdk'

// ─── 型定義 ──────────────────────────────────────────

/** 対応する文書種別 */
export type DocumentKind =
  | 'minutes'    // 議事録
  | 'notice'     // 住民向け通知文
  | 'report'     // 業務報告書
  | 'circular'   // 職員向け回覧・通達

/** 文書生成リクエスト */
export interface DocumentRequest {
  kind:        DocumentKind
  // 共通フィールド
  title:       string      // 文書タイトル（例: 「4月定例会議 議事録」）
  date:        string      // 文書日付（例: 「2026年4月18日」）
  department:  string      // 担当部署（例: 「住民課」）
  author:      string      // 担当者名・役職（例: 「住民課長 田中一郎」）
  // 種別別フィールド
  attendees?:  string      // 議事録: 出席者（改行区切り）
  venue?:      string      // 議事録: 開催場所・方法
  agenda?:     string      // 議事録: 議題・協議事項（箇条書き）
  decisions?:  string      // 議事録: 決定事項・アクション（箇条書き）
  recipient?:  string      // 通知文: 宛先（例: 「屋久島町民の皆様」）
  subject?:    string      // 通知文: 件名
  bodyPoints?: string      // 通知文・報告書・回覧: 本文のポイント（箇条書き）
  period?:     string      // 報告書: 報告期間（例: 「2026年4月」）
  highlights?: string      // 報告書: 主な成果・トピック
  issues?:     string      // 報告書: 課題・懸念事項
  nextSteps?:  string      // 報告書: 来月の予定・アクション
  toStaff?:    string      // 回覧: 宛先職員（例: 「全職員」「管理職」）
}

/** 文書生成レスポンス */
export interface DocumentResult {
  success:   boolean
  kind:      DocumentKind
  title:     string
  content:   string    // 生成した文書テキスト（markdown）
  wordCount: number
  error?:    string
}

// ─── プロンプト生成 ────────────────────────────────────

function buildPrompt(req: DocumentRequest): string {

  const commonInstruction = `あなたは日本の地方自治体（屋久島町）の行政文書作成の専門家です。
以下の情報をもとに、正式な行政文書の下書きを作成してください。

【作成条件】
- 文体: 公用文（ですます調・です体）
- 形式: Markdown形式（見出し・箇条書きを適切に使用）
- 分量: 実務で使いやすい適切な量（長すぎず短すぎず）
- 内容: 入力情報を最大限に活用し、空欄は合理的に補完する
- 注意: 固有名詞・数字・固有事項はそのまま使用する`

  switch (req.kind) {

    case 'minutes':
      return `${commonInstruction}

【文書種別】会議・打合せ議事録

【入力情報】
- 会議名: ${req.title}
- 開催日: ${req.date}
- 開催場所: ${req.venue ?? '屋久島町役場'}
- 出席者: ${req.attendees ?? '（未入力）'}
- 担当部署: ${req.department}
- 記録者: ${req.author}
- 議題・協議事項:
${req.agenda ?? '（未入力）'}
- 決定事項・次のアクション:
${req.decisions ?? '（未入力）'}

【出力形式】
# ${req.title} 議事録

## 開催概要
| 項目 | 内容 |
|---|---|
| 開催日時 | ... |
| 開催場所 | ... |
| 出席者 | ... |
| 記録者 | ... |

## 協議事項と結果
（議題ごとに「経緯・議論・結論」を簡潔にまとめる）

## 決定事項・アクションアイテム
（担当者と期限を明記）

## 次回予定
（わかる範囲で記載。不明なら「別途通知」）

---
以上のとおり記録する。
${req.date}　${req.department}　${req.author}`

    case 'notice':
      return `${commonInstruction}

【文書種別】住民向け通知文・案内文

【入力情報】
- 件名: ${req.subject ?? req.title}
- 宛先: ${req.recipient ?? '屋久島町民の皆様'}
- 作成日: ${req.date}
- 担当部署: ${req.department}
- 担当者: ${req.author}
- 通知のポイント（箇条書き）:
${req.bodyPoints ?? '（未入力）'}

【出力形式】
（日付）
（宛先）

（件名）

（書き出し：季節の挨拶＋平素のご協力への感謝）

記

１．（目的・概要）
２．（対象者・条件）
３．（日時・場所・方法）
４．（申込方法・持参物など）
５．（問い合わせ先）

以上

${req.department}
担当：${req.author}
TEL：0997-46-2111`

    case 'report':
      return `${commonInstruction}

【文書種別】業務報告書

【入力情報】
- 報告書タイトル: ${req.title}
- 報告期間: ${req.period ?? req.date}
- 作成部署: ${req.department}
- 作成者: ${req.author}
- 主なトピック・成果:
${req.highlights ?? req.bodyPoints ?? '（未入力）'}
- 課題・懸念事項:
${req.issues ?? '（なし）'}
- 来月の予定・アクション:
${req.nextSteps ?? '（未入力）'}

【出力形式】
# ${req.title}

**報告期間**: ${req.period ?? req.date}
**作成日**: ${req.date}
**作成部署**: ${req.department}
**作成者**: ${req.author}

## 1. 概況サマリー
（今月全体を3〜4文で総括）

## 2. 主要トピック・実績
（箇条書きで具体的に）

## 3. 課題・懸念事項
（課題と対応策を対にして記載）

## 4. 来月の予定・アクション
（期日・担当者を明記）

## 5. その他・特記事項
（あれば記載。なければ「特になし」）

---
${req.date}　${req.department}　${req.author}`

    case 'circular':
      return `${commonInstruction}

【文書種別】職員向け回覧文書・通達

【入力情報】
- 件名: ${req.title}
- 発信日: ${req.date}
- 宛先職員: ${req.toStaff ?? '全職員'}
- 発信部署: ${req.department}
- 発信者: ${req.author}
- 通達・連絡のポイント:
${req.bodyPoints ?? '（未入力）'}

【出力形式】
（日付）
（宛先：「各位」または部署名）

（タイトル）

（前文：通達・回覧の背景・目的を1〜2文）

記

１．（要旨・変更点・依頼事項）
２．（詳細・条件）
３．（期限・提出先・問い合わせ先）

以上

${req.department}
${req.author}`

    default:
      return `${commonInstruction}\n\n文書内容: ${req.title}\n${req.bodyPoints ?? ''}`
  }
}

// ─── 文書生成（Claude Haiku） ──────────────────────────

/**
 * Claude Haiku を使って行政文書の下書きを生成する。
 *
 * @param req     文書生成リクエスト（種別・入力情報）
 * @param apiKey  ANTHROPIC_API_KEY
 */
export async function generateDocument(
  req:    DocumentRequest,
  apiKey: string,
): Promise<DocumentResult> {

  if (!apiKey) {
    return {
      success:   false,
      kind:      req.kind,
      title:     req.title,
      content:   '',
      wordCount: 0,
      error:     'ANTHROPIC_API_KEY が未設定です',
    }
  }

  try {
    const anthropic = new Anthropic({ apiKey })
    const prompt    = buildPrompt(req)

    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    })

    const content   = res.content[0].type === 'text' ? res.content[0].text.trim() : ''
    const wordCount = content.replace(/\s/g, '').length

    console.log(`[doc-gen] 生成完了: ${req.kind} / ${req.title} / ${wordCount}字`)

    return {
      success:   true,
      kind:      req.kind,
      title:     req.title,
      content,
      wordCount,
    }

  } catch (e) {
    console.error('[doc-gen] 生成エラー:', e)
    return {
      success:   false,
      kind:      req.kind,
      title:     req.title,
      content:   '',
      wordCount: 0,
      error:     e instanceof Error ? e.message : String(e),
    }
  }
}

// ─── Notion へ保存 ────────────────────────────────────

const NOTION_API_BASE       = 'https://api.notion.com/v1'
const NOTION_VERSION        = '2022-06-28'
const NOTION_PARENT_PAGE_ID = '338960a91e23813f9402f53e5240e029'

const KIND_EMOJI: Record<DocumentKind, string> = {
  minutes:  '📝',
  notice:   '📢',
  report:   '📊',
  circular: '📋',
}

const KIND_LABEL: Record<DocumentKind, string> = {
  minutes:  '議事録',
  notice:   '通知文',
  report:   '業務報告書',
  circular: '回覧・通達',
}

/**
 * 生成した文書をNotionページとして保存する。
 * RunWith Platform ルートページ配下に作成される。
 */
export async function saveDocumentToNotion(
  result:    DocumentResult,
  notionKey: string,
): Promise<{ id: string; url: string } | null> {

  try {
    const emoji  = KIND_EMOJI[result.kind]
    const label  = KIND_LABEL[result.kind]
    const title  = `${emoji} [AI起案] ${result.title}`

    // content を 2000 字ずつ paragraph ブロックに分割
    // （Notion の rich_text は 2000 字制限のため）
    const chunks: string[] = []
    for (let i = 0; i < result.content.length; i += 1900) {
      chunks.push(result.content.slice(i, i + 1900))
    }

    const children = chunks.map(chunk => ({
      object:    'block',
      type:      'paragraph',
      paragraph: {
        rich_text: [{ type: 'text', text: { content: chunk } }],
      },
    }))

    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VERSION,
      },
      body: JSON.stringify({
        parent:     { page_id: NOTION_PARENT_PAGE_ID },
        icon:       { emoji },
        properties: {
          title: [{ text: { content: title } }],
        },
        children,
      }),
    })

    if (!res.ok) {
      console.error('[doc-gen] Notion保存失敗:', res.status, await res.text())
      return null
    }

    const page = await res.json()
    console.log(`[doc-gen] Notion保存完了: ${page.id}`)
    return { id: page.id, url: page.url }

  } catch (e) {
    console.error('[doc-gen] Notion保存エラー:', e)
    return null
  }
}
