// =====================================================
//  src/lib/issue-policy-engine.ts
//  困り事 → 施策提案エンジン — Sprint #44
//
//  ■ 役割
//    Sprint #43 の住民困り事レーダーが Notion に蓄積した
//    「困り事レポート」を読み込み、
//
//    1. カテゴリ別に集計・ランキング化
//    2. 前回レポートとの比較でトレンドを検出
//       （新規 / 継続 / 増加 / 改善 / 解決）
//    3. Claude Sonnet が上位課題への具体的施策を提案
//    4. 「施策提案レポート」として Notion に保存
//    5. 担当職員に LINE で通知
//
//  ■ 呼び出し方
//    const result = await runIssuePolicyEngine(
//      notionKey, anthropicKey, lineToken,
//      '霧島市', parentPageId
//    )
// =====================================================

import Anthropic from '@anthropic-ai/sdk'

// ─── Notion API 定数（既存コードと同パターン） ────────
const NOTION_API_BASE = 'https://api.notion.com/v1'

// ─── 型定義 ──────────────────────────────────────────

/** カテゴリ別集計結果 */
export interface CategorySummary {
  category:    string
  count:       number        // 今回の件数
  prevCount:   number        // 前回の件数
  trend:       'new' | 'up' | 'stable' | 'down' | 'resolved'
  trendDelta:  number        // 増減数（+が増加・-が減少）
  criticalCount: number      // このカテゴリ内の緊急件数
  topIssues:   string[]      // 代表的な困り事（最大3件）
}

/** Claude が生成する施策提案 1 件 */
export interface PolicyProposal {
  category:    string        // 対象カテゴリ
  urgency:     'immediate' | 'short' | 'medium'
  title:       string        // 施策タイトル（30字以内）
  action:      string        // 具体的アクション（100字以内）
  owner:       string        // 担当課・係の候補
  effect:      string        // 期待される効果（50字以内）
  cost:        '無償' | '低コスト' | '予算検討要'
}

/** runIssuePolicyEngine の戻り値 */
export interface PolicyResult {
  success:        boolean
  dateLabel?:     string
  categorySummary?: CategorySummary[]
  proposals?:     PolicyProposal[]
  notionPage?:    { id: string; url: string } | null
  error?:         string
}

// ─── Notion ヘルパー ──────────────────────────────────

/** Notion API 共通ヘッダー */
function notionHeaders(key: string) {
  return {
    'Authorization':  `Bearer ${key}`,
    'Notion-Version': '2022-06-28',
    'Content-Type':   'application/json',
  }
}

// ─── Step 1: 困り事レポートを Notion から取得 ─────────

/**
 * 指定の自治体ページ直下にある「住民困り事レーダー」ページを
 * 最新 2 件（今回・前回）取得する。
 */
async function fetchRadarReports(
  notionKey:    string,
  parentPageId: string,
): Promise<{ current: string[]; previous: string[] }> {

  // 親ページの子ページ一覧を取得
  const res = await fetch(`${NOTION_API_BASE}/blocks/${parentPageId}/children?page_size=50`, {
    headers: notionHeaders(notionKey),
  })

  if (!res.ok) return { current: [], previous: [] }

  const data = await res.json() as {
    results: Array<{
      id:     string
      type:   string
      child_page?: { title: string }
    }>
  }

  // 「住民困り事レーダー」ページを絞り込んで新しい順に並べる
  const radarPages = data.results.filter(
    (b) => b.type === 'child_page' &&
           b.child_page?.title?.includes('住民困り事レーダー'),
  )

  // 最新2件のページ本文を取得
  async function fetchPageText(pageId: string): Promise<string[]> {
    const blocksRes = await fetch(`${NOTION_API_BASE}/blocks/${pageId}/children?page_size=100`, {
      headers: notionHeaders(notionKey),
    })
    if (!blocksRes.ok) return []

    const blocksData = await blocksRes.json() as {
      results: Array<{
        type: string
        bulleted_list_item?: { rich_text: Array<{ plain_text: string }> }
        paragraph?:          { rich_text: Array<{ plain_text: string }> }
        callout?:            { rich_text: Array<{ plain_text: string }> }
      }>
    }

    const texts: string[] = []
    for (const block of blocksData.results) {
      const richText =
        block.bulleted_list_item?.rich_text ??
        block.paragraph?.rich_text ??
        block.callout?.rich_text ?? []
      const text = richText.map((t) => t.plain_text).join('').trim()
      if (text.length > 10) texts.push(text)
    }
    return texts
  }

  const current  = radarPages[0] ? await fetchPageText(radarPages[0].id) : []
  const previous = radarPages[1] ? await fetchPageText(radarPages[1].id) : []

  return { current, previous }
}

// ─── Step 2: テキストからカテゴリを集計 ──────────────

/** 困り事テキスト行からカテゴリを抽出して件数を数える */
function countByCategory(lines: string[]): Record<string, { count: number; critical: number; issues: string[] }> {
  const CATEGORIES = [
    '道路・インフラ', 'ゴミ・環境', '子育て・教育', '高齢者・福祉',
    '防災・安全', '観光・交流', '行政手続き', '騒音・生活', 'その他',
  ]

  const result: Record<string, { count: number; critical: number; issues: string[] }> = {}
  for (const cat of CATEGORIES) {
    result[cat] = { count: 0, critical: 0, issues: [] }
  }

  for (const line of lines) {
    for (const cat of CATEGORIES) {
      if (line.includes(cat)) {
        result[cat].count++
        if (line.includes('🔴')) result[cat].critical++
        // 要約部分（| の後から — の前）を抽出
        const summaryMatch = line.match(/\|\s*(.+?)\s*—/)
        if (summaryMatch && result[cat].issues.length < 3) {
          result[cat].issues.push(summaryMatch[1].trim())
        }
        break
      }
    }
  }
  return result
}

/**
 * 今回・前回のテキストを比較してカテゴリ別サマリーを生成する。
 */
function buildCategorySummary(
  currentLines:  string[],
  previousLines: string[],
): CategorySummary[] {

  const curr = countByCategory(currentLines)
  const prev = countByCategory(previousLines)

  return Object.entries(curr)
    .map(([category, data]) => {
      const prevCount  = prev[category]?.count ?? 0
      const delta      = data.count - prevCount
      let trend: CategorySummary['trend'] = 'stable'

      if (previousLines.length === 0) {
        trend = 'new'          // 前回データなし → すべて新規
      } else if (data.count === 0 && prevCount > 0) {
        trend = 'resolved'     // 今回 0 件、前回あり → 解決
      } else if (delta > 1) {
        trend = 'up'           // 2件以上増加
      } else if (delta < -1) {
        trend = 'down'         // 2件以上減少（改善）
      }

      return {
        category,
        count:         data.count,
        prevCount,
        trend,
        trendDelta:    delta,
        criticalCount: data.critical,
        topIssues:     data.issues,
      }
    })
    .filter((s) => s.count > 0 || s.trend === 'resolved')
    .sort((a, b) => {
      // 緊急件数 → 総件数 → トレンド（増加優先）の順でソート
      if (b.criticalCount !== a.criticalCount) return b.criticalCount - a.criticalCount
      if (b.count !== a.count)                 return b.count - a.count
      return b.trendDelta - a.trendDelta
    })
}

// ─── Step 3: Claude で施策提案を生成 ─────────────────

/**
 * 上位課題を Claude Haiku に渡して施策提案を生成する。
 * モデルは Haiku を使いコストを抑える。
 */
async function generatePolicies(
  summary:          CategorySummary[],
  anthropicKey:     string,
  municipalityName: string,
): Promise<PolicyProposal[]> {

  if (!anthropicKey || summary.length === 0) return []

  const client = new Anthropic({ apiKey: anthropicKey })

  // 上位5カテゴリに絞る（コスト節約）
  const top5 = summary.slice(0, 5)

  const issueText = top5.map((s) => {
    const trendLabel = {
      new:      '🆕 新規',
      up:       `🔺 増加（+${s.trendDelta}件）`,
      stable:   '➡️ 継続',
      down:     `🔻 改善（${s.trendDelta}件）`,
      resolved: '✅ 解決',
    }[s.trend]

    return `【${s.category}】${trendLabel} / 今週${s.count}件（うち緊急${s.criticalCount}件）\n  代表例: ${s.topIssues.join('、') || 'なし'}`
  }).join('\n\n')

  const prompt = `あなたは${municipalityName}のDX推進担当です。
以下は今週の住民困り事の集計結果（上位5カテゴリ）です。

${issueText}

各カテゴリについて、自治体が実行できる具体的な施策を1件ずつ提案してください。
無償・低コストで実施できる施策を優先してください。

出力形式（JSON配列）:
[
  {
    "category": "カテゴリ名",
    "urgency": "immediate（今週中）| short（1ヶ月）| medium（3ヶ月）のいずれか",
    "title": "施策タイトル（25字以内）",
    "action": "具体的なアクション（90字以内）",
    "owner": "担当課・係の候補（例: 建設課道路係）",
    "effect": "期待される効果（40字以内）",
    "cost": "無償 | 低コスト | 予算検討要 のいずれか"
  }
]

JSON配列のみ出力し、他のテキストは含めないでください。`

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages:   [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') return []

    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as PolicyProposal[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ─── Step 4: LINE 通知 ────────────────────────────────

/** 施策提案サマリーを担当職員に LINE 送信する */
async function sendPolicyLineNotification(
  summary:          CategorySummary[],
  proposals:        PolicyProposal[],
  lineToken:        string,
  municipalityName: string,
  dateLabel:        string,
): Promise<void> {
  if (!lineToken || proposals.length === 0) return

  const top3 = proposals.slice(0, 3)
  const immediateCount = proposals.filter((p) => p.urgency === 'immediate').length
  const upCategories   = summary.filter((s) => s.trend === 'up').map((s) => s.category)

  const lines = [
    `📊 ${municipalityName} 週次施策提案レポート（${dateLabel}）`,
    '',
    `今週の困り事: ${summary.reduce((s, c) => s + c.count, 0)}件`,
    upCategories.length > 0 ? `🔺 増加中: ${upCategories.join('・')}` : '',
    immediateCount > 0 ? `⚡ 今週中に対応が必要な施策: ${immediateCount}件` : '',
    '',
    '【推奨施策 Top3】',
    ...top3.map((p, i) =>
      `${i + 1}. [${p.urgency === 'immediate' ? '⚡今週' : p.urgency === 'short' ? '📅1ヶ月' : '🗓️3ヶ月'}] ${p.title}（${p.owner}）`
    ),
    '',
    '詳細はNotionの施策提案レポートを確認してください',
  ].filter(Boolean).join('\n')

  try {
    await fetch('https://api.line.me/v2/bot/message/broadcast', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${lineToken}`,
      },
      body: JSON.stringify({
        messages: [{ type: 'text', text: lines }],
      }),
    })
  } catch (e) {
    console.warn('[issue-policy] LINE送信失敗（継続）:', e)
  }
}

// ─── Step 5: Notion に施策提案レポートを保存 ─────────

/** トレンドラベルの絵文字 */
function trendEmoji(trend: CategorySummary['trend']): string {
  return { new: '🆕', up: '🔺', stable: '➡️', down: '🔻', resolved: '✅' }[trend]
}

/** 緊急度ラベル */
function urgencyLabel(urgency: PolicyProposal['urgency']): string {
  return { immediate: '⚡今週中', short: '📅1ヶ月以内', medium: '🗓️3ヶ月以内' }[urgency]
}

async function savePolicyReport(
  summary:          CategorySummary[],
  proposals:        PolicyProposal[],
  notionKey:        string,
  parentPageId:     string,
  municipalityName: string,
  dateLabel:        string,
): Promise<{ id: string; url: string } | null> {

  if (!notionKey) return null

  const immediateProposals = proposals.filter((p) => p.urgency === 'immediate')
  const totalIssues        = summary.reduce((s, c) => s + c.count, 0)
  const upCount            = summary.filter((s) => s.trend === 'up').length
  const downCount          = summary.filter((s) => s.trend === 'down').length

  const children = [
    // ─ サマリー callout ─
    {
      object: 'block', type: 'callout',
      callout: {
        rich_text: [{
          type: 'text',
          text: { content: `📋 今週の困り事: ${totalIssues}件　🔺 増加カテゴリ: ${upCount}件　🔻 改善カテゴリ: ${downCount}件\n⚡ 今週中に対応が必要な施策: ${immediateProposals.length}件` },
        }],
        icon:  { type: 'emoji', emoji: '🎯' },
        color: 'green_background',
      },
    },
    { object: 'block', type: 'divider', divider: {} },

    // ─ カテゴリ別トレンド ─
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '📊 カテゴリ別トレンド' } }] },
    },
    ...summary.map((s) => ({
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: {
            content: `${trendEmoji(s.trend)} ${s.category}：今週${s.count}件（前回比${s.trendDelta >= 0 ? '+' : ''}${s.trendDelta}件、緊急${s.criticalCount}件）`,
          },
        }],
      },
    })),

    { object: 'block', type: 'divider', divider: {} },

    // ─ 施策提案 ─
    {
      object: 'block', type: 'heading_2',
      heading_2: { rich_text: [{ type: 'text', text: { content: '💡 AI施策提案' } }] },
    },
    ...proposals.map((p) => ({
      object: 'block', type: 'bulleted_list_item',
      bulleted_list_item: {
        rich_text: [{
          type: 'text',
          text: {
            content: `${urgencyLabel(p.urgency)}【${p.category}】${p.title}（担当: ${p.owner}、${p.cost}）\n　▶ ${p.action}\n　✨ 効果: ${p.effect}`,
          },
        }],
      },
    })),
  ]

  try {
    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        parent:     { page_id: parentPageId },
        properties: {
          title: {
            title: [{
              type: 'text',
              text: { content: `💡 施策提案レポート ${dateLabel} — ${municipalityName}` },
            }],
          },
        },
        children,
      }),
    })

    if (!res.ok) {
      console.error('[issue-policy] Notion保存失敗:', res.status)
      return null
    }

    const page = await res.json() as { id: string; url: string }
    return { id: page.id, url: page.url }
  } catch (e) {
    console.error('[issue-policy] Notion保存エラー:', e)
    return null
  }
}

// ─── メイン関数 ───────────────────────────────────────

/**
 * 困り事 → 施策提案サイクルのメイン処理。
 *
 * @param notionKey        Notion API キー
 * @param anthropicKey     Anthropic API キー
 * @param lineToken        LINE Channel Access Token（任意）
 * @param municipalityName 自治体名（例: '霧島市'）
 * @param parentPageId     自治体の Notion ページ ID
 */
export async function runIssuePolicyEngine(
  notionKey:        string,
  anthropicKey:     string,
  lineToken:        string,
  municipalityName: string,
  parentPageId:     string,
): Promise<PolicyResult> {

  console.log(`[issue-policy] 開始: ${municipalityName}`)

  const today     = new Date()
  const dateLabel = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`

  // ① Notion から今回・前回の困り事レポートを取得
  const { current, previous } = await fetchRadarReports(notionKey, parentPageId)
  console.log(`[issue-policy] レポート取得: 今回${current.length}行 / 前回${previous.length}行`)

  if (current.length === 0) {
    return {
      success: false,
      error:   '困り事レポートが見つかりません。先に住民困り事レーダーを実行してください。',
    }
  }

  // ② カテゴリ別集計・トレンド分析
  const categorySummary = buildCategorySummary(current, previous)
  console.log(`[issue-policy] カテゴリ集計: ${categorySummary.length}カテゴリ`)

  // ③ Claude で施策提案生成
  const proposals = await generatePolicies(categorySummary, anthropicKey, municipalityName)
  console.log(`[issue-policy] 施策提案: ${proposals.length}件`)

  // ④ Notion に施策提案レポートを保存
  const notionPage = await savePolicyReport(
    categorySummary, proposals, notionKey, parentPageId, municipalityName, dateLabel,
  )

  // ⑤ LINE 通知（トークンがある場合のみ）
  await sendPolicyLineNotification(
    categorySummary, proposals, lineToken, municipalityName, dateLabel,
  )

  return {
    success:         true,
    dateLabel,
    categorySummary,
    proposals,
    notionPage,
  }
}
