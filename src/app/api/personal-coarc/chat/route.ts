// Personal Coarc チャットAPI
// Notionの個人プロフィールを参照しながらClaudeがパーソナライズ回答を生成する

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'

// ---- Notion ヘルパー ----

// Notionページのブロックを取得してプロフィールテキストを生成
async function fetchNotionProfile(pageId: string): Promise<string> {
  const res = await fetch(
    `${NOTION_API_BASE}/blocks/${pageId}/children?page_size=50`,
    {
      headers: {
        Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
        'Notion-Version': NOTION_VERSION,
      },
    }
  )
  if (!res.ok) throw new Error('Notionプロフィール取得失敗')
  const data = await res.json() as {
    results: { type: string; [key: string]: unknown }[]
  }

  // 各ブロックからテキストを抽出（プロフィール・AI分析セクションのみ使用）
  const lines: string[] = []
  for (const block of data.results) {
    const rich = (block[block.type] as { rich_text?: { plain_text: string }[] })?.rich_text ?? []
    const text = rich.map(r => r.plain_text).join('').trim()
    if (text) lines.push(text)
    // AI相談履歴セクション以降は除外（ループ終了）
    if (text.includes('AI') && text.includes('相談履歴')) break
  }
  return lines.join('\n')
}

// Notionページに会話を追記する
async function appendChatToNotion(
  pageId: string,
  userMsg: string,
  aiMsg: string
): Promise<void> {
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
  await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      children: [
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: `[${now}] 🙋 ${userMsg.slice(0, 500)}` } },
            ],
            color: 'blue_background',
          },
        },
        {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [
              { type: 'text', text: { content: `🤖 ${aiMsg.slice(0, 1900)}` } },
            ],
          },
        },
      ],
    }),
  })
}

// ---- APIキー復号 ----

async function resolveApiKey(token: string): Promise<string> {
  const base =
    process.env.NEXT_PUBLIC_APP_URL ??
    'https://ai-saas-platform-gules.vercel.app'
  const res = await fetch(
    `${base}/api/personal-coarc/token?token=${encodeURIComponent(token)}`
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.error ?? 'APIキー復号失敗')
  return data.apiKey
}

// ---- POSTハンドラー ----

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      token: string
      notionPageId: string
      message: string
      history: { role: 'user' | 'assistant'; content: string }[]
    }
    const { token, notionPageId, message, history = [] } = body

    if (!token || !notionPageId || !message) {
      return NextResponse.json(
        { error: 'token・notionPageId・message は必須です' },
        { status: 400 }
      )
    }

    // APIキーを復号
    const apiKey = await resolveApiKey(token)

    // Notionプロフィールを取得してシステムプロンプトに組み込む
    const profile = await fetchNotionProfile(notionPageId)

    const systemPrompt = `あなたは家族向けの個人AIアシスタントです。
以下はこのユーザーの登録情報とAI分析です。常にこの内容を参照して回答してください。

=== ユーザープロフィール ===
${profile}
========================

【回答のルール】
- 日本語で、温かく親しみやすいトーンで話してください
- 専門用語は使わず、生活に即した言葉を使ってください
- このユーザーの具体的な状況・困り・目標に合わせた提案をしてください
- 回答は300文字以内でコンパクトにまとめてください`

    // Claude Haiku で回答生成
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 600,
        system: systemPrompt,
        // 直近3往復の履歴を渡す
        messages: [
          ...history.slice(-6),
          { role: 'user', content: message },
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(
        (err as { error?: { message?: string } }).error?.message ??
          'Claude API呼び出し失敗'
      )
    }

    const data = await res.json() as {
      content?: { type: string; text: string }[]
    }
    const reply = data.content?.[0]?.text ?? '回答を取得できませんでした'

    // Notion に非同期で追記（失敗してもチャット継続）
    appendChatToNotion(notionPageId, message, reply).catch(e =>
      console.error('[personal-coarc/chat] Notion追記失敗:', e)
    )

    return NextResponse.json({ reply })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '不明なエラー'
    console.error('[personal-coarc/chat]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
