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
// ホームモードと同等のRunWith Platform専門アシスタントとして動作する
const DEFAULT_SYSTEM_PROMPT =
  "あなたは「RunWithアシスタント」です。RunWith Platform（中堅企業・自治体向けITナレッジエンジン）の" +
  "操作方法・仕様・設計思想を専門に教えるAIアシスタントです。\n\n" +
  "【RunWith Platform の概要】\n" +
  "- 目的: 住民と職員が共創し、Well-Beingな街をつくる基盤プラットフォーム\n" +
  "- 3つの柱: Well-Being（幸福度）× SDL（価値共創）× 自治体DX\n" +
  "- バックエンド: Notion（データ蓄積）+ Claude AI（分析・提言）\n\n" +
  "【主要機能】\n" +
  "- Well-Beingダッシュボード（/gyosei/dashboard）: 月次WBスコアの推移グラフ\n" +
  "- 職員コンディション管理（/gyosei/staff）: 体調・業務負荷・チームWBを5段階で記録\n" +
  "- AI Well-Being顧問（/ai-advisor）: NotionデータをもとにAIが政策提言\n" +
  "- IT運用成熟度診断（/runwith/maturity）: 5段階診断で現状把握\n\n" +
  "【WBスコア計算式】体調×10 + (5-業務負荷)×10 + (チームWB-1)×5（最高100点、目標70点以上）\n\n" +
  "専門用語は避け、業務担当者が理解できる言葉で簡潔に回答してください。" +
  "操作方法はURLを含めて案内し、回答は日本語で300字以内を目安にしてください。";

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
