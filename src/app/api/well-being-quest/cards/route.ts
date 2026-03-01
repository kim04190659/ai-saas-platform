/**
 * /api/well-being-quest/cards
 * Well-Being QUEST カードマスターDBからカード情報を取得するAPIルート
 *
 * GET /api/well-being-quest/cards?suit=♠️スペード  → 指定スートのカード一覧
 * GET /api/well-being-quest/cards                  → 全カード一覧
 *
 * 対応DB: 🃏 Well-Being QUEST カードマスターDB（Notion）
 * DB ID: 環境変数 NOTION_WB_CARD_DB_ID に設定する
 */

import { NextRequest, NextResponse } from "next/server";

// Notion APIの設定（環境変数から取得）
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_WB_CARD_DB_ID = process.env.NOTION_WB_CARD_DB_ID!;
// ↑ Vercelの環境変数に以下を追加してください:
//   NOTION_WB_CARD_DB_ID = 323b1783a93b4e2aa99d2c2b762ca461

// Notionから返ってくるカードデータの型定義（Well-Being QUEST専用）
type NotionWBCard = {
  id: string;
  properties: {
    // タイトル（例: "♠A: 75歳・一人暮らしの農家"）
    "カード名": { title: Array<{ plain_text: string }> };
    // スート（♠️スペード / ♣️クラブ / ♦️ダイヤ / ♥️ハート）
    "スート": { select: { name: string } | null };
    // ランク（A / 2〜10 / J / Q / K）
    "ランク": { select: { name: string } | null };
    // カードのメインタイトル（短い名称）
    "カードタイトル": { rich_text: Array<{ plain_text: string }> };
    // カードの説明文（ゲーム進行用）
    "説明テキスト": { rich_text: Array<{ plain_text: string }> };
    // 雰囲気を出すセリフ
    "フレーバーテキスト": { rich_text: Array<{ plain_text: string }> };
    // Well-Being指数への貢献度（1〜10）
    "Well-Being改善スコア（1-10）": { number: number | null };
    // 実現しやすさのスコア（1〜10）
    "実現可能性スコア（1-10）": { number: number | null };
    // 影響を受ける住民の数
    "影響住民数（人）": { number: number | null };
    // 施策に必要な期間（月数）
    "実施期間（ヶ月）": { number: number | null };
    // 年間の必要予算（百万円）
    "必要予算（百万円/年）": { number: number | null };
  };
};

// GETリクエストのハンドラー
export async function GET(request: NextRequest) {
  // URLパラメータからスート名を取得（例: ?suit=♠️スペード）
  const { searchParams } = new URL(request.url);
  const suit = searchParams.get("suit"); // null の場合は全件取得

  try {
    // スートが指定された場合はフィルタを作成
    const filter = suit
      ? {
          property: "スート",
          select: { equals: suit },
        }
      : undefined;

    // Notion APIにリクエストを送信（データベース検索）
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_WB_CARD_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28", // Notion APIバージョン（必須）
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter: filter,
          // ランク順に並べる（A→2→3→...→K）
          sorts: [{ property: "ランク", direction: "ascending" }],
          page_size: 100, // 最大100件（52枚なので余裕あり）
        }),
      }
    );

    // Notion APIのエラーハンドリング
    if (!response.ok) {
      const err = await response.text();
      console.error("Notion API Error:", response.status, err);
      if (response.status === 401) {
        return NextResponse.json(
          {
            error: "Notion認証エラー: NOTION_API_KEYが未設定またはDBが共有されていません",
            detail: err,
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Notionからデータ取得に失敗しました", detail: err },
        { status: 500 }
      );
    }

    const data = await response.json();

    // NotionのAPIレスポンスをフロントエンドで使いやすい形式に変換
    const cards = (data.results as NotionWBCard[]).map((page) => ({
      id: page.id,
      // カード識別情報
      cardName: page.properties["カード名"]?.title?.[0]?.plain_text ?? "",
      suit: page.properties["スート"]?.select?.name ?? "",
      rank: page.properties["ランク"]?.select?.name ?? "",
      // 表示テキスト
      title: page.properties["カードタイトル"]?.rich_text?.[0]?.plain_text ?? "",
      description: page.properties["説明テキスト"]?.rich_text?.[0]?.plain_text ?? "",
      flavorText: page.properties["フレーバーテキスト"]?.rich_text?.[0]?.plain_text ?? "",
      // Well-Being QUEST 専用の数値データ（nullの場合は0を返す）
      wellBeingScore: page.properties["Well-Being改善スコア（1-10）"]?.number ?? 0,
      feasibilityScore: page.properties["実現可能性スコア（1-10）"]?.number ?? 0,
      affectedResidents: page.properties["影響住民数（人）"]?.number ?? 0,
      implementationMonths: page.properties["実施期間（ヶ月）"]?.number ?? 0,
      budgetMillionYen: page.properties["必要予算（百万円/年）"]?.number ?? 0,
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("Well-Being QUESTカード取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
