// ============================================================
// Notion保存 API Route（NOTION_API_KEY対応版）
// 「種別」に「サービス監視」選択肢追加済みのDBに保存する
// 環境変数名をVercelの設定に合わせて NOTION_API_KEY を使用
// ============================================================

import { NextRequest, NextResponse } from 'next/server';

// ============================================================
// Notion記録DBの設定
// URLの https://www.notion.so/32b960a91e2381228dcbdd56375cba03 から取得したID
// ============================================================
const NOTION_DB_ID = '32b960a91e2381228dcbdd56375cba03';

// ============================================================
// POST ハンドラー
// フロントエンドから監視結果を受け取ってNotionに保存する
// ============================================================
export async function POST(request: NextRequest) {
  try {
    // 環境変数からNotionトークンを取得する（Vercelの設定名に合わせる）
    const notionToken = process.env.NOTION_API_KEY;
    if (!notionToken) {
      return NextResponse.json(
        { error: 'Notion トークンが設定されていません（Vercelの環境変数 NOTION_API_KEY を確認してください）' },
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

    // ステータスラベルの日本語変換マップ
    const statusLabel: Record<string, string> = {
      normal:      '正常',
      warning:     '注意',
      incident:    '障害発生',
      maintenance: 'メンテ中',
      unknown:     '確認中',
    };

    // 問題のあるサービスをリストアップする
    const problemServices = result.services
      .filter((s: { status: string }) => s.status !== 'normal')
      .map((s: { name: string; status: string }) =>
        `${s.name}(${statusLabel[s.status] ?? s.status})`
      )
      .join('、') || 'なし';

    // 全体ステータスからレベル/ランクを決める
    const overallRank = result.services.some(
      (s: { status: string }) => s.status === 'incident'
    ) ? '障害発生中'
      : result.services.some(
        (s: { status: string }) => s.status === 'warning'
      ) ? '注意あり'
      : result.services.some(
        (s: { status: string }) => s.status === 'maintenance'
      ) ? 'メンテナンス中'
      : '正常';

    // 各サービスの詳細テキストをまとめる
    const detail = result.services.map((s: {
      name: string;
      status: string;
      officialSummary: string;
      downdetectorSummary: string;
      maintenanceInfo: string;
    }) =>
      `【${s.name}】${statusLabel[s.status] ?? s.status}\n` +
      `公式: ${s.officialSummary}\n` +
      `DD: ${s.downdetectorSummary}\n` +
      `メンテ: ${s.maintenanceInfo}`
    ).join('\n\n');

    // 過去24時間の障害情報をテキスト化する
    const incidents = result.incidents24h?.length > 0
      ? result.incidents24h.map((i: {
          time: string;
          service: string;
          summary: string;
        }) => `${i.time} ${i.service}: ${i.summary}`
        ).join('\n')
      : 'なし';

    // 補足情報を2000文字以内にまとめる（Notionのリッチテキスト制限）
    const supplementInfo = (
      `${result.overallAnalysis}\n\n` +
      `【各サービス詳細】\n${detail}\n\n` +
      `【過去24時間の障害】\n${incidents}`
    ).slice(0, 2000);

    // 記録日時をISO形式に変換する（YYYY/MM/DD HH:MM → YYYY-MM-DD）
    const datePart = result.retrievedAt
      ?.split(' ')[0]
      ?.replace(/\//g, '-')
      ?? new Date().toISOString().split('T')[0];

    // タイトル文字列を生成する
    const title = `📡 サービス監視 — ${result.retrievedAt ?? new Date().toLocaleString('ja-JP')}`;

    // Notion APIでDBにページを作成する
    const notionResponse = await fetch('https://api.notion.com/v1/pages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${notionToken}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        // database_idで保存先DBを指定する
        parent: { database_id: NOTION_DB_ID },
        // ページのアイコンを設定する
        icon: { type: 'emoji', emoji: '📡' },
        properties: {
          // タイトル（title型プロパティ）
          'タイトル': {
            title: [{ type: 'text', text: { content: title } }],
          },
          // 種別セレクト（「サービス監視」は追加済み）
          '種別': {
            select: { name: 'サービス監視' },
          },
          // 記録日時（date型プロパティ）
          '記録日時': {
            date: { start: datePart },
          },
          // レベル/ランク（rich_text型プロパティ）
          'レベル/ランク': {
            rich_text: [{ type: 'text', text: { content: overallRank } }],
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
            rich_text: [{ type: 'text', text: { content: problemServices } }],
          },
          // 補足情報（AI分析＋各サービス詳細）
          '補足情報': {
            rich_text: [{ type: 'text', text: { content: supplementInfo } }],
          },
        },
      }),
    });

    // Notion APIのエラーレスポンスを処理する
    if (!notionResponse.ok) {
      const errorData = await notionResponse.json();
      return NextResponse.json(
        { error: `Notion APIエラー: ${errorData.message ?? JSON.stringify(errorData)}` },
        { status: notionResponse.status }
      );
    }

    const notionData = await notionResponse.json();

    // 保存成功レスポンスをフロントエンドに返す
    return NextResponse.json({
      success: true,
      pageId: notionData.id,
      pageUrl: notionData.url,
    });

  } catch (error) {
    // 予期しないエラーを処理する
    const message = error instanceof Error ? error.message : '不明なエラー';
    return NextResponse.json(
      { error: `サーバーエラー: ${message}` },
      { status: 500 }
    );
  }
}
