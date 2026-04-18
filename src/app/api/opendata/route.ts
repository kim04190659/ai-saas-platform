// =====================================================
//  src/app/api/opendata/route.ts
//  オープンデータ連携・提案書生成エンジン — Sprint #17
//
//  ■ 役割
//    e-Stat API（人口動態）＋Notion蓄積データ＋Web的知識を
//    Claude APIが統合分析し、自治体向け導入提案書をNotionに自動生成する。
//
//  ■ データフロー
//    e-Stat API（人口動態）
//      ↓
//    /api/opendata（このファイル）
//      ↓
//    Notion自治体データ（過去情報）＋ Claude知識（現在情報）
//      ↓
//    Claude APIが提案書を生成
//      ↓
//    Notionに提案書ページとして保存
//
//  ■ リクエスト形式
//    POST { "cityName": "みらい市", "cityCode": "01234" }
//    cityCode は省略可（省略時はe-Statデータなしで生成）
//
//  ■ 環境変数
//    ESTAT_API_KEY  : e-Stat APIキー（未設定でも動作、その旨を提案書に記載）
//    ANTHROPIC_API_KEY: 設定済み
//    NOTION_API_KEY  : 設定済み
//
//  ■ 提案書保存先
//    親ページID: 30e960a9-1e23-8118-aa8b-ce863fa11b44
//    （🌱 RunWith Platform | Well-Being × SDL × 自治体DX）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const ESTAT_API_BASE  = 'https://api.e-stat.go.jp/rest/3.0/app/json'

// e-Stat 統計表ID: 住民基本台帳に基づく人口・人口動態・世帯数
const ESTAT_STATS_ID  = '0003148303'

// 提案書の保存先（🌱 新RunWith Platform — ワークOSインテグレーション共有済み）
// 旧: 30e960a9-1e23-8118-aa8b-ce863fa11b44（RunWith Platform最上位ページ）
const PROPOSAL_PARENT_PAGE_ID = '338960a9-1e23-813f-9402-f53e5240e029'

// Notion DB: 自治体プロフィール（参照用）
const MUNICIPALITY_PROFILE_DB = 'c3f85e81-a1db-4df8-8fbe-db91a5e1bed9'

// ─── ヘルパー ─────────────────────────────────────────

function notionHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── e-Stat データ取得 ────────────────────────────────

/**
 * e-Stat APIから人口動態データを取得する。
 * APIキー未設定の場合はnullを返す（提案書生成はフォールバックで続行）。
 */
async function fetchEstatData(
  cityCode: string,
  apiKey:   string,
): Promise<Record<string, unknown> | null> {
  try {
    // e-Stat API: 統計データ取得
    // cdAreaで市区町村コードを指定して絞り込む
    const url = new URL(`${ESTAT_API_BASE}/getStatsData`)
    url.searchParams.set('appId',       apiKey)
    url.searchParams.set('statsDataId', ESTAT_STATS_ID)
    url.searchParams.set('cdArea',      cityCode)
    url.searchParams.set('limit',       '20')
    url.searchParams.set('metaGetFlg',  'Y')

    const res = await fetch(url.toString())
    if (!res.ok) return null

    const data = await res.json()
    // e-Stat APIのエラーレスポンスを確認
    if (data.GET_STATS_DATA?.RESULT?.STATUS !== 0) return null

    return data.GET_STATS_DATA as Record<string, unknown>
  } catch (e) {
    console.error('[opendata] e-Stat取得エラー:', e)
    return null
  }
}

/**
 * e-Statデータから人口サマリーを抽出してテキスト化する。
 */
function summarizeEstatData(estatData: Record<string, unknown> | null, cityCode: string): string {
  if (!estatData) {
    return `e-Stat APIデータ: 未取得（APIキー未設定またはエラー）。市区町村コード: ${cityCode || '未指定'}`
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const statsData = (estatData as any).STATISTICAL_DATA
    const datainf   = statsData?.DATA_INF?.VALUE ?? []
    const total     = Array.isArray(datainf) ? datainf.length : 0

    return `e-Stat 住民基本台帳データ: ${total}件取得。統計表ID: ${ESTAT_STATS_ID}、市区町村コード: ${cityCode}`
  } catch {
    return `e-Stat データ取得済み（詳細解析エラー）`
  }
}

// ─── Notion自治体データ取得 ───────────────────────────

/**
 * Notionの自治体プロフィールDBから関連データを取得する。
 * 取得失敗はサイレント処理し、空文字を返す。
 */
async function fetchNotionMunicipalityData(
  cityName: string,
  apiKey:   string,
): Promise<string> {
  try {
    // 自治体名でDBを検索
    const res = await fetch(`${NOTION_API_BASE}/databases/${MUNICIPALITY_PROFILE_DB}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body: JSON.stringify({
        filter: {
          property: '自治体名',
          title:    { contains: cityName },
        },
        page_size: 1,
      }),
    })

    if (!res.ok) return ''
    const data = await res.json()

    if (!data.results?.length) return ''

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const page = data.results[0] as any
    const p    = page.properties

    // プロフィール情報をテキストに整形
    const lines = [
      `自治体名: ${p['自治体名']?.title?.[0]?.plain_text ?? cityName}`,
      `人口: ${p['人口']?.number ?? '不明'}人`,
      `高齢化率: ${p['高齢化率']?.number ?? '不明'}%`,
      `財政力指数: ${p['財政力指数']?.number ?? '不明'}`,
      `課題: ${p['主要課題']?.rich_text?.[0]?.plain_text ?? ''}`,
    ].filter(l => !l.endsWith('不明') && !l.endsWith(''))

    return lines.join('\n')
  } catch (e) {
    console.error('[opendata] Notion自治体データ取得エラー:', e)
    return ''
  }
}

// ─── 提案書生成プロンプト ─────────────────────────────

function buildProposalPrompt(
  cityName:      string,
  estatSummary:  string,
  notionProfile: string,
): string {
  return `あなたはRunWith Platform（中堅企業・自治体向けITナレッジエンジン）の導入コンサルタントです。
以下の情報をもとに、${cityName}向けの導入提案書を作成してください。

【利用可能なデータ】
${estatSummary}
${notionProfile ? `\n【自治体プロフィール（Notion）】\n${notionProfile}` : ''}

【RunWith Platform の概要】
- 目的: 住民と職員が共創し、Well-Beingな街をつくる基盤プラットフォーム
- 3つの柱: Well-Being（幸福度）× SDL（価値共創）× 自治体DX
- 主要機能: 職員WBスコア管理 / LINE相談ログ管理 / AI政策提言 / オープンデータ連携
- 実績: 先行自治体（未来町）でWBスコアが3年間で57点→78点に改善

【提案書の構成（必ず以下の見出しで作成）】

# 📋 ${cityName} 導入提案書

## 1. エグゼクティブサマリー
（3〜5文で${cityName}の現状課題とRunWith導入による解決の全体像を述べる）

## 2. ${cityName}の現状と社会課題
（人口・高齢化・財政・住民サービスの観点から現状を分析する）

## 3. RunWith Platform 導入提案
（3つの柱をどう適用するか、具体的に説明する）

## 4. 期待される効果
（定量的な目標値を含めて3〜5点述べる）

## 5. 導入ロードマップ（6ヶ月）
（フェーズ1〜3に分けて具体的なステップを示す）

## 6. 次のアクション（3つ）
（明日から始められる具体的なアクションを3つ示す）

【注意事項】
- 専門用語は避け、町長・議会が理解できる言葉で書く
- 数値目標は現実的な範囲で設定する
- SDL（サービス・ドミナント・ロジック）の考え方を自然に組み込む
- 文体は丁寧かつ前向き`
}

// ─── 提案書をNotionに保存 ────────────────────────────

/**
 * 生成した提案書テキストをNotionページとして保存する。
 * 1回のAPI呼び出しで親ページ配下にページを作成する。
 */
async function saveProposalToNotion(
  notionApiKey: string,
  cityName:     string,
  proposalText: string,
  today:        string,
): Promise<{ url: string; id: string }> {
  // 提案書テキストをNotionのブロック形式に変換
  // 最大2000文字のrich_textブロックに分割して保存
  const chunkSize  = 1900
  const textChunks: string[] = []
  for (let i = 0; i < proposalText.length; i += chunkSize) {
    textChunks.push(proposalText.slice(i, i + chunkSize))
  }

  const children = textChunks.map(chunk => ({
    object: 'block',
    type:   'paragraph',
    paragraph: {
      rich_text: [{ type: 'text', text: { content: chunk } }],
    },
  }))

  const res = await fetch(`${NOTION_API_BASE}/pages`, {
    method:  'POST',
    headers: notionHeaders(notionApiKey),
    body: JSON.stringify({
      parent: { page_id: PROPOSAL_PARENT_PAGE_ID },
      icon:   { type: 'emoji', emoji: '📋' },
      properties: {
        title: {
          title: [{ text: { content: `📋 ${cityName} 導入提案書 | ${today}` } }],
        },
      },
      // 提案書の本文をブロックとして追加
      children,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Notion保存エラー: ${errText}`)
  }

  const page = await res.json()
  return { url: page.url, id: page.id }
}

// ─── POST ハンドラ ────────────────────────────────────

export async function POST(req: NextRequest) {
  const notionApiKey    = process.env.NOTION_API_KEY
  const anthropicApiKey = process.env.ANTHROPIC_API_KEY
  const estatApiKey     = process.env.ESTAT_API_KEY   // 任意（未設定でも動作）

  if (!notionApiKey)    return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' },    { status: 500 })
  if (!anthropicApiKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY が未設定です' }, { status: 500 })

  try {
    const body = await req.json()
    const cityName: string = body.cityName ?? ''
    const cityCode: string = body.cityCode ?? ''

    if (!cityName.trim()) {
      return NextResponse.json({ error: 'cityName が必要です' }, { status: 400 })
    }

    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: '2-digit', day: '2-digit' })

    // ── Step 1: e-Stat データ取得（APIキー設定済みの場合のみ） ──
    let estatData: Record<string, unknown> | null = null
    if (estatApiKey && cityCode) {
      estatData = await fetchEstatData(cityCode, estatApiKey)
    }
    const estatSummary = summarizeEstatData(estatData, cityCode)

    // ── Step 2: Notion自治体プロフィールを取得 ──
    const notionProfile = await fetchNotionMunicipalityData(cityName, notionApiKey)

    // ── Step 3: Claude APIで提案書を生成 ──
    const anthropic = new Anthropic({ apiKey: anthropicApiKey })
    const prompt    = buildProposalPrompt(cityName, estatSummary, notionProfile)

    const aiResponse = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      system:     'あなたは自治体DXの専門コンサルタントです。提案書は日本語で作成してください。',
      messages:   [{ role: 'user', content: prompt }],
    })

    const proposalText = aiResponse.content[0].type === 'text'
      ? aiResponse.content[0].text
      : '（提案書生成に失敗しました）'

    // ── Step 4: Notionに提案書を保存 ──
    const { url: notionUrl, id: pageId } = await saveProposalToNotion(
      notionApiKey,
      cityName,
      proposalText,
      today,
    )

    return NextResponse.json({
      success:     true,
      cityName,
      pageId,
      notionUrl,
      proposalText,
      dataSource: {
        estat:  estatData ? 'e-Stat APIデータ取得済み' : 'e-Stat APIデータなし（キー未設定またはcityCode未指定）',
        notion: notionProfile ? 'Notion自治体プロフィールあり' : 'Notion自治体プロフィールなし',
      },
    })

  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    console.error('[opendata] エラー:', message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

// ─── GET ハンドラ（使い方確認用） ─────────────────────

export async function GET() {
  return NextResponse.json({
    status:      'ok',
    sprint:      '#17',
    description: 'e-Stat API＋Notion蓄積データ＋Claude APIで自治体向け提案書を自動生成',
    usage: {
      method:      'POST',
      contentType: 'application/json',
      body: {
        cityName: '自治体名（必須）例: "みらい市"',
        cityCode: '市区町村コード（任意）例: "47209"（屋久島町）',
      },
      example: {
        curl: `curl -X POST https://ai-saas-platform-gules.vercel.app/api/opendata -H "Content-Type: application/json" -d '{"cityName": "屋久島町", "cityCode": "47209"}'`,
      },
    },
    envVars: {
      ESTAT_API_KEY:     process.env.ESTAT_API_KEY ? '✅ 設定済み' : '❌ 未設定（APIキー登録が必要: https://api.e-stat.go.jp）',
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ? '✅ 設定済み' : '❌ 未設定',
      NOTION_API_KEY:    process.env.NOTION_API_KEY    ? '✅ 設定済み' : '❌ 未設定',
    },
  })
}
