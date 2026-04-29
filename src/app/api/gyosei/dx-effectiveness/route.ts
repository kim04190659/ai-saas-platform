// =====================================================
//  src/app/api/gyosei/dx-effectiveness/route.ts
//  DX効果測定 API — Sprint #60
//
//  ■ 困りマトリクス起源:
//    「住民サービスの何をデジタル化すると最も効果的か
//      誤指標なく判断できない」（自治体 / 企画フェーズ）
//
//  ■ GET  /api/gyosei/dx-effectiveness?municipalityId=kirishima
//    → 住民相談DBのチャネル（LINE/窓口/電話）分布を
//      カテゴリ別に集計し、Claude HaikuがDX優先施策を提案する
//
//  ■ デジタル化率の定義
//    LINE・Web・メールなどデジタルチャネル経由の相談 ÷ 全相談
//    この率が低いカテゴリほど「デジタル化の余地が大きい」と判断
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic          from '@anthropic-ai/sdk'
import { getMunicipalityById }     from '@/config/municipalities'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ──────────────────────────────────────────

type NProps = Record<string, Record<string, unknown>>

const nSelect = (p: NProps, k: string): string =>
  (p[k]?.select as { name: string })?.name ?? ''
const nTitle  = (p: NProps, k: string): string =>
  (p[k]?.title  as Array<{ plain_text: string }>)?.[0]?.plain_text ?? ''
const nRich   = (p: NProps, k: string): string =>
  (p[k]?.rich_text as Array<{ plain_text: string }>)?.[0]?.plain_text ?? ''

/** カテゴリ別DXスコア */
export interface DxServiceScore {
  category:             string
  total:                number   // 相談総数
  digitalCount:         number   // デジタルチャネル数
  analogCount:          number   // アナログチャネル数
  digitalRate:          number   // デジタル化率 0〜100（%）
  improvementPotential: '高' | '中' | '低'  // 改善余地
}

/** API レスポンス全体 */
export interface DxEffectivenessResponse {
  status:             'success' | 'error'
  message?:           string
  municipalityId:     string
  municipal:          string
  updatedAt:          string
  overallDxScore:     number   // 全体デジタル化率（%）
  totalContacts:      number   // 分析対象の相談総数
  digitalContacts:    number   // うちデジタルチャネル数
  services:           DxServiceScore[]
  summary:            string   // Claude Haiku サマリー
  topRecommendations: string[] // 優先DX施策リスト（最大3件）
}

// ─── ヘルパー ─────────────────────────────────────────

/**
 * チャネルがデジタルかアナログかを判定
 * LINE・Web・メール・アプリ → デジタル
 * 窓口・電話・来庁 → アナログ
 */
function isDigital(channel: string): boolean {
  return ['LINE', 'Web', 'メール', 'アプリ', 'オンライン'].some(d =>
    channel.includes(d)
  )
}

/** improvementPotential を計算 */
function calcPotential(rate: number): DxServiceScore['improvementPotential'] {
  if (rate < 30) return '高'
  if (rate < 60) return '中'
  return '低'
}

// ─── Notion 相談データ取得 ─────────────────────────────

interface ConsultRow {
  channel:  string
  category: string
}

async function fetchConsultations(
  notionKey: string,
  dbId: string
): Promise<ConsultRow[]> {
  const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization':  `Bearer ${notionKey}`,
      'Content-Type':   'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({ page_size: 100 }),
  })
  if (!res.ok) {
    console.error(`[dx-effectiveness] Notion クエリ失敗: ${res.status}`)
    return []
  }

  const data = await res.json()
  const rows = (data.results ?? []) as Array<{ properties: NProps }>

  return rows.map(r => {
    const p = r.properties
    // フィールド名はDB設計によりブレがあるため複数候補で取得
    const channel =
      nSelect(p, 'チャネル') ||
      nSelect(p, '相談チャネル') ||
      nRich(p,   'チャネル') ||
      '不明'
    const category =
      nSelect(p, 'カテゴリ') ||
      nSelect(p, '相談カテゴリ') ||
      nRich(p,   'カテゴリ') ||
      nTitle(p,  '相談内容') ||  // タイトルをフォールバックに使用
      '未分類'
    return { channel, category }
  })
}

// ─── カテゴリ別集計 ───────────────────────────────────

function calcDxScores(records: ConsultRow[]): DxServiceScore[] {
  const map = new Map<string, { total: number; digital: number }>()

  for (const r of records) {
    // 不明・空のカテゴリはスキップ
    if (!r.category || r.category === '未分類' || r.category === '不明') continue

    const entry = map.get(r.category) ?? { total: 0, digital: 0 }
    entry.total++
    if (isDigital(r.channel)) entry.digital++
    map.set(r.category, entry)
  }

  return Array.from(map.entries())
    .map(([category, v]) => ({
      category,
      total:                v.total,
      digitalCount:         v.digital,
      analogCount:          v.total - v.digital,
      digitalRate:          Math.round((v.digital / v.total) * 100),
      improvementPotential: calcPotential(Math.round((v.digital / v.total) * 100)),
    }))
    // デジタル化率の低い順（改善余地の大きい順）にソート
    .sort((a, b) => a.digitalRate - b.digitalRate)
}

// ─── Claude Haiku 提言生成 ────────────────────────────

async function generateRecommendations(
  anthropicKey: string,
  municipalName: string,
  overallDxScore: number,
  digitalContacts: number,
  totalContacts: number,
  services: DxServiceScore[]
): Promise<{ summary: string; topRecommendations: string[] }> {
  if (!anthropicKey || services.length === 0) {
    return {
      summary: `${municipalName}の住民相談の全体デジタル化率は${overallDxScore}%です。`,
      topRecommendations: [],
    }
  }

  const client = new Anthropic({ apiKey: anthropicKey })

  // 上位5カテゴリのみをプロンプトに渡してトークン節約
  const top5 = services.slice(0, 5)

  const prompt = [
    `${municipalName}の住民相談チャネル分析（全${totalContacts}件）`,
    `全体デジタル化率: ${overallDxScore}%（${digitalContacts}件がLINE等デジタル）`,
    '',
    'カテゴリ別デジタル化率（低い順・改善余地が大きい順）:',
    top5.map(s =>
      `・${s.category}: ${s.digitalRate}%（${s.total}件中${s.digitalCount}件デジタル）改善余地:${s.improvementPotential}`
    ).join('\n'),
    '',
    '【出力形式（JSONのみ・説明文不要）】',
    '{"summary":"全体状況を2文以内","topRecommendations":["施策1（20文字以内）","施策2（20文字以内）","施策3（20文字以内）"]}',
  ].join('\n')

  try {
    const res = await client.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 400,
      messages:   [{ role: 'user', content: prompt }],
    })

    if (res.stop_reason === 'max_tokens') {
      console.warn('[dx-effectiveness] max_tokens に達した可能性があります')
    }

    const text = res.content[0]?.type === 'text' ? res.content[0].text.trim() : '{}'
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    const parsed   = jsonMatch ? JSON.parse(jsonMatch[0]) : {}

    return {
      summary:            parsed.summary            ?? `全体デジタル化率は${overallDxScore}%です。`,
      topRecommendations: Array.isArray(parsed.topRecommendations)
        ? parsed.topRecommendations.slice(0, 3)
        : [],
    }
  } catch (e) {
    console.error('[dx-effectiveness] Claude Haiku エラー:', e)
    return {
      summary: `${municipalName}の全体デジタル化率は${overallDxScore}%です。`,
      topRecommendations: [],
    }
  }
}

// ─── APIハンドラ ──────────────────────────────────────

export async function GET(req: NextRequest): Promise<NextResponse<DxEffectivenessResponse>> {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'

  const municipality   = getMunicipalityById(municipalityId)
  const municipalName  = municipality?.shortName ?? municipalityId
  const dbConf         = getMunicipalityDbConfig(municipalityId)

  if (!dbConf?.consultationDbId) {
    return NextResponse.json({
      status:             'error',
      message:            '住民相談DB IDが設定されていません（municipality-db-config.ts を確認）',
      municipalityId,
      municipal:          municipalName,
      updatedAt:          new Date().toISOString(),
      overallDxScore:     0,
      totalContacts:      0,
      digitalContacts:    0,
      services:           [],
      summary:            '',
      topRecommendations: [],
    }, { status: 500 })
  }

  try {
    // Notion から住民相談データを取得
    const records = await fetchConsultations(notionKey, dbConf.consultationDbId)

    // 全体集計
    const totalContacts   = records.length
    const digitalContacts = records.filter(r => isDigital(r.channel)).length
    const overallDxScore  = totalContacts > 0
      ? Math.round((digitalContacts / totalContacts) * 100)
      : 0

    // カテゴリ別DXスコア集計
    const services = calcDxScores(records)

    // Claude Haiku で提言生成
    const { summary, topRecommendations } = await generateRecommendations(
      anthropicKey, municipalName, overallDxScore, digitalContacts, totalContacts, services
    )

    return NextResponse.json({
      status: 'success',
      municipalityId,
      municipal:   municipalName,
      updatedAt:   new Date().toISOString(),
      overallDxScore,
      totalContacts,
      digitalContacts,
      services,
      summary,
      topRecommendations,
    })

  } catch (e) {
    console.error('[gyosei/dx-effectiveness GET] エラー:', e)
    return NextResponse.json({
      status:             'error',
      message:            e instanceof Error ? e.message : String(e),
      municipalityId,
      municipal:          municipalName,
      updatedAt:          new Date().toISOString(),
      overallDxScore:     0,
      totalContacts:      0,
      digitalContacts:    0,
      services:           [],
      summary:            '',
      topRecommendations: [],
    }, { status: 500 })
  }
}
