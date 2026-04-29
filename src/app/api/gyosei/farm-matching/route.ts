// =====================================================
//  src/app/api/gyosei/farm-matching/route.ts
//  農業担い手マッチングAI API — Sprint #66
//
//  ■ GET /api/gyosei/farm-matching?municipalityId=nishiawakura
//
//  農山村・限界集落型自治体の課題：
//  「後継者不在農地と就農希望移住者を誰がどうやってつなぐか」
//
//  農地情報DB × 移住就農希望者DB を横断して
//  「農地×候補者」のマッチングスコアを自動算出。
//  担当職員が「この農地にはこの人が最適」を一目で把握できる。
//
//  ■ マッチングスコア設計（0〜100点：高いほど相性良し）
//    希望作物の一致:
//      完全一致（農地の作物 = 希望作物）  → +30点
//      「なんでも」の場合                 → +15点
//    農業経験 × 農地難易度:
//      難 × 3〜5年以上                   → +20点
//      難 × 1〜3年                       → +10点
//      中 × 1〜3年以上                   → +18点
//      中 × 1年未満                       → +8点
//      易 × なし以上（全て）              → +15点
//    家族構成 × 対応可能規模:
//      完全一致 or いずれも可             → +20点
//      近接マッチ                         → +10点
//    補助金対象:
//      対象                              → +10点
//    移住希望時期:
//      即時                              → +15点
//      6ヶ月以内                          → +10点
//      1年以内                            → +5点
//    農地状態:
//      良好                              → +10点
//      要整備                             → +5点
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityDbConfig } from '@/config/municipality-db-config'
import { getMunicipalityById }     from '@/config/municipalities'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// ─── 型定義 ──────────────────────────────────────────

/** 農地レコード */
export interface FarmRecord {
  id:             string
  name:           string
  area:           string      // 所在地区
  sizeHa:         number      // 面積（ha）
  cropType:       string      // 主要作物
  difficulty:     string      // 農地の難易度
  ownerAge:       number      // 現農地主年齢
  successorStatus: string     // 後継者状況
  farmCondition:  string      // 農地状態
  suitableScale:  string      // 対応可能規模
  equipment:      string      // 農業設備
  subsidyEligible: string     // 補助金対象
  matchingStatus: string      // マッチング状況
  notes:          string
}

/** 就農希望者レコード */
export interface CandidateRecord {
  id:             string
  name:           string
  age:            number
  experience:     string      // 農業経験
  preferCrop:     string      // 希望作物
  household:      string      // 家族構成
  preferScale:    string      // 希望農地規模
  sideJob:        string      // 農業以外の副業
  moveTimeline:   string      // 移住希望時期
  currentLocation: string     // 現居住地
  matchingStatus: string
  staffName:      string
  notes:          string
}

/** マッチングペアのレコード */
export interface MatchPair {
  farm:          FarmRecord
  candidate:     CandidateRecord
  score:         number
  rank:          'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW'
  scoreFactors:  string[]
}

export interface FarmMatchingResponse {
  status:           'success' | 'error'
  message?:         string
  municipalityId:   string
  municipal:        string
  farms:            FarmRecord[]
  candidates:       CandidateRecord[]
  topMatches:       MatchPair[]        // スコア上位ペア
  summary: {
    totalFarms:     number
    totalCandidates: number
    excellent:      number             // スコア70以上
    good:           number             // スコア50〜69
    fair:           number             // スコア30〜49
    unmatched:      number             // スコア30未満
  }
  aiRecommendations: string[]
}

// ─── Notion プロパティ取得ヘルパー ─────────────────────

type NotionProps = Record<string, Record<string, unknown>>
const getTitle  = (p: NotionProps, k: string) =>
  (p[k]?.title    as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''
const getSelect = (p: NotionProps, k: string) =>
  (p[k]?.select   as {name:string})?.name ?? ''
const getRich   = (p: NotionProps, k: string) =>
  (p[k]?.rich_text as Array<{plain_text:string}>)?.[0]?.plain_text ?? ''
const getNumber = (p: NotionProps, k: string) =>
  (p[k]?.number as number) ?? 0

// ─── マッチングスコア算出 ─────────────────────────────

function calcMatchScore(
  farm:      FarmRecord,
  candidate: CandidateRecord,
): { score: number; factors: string[] } {
  let score = 0
  const factors: string[] = []

  // ① 希望作物の一致
  if (candidate.preferCrop === 'なんでも') {
    score += 15
    factors.push('作物こだわりなし（+15点）')
  } else if (candidate.preferCrop === farm.cropType) {
    score += 30
    factors.push(`作物一致:${farm.cropType}（+30点）`)
  }

  // ② 農業経験 × 農地難易度マッチング
  const expLevel: Record<string, number> = {
    'なし': 0, '1年未満': 1, '1〜3年': 2, '3〜5年': 3, '5年以上': 4,
  }
  const expScore = expLevel[candidate.experience] ?? 0

  if (farm.difficulty === '難') {
    if (expScore >= 3) {
      score += 20
      factors.push(`難農地×経験豊富（+20点）`)
    } else if (expScore >= 2) {
      score += 10
      factors.push(`難農地×中程度経験（+10点）`)
    }
  } else if (farm.difficulty === '中') {
    if (expScore >= 2) {
      score += 18
      factors.push(`中程度農地×経験あり（+18点）`)
    } else if (expScore >= 1) {
      score += 8
      factors.push(`中程度農地×経験浅め（+8点）`)
    }
  } else if (farm.difficulty === '易') {
    score += 15
    factors.push(`扱いやすい農地（+15点）`)
  }

  // ③ 家族構成 × 対応可能規模マッチング
  const scaleMap: Record<string, string[]> = {
    '個人': ['単身'],
    '家族': ['夫婦', '子あり家族'],
    '法人': ['夫婦', '子あり家族'],
    'いずれも可': ['単身', '夫婦', '子あり家族'],
  }
  const suitableHouseholds = scaleMap[farm.suitableScale] ?? []
  if (suitableHouseholds.includes(candidate.household)) {
    score += 20
    factors.push(`世帯×規模マッチ（+20点）`)
  } else if (farm.suitableScale === 'いずれも可') {
    score += 10
    factors.push(`規模問わず受入可（+10点）`)
  }

  // ④ 補助金対象
  if (farm.subsidyEligible === '対象') {
    score += 10
    factors.push('補助金対象農地（+10点）')
  }

  // ⑤ 移住希望時期
  if (candidate.moveTimeline === '即時') {
    score += 15
    factors.push('即時移住可能（+15点）')
  } else if (candidate.moveTimeline === '6ヶ月以内') {
    score += 10
    factors.push('6ヶ月以内移住（+10点）')
  } else if (candidate.moveTimeline === '1年以内') {
    score += 5
    factors.push('1年以内移住（+5点）')
  }

  // ⑥ 農地状態
  if (farm.farmCondition === '良好') {
    score += 10
    factors.push('農地状態良好（+10点）')
  } else if (farm.farmCondition === '要整備') {
    score += 5
    factors.push('農地要整備（+5点）')
  }

  const clamped = Math.min(100, Math.max(0, score))
  return { score: clamped, factors }
}

function toMatchRank(score: number): 'EXCELLENT' | 'GOOD' | 'FAIR' | 'LOW' {
  if (score >= 70) return 'EXCELLENT'
  if (score >= 50) return 'GOOD'
  if (score >= 30) return 'FAIR'
  return 'LOW'
}

// ─── Claude Haiku でマッチング提言を生成 ────────────────

async function generateRecommendations(
  municipal:       string,
  totalFarms:      number,
  totalCandidates: number,
  topPairs:        MatchPair[],
): Promise<string[]> {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  if (!anthropicKey || topPairs.length === 0) return []

  const topDesc = topPairs.slice(0, 3).map(p =>
    `${p.farm.name}×${p.candidate.name}（${p.score}点）`
  ).join('、')

  const prompt = [
    `${municipal}の農地担当職員へ。`,
    `後継者不在農地${totalFarms}件・就農希望移住者${totalCandidates}名のマッチング結果です。`,
    `トップペア: ${topDesc}`,
    '',
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"recommendations":["提言1（30字以内）","提言2（30字以内）","提言3（30字以内）"]}',
    '※ JSONのみ。説明文不要。農山村の農地担い手確保に向けた具体的なアクションを3つ。',
  ].join('\n')

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
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
      console.warn('[farm-matching] max_tokens に達しました')
    }
    return parsed.recommendations ?? []
  } catch (e) {
    console.error('[farm-matching] AI提言エラー:', e)
    return []
  }
}

// ─── メインハンドラ ─────────────────────────────────────

export async function GET(req: NextRequest) {
  const notionKey        = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'nishiawakura'

  const municipality  = getMunicipalityById(municipalityId)
  const municipalName = municipality?.shortName ?? municipalityId
  const dbConf        = getMunicipalityDbConfig(municipalityId)

  if (!dbConf?.farmDbId || !dbConf?.farmerDbId) {
    return NextResponse.json({
      status:   'error',
      message:  `${municipalityId} に農地情報DBまたは移住就農希望者DBが設定されていません`,
      municipalityId,
      municipal: municipalName,
      farms:     [],
      candidates: [],
      topMatches: [],
      summary:   { totalFarms: 0, totalCandidates: 0, excellent: 0, good: 0, fair: 0, unmatched: 0 },
      aiRecommendations: [],
    }, { status: 404 })
  }

  try {
    // ── 農地情報DB を取得 ──────────────────────────────
    const farmRes = await fetch(`${NOTION_API}/databases/${dbConf.farmDbId}/query`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({
        filter: {
          property: '後継者状況',
          select:   { does_not_equal: '確保済み' },   // 未確定農地のみ
        },
        page_size: 50,
      }),
    })
    if (!farmRes.ok) throw new Error(`Notion farm API error: ${farmRes.status}`)
    const farmData = await farmRes.json()
    const farmRows = (farmData.results ?? []) as Array<{ id: string; properties: NotionProps }>

    const farms: FarmRecord[] = farmRows.map(r => {
      const p = r.properties
      return {
        id:              r.id,
        name:            getTitle(p,  '農地名'),
        area:            getSelect(p, '所在地区'),
        sizeHa:          getNumber(p, '面積（ha）'),
        cropType:        getSelect(p, '主要作物'),
        difficulty:      getSelect(p, '農地の難易度'),
        ownerAge:        getNumber(p, '現農地主年齢'),
        successorStatus: getSelect(p, '後継者状況'),
        farmCondition:   getSelect(p, '農地状態'),
        suitableScale:   getSelect(p, '対応可能規模'),
        equipment:       getRich(p,   '農業設備'),
        subsidyEligible: getSelect(p, '補助金対象'),
        matchingStatus:  getSelect(p, 'マッチング状況'),
        notes:           getRich(p,   '備考'),
      }
    })

    // ── 移住就農希望者DB を取得 ─────────────────────────
    const candidateRes = await fetch(`${NOTION_API}/databases/${dbConf.farmerDbId}/query`, {
      method:  'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({
        filter: {
          property: 'マッチング状況',
          select:   { does_not_equal: '辞退' },       // 辞退者を除く
        },
        page_size: 50,
      }),
    })
    if (!candidateRes.ok) throw new Error(`Notion candidate API error: ${candidateRes.status}`)
    const candidateData = await candidateRes.json()
    const candidateRows = (candidateData.results ?? []) as Array<{ id: string; properties: NotionProps }>

    const candidates: CandidateRecord[] = candidateRows.map(r => {
      const p = r.properties
      return {
        id:              r.id,
        name:            getTitle(p,  '氏名'),
        age:             getNumber(p, '年齢'),
        experience:      getSelect(p, '農業経験'),
        preferCrop:      getSelect(p, '希望作物'),
        household:       getSelect(p, '家族構成'),
        preferScale:     getSelect(p, '希望農地規模'),
        sideJob:         getSelect(p, '農業以外の副業'),
        moveTimeline:    getSelect(p, '移住希望時期'),
        currentLocation: getRich(p,   '現居住地'),
        matchingStatus:  getSelect(p, 'マッチング状況'),
        staffName:       getRich(p,   '担当職員'),
        notes:           getRich(p,   '備考'),
      }
    })

    // ── 全ペアのマッチングスコアを算出 ─────────────────
    const allPairs: MatchPair[] = []
    for (const farm of farms) {
      for (const candidate of candidates) {
        const { score, factors } = calcMatchScore(farm, candidate)
        allPairs.push({
          farm,
          candidate,
          score,
          rank: toMatchRank(score),
          scoreFactors: factors,
        })
      }
    }

    // ── スコア降順でトップ20件を取得 ────────────────────
    allPairs.sort((a, b) => b.score - a.score)
    const topMatches = allPairs.slice(0, 20)

    // ── サマリー計算 ─────────────────────────────────────
    const summary = {
      totalFarms:      farms.length,
      totalCandidates: candidates.length,
      excellent: topMatches.filter(p => p.rank === 'EXCELLENT').length,
      good:      topMatches.filter(p => p.rank === 'GOOD').length,
      fair:      topMatches.filter(p => p.rank === 'FAIR').length,
      unmatched: topMatches.filter(p => p.rank === 'LOW').length,
    }

    // ── AI提言生成 ───────────────────────────────────────
    const aiRecommendations = await generateRecommendations(
      municipalName,
      farms.length,
      candidates.length,
      topMatches.filter(p => p.rank === 'EXCELLENT'),
    )

    return NextResponse.json({
      status: 'success',
      municipalityId,
      municipal: municipalName,
      farms,
      candidates,
      topMatches,
      summary,
      aiRecommendations,
    } satisfies FarmMatchingResponse)

  } catch (e) {
    console.error('[farm-matching GET] エラー:', e)
    return NextResponse.json({
      status:   'error',
      message:  e instanceof Error ? e.message : String(e),
      municipalityId,
      municipal: municipalName,
      farms:     [],
      candidates: [],
      topMatches: [],
      summary:   { totalFarms: 0, totalCandidates: 0, excellent: 0, good: 0, fair: 0, unmatched: 0 },
      aiRecommendations: [],
    }, { status: 500 })
  }
}
