/**
 * /api/card-game/cards
 * Notionのカードマスターデータベースからカード情報を取得するAPIルート
 *
 * GET /api/card-game/cards?suit=ハート  → 指定スートのカード一覧
 * GET /api/card-game/cards              → 全カード一覧
 */

import { NextRequest, NextResponse } from "next/server";

// Notion APIの設定
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CARD_DB_ID = process.env.NOTION_CARD_DB_ID!; // カードマスターDB

// Notionから返ってくるカードデータの型定義
type NotionCard = {
  id: string;
  properties: {
    // タイトル（カード名）
    "カード名": { title: Array<{ plain_text: string }> };
    // スート選択肢
    "スート": { select: { name: string } | null };
    // ランク（A/2-10/J/Q/K）
    "ランク": { select: { name: string } | null };
    // カードのメインタイトル
    "カードタイトル": { rich_text: Array<{ plain_text: string }> };
    // カードの説明文
    "説明テキスト": { rich_text: Array<{ plain_text: string }> };
    // 数値データ（スート別に意味が違う）
    "マーケットサイズ（万人）": { number: number | null };
    "月間販売見込数（件）": { number: number | null };
    "販売単価（円）": { number: number | null };
    "変動費月額（円）": { number: number | null };
    "実現可能性スコア": { number: number | null };
  };
};

// GETリクエストのハンドラー
export async function GET(request: NextRequest) {
  // URLパラメータからスート名を取得（例: ?suit=ハート）
  const { searchParams } = new URL(request.url);
  const suit = searchParams.get("suit"); // null = 全件取得

  try {
    // Notionデータベースをクエリ（フィルタ付き）
    const filter = suit
      ? {
          // スートを指定した場合はそのスートのみ取得
          property: "スート",
          select: { equals: suit },
        }
      : undefined;

    // Notion APIにPOSTリクエスト（データベース検索）
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CARD_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28", // 必須ヘッダー
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: filter,
          // ランク順にソート（A→K）
          sorts: [{ property: "ランク", direction: "ascending" }],
          page_size: 100, // 最大100件取得
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      console.error("Notion API Error:", err);
      return NextResponse.json({ error: "Notionからデータ取得失敗" }, { status: 500 });
    }

    const data = await response.json();

    // Notionのデータ形式を、フロントエンドで使いやすい形式に変換
    const cards = (data.results as NotionCard[]).map((page) => ({
      id: page.id,
      // テキスト取得のヘルパー（配列の最初の要素のテキストを取得）
      cardName: page.properties["カード名"]?.title?.[0]?.plain_text ?? "",
      suit: page.properties["スート"]?.select?.name ?? "",
      rank: page.properties["ランク"]?.select?.name ?? "",
      title: page.properties["カードタイトル"]?.rich_text?.[0]?.plain_text ?? "",
      description: page.properties["説明テキスト"]?.rich_text?.[0]?.plain_text ?? "",
      // 数値データ（nullの場合は0を返す）
      marketSize: page.properties["マーケットサイズ（万人）"]?.number ?? 0,
      monthlySales: page.properties["月間販売見込数（件）"]?.number ?? 0,
      unitPrice: page.properties["販売単価（円）"]?.number ?? 0,
      variableCost: page.properties["変動費月額（円）"]?.number ?? 0,
      feasibilityScore: page.properties["実現可能性スコア"]?.number ?? 0,
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("カード取得エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
