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
import type { RoadmapData, RoadmapPhase, DocumentSpec } from '@/app/api/runwith/roadmap-ai/route'

// ─── 環境変数 ──────────────────────────────────────────

const NOTION_API_KEY    = process.env.NOTION_API_KEY    ?? ''
const HEARING_DB_ID     = process.env.NOTION_HEARING_DB_ID ?? ''
// 🏙️ 自治体・組織 展開ページ（ウィザードで作成される自治体ページの親）
// Vercel 環境変数 NOTION_PARENT_PAGE_ID を設定することで上書き可能
const PARENT_PAGE_ID    = process.env.NOTION_PARENT_PAGE_ID ?? '347960a91e2381088f69f359081ef39e'

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
 * AI生成ロードマップを Notion 仕様書ページのブロック配列に変換する。
 *
 * 各フェーズに以下のセクションを生成：
 *   🗄️ 作成するDB    — DB名・目的・カラム一覧・デモ行数
 *   👁️ 作成するView  — View名・種類・対象DB・フィルタ
 *   🤖 AI機能        — 機能名・実行タイミング・処理内容・通知先
 *   📱 アプリ画面     — ページ名・URLパス・コンポーネント・新規/既存
 */
function buildRoadmapBlocks(roadmap: RoadmapData, orgName: string, challenges: string[]): object[] {
  const blocks: object[] = []

  // ヘッダー情報
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
  const phaseEntries: Array<[string, RoadmapPhase]> = [
    ['🟢 Phase 1', roadmap.phase1],
    ['🟡 Phase 2', roadmap.phase2],
    ['🔵 Phase 3', roadmap.phase3],
  ]

  for (const [phaseLabel, phase] of phaseEntries) {
    blocks.push(heading2Block(`${phaseLabel}: ${phase.title}（${phase.period}）`))
    blocks.push(paragraphBlock(`🎯 目標: ${phase.goal}`))
    blocks.push(paragraphBlock(`📊 達成KPI: ${phase.kpi}`))

    // ── 作成するDB ─────────────────────────────────
    if (phase.databases && phase.databases.length > 0) {
      blocks.push(heading3Block('🗄️ 作成するNotionDB'))
      for (const db of phase.databases) {
        blocks.push(bulletBlock(
          `${db.name}（${db.purpose}）`
        ))
        blocks.push(bulletBlock(
          `  カラム: ${db.properties.join(' / ')}　デモデータ: ${db.sampleRows}行`
        ))
      }
    }

    // ── 作成するView ───────────────────────────────
    if (phase.views && phase.views.length > 0) {
      blocks.push(heading3Block('👁️ 作成するView'))
      for (const v of phase.views) {
        const filterText = v.filter && v.filter !== 'なし' ? `　フィルタ: ${v.filter}` : ''
        blocks.push(bulletBlock(
          `${v.name}（${v.type}形式 / ${v.database}）${filterText}`
        ))
      }
    }

    // ── AI機能 ─────────────────────────────────────
    if (phase.aiFeatures && phase.aiFeatures.length > 0) {
      blocks.push(heading3Block('🤖 AI機能'))
      for (const ai of phase.aiFeatures) {
        blocks.push(bulletBlock(
          `${ai.name}　実行: ${ai.trigger}　通知: ${ai.notify}`
        ))
        blocks.push(bulletBlock(`  処理内容: ${ai.action}`))
      }
    }

    // ── アプリ画面 ─────────────────────────────────
    if (phase.appPages && phase.appPages.length > 0) {
      blocks.push(heading3Block('📱 アプリ画面'))
      for (const p of phase.appPages) {
        const statusLabel = p.status === 'new' ? '🆕新規作成' : '✅既存流用'
        blocks.push(bulletBlock(
          `${p.name}　${statusLabel}　route: ${p.route}`
        ))
        blocks.push(bulletBlock(`  コンポーネント: ${p.component}`))
      }
    }

    // ── 生成するドキュメント ───────────────────────
    if (phase.documents && phase.documents.length > 0) {
      blocks.push(heading3Block('📄 生成するドキュメント'))
      for (const doc of phase.documents as DocumentSpec[]) {
        const genLabel =
          doc.generator === 'agent3'   ? '🤖 Agent3自動生成' :
          doc.generator === 'ai-draft' ? '✨ AI自動起案'     :
                                         '📝 手動作成'
        blocks.push(bulletBlock(
          `${doc.name}　対象: ${doc.audience}向け　形式: ${doc.format}　${genLabel}`
        ))
        blocks.push(bulletBlock(`  作成タイミング: ${doc.timing}`))
      }
    }

    blocks.push(dividerBlock())
  }

  // 実施リスク
  blocks.push(heading2Block('⚠️ 実施リスクと対策'))
  for (const risk of roadmap.risks) {
    blocks.push(bulletBlock(risk))
  }

  // 次のアクション（自動化の道筋）
  blocks.push(dividerBlock())
  blocks.push(heading2Block('🚀 次のアクション（自動化フロー）'))
  blocks.push(bulletBlock('Step 1: このロードマップを関係者でレビュー'))
  blocks.push(bulletBlock('Step 2: Phase 1 のDB作成（自動化予定: /api/runwith/org-setup）'))
  blocks.push(bulletBlock('Step 3: デモデータで動作確認 → 実データに差し替え'))
  blocks.push(bulletBlock('Step 4: アプリ画面の動的ルーティング設定（municipalities.ts）'))
  blocks.push(bulletBlock('Step 5: AI機能のcron設定（vercel.json）'))

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
