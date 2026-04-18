// =====================================================
//  src/app/api/cron/risk-scoring/route.ts
//  離職リスクスコアリング — Sprint #28
//
//  ■ 役割
//    職員コンディションDBの過去4週間データを職員ごとに集計し、
//    WBスコアの低下傾向・危険水準を検知してリスクレベルを自動算出。
//    結果をNotionのリスクレポートページに保存する。
//
//  ■ 起動タイミング
//    Vercel Cron: 毎週月曜 00:30 UTC（= 09:30 JST）
//    手動トリガー: GET /api/cron/risk-scoring
//
//  ■ リスクレベル判定ロジック
//    🔴 高リスク: 最新WB < 40  OR（最新WB < 55 かつ 2週間で10点以上低下）
//    🟡 中リスク: 最新WB < 55  OR（最新WB < 70 かつ 2週間で5点以上低下）
//    🟢 低リスク: それ以外
//
//  ■ 環境変数
//    NOTION_API_KEY    : 設定済み
//    ANTHROPIC_API_KEY : 設定済み
//    CRON_SECRET       : Vercelが自動設定（手動呼び出し時は不要）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic                     from '@anthropic-ai/sdk'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE       = 'https://api.notion.com/v1'
const NOTION_VERSION        = '2022-06-28'
const STAFF_CONDITION_DB_ID = '4d65b3ba47764ea6b472c2c9452f27c6'
const NOTION_PARENT_PAGE_ID = '338960a91e23813f9402f53e5240e029'

// WBスコア閾値
const HIGH_RISK_THRESHOLD = 40   // 🔴 高リスク（要注意）
const MID_RISK_THRESHOLD  = 55   // 🟡 中リスク（注意）
const LOW_RISK_THRESHOLD  = 70   // 🟢 良好

// トレンド閾値（週平均の下落幅）
const HIGH_RISK_DECLINE = 10     // 10点以上低下 → 高リスクに昇格
const MID_RISK_DECLINE  = 5      // 5点以上低下  → 中リスクに昇格

// ─── 型定義 ──────────────────────────────────────────

/** Notionから取得した職員コンディション1件 */
interface ConditionRecord {
  id:          string
  staffName:   string
  department:  string
  deptId:      string
  wbScore:     number
  comment:     string
  recordDate:  string
}

/** 職員ごとのリスク分析結果 */
export interface StaffRisk {
  staffName:   string
  department:  string
  deptId:      string
  deptEmoji:   string
  riskLevel:   'high' | 'mid' | 'low'  // 🔴 🟡 🟢
  latestWB:    number                   // 直近のWBスコア
  weeklyScores: number[]                // 週ごとの平均WBスコア（古い順）
  trend:       number                   // 4週間の変化量（正=改善、負=悪化）
  latestComment: string                 // 最新コメント
  riskReason:  string                   // リスク判定理由
}

/** 部門別の集計結果（サマリー用） */
interface DeptRiskSummary {
  deptId:    string
  deptName:  string
  emoji:     string
  total:     number
  highRisk:  number
  midRisk:   number
  lowRisk:   number
  avgWB:     number
}

// 部門定義
const DEPT_LABELS: Record<string, { name: string; emoji: string }> = {
  gyosei:         { name: '行政',       emoji: '🏛️' },
  education:      { name: '教育',       emoji: '🏫' },
  safety:         { name: '警察・消防', emoji: '👮' },
  healthcare:     { name: '医療・介護', emoji: '🏥' },
  infrastructure: { name: '公共設備',   emoji: '🏗️' },
}

// ─── Notion APIヘルパー ───────────────────────────────

function notionHeaders(apiKey: string): Record<string, string> {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── データ取得 ───────────────────────────────────────

/**
 * 指定期間のスタッフコンディションレコードをNotionから取得する。
 */
async function fetchConditionRecords(
  startDate: string,
  endDate:   string,
  notionKey: string,
): Promise<ConditionRecord[]> {
  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        page_size: 300,
        filter: {
          and: [
            { property: '記録日', date: { on_or_after:  startDate } },
            { property: '記録日', date: { on_or_before: endDate   } },
          ],
        },
        sorts: [{ property: '記録日', direction: 'ascending' }],
      }),
    })

    if (!res.ok) {
      console.warn('[risk-scoring] Notionクエリ失敗:', res.status)
      return []
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((r: any) => {
      const p      = r.properties
      const health  = p['体調スコア']?.number            ?? 3
      const workload = p['業務負荷スコア']?.number        ?? 3
      const teamWB   = p['チームWell-Beingスコア']?.number ?? 3
      const calcedWB = (health - 1) * 10 + (5 - workload) * 10 + (teamWB - 1) * 5
      const wbScore  = p['wellbeing_score']?.number ?? calcedWB

      return {
        id:         r.id,
        staffName:  p['職員名']?.title?.[0]?.plain_text  ?? '（不明）',
        department: p['部署名']?.rich_text?.[0]?.plain_text ?? '',
        deptId:     p['deptId']?.rich_text?.[0]?.plain_text ?? 'gyosei',
        wbScore:    Math.round(wbScore),
        comment:    p['コメント']?.rich_text?.[0]?.plain_text ?? '',
        recordDate: p['記録日']?.date?.start ?? startDate,
      }
    })
  } catch (e) {
    console.error('[risk-scoring] データ取得エラー:', e)
    return []
  }
}

// ─── 週番号ヘルパー ────────────────────────────────────

/**
 * 日付文字列を「4週スロット（0=最古〜3=最新）」に変換する。
 * @param dateStr yyyy-mm-dd
 * @param baseDate 基準日（今日）
 */
function weekSlot(dateStr: string, baseDate: Date): number {
  const d     = new Date(dateStr)
  const diffMs = baseDate.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  // 今週(0-6日前) → slot 3, 先週(7-13日前) → slot 2, etc.
  if (diffDays <= 6)  return 3
  if (diffDays <= 13) return 2
  if (diffDays <= 20) return 1
  return 0
}

// ─── リスクスコアリング ───────────────────────────────

/**
 * 職員別にWBスコアを週ごとに集計し、リスクレベルを判定する。
 */
function scoreStaffRisks(
  records:  ConditionRecord[],
  baseDate: Date,
): StaffRisk[] {

  // 職員別にレコードをグループ化
  const staffMap = new Map<string, ConditionRecord[]>()
  for (const r of records) {
    const key = r.staffName
    if (!staffMap.has(key)) staffMap.set(key, [])
    staffMap.get(key)!.push(r)
  }

  const results: StaffRisk[] = []

  for (const [staffName, staffRecords] of staffMap) {
    // 週スロット(0〜3)ごとに平均WBを計算
    const slotScores: number[][] = [[], [], [], []]
    for (const r of staffRecords) {
      const slot = weekSlot(r.recordDate, baseDate)
      slotScores[slot].push(r.wbScore)
    }

    // 各週の平均（データがないスロットは -1）
    const weeklyAvgs = slotScores.map(scores =>
      scores.length > 0
        ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length)
        : -1
    )

    // 直近週のWBスコア（最新スロットから順に探す）
    let latestWB = -1
    for (let i = 3; i >= 0; i--) {
      if (weeklyAvgs[i] >= 0) { latestWB = weeklyAvgs[i]; break }
    }
    if (latestWB < 0) continue  // データなし → スキップ

    // 4週間のトレンド（最古と最新の差）
    const validAvgs = weeklyAvgs.filter(v => v >= 0)
    const trend = validAvgs.length >= 2
      ? validAvgs[validAvgs.length - 1] - validAvgs[0]
      : 0

    // リスクレベル判定
    let riskLevel: 'high' | 'mid' | 'low' = 'low'
    let riskReason = '安定しています'

    if (latestWB < HIGH_RISK_THRESHOLD) {
      riskLevel  = 'high'
      riskReason = `直近WBスコアが${latestWB}点（${HIGH_RISK_THRESHOLD}点未満）`
    } else if (latestWB < MID_RISK_THRESHOLD && trend <= -HIGH_RISK_DECLINE) {
      riskLevel  = 'high'
      riskReason = `WB${latestWB}点かつ${Math.abs(trend)}点低下傾向`
    } else if (latestWB < MID_RISK_THRESHOLD) {
      riskLevel  = 'mid'
      riskReason = `直近WBスコアが${latestWB}点（${MID_RISK_THRESHOLD}点未満）`
    } else if (latestWB < LOW_RISK_THRESHOLD && trend <= -MID_RISK_DECLINE) {
      riskLevel  = 'mid'
      riskReason = `WB${latestWB}点かつ${Math.abs(trend)}点低下傾向`
    } else if (trend <= -HIGH_RISK_DECLINE) {
      riskLevel  = 'mid'
      riskReason = `WBスコアが${Math.abs(trend)}点低下中`
    } else {
      riskLevel  = 'low'
      riskReason = latestWB >= LOW_RISK_THRESHOLD
        ? `WBスコア${latestWB}点で良好`
        : `WBスコア${latestWB}点（安定）`
    }

    // 最新コメントを取得
    const sorted       = [...staffRecords].sort((a, b) => b.recordDate.localeCompare(a.recordDate))
    const latestComment = sorted.find(r => r.comment.length > 0)?.comment ?? ''

    const deptInfo = DEPT_LABELS[staffRecords[0].deptId] ?? { name: '不明', emoji: '❓' }

    results.push({
      staffName,
      department:    staffRecords[0].department,
      deptId:        staffRecords[0].deptId,
      deptEmoji:     deptInfo.emoji,
      riskLevel,
      latestWB,
      weeklyScores:  weeklyAvgs,
      trend,
      latestComment,
      riskReason,
    })
  }

  // 高リスク → 中リスク → 低リスクの順にソート、同リスク内はWBスコア昇順（低い方が上）
  return results.sort((a, b) => {
    const rankA = a.riskLevel === 'high' ? 0 : a.riskLevel === 'mid' ? 1 : 2
    const rankB = b.riskLevel === 'high' ? 0 : b.riskLevel === 'mid' ? 1 : 2
    if (rankA !== rankB) return rankA - rankB
    return a.latestWB - b.latestWB
  })
}

// ─── 部門別サマリー ────────────────────────────────────

function buildDeptSummary(staffRisks: StaffRisk[]): DeptRiskSummary[] {
  const map = new Map<string, DeptRiskSummary>()

  for (const s of staffRisks) {
    if (!map.has(s.deptId)) {
      const info = DEPT_LABELS[s.deptId] ?? { name: '不明', emoji: '❓' }
      map.set(s.deptId, {
        deptId:   s.deptId,
        deptName: info.name,
        emoji:    info.emoji,
        total:    0,
        highRisk: 0,
        midRisk:  0,
        lowRisk:  0,
        avgWB:    0,
      })
    }
    const d = map.get(s.deptId)!
    d.total++
    if (s.riskLevel === 'high') d.highRisk++
    else if (s.riskLevel === 'mid') d.midRisk++
    else d.lowRisk++
    d.avgWB = Math.round(
      (d.avgWB * (d.total - 1) + s.latestWB) / d.total
    )
  }

  return [...map.values()].sort((a, b) => b.highRisk - a.highRisk || b.midRisk - a.midRisk)
}

// ─── AI 提言生成 ─────────────────────────────────────

/**
 * 高リスク・中リスク職員のデータをもとにAIが管理者向け提言を生成する。
 */
async function generateRiskAdvice(
  staffRisks:   StaffRisk[],
  deptSummary:  DeptRiskSummary[],
  anthropicKey: string,
): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const highRisk = staffRisks.filter(s => s.riskLevel === 'high')
    const midRisk  = staffRisks.filter(s => s.riskLevel === 'mid')

    // 高リスク職員の情報（個人名は含めず部門・コメントのみ）
    const highRiskText = highRisk.length > 0
      ? highRisk.map(s =>
          `  - ${s.deptEmoji}${s.department}（WB${s.latestWB}点、${s.riskReason}）` +
          (s.latestComment ? `\n    コメント:「${s.latestComment}」` : '')
        ).join('\n')
      : '  なし'

    const deptText = deptSummary
      .map(d => `  ${d.emoji}${d.deptName}: 🔴${d.highRisk}名 🟡${d.midRisk}名 🟢${d.lowRisk}名（平均WB ${d.avgWB}点）`)
      .join('\n')

    const prompt = `あなたは自治体Well-Being・離職リスク管理の専門家です。
以下の職員リスクスコアリング結果を分析し、人事・管理者向けの提言を作成してください。

【分析対象人数】${staffRisks.length}名
【高リスク職員（WB40点未満または急激な低下）】${highRisk.length}名
【中リスク職員（WB55点未満または低下傾向）】${midRisk.length}名

【部門別状況】
${deptText}

【高リスク職員の詳細（部署・コメントのみ）】
${highRiskText}

以下の構成で、箇条書きを使わず自然な文章で提言を作成してください（200〜300文字）：

## 🔍 今週のリスク評価サマリー
（全体状況を2〜3文で）

## 🚨 優先対応アクション
（高リスク者への具体的な対応を2〜3点。1on1面談・業務調整・産業医相談など）

## 📌 組織改善の視点
（部門横断的な改善ポイントを1〜2点）

文体：ですます調、管理職・人事担当向け、具体的かつ実行可能な提言を。`

    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 600,
      messages:   [{ role: 'user', content: prompt }],
    })

    return res.content[0].type === 'text' ? res.content[0].text.trim() : '（AI生成エラー）'

  } catch (e) {
    console.error('[risk-scoring] AI生成エラー:', e)
    return '（AIアドバイス生成に失敗しました。データは上記の通りです。）'
  }
}

// ─── Notionレポートページ作成 ─────────────────────────

/**
 * リスクスコアリング結果をNotionページとして保存する。
 * ※ 個人名はNotionページには含めない（プライバシー配慮）
 */
async function createRiskReportPage(
  staffRisks:  StaffRisk[],
  deptSummary: DeptRiskSummary[],
  aiAdvice:    string,
  dateLabel:   string,
  notionKey:   string,
): Promise<{ id: string; url: string } | null> {
  try {
    const title = `🔴 離職リスクスコアリング ${dateLabel}`

    // 部門別サマリーテーブル
    const tableRows = deptSummary.map(d =>
      `| ${d.emoji}${d.deptName} | ${d.total}名 | 🔴 ${d.highRisk}名 | 🟡 ${d.midRisk}名 | 🟢 ${d.lowRisk}名 | ${d.avgWB}点 |`
    ).join('\n')

    // 高リスク者一覧（個人名なし・部署単位）
    const highRiskList = staffRisks
      .filter(s => s.riskLevel === 'high')
      .map(s => `- ${s.deptEmoji} **${s.department}** WB${s.latestWB}点: ${s.riskReason}${s.latestComment ? `\n  > 「${s.latestComment}」` : ''}`)
      .join('\n') || '- 今週は高リスク職員なし ✅'

    // 中リスク者一覧
    const midRiskList = staffRisks
      .filter(s => s.riskLevel === 'mid')
      .map(s => `- ${s.deptEmoji} **${s.department}** WB${s.latestWB}点: ${s.riskReason}`)
      .join('\n') || '- 今週は中リスク職員なし ✅'

    const content = `> 📅 生成日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} | 分析対象: 過去28日間
> ⚠️ 本レポートは管理者・人事担当のみ閲覧してください（個人を特定できる情報は含みません）

---

## 📊 部門別リスク集計

| 部門 | 対象人数 | 🔴 高リスク | 🟡 中リスク | 🟢 低リスク | 平均WB |
|---|---|---|---|---|---|
${tableRows}

---

## 🔴 高リスク職員（WB40点未満 または 急激な低下）

${highRiskList}

---

## 🟡 中リスク職員（WB55点未満 または 低下傾向）

${midRiskList}

---

## 🤖 AI 管理者向け提言

${aiAdvice}

---

> 📌 このページはRunWith Platformが自動生成しました。
> リスク判定基準: 🔴高リスク=WB40未満 or 10点以上低下 | 🟡中リスク=WB55未満 or 5点以上低下
> 取り扱い注意: 本データは職員の支援目的のみに使用してください。`

    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        parent:     { page_id: NOTION_PARENT_PAGE_ID },
        icon:       { emoji: '🔴' },
        properties: {
          title: [{ text: { content: title } }],
        },
        children: [{
          object:    'block',
          type:      'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: content } }] },
        }],
      }),
    })

    if (!res.ok) {
      console.error('[risk-scoring] Notionページ作成失敗:', res.status, await res.text())
      return null
    }

    const page = await res.json()
    return { id: page.id, url: page.url }

  } catch (e) {
    console.error('[risk-scoring] Notionページ作成エラー:', e)
    return null
  }
}

// ─── メイン処理 ───────────────────────────────────────

async function runRiskScoring(): Promise<{
  success:     boolean
  dateLabel:   string
  staffRisks:  StaffRisk[]
  deptSummary: DeptRiskSummary[]
  notionPage:  { id: string; url: string } | null
  message:     string
}> {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  if (!notionKey) {
    return { success: false, dateLabel: '', staffRisks: [], deptSummary: [], notionPage: null, message: 'NOTION_API_KEY 未設定' }
  }

  // ── 日付範囲（過去28日間）────────────────────────────
  const now    = new Date()
  const jst    = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const today  = jst.toISOString().slice(0, 10)
  const start28 = new Date(jst)
  start28.setDate(jst.getDate() - 27)
  const startStr = start28.toISOString().slice(0, 10)

  const dateLabel = `${startStr} 〜 ${today}`
  console.log(`[risk-scoring] 分析期間: ${dateLabel}`)

  // ── データ取得 ────────────────────────────────────
  const records = await fetchConditionRecords(startStr, today, notionKey)
  console.log(`[risk-scoring] 取得件数: ${records.length}件`)

  if (records.length === 0) {
    return {
      success: false,
      dateLabel,
      staffRisks:  [],
      deptSummary: [],
      notionPage:  null,
      message:     'データが0件でした。Notionにコンディション記録を入力してください。',
    }
  }

  // ── リスクスコアリング ────────────────────────────
  const staffRisks  = scoreStaffRisks(records, jst)
  const deptSummary = buildDeptSummary(staffRisks)

  console.log(`[risk-scoring] 分析完了: 職員${staffRisks.length}名 / 🔴${staffRisks.filter(s=>s.riskLevel==='high').length}名 / 🟡${staffRisks.filter(s=>s.riskLevel==='mid').length}名`)

  // ── AI 提言生成 ───────────────────────────────────
  const aiAdvice = anthropicKey
    ? await generateRiskAdvice(staffRisks, deptSummary, anthropicKey)
    : '（ANTHROPIC_API_KEY 未設定のためAI提言は省略）'

  // ── Notionページ作成 ──────────────────────────────
  const notionPage = await createRiskReportPage(staffRisks, deptSummary, aiAdvice, today, notionKey)

  const message = notionPage
    ? `リスクスコアリングをNotionに保存しました: ${notionPage.url}`
    : 'Notionページ作成に失敗しました（データは集計済み）'

  return { success: !!notionPage, dateLabel, staffRisks, deptSummary, notionPage, message }
}

// ─── GET ハンドラ（Cron または手動テスト） ─────────────

export async function GET(req: NextRequest) {

  // Vercel Cron のセキュリティチェック
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
  }

  console.log('[risk-scoring] 離職リスクスコアリング開始')
  const result = await runRiskScoring()
  console.log('[risk-scoring] 完了:', result.message)

  const highCount = result.staffRisks.filter(s => s.riskLevel === 'high').length
  const midCount  = result.staffRisks.filter(s => s.riskLevel === 'mid').length
  const lowCount  = result.staffRisks.filter(s => s.riskLevel === 'low').length

  return NextResponse.json({
    status:     result.success ? 'success' : 'error',
    dateLabel:  result.dateLabel,
    message:    result.message,
    summary: {
      total:       result.staffRisks.length,
      highRisk:    highCount,
      midRisk:     midCount,
      lowRisk:     lowCount,
      deptSummary: result.deptSummary,
      staffRisks:  result.staffRisks,
    },
    notionPage: result.notionPage,
  })
}

// Vercel Cron が POST を使う場合にも対応
export async function POST(req: NextRequest) {
  return GET(req)
}
