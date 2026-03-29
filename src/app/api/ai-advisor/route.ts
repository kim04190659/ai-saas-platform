// =====================================================
//  src/app/api/ai-advisor/route.ts
//  AI Well-Being顧問 APIルート
//
//  ■ このファイルの役割
//    - Notionの2つのDBから蓄積データを取得する
//    - 取得したデータをRAGコンテキストとしてClaude APIに渡す
//    - SDL五軸・Well-Being視点の回答をフロントに返す
//
//  ■ 使用するNotionDB
//    - エクセレントサービス学習ログDB（カードゲーム結果）
//    - RunWithプラットフォーム記録DB（IT運用診断・監視ログ）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// =====================================================
//  ヘルパー関数: Notionから学習ログを取得
// =====================================================

async function fetchLearningLogs(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // エクセレントサービス学習ログDB のID
  const dbId = 'cab4357ef4d7425496e5c0416866c6dd'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      // 直近20件を新しい順で取得
      body: JSON.stringify({
        page_size: 20,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（学習ログ取得エラー）'

    const data = await res.json()

    // 各レコードから必要なフィールドを取り出して文字列化
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      // Notionの各プロパティ型に合わせて安全に値を取得
      const session  = p['セッション名']?.title?.[0]?.plain_text ?? ''
      const gameType = p['ゲーム種別']?.select?.name ?? ''
      const score    = p['スコア']?.number ?? ''
      const staff    = p['職員名']?.rich_text?.[0]?.plain_text ?? ''
      const dept     = p['部署名']?.rich_text?.[0]?.plain_text ?? ''
      const cards    = p['選択カード']?.rich_text?.[0]?.plain_text ?? ''
      const idea     = p['改善アイデア']?.rich_text?.[0]?.plain_text ?? ''
      const feedback = p['AIフィードバック']?.rich_text?.[0]?.plain_text ?? ''

      return (
        `・${session}（${gameType}）スコア:${score}` +
        (staff ? ` 職員:${staff}` : '') +
        (dept  ? ` / ${dept}` : '') +
        `\n  選択カード: ${cards}` +
        `\n  改善アイデア: ${idea}` +
        `\n  AIフィードバック: ${feedback.slice(0, 100)}`
      )
    }) ?? []

    return rows.length > 0 ? rows.join('\n') : '（まだデータがありません）'
  } catch {
    return '（学習ログ取得エラー）'
  }
}

// =====================================================
//  ヘルパー関数: Notionからプラットフォーム記録を取得
// =====================================================

async function fetchPlatformRecords(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // RunWithプラットフォーム記録DB のID
  const dbId = '32b960a91e2381228dcbdd56375cba03'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionApiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      // 直近20件を新しい順で取得
      body: JSON.stringify({
        page_size: 20,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（記録DB取得エラー）'

    const data = await res.json()

    // 各レコードから必要なフィールドを取り出して文字列化
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      const title    = p['タイトル']?.title?.[0]?.plain_text ?? ''
      const type     = p['種別']?.select?.name ?? ''
      const score    = p['スコア']?.number ?? ''
      const maxScore = p['最大スコア']?.number ?? ''
      const level    = p['レベル/ランク']?.rich_text?.[0]?.plain_text ?? ''
      const weakness = p['弱点・改善領域']?.rich_text?.[0]?.plain_text ?? ''
      const note     = p['補足情報']?.rich_text?.[0]?.plain_text ?? ''

      return (
        `・${title}（${type}）スコア:${score}/${maxScore} レベル:${level}` +
        `\n  弱点: ${weakness}` +
        `\n  補足: ${note.slice(0, 80)}`
      )
    }) ?? []

    return rows.length > 0 ? rows.join('\n') : '（まだデータがありません）'
  } catch {
    return '（記録DB取得エラー）'
  }
}

// =====================================================
//  POSTハンドラ: チャットメッセージを受け取りAI回答を返す
// =====================================================

export async function POST(req: NextRequest) {
  try {
    // フロントエンドからの入力: ユーザーのメッセージと会話履歴
    const { message, conversationHistory } = await req.json()

    // Notion DBから最新データを並列で取得（速度優先）
    const [learningLogs, platformRecords] = await Promise.all([
      fetchLearningLogs(),
      fetchPlatformRecords(),
    ])

    // ─────────────────────────────────────────────────
    //  RAGコンテキスト: 蓄積データをAIに渡す
    //  「このデータを見て回答してください」という形式
    // ─────────────────────────────────────────────────
    const ragContext = `
【この自治体のRunWithプラットフォーム蓄積データ】

■ エクセレントサービス学習ログ（カードゲーム結果）:
${learningLogs}

■ IT運用診断・監視・カードゲーム記録:
${platformRecords}
`

    // ─────────────────────────────────────────────────
    //  システムプロンプト: AIの役割・分析視点・回答原則を定義
    //  SDL五軸とWell-Being視点を常に意識した回答を生成させる
    // ─────────────────────────────────────────────────
    const systemPrompt = `あなたは「RunWith Well-Being顧問AI」です。
人口減少が進む日本の自治体が住民と職員双方のWell-Beingを高めながら
持続可能な行政サービスを実現するために、データに基づいた具体的な改善提言を行う専門家AIです。

あなたの分析は、原浦龍典教授（東京大学）のService Dominant Logic（SDL）価値共創モデルの
五軸に基づきます：
- 共創軸：住民・職員・行政が共に価値を生み出しているか
- 文脈軸：サービスが住民の生活文脈に合っているか
- 資源軸：外部パートナーや地域資源を活用できているか
- 統合軸：複数のサービスや知識を組み合わせているか
- 価値軸：最終的に住民・職員の生活の質が向上しているか

回答の原則：
1. 必ず蓄積データを参照し「このデータによると〜」という形で根拠を示す
2. 抽象的なアドバイスではなく、明日から実行できる具体的な提言を3つ以内で示す
3. SDL五軸のどの軸に関連するかを明示する
4. 職員のWell-Beingと住民サービス品質の両立を常に意識する
5. 日本語で、自治体職員が理解しやすい言葉で話す

${ragContext}`

    // ─────────────────────────────────────────────────
    //  会話履歴 + 今回のメッセージを組み立てる
    //  過去の会話を引き継ぐことで文脈を持った対話が可能になる
    // ─────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      ...(conversationHistory ?? []),   // 過去の会話履歴
      { role: 'user', content: message }, // 今回の質問
    ]

    // Claude API を呼び出す（サーバーサイドなのでAPIキーが安全に使える）
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',    // 高品質な分析に最適なモデル
        max_tokens: 1500,             // 十分な回答長を確保
        system: systemPrompt,
        messages,
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return NextResponse.json(
        { error: `Claude APIエラー: ${errText}` },
        { status: 500 }
      )
    }

    const claudeData = await claudeRes.json()
    const aiReply = claudeData.content?.[0]?.text ?? '回答を取得できませんでした'

    // フロントエンドに返す内容
    return NextResponse.json({
      // AIの回答本文
      reply: aiReply,

      // 次回のリクエストで会話文脈を維持するための履歴
      updatedHistory: [
        ...(conversationHistory ?? []),
        { role: 'user',      content: message  },
        { role: 'assistant', content: aiReply  },
      ],

      // 参照したデータ件数（フロントのバッジ表示に使用）
      dataStats: {
        learningLogLines:     learningLogs.split('\n').filter(l => l.startsWith('・')).length,
        platformRecordLines:  platformRecords.split('\n').filter(l => l.startsWith('・')).length,
      },
    })

  } catch (err) {
    console.error('AI顧問APIエラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
