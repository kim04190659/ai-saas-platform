// =====================================================
//  src/lib/yakushima-policy-engine.ts
//  屋久島町向け データ参照型 AI 施策エンジン — Sprint #46
//
//  ■ 従来エンジンとの違い
//    - 従来: 困り事テキストをClaudeに渡して一般論を生成
//    - 今回: Notionの実データ(5本のDB)を読んで数値を引用した提案を生成
//
//  ■ 処理の流れ
//    1. 5本の屋久島向けNotionDBを並行クエリ
//    2. 重要指標を抽出してコンテキスト文字列を作成
//    3. Claude Haikuにデータ付きプロンプトを送信
//    4. 「データに基づく提案」と「データ不足の指摘」を受け取る
//    5. Notionに施策提案レポートとして保存
// =====================================================

// ─── Notion DB ID（屋久島向け専用5本）────────────────────
const YAKUSHIMA_DB = {
  school:     '562a5136c2c64e42926c127df1ade099', // 📚 学校別児童生徒数推移DB
  ict:        '134897d2da734cff8f1bfcadcefe24db', // 💻 ICT環境整備状況DB
  population: '659d08de2d2f4c939eb7256cec33a838', // 👥 人口動態・地区別統計DB
  migration:  '3b27788f40204073a896c6e392525ea4', // 🏡 移住・定住実績DB
  tourism:    'd180f71cfc0942da986bf40e94495afc', // 🌿 観光統計・環境負荷DB
} as const

// Notion API の raw fetch で使うベースURL（@notionhq/client は未インストール）
const NOTION_API_BASE = 'https://api.notion.com/v1'

// ─── 型定義 ───────────────────────────────────────────────

/** Notion API のページオブジェクト（properties のみ使用） */
type NotionPage = {
  properties: Record<string, {
    type: string
    number?: number | null
    title?: Array<{ plain_text: string }>
    rich_text?: Array<{ plain_text: string }>
    select?: { name: string } | null
  }>
}

/** データに基づく施策提案 */
export type DataGroundedProposal = {
  category: string       // 例: 「学校小規模化対策」
  title: string          // 施策タイトル
  rationale: string      // データを引用した根拠文
  action: string         // 具体的なアクション
  urgency: 'immediate' | 'short' | 'medium'
  owner: string          // 担当部門
  dataEvidence: string[] // 引用した数値の配列
}

/** データ不足の指摘 */
export type DataGap = {
  category: string
  description: string   // 何のデータが不足しているか
  impact: string        // なぜそのデータが必要か
  howToCollect: string  // どうやって収集するか
}

/** エンジンの実行結果 */
export type YakushimaPolicyResult = {
  success: boolean
  error?: string
  dateLabel?: string
  dataContext?: {
    schoolSummary: string
    ictSummary: string
    populationSummary: string
    migrationSummary: string
    tourismSummary: string
  }
  proposals?: DataGroundedProposal[]
  dataGaps?: DataGap[]
  notionPage?: string
}

// ─── Notion ヘルパー ──────────────────────────────────────

/** ページのプロパティ値を取得する汎用関数 */
function getProp(page: NotionPage, key: string): string | number | null {
  const p = page.properties?.[key]
  if (!p) return null
  if (p.type === 'number')    return p.number ?? null
  if (p.type === 'title')     return p.title?.[0]?.plain_text ?? null
  if (p.type === 'rich_text') return p.rich_text?.[0]?.plain_text ?? null
  if (p.type === 'select')    return p.select?.name ?? null
  return null
}

/** NotionDBを全件クエリして results を返す */
async function queryDatabase(
  notionKey: string,
  dbId: string,
  filter?: object,
  sorts?: object[]
): Promise<NotionPage[]> {
  const body: Record<string, unknown> = { page_size: 100 }
  if (filter) body.filter = filter
  if (sorts)  body.sorts  = sorts

  const res = await fetch(`${NOTION_API_BASE}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) return []
  const data = await res.json() as { results?: NotionPage[] }
  return data.results ?? []
}

// ─── データ取得・集計 ─────────────────────────────────────

/**
 * 学校データを読んでサマリー文字列を作成
 * 安房小・宮之浦小・麦生小の最新年度と2020年を比較
 */
async function fetchSchoolSummary(notionKey: string): Promise<string> {
  const pages = await queryDatabase(notionKey, YAKUSHIMA_DB.school)
  if (!pages.length) return '学校データ: 取得できませんでした'

  // 学校別に年度でグループ化
  const bySchool: Record<string, Record<number, NotionPage>> = {}
  for (const p of pages) {
    const name = getProp(p, '学校名') as string | null
    const year = getProp(p, '年度')   as number | null
    if (!name || !year) continue
    if (!bySchool[name]) bySchool[name] = {}
    bySchool[name][year] = p
  }

  const lines: string[] = []
  for (const [school, years] of Object.entries(bySchool)) {
    const y2020 = years[2020]
    const y2025 = years[2025]
    if (!y2020 || !y2025) continue

    const base  = getProp(y2020, '児童生徒数合計') as number
    const curr  = getProp(y2025, '児童生徒数合計') as number
    const fukus = getProp(y2025, '複式学級数')     as number
    const pct   = Math.round((curr - base) / base * 100)
    lines.push(
      `${school}: 2020年${base}人 → 2025年${curr}人（${pct}%）` +
      `、複式学級数${fukus ?? '不明'}`
    )
  }
  return lines.length ? lines.join('\n') : '学校データ: データなし'
}

/**
 * ICTデータを読んでサマリーを作成
 * 最新年度（2025年）の安房小を中心に取得
 */
async function fetchIctSummary(notionKey: string): Promise<string> {
  const pages = await queryDatabase(notionKey, YAKUSHIMA_DB.ict, undefined, [
    { property: '年度', direction: 'descending' }
  ])
  if (!pages.length) return 'ICTデータ: 取得できませんでした'

  const lines: string[] = []
  for (const p of pages) {
    const target  = getProp(p, '対象')             as string | null
    const year    = getProp(p, '年度')             as number | null
    const wifi    = getProp(p, '家庭Wi-Fi普及率')  as number | null
    const hikari  = getProp(p, '光回線普及率')     as number | null
    const online  = getProp(p, 'オンライン授業実施回数') as number | null
    const issue   = getProp(p, '課題・不足点')     as string | null
    if (!target || !year) continue

    let line = `${target}（${year}年度）: 家庭Wi-Fi${wifi ?? '?'}%、光回線${hikari ?? '?'}%`
    if (online !== null) line += `、オンライン授業${online}回/年`
    if (issue) line += `\n  課題: ${issue}`
    lines.push(line)
  }
  return lines.length ? lines.join('\n') : 'ICTデータ: データなし'
}

/**
 * 人口動態データを読んでサマリーを作成
 */
async function fetchPopulationSummary(notionKey: string): Promise<string> {
  const pages = await queryDatabase(notionKey, YAKUSHIMA_DB.population)
  if (!pages.length) return '人口データ: 取得できませんでした'

  // 地区・年度別に整理
  const byArea: Record<string, Record<number, NotionPage>> = {}
  for (const p of pages) {
    const area = getProp(p, '地区') as string | null
    const year = getProp(p, '年度') as number | null
    if (!area || !year) continue
    if (!byArea[area]) byArea[area] = {}
    byArea[area][year] = p
  }

  const lines: string[] = []
  for (const [area, years] of Object.entries(byArea)) {
    const oldest = Math.min(...Object.keys(years).map(Number))
    const newest = Math.max(...Object.keys(years).map(Number))
    const base = years[oldest]
    const curr = years[newest]
    if (!base || !curr) continue

    const popBase  = getProp(base, '総人口')            as number
    const popCurr  = getProp(curr, '総人口')            as number
    const ageRate  = getProp(curr, '高齢化率')          as number
    const juvenile = getProp(curr, '年少人口_0_14歳')   as number

    lines.push(
      `${area}: ${oldest}年${popBase}人 → ${newest}年${popCurr}人` +
      `、高齢化率${ageRate ?? '?'}%、年少人口${juvenile ?? '?'}人`
    )
  }
  return lines.length ? lines.join('\n') : '人口データ: データなし'
}

/**
 * 移住定住データを読んでサマリーを作成
 * 2020年→最新年のトレンドを重視
 */
async function fetchMigrationSummary(notionKey: string): Promise<string> {
  const pages = await queryDatabase(notionKey, YAKUSHIMA_DB.migration, undefined, [
    { property: '年度', direction: 'ascending' }
  ])
  if (!pages.length) return '移住データ: 取得できませんでした'

  const first = pages[0]
  const last  = pages[pages.length - 1]

  const yr1   = getProp(first, '年度')                  as number
  const yr2   = getProp(last,  '年度')                  as number
  const rw1   = getProp(first, 'リモートワーク移住者数') as number
  const rw2   = getProp(last,  'リモートワーク移住者数') as number
  const cy1   = getProp(first, '子育て世帯数')           as number
  const cy2   = getProp(last,  '子育て世帯数')           as number
  const cons2 = getProp(last,  '相談件数')               as number
  const rate  = getProp(last,  '定住継続率_3年後')       as number

  return [
    `移住相談件数（最新）: ${cons2 ?? '?'}件、定住継続率: ${rate ?? '?'}%`,
    `リモートワーク移住者: ${yr1}年${rw1}人 → ${yr2}年${rw2}人` +
      (rw1 ? `（${Math.round(rw2 / rw1 * 10) / 10}倍）` : ''),
    `子育て世帯移住数: ${yr1}年${cy1}世帯 → ${yr2}年${cy2}世帯`,
  ].join('\n')
}

/**
 * 観光統計データを読んでサマリーを作成
 * 夏季ピーク（8月）と年間傾向を整理
 */
async function fetchTourismSummary(notionKey: string): Promise<string> {
  const pages = await queryDatabase(notionKey, YAKUSHIMA_DB.tourism, undefined, [
    { property: '月', direction: 'ascending' }
  ])
  if (!pages.length) return '観光データ: 取得できませんでした'

  let totalVisitors = 0
  let peakVisitors  = 0
  let peakMonth     = 0
  let totalRegDays  = 0    // 入山規制日数の合計
  let maxDamage     = 0    // 登山道損傷最大値

  for (const p of pages) {
    const visitors = getProp(p, '来訪者数合計')   as number | null
    const month    = getProp(p, '月')             as number | null
    const regDays  = getProp(p, '入山規制日数')   as number | null
    const damage   = getProp(p, '登山道損傷箇所数') as number | null

    if (visitors) {
      totalVisitors += visitors
      if (visitors > peakVisitors) { peakVisitors = visitors; peakMonth = month ?? 0 }
    }
    if (regDays) totalRegDays += regDays
    if (damage && damage > maxDamage) maxDamage = damage
  }

  // 最繁忙月のガイド同行率
  const aug = pages.find(p => getProp(p, '月') === 8)
  const augGuide = aug ? getProp(aug, 'ガイド同行率') as number : null

  return [
    `来訪者合計（集計分）: ${totalVisitors.toLocaleString()}人`,
    `ピーク月: ${peakMonth}月（${peakVisitors.toLocaleString()}人）`,
    `年間入山規制日数合計: ${totalRegDays}日`,
    `登山道損傷最大: ${maxDamage}箇所（8月）`,
    `8月ガイド同行率: ${augGuide ?? '?'}%（閑散期80%との差が課題）`,
  ].join('\n')
}

// ─── Claude Haiku による提案生成 ─────────────────────────

/**
 * データコンテキストを元にClaudeが施策提案とデータ不足指摘を生成
 */
async function generateDataGroundedProposals(
  dataContext: {
    schoolSummary: string
    ictSummary: string
    populationSummary: string
    migrationSummary: string
    tourismSummary: string
  },
  anthropicKey: string
): Promise<{ proposals: DataGroundedProposal[]; dataGaps: DataGap[] }> {

  const systemPrompt = `あなたは屋久島町の政策アドバイザーAIです。
提供されたデータに基づき、必ず具体的な数値を引用した施策提案と、データ不足の指摘を行ってください。
「一般的に」「他の自治体では」という表現は使わず、屋久島町の実データから提案してください。`

  const userPrompt = `以下は屋久島町の実データです。このデータを読んで施策提案とデータ不足の指摘をしてください。

## 学校データ
${dataContext.schoolSummary}

## ICTデータ
${dataContext.ictSummary}

## 人口動態データ
${dataContext.populationSummary}

## 移住定住データ
${dataContext.migrationSummary}

## 観光データ
${dataContext.tourismSummary}

---

以下のJSON形式で回答してください（コードブロックなし、JSONのみ）:
{
  "proposals": [
    {
      "category": "分類（例:学校小規模化対策・ICT活用・移住促進・観光管理など）",
      "title": "施策タイトル（30文字以内）",
      "rationale": "データを数値で引用した根拠（具体的な年数と数値を含める）",
      "action": "具体的なアクション（誰が何をするか）",
      "urgency": "immediate または short または medium",
      "owner": "担当部門（例:教育委員会・移住定住係・観光課）",
      "dataEvidence": ["引用した数値1", "引用した数値2"]
    }
  ],
  "dataGaps": [
    {
      "category": "分類",
      "description": "不足しているデータの説明",
      "impact": "このデータがあれば何がわかるか・できるか",
      "howToCollect": "収集方法（既存システム活用・アンケート・連携先など）"
    }
  ]
}

proposals は3〜5件、dataGaps は3〜5件で回答してください。`

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': anthropicKey,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 2000,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    }),
  })

  if (!res.ok) {
    console.error('[yakushima-policy] Claude API エラー:', await res.text())
    return { proposals: [], dataGaps: [] }
  }

  const data = await res.json() as {
    content: Array<{ type: string; text: string }>
  }
  const text = data.content?.[0]?.text ?? ''

  try {
    const parsed = JSON.parse(text) as {
      proposals?: DataGroundedProposal[]
      dataGaps?: DataGap[]
    }
    return {
      proposals: parsed.proposals ?? [],
      dataGaps:  parsed.dataGaps  ?? [],
    }
  } catch {
    console.error('[yakushima-policy] JSON パース失敗:', text.slice(0, 200))
    return { proposals: [], dataGaps: [] }
  }
}

// ─── Notion 保存 ──────────────────────────────────────────

/**
 * 施策提案レポートを屋久島町のNotionページ直下に保存
 */
async function savePolicyReport(
  proposals: DataGroundedProposal[],
  dataGaps: DataGap[],
  dataContext: {
    schoolSummary: string
    ictSummary: string
    populationSummary: string
    migrationSummary: string
    tourismSummary: string
  },
  notionKey: string,
  parentPageId: string,
  dateLabel: string
): Promise<string | null> {
  // ─── 施策提案のMarkdown部分を組み立て ───────────────
  const proposalsMd = proposals.map((p, i) =>
    `## ${i + 1}. [${p.urgency === 'immediate' ? '🔴 緊急' : p.urgency === 'short' ? '🟡 短期' : '🟢 中期'}] ${p.title}

**カテゴリ**: ${p.category}
**担当**: ${p.owner}

**根拠（データ引用）**
${p.rationale}

**具体的アクション**
${p.action}

**参照データ**
${p.dataEvidence.map(e => `- ${e}`).join('\n')}
`
  ).join('\n---\n\n')

  // ─── データ不足の指摘のMarkdown部分 ─────────────────
  const gapsMd = dataGaps.map((g, i) =>
    `## ${i + 1}. ${g.category}：${g.description}

**なぜ必要か**: ${g.impact}
**収集方法**: ${g.howToCollect}
`
  ).join('\n')

  const pageContent = `# 🧩 屋久島町 データ参照型施策提案レポート

> 生成日: ${dateLabel}
> RunWith Platform Sprint #46 — データに基づく政策提言

---

# 📊 今週の実データサマリー

## 学校データ
${dataContext.schoolSummary}

## ICTデータ
${dataContext.ictSummary}

## 人口動態データ
${dataContext.populationSummary}

## 移住定住データ
${dataContext.migrationSummary}

## 観光データ
${dataContext.tourismSummary}

---

# 💡 データに基づく施策提案

${proposalsMd}

---

# ⚠️ データ不足の指摘

以下のデータを蓄積することで、より精度の高い政策提言が可能になります。

${gapsMd}
`

  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${notionKey}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      parent: { page_id: parentPageId },
      properties: {
        title: {
          title: [{
            text: { content: `🧩 データ参照型施策提案 ${dateLabel}（屋久島町）` }
          }]
        }
      },
      children: [{
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{ type: 'text', text: { content: pageContent.slice(0, 1900) } }]
        }
      }]
    }),
  })

  if (!res.ok) {
    console.error('[yakushima-policy] Notion 保存エラー:', await res.text())
    return null
  }

  const saved = await res.json() as { url?: string }
  return saved.url ?? null
}

// ─── メインエントリーポイント ──────────────────────────────

/**
 * 屋久島町データ参照型AI施策エンジンを実行する
 *
 * @param notionKey      Notion API キー
 * @param anthropicKey   Anthropic API キー
 * @param parentPageId   屋久島町役場のNotionページID
 */
export async function runYakushimaPolicyEngine(
  notionKey: string,
  anthropicKey: string,
  parentPageId: string
): Promise<YakushimaPolicyResult> {
  const dateLabel = new Date().toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric'
  })

  console.log('[yakushima-policy] エンジン開始')

  try {
    // ── STEP 1: 5本のDBを並行クエリ ──────────────────────
    console.log('[yakushima-policy] STEP1: Notion DB 並行クエリ')
    const [
      schoolSummary,
      ictSummary,
      populationSummary,
      migrationSummary,
      tourismSummary,
    ] = await Promise.all([
      fetchSchoolSummary(notionKey),
      fetchIctSummary(notionKey),
      fetchPopulationSummary(notionKey),
      fetchMigrationSummary(notionKey),
      fetchTourismSummary(notionKey),
    ])

    const dataContext = {
      schoolSummary,
      ictSummary,
      populationSummary,
      migrationSummary,
      tourismSummary,
    }

    console.log('[yakushima-policy] STEP2: Claude Haiku に送信')

    // ── STEP 2: Claude Haiku で施策提案生成 ──────────────
    const { proposals, dataGaps } = await generateDataGroundedProposals(
      dataContext,
      anthropicKey
    )

    console.log(`[yakushima-policy] 提案${proposals.length}件 / ギャップ${dataGaps.length}件`)

    // ── STEP 3: Notion に保存 ─────────────────────────────
    const notionPage = await savePolicyReport(
      proposals,
      dataGaps,
      dataContext,
      notionKey,
      parentPageId,
      dateLabel
    )

    console.log('[yakushima-policy] 完了')

    return {
      success: true,
      dateLabel,
      dataContext,
      proposals,
      dataGaps,
      notionPage: notionPage ?? undefined,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[yakushima-policy] エラー:', msg)
    return { success: false, error: msg }
  }
}
