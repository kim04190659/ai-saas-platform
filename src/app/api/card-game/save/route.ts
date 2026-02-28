/**
 * /api/card-game/save
 * 生成された企画書をNotionの企画書DBに保存するAPIルート
 *
 * POST /api/card-game/save
 */

import { NextRequest, NextResponse } from "next/server";

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_PLAN_DB_ID = process.env.NOTION_PLAN_DB_ID!; // 企画書DB

export async function POST(request: NextRequest) {
  const body = await request.json();

  const {
    teamName, members, solutionName,
    heartCard, diamondCard, clubCard, spadeCard,
    aiResult, // Claude APIからの評価結果
    userInputs, // ユーザーの入力内容
  } = body;

  // 今日の日付を日本語形式で作成
  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric", month: "2-digit", day: "2-digit"
  });

  // Notion APIに保存するページデータを組み立て
  const pageData = {
    parent: { database_id: NOTION_PLAN_DB_ID },
    properties: {
      // タイトルプロパティ（必須）
      "企画書タイトル": {
        title: [{ text: { content: `${teamName} - ${solutionName} (${today})` } }],
      },
      "チーム名": { rich_text: [{ text: { content: teamName } }] },
      "メンバー名": { rich_text: [{ text: { content: members } }] },
      "ソリューション名": { rich_text: [{ text: { content: solutionName } }] },
      // 選択したカード名
      "選択カード_ハート": {
        rich_text: [{ text: { content: `${heartCard.rank} - ${heartCard.title}` } }],
      },
      "選択カード_ダイヤ": {
        rich_text: [{ text: { content: `${diamondCard.rank} - ${diamondCard.title}` } }],
      },
      "選択カード_クラブ": {
        rich_text: [{ text: { content: `${clubCard.rank} - ${clubCard.title}` } }],
      },
      "選択カード_スペード": {
        rich_text: [{ text: { content: `${spadeCard.rank} - ${spadeCard.title}` } }],
      },
      // 数値（ビジネス指標）
      "月間販売見込数": { number: heartCard.monthlySales },
      "販売単価": { number: diamondCard.unitPrice },
      "変動費月額": { number: clubCard.variableCost },
      "実現可能性スコア": { number: spadeCard.feasibilityScore },
      "月間売上試算": { number: aiResult.metrics.monthlyRevenue },
      "月間利益試算": { number: aiResult.metrics.monthlyProfit },
      // ユーザー入力
      "他社優位性": { rich_text: [{ text: { content: userInputs.advantage.substring(0, 2000) } }] },
      "マーケティング戦略": { rich_text: [{ text: { content: userInputs.userBenefit.substring(0, 2000) } }] },
      "コスト低減策": { rich_text: [{ text: { content: userInputs.planRevision.substring(0, 2000) } }] },
      // AIが生成したコンテンツ
      "AIが生成したビジネスプラン": {
        rich_text: [{ text: { content: aiResult.improvedPlan.substring(0, 2000) } }],
      },
      "AI評価スコア": { number: aiResult.score },
      "AI評価コメント": {
        rich_text: [{ text: { content: aiResult.mentorComment.substring(0, 2000) } }],
      },
      "強み": {
        rich_text: [{ text: { content: aiResult.strengths.join("\n") } }],
      },
      "課題・リスク": {
        rich_text: [{ text: { content: aiResult.issues.join("\n") } }],
      },
      // ステータス
      "ステータス": { select: { name: "AI評価完了" } },
    },
  };

  try {
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(pageData),
    });

    if (!response.ok) {
      const err = await response.text();
      console.error("Notion保存エラー:", err);
      return NextResponse.json({ error: "Notionへの保存に失敗しました" }, { status: 500 });
    }

    const page = await response.json();
    // 保存成功：NotionページのIDとURLを返す
    return NextResponse.json({
      success: true,
      pageId: page.id,
      pageUrl: page.url,
    });
  } catch (error) {
    console.error("保存エラー:", error);
    return NextResponse.json({ error: "サーバーエラーが発生しました" }, { status: 500 });
  }
}
