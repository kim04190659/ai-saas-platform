// =====================================================
//  src/app/api/gyosei/migration-risk/route.ts
//  移住定着リスクスコアリング API — Sprint #64
//
//  ■ GET /api/gyosei/migration-risk?municipalityId=yakushima
//
//  農山村・限界集落型自治体の課題：
//  「移住者が1年以内に離村してしまう」
//
//  移住相談DBの各レコードに対して「定着リスクスコア」を算出。
//  スコアが高い順（=リスクが高い順）にソートし、
//  担当職員が早期フォローすべき移住者を特定できるようにする。
//
//  ■ リスクスコアリング設計（0〜100点：高いほどリスク大）
//    就農・就業状況:
//      就業なし/未定   → +40点
//      就農・就業済み  →   0点
//    世帯構成:
//      単身            → +25点
//      家族・夫婦      →   0点
//    定住補助金申請:
//      未申請          → +20点
//      申請中/支給決定 →   0点
//    進捗ステータス:
//      移住準備中      → +10点（まだ移住前）
//      移住済み        →  +5点（定着確認前）
//      断念            → +15点（離村判定）
//      定住確定        →   0点
//    移住動機:
//      試してみたい/雰囲気が好き → +5点
//      その他          →   0点
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ──────────────────────────────────────────

/** リスクスコア付き移住相談レコード */
export interface MigrationRiskRecord {
  id:            string
  name:          string
  consultDate:   string
  origin:        string
  ageGroup:      string
  householdType: string
  motivation:    string
  status:        string
  occupation:    string
  subsidyStatus: string
  staffName:     string
  /** 定着リスクスコア（0〜100、高いほど要フォロー） */
  riskScore:     number
  /** リスクランク */
  riskRank:      'HIGH' | 'MID' | 'LOW'
  /** リスク要因のリスト */
  riskFactors:   string[]
}

export interface MigrationRiskResponse {
  status:          'success' | 'error'
  message?:        string
  municipalityId:  string
  municipal:       string
  records:         MigrationRiskRecord[]
  summary: {
    total:          number
    highRisk:       number   // スコア60以上
    midRisk:        number   // スコア30〜59
    lowRisk:        number   // スコア30未満
    settled:        number   // 定住確定
    dropped:        number   // 断念
  }
  aiRecommendations: string[]
}

// ─── Notion プロパティ取得ヘルパー ─────────────────────

type NotionProps = Record<string, Record<string, unknown>>
const getTitle  = (p: NotionProps, k: string) =>
  (p[k]?.title    as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''
const getSelect = (p: NotionProps, k: string) =>
  (p[k]?.select   as {name:string})?.name ?? ''
const getDate   = (p: NotionProps, k: string) =>
  (p[k]?.date     as {start:string})?.start ?? ''
const getRich   = (p: NotionProps, k: string) =>
  (p[k]?.rich_text as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''

// ─── リスクスコア算出 ─────────────────────────────────

function calcRiskScore(record: {
  status:        string
  occupation:    string
  householdType: string
  subsidyStatus: string
  motivation:    string
}): { score: number; factors: string[] } {
  let score   = 0
  const factors: string[] = []

  // ① 就農・就業状況
  if (['就業なし', '未定', ''].includes(record.occupation)) {
    score += 40
    factors.push('就業先が未確定（+40点）')
  }

  // ② 世帯構成
  if (record.householdType === '単身') {
    score += 25
    factors.push('単身移住（+25点）')
  }

  // ③ 定住補助金申請
  if (!['申請中', '支給決定', '受給済み'].includes(record.subsidyStatus)) {
    score += 20
    factors.push('補助金未申請（+20点）')
  }

  // ④ 進捗ステータス
  if (record.status === '断念') {
    score += 15
    factors.push('断念ステータス（+15点）')
  } else if (record.status === '移住準備中') {
    score += 10
    factors.push('まだ移住前・準備段階（+10点）')
  } else if (record.status === '移住済み') {
    score += 5
    factors.push('移住済みだが定住確定前（+5点）')
  }

  // ⑤ 移住動機（試し系はリスク高め）
  if (['試してみたい', '雰囲気が好き', '憧れ'].includes(record.motivation)) {
    score += 5
    factors.push('試し移住的動機（+5点）')
  }

  // スコアを0〜100に収める
  const clamped = Math.min(100, Math.max(0, score))
  return { score: clamped, factors }
}

function toRiskRank(score: number): 'HIGH' | 'MID' | 'LOW' {
  if (score >= 60) return 'HIGH'
  if (score >= 30) return 'MID'
  return 'LOW'
}

// ─── Claude Haiku でフォロー提言を生成 ──────────────

async function generateRecommendations(
  municipal:    string,
  highRiskCount: number,
  total:         number,
  topFactors:    string[],
): Promise<string[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  if (!anthropicKey || highRiskCount === 0) return []

  const prompt = [
    `${municipal}の移住定着支援担当者へ。`,
    `全${total}名中${highRiskCount}名が定着リスク高（スコア60以上）です。`,
    `主なリスク要因: ${topFactors.slice(0, 3).join('、')}`,
    '',
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"recommendations":["施策1（30字以内）","施策2（30字以内）","施策3（30字以内）"]}',
    '※ JSONのみ。説明文不要。移住定着を促進する具体的な職員アクションを3つ。',
  ].join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 4096,
        messages:   [{ role: 'user', content: prompt }],
      }),
    })
    if (!res.ok) throw new Error(`Anthropic ${res.status}`)
    const data    = await res.json()
    const raw     = (data.content?.[0]?.text ?? '{}').replace(/```json|```/g, '').trim()
    const parsed  = JSON.parse(raw) as { recommendations: string[] }
    return parsed.recommendations ?? []
  } catch (e) {
    console.error('[migration-risk] AI提言エラー:', e)
    return []
  }
}

// ─── メインハンドラ ─────────────────────────────────

export async function GET(req: NextRequest) {
  const notionKey      = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'yakushima'

  const municipality   = getMunicipalityById(municipalityId)
  const municipalName  = municipality?.shortName ?? municipalityId
  const dbConf         = getMunicipalityDbConfig(municipalityId)

  if (!dbConf?.migrationDbId) {
    return NextResponse.json({
      status:   'error',
      message:  `${municipalityId} に移住相談DBが設定されていません`,
      municipalityId,
      municipal: municipalName,
      records:  [],
      summary:  { total: 0, highRisk: 0, midRisk: 0, lowRisk: 0, settled: 0, dropped: 0 },
      aiRecommendations: [],
    }, { status: 404 })
  }

  try {
    // ── Notionから全移住相談レコードを取得 ──────────────
    const res = await fetch(`${NOTION_API}/databases/${dbConf.migrationDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({
        sorts:     [{ property: '相談日', direction: 'descending' }],
        page_size: 50,
      }),
    })

    if (!res.ok) throw new Error(`Notion API error: ${res.status}`)

    const data = await res.json()
    const rows = (data.results ?? []) as Array<{ id: string; properties: NotionProps }>

    // ── レコードをリスクスコア付きで変換 ────────────────
    const records: MigrationRiskRecord[] = rows.map(r => {
      const p           = r.properties
      const status      = getSelect(p, '進捗ステータス')
      const occupation  = getSelect(p, '就農・就業状況')
      const household   = getSelect(p, '世帯構成')
      const subsidy     = getSelect(p, '定住補助金申請')
      const motivation  = getSelect(p, '移住動機')

      const { score, factors } = calcRiskScore({ status, occupation, householdType: household, subsidyStatus: subsidy, motivation })

      return {
        id:            r.id,
        name:          getTitle(p,  '相談者名'),
        consultDate:   getDate(p,   '相談日'),
        origin:        getRich(p,   '出身地'),
        ageGroup:      getSelect(p, '年代'),
        householdType: household,
        motivation,
        status,
        occupation,
        subsidyStatus: subsidy,
        staffName:     getRich(p,   '担当職員'),
        riskScore:     score,
        riskRank:      toRiskRank(score),
        riskFactors:   factors,
      }
    })

    // ── リスクスコア降順にソート ─────────────────────
    records.sort((a, b) => b.riskScore - a.riskScore)

    // ── サマリー計算 ──────────────────────────────────
    const summary = {
      total:    records.length,
      highRisk: records.filter(r => r.riskRank === 'HIGH').length,
      midRisk:  records.filter(r => r.riskRank === 'MID').length,
      lowRisk:  records.filter(r => r.riskRank === 'LOW').length,
      settled:  records.filter(r => r.status === '定住確定').length,
      dropped:  records.filter(r => r.status === '断念').length,
    }

    // ── 主要リスク要因を集計（AI提言に渡す用） ──────────
    const factorCounter: Record<string, number> = {}
    records.filter(r => r.riskRank === 'HIGH').forEach(r => {
      r.riskFactors.forEach(f => {
        factorCounter[f] = (factorCounter[f] ?? 0) + 1
      })
    })
    const topFactors = Object.entries(factorCounter)
      .sort((a, b) => b[1] - a[1])
      .map(([f]) => f)

    // ── AI提言生成 ─────────────────────────────────
    const aiRecommendations = await generateRecommendations(
      municipalName,
      summary.highRisk,
      summary.total,
      topFactors,
    )

    return NextResponse.json({
      status: 'success',
      municipalityId,
      municipal: municipalName,
      records,
      summary,
      aiRecommendations,
    } satisfies MigrationRiskResponse)

  } catch (e) {
    console.error('[migration-risk GET] エラー:', e)
    return NextResponse.json({
      status:   'error',
      message:  e instanceof Error ? e.message : String(e),
      municipalityId,
      municipal: municipalName,
      records:  [],
      summary:  { total: 0, highRisk: 0, midRisk: 0, lowRisk: 0, settled: 0, dropped: 0 },
      aiRecommendations: [],
    }, { status: 500 })
  }
}
