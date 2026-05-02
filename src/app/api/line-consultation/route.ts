// =====================================================
//  src/app/api/line-consultation/route.ts
//  LINE相談ログ API ルート — Sprint #15
//
//  ■ このファイルの役割
//    - GET  : LINE相談ログ DB から相談一覧を取得する
//             クエリパラメータ ?status=未対応 でフィルタリング可能
//    - PATCH: 対応状況・回答内容・担当職員名・担当部署を更新する
//             職員が画面から対応状況を変更するために使用
//
//  ■ 使用 Notion DB
//    LINE相談ログ DB: d3c225835ec440f495bf79cd737eb862
//
//  ■ 対応状況の選択肢
//    未対応 / 対応中 / 完了 / エスカレーション
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityById } from '@/config/municipalities'
// Sprint #81-C: Notion 障害時に Supabase バックアップへ自動フォールバック
import { getWithFallback } from '@/lib/notion-fallback'

// ─── 定数 ─────────────────────────────────────────────
const NOTION_API_BASE   = 'https://api.notion.com/v1'
const NOTION_VERSION    = '2022-06-28'
// LINE相談ログ DB の ID
const LINE_LOG_DB_ID    = 'd3c225835ec440f495bf79cd737eb862'

// ─── 型定義 ──────────────────────────────────────────

/** API が返す相談1件の型 */
interface ConsultationRecord {
  id:              string
  title:           string   // 相談タイトル
  content:         string   // 相談内容
  category:        string   // 相談種別
  channel:         string   // チャンネル（住民LINE / 職員LINE）
  status:          string   // 対応状況
  answer:          string   // 回答内容
  staffName:       string   // 担当職員名
  department:      string   // 担当部署
  aiResult:        string   // AI振り分け結果
  anonymousId:     string   // 匿名ID（ハッシュ化済み、表示用）
  lineUserId:      string   // Sprint #27追加: 実際のLINEユーザーID（プッシュ返信用）
  receivedAt:      string   // 受信日時
  satisfaction:    number   // 住民満足度
}

/** PATCH リクエストの型 */
interface UpdateRequest {
  id:          string   // Notion ページ ID（必須）
  status?:     string   // 対応状況（変更する場合）
  answer?:     string   // 回答内容（記録する場合）
  staffName?:  string   // 担当職員名（記録する場合）
  department?: string   // 担当部署（変更する場合）
}

// ─── 自治体別サンプルデータ（Notion が空のときのフォールバック用）────

/** LINE相談サンプル1件の型 */
interface SampleConsultation {
  title: string; content: string; category: string; channel: string;
  status: string; answer: string; staffName: string; department: string;
  aiResult: string; anonymousId: string; lineUserId: string;
  receivedAt: string; satisfaction: number;
}

/** 屋久島町のLINE相談サンプル */
const YAKUSHIMA_SAMPLE_CONSULTATIONS: SampleConsultation[] = [
  { title: '移住後の生活について教えてほしい', content: '先月屋久島に移住しました。ゴミの分別方法と水道の手続きを教えてください。', category: '生活・環境', channel: '住民LINE', status: '完了', answer: 'ゴミ分別マニュアルをお送りします。水道の開栓手続きは役場住民課（0997-46-2111）にお電話ください。', staffName: '田中 花子', department: '住民課', aiResult: '生活手続き → 住民課', anonymousId: 'anon-yk-001', lineUserId: '', receivedAt: '2026-04-12T09:30:00', satisfaction: 5 },
  { title: '縄文杉トレッキングの混雑状況は？', content: '来月トレッキングを計画しています。混雑する時間帯と空いている曜日を教えてください。', category: '観光・体験', channel: '住民LINE', status: '完了', answer: '平日早朝（5〜7時スタート）が比較的空いています。許可証は事前予約制をご利用ください。', staffName: '山田 太郎', department: '観光課', aiResult: '観光情報 → 観光課', anonymousId: 'anon-yk-002', lineUserId: '', receivedAt: '2026-04-10T14:15:00', satisfaction: 4 },
  { title: '子供の保育所について', content: '来春から子供を保育所に入れたいのですが、空き状況と申込方法を教えてください。', category: '子育て・教育', channel: '住民LINE', status: '対応中', answer: '', staffName: '佐藤 美咲', department: '福祉課', aiResult: '保育所申込 → 福祉課', anonymousId: 'anon-yk-003', lineUserId: '', receivedAt: '2026-04-11T10:00:00', satisfaction: 0 },
  { title: '台風接近時の避難場所を確認したい', content: '島出身ではなく、どこに避難すればよいか分かりません。近くの避難所を教えてください。', category: '防災・安全', channel: '住民LINE', status: '完了', answer: '宮之浦地区の避難所は「屋久島環境文化村センター」です。防災マップをお送りします。', staffName: '中村 健一', department: '総務課', aiResult: '防災情報 → 総務課', anonymousId: 'anon-yk-004', lineUserId: '', receivedAt: '2026-04-09T16:45:00', satisfaction: 5 },
  { title: '水道料金の支払い方法', content: 'コンビニでの支払いはできますか？口座振替の手続きも知りたいです。', category: '税・手続き', channel: '住民LINE', status: '未対応', answer: '', staffName: '', department: '', aiResult: '税・料金 → 収納課', anonymousId: 'anon-yk-005', lineUserId: '', receivedAt: '2026-04-13T09:00:00', satisfaction: 0 },
];

/** 霧島市のLINE相談サンプル */
const KIRISHIMA_SAMPLE_CONSULTATIONS: SampleConsultation[] = [
  { title: '霧島神宮周辺の駐車場について', content: '初詣で霧島神宮に行きたいのですが、駐車場の混雑状況を教えてください。臨時駐車場はありますか？', category: '観光・体験', channel: '住民LINE', status: '完了', answer: '元旦は大変混雑します。臨時駐車場（霧島高校グラウンド）をご利用ください。シャトルバスも運行します。', staffName: '松田 浩二', department: '観光課', aiResult: '観光情報 → 観光課', anonymousId: 'anon-kr-001', lineUserId: '', receivedAt: '2026-04-11T10:30:00', satisfaction: 4 },
  { title: '市税の分割納付について', content: '今月の市民税の一括納付が難しい状況です。分割払いの相談は可能でしょうか？', category: '税・手続き', channel: '住民LINE', status: '対応中', answer: '分割納付のご相談は収納課（0995-45-5111）にてお受けしています。', staffName: '木村 洋子', department: '収納課', aiResult: '税務相談 → 収納課', anonymousId: 'anon-kr-002', lineUserId: '', receivedAt: '2026-04-10T13:00:00', satisfaction: 3 },
  { title: '道路の陥没を発見しました', content: '国分地区の市道に大きな穴があります。車が通れる状況ですが危険です。早急に対応してください。', category: 'インフラ・環境', channel: '住民LINE', status: '完了', answer: '現地を確認しました。本日中に補修工事を行います。ご連絡いただきありがとうございます。', staffName: '田原 誠', department: '建設課', aiResult: 'インフラ → 建設課', anonymousId: 'anon-kr-003', lineUserId: '', receivedAt: '2026-04-09T08:15:00', satisfaction: 5 },
  { title: '保育所の一時預かりサービス', content: '急用があり子供を預けたいのですが、一時預かりサービスの空き状況を教えてください。', category: '子育て・教育', channel: '住民LINE', status: '完了', answer: '隼人児童センターで本日14時以降お受けできます。事前にお電話での予約をお願いします。', staffName: '吉田 さゆり', department: '子育て支援課', aiResult: '子育て → 子育て支援課', anonymousId: 'anon-kr-004', lineUserId: '', receivedAt: '2026-04-12T09:45:00', satisfaction: 5 },
  { title: 'ゴミ収集日が変わったか確認したい', content: 'ゴールデンウィーク期間中のゴミ収集日を教えてください。普通ごみと資源ごみ両方知りたいです。', category: '生活・環境', channel: '住民LINE', status: '未対応', answer: '', staffName: '', department: '', aiResult: '生活情報 → 環境課', anonymousId: 'anon-kr-005', lineUserId: '', receivedAt: '2026-04-13T07:30:00', satisfaction: 0 },
];

/** 自治体IDに応じたLINE相談サンプルデータを返す */
function getSampleConsultations(municipalityId: string): SampleConsultation[] {
  const map: Record<string, SampleConsultation[]> = {
    yakushima: YAKUSHIMA_SAMPLE_CONSULTATIONS,
    kirishima: KIRISHIMA_SAMPLE_CONSULTATIONS,
  }
  return map[municipalityId] ?? YAKUSHIMA_SAMPLE_CONSULTATIONS
}

// ─── ヘルパー関数 ─────────────────────────────────────

/** Notion API 共通ヘッダーを生成 */
function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── GET ハンドラ ─────────────────────────────────────
// LINE相談ログ一覧を取得してフロントに返す

export async function GET(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  // クエリパラメータ ?status=未対応 でフィルタリング（省略時は全件）
  const statusFilter = req.nextUrl.searchParams.get('status')

  // ── Sprint #36: クエリパラメータから自治体IDを取得 ──
  const municipalityId = req.nextUrl.searchParams.get('municipalityId') ?? 'kirishima'
  const municipality   = getMunicipalityById(municipalityId)

  try {
    // ── Sprint #81-C: getWithFallback でラップ ─────────────────────
    // Notion が応答しない場合は Supabase バックアップを自動で使用する。
    // dbType 'resident_consult' はバックアップエンジンの保存キーと一致させること。
    const { data: notionResults, fromBackup, backedUpAt } =
      await getWithFallback<object[]>(
        municipalityId,
        'resident_consult',
        async () => {
          // ── Notion DB クエリ ──
          // 受信日時の新しい順で最大 100 件取得
          const queryBody: Record<string, unknown> = {
            page_size: 100,
            sorts: [{ property: '受信日時', direction: 'descending' }],
          }

          // ── フィルター構築（ステータスのみ）──
          // 注意: LINE相談ログDBには現時点で「自治体名」プロパティがないため
          // ステータスフィルターのみを適用する。
          // 将来的にDBへ「自治体名」プロパティを追加した際に再度マルチテナント対応を行う。
          // （参照: municipality.shortName = ${municipality.shortName}）
          if (statusFilter) {
            queryBody.filter = {
              property: '対応状況',
              select: { equals: statusFilter },
            }
          }
          // ステータス指定なし → フィルターなし（全件取得）

          const res = await fetch(`${NOTION_API_BASE}/databases/${LINE_LOG_DB_ID}/query`, {
            method:  'POST',
            headers: notionHeaders(notionApiKey),
            body:    JSON.stringify(queryBody),
          })

          if (!res.ok) {
            // Notion 応答エラー → getWithFallback がキャッチして Supabase へ
            const errText = await res.text()
            throw new Error(`Notion取得エラー: ${errText}`)
          }

          const data = await res.json()
          // 結果が空の場合は空配列を返す（フォールバックには進まない）
          return (data.results ?? []) as object[]
        },
      )

    // Notion が空 かつ バックアップもない場合 → サンプルデータにフォールバック
    if (!notionResults || notionResults.length === 0) {
      // ステータスフィルターが指定されている場合はサンプルも絞り込む
      const allSamples = getSampleConsultations(municipalityId)
      const filtered   = statusFilter
        ? allSamples.filter(s => s.status === statusFilter)
        : allSamples
      const sampleRecords = filtered.map((s, i) => ({ ...s, id: `sample-${i}` }))
      // サマリーは全件で算出（フィルターなし）
      const allForSummary = allSamples
      const total           = allForSummary.length
      const unhandledCount  = allForSummary.filter(r => r.status === '未対応').length
      const inProgressCount = allForSummary.filter(r => r.status === '対応中').length
      const completedCount  = allForSummary.filter(r => r.status === '完了').length
      const escalatedCount  = allForSummary.filter(r => r.status === 'エスカレーション').length
      const completionRate  = total > 0 ? Math.round((completedCount / total) * 100) : 0
      return NextResponse.json({
        records: sampleRecords,
        summary: { total, unhandledCount, inProgressCount, completedCount, escalatedCount, completionRate },
        source: 'sample',
      })
    }

    // Notion（またはバックアップ）レコードを扱いやすい形に変換
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records: ConsultationRecord[] = notionResults.map((r: any) => {
      const p = r.properties
      return {
        id:           r.id,
        title:        p['相談タイトル']?.title?.[0]?.plain_text    ?? '（タイトルなし）',
        content:      p['相談内容']?.rich_text?.[0]?.plain_text    ?? '',
        category:     p['相談種別']?.select?.name                  ?? '',
        channel:      p['チャンネル']?.select?.name                ?? '',
        status:       p['対応状況']?.select?.name                  ?? '未対応',
        answer:       p['回答内容']?.rich_text?.[0]?.plain_text    ?? '',
        staffName:    p['担当職員名']?.rich_text?.[0]?.plain_text  ?? '',
        department:   p['担当部署']?.select?.name                  ?? '',
        aiResult:     p['AI振り分け結果']?.rich_text?.[0]?.plain_text ?? '',
        anonymousId:  p['匿名ID']?.rich_text?.[0]?.plain_text      ?? '',
        // Sprint #27: 実際のLINEユーザーID（職員からのプッシュ返信に使用）
        lineUserId:   p['LINE_UserID']?.rich_text?.[0]?.plain_text ?? '',
        receivedAt:   p['受信日時']?.date?.start                   ?? '',
        satisfaction: p['住民満足度']?.number                      ?? 0,
      }
    }) ?? []

    // ── サマリー集計 ──
    // ステータス別件数を集計してフロントのカード表示用に返す
    const total            = records.length
    const unhandledCount   = records.filter(r => r.status === '未対応').length
    const inProgressCount  = records.filter(r => r.status === '対応中').length
    const completedCount   = records.filter(r => r.status === '完了').length
    const escalatedCount   = records.filter(r => r.status === 'エスカレーション').length
    // 完了率（0件の場合は0%）
    const completionRate   = total > 0 ? Math.round((completedCount / total) * 100) : 0

    return NextResponse.json({
      records,
      summary: {
        total,
        unhandledCount,
        inProgressCount,
        completedCount,
        escalatedCount,
        completionRate,
      },
      // Sprint #81-C: バックアップからの取得かどうかをフロントに伝える
      // fromBackup=true のとき NotionStatusBanner が自動表示される
      fromBackup,
      backedUpAt,
    })
  } catch (err) {
    console.error('LineConsultation GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}

// ─── PATCH ハンドラ ───────────────────────────────────
// 対応状況・回答内容などを更新する（職員が画面から操作）

export async function PATCH(req: NextRequest) {
  const notionApiKey = process.env.NOTION_API_KEY
  if (!notionApiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が設定されていません' }, { status: 500 })
  }

  try {
    const body: UpdateRequest = await req.json()

    // ── 入力バリデーション ──
    if (!body.id) {
      return NextResponse.json({ error: '相談IDが必要です' }, { status: 400 })
    }

    // ── 更新する properties を構築 ──
    // 値が指定されたフィールドだけを更新する（undefined のフィールドは変更しない）
    const properties: Record<string, unknown> = {}

    if (body.status) {
      // select 型: { select: { name: 値 } }
      properties['対応状況'] = { select: { name: body.status } }
    }
    if (body.answer !== undefined) {
      // rich_text 型: テキストコンテンツを配列で渡す
      properties['回答内容'] = {
        rich_text: body.answer.trim()
          ? [{ text: { content: body.answer.trim() } }]
          : [],
      }
    }
    if (body.staffName !== undefined) {
      properties['担当職員名'] = {
        rich_text: body.staffName.trim()
          ? [{ text: { content: body.staffName.trim() } }]
          : [],
      }
    }
    if (body.department) {
      properties['担当部署'] = { select: { name: body.department } }
    }

    // ── Notion ページを更新 ──
    // PATCH /pages/{page_id} で既存レコードのプロパティを上書き
    const notionRes = await fetch(`${NOTION_API_BASE}/pages/${body.id}`, {
      method:  'PATCH',
      headers: notionHeaders(notionApiKey),
      body:    JSON.stringify({ properties }),
    })

    if (!notionRes.ok) {
      const errText = await notionRes.text()
      return NextResponse.json({ error: `Notion更新エラー: ${errText}` }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `対応状況を「${body.status ?? '—'}」に更新しました`,
    })
  } catch (err) {
    console.error('LineConsultation PATCH エラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
