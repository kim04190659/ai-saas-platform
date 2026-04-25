// =====================================================
//  src/lib/citizen-radar.ts
//  住民困り事レーダー — Sprint #43
//
//  ■ 役割
//    インターネット上の住民の声（Q&Aサイト・ニュースRSS・
//    自治体HP・既存LINE相談）を無償で収集し、
//    Claude Haiku でカテゴリ分類・深刻度スコアリングする。
//
//  ■ データソース（すべて無償）
//    1. Google News RSS     — 地方紙・NHK記事
//    2. Yahoo 知恵袋        — 住民の生活相談
//    3. 教えて!goo          — 手続き・生活の困り事
//    4. 発言小町            — 地域コミュニティの声
//    5. 自治体HP（市民の声）— 公式意見窓口
//    6. LINE相談ログ        — Notion から取得（既存データ）
//
//  ■ 使い方
//    const result = await runCitizenRadar(
//      notionKey, anthropicKey, '霧島市', pageId
//    )
// =====================================================

import * as cheerio from 'cheerio'
import Anthropic from '@anthropic-ai/sdk'

// Notion は既存コードに合わせ raw fetch を使う（@notionhq/client は未導入）
const NOTION_API_BASE = 'https://api.notion.com/v1'

// ─── 型定義 ──────────────────────────────────────────

/** 収集した生テキスト 1 件 */
interface RawItem {
  text:   string   // 抽出したテキスト（タイトル + 本文）
  source: string   // 出典サイト名
  url?:   string   // 元URL（あれば）
}

/** Claude が出力する分類結果 1 件 */
export interface CitizenIssue {
  category:   '道路・インフラ' | 'ゴミ・環境' | '子育て・教育' | '高齢者・福祉' |
              '防災・安全' | '観光・交流' | '行政手続き' | '騒音・生活' | 'その他'
  severity:   'critical' | 'warning' | 'info'
  summary:    string   // 50字以内の要約
  detail:     string   // 詳細説明（100字以内）
  source:     string   // 出典
  url?:       string   // 元URL
  actionable: boolean  // 自治体が対処できるか
}

/** runCitizenRadar の戻り値 */
export interface CitizenRadarResult {
  success:      boolean
  issueCount?:  number
  issues?:      CitizenIssue[]
  notionPage?:  { id: string; url: string } | null
  error?:       string
}

// ─── 定数 ────────────────────────────────────────────

/** fetch タイムアウト（ms）。サイトが応答しない場合はスキップ */
const FETCH_TIMEOUT_MS = 8000

/** 1 サイトから取得するテキストの最大文字数（Claudeのコスト節約） */
const MAX_CHARS_PER_SOURCE = 3000

// ─── ユーティリティ ───────────────────────────────────

/**
 * タイムアウト付き fetch。失敗した場合は null を返す（例外をスローしない）。
 */
async function safeFetch(url: string, headers?: Record<string, string>): Promise<string | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    const res = await fetch(url, {
      signal:  controller.signal,
      headers: {
        // ブラウザと同じ User-Agent を名乗ることで弾かれにくくする
        'User-Agent':      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        'Accept-Language': 'ja,en;q=0.9',
        'Accept':          'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        ...headers,
      },
    })

    clearTimeout(timer)

    if (!res.ok) return null
    return await res.text()
  } catch {
    // タイムアウト・ネットワークエラーは静かにスキップ
    return null
  }
}

/** HTML からプレーンテキストを抽出し、最大文字数で切り詰める */
function extractText(html: string, selector: string, maxChars = MAX_CHARS_PER_SOURCE): string {
  const $ = cheerio.load(html)
  const texts: string[] = []

  $(selector).each((_, el) => {
    const t = $(el).text().replace(/\s+/g, ' ').trim()
    if (t.length > 10) texts.push(t)  // 10文字未満の断片は除外
  })

  return texts.join('\n').slice(0, maxChars)
}

// ─── データ収集モジュール ─────────────────────────────

/**
 * 【層1】Google News RSS から地域関連記事を収集する。
 * XML を直接パースするため cheerio 不要・最もシンプル。
 */
async function fetchGoogleNewsRSS(municipalityName: string): Promise<RawItem[]> {
  const queries = [
    municipalityName,
    `${municipalityName} 市民`,
    `${municipalityName} 問題`,
  ]

  const items: RawItem[] = []

  for (const q of queries) {
    const url  = `https://news.google.com/rss/search?q=${encodeURIComponent(q)}&hl=ja&gl=JP&ceid=JP:ja`
    const xml  = await safeFetch(url)
    if (!xml) continue

    // <item> ブロックを抽出
    const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/g) ?? []

    for (const block of itemBlocks.slice(0, 10)) {
      // タイトルと説明文を取り出す
      const titleMatch = block.match(/<title><!\[CDATA\[([\s\S]*?)\]\]><\/title>/) ??
                         block.match(/<title>([\s\S]*?)<\/title>/)
      const descMatch  = block.match(/<description><!\[CDATA\[([\s\S]*?)\]\]><\/description>/) ??
                         block.match(/<description>([\s\S]*?)<\/description>/)
      const linkMatch  = block.match(/<link>([\s\S]*?)<\/link>/)

      const title = titleMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''
      const desc  = descMatch?.[1]?.replace(/<[^>]+>/g, '').trim() ?? ''

      if (title) {
        items.push({
          text:   `${title} ${desc}`.slice(0, 500),
          source: 'Google News',
          url:    linkMatch?.[1]?.trim(),
        })
      }
    }
  }

  return items
}

/**
 * 【層2-A】Yahoo 知恵袋 から住民の質問・困り事を収集する。
 */
async function fetchYahooChiebukuro(municipalityName: string): Promise<RawItem[]> {
  const queries = [
    `${municipalityName} 困った`,
    `${municipalityName} 手続き`,
  ]

  const items: RawItem[] = []

  for (const q of queries) {
    const url  = `https://chiebukuro.yahoo.co.jp/search/?q=${encodeURIComponent(q)}&flg=3`
    const html = await safeFetch(url)
    if (!html) continue

    // 質問タイトルと本文の要素を抽出
    const text = extractText(
      html,
      'h2.QuestionItem_title__title__vgMSM, .QuestionItem_text__pWAaI, h2, p.question',
      MAX_CHARS_PER_SOURCE,
    )

    if (text.length > 50) {
      items.push({ text, source: 'Yahoo知恵袋', url })
    }
  }

  return items
}

/**
 * 【層2-B】教えて!goo から住民の質問・困り事を収集する。
 */
async function fetchOshieteGoo(municipalityName: string): Promise<RawItem[]> {
  const url  = `https://oshiete.goo.ne.jp/search/?q=${encodeURIComponent(municipalityName + ' 困った')}&from=OKW_ALL`
  const html = await safeFetch(url)
  if (!html) return []

  const text = extractText(html, '.question-title, .qa-item-title, h2, h3', MAX_CHARS_PER_SOURCE)
  if (text.length < 50) return []

  return [{ text, source: '教えて!goo', url }]
}

/**
 * 【層2-C】発言小町 から地域コミュニティの声を収集する。
 */
async function fetchKomachi(municipalityName: string): Promise<RawItem[]> {
  const url  = `https://komachi.yomiuri.co.jp/search/?q=${encodeURIComponent(municipalityName)}`
  const html = await safeFetch(url)
  if (!html) return []

  const text = extractText(html, '.topic-title, .msg, h2, p', MAX_CHARS_PER_SOURCE)
  if (text.length < 50) return []

  return [{ text, source: '発言小町', url }]
}

/**
 * 【層3】自治体公式HP の「市民の声」ページを取得する。
 * 各自治体のURLパターンに対応（ハードコードではなくドメイン推測）。
 */
async function fetchCityHp(municipalityName: string): Promise<RawItem[]> {
  // 霧島市・屋久島町など主要自治体のHPパターン
  const cityHpUrls: Record<string, string> = {
    '霧島市':  'https://www.city-kirishima.jp/shimin/voice/',
    '屋久島町': 'https://www.yakushima.org/',
  }

  const url = cityHpUrls[municipalityName]
  if (!url) return []

  const html = await safeFetch(url)
  if (!html) return []

  const text = extractText(html, 'article, .content, main, p', MAX_CHARS_PER_SOURCE)
  if (text.length < 50) return []

  return [{ text, source: '自治体公式HP', url }]
}

/**
 * 【層4】既存 LINE 相談ログを Notion から取得する。
 * Sprint #28 以降に蓄積されたデータを活用する。
 * 既存コードに合わせ raw fetch で Notion API を呼ぶ。
 */
async function fetchLineConsultationsFromNotion(
  notionKey:        string,
  municipalityName: string,
): Promise<RawItem[]> {
  if (!notionKey) return []

  try {
    // LINE相談に関連するDBをキーワード検索
    const searchRes = await fetch(`${NOTION_API_BASE}/search`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        query:  municipalityName,
        filter: { value: 'database', property: 'object' },
      }),
    })

    if (!searchRes.ok) return []

    const searchData = await searchRes.json() as {
      results: Array<{
        object: string
        id:     string
        title?: Array<{ plain_text: string }>
      }>
    }

    // LINE相談に関連するDBを探す
    const lineDb = searchData.results.find((r) => {
      if (r.object !== 'database') return false
      return r.title?.some((t) => t.plain_text.includes('LINE') || t.plain_text.includes('相談'))
    })

    if (!lineDb) return []

    // 直近30件の相談を取得
    const queryRes = await fetch(`${NOTION_API_BASE}/databases/${lineDb.id}/query`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify({
        page_size: 30,
        sorts:     [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!queryRes.ok) return []

    const queryData = await queryRes.json() as {
      results: Array<{
        object:     string
        properties: Record<string, {
          type:       string
          rich_text?: Array<{ plain_text: string }>
          title?:     Array<{ plain_text: string }>
        }>
      }>
    }

    const items: RawItem[] = []
    for (const page of queryData.results) {
      if (page.object !== 'page') continue

      for (const prop of Object.values(page.properties)) {
        const texts = prop.rich_text ?? prop.title ?? []
        const text  = texts.map((t) => t.plain_text).join(' ').trim()
        if (text.length > 20) {
          items.push({ text, source: 'LINE相談ログ' })
          break
        }
      }
    }

    return items
  } catch {
    // Notion接続失敗はスキップ（他ソースは継続）
    return []
  }
}

// ─── Claude 分析エンジン ──────────────────────────────

/**
 * 収集した生テキスト群を Claude Haiku に渡し、
 * 構造化された「住民困り事リスト」として返す。
 */
async function analyzeWithClaude(
  rawItems:         RawItem[],
  anthropicKey:     string,
  municipalityName: string,
): Promise<CitizenIssue[]> {
  if (!anthropicKey || rawItems.length === 0) return []

  const client = new Anthropic({ apiKey: anthropicKey })

  // 収集テキストを1つにまとめて渡す（コスト削減）
  const combinedText = rawItems
    .map((item, i) => `[${i + 1}] 出典:${item.source}\n${item.text}`)
    .join('\n\n---\n\n')
    .slice(0, 12000)  // トークン上限に合わせて切り詰め

  const prompt = `あなたは自治体DX担当のAIアシスタントです。
以下のテキストは「${municipalityName}」に関してインターネット上で収集した
住民の投稿・質問・ニュース記事です。

住民が困っている内容・要望・問題を抽出し、JSON配列として出力してください。

[収集テキスト]
${combinedText}

出力形式（JSON配列）:
[
  {
    "category": "道路・インフラ|ゴミ・環境|子育て・教育|高齢者・福祉|防災・安全|観光・交流|行政手続き|騒音・生活|その他" のいずれか,
    "severity": "critical|warning|info" のいずれか,
    "summary": "困り事の要約（40字以内）",
    "detail": "詳細説明（80字以内）",
    "source": "出典サイト名",
    "actionable": true か false
  }
]

判定基準:
- critical: 安全・健康・インフラ緊急（道路陥没・不法投棄・災害など）
- warning: 繰り返し・複数件・改善が必要（収集日未定・騒音・手続き不便など）
- info: 要望・意見・情報提供レベル

重複する内容はまとめて1件にしてください。
住民の困り事でない内容（広告・無関係記事）は除外してください。
JSON配列のみ出力し、他のテキストは含めないでください。`

  try {
    const message = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 2048,
      messages:   [{ role: 'user', content: prompt }],
    })

    const content = message.content[0]
    if (content.type !== 'text') return []

    // JSON部分を抽出してパース
    const jsonMatch = content.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as CitizenIssue[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

// ─── Notion 保存 ─────────────────────────────────────

/**
 * 分析結果を Notion に「住民困り事レポート」として保存する。
 */
async function saveRadarReport(
  issues:           CitizenIssue[],
  notionKey:        string,
  parentPageId:     string,
  municipalityName: string,
  dateLabel:        string,
): Promise<{ id: string; url: string } | null> {
  if (!notionKey) return null

  try {
    // 深刻度別カウント
    const criticalCount = issues.filter((i) => i.severity === 'critical').length
    const warningCount  = issues.filter((i) => i.severity === 'warning').length

    // カテゴリ別集計
    const categoryCount: Record<string, number> = {}
    for (const issue of issues) {
      categoryCount[issue.category] = (categoryCount[issue.category] ?? 0) + 1
    }
    const topCategories = Object.entries(categoryCount)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([cat, cnt]) => `${cat}（${cnt}件）`)
      .join('・')

    // Notion API へ直接 POST（既存コードと同パターン）
    const body = {
      parent:     { page_id: parentPageId },
      properties: {
        title: {
          title: [{
            type: 'text',
            text: { content: `🎯 住民困り事レーダー ${dateLabel} — ${municipalityName}` },
          }],
        },
      },
      children: [
        // サマリー callout
        {
          object: 'block',
          type:   'callout',
          callout: {
            rich_text: [{
              type: 'text',
              text: { content: `🔴 緊急 ${criticalCount}件　🟡 注意 ${warningCount}件　🟢 情報 ${issues.length - criticalCount - warningCount}件\nトップカテゴリ: ${topCategories || 'なし'}` },
            }],
            icon:  { type: 'emoji', emoji: '📊' },
            color: 'blue_background',
          },
        },
        // 区切り線
        { object: 'block', type: 'divider', divider: {} },
        // 困り事一覧ヘッダー
        {
          object: 'block',
          type:   'heading_2',
          heading_2: {
            rich_text: [{ type: 'text', text: { content: '📋 収集した困り事一覧' } }],
          },
        },
        // 各困り事をバレットリストで出力
        ...issues.map((issue) => ({
          object: 'block',
          type:   'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{
              type: 'text',
              text: {
                content: `[${issue.severity === 'critical' ? '🔴' : issue.severity === 'warning' ? '🟡' : '🟢'}] ${issue.category} | ${issue.summary} — ${issue.detail}（出典: ${issue.source}）`,
              },
            }],
          },
        })),
      ],
    }

    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type':   'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      console.error('[citizen-radar] Notion保存失敗:', res.status, await res.text())
      return null
    }

    const page = await res.json() as { id: string; url: string }
    return { id: page.id, url: page.url }

  } catch (e) {
    console.error('[citizen-radar] Notion保存エラー:', e)
    return null
  }
}

// ─── メイン関数 ───────────────────────────────────────

/**
 * 住民困り事レーダーのメイン処理。
 * 複数ソースからテキストを収集し、Claude で分析して Notion に保存する。
 *
 * @param notionKey        Notion API キー
 * @param anthropicKey     Anthropic API キー
 * @param municipalityName 自治体名（例: '霧島市'）
 * @param parentPageId     保存先 Notion ページ ID
 */
export async function runCitizenRadar(
  notionKey:        string,
  anthropicKey:     string,
  municipalityName: string,
  parentPageId:     string,
): Promise<CitizenRadarResult> {
  console.log(`[citizen-radar] 収集開始: ${municipalityName}`)

  // ① 各ソースから並行してデータ収集
  // 失敗したソースは空配列を返す（全体は止まらない）
  const [
    newsItems,
    chiebukuroItems,
    gooItems,
    komachiItems,
    cityHpItems,
    lineItems,
  ] = await Promise.all([
    fetchGoogleNewsRSS(municipalityName),
    fetchYahooChiebukuro(municipalityName),
    fetchOshieteGoo(municipalityName),
    fetchKomachi(municipalityName),
    fetchCityHp(municipalityName),
    fetchLineConsultationsFromNotion(notionKey, municipalityName),
  ])

  const allItems = [
    ...newsItems,
    ...chiebukuroItems,
    ...gooItems,
    ...komachiItems,
    ...cityHpItems,
    ...lineItems,
  ]

  console.log(`[citizen-radar] 収集件数: ${allItems.length}件（ニュース${newsItems.length} / 知恵袋${chiebukuroItems.length} / goo${gooItems.length} / 小町${komachiItems.length} / 市HP${cityHpItems.length} / LINE${lineItems.length}）`)

  if (allItems.length === 0) {
    return { success: false, error: 'データを収集できませんでした' }
  }

  // ② Claude Haiku で分類・分析
  const issues = await analyzeWithClaude(allItems, anthropicKey, municipalityName)
  console.log(`[citizen-radar] 抽出困り事: ${issues.length}件`)

  // ③ Notion に保存
  const today      = new Date()
  const dateLabel  = `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日`
  const notionPage = await saveRadarReport(
    issues, notionKey, parentPageId, municipalityName, dateLabel,
  )

  return {
    success:     true,
    issueCount:  issues.length,
    issues,
    notionPage,
  }
}
