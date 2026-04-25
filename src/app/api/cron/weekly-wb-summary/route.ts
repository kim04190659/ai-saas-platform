// =====================================================
//  src/app/api/cron/weekly-wb-summary/route.ts
//  週次 Well-Being サマリー 自動生成 — Sprint #28
//
//  ■ 役割
//    全部門の職員コンディションデータをNotionから集計し、
//    Claude AIがサマリーと提言を生成。Notionページに自動保存する。
//
//  ■ 起動タイミング
//    Vercel Cron: 毎週月曜 00:00 UTC（= 09:00 JST）
//    手動トリガー: GET /api/cron/weekly-wb-summary（開発・テスト用）
//
//  ■ 出力先（Notion）
//    親ページ: 🌱 新RunWith Platform
//    ページ名: 週次WBサマリー YYYY年MM月DD日（月）
//
//  ■ 集計ロジック
//    - 今週: 直近7日間のデータ
//    - 先週: 8〜14日前のデータ（前週比計算用）
//    - WBスコア = 体調×10 + (5-負荷)×10 + チームWB×5（最大100点）
//    - 部門平均・要注意スタッフ（WB < 40）・提出率を集計
//
//  ■ 環境変数
//    NOTION_API_KEY    : 設定済み
//    ANTHROPIC_API_KEY : 設定済み
//    CRON_SECRET       : Vercelが自動設定（手動呼び出し時は不要）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic                     from '@anthropic-ai/sdk'
import { getMunicipalityById }       from '@/config/municipalities'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE       = 'https://api.notion.com/v1'
const NOTION_VERSION        = '2022-06-28'
const STAFF_CONDITION_DB_ID = '4d65b3ba47764ea6b472c2c9452f27c6'

// 部門定義（deptId → 表示名・絵文字）
const DEPT_LABELS: Record<string, { name: string; emoji: string }> = {
  gyosei:         { name: '行政',       emoji: '🏛️' },
  education:      { name: '教育',       emoji: '🏫' },
  safety:         { name: '警察・消防', emoji: '👮' },
  healthcare:     { name: '医療・介護', emoji: '🏥' },
  infrastructure: { name: '公共設備',   emoji: '🏗️' },
}

// WBスコアのリスク閾値
const RISK_THRESHOLD    = 40  // この値を下回ると「要注意」
const WARNING_THRESHOLD = 55  // この値を下回ると「注意」

// ─── 型定義 ──────────────────────────────────────────

/** Notionから取得した職員コンディション1件 */
interface ConditionRecord {
  id:           string
  staffName:    string
  department:   string
  deptId:       string
  wbScore:      number
  healthScore:  number
  workload:     number
  teamWB:       number
  comment:      string
  recordDate:   string
}

/** 部門ごとの集計結果 */
interface DeptStats {
  deptId:       string
  deptName:     string
  emoji:        string
  avgWB:        number      // 平均WBスコア（今週）
  prevAvgWB:    number      // 平均WBスコア（先週）- 比較用
  minWB:        number      // 最低WBスコア
  maxWB:        number      // 最高WBスコア
  count:        number      // 今週の提出件数
  riskCount:    number      // 要注意スタッフ数（WB < RISK_THRESHOLD）
  warningCount: number      // 注意スタッフ数（WB < WARNING_THRESHOLD）
  trend:        number      // 前週比（正 = 改善、負 = 悪化）
  topConcerns:  string[]    // コメントから抽出した懸念事項
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
 * 指定期間・自治体のスタッフコンディションレコードをNotionから取得する。
 * @param startDate          開始日（ISO形式 yyyy-mm-dd）
 * @param endDate            終了日（ISO形式 yyyy-mm-dd）
 * @param notionKey          Notion APIキー
 * @param municipalityName   自治体短縮名（例: '霧島市'）— フィルタリング用
 */
async function fetchConditionRecords(
  startDate:        string,
  endDate:          string,
  notionKey:        string,
  municipalityName: string,
): Promise<ConditionRecord[]> {
  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        page_size: 200,
        filter: {
          // 日付範囲 ＋ 自治体名の3条件 AND
          and: [
            {
              property: '記録日',
              date: { on_or_after: startDate },
            },
            {
              property: '記録日',
              date: { on_or_before: endDate },
            },
            {
              property: '自治体名',
              rich_text: { contains: municipalityName },
            },
          ],
        },
        sorts: [{ property: '記録日', direction: 'descending' }],
      }),
    })

    if (!res.ok) {
      console.warn('[weekly-wb] Notionクエリ失敗:', res.status)
      return []
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((r: any) => {
      const p = r.properties

      // ★ フィールド名は staff-condition POST の保存名に合わせる
      //   体調スコア / 業務負荷スコア / チームWell-Beingスコア / wellbeing_score
      const health   = p['体調スコア']?.number            ?? 3
      const workload = p['業務負荷スコア']?.number         ?? 3
      const teamWB   = p['チームWell-Beingスコア']?.number ?? 3
      const calcedWB = (health - 1) * 10 + (5 - workload) * 10 + (teamWB - 1) * 5

      // wellbeing_score（アンダースコア区切り）が保存済みならそちらを優先
      const wbScore = p['wellbeing_score']?.number ?? calcedWB

      return {
        id:          r.id,
        staffName:   p['職員名']?.title?.[0]?.plain_text ?? '（不明）',
        department:  p['部署名']?.rich_text?.[0]?.plain_text ?? '',
        deptId:      p['deptId']?.rich_text?.[0]?.plain_text ?? 'gyosei',
        wbScore:     Math.round(wbScore),
        healthScore: health,
        workload:    workload,
        teamWB:      teamWB,
        comment:     p['コメント']?.rich_text?.[0]?.plain_text ?? '',
        recordDate:  p['記録日']?.date?.start ?? startDate,
      }
    })
  } catch (e) {
    console.error('[weekly-wb] データ取得エラー:', e)
    return []
  }
}

// ─── 集計処理 ─────────────────────────────────────────

/**
 * レコード一覧を部門ごとに集計してDeptStatsを返す。
 */
function aggregateByDept(
  thisWeek: ConditionRecord[],
  lastWeek: ConditionRecord[],
): DeptStats[] {
  const deptIds = Object.keys(DEPT_LABELS)
  const results: DeptStats[] = []

  for (const deptId of deptIds) {
    const thisRecords = thisWeek.filter(r => r.deptId === deptId)
    const lastRecords = lastWeek.filter(r => r.deptId === deptId)

    // 今週のデータがない場合もエントリは作成（データなしとして表示）
    const avgWB     = thisRecords.length > 0
      ? Math.round(thisRecords.reduce((s, r) => s + r.wbScore, 0) / thisRecords.length)
      : 0
    const prevAvgWB = lastRecords.length > 0
      ? Math.round(lastRecords.reduce((s, r) => s + r.wbScore, 0) / lastRecords.length)
      : 0

    const riskCount    = thisRecords.filter(r => r.wbScore < RISK_THRESHOLD).length
    const warningCount = thisRecords.filter(r => r.wbScore < WARNING_THRESHOLD).length

    // 懸念コメントを収集（空でないもの、上位3件）
    const concerns = thisRecords
      .map(r => r.comment)
      .filter(c => c && c.length > 5)
      .slice(0, 3)

    results.push({
      deptId,
      deptName:     DEPT_LABELS[deptId].name,
      emoji:        DEPT_LABELS[deptId].emoji,
      avgWB,
      prevAvgWB,
      minWB:        thisRecords.length > 0 ? Math.min(...thisRecords.map(r => r.wbScore)) : 0,
      maxWB:        thisRecords.length > 0 ? Math.max(...thisRecords.map(r => r.wbScore)) : 0,
      count:        thisRecords.length,
      riskCount,
      warningCount,
      trend:        prevAvgWB > 0 ? avgWB - prevAvgWB : 0,
      topConcerns:  concerns,
    })
  }

  // WBスコア降順で並べる（データなしは末尾）
  return results.sort((a, b) => {
    if (a.count === 0 && b.count === 0) return 0
    if (a.count === 0) return 1
    if (b.count === 0) return -1
    return b.avgWB - a.avgWB
  })
}

// ─── AI サマリー生成 ────────────────────────────────────

/**
 * Claude Sonnetが部門集計データを分析し、町長・部門長向けサマリーを生成する。
 * @param municipalityName 自治体名（プロンプトに埋め込む）
 */
async function generateWBSummary(
  deptStats:        DeptStats[],
  weekLabel:        string,
  anthropicKey:     string,
  municipalityName: string,
): Promise<string> {
  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    // 部門別データを構造化テキストに変換してプロンプトに渡す
    const statsText = deptStats.map(d => {
      const trend    = d.trend > 0 ? `↑+${d.trend}` : d.trend < 0 ? `↓${d.trend}` : `→±0`
      const alert    = d.riskCount > 0 ? `🔴要注意${d.riskCount}名` : d.warningCount > 0 ? `⚠️注意${d.warningCount}名` : '✅良好'
      const concerns = d.topConcerns.length > 0 ? `　懸念: ${d.topConcerns.join(' / ')}` : ''
      return `${d.emoji}${d.deptName}: WB ${d.avgWB}点（前週比${trend}）${alert} 提出${d.count}件${concerns}`
    }).join('\n')

    const overallAvg = deptStats.filter(d => d.count > 0).reduce((s, d) => s + d.avgWB, 0) /
                       Math.max(1, deptStats.filter(d => d.count > 0).length)
    const totalRisk  = deptStats.reduce((s, d) => s + d.riskCount, 0)

    const prompt = `あなたは自治体Well-Being分析の専門家です。
以下の${municipalityName}職員コンディション週次データを分析し、町長・部門長向けの簡潔なサマリーを作成してください。

【集計期間】${weekLabel}
【全体平均WBスコア】${overallAvg.toFixed(1)}点（100点満点）
【要注意スタッフ合計】${totalRisk}名（WB40点未満）

【部門別データ】
${statsText}

以下の構成でサマリーを作成してください（各セクション2〜4文程度）：

## 📋 今週のハイライト
（全体的な状況を端的に3文で）

## ⚠️ 要注意事項
（リスクスタッフや悪化部門への具体的な対応提言。なければ「今週は特段の懸念事項はありません」）

## 💡 改善・強化ポイント
（来週取り組むべき施策を2〜3点）

## 🎯 町長へのメッセージ
（縮小していく自治体の文脈で、職員の幸福が住民サービスにつながる視点から1段落）

文体：ですます調、専門用語は最小限。数字を活用して具体的に。`

    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',  // Cron自動バッチはHaiku（コスト・速度優先）
      max_tokens: 800,
      messages:   [{ role: 'user', content: prompt }],
    })

    return res.content[0].type === 'text' ? res.content[0].text.trim() : '（AI生成エラー）'

  } catch (e) {
    console.error('[weekly-wb] AI生成エラー:', e)
    return '（AIサマリー生成に失敗しました。データは上記の通りです。）'
  }
}

// ─── Notionページ作成 ─────────────────────────────────

/**
 * 週次WBサマリーをNotionページとして保存する。
 * @param notionParentPageId 保存先の自治体Notionページ ID
 */
async function createSummaryPage(
  weekLabel:          string,
  deptStats:          DeptStats[],
  aiSummary:          string,
  notionKey:          string,
  municipalityName:   string,
  notionParentPageId: string,
): Promise<{ id: string; url: string } | null> {
  try {
    // ページタイトル
    const title = `📊 週次WBサマリー ${weekLabel}`

    // 部門別テーブル（Notionマークダウン形式）
    const tableRows = deptStats.map(d => {
      if (d.count === 0) {
        return `| ${d.emoji}${d.deptName} | データなし | - | - | - | - |`
      }
      const trendStr = d.trend > 0 ? `↑ +${d.trend}` : d.trend < 0 ? `↓ ${d.trend}` : `→ ±0`
      const alertStr = d.riskCount > 0 ? `🔴 ${d.riskCount}名` : d.warningCount > 0 ? `⚠️ ${d.warningCount}名` : `✅`
      return `| ${d.emoji}${d.deptName} | **${d.avgWB}点** | ${trendStr} | ${d.minWB}〜${d.maxWB} | ${d.count}件 | ${alertStr} |`
    }).join('\n')

    // 要注意スタッフ一覧は個人情報保護のため部門名のみ表示
    const riskDepts = deptStats.filter(d => d.riskCount > 0)
    const riskSection = riskDepts.length > 0
      ? riskDepts.map(d => `- ${d.emoji} **${d.deptName}**: ${d.riskCount}名がWB${RISK_THRESHOLD}点未満（要サポート）`).join('\n')
      : '- 今週は要注意スタッフなし ✅'

    // コメント抜粋（懸念事項がある部門のみ）
    const concernsSection = deptStats
      .filter(d => d.topConcerns.length > 0)
      .map(d => `**${d.emoji}${d.deptName}**: ${d.topConcerns.map(c => `「${c}」`).join(' / ')}`)
      .join('\n')

    // Notionページ本文
    const content = `> 📅 自動生成日時: ${new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })} | 集計期間: ${weekLabel}

---

## 📊 部門別 Well-Beingスコア一覧

| 部門 | 平均WB | 前週比 | スコア範囲 | 提出件数 | アラート |
|---|---|---|---|---|---|
${tableRows}

---

## 🔴 要注意スタッフ（WB${RISK_THRESHOLD}点未満）

${riskSection}

---

## 💬 現場コメント抜粋

${concernsSection || '（今週は懸念コメントなし）'}

---

## 🤖 AI分析・提言

${aiSummary}

---

> 📌 このページはVercel Cronにより毎週月曜9時（JST）に自動生成されます。
> RunWith Platform > 週次WBサマリーシリーズ`

    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        parent:     { page_id: notionParentPageId },
        icon:       { emoji: '📊' },
        properties: {
          title: [{ text: { content: title } }],
        },
        children: [
          {
            object: 'block',
            type:   'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: content } }],
            },
          },
        ],
      }),
    })

    if (!res.ok) {
      console.error('[weekly-wb] Notionページ作成失敗:', res.status, await res.text())
      return null
    }

    const page = await res.json()
    console.log('[weekly-wb] Notionページ作成成功:', page.id)
    return { id: page.id, url: page.url }

  } catch (e) {
    console.error('[weekly-wb] Notionページ作成エラー:', e)
    return null
  }
}

// ─── メイン処理 ───────────────────────────────────────

/**
 * 週次WBサマリーを生成して Notion に保存するメイン関数。
 * Vercel Cron または手動GET リクエストから呼ばれる。
 * @param municipalityId 自治体ID（省略時はデフォルト自治体）
 */
async function runWeeklyWBSummary(municipalityId: string = 'kirishima'): Promise<{
  success:          boolean
  weekLabel:        string
  deptStats:        DeptStats[]
  notionPage:       { id: string; url: string } | null
  message:          string
  municipalityName: string
}> {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  // 自治体マスタから自治体情報を取得
  const municipality = getMunicipalityById(municipalityId)

  if (!notionKey) {
    return {
      success: false, weekLabel: '', deptStats: [], notionPage: null,
      message: 'NOTION_API_KEY 未設定', municipalityName: municipality.shortName,
    }
  }

  // ── 日付範囲を計算 ──────────────────────────────────
  // 今週: 直近7日間
  // 先週: 8〜14日前
  const now    = new Date()
  const jst    = new Date(now.getTime() + 9 * 60 * 60 * 1000)  // UTC → JST
  const today  = jst.toISOString().slice(0, 10)

  const thisWeekStart = new Date(jst)
  thisWeekStart.setDate(jst.getDate() - 6)
  const thisWeekStartStr = thisWeekStart.toISOString().slice(0, 10)

  const lastWeekEnd = new Date(jst)
  lastWeekEnd.setDate(jst.getDate() - 7)
  const lastWeekStart = new Date(jst)
  lastWeekStart.setDate(jst.getDate() - 13)

  const weekLabel = `${thisWeekStartStr} 〜 ${today}`

  console.log(`[weekly-wb] 集計期間: ${weekLabel}`)

  // ── データ取得（今週・先週）——自治体名でフィルタリング ──
  const [thisWeekRecords, lastWeekRecords] = await Promise.all([
    fetchConditionRecords(thisWeekStartStr, today, notionKey, municipality.shortName),
    fetchConditionRecords(
      lastWeekStart.toISOString().slice(0, 10),
      lastWeekEnd.toISOString().slice(0, 10),
      notionKey,
      municipality.shortName,
    ),
  ])

  console.log(`[weekly-wb] 今週: ${thisWeekRecords.length}件 / 先週: ${lastWeekRecords.length}件`)

  // ── 部門別集計 ────────────────────────────────────
  const deptStats = aggregateByDept(thisWeekRecords, lastWeekRecords)

  // ── AI サマリー生成（自治体名をプロンプトに含める）────
  const aiSummary = anthropicKey
    ? await generateWBSummary(deptStats, weekLabel, anthropicKey, municipality.shortName)
    : '（ANTHROPIC_API_KEY 未設定のためAIサマリーは省略）'

  // ── Notionページ作成（自治体のNotionページ配下に保存）─
  const notionPage = await createSummaryPage(
    weekLabel, deptStats, aiSummary, notionKey,
    municipality.shortName, municipality.notionPageId,
  )

  const message = notionPage
    ? `${municipality.shortName} 週次WBサマリーをNotionに保存しました: ${notionPage.url}`
    : 'Notionページ作成に失敗しました（データは集計済み）'

  return { success: !!notionPage, weekLabel, deptStats, notionPage, message, municipalityName: municipality.shortName }
}

// ─── GET ハンドラ（Cron または手動テスト） ─────────────

export async function GET(req: NextRequest) {

  // ── セキュリティチェック ────────────────────────────
  // Vercel Cron は Authorization: Bearer {CRON_SECRET} を自動付与する。
  // 環境変数 CRON_SECRET が設定されている場合のみ検証する。
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
  }

  // ── クエリパラメータから自治体IDを取得（省略時は 'kirishima'）
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'

  // ── 処理実行 ─────────────────────────────────────
  console.log(`[weekly-wb] 週次WBサマリー生成開始: municipalityId=${municipalityId}`)
  const result = await runWeeklyWBSummary(municipalityId)
  console.log('[weekly-wb] 完了:', result.message)

  return NextResponse.json({
    status:           result.success ? 'success' : 'error',
    weekLabel:        result.weekLabel,
    message:          result.message,
    municipalityName: result.municipalityName,
    summary: {
      deptCount:   result.deptStats.filter(d => d.count > 0).length,
      totalStaff:  result.deptStats.reduce((s, d) => s + d.count, 0),
      totalRisk:   result.deptStats.reduce((s, d) => s + d.riskCount, 0),
      deptStats:   result.deptStats,
    },
    notionPage: result.notionPage,
  })
}

// ─── POST ハンドラ（Vercel Cron 本番呼び出し） ─────────

export async function POST(req: NextRequest) {
  // Vercel Cron は POST も使う場合があるため、GET と同じ処理を実行
  return GET(req)
}
