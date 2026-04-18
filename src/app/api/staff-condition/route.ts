// =====================================================
//  src/app/api/staff-condition/route.ts
//  職員コンディション API ルート
//
//  ■ このファイルの役割
//    - GET : deptId ごとに職員コンディション一覧を返す
//            Notion が未設定 or 0件 → 部署別サンプルデータにフォールバック
//    - POST: フォームの入力値を受け取り、deptId を含めて Notion に記録する
//
//  ■ 部署分離の仕組み
//    1. POST 時に deptId を Notion プロパティとして保存
//    2. GET 時に deptId でフィルタリング → 他部署のデータは見えない
//    3. Notion が空 or 未設定の場合はサンプルデータを返す（開発・デモ用）
//
//  ■ Well-Being スコア計算式
//    体調(1-5)   → (体調-1)×10   最大40pt
//    業務負荷(1-5) → (5-負荷)×10  最大40pt（低いほど高得点）
//    チームWB(1-5) → (チームWB-1)×5 最大20pt
//    合計                          最大100pt
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE    = 'https://api.notion.com/v1'
const NOTION_VERSION     = '2022-06-28'
const STAFF_CONDITION_DB_ID = '4d65b3ba47764ea6b472c2c9452f27c6'

// ─── 型定義 ──────────────────────────────────────────

interface StaffConditionRecord {
  staffName:          string
  municipalityName?:  string
  department?:        string
  healthScore:        number
  workloadScore:      number
  teamWellBeingScore: number
  comment?:           string
  recordDate:         string
  deptId?:            string   // 追加: 部署分離キー
}

// ─── サンプルデータ（Notion 未設定 or 0件時のフォールバック）──────

/** WBスコアを計算するユーティリティ */
function calcWB(h: number, w: number, t: number) {
  return (h - 1) * 10 + (5 - w) * 10 + (t - 1) * 5;
}

const SAMPLE_DATA: Record<string, Array<{
  id: string; staffName: string; municipalityName: string;
  department: string; healthScore: number; workloadScore: number;
  teamWellBeingScore: number; wellbeingScore: number; comment: string; recordDate: string;
}>> = {
  // ── 行政 ──────────────────────────────────────────
  gyosei: [
    { id: 's-g1', staffName: '田中 一郎', municipalityName: '屋久島町', department: '住民課',     healthScore: 4, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(4,3,4), comment: '窓口対応が増えているが概ね安定', recordDate: '2026-04-17' },
    { id: 's-g2', staffName: '佐藤 花子', municipalityName: '屋久島町', department: '総務課',     healthScore: 3, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(3,4,3), comment: '年度末の事務処理が重なっている',  recordDate: '2026-04-17' },
    { id: 's-g3', staffName: '鈴木 次郎', municipalityName: '屋久島町', department: '福祉課',     healthScore: 5, workloadScore: 2, teamWellBeingScore: 5, wellbeingScore: calcWB(5,2,5), comment: '',                              recordDate: '2026-04-16' },
    { id: 's-g4', staffName: '山田 三郎', municipalityName: '屋久島町', department: '財政課',     healthScore: 2, workloadScore: 5, teamWellBeingScore: 2, wellbeingScore: calcWB(2,5,2), comment: '決算作業が佳境。休日出勤が続く', recordDate: '2026-04-16' },
    { id: 's-g5', staffName: '中村 四郎', municipalityName: '屋久島町', department: '情報政策課', healthScore: 4, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(4,3,4), comment: 'DX推進プロジェクト順調',          recordDate: '2026-04-15' },
    { id: 's-g6', staffName: '小田 幸子', municipalityName: '屋久島町', department: '企画課',     healthScore: 3, workloadScore: 3, teamWellBeingScore: 5, wellbeingScore: calcWB(3,3,5), comment: 'チームの雰囲気が良い',            recordDate: '2026-04-15' },
  ],

  // ── 教育 ──────────────────────────────────────────
  education: [
    { id: 's-e1', staffName: '田村 恵子', municipalityName: '屋久島町', department: '小学校',         healthScore: 3, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(3,4,3), comment: '学年末の通知表作成で多忙',      recordDate: '2026-04-17' },
    { id: 's-e2', staffName: '木村 誠',   municipalityName: '屋久島町', department: '中学校',         healthScore: 4, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(4,3,4), comment: '部活動指導も安定している',      recordDate: '2026-04-17' },
    { id: 's-e3', staffName: '小林 美咲', municipalityName: '屋久島町', department: '高等学校',       healthScore: 2, workloadScore: 5, teamWellBeingScore: 2, wellbeingScore: calcWB(2,5,2), comment: '進路指導と授業準備が重なり限界に近い', recordDate: '2026-04-16' },
    { id: 's-e4', staffName: '松本 正男', municipalityName: '屋久島町', department: '教育委員会事務局', healthScore: 4, workloadScore: 2, teamWellBeingScore: 5, wellbeingScore: calcWB(4,2,5), comment: '新年度体制が整いスムーズ',        recordDate: '2026-04-16' },
    { id: 's-e5', staffName: '井上 和子', municipalityName: '屋久島町', department: '給食センター',   healthScore: 5, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(5,3,4), comment: 'アレルギー対応も問題なし',        recordDate: '2026-04-15' },
    { id: 's-e6', staffName: '渡辺 広人', municipalityName: '屋久島町', department: '特別支援学校',   healthScore: 3, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(3,4,3), comment: '個別支援計画の作成が山積み',      recordDate: '2026-04-15' },
  ],

  // ── 警察・消防 ────────────────────────────────────
  safety: [
    { id: 's-s1', staffName: '高橋 剛',   municipalityName: '屋久島町', department: '消防署 本署', healthScore: 4, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(4,4,3), comment: '夜間出動が続いている',              recordDate: '2026-04-17' },
    { id: 's-s2', staffName: '伊藤 隆',   municipalityName: '屋久島町', department: '警察署 交番', healthScore: 3, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(3,3,4), comment: '地域見回りは安定',                  recordDate: '2026-04-17' },
    { id: 's-s3', staffName: '斉藤 浩二', municipalityName: '屋久島町', department: '救急隊',     healthScore: 3, workloadScore: 5, teamWellBeingScore: 3, wellbeingScore: calcWB(3,5,3), comment: '救急出動が増加傾向。疲労蓄積あり',  recordDate: '2026-04-16' },
    { id: 's-s4', staffName: '藤本 誠司', municipalityName: '屋久島町', department: '消防署 分署', healthScore: 5, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(5,3,4), comment: '体力維持良好',                      recordDate: '2026-04-16' },
    { id: 's-s5', staffName: '村田 幸子', municipalityName: '屋久島町', department: '地域課',     healthScore: 4, workloadScore: 3, teamWellBeingScore: 5, wellbeingScore: calcWB(4,3,5), comment: 'コミュニティ連携が充実',              recordDate: '2026-04-15' },
    { id: 's-s6', staffName: '西村 康弘', municipalityName: '屋久島町', department: '交通課',     healthScore: 4, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(4,4,3), comment: 'GW前の交通指導で多忙',               recordDate: '2026-04-15' },
  ],

  // ── 医療・介護 ────────────────────────────────────
  healthcare: [
    { id: 's-h1', staffName: '青木 みさ', municipalityName: '屋久島町', department: '内科',             healthScore: 3, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(3,4,3), comment: '外来患者数が増加傾向',            recordDate: '2026-04-17' },
    { id: 's-h2', staffName: '坂本 剛士', municipalityName: '屋久島町', department: '救急',             healthScore: 4, workloadScore: 5, teamWellBeingScore: 4, wellbeingScore: calcWB(4,5,4), comment: '連続当直あり。休養が必要な状態',  recordDate: '2026-04-17' },
    { id: 's-h3', staffName: '橋本 美穂', municipalityName: '屋久島町', department: '訪問診療',         healthScore: 4, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(4,3,4), comment: '在宅患者との関係構築が順調',      recordDate: '2026-04-16' },
    { id: 's-h4', staffName: '森 恵子',   municipalityName: '屋久島町', department: '特別養護老人ホーム', healthScore: 2, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(2,4,3), comment: '夜勤明けで体調不良気味',          recordDate: '2026-04-16' },
    { id: 's-h5', staffName: '池田 一夫', municipalityName: '屋久島町', department: '地域包括支援センター', healthScore: 4, workloadScore: 3, teamWellBeingScore: 5, wellbeingScore: calcWB(4,3,5), comment: '多機関連携がうまく機能している', recordDate: '2026-04-15' },
    { id: 's-h6', staffName: '石田 幸子', municipalityName: '屋久島町', department: '居宅介護支援',     healthScore: 3, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(3,4,3), comment: 'ケアプラン更新が集中している',      recordDate: '2026-04-15' },
  ],

  // ── 公共設備 ──────────────────────────────────────
  infrastructure: [
    { id: 's-i1', staffName: '岡田 修',   municipalityName: '屋久島町', department: '電気設備課', healthScore: 4, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(4,3,4), comment: '設備点検は計画通り進行',          recordDate: '2026-04-17' },
    { id: 's-i2', staffName: '吉田 勝',   municipalityName: '屋久島町', department: '上水道課',   healthScore: 3, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(3,4,3), comment: '老朽管の調査で現場作業が多い',    recordDate: '2026-04-17' },
    { id: 's-i3', staffName: '宮田 武',   municipalityName: '屋久島町', department: '道路維持課', healthScore: 4, workloadScore: 4, teamWellBeingScore: 3, wellbeingScore: calcWB(4,4,3), comment: '冬季の路面補修が続いている',      recordDate: '2026-04-16' },
    { id: 's-i4', staffName: '安田 守',   municipalityName: '屋久島町', department: '下水道課',   healthScore: 5, workloadScore: 2, teamWellBeingScore: 5, wellbeingScore: calcWB(5,2,5), comment: '新設工事が順調に完了',            recordDate: '2026-04-16' },
    { id: 's-i5', staffName: '原田 勇',   municipalityName: '屋久島町', department: 'ガス供給課', healthScore: 3, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(3,3,4), comment: 'ガス管定期点検中',                recordDate: '2026-04-15' },
    { id: 's-i6', staffName: '川本 晴彦', municipalityName: '屋久島町', department: '橋梁管理課', healthScore: 4, workloadScore: 3, teamWellBeingScore: 4, wellbeingScore: calcWB(4,3,4), comment: '橋梁点検報告書の作成を進めている', recordDate: '2026-04-15' },
  ],
};

// ─── ヘルパー関数 ────────────────────────────────────

function notionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

function calcStaffWellbeingScore(record: StaffConditionRecord): number {
  const healthPt   = (record.healthScore - 1) * 10
  const workloadPt = (5 - record.workloadScore) * 10
  const teamPt     = (record.teamWellBeingScore - 1) * 5
  return Math.round(Math.min(100, Math.max(0, healthPt + workloadPt + teamPt)))
}

/** サマリーを records から集計する */
function buildSummary(records: typeof SAMPLE_DATA['gyosei']) {
  const totalCount = records.length
  const avgWellbeingScore = totalCount > 0
    ? Math.round(records.reduce((s, r) => s + r.wellbeingScore, 0) / totalCount)
    : 0
  const highWorkloadCount = records.filter((r) => r.workloadScore >= 4).length
  const deptMap: Record<string, number> = {}
  records.forEach((r) => {
    if (r.department) deptMap[r.department] = (deptMap[r.department] ?? 0) + 1
  })
  return { totalCount, avgWellbeingScore, highWorkloadCount, departmentCount: Object.keys(deptMap).length }
}

// ─── GET ハンドラ ────────────────────────────────────

export async function GET(req: NextRequest) {
  // deptId をクエリパラメータから取得（未指定は 'gyosei'）
  const deptId = req.nextUrl.searchParams.get('deptId') ?? 'gyosei'

  const notionApiKey = process.env.NOTION_API_KEY

  // Notion API キーが未設定 → サンプルデータを返す
  if (!notionApiKey) {
    const records = SAMPLE_DATA[deptId] ?? SAMPLE_DATA['gyosei']
    return NextResponse.json({ records, summary: buildSummary(records), source: 'sample' })
  }

  try {
    // Notion をクエリ。deptId プロパティでフィルタする。
    // ※ Notion DB に 'deptId' プロパティがない場合はフィルタを外してJS側でフィルタする。
    const body: Record<string, unknown> = {
      page_size: 100,
      sorts: [{ property: '記録日', direction: 'descending' }],
      filter: {
        property: 'deptId',
        rich_text: { equals: deptId },
      },
    }

    const res = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey),
      body: JSON.stringify(body),
    })

    // Notion フィルタが失敗（プロパティなし等）→ フィルタなしで再クエリ
    if (!res.ok) {
      const retryRes = await fetch(`${NOTION_API_BASE}/databases/${STAFF_CONDITION_DB_ID}/query`, {
        method: 'POST',
        headers: notionHeaders(notionApiKey),
        body: JSON.stringify({ page_size: 100, sorts: [{ property: '記録日', direction: 'descending' }] }),
      })
      if (!retryRes.ok) throw new Error(await retryRes.text())
      const retryData = await retryRes.json()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const allRecords = retryData.results?.map((r: any) => mapNotionRecord(r)) ?? []
      // JS 側で deptId フィルタ（deptId プロパティがある場合のみ絞り込み）
      const filtered = allRecords.filter((r: { deptId?: string }) =>
        !r.deptId || r.deptId === deptId
      )
      const records = filtered.length > 0 ? filtered : (SAMPLE_DATA[deptId] ?? SAMPLE_DATA['gyosei'])
      return NextResponse.json({ records, summary: buildSummary(records), source: filtered.length > 0 ? 'notion' : 'sample' })
    }

    const data    = await res.json()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = data.results?.map((r: any) => mapNotionRecord(r)) ?? []

    // Notion に 0 件 → サンプルデータにフォールバック
    if (records.length === 0) {
      const sample = SAMPLE_DATA[deptId] ?? SAMPLE_DATA['gyosei']
      return NextResponse.json({ records: sample, summary: buildSummary(sample), source: 'sample' })
    }

    return NextResponse.json({ records, summary: buildSummary(records), source: 'notion' })

  } catch (err) {
    console.error('StaffCondition GET エラー:', err)
    // エラー時もサンプルデータで返す（画面を壊さない）
    const sample = SAMPLE_DATA[deptId] ?? SAMPLE_DATA['gyosei']
    return NextResponse.json({ records: sample, summary: buildSummary(sample), source: 'sample' })
  }
}

// ─── Notion レコードのマッピング ─────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotionRecord(r: any) {
  const p = r.properties
  return {
    id:                 r.id,
    staffName:          p['職員名']?.title?.[0]?.plain_text ?? '（名前なし）',
    municipalityName:   p['自治体名']?.rich_text?.[0]?.plain_text ?? '',
    department:         p['部署名']?.rich_text?.[0]?.plain_text ?? '',
    deptId:             p['deptId']?.rich_text?.[0]?.plain_text ?? '',
    healthScore:        p['体調スコア']?.number ?? 0,
    workloadScore:      p['業務負荷スコア']?.number ?? 0,
    teamWellBeingScore: p['チームWell-Beingスコア']?.number ?? 0,
    wellbeingScore:     p['wellbeing_score']?.number ?? 0,
    comment:            p['コメント']?.rich_text?.[0]?.plain_text ?? '',
    recordDate:         p['記録日']?.date?.start ?? '',
  }
}

// ─── POST ハンドラ ───────────────────────────────────

export async function POST(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: StaffConditionRecord = await req.json()

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

    const wellbeingScore = calcStaffWellbeingScore(body)

    const properties: Record<string, unknown> = {
      '職員名':               { title: [{ text: { content: body.staffName.trim() } }] },
      '体調スコア':            { number: body.healthScore },
      '業務負荷スコア':         { number: body.workloadScore },
      'チームWell-Beingスコア': { number: body.teamWellBeingScore },
      'wellbeing_score':       { number: wellbeingScore },
      '記録日':               { date: { start: body.recordDate } },
    }

    // テキスト型（任意フィールド）
    if (body.municipalityName?.trim()) {
      properties['自治体名'] = { rich_text: [{ text: { content: body.municipalityName.trim() } }] }
    }
    if (body.department?.trim()) {
      properties['部署名'] = { rich_text: [{ text: { content: body.department.trim() } }] }
    }
    if (body.comment?.trim()) {
      properties['コメント'] = { rich_text: [{ text: { content: body.comment.trim() } }] }
    }
    // ★ deptId を保存（部署分離の核心）
    if (body.deptId?.trim()) {
      properties['deptId'] = { rich_text: [{ text: { content: body.deptId.trim() } }] }
    }

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

    return NextResponse.json({
      success:       true,
      wellbeingScore,
      message: `${body.staffName}さんのコンディションを記録しました（WBスコア: ${wellbeingScore}点）`,
    })
  } catch (err) {
    console.error('StaffCondition POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
