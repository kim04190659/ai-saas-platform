/**
 * /api/card-game/generate
 * 選択されたカードと入力情報をもとに、Claude AIがビジネスプランを生成・評価するAPIルート
 *
 * POST /api/card-game/generate
 * Body: {
 *   teamName, members,
 *   heartCard, diamondCard, clubCard, spadeCard,  // 選択カードデータ
 *   solutionName, userBenefit, advantage, planRevision  // ユーザー入力
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

// Claude APIクライアントを初期化
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// フロントエンドから送られてくるカードデータの型
type CardData = {
  id: string;
  cardName: string;
  suit: string;
  rank: string;
  title: string;
  description: string;
  marketSize: number;
  monthlySales: number;
  unitPrice: number;
  variableCost: number;
  feasibilityScore: number;
};

// リクエストボディの型
type GenerateRequest = {
  teamName: string;
  members: string;
  heartCard: CardData;   // ♥️ペルソナ
  diamondCard: CardData; // ♦️問題・課題
  clubCard: CardData;    // ♣️パートナー
  spadeCard: CardData;   // ♠️ジョブタイプ
  solutionName: string;
  userBenefit: string;
  advantage: string;
  planRevision: string;
};

export async function POST(request: NextRequest) {
  const body: GenerateRequest = await request.json();

  const {
    heartCard, diamondCard, clubCard, spadeCard,
    solutionName, userBenefit, advantage, planRevision,
  } = body;

  // ビジネス指標を計算（カードの数値から）
  const monthlyRevenue = heartCard.monthlySales * diamondCard.unitPrice;  // 月間売上
  const monthlyProfit = monthlyRevenue - clubCard.variableCost;           // 月間利益
  const profitMargin = monthlyRevenue > 0                                  // 利益率
    ? Math.round((monthlyProfit / monthlyRevenue) * 100)
    : 0;

  // Claudeに送るプロンプトを作成
  const prompt = `あなたは経験豊富なビジネスプランコンサルタントです。
学生が作成したビジネスプランを、以下の情報をもとに「改善・強化」し、厳格に評価してください。

## 📊 選択カード情報

### ♥️ ペルソナ（誰のため）
- カード: ${heartCard.rank} - ${heartCard.title}
- 詳細: ${heartCard.description}
- 市場規模: ${heartCard.marketSize.toLocaleString()}万人/社
- 月間販売見込: ${heartCard.monthlySales.toLocaleString()}件/月

### ♦️ 問題・課題（何を解決）
- カード: ${diamondCard.rank} - ${diamondCard.title}
- 詳細: ${diamondCard.description}
- 想定販売単価: ¥${diamondCard.unitPrice.toLocaleString()}

### ♣️ パートナー（誰と組む）
- カード: ${clubCard.rank} - ${clubCard.title}
- 詳細: ${clubCard.description}
- 月額変動費: ¥${clubCard.variableCost.toLocaleString()}

### ♠️ ジョブタイプ（どう実現）
- カード: ${spadeCard.rank} - ${spadeCard.title}
- 詳細: ${spadeCard.description}
- 実現可能性スコア: ${spadeCard.feasibilityScore}/10

## 💰 ビジネス指標（自動計算）
- 月間売上試算: ¥${monthlyRevenue.toLocaleString()}
- 月間変動費: ¥${clubCard.variableCost.toLocaleString()}
- 月間利益試算: ¥${monthlyProfit.toLocaleString()}
- 利益率: ${profitMargin}%

## 📝 学生のビジネスプラン入力

### ソリューション名
${solutionName}

### ユーザーベネフィット（利用者への価値）
${userBenefit}

### 自社の強みと他社との差異化
${advantage}

### ビジネスプランの修正・補足
${planRevision}

---

## 📋 出力指示

以下のJSON形式で回答してください（JSON以外のテキストは一切含めないこと）:

{
  "improvedPlan": "改善されたビジネスプラン全文（400文字程度）。具体的な施策、数値目標、主要リスク対策を含めること",
  "executiveSummary": "エグゼクティブサマリー（200文字以内）。投資家に一言で魅力を伝える文章",
  "targetCustomer": "ターゲット顧客の詳細な定義（150文字以内）",
  "valueProposition": "バリュープロポジション（価値提案）を1文で（100文字以内）",
  "revenueModel": "収益モデルの詳細説明（200文字以内）",
  "score": 評価スコア（整数、0〜100）,
  "scoreBreakdown": {
    "marketPotential": 市場性スコア（0〜25）,
    "feasibility": 実現可能性スコア（0〜25）,
    "differentiation": 差別化スコア（0〜25）,
    "planQuality": プラン品質スコア（0〜25）
  },
  "strengths": ["強み1", "強み2", "強み3"],
  "issues": ["課題・リスク1", "課題・リスク2", "課題・リスク3"],
  "nextActions": ["グループワークでの検討事項1", "検討事項2", "検討事項3"],
  "mentorComment": "メンターからの総評コメント（300文字以内）。学生への励ましと厳しい指摘のバランスを取ること"
}

評価基準（厳格に）:
- 80点以上: 投資家に見せられる水準
- 60-79点: 良いアイデアだが要改善
- 40-59点: 方向性はあるが根本的な見直しが必要
- 40点未満: 大幅な再設計が必要

学生の熱意は認めつつも、ビジネスとして成立するかどうかを客観的・厳格に評価すること。`;

  try {
    // Claude APIを呼び出す（haiku = コスト効率が良いモデル）
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 4096,
      messages: [{ role: "user", content: prompt }],
    });

    // レスポンスからテキストを取得
    const rawText = message.content[0].type === "text" ? message.content[0].text : "";

    // JSONをパース（コードブロックがある場合は除去）
    let jsonStr = rawText
      .replace(/```json\n?/g, "")
      .replace(/```\n?/g, "")
      .trim();

    // JSON部分だけを抽出（{ から最後の } まで）
    const jsonStart = jsonStr.indexOf("{");
    const jsonEnd = jsonStr.lastIndexOf("}");
    if (jsonStart !== -1 && jsonEnd !== -1) {
      jsonStr = jsonStr.slice(jsonStart, jsonEnd + 1);
    }

    let result;
    try {
      result = JSON.parse(jsonStr);
    } catch (parseError) {
      // JSONパース失敗時は生テキストをそのまま返す（フォールバック）
      console.error("JSONパースエラー。生テキスト長:", rawText.length, parseError);
      console.error("JSONプレビュー:", jsonStr.slice(0, 200));
      return NextResponse.json(
        { error: "AI応答のパースに失敗しました。再試行してください。", rawLength: rawText.length },
        { status: 500 }
      );
    }

    // 計算した指標も一緒に返す
    return NextResponse.json({
      ...result,
      metrics: {
        monthlyRevenue,
        monthlyProfit,
        variableCost: clubCard.variableCost,
        profitMargin,
        feasibilityScore: spadeCard.feasibilityScore,
        marketSize: heartCard.marketSize,
      },
    });
  } catch (error) {
    console.error("Claude API エラー:", error);
    return NextResponse.json(
      { error: "AI生成に失敗しました。しばらく待ってから再試行してください。" },
      { status: 500 }
    );
  }
}
