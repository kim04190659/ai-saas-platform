/**
 * /api/card-game/cards
 * LOGIカードゲーム マスターDB からカード一覧を取得するAPI（v4.2対応）
 *
 * --- 使い方 ---
 * GET /api/card-game/cards?role=問題・課題   → 役割でフィルタ
 * GET /api/card-game/cards?role=ペルソナ     → ペルソナカード全件
 * GET /api/card-game/cards?role=パートナー   → パートナーカード全件
 * GET /api/card-game/cards?role=ジョブタイプ → ジョブタイプカード全件
 * GET /api/card-game/cards                   → 全件取得
 *
 * --- Vercel環境変数（要設定） ---
 * NOTION_API_KEY       : Notion integration token
 * NOTION_WB_CARD_DB_ID : LOGIカードマスターDB ID
 *   → 設定値: 6b7b85557869432580a24f685e02263e
 */

import { NextRequest, NextResponse } from "next/server";

// 環境変数から取得
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_CARD_DB_ID =
  process.env.NOTION_WB_CARD_DB_ID ?? "6b7b85557869432580a24f685e02263e";

// Notion API v2022-06-28 が返すカードデータの型定義（v4.2プロパティ名）
type NotionCard = {
  id: string;
  properties: {
    // タイトル（カード名: "♦A-PR01" など）
    "カード名": { title: Array<{ plain_text: string }> };
    // スート選択（例: "♦️ダイヤ"）
    "スート": { select: { name: string } | null };
    // ランク選択（例: "A", "K", "2"）
    "ランク": { select: { name: string } | null };
    // 役割選択（例: "問題・課題", "ペルソナ", "パートナー", "ジョブタイプ"）
    "役割": { select: { name: string } | null };
    // 基本値（ランクに対応する数値: A=13, K=12, ... 2=1）
    "基本値": { number: number | null };
    // カードタイトル（短い名前）
    "カードタイトル": { rich_text: Array<{ plain_text: string }> };
    // 説明テキスト（詳細説明）
    "説明テキスト": { rich_text: Array<{ plain_text: string }> };
    // ♦️ダイヤ専用: 単価（万円/社/年）= 基本値 × 100
    "単価_万円": { number: number | null };
    // ♥️ハート専用: 潜在顧客数（社）= 基本値 × 2
    "潜在顧客数_社": { number: number | null };
    // ♣️クラブ専用: コスト変動比率（%）
    "コスト変動比率_pct": { number: number | null };
    // ♣️クラブ・♠️スペード共通: 成功率貢献（%）
    "成功率貢献_pct": { number: number | null };
    // ♠️スペード専用: 初期投資（万円）
    "初期投資_万円": { number: number | null };
  };
};

// GETリクエストのハンドラー
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // 役割でフィルタ（"問題・課題" | "ペルソナ" | "パートナー" | "ジョブタイプ"）
  const role = searchParams.get("role");

  try {
    // Notion API のフィルタ条件を構築
    let filter: object | undefined;

    if (role) {
      // 役割フィルタ
      filter = { property: "役割", select: { equals: role } };
    }
    // filterがundefinedの場合は全件取得

    // Notion API へリクエスト送信
    const response = await fetch(
      `https://api.notion.com/v1/databases/${NOTION_CARD_DB_ID}/query`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          filter,
          // ランクの並び順（Notionのランク順: A → K → Q → ... → 2）
          sorts: [{ property: "ランク", direction: "ascending" }],
          page_size: 100, // 最大100件（52枚なので余裕あり）
        }),
        // Next.js のキャッシュ設定: 60秒間キャッシュ（Notion APIのレート制限対策）
        next: { revalidate: 60 },
      }
    );

    // エラーハンドリング
    if (!response.ok) {
      const errText = await response.text();
      console.error("Notion API Error:", response.status, errText);

      if (response.status === 401) {
        return NextResponse.json(
          {
            error:
              "Notion認証エラー: NOTION_API_KEYが未設定か、DBが共有されていません",
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: "Notionからデータ取得に失敗しました", detail: errText },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Notion APIのレスポンスをフロントエンドで使いやすい形式に変換
    const cards = (data.results as NotionCard[]).map((page) => ({
      id: page.id,

      // カード識別情報
      cardName: page.properties["カード名"]?.title?.[0]?.plain_text ?? "",
      suit: page.properties["スート"]?.select?.name ?? "",
      rank: page.properties["ランク"]?.select?.name ?? "",
      role: page.properties["役割"]?.select?.name ?? "",
      baseValue: page.properties["基本値"]?.number ?? 0,

      // 表示テキスト
      title: page.properties["カードタイトル"]?.rich_text?.[0]?.plain_text ?? "",
      description:
        page.properties["説明テキスト"]?.rich_text?.[0]?.plain_text ?? "",

      // v4.2 財務パラメーター（スートによって意味が異なる）
      unitPrice: page.properties["単価_万円"]?.number ?? 0,         // ♦️ダイヤ: 万円/社/年
      potentialCustomers: page.properties["潜在顧客数_社"]?.number ?? 0, // ♥️ハート: 社
      costVarianceRate: page.properties["コスト変動比率_pct"]?.number ?? 0, // ♣️クラブ: %
      successContribution: page.properties["成功率貢献_pct"]?.number ?? 0,  // ♣️♠️: %
      initialInvestment: page.properties["初期投資_万円"]?.number ?? 0,     // ♠️スペード: 万円
    }));

    return NextResponse.json({ cards });
  } catch (error) {
    console.error("LOGIカード取得エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
