// ============================================================
// Notion保存 API Route
// サービス監視結果をNotionの記録DBに保存するエンドポイント
// Notion MCP経由ではなくNotion APIを直接呼び出す
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Notionの記録DB設定
// ============================================================
// 📊 RunWithプラットフォーム 記録DB のdata_source_id
const NOTION_DB_ID = '32b960a9-1e23-810f-b27f-000b2a3ac6dd';

// ============================================================
// POST ハンドラー
// ============================================================
export async function POST(request: NextRequest) {
  try {
    const notionToken = process.env.NOTION_TOKEN;
    if (!notionToken) {
      return NextResponse.json(
        { error: 'Notion トークンが設定されていません' },
        { status: 500 }
      );
    }

    // フロントエンドから監視結果を受け取る
    const body = await request.json();
    const { result } = body;

    if (!result) {
      return NextResponse.json(
        { error: '保存するデータがありません' },
        { status: 400 }
      );
    }

    // 正常サービス数を計算する
    const normalCount = result.services.filter(
      (s: { status: string }) => s.status === 'normal'
    ).length;
    const totalCount = result.services.length;

    // 問題のあるサービスをリストアップする
    const statusLabel: Record<string, string> = {
      normal: '正常', warning: '注意', incident: '障害発生',
      maintenance: 'メンテ中', unknown: '確認中',
    };
    const problemServices = result.services
      .filter((s: { status: string }) => s.status !== 'normal')
      .map((s: { name: string; status: string }) =>
        `${s.name}(${statusLabel[s.status] ?? s.status})`
      )
      .join('、') || 'なし';

    // 全体ステータスからレベル/ランクを決める
    const overallStatus = result.services.some((s: { status: string }) => s.status === 'incident')
      ? '障害発生中'
      : result.services.some((s: { status: string }) => s.status === 'warning')
      ? '注意あり'
      : result.services.some((s: { status: string }) => s.status === 'maintenance')
      ? 'メンテナンス中'
      : '正常';

    // 補足情報として各サービス詳細をまとめる
    const detail = result.services.map((s: {
      name: string; status: string;
      officialSummary: string; downdetectorSummary: string; maintenanceInfo: string;
    }) =>
      `【${s.name}】${statusLabel[s.status] ?? s.status}\n公式: ${s.officialSummary}\nDD: ${s.downdetectorSummary}\nメンテ: ${s.maintenanceInfo}`
    ).join('\n\n');

    const incidents = result.incidents24h.length > 0
      ? result.incidents24h.map((i: { time: string; service: string; summary: string }) =>
          `${i.time} ${i.service}: ${i.summary}`
        ).join('\n')
      : 'なし';

    const supplementInfo =
      `${result.overallAnalysis}\n\n【各サービス詳細】\n${detail}\n\n【過去24時間の障害】\n${incidents}`;

    // 記録日時をISO形式に変換する（YYYY/MM/DD HH:MM → YYYY-MM-DD）
    const datePart = result.retrievedAt?.split(' ')[0]?.replace(/\//g, '-') ?? new Date().toISOString().split('T')[0];

    // Notion APIにページ作成リクエストを送る
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        parent: { database_id: NOTION_DB_ID },
        properties: {
          // タイトルフィールド
          'タイトル': {
            title: [{ text: { content: `📡 サービス監視 — ${result.retrievedAt}` } }],
          },
          // 種別フィールド（選択肢）
          '種別': {
            select: { name: 'サービス監視' },
          },
          // 記録日時フィールド
          '記録日時': {
            date: { start: datePart },
          },
          // レベル/ランクフィールド
          'レベル/ランク': {
            rich_text: [{ text: { content: overallStatus } }],
          },
          // スコア（正常サービス数）
          'スコア': {
            number: normalCount,
          },
          // 最大スコア（監視対象数）
          '最大スコア': {
            number: totalCount,
          },
          // 弱点・改善領域（問題サービス一覧）
          '弱点・改善領域': {
            rich_text: [{ text: { content: problemServices } }],
          },
          // 補足情報（AI分析＋詳細）
          '補足情報': {
            rich_text: [{ text: { content: supplementInfo.slice(0, 2000) } }],
          },
        },
      }),
    });

    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      return NextResponse.json(
        { error: `Notion APIエラー: ${JSON.stringify(errorData)}` },
        { status: notionResponse.status }
      );
    }

    const notionData = await notionResponse.json();

    // 保存成功を返す
    return NextResponse.json({
      success: true,
      pageId: notionData.id,
      pageUrl: notionData.url,
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `サーバーエラー: ${message}` },
      { status: 500 }
    );
  }
}
