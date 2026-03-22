/**
 * /api/notion/save - Notion一括保存API（Sprint #6）
 *
 * 3種類のデータをNotionページとして保存する。
 * 保存先: 🚀 RunWith プロジェクト（30e960a9-1e23-81a3-942f-d46a70556f20）の子ページ
 *
 * POST body:
 *   saveType: "runwith-maturity" | "card-game" | "gyosei"
 *   data: 各モジュールのデータオブジェクト
 */

import { NextRequest, NextResponse } from "next/server";

// Notion APIの設定
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
// 保存先の親ページ（🚀 RunWith プロジェクト）
const PARENT_PAGE_ID = "30e960a9-1e23-81a3-942f-d46a70556f20";

// Notion REST API でページを作成するヘルパー関数
async function createNotionPage(pageData: object): Promise<{ id: string; url: string }> {
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
    throw new Error(`Notion API エラー: ${err}`);
  }

  return response.json();
}

// テキストブロックを作成するヘルパー（Notionのブロック形式）
const textBlock = (content: string) => ({
  object: "block",
  type: "paragraph",
  paragraph: {
    rich_text: [{ type: "text", text: { content } }],
  },
});

// 見出し2ブロックを作成するヘルパー
const heading2 = (content: string) => ({
  object: "block",
  type: "heading_2",
  heading_2: {
    rich_text: [{ type: "text", text: { content } }],
  },
});

// 箇条書きブロックを作成するヘルパー
const bulletItem = (content: string) => ({
  object: "block",
  type: "bulleted_list_item",
  bulleted_list_item: {
    rich_text: [{ type: "text", text: { content } }],
  },
});

// 区切り線ブロック
const divider = () => ({
  object: "block",
  type: "divider",
  divider: {},
});

// ─── 各保存タイプのページ生成 ──────────────────────────────────

/**
 * IT運用成熟度診断の結果ページを生成する
 */
function buildMaturityPage(data: {
  maturityLevel: number;
  maturityLabel: string;
  totalScore: number;
  maxScore: number;
  areaScores: Record<string, number>;
  weakAreas: string[];
  completedAt: string;
}) {
  const completedDate = new Date(data.completedAt).toLocaleString("ja-JP");
  const scorePercent = Math.round((data.totalScore / data.maxScore) * 100);

  return {
    parent: { page_id: PARENT_PAGE_ID },
    properties: {
      title: {
        title: [
          {
            text: {
              content: `🔧 IT運用成熟度診断 Lv.${data.maturityLevel}「${data.maturityLabel}」— ${completedDate}`,
            },
          },
        ],
      },
    },
    children: [
      heading2("📊 診断結果サマリー"),
      textBlock(`成熟度レベル: Lv.${data.maturityLevel}「${data.maturityLabel}」`),
      textBlock(`スコア: ${data.totalScore} / ${data.maxScore}点（${scorePercent}%）`),
      textBlock(`診断日時: ${completedDate}`),
      divider(),
      heading2("📋 領域別スコア"),
      ...Object.entries(data.areaScores).map(([area, score]) =>
        bulletItem(
          `${area}: ${score} / 5.0${data.weakAreas.includes(area) ? " ⚠️ 要改善" : ""}`
        )
      ),
      divider(),
      heading2("🎯 改善優先領域"),
      ...data.weakAreas.map((area, i) => bulletItem(`#${i + 1} ${area}`)),
      divider(),
      heading2("💡 次のアクション"),
      textBlock(
        `Lv.${data.maturityLevel}から次のレベルへ上げるために、` +
          `まず「${data.weakAreas[0]}」の改善から始めることを推奨します。` +
          `AIアシスタントに「${data.weakAreas[0]}をどう改善するか」を聞いてみてください。`
      ),
    ],
  };
}

/**
 * LOGI-TECH カードゲーム結果のページを生成する
 */
function buildCardGamePage(data: {
  grade: string;
  totalProfit3Years: number;
  successRate: number;
  missionTitle: string;
  personaTitles: string[];
  completedAt: string;
}) {
  const completedDate = new Date(data.completedAt).toLocaleString("ja-JP");

  return {
    parent: { page_id: PARENT_PAGE_ID },
    properties: {
      title: {
        title: [
          {
            text: {
              content: `🏭 LOGI-TECH ゲーム結果 ${data.grade}ランク — ${completedDate}`,
            },
          },
        ],
      },
    },
    children: [
      heading2("🎯 ゲーム結果サマリー"),
      textBlock(`総合ランク: ${data.grade}ランク`),
      textBlock(`3年間累計利益: ${data.totalProfit3Years.toLocaleString()}万円`),
      textBlock(`事業成功率: ${data.successRate}%`),
      textBlock(`プレイ日時: ${completedDate}`),
      divider(),
      heading2("🃏 選択したカード"),
      textBlock(`課題（ミッション）: 「${data.missionTitle}」`),
      ...data.personaTitles.map((p) => bulletItem(`ペルソナ: ${p}`)),
      divider(),
      heading2("💡 Make or Buy の学び"),
      textBlock(
        "このゲームで学んだ直営（Make）と民間委託（Buy）の判断軸は、" +
          "実際の業務改善や行政サービス設計にも応用できます。" +
          "AIアシスタントに「この結果から何を学べるか」を聞いてみてください。"
      ),
    ],
  };
}

/**
 * 行政OS（屋久島）診断データのページを生成する
 */
function buildGyoseiPage(data: {
  townName: string;
  population: number;
  agingRate: number;
  fiscalIndex: number;
  survivalRank: string;
}) {
  const now = new Date().toLocaleString("ja-JP");

  return {
    parent: { page_id: PARENT_PAGE_ID },
    properties: {
      title: {
        title: [
          {
            text: {
              content: `🏛️ 行政OS 診断レポート — ${data.townName} — ${now}`,
            },
          },
        ],
      },
    },
    children: [
      heading2(`🏛️ ${data.townName} 行政データ`),
      bulletItem(`人口: ${data.population.toLocaleString()}人`),
      bulletItem(`高齢化率: ${data.agingRate}%`),
      bulletItem(`財政力指数: ${data.fiscalIndex}`),
      bulletItem(`生存可能性ランク: ${data.survivalRank}`),
      divider(),
      heading2("📊 課題分析"),
      textBlock(
        `財政力指数${data.fiscalIndex}は全国平均（約0.5）を大きく下回っており、` +
          `行政サービスの持続的な提供に課題があります。`
      ),
      textBlock(
        `高齢化率${data.agingRate}%の状況では、` +
          `医療・介護など社会保障コストの増大と税収減少が同時進行しています。`
      ),
      divider(),
      heading2("💡 RunWith でできること"),
      bulletItem("IT運用の成熟度向上により、行政業務のデジタル化コストを削減"),
      bulletItem("AIを活用したナレッジ管理で、少人数体制での業務継続を支援"),
      bulletItem("民間委託（Buy）の判断支援で、最適なアウトソーシング戦略を立案"),
      textBlock(`記録日時: ${now}`),
    ],
  };
}

// ─── メインAPIハンドラー ─────────────────────────────────────────

export async function POST(request: NextRequest) {
  // NOTION_API_KEY チェック
  if (!NOTION_API_KEY) {
    return NextResponse.json(
      { error: "NOTION_API_KEY が設定されていません" },
      { status: 500 }
    );
  }

  try {
    const body = await request.json();
    const { saveType, data } = body;

    // saveType に応じてページデータを組み立てる
    let pageData: object;

    if (saveType === "runwith-maturity") {
      pageData = buildMaturityPage(data);
    } else if (saveType === "card-game") {
      pageData = buildCardGamePage(data);
    } else if (saveType === "gyosei") {
      pageData = buildGyoseiPage(data);
    } else {
      return NextResponse.json(
        { error: `不明な saveType: ${saveType}` },
        { status: 400 }
      );
    }

    // Notion にページを作成する
    const page = await createNotionPage(pageData);

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
