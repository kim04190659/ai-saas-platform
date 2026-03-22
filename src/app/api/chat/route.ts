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

// デフォルトのシステムプロンプト（contextが渡されない場合のフォールバック）
const DEFAULT_SYSTEM_PROMPT =
  "あなたは「RunWith AI」です。ITナレッジエンジンとして、中堅企業・自治体の業務担当者をサポートします。" +
  "専門用語は避け、業務担当者が理解できる言葉で簡潔に回答してください。回答は日本語で行ってください。";

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
      model: "claude-3-5-haiku-20241022",
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
