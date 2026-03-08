/**
 * /api/card-game/generate
 * Mission in LOGI-TECH — Claude AI によるビジネスプラン評価API（v4.2対応）
 *
 * POST /api/card-game/generate
 * Body: {
 *   selected: SelectedCards,  // 選択したカード情報
 *   calcResult: CalcResult,   // v4.2 財務計算結果
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Claude APIクライアントを初期化（環境変数からAPIキーを読み取る）
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// カードの型定義（v4.2）
type Card = {
  id: string;
  cardName: string;
  suit: string;
  rank: string;
  role: string;
  baseValue: number;
  title: string;
  description: string;
  unitPrice: number;
  potentialCustomers: number;
  costVarianceRate: number;
  successContribution: number;
  initialInvestment: number;
};

// 選択カードの型
type SelectedCards = {
  problemCard: Card;
  personaCards: Card[];
  partnerCards: Card[];
  jobCards: Card[];
};

// 財務計算結果の型
type CalcResult = {
  successRate: number;
  marketSize: number;
  annualRevenue: number;
  totalCostRate: number;
  annualCost: number;
  annualProfit: number;
  initialCost: number;
  profit3years: number;
  grade: string;
};

// POSTリクエストのハンドラー
export async function POST(request: NextRequest) {
  const body = await request.json();

  // v4.2形式のリクエスト（{ selected, calcResult }）かどうかチェック
  if (body.selected && body.calcResult) {
    return handleV42Request(body.selected as SelectedCards, body.calcResult as CalcResult);
  }

  // 旧形式のリクエストへの後方互換（エラー返却）
  return NextResponse.json(
    { error: "v4.2形式のリクエストが必要です" },
    { status: 400 }
  );
}

/**
 * v4.2 ビジネスプラン評価を Claude AI に依頼する
 */
async function handleV42Request(selected: SelectedCards, calc: CalcResult) {
  const { problemCard, personaCards, partnerCards, jobCards } = selected;

  // ランク判定のラベル
  const gradeLabels: Record<string, string> = {
    S: "S（2億円以上 ⭐）",
    A: "A（1〜2億円 🥇）",
    B: "B（5千万〜1億円 🥈）",
    C: "C（黒字 🥉）",
    D: "D（赤字 😰）",
  };

  // Claude に送るプロンプトを作成
  const prompt = `あなたは物流業界のビジネスコンサルタントです。
以下のカードゲームで選択されたビジネスプランを、専門的かつ学習者に分かりやすく評価してください。

## 選択されたカード

### ♦️ 解決する課題
- ${problemCard.cardName}: ${problemCard.title}
- ${problemCard.description}
- 単価: ${problemCard.unitPrice.toLocaleString()}万円/社/年

### ♥️ ペルソナ（市場）
${personaCards.map(c => `- ${c.cardName}: ${c.title}（潜在顧客${c.potentialCustomers}社）`).join("\n")}

### ♣️ パートナー
${partnerCards.length > 0
    ? partnerCards.map(c => `- ${c.cardName}: ${c.title}（コスト+${c.costVarianceRate}%, 成功率+${c.successContribution}%）`).join("\n")
    : "- なし"}

### ♠️ ジョブタイプ
${jobCards.length > 0
    ? jobCards.map(c => `- ${c.cardName}: ${c.title}（初期費${c.initialInvestment.toLocaleString()}万円, 成功率+${c.successContribution}%）`).join("\n")
    : "- なし"}

## 財務計算結果（v4.2）

| 指標 | 値 |
|------|-----|
| 事業成功率 | ${calc.successRate}% |
| 市場規模 | ${calc.marketSize.toLocaleString()}社 |
| 年間売上 | ${Math.round(calc.annualRevenue).toLocaleString()}万円 |
| コスト変動比率 | ${calc.totalCostRate}% |
| 年間コスト | ${Math.round(calc.annualCost).toLocaleString()}万円 |
| 年間利益 | ${Math.round(calc.annualProfit).toLocaleString()}万円 |
| 初期費 | ${calc.initialCost.toLocaleString()}万円 |
| **3年間累計利益** | **${Math.round(calc.profit3years).toLocaleString()}万円** |
| **総合ランク** | **${gradeLabels[calc.grade] ?? calc.grade}** |

## 評価の依頼

以下の3点について、合計200文字程度で簡潔に日本語で評価してください：
1. このビジネスプランの最大の強みは何ですか？
2. リスクや改善すべき点があれば教えてください。
3. このカードの組み合わせを選んだ学習者へのアドバイスをお願いします。

学習者は物流業界について学ぶ中高生・大学生を想定しています。
専門用語は分かりやすく説明しながら、前向きで励みになる評価をお願いします。`;

  try {
    // Claude Haiku を使用（コスト効率が良い）
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    });

    // レスポンスからテキストを取得
    const evaluation =
      message.content[0].type === "text" ? message.content[0].text : "";

    // フロントエンドには evaluation フィールドとして返す
    return NextResponse.json({ evaluation });
  } catch (error) {
    console.error("Claude API エラー:", error);
    return NextResponse.json(
      { error: "AI評価に失敗しました。しばらく待ってから再試行してください。" },
      { status: 500 }
    );
  }
}
