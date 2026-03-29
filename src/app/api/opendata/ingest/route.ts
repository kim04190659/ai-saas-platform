// =====================================================
//  src/app/api/opendata/ingest/route.ts
//  人口・地域データ インポートAPIルート
//
//  ■ このファイルの役割
//    フロントエンドから送られたCSV解析済みデータを受け取り、
//    NotionのPopulationData DBに1件ずつ書き込む。
//
//  ■ Notion DB
//    🏘️ PopulationData DB
//    ID: 91876a16eed64ee5badc72b1c697154d
//    フィールド: 市区町村名・年度・総人口・世帯数・高齢化率・出生数・死亡数・データソース・インポート日
//
//  ■ リクエスト形式（POST）
//    {
//      records: PopulationRecord[],  // インポートするデータ行の配列
//      source: string,               // データソース名（例: "e-Gov国勢調査2020"）
//    }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// ─── 型定義 ──────────────────────────────────────────

/**
 * 人口データ1件の型
 * フロントエンドから送られてくる列マッピング済みのデータ
 */
export type PopulationRecord = {
  municipality: string    // 市区町村名（必須）
  year: number | null     // 年度
  population: number | null      // 総人口
  households: number | null      // 世帯数
  agingRate: number | null       // 高齢化率（%）
  births: number | null          // 出生数
  deaths: number | null          // 死亡数
}

// NotionのPopulationData DB ID
const POPULATION_DB_ID = '91876a16eed64ee5badc72b1c697154d'

// ─── POSTハンドラ ─────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const notionApiKey = process.env.NOTION_API_KEY
    if (!notionApiKey) {
      return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' }, { status: 500 })
    }

    const { records, source } = await req.json() as {
      records: PopulationRecord[]
      source: string
    }

    if (!records || records.length === 0) {
      return NextResponse.json({ error: 'インポートするデータがありません' }, { status: 400 })
    }

    // 今日の日付（インポート日として記録）
    const today = new Date().toISOString().split('T')[0] // YYYY-MM-DD

    let successCount = 0
    let errorCount = 0
    const errors: string[] = []

    // 1件ずつNotionに書き込む
    // （Notion APIはバッチ書き込みをサポートしていないため逐次処理）
    for (const record of records) {
      // 市区町村名が空の行はスキップ
      if (!record.municipality?.trim()) continue

      try {
        // Notion API のページ作成リクエストを組み立てる
        // 各フィールドは Notion のプロパティ型に合わせた形式で指定する
        const properties: Record<string, unknown> = {
          // タイトル型（必須）
          '市区町村名': {
            title: [{ type: 'text', text: { content: record.municipality.trim() } }],
          },
          // データソース（rich_text型）
          'データソース': {
            rich_text: [{ type: 'text', text: { content: source || '未指定' } }],
          },
          // インポート日（date型）
          'インポート日': {
            date: { start: today },
          },
        }

        // 数値フィールドは値がある場合のみ追加（null/NaNは除外）
        if (record.year !== null && !isNaN(record.year)) {
          properties['年度'] = { number: record.year }
        }
        if (record.population !== null && !isNaN(record.population)) {
          properties['総人口'] = { number: record.population }
        }
        if (record.households !== null && !isNaN(record.households)) {
          properties['世帯数'] = { number: record.households }
        }
        if (record.agingRate !== null && !isNaN(record.agingRate)) {
          properties['高齢化率'] = { number: record.agingRate }
        }
        if (record.births !== null && !isNaN(record.births)) {
          properties['出生数'] = { number: record.births }
        }
        if (record.deaths !== null && !isNaN(record.deaths)) {
          properties['死亡数'] = { number: record.deaths }
        }

        // Notion API でページ（= DBレコード）を作成
        const res = await fetch('https://api.notion.com/v1/pages', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${notionApiKey}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            parent: { database_id: POPULATION_DB_ID },
            properties,
          }),
        })

        if (res.ok) {
          successCount++
        } else {
          const errBody = await res.text()
          errorCount++
          errors.push(`${record.municipality}: ${errBody.slice(0, 80)}`)
        }

      } catch (e) {
        errorCount++
        errors.push(`${record.municipality}: ${String(e).slice(0, 80)}`)
      }
    }

    // 結果を返す
    return NextResponse.json({
      successCount,
      errorCount,
      errors: errors.slice(0, 5), // エラーは最大5件まで返す
      message: `${successCount}件のデータをNotionに保存しました${errorCount > 0 ? `（${errorCount}件エラー）` : ''}`,
    })

  } catch (err) {
    console.error('インポートAPIエラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
