// =====================================================
//  src/lib/yakushima-resident-coach-engine.ts
//  屋久島町 住民個人AIコーチ エンジン — Sprint #48
//
//  住民相談DBから相談履歴を取得し、住民ごとに
//  Claude Haiku が Well-Being スコアと個別コーチング
//  メッセージを生成して住民WBコーチングDBに保存する。
// =====================================================

// ── DB定数 ─────────────────────────────────────────
const CONSULTATION_DB_ID = 'a4826a3c83d24d74a6f60b955f87454a'   // 住民相談DB
const COACHING_DB_ID     = 'a610367ac47b48a996eae41d72ac821e'   // 住民WBコーチングDB
const NOTION_API         = 'https://api.notion.com/v1'

// ── 型定義 ─────────────────────────────────────────

/** 住民相談DB の1レコード */
export type ConsultationRecord = {
  id:       string
  相談名:   string
  住民ID:   string
  相談日:   string | null
  相談カテゴリ: string
  相談内容: string
  担当職員: string
  解決状況: string
}

/** 住民WBコーチングDB の1レコード */
export type ResidentRecord = {
  id:         string
  url?:       string
  住民名:     string
  住民ID:     string
  地区:       string
  WBスコア:   number | null
  主な課題:   string
  AIコーチングメッセージ: string
  相談回数:   number | null
  コーチングステータス: string
}

/** コーチング結果（1住民分） */
export type CoachingResult = {
  residentId: string
  住民名:     string
  WBスコア:   number
  主な課題:   string
  AIコーチングメッセージ: string
  success:    boolean
  error?:     string
}

/** 全住民コーチング実行の戻り値 */
export type RunCoachingResult = {
  success:     boolean
  processed:   number
  results:     CoachingResult[]
  error?:      string
}

// ── Notion ヘルパー ────────────────────────────────

/** Notion API 共通ヘッダー */
function notionHeaders(key: string) {
  return {
    Authorization:   `Bearer ${key}`,
    'Notion-Version': '2022-06-28',
    'Content-Type':  'application/json',
  }
}

/** rich_text プロパティからテキストを取り出す */
function richText(prop: { rich_text?: { plain_text: string }[] } | undefined): string {
  return prop?.rich_text?.map(r => r.plain_text).join('') ?? ''
}

/** title プロパティからテキストを取り出す */
function titleText(prop: { title?: { plain_text: string }[] } | undefined): string {
  return prop?.title?.map(r => r.plain_text).join('') ?? ''
}

/** select プロパティから値を取り出す */
function selectVal(prop: { select?: { name: string } | null } | undefined): string {
  return prop?.select?.name ?? ''
}

/** date プロパティから開始日を取り出す */
function dateStart(prop: { date?: { start: string } | null } | undefined): string | null {
  return prop?.date?.start ?? null
}

/** number プロパティから値を取り出す */
function numberVal(prop: { number?: number | null } | undefined): number | null {
  return prop?.number ?? null
}

// ── データ取得 ────────────────────────────────────

/** 住民相談DB から全件取得 */
export async function fetchAllConsultations(
  notionKey: string
): Promise<ConsultationRecord[]> {
  const results: ConsultationRecord[] = []
  let cursor: string | undefined

  // ページネーションループ（Notionは最大100件/回）
  while (true) {
    const body: Record<string, unknown> = {
      page_size: 100,
      sorts: [{ property: '相談日', direction: 'ascending' }],
    }
    if (cursor) body.start_cursor = cursor

    const res = await fetch(`${NOTION_API}/databases/${CONSULTATION_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify(body),
    })
    if (!res.ok) break

    const data = await res.json() as {
      results: { id: string; properties: Record<string, unknown> }[]
      has_more: boolean
      next_cursor?: string
    }

    for (const page of data.results) {
      const p = page.properties as Record<string, {
        rich_text?: { plain_text: string }[]
        title?:     { plain_text: string }[]
        select?:    { name: string } | null
        date?:      { start: string } | null
      }>

      results.push({
        id:         page.id,
        相談名:      titleText(p['相談名']),
        住民ID:      richText(p['住民ID']),
        相談日:      dateStart(p['相談日']),
        相談カテゴリ: selectVal(p['相談カテゴリ']),
        相談内容:    richText(p['相談内容']),
        担当職員:    richText(p['担当職員']),
        解決状況:    selectVal(p['解決状況']),
      })
    }

    if (!data.has_more) break
    cursor = data.next_cursor
  }

  return results
}

/** 住民WBコーチングDB から全件取得 */
export async function fetchResidents(
  notionKey: string
): Promise<ResidentRecord[]> {
  const res = await fetch(`${NOTION_API}/databases/${COACHING_DB_ID}/query`, {
    method: 'POST',
    headers: notionHeaders(notionKey),
    body: JSON.stringify({ page_size: 100 }),
  })
  if (!res.ok) return []

  const data = await res.json() as {
    results: { id: string; url?: string; properties: Record<string, unknown> }[]
  }

  return data.results.map(page => {
    const p = page.properties as Record<string, {
      rich_text?: { plain_text: string }[]
      title?:     { plain_text: string }[]
      select?:    { name: string } | null
      date?:      { start: string } | null
      number?:    number | null
    }>

    return {
      id:         page.id,
      住民名:      titleText(p['住民名']),
      住民ID:      richText(p['住民ID']),
      地区:        selectVal(p['地区']),
      WBスコア:    numberVal(p['WBスコア']),
      主な課題:    richText(p['主な課題']),
      AIコーチングメッセージ: richText(p['AIコーチングメッセージ']),
      相談回数:    numberVal(p['相談回数']),
      コーチングステータス: selectVal(p['コーチングステータス']),
    }
  })
}

// ── AI コーチング生成 ──────────────────────────────

/**
 * Claude Haiku に1住民分のコーチングを依頼する
 * 返却形式: { wbScore: number, 主な課題: string, coachingMessage: string }
 */
async function generateCoaching(
  anthropicKey: string,
  resident: ResidentRecord,
  consultations: ConsultationRecord[]
): Promise<{ wbScore: number; 主な課題: string; coachingMessage: string } | null> {

  // 相談履歴をテキスト化（プロンプトに埋め込む）
  const consultationText = consultations.map((c, i) =>
    `[相談${i + 1}] ${c.相談日 ?? '日付不明'} ` +
    `カテゴリ:${c.相談カテゴリ} 解決状況:${c.解決状況}\n` +
    `内容: ${c.相談内容}`
  ).join('\n\n')

  const prompt = `
あなたは屋久島町の住民Well-Being支援AIコーチです。
以下の住民情報と相談履歴を分析し、JSON形式で回答してください。

【住民情報】
- 住民ID: ${resident.住民ID}
- 地区: ${resident.地区}
- 相談回数: ${consultations.length}回

【相談履歴】
${consultationText}

【タスク】
1. WBスコア（1〜10）: この住民の現在のウェルビーイング水準を推定してください。
   - 解決済みの相談が多い → スコア高め
   - 継続中・複合的な問題 → スコア低め
   - メンタルヘルス系は特に低く評価
2. 主な課題（100字以内）: 最も優先度の高い課題を簡潔に記述
3. コーチングメッセージ（200〜300字）:
   - 職員が住民に寄り添うための具体的な次のアクションを提案
   - 「〜してみましょう」「〜を確認しましょう」などの行動形式で記述
   - 住民の強みや既に解決できた点も評価する
   - 専門用語を避け、温かみのある言葉で

必ずJSON形式のみで回答してください:
{
  "wbScore": <数値>,
  "主な課題": "<文字列>",
  "coachingMessage": "<文字列>"
}
`.trim()

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key':         anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type':      'application/json',
    },
    body: JSON.stringify({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 512,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) return null

  const data = await res.json() as {
    content?: { type: string; text: string }[]
  }
  const text = data.content?.find(b => b.type === 'text')?.text ?? ''

  // JSON を取り出す（コードブロックがある場合も対応）
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return null

  try {
    const parsed = JSON.parse(match[0]) as {
      wbScore: number
      主な課題: string
      coachingMessage: string
    }
    return {
      wbScore:        Math.min(10, Math.max(1, Math.round(parsed.wbScore))),
      主な課題:       parsed['主な課題'] ?? '',
      coachingMessage: parsed.coachingMessage ?? '',
    }
  } catch {
    return null
  }
}

// ── Notion 更新 ───────────────────────────────────

/** 住民WBコーチングDB の1レコードを更新する */
async function updateResidentCoaching(
  notionKey:      string,
  pageId:         string,
  wbScore:        number,
  mainIssue:      string,
  coaching:       string,
  consultCount:   number
): Promise<boolean> {
  const today = new Date().toISOString().split('T')[0]

  const res = await fetch(`${NOTION_API}/pages/${pageId}`, {
    method: 'PATCH',
    headers: notionHeaders(notionKey),
    body: JSON.stringify({
      properties: {
        'WBスコア':   { number: wbScore },
        '主な課題':   { rich_text: [{ text: { content: mainIssue } }] },
        'AIコーチングメッセージ': { rich_text: [{ text: { content: coaching } }] },
        '相談回数':   { number: consultCount },
        '最終更新日': { date: { start: today } },
        'コーチングステータス': { select: { name: '最新' } },
      },
    }),
  })

  return res.ok
}

// ── メインエクスポート ────────────────────────────

/**
 * 1住民のコーチングを実行する
 * @param residentId 対象の住民ID（例: 'YAK-001'）
 */
export async function runCoachingForResident(
  notionKey:    string,
  anthropicKey: string,
  residentId:   string
): Promise<CoachingResult> {
  // 相談履歴と住民情報を並列取得
  const [consultations, residents] = await Promise.all([
    fetchAllConsultations(notionKey),
    fetchResidents(notionKey),
  ])

  const resident = residents.find(r => r.住民ID === residentId)
  if (!resident) {
    return { residentId, 住民名: '', WBスコア: 0, 主な課題: '', AIコーチングメッセージ: '', success: false, error: '住民が見つかりません' }
  }

  const myConsultations = consultations.filter(c => c.住民ID === residentId)

  // AIコーチング生成
  const coaching = await generateCoaching(anthropicKey, resident, myConsultations)
  if (!coaching) {
    return { residentId, 住民名: resident.住民名, WBスコア: 0, 主な課題: '', AIコーチングメッセージ: '', success: false, error: 'AI生成に失敗' }
  }

  // Notion更新
  const ok = await updateResidentCoaching(
    notionKey,
    resident.id,
    coaching.wbScore,
    coaching.主な課題,
    coaching.coachingMessage,
    myConsultations.length
  )

  return {
    residentId,
    住民名:   resident.住民名,
    WBスコア: coaching.wbScore,
    主な課題: coaching.主な課題,
    AIコーチングメッセージ: coaching.coachingMessage,
    success: ok,
    error:   ok ? undefined : 'Notion更新失敗',
  }
}

/**
 * 全住民のコーチングを一括実行する
 * （API負荷軽減のため逐次処理）
 */
export async function runCoachingForAll(
  notionKey:    string,
  anthropicKey: string
): Promise<RunCoachingResult> {
  const [consultations, residents] = await Promise.all([
    fetchAllConsultations(notionKey),
    fetchResidents(notionKey),
  ])

  if (residents.length === 0) {
    return { success: false, processed: 0, results: [], error: '住民データが取得できません' }
  }

  const results: CoachingResult[] = []

  for (const resident of residents) {
    const myConsultations = consultations.filter(c => c.住民ID === resident.住民ID)

    const coaching = await generateCoaching(anthropicKey, resident, myConsultations)
    if (!coaching) {
      results.push({
        residentId: resident.住民ID,
        住民名:      resident.住民名,
        WBスコア:   0,
        主な課題:    '',
        AIコーチングメッセージ: '',
        success:    false,
        error:      'AI生成失敗',
      })
      continue
    }

    const ok = await updateResidentCoaching(
      notionKey,
      resident.id,
      coaching.wbScore,
      coaching.主な課題,
      coaching.coachingMessage,
      myConsultations.length
    )

    results.push({
      residentId: resident.住民ID,
      住民名:      resident.住民名,
      WBスコア:   coaching.wbScore,
      主な課題:   coaching.主な課題,
      AIコーチングメッセージ: coaching.coachingMessage,
      success:    ok,
      error:      ok ? undefined : 'Notion更新失敗',
    })
  }

  return {
    success:   results.some(r => r.success),
    processed: results.filter(r => r.success).length,
    results,
  }
}
