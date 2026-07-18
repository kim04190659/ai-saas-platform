// =====================================================
//  src/lib/signal-detector.ts
//  Signal検知エンジン — 【結(YUI)】基盤開発 第一歩
//
//  ■ このファイルの役割
//    「てつだって」(personal-coarc)での1回の会話(利用者の発言＋AIの返信)から、
//    生活状況の「小さな変化」を検知し、匿名化された Signal として抽出する。
//
//  ■ 設計上の重要な制約(CLAUDE.md 1.5・1.6 参照)
//    - 氏名・住所・電話番号など個人を特定できる情報は絶対に summary に含めない
//    - 検知した内容は「カテゴリ」「深刻度」「要約」の3点のみに要約し、
//      会話の生データそのものは Signal 側に持ち出さない
//    - この関数は「1件のSignal候補」を返すだけで、企業・自治体への公開可否は
//      signal-store.ts 側の k-匿名性ロジック(母数5〜20人未満は非公開)が別途判定する
// =====================================================

// ─── 型定義 ──────────────────────────────────────────

/** Signalのカテゴリ(NotionのSignalログDBのSelectオプションと一致させること) */
export type SignalCategory =
  | '生活・家事' | '移動・外出' | '健康・体調' | '孤立・つながり' | '経済・お金' | 'その他'

/** Signalの深刻度 */
export type SignalSeverity = 'info' | '注意' | '要対応'

/** 検知結果 */
export interface DetectedSignal {
  detected: boolean
  category?: SignalCategory
  severity?: SignalSeverity
  summary?: string   // 匿名化済みの要約(40字以内を目安)
}

// ─── 簡易PIIスクラブ(安全網) ───────────────────────────
// Claudeへのプロンプトで「個人情報を含めない」よう強く指示するが、
// 万一漏れた場合に備えて、電話番号・メールアドレス風の文字列は機械的にも除去する。
// ※ 氏名の完全な検出は困難なため、これは最終防波堤であり過信しないこと。
function scrubObviousPii(text: string): string {
  return text
    .replace(/\d{2,4}-\d{2,4}-\d{3,4}/g, '(電話番号は除去)')
    .replace(/[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+/g, '(メールアドレスは除去)')
}

// ─── Claude呼び出し ──────────────────────────────────

const DETECT_SYSTEM_PROMPT = `あなたは高齢者・生活者との会話から「生活状況の小さな変化」を検知するアシスタントです。
以下の会話から、生活環境・健康・つながり・経済状況などに関する「変化のサイン」が読み取れるか判定してください。

【絶対的な制約】
- 氏名・住所・電話番号・具体的な地名・家族構成などの個人を特定できる情報は、出力に一切含めないこと
- summary は一般化された表現にすること(例: 「足腰の衰えを感じ始めている」であって「田中さん(78)が足の痛みを訴えた」ではない)
- 単なる雑談・特に変化が読み取れない場合は detected: false を返すこと

【出力形式(JSONのみ。説明文・コードブロック不要)】
{"detected":true|false,"category":"生活・家事|移動・外出|健康・体調|孤立・つながり|経済・お金|その他","severity":"info|注意|要対応","summary":"40字以内の匿名化された要約"}
detected が false の場合は category・severity・summary を省略してよい。`

/**
 * 1回の会話ターンからSignalを検知する
 * @param apiKey  Anthropic APIキー(personal-coarcユーザーのキーを流用)
 * @param userMsg 利用者の発言
 * @param aiMsg   AIの返信
 */
export async function detectSignal(
  apiKey: string,
  userMsg: string,
  aiMsg: string
): Promise<DetectedSignal> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 300,
        system: DETECT_SYSTEM_PROMPT,
        messages: [
          {
            role: 'user',
            content: `【利用者の発言】\n${userMsg}\n\n【AIの返信】\n${aiMsg}`,
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[signal-detector] Claude API呼び出し失敗:', res.status)
      return { detected: false }
    }

    const data = await res.json() as { content?: { type: string; text: string }[] }
    const raw = data.content?.[0]?.text ?? '{"detected":false}'

    // Claudeがコードブロックで囲む場合があるため簡易的に除去
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned) as DetectedSignal

    if (!parsed.detected) return { detected: false }

    return {
      detected: true,
      category: parsed.category,
      severity: parsed.severity ?? 'info',
      summary: parsed.summary ? scrubObviousPii(parsed.summary).slice(0, 60) : undefined,
    }
  } catch (err) {
    // Signal検知の失敗はチャット本体の応答を止めないよう、ログのみ出して安全側(未検知)に倒す
    console.error('[signal-detector] 検知処理でエラー:', err)
    return { detected: false }
  }
}
