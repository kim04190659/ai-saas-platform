// =====================================================
//  src/app/api/gyosei/quarterly-report/route.ts
//  四半期AI分析レポート API — Sprint #63
//
//  ■ GET  /api/gyosei/quarterly-report?municipalityId=kirishima
//
//  ISO 23592「エクセレントサービス」4側面 × 9要素で
//  自治体の現在地をスコアリングし、AIが改善提言を生成する。
//  首長・議会への「今どこにいるか」説明資料として活用。
//
//  ■ スコアリング設計
//    ① 戦略・リーダーシップ（PDCA施策の進捗・完了率）
//       1-1 施策ビジョン実現度 = PDCA完了率
//       1-2 施策推進力        = PDCA実施中+完了率
//    ② 組織文化・人材（インフラ対応＋継続改善力）
//       2-1 組織対応力        = インフラ緊急0なら100点（緊急件数で減点）
//       2-2 継続改善力        = PDCA非検討中率（実施中+完了の割合）
//    ③ 住民理解・体験創出（住民WBスコアから）
//       3-1 住民ニーズ把握    = 住民WBスコア収集率（固定80点＋LOW割合で加減）
//       3-2 住民WB満足度      = avgScore / 5 * 100
//       3-3 要支援解消率      = (total - lowScoreCount) / total * 100
//    ④ プロセス・監視（財政健全化＋インフラ健全度）
//       4-1 財政健全度        = (total - criticalCount) / total * 100
//       4-2 インフラ健全度    = infraAvgScore（すでに0-100スケール）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { fetchFiscalIndicators }  from '@/lib/fiscal-health-engine'
import { fetchInfraFacilities }   from '@/lib/infrastructure-aging-engine'
import { fetchPolicies }          from '@/lib/yakushima-pdca-engine'
import { fetchResidents }         from '@/lib/yakushima-resident-coach-engine'
import { getMunicipalityById }    from '@/config/municipalities'

// ─── 型定義 ──────────────────────────────────────────

/** 1要素のスコア */
export interface IsoElement {
  code:       string   // 例: '1-1'
  name:       string   // 例: 'ビジョン実現度'
  score:      number   // 0-100
  dataSource: string   // どのデータを使ったか
  note:       string   // 解釈コメント
}

/** 1側面（aspect）のスコア */
export interface IsoAspect {
  num:      string   // '①'〜'④'
  title:    string   // '戦略・リーダーシップ'
  score:    number   // 要素の平均（0-100）
  rank:     'S' | 'A' | 'B' | 'C' | 'D'
  elements: IsoElement[]
}

/** AIによる提言 */
export interface AiRecommendation {
  priority:   '高' | '中' | '低'
  aspect:     string   // 対象側面
  title:      string   // 施策タイトル（20字以内）
  detail:     string   // 詳細（1〜2文）
  timing:     string   // 実施時期
}

/** APIレスポンス全体 */
export interface QuarterlyReportResponse {
  status:          'success' | 'error'
  municipalityId:  string
  municipal:       string
  quarter:         string   // 例: '2026年Q2'
  overallScore:    number   // 0-100（全側面平均）
  overallRank:     'S' | 'A' | 'B' | 'C' | 'D'
  aspects:         IsoAspect[]
  aiSummary:       string
  aiRecommendations: AiRecommendation[]
  dataNote:        string   // データ欠損がある場合の注記
  generatedAt:     string
}

// ─── ランク変換 ──────────────────────────────────────

function toRank(score: number): 'S' | 'A' | 'B' | 'C' | 'D' {
  if (score >= 90) return 'S'
  if (score >= 75) return 'A'
  if (score >= 60) return 'B'
  if (score >= 45) return 'C'
  return 'D'
}

/** スコアを0〜100に丸める */
function clamp(v: number): number {
  return Math.min(100, Math.max(0, Math.round(v)))
}

// ─── 四半期文字列を生成 ─────────────────────────────

function currentQuarter(): string {
  const now = new Date()
  const y   = now.getFullYear()
  const q   = Math.ceil((now.getMonth() + 1) / 3)
  return `${y}年Q${q}`
}

// ─── Claude Haiku でAI分析を生成 ────────────────────

interface HaikuOutput {
  summary:         string
  recommendations: AiRecommendation[]
}

async function generateAiAnalysis(
  municipal:   string,
  aspects:     IsoAspect[],
  overallScore: number,
): Promise<HaikuOutput> {

  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''
  if (!anthropicKey) {
    return {
      summary: 'AI分析キーが未設定のため自動生成できませんでした。',
      recommendations: [],
    }
  }

  // 側面スコアを簡潔にまとめてプロンプトへ渡す
  const aspectSummary = aspects
    .map(a => `${a.num}${a.title}: ${a.score}点(${a.rank})`)
    .join(' | ')

  // 最低スコアの側面を特定
  const worstAspect = [...aspects].sort((a, b) => a.score - b.score)[0]

  const systemPrompt = [
    `あなたは自治体ISO 23592エクセレントサービス分析の専門家です。`,
    `${municipal}の四半期レポートを分析し、JSONのみで回答してください。`,
    `説明文・コードブロック・前後の文章は一切不要です。`,
  ].join('')

  const outputFormat = [
    '【出力形式（JSON）— 必ずこの形式のみで回答すること】',
    '{"summary":"2〜3文で総括","recommendations":[',
    '  {"priority":"高|中|低","aspect":"側面名","title":"20文字以内","detail":"1〜2文","timing":"実施時期"}',
    '  ※最大4件',
    ']}',
    '※ JSONのみ出力。説明文・コードブロック不要。簡潔さを最優先。',
  ].join('\n')

  const userPrompt = [
    `【${municipal} — ${currentQuarter()} ISO 23592スコア】`,
    `総合スコア: ${overallScore}点`,
    `側面別: ${aspectSummary}`,
    `最低側面: ${worstAspect.num}${worstAspect.title}（${worstAspect.score}点）`,
    '',
    outputFormat,
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
        max_tokens: 4096,  // Haiku最大出力上限（CLAUDE.md ルール準拠）
        system:     systemPrompt,
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!res.ok) throw new Error(`Anthropic API error: ${res.status}`)

    const data = await res.json()

    // stop_reason チェック
    if (data.stop_reason === 'max_tokens') {
      console.warn('[quarterly-report] max_tokens に達した可能性があります')
    }

    const raw = data.content?.[0]?.text ?? '{}'

    // コードブロック除去（念のため）
    const cleaned = raw.replace(/```json|```/g, '').trim()
    const parsed  = JSON.parse(cleaned) as HaikuOutput

    return {
      summary:         parsed.summary         ?? '',
      recommendations: parsed.recommendations ?? [],
    }

  } catch (e) {
    console.error('[quarterly-report] AI分析エラー:', e)
    return {
      summary:         '現在AI分析を生成できません。スコアデータをご参照ください。',
      recommendations: [],
    }
  }
}

// ─── メインハンドラ ─────────────────────────────────

export async function GET(req: NextRequest) {
  const notionKey      = process.env.NOTION_API_KEY ?? ''
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'

  const municipality   = getMunicipalityById(municipalityId)
  const municipalName  = municipality?.shortName ?? municipalityId

  try {
    // ── 4領域データを並列取得 ──────────────────────────
    const [fiscalRes, infraRes, pdcaRes, wbRes] = await Promise.allSettled([
      fetchFiscalIndicators(notionKey, municipalityId),
      fetchInfraFacilities(notionKey, municipalityId),
      fetchPolicies(notionKey, municipalityId),
      fetchResidents(notionKey, municipalityId),
    ])

    const dataNote: string[] = []

    // ── ① 戦略・リーダーシップ（PDCA施策） ─────────────
    let el11: IsoElement, el12: IsoElement
    if (pdcaRes.status === 'fulfilled' && pdcaRes.value.length > 0) {
      const policies  = pdcaRes.value
      const total     = policies.length
      const done      = policies.filter(p => p.ステータス === '完了').length
      const active    = policies.filter(p => p.ステータス === '実施中').length
      const doneRate  = clamp((done / total) * 100)
      const pushRate  = clamp(((done + active) / total) * 100)
      el11 = {
        code: '1-1', name: 'ビジョン実現度',
        score: doneRate,
        dataSource: 'PDCA施策DB',
        note: `施策完了率 ${doneRate}%（${done}/${total}件）`,
      }
      el12 = {
        code: '1-2', name: '施策推進力',
        score: pushRate,
        dataSource: 'PDCA施策DB',
        note: `実施中+完了率 ${pushRate}%（${done + active}/${total}件）`,
      }
    } else {
      dataNote.push('PDCA施策データなし（①側面はデフォルト値）')
      el11 = { code: '1-1', name: 'ビジョン実現度', score: 50, dataSource: 'データなし', note: 'PDCA施策DBが未接続' }
      el12 = { code: '1-2', name: '施策推進力',     score: 50, dataSource: 'データなし', note: 'PDCA施策DBが未接続' }
    }

    // ── ② 組織文化・人材（インフラ緊急度＋PDCA改善力） ───
    let el21: IsoElement, el22: IsoElement
    if (infraRes.status === 'fulfilled' && infraRes.value.length > 0) {
      const facilities  = infraRes.value
      const urgent      = facilities.filter(f => f.urgency === '緊急修繕').length
      // 緊急0→100点、1件ごとに10点減点（最低10点）
      const orgScore    = clamp(100 - urgent * 10)
      el21 = {
        code: '2-1', name: '組織対応力',
        score: orgScore,
        dataSource: 'インフラ老朽化DB',
        note: `緊急修繕 ${urgent}件（0件で100点満点）`,
      }
    } else {
      dataNote.push('インフラDBなし（②-1はデフォルト値）')
      el21 = { code: '2-1', name: '組織対応力', score: 60, dataSource: 'データなし', note: 'インフラDBが未接続' }
    }
    if (pdcaRes.status === 'fulfilled' && pdcaRes.value.length > 0) {
      const policies    = pdcaRes.value
      const total       = policies.length
      const notPending  = policies.filter(p => p.ステータス !== '検討中').length
      const improveRate = clamp((notPending / total) * 100)
      el22 = {
        code: '2-2', name: '継続改善力',
        score: improveRate,
        dataSource: 'PDCA施策DB',
        note: `施策行動化率 ${improveRate}%（${notPending}/${total}件）`,
      }
    } else {
      el22 = { code: '2-2', name: '継続改善力', score: 50, dataSource: 'データなし', note: 'PDCA施策DBが未接続' }
    }

    // ── ③ 住民理解・体験創出（住民WBスコア） ─────────────
    let el31: IsoElement, el32: IsoElement, el33: IsoElement
    if (wbRes.status === 'fulfilled' && wbRes.value.length > 0) {
      const residents     = wbRes.value
      const total         = residents.length
      const lowCount      = residents.filter(r => (r.WBスコア ?? 10) <= 3).length
      const avgScore      = residents.reduce((s, r) => s + (r.WBスコア ?? 5), 0) / total
      const avgPct        = clamp((avgScore / 5) * 100)  // 5点満点 → 100点
      const solvedRate    = clamp(((total - lowCount) / total) * 100)
      // 把握率: 住民データが1件でもあれば基礎点80、件数が多いほど加点
      const graspScore    = clamp(80 + Math.min(20, total * 2))

      el31 = {
        code: '3-1', name: '住民ニーズ把握',
        score: graspScore,
        dataSource: '住民WBコーチングDB',
        note: `WBスコア収集数 ${total}名（収集数に応じて加点）`,
      }
      el32 = {
        code: '3-2', name: '住民WB満足度',
        score: avgPct,
        dataSource: '住民WBコーチングDB',
        note: `平均WBスコア ${avgScore.toFixed(1)}/5.0（${avgPct}点）`,
      }
      el33 = {
        code: '3-3', name: '要支援解消率',
        score: solvedRate,
        dataSource: '住民WBコーチングDB',
        note: `要支援(スコア3以下) ${lowCount}名 / 全${total}名（${solvedRate}%が非該当）`,
      }
    } else {
      dataNote.push('住民WBデータなし（③側面はデフォルト値）')
      el31 = { code: '3-1', name: '住民ニーズ把握', score: 50, dataSource: 'データなし', note: '住民WBDBが未接続' }
      el32 = { code: '3-2', name: '住民WB満足度',   score: 50, dataSource: 'データなし', note: '住民WBDBが未接続' }
      el33 = { code: '3-3', name: '要支援解消率',   score: 50, dataSource: 'データなし', note: '住民WBDBが未接続' }
    }

    // ── ④ プロセス・監視（財政健全化＋インフラ健全度） ────
    let el41: IsoElement, el42: IsoElement
    if (fiscalRes.status === 'fulfilled' && fiscalRes.value.length > 0) {
      const indicators    = fiscalRes.value
      const critical      = indicators.filter(i => ['危険', '警戒'].includes(i.assessment)).length
      const fiscalScore   = clamp(((indicators.length - critical) / indicators.length) * 100)
      el41 = {
        code: '4-1', name: '財政健全度',
        score: fiscalScore,
        dataSource: '財政健全化指標DB',
        note: `危険・警戒指標 ${critical}件 / 全${indicators.length}件`,
      }
    } else {
      dataNote.push('財政DBなし（④-1はデフォルト値）')
      el41 = { code: '4-1', name: '財政健全度', score: 60, dataSource: 'データなし', note: '財政DBが未接続' }
    }
    if (infraRes.status === 'fulfilled' && infraRes.value.length > 0) {
      const facilities  = infraRes.value
      const avgInfra    = facilities.length > 0
        ? clamp(Math.round(facilities.reduce((s, f) => s + f.score, 0) / facilities.length))
        : 60
      el42 = {
        code: '4-2', name: 'インフラ健全度',
        score: avgInfra,
        dataSource: 'インフラ老朽化DB',
        note: `施設健全度スコア平均 ${avgInfra}/100`,
      }
    } else {
      el42 = { code: '4-2', name: 'インフラ健全度', score: 60, dataSource: 'データなし', note: 'インフラDBが未接続' }
    }

    // ── 4側面を組み立て ───────────────────────────────
    const aspects: IsoAspect[] = [
      {
        num: '①', title: '戦略・リーダーシップ',
        elements: [el11, el12],
        score: 0, rank: 'C',
      },
      {
        num: '②', title: '組織文化・人材',
        elements: [el21, el22],
        score: 0, rank: 'C',
      },
      {
        num: '③', title: '住民理解・体験創出',
        elements: [el31, el32, el33],
        score: 0, rank: 'C',
      },
      {
        num: '④', title: 'プロセス・監視',
        elements: [el41, el42],
        score: 0, rank: 'C',
      },
    ]

    // 各側面スコア = 要素の平均
    for (const aspect of aspects) {
      const avg = aspect.elements.reduce((s, e) => s + e.score, 0) / aspect.elements.length
      aspect.score = clamp(avg)
      aspect.rank  = toRank(aspect.score)
    }

    // 総合スコア = 4側面の平均
    const overallScore = clamp(
      aspects.reduce((s, a) => s + a.score, 0) / aspects.length
    )
    const overallRank = toRank(overallScore)

    // ── AI分析を生成 ──────────────────────────────────
    const aiResult = await generateAiAnalysis(municipalName, aspects, overallScore)

    // ── レスポンスを返却 ─────────────────────────────
    const response: QuarterlyReportResponse = {
      status:            'success',
      municipalityId,
      municipal:         municipalName,
      quarter:           currentQuarter(),
      overallScore,
      overallRank,
      aspects,
      aiSummary:         aiResult.summary,
      aiRecommendations: aiResult.recommendations,
      dataNote:          dataNote.length > 0 ? dataNote.join(' / ') : '',
      generatedAt:       new Date().toISOString(),
    }

    return NextResponse.json(response)

  } catch (e) {
    console.error('[quarterly-report GET] エラー:', e)
    return NextResponse.json({
      status:  'error',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
