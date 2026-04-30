// =====================================================
//  src/app/api/runwith/provision/route.ts
//  Notion自動プロビジョニング + 設定コード生成 API — Sprint #73
//
//  ■ 概要
//    ウィザード Step 10 で「自動構築を開始」ボタンを押したときに呼ばれる。
//    選択した機能に必要な Notion DB を全て自動作成し、
//    municipalities.ts と municipality-db-config.ts に追加すべきコードを返す。
//    Yoshitaka がそのコードをコピーして push するだけで新自治体が動く状態になる。
//
//  ■ エンドポイント
//    POST /api/runwith/provision
//
//  ■ リクエスト
//    {
//      municipalityId:        string,   // 英字ID（例: 'shimanto'）
//      orgName:               string,   // 表示名（例: '四万十市役所'）
//      orgShortName:          string,   // 短縮名（例: '四万十市'）
//      selectedFeatureIds:    string[], // basic + 選択した拡張機能のID
//      municipalityPageId:    string,   // NotionページID（DBの親になる）
//      color:                 string,   // テーマカラー（例: 'teal'）
//    }
//
//  ■ 処理フロー
//    1. selectedFeatureIds → collectDbKeys() → 作成が必要な dbKey リストを収集
//    2. 各 dbKey について DB_SCHEMAS を参照して Notion DB を作成
//    3. 作成した DB ID を記録
//    4. municipalities.ts 追加コードを文字列生成
//    5. municipality-db-config.ts 追加コードを文字列生成
//    6. 結果を返す
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import { DB_SCHEMAS, collectDbKeys } from '@/config/feature-catalog'
import type { NotionPropertyDef } from '@/config/feature-catalog'

// ─── 型定義 ──────────────────────────────────────────────

interface ProvisionRequest {
  municipalityId:     string    // 英字ID（例: 'shimanto'）
  orgName:            string    // 表示名（例: '四万十市役所'）
  orgShortName:       string    // 短縮名（例: '四万十市'）
  selectedFeatureIds: string[]  // 機能IDリスト
  municipalityPageId: string    // 自治体Notionページ ID（DBの親）
  color:              string    // テーマカラー
}

/** 作成した DB の情報 */
interface CreatedDb {
  dbKey:   string
  dbId:    string
  dbName:  string
  success: boolean
  error?:  string
}

// ─── Notion プロパティスキーマ変換 ───────────────────────

/**
 * feature-catalog.ts の NotionPropertyDef を
 * Notion API の properties 形式に変換する。
 */
function toNotionPropertySchema(prop: NotionPropertyDef): Record<string, unknown> {
  switch (prop.type) {
    case 'title':
      return { title: {} }
    case 'rich_text':
      return { rich_text: {} }
    case 'number':
      return { number: { format: 'number' } }
    case 'select':
      return { select: { options: [] } }
    case 'multi_select':
      return { multi_select: { options: [] } }
    case 'checkbox':
      return { checkbox: {} }
    case 'date':
      return { date: {} }
    case 'url':
      return { url: {} }
    case 'email':
      return { email: {} }
    default:
      return { rich_text: {} }
  }
}

// ─── Notion DB 作成 ───────────────────────────────────────

/**
 * 指定した親ページに Notion DB を1つ作成する。
 * 成功時は DB の page_id（REST API で使う ID）を返す。
 */
async function createNotionDb(
  notionToken:    string,
  parentPageId:   string,
  dbName:         string,
  properties:     NotionPropertyDef[],
): Promise<{ id: string; url: string }> {
  // プロパティスキーマを構築（title プロパティを最初に）
  const propsSchema: Record<string, Record<string, unknown>> = {}
  for (const prop of properties) {
    propsSchema[prop.name] = toNotionPropertySchema(prop)
  }

  const res = await fetch('https://api.notion.com/v1/databases', {
    method: 'POST',
    headers: {
      Authorization:    `Bearer ${notionToken}`,
      'Notion-Version': '2022-06-28',
      'Content-Type':   'application/json',
    },
    body: JSON.stringify({
      parent: {
        type:    'page_id',
        page_id: parentPageId,
      },
      title: [
        {
          type: 'text',
          text: { content: dbName },
        },
      ],
      properties: propsSchema,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Notion DB作成エラー（${dbName}）: ${err}`)
  }

  const data = await res.json() as { id: string; url: string }
  // Notion の DB ID はハイフン付きで返ってくる → ハイフン除去して統一
  return {
    id:  data.id.replace(/-/g, ''),
    url: data.url,
  }
}

// ─── コード生成 ───────────────────────────────────────────

/**
 * municipalities.ts に追加するコードを生成する。
 */
function generateMunicipalitiesCode(params: {
  municipalityId:  string
  orgName:         string
  orgShortName:    string
  notionPageId:    string
  color:           string
}): string {
  const { municipalityId, orgName, orgShortName, notionPageId, color } = params
  return [
    `  // ── ${orgShortName} ──────────────────────────────────────`,
    `  {`,
    `    id:           '${municipalityId}',`,
    `    name:         '${orgName}',`,
    `    shortName:    '${orgShortName}',`,
    `    notionPageId: '${notionPageId}',`,
    `    color:        '${color}',`,
    `    status:       'active',`,
    `  },`,
  ].join('\n')
}

/**
 * municipality-db-config.ts に追加するコードを生成する。
 */
function generateDbConfigCode(params: {
  municipalityId: string
  orgShortName:   string
  createdDbs:     CreatedDb[]
}): string {
  const { municipalityId, orgShortName, createdDbs } = params

  const successDbs = createdDbs.filter((d) => d.success)

  // dbKey → DBコメント用の日本語ラベルマップ
  const DB_LABELS: Record<string, string> = {
    pdcaDbId:         '施策実行記録DB',
    consultationDbId: '住民相談DB',
    coachingDbId:     '住民WBコーチングDB',
    infraDbId:        'インフラ老朽化DB',
    fiscalDbId:       '財政健全化指標DB',
    tourismDbId:      '観光管理DB',
    migrationDbId:    '移住相談DB',
    visitDbId:        '往診管理DB',
    farmDbId:         '農地情報DB',
    farmerDbId:       '移住就農希望者DB',
    recoveryDbId:     '復興事業進捗DB',
    carbonDbId:       'CO2削減活動DB',
    childcareDbId:    '子育て相談DB',
    localIndustryDbId:'地場産業台帳DB',
  }

  const lines = [
    `  // ── ${orgShortName} ──────────────────────────────────────`,
    `  ${municipalityId}: {`,
  ]

  for (const db of successDbs) {
    const label = DB_LABELS[db.dbKey] ?? db.dbKey
    // 32文字IDをパッドして整列
    const paddedKey = db.dbKey.padEnd(20)
    lines.push(`    ${paddedKey}: '${db.dbId}',  // ${label}`)
  }

  lines.push(`  },`)

  return lines.join('\n')
}

// ─── メインハンドラー ─────────────────────────────────────

export async function POST(req: NextRequest) {
  const notionToken = process.env.NOTION_API_KEY
  if (!notionToken) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY が設定されていません' },
      { status: 500 }
    )
  }

  let body: ProvisionRequest
  try {
    body = await req.json() as ProvisionRequest
  } catch {
    return NextResponse.json(
      { error: 'リクエスト解析エラー' },
      { status: 400 }
    )
  }

  const {
    municipalityId,
    orgName,
    orgShortName,
    selectedFeatureIds,
    municipalityPageId,
    color,
  } = body

  // ── 1. 必要な dbKey リストを収集 ─────────────────────────
  const dbKeys = collectDbKeys(selectedFeatureIds)

  if (dbKeys.length === 0) {
    return NextResponse.json(
      { error: '作成するDBがありません。機能を1つ以上選択してください。' },
      { status: 400 }
    )
  }

  // ── 2. 各 dbKey について Notion DB を作成 ─────────────────
  const createdDbs: CreatedDb[] = []

  for (const dbKey of dbKeys) {
    const schema = DB_SCHEMAS[dbKey]
    if (!schema) {
      createdDbs.push({
        dbKey,
        dbId:    '',
        dbName:  dbKey,
        success: false,
        error:   `DB_SCHEMASに ${dbKey} の定義がありません`,
      })
      continue
    }

    try {
      const created = await createNotionDb(
        notionToken,
        municipalityPageId,
        schema.name,
        schema.properties,
      )
      createdDbs.push({
        dbKey,
        dbId:    created.id,
        dbName:  schema.name,
        success: true,
      })

      // Notion API のレートリミット対策（0.3秒待機）
      await new Promise((r) => setTimeout(r, 300))

    } catch (err) {
      createdDbs.push({
        dbKey,
        dbId:    '',
        dbName:  schema.name,
        success: false,
        error:   err instanceof Error ? err.message : String(err),
      })
    }
  }

  // ── 3. 設定コードを生成 ───────────────────────────────────
  const municipalitiesCode = generateMunicipalitiesCode({
    municipalityId,
    orgName,
    orgShortName,
    notionPageId: municipalityPageId,
    color,
  })

  const dbConfigCode = generateDbConfigCode({
    municipalityId,
    orgShortName,
    createdDbs,
  })

  // ── 4. 結果を返す ─────────────────────────────────────────
  const successCount = createdDbs.filter((d) => d.success).length
  const failCount    = createdDbs.filter((d) => !d.success).length

  return NextResponse.json({
    success:           failCount === 0,
    createdDbs,
    successCount,
    failCount,
    totalDbs:          dbKeys.length,
    municipalitiesCode,
    dbConfigCode,
    message: `${successCount}件のNotionDB作成完了 / ${failCount}件失敗`,
  })
}
