/**
 * /api/well-being-quest/cards
 * LOGIカードゲーム マスターDB からカード一覧を取得するAPI
 *
 * --- 使い方 ---
 * GET /api/well-being-quest/cards?role=問題・課題   → 役割でフィルタ
 * GET /api/well-being-quest/cards?role=ペルソナ&theme=配送業・物流人材不足
 *                                                    → 役割 + テーマで絞り込み
 * GET /api/well-being-quest/cards?suit=♠️スペード   → 旧API互換（スートで絞り込み）
 *
 * --- Vercel環境変数（要設定） ---
 * NOTION_API_KEY       : Notion integration token
 * NOTION_WB_CARD_DB_ID : LOGIカードマスターDB ID
 *   → 設定値: 6b7b85557869432580a24f685e02263e
 */

import { NextRequest, NextResponse } from "next/server";

// 環境変数から取得
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
// ⚠️ Vercel環境変数 NOTION_WB_CARD_DB_ID を以下に設定すること
//    6b7b85557869432580a24f685e02263e（LOGIカードゲーム マスターDB）
const NOTION_CARD_DB_ID =
  process.env.NOTION_WB_CARD_DB_ID ?? "6b7b85557869432580a24f685e02263e";

// Notion API v2022-06-28 が返すカードデータの型定義
type NotionCard = {
  id: string;
  properties: {
    "カード名": { title: Array<{ plain_text: string }> };
    "スート": { select: { name: string } | null };
    "ランク": { select: { name: string } | null };
    "役割": { select: { name: string } | null };
    "社会課題テーマ": { select: { name: string } | null };
    "カードタイトル": { rich_text: Array<{ plain_text: string }> };
    "説明テキスト": { rich_text: Array<{ plain_text: string }> };
    "フレーバーテキスト": { rich_text: Array<{ plain_text: string }> };
    "マーケットサイズ（万人）": { number: number | null };
    "月間販売見込数（件）": { number: number | null };
    "販売単価（円）": { number: number | null };
    "変動費月額（円）": { number: number | null };
    "実現可能性スコア": { number: number | null };
    // v3で追加した新フィールド（未設定の場合はnullの可能性あり）
    "業務機能": { multi_select: Array<{ name: string }> } | null;
    "対応ペルソナ": { multi_select: Array<{ name: string }> } | null;
  };
};

// ────────────────────────────────────────────────────────────────────
// Notion DBの「役割」プロパティ値とAPIクエリパラメータのマッピング
//
// select/page.tsx から渡される role 値   → Notion DB の実際の役割値
//   "問題・課題"  → "ミッション"    （PRカード: 課題・社会問題）
//   "ペルソナ"    → "ペルソナ"      （PEカード: 対象ユーザー）
//   "パートナー"  → "パートナー"    （PAカード: Buy委託先）
//   "ジョブタイプ"→ "ソリューション" （SLカード: Makeアクション）
// ────────────────────────────────────────────────────────────────────
const ROLE_MAP: Record<string, string> = {
  "問題・課題": "ミッション",
  "ペルソナ": "ペルソナ",
  "パートナー": "パートナー",
  "ジョブタイプ": "ソリューション",
};

// GETリクエストのハンドラー
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  // v3: 役割でフィルタ（"問題・課題" | "ペルソナ" | "パートナー" | "ジョブタイプ"）
  const role = searchParams.get("role");
  // v3: テーマでも絞り込み（例: "配送業・物流人材不足"）
  const theme = searchParams.get("theme");
  // 旧API互換: スートでフィルタ
  const suit = searchParams.get("suit");

  try {
    // Notion API のフィルタ条件を構築
    let filter: object | undefined;

    if (role) {
      // 役割マッピング: コードの role 値 → Notion DB の実際の役割値に変換
      // 例: "問題・課題" → "ミッション"、"ジョブタイプ" → "ソリューション"
      const notionRole = ROLE_MAP[role] ?? role;

      // 役割フィルタ（v3メイン）
      const conditions: object[] = [
        { property: "役割", select: { equals: notionRole } },
      ];
      // テーマフィルタ（ペルソナを課題と同じテーマに絞るときに使用）
      if (theme) {
        conditions.push({
          property: "社会課題テーマ",
          select: { equals: theme },
        });
      }
      // 条件が1つなら単体フィルタ、複数ならAND結合
      filter = conditions.length === 1 ? conditions[0] : { and: conditions };
    } else if (suit) {
      // 旧API互換: スートで絞り込み
      filter = { property: "スート", select: { equals: suit } };
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
          // ランクの昇順で並べる（A → 2 → 3 → ... → K）
          sorts: [{ property: "ランク", direction: "ascending" }],
          page_size: 100, // 最大100件（52枚なので余裕あり）
        }),
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
      theme: page.properties["社会課題テーマ"]?.select?.name ?? "",

      // 表示テキスト
      title: page.properties["カードタイトル"]?.rich_text?.[0]?.plain_text ?? "",
      description:
        page.properties["説明テキスト"]?.rich_text?.[0]?.plain_text ?? "",
      flavorText:
        page.properties["フレーバーテキスト"]?.rich_text?.[0]?.plain_text ?? "",

      // Make or Buy 計算用の数値
      marketSize: page.properties["マーケットサイズ（万人）"]?.number ?? 0,    // 万人
      monthlyVolume: page.properties["月間販売見込数（件）"]?.number ?? 0,      // 件/月
      unitPrice: page.properties["販売単価（円）"]?.number ?? 0,               // 円/件
      variableCost: page.properties["変動費月額（円）"]?.number ?? 0,          // 円/月
      feasibilityScore: page.properties["実現可能性スコア"]?.number ?? 0,       // 1-10

      // v3新フィールド（未設定の場合は空配列で返す）
      businessFunctions: (
        page.properties["業務機能"]?.multi_select ?? []
      ).map((s: { name: string }) => s.name),

      targetPersonas: (
        page.properties["対応ペルソナ"]?.multi_select ?? []
      ).map((s: { name: string }) => s.name),
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
