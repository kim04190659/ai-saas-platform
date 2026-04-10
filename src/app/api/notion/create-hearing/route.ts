/**
 * /api/notion/create-hearing
 * ─────────────────────────────────────────────────────────
 * 組織設計ウィザードのヒアリング結果を Notion DB に保存する。
 *
 * ■ 事前準備（初回のみ）
 *   1. Notion上に「ヒアリング結果管理DB」を作成する
 *      （07-C_Notion Agent設定手順ページを参照）
 *   2. そのDBのIDを Vercel 環境変数に設定する
 *      NOTION_HEARING_DB_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * ■ DBのIDの調べ方
 *   Notion でDBを開き、URLを確認する
 *   例: notion.so/workspace/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX?v=...
 *   ?v= より前の32文字がDB ID（ハイフンなし）
 *
 * POST /api/notion/create-hearing
 * body: HearingData（12問の回答）
 * → { pageId, pageUrl } を返す
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── 環境変数 ─────────────────────────────────────────────
// Vercel の Project Settings > Environment Variables に設定すること
const NOTION_API_KEY   = process.env.NOTION_API_KEY!;
const HEARING_DB_ID    = process.env.NOTION_HEARING_DB_ID!;  // ヒアリング結果管理DBのID

// ─── ヘルパー関数 ─────────────────────────────────────────

/**
 * Notion の rich_text プロパティを作る。
 * Notion API は1テキストブロックあたり2000文字制限があるため切り詰める。
 */
const richText = (content: string) => [
  { type: 'text', text: { content: content.slice(0, 2000) } },
];

/**
 * Notion の title プロパティを作る。
 */
const titleText = (content: string) => [
  { type: 'text', text: { content: content.slice(0, 2000) } },
];

/**
 * Notion の date プロパティを作る（今日の日付）。
 */
const todayDate = () => ({
  start: new Date().toISOString().split('T')[0],  // 例: "2026-04-10"
});

// ─── メインAPIハンドラー ──────────────────────────────────

export async function POST(request: NextRequest) {

  // ── 環境変数チェック ────────────────────────────────────
  if (!NOTION_API_KEY) {
    return NextResponse.json(
      { error: 'NOTION_API_KEY が設定されていません。Vercelの環境変数を確認してください。' },
      { status: 500 }
    );
  }
  if (!HEARING_DB_ID) {
    return NextResponse.json(
      {
        error: 'NOTION_HEARING_DB_ID が設定されていません。' +
               '07-C_Notion Agent設定手順を参照してDBを作成し、' +
               'VercelにNOTION_HEARING_DB_IDを設定してください。',
      },
      { status: 500 }
    );
  }

  // ── リクエストボディの取得 ──────────────────────────────
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'リクエストボディの解析に失敗しました' },
      { status: 400 }
    );
  }

  // ── 必須チェック ────────────────────────────────────────
  // 組織名とエンドユーザーは最低限必要
  if (!body.a2_org_name?.trim()) {
    return NextResponse.json(
      { error: '組織名（a2_org_name）が空です' },
      { status: 400 }
    );
  }

  // ── Notion API でページ（レコード）を作成 ───────────────
  try {
    const response = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        // 親DB（ヒアリング結果管理DB）
        parent: { database_id: HEARING_DB_ID },

        // ─── プロパティ（列の値）────────────────────────
        properties: {

          // タイトル列 = 組織名（DBの主キーに相当）
          '組織名': {
            title: titleText(body.a2_org_name.trim()),
          },

          // ステータス = 「完了」にセットすることで Agent 1 がトリガーされる
          'ステータス': {
            select: { name: '完了' },
          },

          // ヒアリング実施日
          'ヒアリング日': {
            date: todayDate(),
          },

          // ── Block A: 構造の把握 ──────────────────────
          'A-1 エンドユーザー': {
            rich_text: richText(
              `対象者: ${body.a1_end_user || '未記入'}\n` +
              `人数: ${body.a1_count || '未記入'}\n` +
              `関係性: ${body.a1_relation || '直接'}`
            ),
          },
          'A-2 提供サービス': {
            rich_text: richText(
              `組織名: ${body.a2_org_name}\n` +
              `メンバー数: ${body.a2_count || '未記入'}\n` +
              `提供サービス:\n${body.a2_services || '未記入'}`
            ),
          },
          'A-3 チーム構造': {
            rich_text: richText(body.a3_teams || '未記入'),
          },

          // ── Block B: タッチポイントの把握 ───────────
          'B-1 チャネル': {
            rich_text: richText(body.b1_channels || '未記入'),
          },
          'B-2 最重要TP': {
            rich_text: richText(body.b2_key_touch || '未記入'),
          },
          'B-3 最危険TP': {
            rich_text: richText(body.b3_risk_touch || '未記入'),
          },

          // ── Block C: 現在のデータ状況 ────────────────
          'C-1 データ収集': {
            rich_text: richText(body.c1_data_sources || '未記入'),
          },
          'C-2 チーム状態': {
            rich_text: richText(body.c2_team_status || '未記入'),
          },
          'C-3 KPI': {
            rich_text: richText(body.c3_kpi || '未記入'),
          },

          // ── Block D: 組織の文脈 ──────────────────────
          'D-1 背景': {
            rich_text: richText(body.d1_background || '未記入'),
          },
          'D-2 ステークホルダー': {
            rich_text: richText(body.d2_stakeholders || '未記入'),
          },
          'D-3 ビジョン': {
            rich_text: richText(body.d3_vision || '未記入'),
          },
        },
      }),
    });

    // ── Notion API のエラーハンドリング ─────────────────
    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Notion API エラー (status=${response.status}):`, errBody);

      // JSONパースできるか試みる（エラー詳細の取り出し）
      let detail = errBody;
      try {
        const parsed = JSON.parse(errBody);
        detail = parsed.message ?? errBody;
      } catch { /* JSONでなければそのまま */ }

      // よくあるエラーの場合はわかりやすいメッセージに変換
      if (response.status === 404) {
        return NextResponse.json(
          {
            error: 'ヒアリング結果管理DBが見つかりません。' +
                   'NOTION_HEARING_DB_IDが正しいか確認してください。',
          },
          { status: 500 }
        );
      }
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: 'Notion APIの認証に失敗しました。' +
                   'NOTION_API_KEYが正しいか確認してください。',
          },
          { status: 500 }
        );
      }

      return NextResponse.json(
        { error: `Notion保存エラー: ${detail}` },
        { status: 500 }
      );
    }

    // ── 成功時 ───────────────────────────────────────────
    const page = await response.json();

    console.log(`ヒアリング結果を保存しました: ${page.id} (${body.a2_org_name})`);

    return NextResponse.json({
      success: true,
      pageId:  page.id,    // NotionページのID（進捗確認に使用）
      pageUrl: page.url,   // NotionページのURL（フロントに表示）
    });

  } catch (error) {
    // ネットワークエラーなど予期しないエラー
    const msg = error instanceof Error ? error.message : String(error);
    console.error('create-hearing 予期しないエラー:', msg);
    return NextResponse.json(
      { error: `予期しないエラーが発生しました: ${msg}` },
      { status: 500 }
    );
  }
}
