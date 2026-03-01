/**
 * /api/well-being-quest/evaluate
 * Groq AI（llama-3.3-70b）を使って政策提案書を評価するAPIルート
 *
 * POST /api/well-being-quest/evaluate
 *   body: { teamName, members, selectedCards, plan }
 *   returns: { proposal, wellBeingScores, populationSim, rankJudge, rank, comment }
 *
 * 評価内容:
 *   - Well-Being 8指標のスコア（各12.5点満点 × 8 = 100点）
 *   - 人口シミュレーション（5年後・10年後・20年後）
 *   - 目標達成判定
 *   - 総合ランク（S/A/B/C/D）
 */

import { NextRequest, NextResponse } from "next/server";

// Groq APIの設定
const GROQ_API_KEY = process.env.GROQ_API_KEY!;
// Groqで使用するモデル（LLaMA 3.3 70B - 無料枠あり、高品質）
const GROQ_MODEL = "llama-3.3-70b-versatile";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

// フロントエンドから受け取るデータの型
type EvaluateRequest = {
  teamName: string;       // チーム名
  members: string;        // メンバー名（改行区切り）
  targetPopulation: number; // 目標人口（例: 12000）
  targetWellBeing: number;  // 目標Well-Being指数（例: 75）
  selectedCards: {
    persona: {            // ♠ペルソナ（誰の課題か）
      title: string;
      description: string;
    };
    problem: {            // ♣課題・問題（何が起きているか）
      title: string;
      description: string;
    };
    partner: {            // ♦パートナー（誰と組むか）
      title: string;
      description: string;
    };
    action: {             // ♥アクション（何をするか）
      title: string;
      description: string;
    };
  };
  planText: string;       // チームが入力した政策提案の文章
};

// AIが返してくるJSON形式の型定義
type AIResult = {
  proposal: string;           // AIが整理した政策提案書（400字程度）
  wellBeingScores: {          // Well-Being 8指標のスコア（各0〜12.5点）
    economic: number;         // 経済的安定
    socialConnection: number; // 社会的つながり
    healthMedical: number;    // 健康・医療
    autonomy: number;         // 自己決定の自由
    generosity: number;       // 助け合い・寛大さ
    trust: number;            // 行政への信頼
    safety: number;           // 安全・安心
    nature: number;           // 自然・住環境の豊かさ
    total: number;            // 合計（100点満点）
  };
  populationSim: {            // 人口シミュレーション
    withoutPolicy: {          // 施策なし（自然推移）
      y5: number;             // 5年後
      y10: number;            // 10年後
      y20: number;            // 20年後
    };
    withPolicy: {             // 施策あり
      y5: number;
      y10: number;
      y20: number;
    };
  };
  rankJudge: {                // 目標達成判定
    populationAchieved: boolean; // 人口目標達成？
    wellBeingAchieved: boolean;  // WB目標達成？
    populationDiff: number;   // 差（±）
    wellBeingDiff: number;    // 差（±）
  };
  rank: "S" | "A" | "B" | "C" | "D"; // 総合ランク
  strengths: string[];        // 強み（2〜3点）
  challenges: string[];       // 課題（2〜3点）
  nextActions: string[];      // 次のアクション（2〜3点）
  comment: string;            // 総合評価コメント（200字）
};

// POSTリクエストのハンドラー
export async function POST(request: NextRequest) {
  try {
    // リクエストボディを取得
    const body: EvaluateRequest = await request.json();
    const { teamName, selectedCards, planText, targetPopulation, targetWellBeing } = body;

    // Groq AIに送るプロンプトを作成
    const prompt = `
あなたは「限界自治体の政策評価AI」です。
以下のチームが選んだ4枚のカードと政策提案書を評価してください。

## 評価対象チーム
チーム名: ${teamName}

## 選択カード（4枚）
- ♠ ペルソナ（誰の課題か）: 【${selectedCards.persona.title}】
  ${selectedCards.persona.description}
- ♣ 課題・問題（何が起きているか）: 【${selectedCards.problem.title}】
  ${selectedCards.problem.description}
- ♦ パートナー（誰と組むか）: 【${selectedCards.partner.title}】
  ${selectedCards.partner.description}
- ♥ アクション（何をするか）: 【${selectedCards.action.title}】
  ${selectedCards.action.description}

## チームの政策提案
${planText}

## チームの目標
- 目標人口: ${targetPopulation.toLocaleString()}人（起点: 10,000人）
- 目標Well-Being指数: ${targetWellBeing}点（100点満点）

## 評価基準
### Well-Being 8指標（各12.5点、合計100点）
1. 経済的安定（収入・雇用・産業）
2. 社会的つながり（コミュニティ・共助）
3. 健康・医療（健康寿命・医療アクセス）
4. 自己決定の自由（自分の生き方を選べるか）
5. 助け合い・寛大さ（ボランティア・共助）
6. 行政への信頼（透明性・廉潔さ）
7. 安全・安心（防災・介護・見守り）
8. 自然・住環境の豊かさ（自然・住みやすさ）

### 総合ランク基準
- S: 人口目標達成 + 増加転換、Well-Being 85点以上
- A: 人口目標達成、Well-Being 70点以上
- B: 目標の80%達成、Well-Being 55点以上
- C: 一部改善あり、Well-Being 40点以上
- D: 効果限定的、Well-Being 40点未満

## 出力形式
必ず以下のJSONフォーマットで出力してください。JSONのみ出力し、他のテキストは一切含めないこと。

{
  "proposal": "4枚のカードを組み合わせた政策提案書（400字程度）",
  "wellBeingScores": {
    "economic": 各指標のスコア（0〜12.5の小数点1桁）,
    "socialConnection": 数値,
    "healthMedical": 数値,
    "autonomy": 数値,
    "generosity": 数値,
    "trust": 数値,
    "safety": 数値,
    "nature": 数値,
    "total": 合計点（0〜100）
  },
  "populationSim": {
    "withoutPolicy": { "y5": 5年後人口, "y10": 10年後人口, "y20": 20年後人口 },
    "withPolicy": { "y5": 5年後人口, "y10": 10年後人口, "y20": 20年後人口 }
  },
  "rankJudge": {
    "populationAchieved": true or false,
    "wellBeingAchieved": true or false,
    "populationDiff": 目標との差（正=超過、負=未達）,
    "wellBeingDiff": 目標との差
  },
  "rank": "S" or "A" or "B" or "C" or "D",
  "strengths": ["強み1", "強み2", "強み3"],
  "challenges": ["課題1", "課題2", "課題3"],
  "nextActions": ["次のアクション1", "次のアクション2", "次のアクション3"],
  "comment": "総合評価コメント（200字程度）"
}
`;

    // Groq APIにリクエストを送信
    const groqResponse = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          {
            role: "system",
            content:
              "あなたは限界自治体の政策を評価するAIアシスタントです。必ずJSONのみを返してください。マークダウンのコードブロックは使わないこと。",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,       // 創造性のバランス（0=固定、1=自由）
        max_tokens: 2000,       // 出力トークン数の上限
        response_format: { type: "json_object" }, // JSON形式で返す指示
      }),
    });

    // Groq APIのエラーハンドリング
    if (!groqResponse.ok) {
      const err = await groqResponse.text();
      console.error("Groq API Error:", groqResponse.status, err);
      return NextResponse.json(
        { error: "AI評価に失敗しました", detail: err },
        { status: 500 }
      );
    }

    const groqData = await groqResponse.json();

    // Groqのレスポンスからコンテンツを取得
    const content = groqData.choices?.[0]?.message?.content;
    if (!content) {
      return NextResponse.json(
        { error: "AIからの回答が空でした" },
        { status: 500 }
      );
    }

    // JSONをパース（不正なレスポンスに備えてtry-catchで囲む）
    let aiResult: AIResult;
    try {
      aiResult = JSON.parse(content);
    } catch {
      console.error("JSON parse error:", content);
      return NextResponse.json(
        { error: "AIの回答をJSONとして解析できませんでした", raw: content },
        { status: 500 }
      );
    }

    return NextResponse.json(aiResult);
  } catch (error) {
    console.error("Well-Being QUEST評価エラー:", error);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
