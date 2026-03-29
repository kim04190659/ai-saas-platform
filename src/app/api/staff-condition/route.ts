// =====================================================
//  src/app/api/staff-condition/route.ts
//  職員コンディション API ルート — Sprint #14
//
//  ■ このファイルの役割
//    - GET: StaffCondition DB から職員コンディション一覧を取得する
//    - POST: フォームの入力値を受け取り、wellbeing_score を自動計算し
//            StaffCondition DB に記録する
//
//  ■ Well-Being スコア計算式（Staff版）
//    体調スコア(1-5)   → (体調-1) × 10    最大 40pt
//    業務負荷(1-5)     → (5-業務負荷) × 10 最大 40pt（低いほど高得点）
//    チームWB(1-5)     → (チームWB-1) × 5  最大 20pt
//    合計              →                   最大100pt
//
//  ■ 使用NotionDB
//    StaffCondition DB: 4d65b3ba47764ea6b472c2c9452f27c6（Sprint #14で新規作成）
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// Notion API 共通設定
const NOTION_API_BASE    = 'https://api.notion.com/v1'
const NOTION_VERSION     = '2022-06-28'
// StaffCondition DB のNotion DB ID（Sprint #14で作成）
const STAFF_CONDITION_DB_ID = '4d65b3ba47764ea6b472c2c9452f27c6'

// ─── 型定義 ──────────────────────────────────────────

/** フォームから受け取る職員コンディションの型 */
interface StaffConditionRecord {
  staffName: string           // 職員名（必須）
  municipalityName?: string   // 自治体名
  department?: string         // 部署名
  healthScore: number         // 体調スコア 1〜5
  workloadScore: number       // 業務負荷スコア 1〜5（低いほど良い）
  teamWellBeingScore: number  // チームWell-Beingスコア 1〜5
  comment?: string            // 自由コメント
  recordDate: string          // 記録日（YYYY-MM-DD）
}

// ─── ヘルパー関数 ────────────────────────────────────

/** Notion API 共通ヘッダーを生成 */
function notionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

/**
 * Well-Being スコアを自動計算する（Staff版）
 *
 * 計算式:
 *   体調スコア(1-5)  → (体調-1)×10    ＝ 最大40pt（絶好調=40、不調=0）
 *   業務負荷(1-5)    → (5-負荷)×10    ＝ 最大40pt（余裕=40、限界=0）
 *   チームWB(1-5)    → (チームWB-1)×5 ＝ 最大20pt（高い=20、低い=0）
 *
 * 合計 0〜100pt。スコアが高いほど職員の状態が良好。
 */
function calcStaffWellbeingScore(record: StaffConditionRecord): number {
  // 体調スコア: 1→0pt, 2→10pt, 3→20pt, 4→30pt, 5→40pt
  const healthPt    = (record.healthScore - 1) * 10

  // 業務負荷スコア: 1(余裕)→40pt, 2→30pt, 3→20pt, 4→10pt, 5(限界)→0pt
  const workloadPt  = (5 - record.workloadScore) * 10

  // チームWell-Being: 1→0pt, 2→5pt, 3→10pt, 4→15pt, 5→20pt
  const teamPt      = (record.teamWellBeingScore - 1) * 5

  const total = healthPt + workloadPt + teamPt

  // 0〜100の範囲にクランプして整数で返す
  return Math.round(Math.min(100, Math.max(0, total)))
}

// ─── GET ハンドラ ────────────────────────────────────
// 職員コンディション一覧を取得してフロントに返す

export async function GET() {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    // StaffCondition DB をクエリ（記録日の新しい順で最大50件取得）
    const res = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey),
      body: JSON.stringify({
        page_size: 50,
        sorts: [{ property: '記録日', direction: 'descending' }],
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${errText}` }, { status: 500 })
    }

    const data = await res.json()

    // Notionのレコードを扱いやすい形に変換
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = data.results?.map((r: any) => {
      const p = r.properties
      return {
        id:                  r.id,
        staffName:           p['職員名']?.title?.[0]?.plain_text ?? '（名前なし）',
        municipalityName:    p['自治体名']?.rich_text?.[0]?.plain_text ?? '',
        department:          p['部署名']?.rich_text?.[0]?.plain_text ?? '',
        healthScore:         p['体調スコア']?.number ?? 0,
        workloadScore:       p['業務負荷スコア']?.number ?? 0,
        teamWellBeingScore:  p['チームWell-Beingスコア']?.number ?? 0,
        wellbeingScore:      p['wellbeing_score']?.number ?? 0,
        comment:             p['コメント']?.rich_text?.[0]?.plain_text ?? '',
        recordDate:          p['記録日']?.date?.start ?? '',
      }
    }) ?? []

    // サマリー集計（フロントのカード表示用）
    const totalCount  = records.length
    const avgScore    = totalCount > 0
      ? Math.round(records.reduce((s: number, r: { wellbeingScore: number }) => s + r.wellbeingScore, 0) / totalCount)
      : 0
    // 高ストレス（業務負荷4以上）の職員数
    const highWorkloadCount = records.filter((r: { workloadScore: number }) => r.workloadScore >= 4).length
    // 部署別の件数
    const deptMap: Record<string, number> = {}
    records.forEach((r: { department: string }) => {
      if (r.department) deptMap[r.department] = (deptMap[r.department] ?? 0) + 1
    })

    return NextResponse.json({
      records,
      summary: {
        totalCount,
        avgWellbeingScore:  avgScore,
        highWorkloadCount,
        departmentCount:    Object.keys(deptMap).length,
      },
    })
  } catch (err) {
    console.error('StaffCondition GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── POST ハンドラ ───────────────────────────────────
// フォームの入力値を受け取り、Notion に書き込む

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: StaffConditionRecord = await req.json()

    // ── 入力バリデーション ──
    if (!body.staffName?.trim()) {
      return NextResponse.json({ error: '職員名は必須です' }, { status: 400 })
    }
    if (body.healthScore < 1 || body.healthScore > 5) {
      return NextResponse.json({ error: '体調スコアは1〜5の整数で入力してください' }, { status: 400 })
    }
    if (body.workloadScore < 1 || body.workloadScore > 5) {
      return NextResponse.json({ error: '業務負荷スコアは1〜5の整数で入力してください' }, { status: 400 })
    }
    if (body.teamWellBeingScore < 1 || body.teamWellBeingScore > 5) {
      return NextResponse.json({ error: 'チームWell-Beingスコアは1〜5の整数で入力してください' }, { status: 400 })
    }

    // ── Well-Being スコアを自動計算 ──
    const wellbeingScore = calcStaffWellbeingScore(body)

    // ── Notion の properties オブジェクトを構築 ──
    // Notion REST API のプロパティ形式に合わせて各フィールドを設定する
    const properties: Record<string, unknown> = {
      // タイトル型: 職員名
      '職員名': {
        title: [{ text: { content: body.staffName.trim() } }],
      },
      // 数値型: 体調・業務負荷・チームWB・wellbeing_score
      '体調スコア':          { number: body.healthScore },
      '業務負荷スコア':      { number: body.workloadScore },
      'チームWell-Beingスコア': { number: body.teamWellBeingScore },
      'wellbeing_score':     { number: wellbeingScore },
      // 日付型: 記録日
      '記録日': { date: { start: body.recordDate } },
    }

    // テキスト型: 任意フィールドは値がある場合だけセット
    if (body.municipalityName?.trim()) {
      properties['自治体名'] = {
        rich_text: [{ text: { content: body.municipalityName.trim() } }],
      }
    }
    if (body.department?.trim()) {
      properties['部署名'] = {
        rich_text: [{ text: { content: body.department.trim() } }],
      }
    }
    if (body.comment?.trim()) {
      properties['コメント'] = {
        rich_text: [{ text: { content: body.comment.trim() } }],
      }
    }

    // ── Notion にページ（レコード）を作成 ──
    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey),
      body: JSON.stringify({
        parent:     { database_id: STAFF_CONDITION_DB_ID },
        properties,
      }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${errText}` }, { status: 500 })
    }

    // 成功: 計算されたスコアも返してフロントで確認できるようにする
    return NextResponse.json({
      success:       true,
      wellbeingScore,  // フロントでトースト表示に使用
      message:       `${body.staffName}さんのコンディションを記録しました（WBスコア: ${wellbeingScore}点）`,
    })
  } catch (err) {
    console.error('StaffCondition POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
