// =====================================================
//  src/app/api/revenue/route.ts
//  収益・財政データ分析 API ルート — Sprint #17
//
//  ■ このファイルの役割
//    - GET : 収益データ DB から一覧を取得し、種別・地域タイプ別に集計する
//    - POST: 新しいデータポイントを Notion DB に登録する
//
//  ■ 使用 Notion DB
//    収益データ DB: 00dc2b2f34ef44f78f8dd6551258a9f2
//
//  ■ データ種別
//    ガイド記録 / 宿泊稼働 / SNS感情 / 産品販売 / EC転換 / 周遊パターン / 環境負荷 / その他
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { getMunicipalityById } from '@/config/municipalities'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'
const REVENUE_DB_ID   = '00dc2b2f34ef44f78f8dd6551258a9f2'

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── 自治体別サンプルデータ（Notion が空のときのフォールバック用）────

/** 収益サンプル1件の型（id は動的生成） */
interface SampleRevenue {
  name: string; dataType: string; regionType: string; reliability: string;
  value: number | null; baseValue: number | null; unit: string;
  municipality: string; period: string; aiHint: string; recordDate: string;
}

/** 屋久島町の収益サンプル */
const YAKUSHIMA_SAMPLE_REVENUES: SampleRevenue[] = [
  { name: '観光入込客数（屋久島）',      dataType: '周遊パターン', regionType: 'タイプA:世界遺産・国立公園', reliability: '高：実測値', value: 320000,    baseValue: 295000,    unit: '人',     municipality: '屋久島町', period: '2025年度', aiHint: '世界遺産効果で前年比+8.5%。縄文杉トレッキング許可証の予約制導入が混雑緩和に寄与。',         recordDate: '2026-03-31' },
  { name: '民宿・ホテル宿泊稼働率',      dataType: '宿泊稼働',    regionType: 'タイプA:世界遺産・国立公園', reliability: '高：実測値', value: 71,         baseValue: 65,        unit: '%',      municipality: '屋久島町', period: '2026年Q1', aiHint: '稼働率70%超えを達成。ハイシーズン（4-5月）は満室続出で機会損失あり。宿泊施設の新規誘致が急務。', recordDate: '2026-04-01' },
  { name: 'ヤクスギ・特産品EC販売額',    dataType: '産品販売',    regionType: 'タイプA:世界遺産・国立公園', reliability: '中：推計値', value: 42000000,  baseValue: 35000000,  unit: '円',     municipality: '屋久島町', period: '2025年度', aiHint: 'EC経由の販売が前年比+20%。ヤクスギ工芸品・タンカン・サバ節の3商品が牽引。',               recordDate: '2026-03-31' },
  { name: 'ふるさと納税受入額',          dataType: 'その他',      regionType: 'タイプA:世界遺産・国立公園', reliability: '高：実測値', value: 180000000, baseValue: 120000000, unit: '円',     municipality: '屋久島町', period: '2025年度', aiHint: '返礼品の屋久島体験ツアーが人気。前年比+50%の大幅増加。継続的な品揃え強化が必要。',           recordDate: '2026-03-31' },
  { name: 'SNS観光関連エンゲージメント', dataType: 'SNS感情',     regionType: 'タイプA:世界遺産・国立公園', reliability: '中：推計値', value: 850000,    baseValue: 620000,    unit: 'いいね', municipality: '屋久島町', period: '2026年Q1', aiHint: 'Instagram・TikTokで縄文杉動画が拡散。海外からの問い合わせが前年比+35%増加。',               recordDate: '2026-04-01' },
];

/** 霧島市の収益サンプル */
const KIRISHIMA_SAMPLE_REVENUES: SampleRevenue[] = [
  { name: '霧島・温泉地への観光入込',    dataType: '周遊パターン', regionType: 'タイプC:温泉・文化観光', reliability: '高：実測値', value: 2500000,    baseValue: 2200000,   unit: '人', municipality: '霧島市', period: '2025年度', aiHint: '霧島神宮参拝者と温泉来訪者が増加。インバウンド回復が全体を押し上げた。',                     recordDate: '2026-03-31' },
  { name: '霧島市内宿泊稼働率',          dataType: '宿泊稼働',    regionType: 'タイプC:温泉・文化観光', reliability: '高：実測値', value: 68,          baseValue: 62,        unit: '%', municipality: '霧島市', period: '2026年Q1', aiHint: '温泉旅館の稼働率が前年比+6pt改善。平日稼働率が低い課題は継続中。',                           recordDate: '2026-04-01' },
  { name: '農産物販売額（霧島茶・黒豚）', dataType: '産品販売',    regionType: 'タイプB:農林水産業',     reliability: '高：実測値', value: 850000000,  baseValue: 800000000, unit: '円', municipality: '霧島市', period: '2025年度', aiHint: '霧島茶のブランド認知向上でギフト需要が拡大。黒豚は飲食店需要が堅調。',                       recordDate: '2026-03-31' },
  { name: 'ふるさと納税受入額',           dataType: 'その他',      regionType: 'タイプC:温泉・文化観光', reliability: '高：実測値', value: 1200000000, baseValue: 980000000, unit: '円', municipality: '霧島市', period: '2025年度', aiHint: '返礼品の温泉宿泊券が人気1位。前年比+22%。さらなる返礼品多様化が成長余地。',                   recordDate: '2026-03-31' },
  { name: '霧島神宮門前商店街売上',       dataType: '産品販売',    regionType: 'タイプC:温泉・文化観光', reliability: '中：推計値', value: 320000000,  baseValue: 280000000, unit: '円', municipality: '霧島市', period: '2025年度', aiHint: '参拝者の購買率が上昇。縁起物・地酒・黒豚加工品が好評。夜間営業拡充で機会拡大の余地あり。', recordDate: '2026-03-31' },
];

/** 自治体IDに応じた収益サンプルデータを返す */
function getSampleRevenues(municipalityId: string): SampleRevenue[] {
  const map: Record<string, SampleRevenue[]> = {
    yakushima: YAKUSHIMA_SAMPLE_REVENUES,
    kirishima: KIRISHIMA_SAMPLE_REVENUES,
  }
  return map[municipalityId] ?? YAKUSHIMA_SAMPLE_REVENUES
}

// ─── GET ─────────────────────────────────────────────

// Sprint #35: NextRequest を受け取り municipalityId クエリを処理するように変更
export async function GET(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  // ── Sprint #35: クエリパラメータから自治体IDを取得 ──
  const { searchParams } = new URL(req.url)
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima'
  const municipality     = getMunicipalityById(municipalityId)

  try {
    // 自治体名でフィルタリングして収益データを取得（マルチテナント対応）
    const res = await fetch(`${NOTION_API_BASE}/databases/${REVENUE_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({
        filter: {
          property: '自治体名',
          rich_text: { contains: municipality.shortName },
        },
        page_size: 100,
        sorts: [{ property: '記録日', direction: 'descending' }],
      }),
    })
    if (!res.ok) {
      const t = await res.text()
      return NextResponse.json({ error: `Notion取得エラー: ${t}` }, { status: 500 })
    }

    const data = await res.json()

    // Sprint #37: Notion が空の場合は自治体別サンプルデータにフォールバック
    if (!data.results || data.results.length === 0) {
      const sampleRecords = getSampleRevenues(municipalityId).map((s, i) => ({ ...s, id: `sample-${i}` }))
      const total      = sampleRecords.length
      const withAiHint = sampleRecords.filter(r => r.aiHint).length
      const comparable = sampleRecords.filter(r => r.value !== null && r.baseValue !== null && r.baseValue !== 0)
      const avgDeviation = comparable.length > 0
        ? Math.round(comparable.reduce((s, r) => s + ((r.value! - r.baseValue!) / r.baseValue!) * 100, 0) / comparable.length)
        : null
      const byType: Record<string, number> = {}
      sampleRecords.forEach(r => { if (r.dataType) byType[r.dataType] = (byType[r.dataType] ?? 0) + 1 })
      return NextResponse.json({
        records: sampleRecords,
        summary: { total, withAiHint, avgDeviation, byType },
        recentWithHint: sampleRecords.filter(r => r.aiHint).slice(0, 5),
        source: 'sample',
      })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const records = (data.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        id:          r.id,
        name:        p['データ名']?.title?.[0]?.plain_text     ?? '（名称なし）',
        dataType:    p['データ種別']?.select?.name              ?? '',
        regionType:  p['地域タイプ']?.select?.name             ?? '',
        reliability: p['信頼度']?.select?.name                  ?? '',
        value:       p['数値']?.number                          ?? null,
        baseValue:   p['比較基準値']?.number                    ?? null,
        unit:        p['単位']?.rich_text?.[0]?.plain_text      ?? '',
        municipality: p['自治体名']?.rich_text?.[0]?.plain_text ?? '',
        period:      p['記録期間']?.rich_text?.[0]?.plain_text  ?? '',
        aiHint:      p['AI提言への示唆']?.rich_text?.[0]?.plain_text ?? '',
        recordDate:  p['記録日']?.date?.start                   ?? '',
      }
    })

    // ── サマリー集計 ──
    const total      = records.length
    const withAiHint = records.filter((r: { aiHint: string }) => r.aiHint).length

    // 基準値との比較が可能なレコードで平均乖離率を算出
    const comparable = records.filter((r: { value: number | null; baseValue: number | null }) =>
      r.value !== null && r.baseValue !== null && r.baseValue !== 0
    )
    const avgDeviation = comparable.length > 0
      ? Math.round(
          comparable.reduce((s: number, r: { value: number; baseValue: number }) =>
            s + ((r.value - r.baseValue) / r.baseValue) * 100, 0
          ) / comparable.length
        )
      : null

    // 種別ごとの件数集計
    const byType: Record<string, number> = {}
    records.forEach((r: { dataType: string }) => {
      if (r.dataType) byType[r.dataType] = (byType[r.dataType] ?? 0) + 1
    })

    // 最新の記録（AI提言示唆つき）を最大5件ピックアップ
    const recentWithHint = records
      .filter((r: { aiHint: string }) => r.aiHint)
      .slice(0, 5)

    return NextResponse.json({
      records,
      summary: { total, withAiHint, avgDeviation, byType },
      recentWithHint,
    })
  } catch (err) {
    console.error('Revenue GET エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}

// ─── POST ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY
  if (!apiKey) return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })

  try {
    const body = await req.json()

    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'データ名を入力してください' }, { status: 400 })
    }

    const properties: Record<string, unknown> = {
      'データ名': { title: [{ text: { content: body.name.trim() } }] },
    }

    if (body.dataType)    properties['データ種別']  = { select: { name: body.dataType } }
    if (body.regionType)  properties['地域タイプ']  = { select: { name: body.regionType } }
    if (body.reliability) properties['信頼度']       = { select: { name: body.reliability } }
    if (body.value !== undefined && body.value !== '')
      properties['数値']      = { number: Number(body.value) }
    if (body.baseValue !== undefined && body.baseValue !== '')
      properties['比較基準値'] = { number: Number(body.baseValue) }
    if (body.unit?.trim())
      properties['単位']       = { rich_text: [{ text: { content: body.unit.trim() } }] }
    if (body.municipality?.trim())
      properties['自治体名']   = { rich_text: [{ text: { content: body.municipality.trim() } }] }
    if (body.period?.trim())
      properties['記録期間']   = { rich_text: [{ text: { content: body.period.trim() } }] }
    if (body.aiHint?.trim())
      properties['AI提言への示唆'] = { rich_text: [{ text: { content: body.aiHint.trim() } }] }
    if (body.recordDate)
      properties['記録日'] = { date: { start: body.recordDate } }

    const notionRes = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({ parent: { database_id: REVENUE_DB_ID }, properties }),
    })

    if (!notionRes.ok) {
      const t = await notionRes.text()
      return NextResponse.json({ error: `Notion書き込みエラー: ${t}` }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: `「${body.name}」を記録しました` })
  } catch (err) {
    console.error('Revenue POST エラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
