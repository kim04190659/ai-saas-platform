// =====================================================
//  src/app/api/gyosei/visit-priority/route.ts
//  往診優先順位AI API — Sprint #65
//
//  ■ GET /api/gyosei/visit-priority?municipalityId=goto
//
//  離島・高齢化型自治体の課題：
//  「限られた医師が誰を優先して往診すべきか判断できない」
//
//  往診管理DBの各患者に「優先度スコア」を算出し、
//  今週訪問すべき患者を担当医が一目で把握できるようにする。
//
//  ■ スコアリング設計（0〜100点：高いほど今週優先）
//    年齢:
//      90歳以上    → +30点
//      85〜89歳   → +20点
//      80〜84歳   → +15点
//      75〜79歳   → +10点
//      75歳未満    →   0点
//    基礎疾患数:
//      3つ以上    → +20点
//      2つ        → +10点
//      1つ        →  +5点
//    世帯状況:
//      独居        → +20点
//      高齢者夫婦のみ → +10点
//      家族同居    →   0点
//    要介護度:
//      要介護5     → +20点
//      要介護4     → +15点
//      要介護3     → +10点
//      要介護2     →  +5点
//      要介護1以下  →   0点
//    緊急フラグ:
//      緊急        → +30点
//      要注意      → +15点
//      通常        →   0点
//    前回往診からの経過日数:
//      60日以上   → +20点
//      30〜59日   → +15点
//      14〜29日   →  +8点
//      7〜13日    →  +3点
//      7日未満    →   0点
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ──────────────────────────────────────────

/** 優先度スコア付き往診患者レコード */
export interface VisitPriorityRecord {
  id:              string
  name:            string
  age:             number
  lastVisitDate:   string
  /** 前回往診からの経過日数 */
  daysSinceVisit:  number
  area:            string
  householdType:   string
  careLevel:       string
  conditions:      string
  conditionCount:  number
  urgencyFlag:     string
  doctorName:      string
  notes:           string
  /** 優先度スコア（0〜100、高いほど今週往診を優先） */
  priorityScore:   number
  /** 優先度ランク */
  priorityRank:    'URGENT' | 'HIGH' | 'MID' | 'LOW'
  /** スコアの内訳 */
  scoreFactors:    string[]
}

export interface VisitPriorityResponse {
  status:           'success' | 'error'
  message?:         string
  municipalityId:   string
  municipal:        string
  records:          VisitPriorityRecord[]
  summary: {
    total:          number
    urgent:         number   // スコア80以上（緊急対応）
    high:           number   // スコア50〜79（今週必須）
    mid:            number   // スコア25〜49（今週対応推奨）
    low:            number   // スコア25未満（経過観察）
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
const getNumber = (p: NotionProps, k: string) =>
  (p[k]?.number as number) ?? 0

// ─── 優先度スコア算出 ─────────────────────────────────

function calcPriorityScore(record: {
  age:            number
  conditionCount: number
  householdType:  string
  careLevel:      string
  urgencyFlag:    string
  lastVisitDate:  string
}): { score: number; factors: string[] } {
  let score   = 0
  const factors: string[] = []

  // ① 年齢
  if (record.age >= 90) {
    score += 30
    factors.push(`${record.age}歳（+30点）`)
  } else if (record.age >= 85) {
    score += 20
    factors.push(`${record.age}歳（+20点）`)
  } else if (record.age >= 80) {
    score += 15
    factors.push(`${record.age}歳（+15点）`)
  } else if (record.age >= 75) {
    score += 10
    factors.push(`${record.age}歳（+10点）`)
  }

  // ② 基礎疾患数
  if (record.conditionCount >= 3) {
    score += 20
    factors.push(`基礎疾患${record.conditionCount}つ（+20点）`)
  } else if (record.conditionCount === 2) {
    score += 10
    factors.push(`基礎疾患${record.conditionCount}つ（+10点）`)
  } else if (record.conditionCount === 1) {
    score += 5
    factors.push(`基礎疾患${record.conditionCount}つ（+5点）`)
  }

  // ③ 世帯状況
  if (record.householdType === '独居') {
    score += 20
    factors.push('独居（+20点）')
  } else if (record.householdType === '高齢者夫婦のみ') {
    score += 10
    factors.push('高齢者夫婦のみ（+10点）')
  }

  // ④ 要介護度
  if (record.careLevel === '要介護5') {
    score += 20
    factors.push('要介護5（+20点）')
  } else if (record.careLevel === '要介護4') {
    score += 15
    factors.push('要介護4（+15点）')
  } else if (record.careLevel === '要介護3') {
    score += 10
    factors.push('要介護3（+10点）')
  } else if (record.careLevel === '要介護2') {
    score += 5
    factors.push('要介護2（+5点）')
  }

  // ⑤ 緊急フラグ（最大の加点）
  if (record.urgencyFlag === '緊急') {
    score += 30
    factors.push('緊急フラグ（+30点）')
  } else if (record.urgencyFlag === '要注意') {
    score += 15
    factors.push('要注意フラグ（+15点）')
  }

  // ⑥ 前回往診からの経過日数
  if (record.lastVisitDate) {
    const lastVisit  = new Date(record.lastVisitDate)
    const today      = new Date()
    const diffMs     = today.getTime() - lastVisit.getTime()
    const diffDays   = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays >= 60) {
      score += 20
      factors.push(`前回往診${diffDays}日前（+20点）`)
    } else if (diffDays >= 30) {
      score += 15
      factors.push(`前回往診${diffDays}日前（+15点）`)
    } else if (diffDays >= 14) {
      score += 8
      factors.push(`前回往診${diffDays}日前（+8点）`)
    } else if (diffDays >= 7) {
      score += 3
      factors.push(`前回往診${diffDays}日前（+3点）`)
    }
  }

  // スコアを0〜100に収める
  const clamped = Math.min(100, Math.max(0, score))
  return { score: clamped, factors }
}

function toPriorityRank(score: number): 'URGENT' | 'HIGH' | 'MID' | 'LOW' {
  if (score >= 80) return 'URGENT'
  if (score >= 50) return 'HIGH'
  if (score >= 25) return 'MID'
  return 'LOW'
}

// ─── 前回往診からの経過日数を計算 ─────────────────────

function calcDaysSinceVisit(lastVisitDate: string): number {
  if (!lastVisitDate) return 0
  const lastVisit = new Date(lastVisitDate)
  const today     = new Date()
  const diffMs    = today.getTime() - lastVisit.getTime()
  return Math.floor(diffMs / (1000 * 60 * 60 * 24))
}

// ─── Claude Haiku で往診スケジュール提言を生成 ──────────

async function generateRecommendations(
  municipal:     string,
  urgentCount:   number,
  total:         number,
  topFactors:    string[],
): Promise<string[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  if (!anthropicKey || urgentCount === 0) return []

  const prompt = [
    `${municipal}の在宅医療担当医・看護師へ。`,
    `全${total}名中${urgentCount}名が今週緊急往診が必要です。`,
    `主な状況: ${topFactors.slice(0, 3).join('、')}`,
    '',
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"recommendations":["提言1（30字以内）","提言2（30字以内）","提言3（30字以内）"]}',
    '※ JSONのみ。説明文不要。離島・高齢化型自治体の在宅医療スタッフへの具体的なアクションを3つ。',
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
    const data   = await res.json()
    const raw    = (data.content?.[0]?.text ?? '{}').replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(raw) as { recommendations: string[] }
    if (data.stop_reason === 'max_tokens') {
      console.warn('[visit-priority] max_tokens に達しました')
    }
    return parsed.recommendations ?? []
  } catch (e) {
    console.error('[visit-priority] AI提言エラー:', e)
    return []
  }
}

// ─── メインハンドラ ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const notionKey        = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'goto'

  const municipality  = getMunicipalityById(municipalityId)
  const municipalName = municipality?.shortName ?? municipalityId
  const dbConf        = getMunicipalityDbConfig(municipalityId)

  if (!dbConf?.visitDbId) {
    return NextResponse.json({
      status:   'error',
      message:  `${municipalityId} に往診管理DBが設定されていません`,
      municipalityId,
      municipal: municipalName,
      records:  [],
      summary:  { total: 0, urgent: 0, high: 0, mid: 0, low: 0 },
      aiRecommendations: [],
    }, { status: 404 })
  }

  try {
    // ── Notionから全往診患者レコードを取得 ─────────────
    // ── Notionから全往診患者レコードを取得 ─────────────
    const res = await fetch(`${NOTION_API}/databases/${dbConf.visitDbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({
        // ※ '最終往診日'（旧手動作成DB）と '前回往診日'（ウィザード自動作成DB）で
        //   プロパティ名が異なるため、プロパティ sort は使わず created_time で代用する。
        //   最終的な表示順序は priorityScore 降順（下記 records.sort）で決まるため問題なし。
        sorts:     [{ timestamp: 'created_time', direction: 'descending' }],
        page_size: 50,
      }),
    })

    if (!res.ok) throw new Error(`Notion API error: ${res.status}`)

    const data = await res.json()
    const rows = (data.results ?? []) as Array<{ id: string; properties: NotionProps }>

    // ── 優先度スコア付きで変換 ──────────────────────────
    const records: VisitPriorityRecord[] = rows.map(r => {
      const p             = r.properties
      // '前回往診日'（ウィザード自動作成DB）と '最終往診日'（旧手動作成DB）の両方に対応
      const lastVisitDate = getDate(p, '前回往診日') || getDate(p, '最終往診日')
      const age           = getNumber(p, '年齢')
      const householdType = getSelect(p, '世帯状況')
      const careLevel     = getSelect(p, '要介護度')
      const urgencyFlag   = getSelect(p, '緊急フラグ')
      const conditionCount = getNumber(p, '疾患数')

      const { score, factors } = calcPriorityScore({
        age, conditionCount, householdType, careLevel, urgencyFlag, lastVisitDate,
      })

      return {
        id:             r.id,
        name:           getTitle(p,  '患者名'),
        age,
        lastVisitDate,
        daysSinceVisit: calcDaysSinceVisit(lastVisitDate),
        area:           getRich(p,   '居住区'),
        householdType,
        careLevel,
        conditions:     getRich(p,   '基礎疾患'),
        conditionCount,
        urgencyFlag,
        doctorName:     getRich(p,   '担当医'),
        notes:          getRich(p,   '備考'),
        priorityScore:  score,
        priorityRank:   toPriorityRank(score),
        scoreFactors:   factors,
      }
    })

    // ── 優先度スコア降順にソート ─────────────────────────
    records.sort((a, b) => b.priorityScore - a.priorityScore)

    // ── サマリー計算 ─────────────────────────────────────
    const summary = {
      total:  records.length,
      urgent: records.filter(r => r.priorityRank === 'URGENT').length,
      high:   records.filter(r => r.priorityRank === 'HIGH').length,
      mid:    records.filter(r => r.priorityRank === 'MID').length,
      low:    records.filter(r => r.priorityRank === 'LOW').length,
    }

    // ── 主要スコア要因を集計（AI提言用） ─────────────────
    const factorCounter: Record<string, number> = {}
    records
      .filter(r => r.priorityRank === 'URGENT' || r.priorityRank === 'HIGH')
      .forEach(r => {
        r.scoreFactors.forEach(f => {
          factorCounter[f] = (factorCounter[f] ?? 0) + 1
        })
      })
    const topFactors = Object.entries(factorCounter)
      .sort((a, b) => b[1] - a[1])
      .map(([f]) => f)

    // ── AI提言生成 ───────────────────────────────────────
    const aiRecommendations = await generateRecommendations(
      municipalName,
      summary.urgent,
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
    } satisfies VisitPriorityResponse)

  } catch (e) {
    console.error('[visit-priority GET] エラー:', e)
    return NextResponse.json({
      status:   'error',
      message:  e instanceof Error ? e.message : String(e),
      municipalityId,
      municipal: municipalName,
      records:  [],
      summary:  { total: 0, urgent: 0, high: 0, mid: 0, low: 0 },
      aiRecommendations: [],
    }, { status: 500 })
  }
}
