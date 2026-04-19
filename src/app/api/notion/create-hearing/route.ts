/**
 * /api/notion/create-hearing
 * ─────────────────────────────────────────────────────────
 * 組織設計ウィザードのヒアリング結果を Notion に保存する。
 *
 * ■ 処理フロー（3ステップ）
 *   1. 自治体の親ページを NOTION_PARENT_PAGE_ID 配下に作成
 *      例: 🏙️ 霧島市 RunWith
 *   2. その配下に AI生成ロードマップページを作成
 *      例: 🗺️ 導入ロードマップ（Phase 1〜3）
 *   3. ヒアリング結果管理DB に12問の回答レコードを追加
 *      （既存の挙動。Notion Custom Agent 1 の起動トリガー）
 *
 * ■ 環境変数
 *   NOTION_API_KEY           — Notion APIトークン
 *   NOTION_HEARING_DB_ID     — ヒアリング結果管理DBのID
 *   NOTION_PARENT_PAGE_ID    — 自治体ページの親ページID
 *
 * POST /api/notion/create-hearing
 * body: HearingData + challenges[] + roadmap
 * → { municipalityUrl, roadmapUrl, hearingUrl }
 */

import { NextRequest, NextResponse } from 'next/server'
import type { RoadmapData, RoadmapPhase } from '@/app/api/runwith/roadmap-ai/route'

// ─── 環境変数 ──────────────────────────────────────────

const NOTION_API_KEY    = process.env.NOTION_API_KEY    ?? ''
const HEARING_DB_ID     = process.env.NOTION_HEARING_DB_ID ?? ''
const PARENT_PAGE_ID    = process.env.NOTION_PARENT_PAGE_ID ?? '338960a91e23813f9402f53e5240e029'

const NOTION_API  = 'https://api.notion.com/v1'
const NOTION_VER  = '2022-06-28'

// ─── ヘルパー関数 ──────────────────────────────────────

/** Notion API 共通ヘッダー */
function notionHeaders() {
  return {
    'Authorization':  `Bearer ${NOTION_API_KEY}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VER,
  }
}

/** rich_text プロパティ（2000文字制限対応） */
function richText(content: string) {
  return [{ type: 'text', text: { content: content.slice(0, 2000) } }]
}

/** title プロパティ */
function titleText(content: string) {
  return [{ type: 'text', text: { content: content.slice(0, 2000) } }]
}

/** 今日の日付（Notion date型） */
function todayDate() {
  return { start: new Date().toISOString().split('T')[0] }
}

/**
 * テキストブロック（paragraph）を生成する。
 * Notion は1ブロックあたり2000文字制限のため、必要なら分割する。
 */
function paragraphBlock(text: string) {
  return {
    object:    'block',
    type:      'paragraph',
    paragraph: { rich_text: richText(text) },
  }
}

/** 見出し2ブロック */
function heading2Block(text: string) {
  return {
    object:    'block',
    type:      'heading_2',
    heading_2: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

/** 見出し3ブロック */
function heading3Block(text: string) {
  return {
    object:    'block',
    type:      'heading_3',
    heading_3: { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

/** 箇条書きブロック */
function bulletBlock(text: string) {
  return {
    object:              'block',
    type:                'bulleted_list_item',
    bulleted_list_item:  { rich_text: [{ type: 'text', text: { content: text } }] },
  }
}

/** 区切り線ブロック */
function dividerBlock() {
  return { object: 'block', type: 'divider', divider: {} }
}

// ─── ロードマップページのブロック生成 ──────────────────

/**
 * AI生成ロードマップを Notion ブロックの配列に変換する。
 * 出力例：
 *   ## 全体方針
 *   overview テキスト
 *   ---
 *   ## Phase 1: タイトル（〜3ヶ月）
 *   ### 目標
 *   goal テキスト
 *   ### 導入機能
 *   ・機能1  ・機能2
 *   ### アクション
 *   ・アクション1 ...
 *   ### 達成KPI
 *   kpi テキスト
 */
function buildRoadmapBlocks(roadmap: RoadmapData, orgName: string, challenges: string[]): object[] {
  const blocks: object[] = []

  // 作成日・選択課題
  const today = new Date().toLocaleDateString('ja-JP')
  blocks.push(paragraphBlock([
    `作成日: ${today}`,
    `組織名: ${orgName}`,
    `選択課題: ${challenges.join(' / ')}`,
  ].join('　')))

  blocks.push(dividerBlock())

  // 全体方針
  blocks.push(heading2Block('📋 全体方針'))
  blocks.push(paragraphBlock(roadmap.overview))
  blocks.push(dividerBlock())

  // Phase 1〜3 を共通関数で出力
  const phases: Array<[string, RoadmapPhase]> = [
    ['🟢 Phase 1', roadmap.phase1],
    ['🟡 Phase 2', roadmap.phase2],
    ['🔵 Phase 3', roadmap.phase3],
  ]

  for (const [phaseLabel, phase] of phases) {
    blocks.push(heading2Block(`${phaseLabel}: ${phase.title}（${phase.period}）`))

    blocks.push(heading3Block('目標'))
    blocks.push(paragraphBlock(phase.goal))

    blocks.push(heading3Block('導入機能'))
    for (const f of phase.features) {
      blocks.push(bulletBlock(f))
    }

    blocks.push(heading3Block('具体的アクション'))
    for (const a of phase.actions) {
      blocks.push(bulletBlock(a))
    }

    blocks.push(heading3Block('達成KPI'))
    blocks.push(paragraphBlock(`🎯 ${phase.kpi}`))

    blocks.push(dividerBlock())
  }

  // 最初に構築するNotionDB
  blocks.push(heading2Block('🗄️ 最初に構築するNotionDB'))
  for (const db of roadmap.notionSetup) {
    blocks.push(bulletBlock(db))
  }

  blocks.push(dividerBlock())

  // 実施リスク
  blocks.push(heading2Block('⚠️ 実施リスクと対策'))
  for (const risk of roadmap.risks) {
    blocks.push(bulletBlock(risk))
  }

  return blocks
}

// ─── メインハンドラ ────────────────────────────────────

export async function POST(request: NextRequest) {

  // 環境変数チェック
  if (!NOTION_API_KEY) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY が設定されていません' },
      { status: 500 }
    )
  }
  if (!HEARING_DB_ID) {
    return NextResponse.json(
      { error: 'NOTION_HEARING_DB_ID が設定されていません' },
      { status: 500 }
    )
  }

  // リクエストボディ取得
  let body: Record<string, unknown>
  try {
    body = await request.json() as Record<string, unknown>
  } catch {
    return NextResponse.json({ error: 'リクエストボディの解析に失敗しました' }, { status: 400 })
  }

  // 必須チェック
  const orgName = (body.a2_org_name as string | undefined)?.trim() ?? ''
  if (!orgName) {
    return NextResponse.json({ error: '組織名（a2_org_name）が空です' }, { status: 400 })
  }

  const challenges = (body.e_challenges as string[] | undefined) ?? []
  const roadmap    = (body.roadmap     as RoadmapData | undefined) ?? null

  const headers = notionHeaders()

  try {

    // ──────────────────────────────────────────────────
    // Step 1: 自治体の親ページを作成
    //   親: NOTION_PARENT_PAGE_ID
    //   タイトル: 🏙️ [組織名] RunWith
    // ──────────────────────────────────────────────────
    const muniRes = await fetch(`${NOTION_API}/pages`, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        parent:     { page_id: PARENT_PAGE_ID },
        icon:       { emoji: '🏙️' },
        properties: {
          title: { title: titleText(`🏙️ ${orgName} RunWith`) },
        },
        children: [
          paragraphBlock([
            `組織名: ${orgName}`,
            `登録日: ${new Date().toLocaleDateString('ja-JP')}`,
            `優先課題: ${challenges.length > 0 ? challenges.join(' / ') : '（未設定）'}`,
          ].join('　')),
        ],
      }),
    })

    let municipalityUrl = ''
    let municipalityPageId = ''

    if (muniRes.ok) {
      const muniData = await muniRes.json() as { id: string; url: string }
      municipalityPageId = muniData.id
      municipalityUrl    = muniData.url
    }

    // ──────────────────────────────────────────────────
    // Step 2: ロードマップサブページを作成
    //   親: Step 1で作成した自治体ページ
    //   タイトル: 🗺️ 導入ロードマップ
    // ──────────────────────────────────────────────────
    let roadmapUrl = ''

    if (municipalityPageId && roadmap) {
      const roadmapBlocks = buildRoadmapBlocks(roadmap, orgName, challenges)

      const rdRes = await fetch(`${NOTION_API}/pages`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          parent:     { page_id: municipalityPageId },
          icon:       { emoji: '🗺️' },
          properties: {
            title: { title: titleText('🗺️ 導入ロードマップ') },
          },
          // Notion は1リクエストあたり100ブロックまで
          children: roadmapBlocks.slice(0, 100),
        }),
      })

      if (rdRes.ok) {
        const rdData = await rdRes.json() as { url: string }
        roadmapUrl = rdData.url
      }
    }

    // ──────────────────────────────────────────────────
    // Step 3: ヒアリング結果管理DB にレコードを作成
    //   既存の挙動（Notion Custom Agent 1 の起動トリガー）
    // ──────────────────────────────────────────────────
    const hearingRes = await fetch(`${NOTION_API}/pages`, {
      method:  'POST',
      headers,
      body: JSON.stringify({
        parent: { database_id: HEARING_DB_ID },
        properties: {
          '組織名': {
            title: titleText(orgName),
          },
          'ステータス': {
            select: { name: '完了' },
          },
          'ヒアリング日': {
            date: todayDate(),
          },
          // Block A: 構造の把握
          'A-1 エンドユーザー': {
            rich_text: richText([
              `対象者: ${body.a1_end_user ?? '未記入'}`,
              `人数: ${body.a1_count ?? '未記入'}`,
              `関係性: ${body.a1_relation ?? '直接'}`,
            ].join('\n')),
          },
          'A-2 提供サービス': {
            rich_text: richText([
              `組織名: ${orgName}`,
              `メンバー数: ${body.a2_count ?? '未記入'}`,
              `提供サービス:\n${body.a2_services ?? '未記入'}`,
            ].join('\n')),
          },
          'A-3 チーム構造': {
            rich_text: richText((body.a3_teams as string | undefined) ?? '未記入'),
          },
          // Block E: 課題の優先順位（新規追加）
          'E 優先課題': {
            rich_text: richText([
              `選択課題: ${challenges.join(' / ')}`,
              `優先理由: ${body.e_priority_reason ?? '未記入'}`,
            ].join('\n')),
          },
          // Block B: タッチポイント
          'B-1 チャネル': {
            rich_text: richText((body.b1_channels as string | undefined) ?? '未記入'),
          },
          'B-2 最重要TP': {
            rich_text: richText((body.b2_key_touch as string | undefined) ?? '未記入'),
          },
          'B-3 最危険TP': {
            rich_text: richText((body.b3_risk_touch as string | undefined) ?? '未記入'),
          },
          // Block C: データ状況
          'C-1 データ収集': {
            rich_text: richText((body.c1_data_sources as string | undefined) ?? '未記入'),
          },
          'C-2 チーム状態': {
            rich_text: richText((body.c2_team_status as string | undefined) ?? '未記入'),
          },
          'C-3 KPI': {
            rich_text: richText((body.c3_kpi as string | undefined) ?? '未記入'),
          },
          // Block D: 組織の文脈
          'D-1 背景': {
            rich_text: richText((body.d1_background as string | undefined) ?? '未記入'),
          },
          'D-2 ステークホルダー': {
            rich_text: richText((body.d2_stakeholders as string | undefined) ?? '未記入'),
          },
          'D-3 ビジョン': {
            rich_text: richText((body.d3_vision as string | undefined) ?? '未記入'),
          },
        },
      }),
    })

    let hearingUrl = ''
    if (hearingRes.ok) {
      const hearingData = await hearingRes.json() as { url: string }
      hearingUrl = hearingData.url
    } else {
      // ヒアリングDB保存失敗は警告のみ（自治体ページは既に作成済み）
      const errText = await hearingRes.text()
      console.warn('[create-hearing] ヒアリングDB保存失敗:', hearingRes.status, errText)
    }

    return NextResponse.json({
      success:         true,
      municipalityUrl,
      roadmapUrl,
      hearingUrl,
      // フロント側での後方互換のため pageUrl も返す
      pageUrl: municipalityUrl || hearingUrl,
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[create-hearing] 予期しないエラー:', msg)
    return NextResponse.json({ error: `予期しないエラー: ${msg}` }, { status: 500 })
  }
}
