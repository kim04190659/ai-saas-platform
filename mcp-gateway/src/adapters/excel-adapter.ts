/**
 * excel-adapter.ts
 * Excelファイル読み取りアダプタ
 *
 * 市役所でよく使われるExcel（.xlsx / .xls）ファイルを読み込む。
 * 複数シートに対応。個人情報は anonymizer.ts で自動マスク。
 */

import * as fs from 'fs'
import * as path from 'path'
import * as XLSX from 'xlsx'
import { anonymizeRecords, listMaskedFields } from '../anonymizer'

const DATA_ROOT = process.env.DATA_ROOT ?? path.join(__dirname, '../../data')

/**
 * Excelファイルを読み込んで匿名化済みレコードを返す
 *
 * @param datasource - データソース名（例: 'kirishima/welfare'）
 * @param sheetName - シート名（省略時は最初のシート）
 * @param filter - フィルタ条件
 * @param columns - 取得するカラム名
 * @param limit - 最大取得件数（デフォルト100件）
 */
export async function readExcel(params: {
  datasource: string
  sheetName?: string
  filter?: Record<string, string>
  columns?: string[]
  limit?: number
}): Promise<{
  records: Record<string, unknown>[]
  totalCount: number
  maskedFields: string[]
  datasource: string
  sheetName: string
  availableSheets: string[]
}> {
  const { datasource, sheetName, filter, columns, limit = 100 } = params

  // ファイルパスを安全に組み立て
  const safeName = datasource.replace(/\.\./g, '').replace(/^\//, '')

  // .xlsx か .xls を自動判定
  let filePath = path.join(DATA_ROOT, `${safeName}.xlsx`)
  if (!fs.existsSync(filePath)) {
    filePath = path.join(DATA_ROOT, `${safeName}.xls`)
  }
  if (!fs.existsSync(filePath)) {
    throw new Error(`データソースが見つかりません: ${datasource}（.xlsx / .xls を確認してください）`)
  }

  // Excelを読み込む
  const workbook = XLSX.readFile(filePath)
  const availableSheets = workbook.SheetNames

  // 使用するシートを決定（指定なしなら最初のシート）
  const targetSheet = sheetName ?? availableSheets[0]
  if (!availableSheets.includes(targetSheet)) {
    throw new Error(`シートが見つかりません: ${targetSheet}（利用可能: ${availableSheets.join(', ')}）`)
  }

  const worksheet = workbook.Sheets[targetSheet]

  // シートをJSON配列に変換（1行目をヘッダーとして使用）
  let records: Record<string, unknown>[] = XLSX.utils.sheet_to_json(worksheet, {
    defval: '',  // 空セルの代替値
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

  // 個人情報マスク
  const maskedFields = records.length > 0 ? listMaskedFields(records[0]) : []
  const anonymized = anonymizeRecords(records)

  return {
    records: anonymized,
    totalCount,
    maskedFields,
    datasource,
    sheetName: targetSheet,
    availableSheets,
  }
}
