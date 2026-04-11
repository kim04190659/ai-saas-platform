/**
 * /api/chat - AI チャット API（Sprint #4 更新）
 *
 * Sprint #4 変更点:
 * - リクエストに systemPrompt（任意）を追加受け付け
 * - ScenarioContext で組み立てた文脈をシステムプロンプトとしてAIに渡す
 * - systemPrompt がない場合はデフォルトのシステムプロンプトを使用
 */

import { NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || "",
});

// ═══════════════════════════════════════════════════════════════
//  霧島市専用 AIアドバイザー システムプロンプト
//  SDL五軸・9KPI・NotionオントロジーDBに基づいた市民Well-Being向上提言
// ═══════════════════════════════════════════════════════════════
const DEFAULT_SYSTEM_PROMPT = `あなたは「霧島市AIアドバイザー」です。
霧島市が導入したRunWith Platform（市民Well-Being向上プラットフォーム）の
データを活用し、市の課題解決・施策立案を支援するAIアドバイザーです。

【あなたの役割】
霧島市の職員・担当者が、市民サービスの品質向上・職員のWell-Being改善・
ナレッジの組織共有に取り組めるよう、具体的な行動提案を行います。

【霧島市 RunWith オントロジー（8DB）】
- DB01 Service     : 行政サービス一覧（窓口・デジタル・現場）
- DB02 TouchPoint  : 市民接触記録（チャネル・満足度・SDL軸・解決時間）
- DB03 Incident    : インシデント管理（重大度・根本原因・再発防止）
- DB04 Member      : 職員情報（役職・担当サービス）
- DB05 WellBeing   : 職員コンディション（WBスコア・体調・業務負荷・手応え）
- DB06 KPISnapshot : 9KPI実績記録（E/T/L軸スナップショット）
- DB07 KnowledgeBase: ナレッジ記事（有効性スコア・SDL軸分類）
- DB08 VOEInsight  : 市民の声インサイト（ポジティブ率・SDL五軸スコア）

【9KPI体系（E/T/L軸）】
■ E軸（市民視点 - Experience）
  E1: 市民満足度スコア（/5.0 以上が目標）
  E2: 窓口待ち時間（分）← 低いほど良好
  E3: オンライン完結率（%）

■ T軸（提供者視点 - Team）
  T1: 電話一次解決率（%）
  T2: 新人オンボーディング期間（日）← 短いほど良好
  T3: ナレッジ活用率（%）

■ L軸（責任者視点 - Leadership）
  L1: DX施策ROI（倍）
  L2: 研修完了率（%）
  L3: 職員WellBeingスコア（/10）

【SDL五軸（価値共創フレームワーク）】
- 共創（Co-creation）: 市民と行政が一緒に価値をつくる度合い
- 文脈（Context）    : 個々の状況を把握したサービス提供の度合い
- 資源（Resource）   : 組織の知識・スキル・人材の豊かさ
- 統合（Integration）: サービス間の連携・統合の度合い
- 価値（Value）      : 最終的に市民が得る価値・幸福度

【回答の方針】
1. データや数値を具体的に引用して根拠を示す
2. SDL五軸のどの側面の改善かを明示する
3. 短期（1ヶ月）・中期（3ヶ月）のアクションに分けて提案する
4. 専門用語はかみ砕いて説明し、自治体職員が即実行できる内容にする
5. 回答は日本語で400字以内を目安にする（簡潔・実践的に）
6. データがない場合は「Notionへのデータ蓄積」を促す`;

export async function POST(request: Request) {
  // ANTHROPIC_API_KEY が設定されているか事前チェック
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("Chat API error: ANTHROPIC_API_KEY is not set");
    return NextResponse.json(
      { error: "サーバー設定エラー: APIキーが未設定です" },
      { status: 500 },
    );
  }

  try {
    // Sprint #4: message に加え、systemPrompt（任意）も受け取る
    const body = await request.json();
    const message: string = body.message;
    const systemPrompt: string | undefined = body.systemPrompt;

    // message が空の場合はエラー
    if (!message || typeof message !== "string") {
      return NextResponse.json(
        { error: "メッセージが空です" },
        { status: 400 },
      );
    }

    // systemPrompt が渡された場合はそれを使い、なければデフォルトを使用
    const systemContent = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    const response = await anthropic.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 1024,
      // system パラメータでAIの役割・文脈を設定する
      system: systemContent,
      messages: [
        {
          role: "user",
          content: message,
        },
      ],
    });

    const reply =
      response.content[0].type === "text"
        ? response.content[0].text
        : "Unable to generate response";

    return NextResponse.json({ reply });
  } catch (error) {
    // 詳細なエラー情報をサーバーログに出力する
    const errMsg = error instanceof Error ? error.message : String(error);
    console.error("Chat API error:", errMsg);
    return NextResponse.json(
      { error: `AIへの問い合わせに失敗しました: ${errMsg}` },
      { status: 500 },
    );
  }
}
