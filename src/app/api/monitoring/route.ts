// ============================================================
// サービス監視 API Route
// サーバーサイドでAnthropicのAPIを呼び出す中継エンドポイント
// フロントエンドから直接APIを叩くとCORSエラーになるためこの経由が必要
// ============================================================

import { NextResponse } from 'next/server';

// ============================================================
// 監視対象クラウドサービスの定義
// ============================================================
const CLOUD_SERVICES = [
  {
    id: 'aws',
    fullName: 'Amazon Web Services',
    officialUrl: 'status.aws.amazon.com',
    downdetectorUrl: 'downdetector.jp/status/amazon-web-services',
  },
  {
    id: 'azure',
    fullName: 'Microsoft Azure',
    officialUrl: 'status.azure.com',
    downdetectorUrl: 'downdetector.jp/status/microsoft-azure',
  },
  {
    id: 'gcp',
    fullName: 'Google Cloud Platform',
    officialUrl: 'status.cloud.google.com',
    downdetectorUrl: 'downdetector.jp/status/google-cloud',
  },
  {
    id: 'salesforce',
    fullName: 'Salesforce Platform',
    officialUrl: 'status.salesforce.com',
    downdetectorUrl: 'downdetector.jp/status/salesforce',
  },
];

// ============================================================
// AIプロンプト生成関数
// ============================================================
function buildMonitoringPrompt(): string {
  const serviceList = CLOUD_SERVICES.map(s =>
    `- ${s.fullName}（公式: ${s.officialUrl} / Downdetector: ${s.downdetectorUrl}）`
  ).join('\n');

  return `
あなたはITサービス監視の専門家です。
以下のクラウドサービスについて、現在の稼働状況と過去24時間の障害情報を調査してください。

【調査対象サービス】
${serviceList}

【調査する情報】
1. 各サービスの公式ステータスページの現在の状態
2. Downdetector（downdetector.jp）での各サービスの障害報告状況
3. 予定メンテナンス情報
4. 過去24時間に発生した障害・インシデント

【回答形式】
必ず以下のJSON形式のみで回答してください。前置きや説明文は不要です。

{
  "services": [
    {
      "id": "サービスID（aws/azure/gcp/salesforce）",
      "name": "サービス表示名",
      "status": "normal または warning または incident または maintenance または unknown",
      "officialSummary": "公式ステータスページの状況（50文字以内）",
      "downdetectorSummary": "Downdetectorの障害報告状況（50文字以内）",
      "maintenanceInfo": "予定メンテナンス情報。なければ「予定なし」",
      "lastChecked": "現在時刻（HH:MM形式）"
    }
  ],
  "overallAnalysis": "全体的な状況の分析コメント（100文字以内）",
  "incidents24h": [
    {
      "time": "発生時刻（HH:MM形式）",
      "service": "サービス名",
      "summary": "障害概要（40文字以内）",
      "status": "incident または warning または maintenance"
    }
  ],
  "retrievedAt": "現在の日本時間（YYYY/MM/DD HH:MM形式）"
}

incidents24hは過去24時間に障害・メンテナンスがあった場合のみ含める。何もなければ空配列にする。
statusの値は必ず normal/warning/incident/maintenance/unknown のいずれかにする。
`;
}

// ============================================================
// POST ハンドラー
// フロントエンドからのリクエストを受け取ってAnthropicに転送する
// ============================================================
export async function POST() {
  try {
    // 環境変数からAPIキーを取得する（サーバーサイドなので安全）
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが設定されていません' },
        { status: 500 }
      );
    }

    // AnthropicのAPIをサーバーサイドから呼び出す
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        // Web検索ツールのベータ機能を有効化する
        'anthropic-beta': 'web-search-2025-03-05',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        tools: [
          {
            type: 'web_search_20250305',
            name: 'web_search',
          },
        ],
        messages: [
          {
            role: 'user',
            content: buildMonitoringPrompt(),
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `Anthropic APIエラー: ${response.status} - ${errorText}` },
        { status: response.status }
      );
    }

    const data = await response.json();

    // レスポンスからテキスト部分を抽出する
    const textContent = data.content
      ?.filter((item: { type: string }) => item.type === 'text')
      ?.map((item: { text: string }) => item.text)
      ?.join('') ?? '';

    if (!textContent) {
      return NextResponse.json(
        { error: 'AIからの応答が空でした' },
        { status: 500 }
      );
    }

    // JSON部分を抽出してパースする
    const jsonMatch = textContent.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json(
        { error: 'JSON形式の応答を取得できませんでした', raw: textContent },
        { status: 500 }
      );
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // 正常なレスポンスをフロントエンドに返す
    return NextResponse.json(parsed);

  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `サーバーエラー: ${message}` },
      { status: 500 }
    );
  }
}
