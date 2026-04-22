// Personal Coarc セットアップAPI
// ヒアリング回答をAIで分析し、Notionに個人ページを自動生成する

import { NextRequest, NextResponse } from 'next/server'

// Notion REST API の設定
const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'

// Personal Coarc 家族ワークスペースの親ページID
const PARENT_PAGE_ID = '348960a91e2381efa46be855f9087236'

// トークンからAPIキーを復号するヘルパー
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

// Claude Haikuでヒ㢳リング結果を分析する
async function analyzeWithClaude(
  apiKey: string,
  answers: Record<string, string>
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [
        {
          role: 'user',
          content: `個人のAIアシスタントとして、以下のヒアリング結果を分析してください。

名前: ${answers.name ?? ''}
生活環境: ${answers.lifeType ?? ''}
年代: ${answers.age ?? ''}
主な困り: ${answers.mainWorry ?? ''}
困りの詳細: ${answers.worryDetail ?? ''}
理想の状態\uff083ヶ月後\uff09: ${answers.idealState ?? ''}
データ記録習慣: ${answers.dataHabit ?? ''}

以下の形式で日本語で回答してください\uff1a

## 📊 あなたの困りの本質
\uff082、3行で核心を整理\uff09

## 🤖 AIが今すぐ助けられること
- \uff08具体的な3つの支援\uff09

## 🎯 今週始める1つのアクション
\uff08最もシンプルで効果的な第一歩\uff09

## 📋 蓄積すると良いデータ
- \uff083つのデータ頹目と収集方法\uff09`,
        },
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
  const data = await res.json()
  return (
    (
      data as {
        content?: { type: string; text: string }[]
      }
    ).content?.[0]?.text ?? '分析結果を取得できませんでした'
  )
}

// Notionに個人ページを作成する\uff08fetchベースu09
async function createNotionPage(
  answers: Record<string, string>,
  analysis: string
): Promise<string> {
  const today = new Date().toLocaleDateString('ja-JP')
  const name = answers.name ?? 'あなた'
  const notionKey = process.env.NOTION_API_KEY ?? ''

  // プロフィールテキストの組み立て
  const profileText = [
    `生活環境: ${answers.lifeType ?? '-'}`,
    `年代: ${answers.age ?? '-'}`,
    `主な困り: ${answers.mainWorry ?? '-'}`,
    `困りの詳細: ${answers.worryDetail ?? '-'}`,
    `理想の状態: ${answers.idealState ?? '-'}`,
    `記録習慣: ${answers.dataHabit ?? '-'}`,
  ].join('\n')

  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VERSION,
    },
    body: JSON.stringify({
      parent: { type: 'page_id', page_id: PARENT_PAGE_ID },
      icon: { type: 'emoji', emoji: '👤' },
      properties: {
        title: {
          title: [{ text: { content: `👤 ${name}さんの Personal Coarc | ${today}` } }],
        },
      },
      children: [
        {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: `${name}さん専用のAIアシスタントページです。使うたびに進化します。` } }],
            icon: { type: 'emoji', emoji: '🚀' },
          },
        },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '📋 プロフィール' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: profileText } }] } },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '🤖 AIによる分析と提案' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: analysis.slice(0, 2000) } }] } },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '📊 データ記録ログ\uff08蓄積㨨リア\uff09' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'ここに日々の記録が蓄積され、AIの提案が進化していきます。' } }] } },
        { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: '💬 AIへの相談履歴' } }] } },
        { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: 'AIとの会話履歴がここに記録されます。' } }] } },
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(`Notionページ作成失敗: ${JSON.stringify(err)}`)
  }

  const page = await res.json() as { url: string }
  return page.url
}

// POSTハンドラー\uff08メイン処理\uff09
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { token, answers } = body as {
      token: string
      answers: Record<string, string>
    }

    if (!token) {
      return NextResponse.json(
        { error: 'token が必要です' },
        { status: 400 }
      )
    }
    if (!answers?.name) {
      return NextResponse.json(
        { error: '回答が不完全です\uff08名前が必要\uff09' },
        { status: 400 }
      )
    }

    // APIキーを復号
    const apiKey = await resolveApiKey(token)

    // Claude Haikuで分析
    const analysis = await analyzeWithClaude(apiKey, answers)

    // Notionに個人ページを生成
    const notionUrl = await createNotionPage(answers, analysis)

    // ユーザーIDを生成\uff08名前+タイムスタンプ\uff09
    const userId = `${answers.name}_${Date.now()}`

    return NextResponse.json({
      success: true,
      userId,
      notionUrl,
      message: `${answers.name}さんの個人ページを作成しました`,
    })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : '不明なエラー'
    console.error('[personal-coarc/setup]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
