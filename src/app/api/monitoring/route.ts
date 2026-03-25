// ============================================================
// サービス監視 API Route（JSON解析エラー修正版）
// サーバーサイドでAnthropicのAPIを呼び出す中継エンドポイント
// Web検索でニュース記事が混入してJSONパースが失敗する問題を修正
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
// AIプロンプト生成関数（厳格化版）
// JSONのみを返すよう強く指示する。ニュース記事の混入を防ぐ
// ============================================================
function buildMonitoringPrompt(): string {
  const serviceList = CLOUD_SERVICES.map(s =>
    `- ${s.fullName}（公式: ${s.officialUrl} / Downdetector: ${s.downdetectorUrl}）`
  ).join('\n');

  // 現在の日本時間を取得してプロンプトに埋め込む
  const now = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

  return `
あなたはITサービス監視の専門家です。現在日時: ${now}

以下のクラウドサービスについて、公式ステータスページとDowndetectorを調査し、
結果をJSONで返してください。

【調査対象】
${serviceList}

【重要な制約】
- 回答はJSON形式のみにしてください
- ニュース記事・一般情報・前置き文・説明文は一切不要です
- クラウドサービスの稼働状況のみを調査対象とします
- JSONの外側にテキストを書いてはいけません

【回答形式】必ずこのJSONのみを返す:

{
  "services": [
    {
      "id": "aws",
      "name": "AWS",
      "status": "normal",
      "officialSummary": "全リージョン正常稼働中",
      "downdetectorSummary": "障害報告なし",
      "maintenanceInfo": "予定なし",
      "lastChecked": "14:32"
    },
    {
      "id": "azure",
      "name": "Azure",
      "status": "normal",
      "officialSummary": "正常",
      "downdetectorSummary": "報告なし",
      "maintenanceInfo": "予定なし",
      "lastChecked": "14:32"
    },
    {
      "id": "gcp",
      "name": "Google Cloud",
      "status": "normal",
      "officialSummary": "正常",
      "downdetectorSummary": "報告なし",
      "maintenanceInfo": "予定なし",
      "lastChecked": "14:32"
    },
    {
      "id": "salesforce",
      "name": "Salesforce",
      "status": "normal",
      "officialSummary": "正常",
      "downdetectorSummary": "報告なし",
      "maintenanceInfo": "予定なし",
      "lastChecked": "14:32"
    }
  ],
  "overallAnalysis": "全サービス正常稼働中",
  "incidents24h": [],
  "retrievedAt": "2026/03/25 14:32"
}

上記の形式で、実際の調査結果に基づいて値を埋めて返してください。
statusは normal/warning/incident/maintenance/unknown のいずれかのみ使用可。
`;
}

// ============================================================
// JSONを文字列から安全に抽出する関数
// コードブロック・余分なテキストが混入しても対応できるように
// ============================================================
function extractJSON(text: string): string | null {
  // パターン1: ```json ... ``` 形式のコードブロックを探す
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1].trim();
  }

  // パターン2: { から始まる最初のJSONオブジェクトを探す
  // ネストされた {} を正しく数えて完全なJSONを抽出する
  const startIndex = text.indexOf('{');
  if (startIndex === -1) return null;

  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIndex; i < text.length; i++) {
    const char = text[i];

    // エスケープ文字の処理
    if (escape) {
      escape = false;
      continue;
    }
    if (char === '\\' && inString) {
      escape = true;
      continue;
    }

    // 文字列内外の判定
    if (char === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    // 括弧の深さをカウントする
    if (char === '{') depth++;
    if (char === '}') {
      depth--;
      // 深さが0になったら完全なJSONオブジェクトが終わった
      if (depth === 0) {
        return text.substring(startIndex, i + 1);
      }
    }
  }

  return null;
}

// ============================================================
// POST ハンドラー
// ============================================================
export async function POST() {
  try {
    // 環境変数からAPIキーを取得する（サーバーサイドなので安全）
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'APIキーが設定されていません（Vercelの環境変数を確認してください）' },
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

    // レスポンスからテキスト部分をすべて結合する
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

    // 堅牢なJSON抽出関数でJSONを取り出す
    const jsonStr = extractJSON(textContent);
    if (!jsonStr) {
      return NextResponse.json(
        { error: 'JSON形式の応答を取得できませんでした', raw: textContent.slice(0, 200) },
        { status: 500 }
      );
    }

    // JSONパースを試みる
    let parsed;
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseError) {
      return NextResponse.json(
        {
          error: `JSONパースエラー: ${parseError instanceof Error ? parseError.message : '不明'}`,
          raw: jsonStr.slice(0, 200),
        },
        { status: 500 }
      );
    }

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
