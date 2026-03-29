'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/population/page.tsx
//  人口・地域データ インポート画面（Sprint #11）
//
//  ■ このページの役割
//    自治体が持っているCSVファイル（e-Gov統計・独自集計等）を
//    ドラッグ＆ドロップで取り込み、Notionに蓄積する。
//    「捨てない移行」=既存資産をそのまま活用するPhase2の入口。
//
//  ■ 操作フロー
//    1. CSVファイルを選択またはドロップ
//    2. 列を自動検出してプレビュー表示
//    3. 各列を「市区町村名」「総人口」等にマッピング
//    4. 「Notionに保存」ボタンでインポート実行
//    5. 成功/エラー件数を表示
// =====================================================

import { useState, useRef, useCallback } from 'react'
import type { PopulationRecord } from '@/app/api/opendata/ingest/route'

// ─── 型定義 ──────────────────────────────────────────

/** マッピング対象フィールドの定義 */
type TargetField = {
  key: keyof PopulationRecord  // APIに渡すキー
  label: string                // 画面表示名
  required: boolean            // 必須かどうか
  hint: string                 // よくある列名の例（自動検出ヒント）
}

/** インポート結果 */
type ImportResult = {
  successCount: number
  errorCount: number
  message: string
}

// ─── 定数 ────────────────────────────────────────────

/** マッピング対象フィールド一覧 */
const TARGET_FIELDS: TargetField[] = [
  { key: 'municipality', label: '市区町村名',  required: true,  hint: '市区町村・自治体名・地域名' },
  { key: 'year',         label: '年度',        required: false, hint: '年・年度・西暦' },
  { key: 'population',   label: '総人口',      required: false, hint: '人口・総人口・population' },
  { key: 'households',   label: '世帯数',      required: false, hint: '世帯・世帯数・household' },
  { key: 'agingRate',    label: '高齢化率(%)', required: false, hint: '高齢化・高齢化率・aging' },
  { key: 'births',       label: '出生数',      required: false, hint: '出生・出生数・birth' },
  { key: 'deaths',       label: '死亡数',      required: false, hint: '死亡・死亡数・death' },
]

/** 不要文字（BOM・空白等）を除去するクリーナー */
const clean = (s: string) => s.replace(/^\uFEFF/, '').trim()

// ─── CSVパーサー ──────────────────────────────────────

/**
 * CSVテキストを2次元配列に変換するシンプルなパーサー
 * ダブルクォート囲み・カンマ区切り・改行に対応
 * 外部ライブラリ不要・ブラウザで動作
 */
function parseCSV(text: string): string[][] {
  const rows: string[][] = []
  const lines = text.split(/\r?\n/)

  for (const line of lines) {
    if (!line.trim()) continue
    const cells: string[] = []
    let current = ''
    let inQuote = false

    for (let i = 0; i < line.length; i++) {
      const ch = line[i]
      if (ch === '"') {
        // ダブルクォートのエスケープ（""）
        if (inQuote && line[i + 1] === '"') { current += '"'; i++ }
        else inQuote = !inQuote
      } else if (ch === ',' && !inQuote) {
        cells.push(clean(current)); current = ''
      } else {
        current += ch
      }
    }
    cells.push(clean(current))
    rows.push(cells)
  }
  return rows
}

/**
 * 列名から対象フィールドを自動検出する
 * ヒントのキーワードが列名に含まれていれば自動マッピング
 */
function autoDetectMapping(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {}

  for (const field of TARGET_FIELDS) {
    const hints = field.hint.split('・')
    for (const header of headers) {
      const h = header.toLowerCase()
      if (hints.some(hint => h.includes(hint.toLowerCase()))) {
        mapping[field.key] = header
        break
      }
    }
  }
  return mapping
}

// ─── メインコンポーネント ─────────────────────────────

export default function PopulationImportPage() {
  // ── State: CSVの生データ ──
  const [headers, setHeaders] = useState<string[]>([])          // ヘッダー行
  const [rows, setRows] = useState<string[][]>([])              // データ行（最大5件プレビュー用）
  const [allRows, setAllRows] = useState<string[][]>([])        // 全データ行
  const [fileName, setFileName] = useState('')                  // アップロードしたファイル名

  // ── State: 列マッピング（フィールドキー → CSV列名） ──
  const [mapping, setMapping] = useState<Record<string, string>>({})

  // ── State: データソース名入力 ──
  const [source, setSource] = useState('')

  // ── State: インポート処理 ──
  const [isImporting, setIsImporting] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)

  // ── State: ドラッグオーバー表示 ──
  const [isDragging, setIsDragging] = useState(false)

  // ファイル入力のref（ボタンクリックでファイルダイアログを開くため）
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ─────────────────────────────────────────────────
  //  CSVファイルを読み込む処理
  // ─────────────────────────────────────────────────
  const loadCSV = useCallback((file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      alert('CSVファイル（.csv）を選択してください')
      return
    }

    setFileName(file.name)
    setResult(null)

    // FileReader でテキストとして読み込む
    // Shift-JIS対応のため encoding を試みるが、基本はUTF-8
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const parsed = parseCSV(text)

      if (parsed.length < 2) {
        alert('データ行が見つかりません。CSVの形式を確認してください。')
        return
      }

      const csvHeaders = parsed[0]
      const csvDataRows = parsed.slice(1)

      setHeaders(csvHeaders)
      setAllRows(csvDataRows)
      setRows(csvDataRows.slice(0, 5))         // プレビューは最大5行
      setMapping(autoDetectMapping(csvHeaders)) // 列名を自動検出
    }
    reader.readAsText(file, 'UTF-8')
  }, [])

  // ─────────────────────────────────────────────────
  //  ドラッグ＆ドロップ処理
  // ─────────────────────────────────────────────────
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) loadCSV(file)
  }, [loadCSV])

  // ─────────────────────────────────────────────────
  //  Notionへインポート実行
  // ─────────────────────────────────────────────────
  const handleImport = async () => {
    // 市区町村名のマッピングが必須
    if (!mapping['municipality']) {
      alert('「市区町村名」列のマッピングが必要です')
      return
    }
    if (allRows.length === 0) {
      alert('インポートするデータがありません')
      return
    }

    setIsImporting(true)
    setResult(null)

    // CSV行をAPIのリクエスト形式に変換する
    const records: PopulationRecord[] = allRows
      .filter(row => row.some(cell => cell.trim())) // 空行を除外
      .map(row => {
        // 列名からインデックスを引いて値を取得するヘルパー
        const get = (fieldKey: string): string => {
          const colName = mapping[fieldKey]
          if (!colName) return ''
          const idx = headers.indexOf(colName)
          return idx >= 0 ? (row[idx] ?? '') : ''
        }

        // 文字列を数値に変換（カンマ区切りの数字も対応）
        const toNum = (s: string): number | null => {
          const n = parseFloat(s.replace(/,/g, ''))
          return isNaN(n) ? null : n
        }

        return {
          municipality: get('municipality'),
          year:         toNum(get('year')),
          population:   toNum(get('population')),
          households:   toNum(get('households')),
          agingRate:    toNum(get('agingRate')),
          births:       toNum(get('births')),
          deaths:       toNum(get('deaths')),
        }
      })

    try {
      const res = await fetch('/api/opendata/ingest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records, source: source || fileName }),
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult({ successCount: 0, errorCount: allRows.length, message: 'ネットワークエラーが発生しました' })
    } finally {
      setIsImporting(false)
    }
  }

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            📥 人口・地域データ取込
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            自治体のCSVファイルをそのまま取り込み、Notionに蓄積します。既存データを捨てずに活用できます。
          </p>
          {/* 対応フォーマットの説明 */}
          <div className="mt-3 flex flex-wrap gap-2">
            {['e-Gov統計CSV', '総務省 国勢調査', '自治体独自集計', 'Excel保存CSV'].map(tag => (
              <span key={tag} className="px-2.5 py-1 rounded-full text-xs bg-emerald-50 text-emerald-700 border border-emerald-200">
                {tag}
              </span>
            ))}
          </div>
        </div>

        {/* ── STEP 1: ファイルアップロード ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-sm font-bold text-slate-700 mb-3">
            STEP 1　CSVファイルを選択
          </h2>

          {/* ドロップゾーン */}
          <div
            onDragOver={e => { e.preventDefault(); setIsDragging(true) }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-emerald-400 bg-emerald-50'
                : fileName
                  ? 'border-emerald-300 bg-emerald-50'
                  : 'border-slate-200 hover:border-emerald-300 hover:bg-slate-50'
            }`}
          >
            {fileName ? (
              <div>
                <p className="text-2xl mb-1">✅</p>
                <p className="text-sm font-semibold text-emerald-700">{fileName}</p>
                <p className="text-xs text-slate-400 mt-1">{allRows.length}行を読み込みました</p>
                <p className="text-xs text-emerald-600 mt-1">別のファイルを選ぶ場合はここをクリック</p>
              </div>
            ) : (
              <div>
                <p className="text-3xl mb-2">📂</p>
                <p className="text-sm font-semibold text-slate-600">CSVファイルをここにドロップ</p>
                <p className="text-xs text-slate-400 mt-1">またはクリックしてファイルを選択</p>
              </div>
            )}
          </div>

          {/* 非表示のファイル入力 */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.txt"
            className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) loadCSV(f) }}
          />

          {/* データソース名入力 */}
          {fileName && (
            <div className="mt-4">
              <label className="text-xs font-semibold text-slate-500 block mb-1">
                データソース名（Notionに記録する出典情報）
              </label>
              <input
                type="text"
                value={source}
                onChange={e => setSource(e.target.value)}
                placeholder="例: e-Gov国勢調査2020、屋久島町人口統計2024"
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-300"
              />
            </div>
          )}
        </div>

        {/* ── STEP 2: 列マッピング（CSVが読み込まれたら表示） ── */}
        {headers.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-1">
              STEP 2　列のマッピング設定
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              CSVの列をNotionのフィールドに対応させます。自動検出できた列は✅で示しています。
            </p>

            <div className="space-y-3">
              {TARGET_FIELDS.map(field => (
                <div key={field.key} className="flex items-center gap-3 flex-wrap">
                  {/* フィールド名ラベル */}
                  <div className="w-32 flex-shrink-0">
                    <span className="text-xs font-semibold text-slate-700">
                      {field.required && <span className="text-red-500 mr-0.5">*</span>}
                      {field.label}
                    </span>
                  </div>

                  {/* CSV列選択ドロップダウン */}
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    {/* 自動検出できていれば✅を表示 */}
                    <span className="text-sm">{mapping[field.key] ? '✅' : '❌'}</span>
                    <select
                      value={mapping[field.key] ?? ''}
                      onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-white"
                    >
                      <option value="">（マッピングしない）</option>
                      {headers.map(h => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>

                  {/* ヒント表示 */}
                  <span className="text-[10px] text-slate-400 hidden md:block">
                    例: {field.hint}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── STEP 3: プレビュー（最初の5行） ── */}
        {rows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-1">
              STEP 3　データプレビュー（先頭5行）
            </h2>
            <p className="text-xs text-slate-400 mb-3">
              全{allRows.length}行のうち先頭5行を表示しています
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50">
                    {headers.map(h => (
                      <th key={h} className="px-2 py-2 text-left text-slate-600 font-semibold border border-slate-100 whitespace-nowrap">
                        {h}
                        {/* マッピング済みフィールド名を小さく表示 */}
                        {Object.entries(mapping).find(([, v]) => v === h) && (
                          <span className="ml-1 text-emerald-600 font-normal">
                            → {TARGET_FIELDS.find(f => f.key === Object.entries(mapping).find(([, v]) => v === h)?.[0])?.label}
                          </span>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, i) => (
                    <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                      {headers.map((_, j) => (
                        <td key={j} className="px-2 py-1.5 border border-slate-100 text-slate-700 max-w-[120px] truncate">
                          {row[j] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── STEP 4: インポート実行ボタン ── */}
        {allRows.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-bold text-slate-700 mb-3">
              STEP 4　Notionに保存
            </h2>

            {/* インポート結果表示 */}
            {result && (
              <div className={`mb-4 p-4 rounded-xl border ${
                result.errorCount === 0
                  ? 'bg-emerald-50 border-emerald-200'
                  : result.successCount === 0
                    ? 'bg-red-50 border-red-200'
                    : 'bg-amber-50 border-amber-200'
              }`}>
                <p className="text-sm font-semibold text-slate-800">
                  {result.errorCount === 0 ? '✅' : result.successCount === 0 ? '❌' : '⚠️'} {result.message}
                </p>
                {result.successCount > 0 && (
                  <p className="text-xs text-slate-500 mt-1">
                    NotionのPopulationData DBに{result.successCount}件が追加されました
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <p className="text-sm text-slate-600">
                  <span className="font-bold text-slate-800">{allRows.length}行</span>
                  のデータをNotionに保存します
                </p>
                {!mapping['municipality'] && (
                  <p className="text-xs text-red-500 mt-1">
                    ⚠️ 「市区町村名」列のマッピングが必要です（STEP 2で設定してください）
                  </p>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={isImporting || !mapping['municipality']}
                className="px-6 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    保存中…
                  </>
                ) : (
                  <>📤 Notionに保存する</>
                )}
              </button>
            </div>
          </div>
        )}

        {/* ── ガイドカード（ファイルが読み込まれていない場合） ── */}
        {!fileName && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-emerald-800 mb-2">💡 使い方のヒント</p>
            <ul className="text-xs text-emerald-700 space-y-1.5">
              <li>・ e-Gov（<span className="font-mono">https://www.e-stat.go.jp</span>）から統計CSVをダウンロードして使えます</li>
              <li>・ ExcelファイルはCSVとして保存（名前をつけて保存 → CSV UTF-8）してから使用してください</li>
              <li>・ 列の順番や名前は問いません。STEP 2でマッピングできます</li>
              <li>・ 保存されたデータはAI Well-Being顧問が自動的に参照します</li>
            </ul>
          </div>
        )}

      </div>
    </div>
  )
}
