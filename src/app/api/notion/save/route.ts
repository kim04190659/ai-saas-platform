/**
 * /api/notion/save - Notion記録DB へのレコード追加（Sprint #6）
 *
 * 3種類のデータを「📊 RunWithプラットフォーム 記録DB」に1レコードとして追加する。
 * 事前に /api/notion/setup を1回実行してDBを作成し、
 * 返ってきた databaseId を NOTION_RECORDS_DB_ID 環境変数に設定すること。
 *
 * POST body:
 *   saveType: "runwith-maturity" | "card-game" | "gyosei"
 *   data: 各モジュールのデータオブジェクト
 */

import { NextRequest, NextResponse } from "next/server";

const NOTION_API_KEY    = process.env.NOTION_API_KEY!;
const RECORDS_DB_ID     = process.env.NOTION_RECORDS_DB_ID!;   // セットアップで作成したDBのID

// ─── Notion API ヘルパー ─────────────────────────────────────

/** Notionのrich_textブロックを作る（長い文字列は2000字で切る） */
const richText = (content: string) => [
  { type: "text", text: { content: content.slice(0, 2000) } },
];

/** Notionのdateプロパティを作る */
const dateVal = (iso: string) => ({ start: iso });

// ─── 各種別のレコードデータ組み立て ──────────────────────────

function buildMaturityRecord(data: {
  maturityLevel: number;
  maturityLabel: string;
  totalScore: number;
  maxScore: number;
  areaScores: Record<string, number>;
  weakAreas: string[];
  completedAt: string;
}) {
  // 領域別スコアを読みやすいテキストに変換
  const areaDetail = Object.entries(data.areaScores)
    .map(([area, score]) => `${area}: ${score}/5.0`)
    .join(" | ");

  return {
    parent: { database_id: RECORDS_DB_ID },
    properties: {
      "タイトル": {
        title: richText(
          `🔧 IT運用診断 Lv.${data.maturityLevel}「${data.maturityLabel}」`
        ),
      },
      "種別":          { select: { name: "IT運用診断" } },
      "レベル/ランク": { rich_text: richText(`Lv.${data.maturityLevel} ${data.maturityLabel}`) },
      "スコア":        { number: data.totalScore },
      "最大スコア":    { number: data.maxScore },
      "弱点・改善領域":{ rich_text: richText(data.weakAreas.join("、")) },
      "補足情報":      { rich_text: richText(areaDetail) },
      "記録日時":      { date: dateVal(data.completedAt) },
    },
  };
}

function buildCardGameRecord(data: {
  grade: string;
  totalProfit3Years: number;
  successRate: number;
  missionTitle: string;
  personaTitles: string[];
  completedAt: string;
}) {
  return {
    parent: { database_id: RECORDS_DB_ID },
    properties: {
      "タイトル": {
        title: richText(`🏭 LOGI-TECH ${data.grade}ランク`),
      },
      "種別":          { select: { name: "カードゲーム" } },
      "レベル/ランク": { rich_text: richText(`${data.grade}ランク`) },
      "スコア":        { number: data.totalProfit3Years },  // 3年累計利益（万円）
      "最大スコア":    { number: 0 },                       // カードゲームは最大値なし
      "弱点・改善領域":{ rich_text: richText(`課題: ${data.missionTitle}`) },
      "補足情報":      {
        rich_text: richText(
          `事業成功率 ${data.successRate}% | ペルソナ: ${data.personaTitles.join("、")}`
        ),
      },
      "記録日時":      { date: dateVal(data.completedAt) },
    },
  };
}

function buildGyoseiRecord(data: {
  townName: string;
  population: number;
  agingRate: number;
  fiscalIndex: number;
  survivalRank: string;
}) {
  const now = new Date().toISOString();
  return {
    parent: { database_id: RECORDS_DB_ID },
    properties: {
      "タイトル": {
        title: richText(`🏛️ 行政OS ${data.townName}`),
      },
      "種別":          { select: { name: "行政OS" } },
      "レベル/ランク": { rich_text: richText(`生存可能性 ${data.survivalRank}ランク`) },
      "スコア":        { number: data.fiscalIndex },        // 財政力指数
      "最大スコア":    { number: 1 },                       // 財政力指数の標準値
      "弱点・改善領域":{ rich_text: richText(`高齢化率 ${data.agingRate}%`) },
      "補足情報":      {
        rich_text: richText(
          `人口 ${data.population.toLocaleString()}人 | 財政力指数 ${data.fiscalIndex}`
        ),
      },
      "記録日時":      { date: dateVal(now) },
    },
  };
}

// ─── メインAPIハンドラー ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  // 環境変数チェック
  if (!NOTION_API_KEY) {
    return NextResponse.json(
      { error: "NOTION_API_KEY が設定されていません" },
      { status: 500 }
    );
  }
  if (!RECORDS_DB_ID) {
    return NextResponse.json(
      { error: "NOTION_RECORDS_DB_ID が未設定です。先に /api/notion/setup を実行してDBを作成してください。" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { saveType, data } = body;

    // saveType に応じてレコードデータを組み立てる
    let recordData: object;

    if (saveType === "runwith-maturity") {
      recordData = buildMaturityRecord(data);
    } else if (saveType === "card-game") {
      recordData = buildCardGameRecord(data);
    } else if (saveType === "gyosei") {
      recordData = buildGyoseiRecord(data);
    } else {
      return NextResponse.json(
        { error: `不明な saveType: ${saveType}` },
        { status: 400 }
      );
    }

    // Notion DB にレコード（ページ）を追加する
    const response = await fetch("https://api.notion.com/v1/pages", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${NOTION_API_KEY}`,
        "Notion-Version": "2022-06-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(recordData),
    });

    if (!response.ok) {
      const errBody = await response.text();
      console.error(`Notion DB追加エラー (status=${response.status}):`, errBody);
      let errDetail = errBody;
      try {
        const parsed = JSON.parse(errBody);
        errDetail = parsed.message ?? errBody;
      } catch { /* JSONでなければそのまま */ }
      return NextResponse.json(
        { error: `Notionへの保存に失敗しました: Notion APIエラー ${response.status}: ${errDetail}` },
        { status: 500 }
      );
    }

    const page = await response.json();
    return NextResponse.json({
      success: true,
      pageId: page.id,
      pageUrl: page.url,
    });

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Notion保存エラー:", errMsg);
    return NextResponse.json(
      { error: `Notionへの保存に失敗しました: ${errMsg}` },
      { status: 500 }
    );
  }
}
