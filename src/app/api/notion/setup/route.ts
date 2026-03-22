/**
 * /api/notion/setup - Notion記録DB作成（初回1回だけ実行）
 *
 * NOTION_RESULTS_PAGE_ID 配下に「📊 RunWithプラットフォーム 記録DB」を作成する。
 * 作成後に返ってくる databaseId を Vercel の NOTION_RECORDS_DB_ID に設定する。
 *
 * POST /api/notion/setup
 * → { databaseId: "xxx", message: "DBを作成しました。..." }
 */

import { NextResponse } from "next/server";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const PARENT_PAGE_ID = process.env.NOTION_RESULTS_PAGE_ID!;

export async function POST() {
  if (!NOTION_API_KEY || !PARENT_PAGE_ID) {
    return NextResponse.json(
      { error: "NOTION_API_KEY または NOTION_RESULTS_PAGE_ID が未設定です" },
      { status: 500 }
    );
  }

  // Notion API でデータベースを作成する
  const response = await fetch("https://api.notion.com/v1/databases", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      "Notion-Version": "2022-06-28",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // 親ページの配下に作成する
      parent: { type: "page_id", page_id: PARENT_PAGE_ID },
      // データベースのタイトル
      title: [{ type: "text", text: { content: "📊 RunWithプラットフォーム 記録DB" } }],
      // プロパティ（列）の定義
      properties: {
        // ① タイトル（必須）
        "タイトル": { title: {} },
        // ② 種別（3種類のモジュール）
        "種別": {
          select: {
            options: [
              { name: "IT運用診断", color: "orange" },
              { name: "カードゲーム", color: "blue" },
              { name: "行政OS",      color: "green"  },
            ],
          },
        },
        // ③ レベル / ランク（テキスト: Lv.2反復 / Aランク / Sランク など）
        "レベル/ランク": { rich_text: {} },
        // ④ スコア（数値: RunWith合計点 / カードゲーム利益 など）
        "スコア": { number: { format: "number" } },
        // ⑤ 最大スコア（RunWith診断用）
        "最大スコア": { number: { format: "number" } },
        // ⑥ 弱点・改善領域（RunWith診断: 要改善領域 / カードゲーム: 課題 など）
        "弱点・改善領域": { rich_text: {} },
        // ⑦ 補足情報（モジュール固有の追加データ）
        "補足情報": { rich_text: {} },
        // ⑧ 記録日時
        "記録日時": { date: {} },
      },
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    console.error("DB作成エラー:", err);
    return NextResponse.json(
      { error: `DB作成に失敗しました: ${err}` },
      { status: 500 }
    );
  }

  const db = await response.json();

  return NextResponse.json({
    success: true,
    databaseId: db.id,
    databaseUrl: db.url,
    message: `DBを作成しました。Vercel環境変数に NOTION_RECORDS_DB_ID = "${db.id}" を追加してください。`,
  });
}
