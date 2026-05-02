/**
 * csv-adapter.ts
 * CSVファイル読み取りアダプタ
 *
 * オンプレのCSVファイルを読み込み、フィルタリング・集計して返す。
 * 個人情報フィールドは anonymizer.ts を通して自動マスクされる。
 */

import * as fs from 'fs'
import * as path from 'path'
import { parse } from 'csv-parse/sync'
import { anonymizeRecords, listMaskedFields } from '../anonymizer'

// データフォルダのルートパス（環境変数から取得）
const DATA_ROOT = process.env.DATA_ROOT ?? path.join(__dirname, '../../data')

/**
 * CSVファイルを読み込んで匿名化済みレコードを返す
 *
 * @param datasource - データソース名（例: 'kirishima/residents'）
 * @param filter - フィルタ条件（例: { 地区: '国分中央' }）
 * @param columns - 取得するカラム名（省略時は全カラム）
 * @param limit - 最大取得件数（デフォルト100件）
 */
export async function readCsv(params: {
  datasource: string
  filter?: Record<string, string>
  columns?: string[]
  limit?: number
}): Promise<{
  records: Record<string, unknown>[]
  totalCount: number
  maskedFields: string[]
  datasource: string
}> {
  const { datasource, filter, columns, limit = 100 } = params

  // ファイルパスを安全に組み立て（パストラバーサル防止）
  const safeName = datasource.replace(/\.\./g, '').replace(/^\//, '')
  const filePath = path.join(DATA_ROOT, `${safeName}.csv`)

  // ファイル存在確認
  if (!fs.existsSync(filePath)) {
    throw new Error(`データソースが見つかりません: ${datasource}（ファイル: ${filePath}）`)
  }

  // CSVを読み込む
  const rawContent = fs.readFileSync(filePath, 'utf-8')
  let records: Record<string, unknown>[] = parse(rawContent, {
    columns: true,        // 1行目をヘッダーとして使用
    skip_empty_lines: true,
    trim: true,
  })

  // フィルタリング
  if (filter && Object.keys(filter).length > 0) {
    records = records.filter(record => {
      return Object.entries(filter).every(([key, value]) => {
        return String(record[key] ?? '').includes(value)
      })
    })
  }

  const totalCount = records.length

  // カラム絞り込み
  if (columns && columns.length > 0) {
    records = records.map(record => {
      const filtered: Record<string, unknown> = {}
      for (const col of columns) {
        if (col in record) filtered[col] = record[col]
      }
      return filtered
    })
  }

  // 件数制限
  records = records.slice(0, limit)

  // 個人情報マスク（Claudeに渡す前に必ず通す）
  const maskedFields = records.length > 0 ? listMaskedFields(records[0]) : []
  const anonymized = anonymizeRecords(records)

  return {
    records: anonymized,
    totalCount,
    maskedFields,
    datasource,
  }
}
