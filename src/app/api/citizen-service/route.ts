/**
 * ════════════════════════════════════════════════════════
 *  src/app/api/citizen-service/route.ts
 *  Sprint #12: 住民サービス状況 APIルート
 * ════════════════════════════════════════════════════════
 *
 * ■ エンドポイント
 *   GET  /api/citizen-service  → WellBeingKPI DBから住民サービスデータを取得
 *   POST /api/citizen-service  → WellBeingKPI DBに新しいサービス記録を書き込む
 *
 * ■ 書き込み先 Notion DB
 *   🏛️ WellBeingKPI DB（ID: af1e5c71a95546c3aff0c00ec7068552）
 *
 * ■ 実装方針
 *   @notionhq/client は使わず fetch で直接 Notion REST API を呼ぶ
 *   （他のAPIルートと同じパターン）
 */

import { NextRequest, NextResponse } from 'next/server';

// Notion API の基本URL
const NOTION_API_BASE = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// WellBeingKPI DB のID（Sprint #12で作成）
const WELLBEING_KPI_DB_ID = 'af1e5c71a95546c3aff0c00ec7068552';

// ─── 型定義 ──────────────────────────────────────────────

/** 住民サービス1件のデータ型 */
interface CitizenServiceRecord {
  serviceName: string;          // サービス名
  municipality: string;         // 自治体名
  category: string;             // カテゴリ（福祉/医療/財政/窓口/教育/インフラ）
  status: string;               // 稼働状況（稼働中/メンテナンス中/停止）
  waitingMinutes?: number;      // 窓口待ち時間（分）
  satisfactionScore?: number;   // 満足度スコア（1-5）
  userCount?: number;           // 利用者数
  wellbeingScore?: number;      // Well-Beingスコア（0-100）
  recordDate: string;           // 記録日（YYYY-MM-DD）
  notes?: string;               // 備考
}

/** Notionの共通リクエストヘッダーを返す */
function notionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'Notion-Version': NOTION_VERSION,
  };
}

/** NotionページプロパティからサービスデータをExtract */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractService(page: any): CitizenServiceRecord & { id: string } {
  const props = page.properties;

  const serviceName  = props['サービス名']?.title?.[0]?.plain_text ?? '不明';
  const municipality = props['自治体名']?.rich_text?.[0]?.plain_text ?? '';
  const notes        = props['備考']?.rich_text?.[0]?.plain_text ?? '';
  const category     = props['カテゴリ']?.select?.name ?? '';
  const status       = props['稼働状況']?.select?.name ?? '稼働中';
  const waitingMinutes   = props['窓口待ち時間']?.number ?? undefined;
  const satisfactionScore = props['満足度スコア']?.number ?? undefined;
  const userCount        = props['利用者数']?.number ?? undefined;
  const wellbeingScore   = props['wellbeing_score']?.number ?? undefined;
  const recordDate       = props['記録日']?.date?.start ?? '';

  return {
    id: page.id,
    serviceName, municipality, category, status,
    waitingMinutes, satisfactionScore, userCount,
    wellbeingScore, recordDate, notes,
  };
}

// ─── Well-Beingスコアの自動計算 ──────────────────────────

/**
 * 入力値からWell-Beingスコア（0〜100）を算出する
 *   稼働中=50点ベース
 *   + 満足度スコア×7.5点（最大30点）
 *   + 窓口待ち時間 0分=+20点、30分以上=0点（線形）
 */
function calcWellbeingScore(record: CitizenServiceRecord): number {
  let score = 0;

  if (record.status === '稼働中')          score += 50;
  else if (record.status === 'メンテナンス中') score += 20;

  if (record.satisfactionScore !== undefined) {
    score += (record.satisfactionScore - 1) * 7.5;
  }
  if (record.waitingMinutes !== undefined) {
    score += Math.max(0, 20 - (record.waitingMinutes / 30) * 20);
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── GETハンドラー ────────────────────────────────────────

export async function GET() {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' }, { status: 500 });
  }

  try {
    // Notion DB からサービスデータを取得
    const res = await fetch(`${NOTION_API_BASE}/databases/${WELLBEING_KPI_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(apiKey),
      body: JSON.stringify({
        sorts: [{ property: '記録日', direction: 'descending' }],
        page_size: 100,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API エラー ${res.status}: ${err}`);
    }

    const data = await res.json();
    const services = data.results.map(extractService);

    // カテゴリ別集計
    const categoryStats: Record<string, { count: number; avgScore: number }> = {};
    services.forEach((svc: CitizenServiceRecord) => {
      if (!categoryStats[svc.category]) {
        categoryStats[svc.category] = { count: 0, avgScore: 0 };
      }
      categoryStats[svc.category].count++;
      categoryStats[svc.category].avgScore += svc.wellbeingScore ?? 0;
    });
    Object.keys(categoryStats).forEach(cat => {
      const s = categoryStats[cat];
      s.avgScore = Math.round(s.avgScore / s.count);
    });

    // 稼働中サービス数
    const activeCount = services.filter((s: CitizenServiceRecord) => s.status === '稼働中').length;

    // 平均満足度
    const scoreList = services
      .map((s: CitizenServiceRecord) => s.satisfactionScore)
      .filter((s: number | undefined): s is number => s !== undefined);
    const avgSatisfaction =
      scoreList.length > 0
        ? Math.round((scoreList.reduce((a: number, b: number) => a + b, 0) / scoreList.length) * 10) / 10
        : null;

    return NextResponse.json({
      services,
      summary: { totalCount: services.length, activeCount, avgSatisfaction, categoryStats },
    });
  } catch (error) {
    console.error('[citizen-service GET] エラー:', error);
    return NextResponse.json(
      { error: 'データ取得に失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}

// ─── POSTハンドラー ───────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' }, { status: 500 });
  }

  try {
    const body = await req.json() as CitizenServiceRecord;

    // 入力バリデーション
    if (!body.serviceName || !body.municipality || !body.category || !body.recordDate) {
      return NextResponse.json(
        { error: 'サービス名・自治体名・カテゴリ・記録日は必須です' },
        { status: 400 }
      );
    }

    // Well-Beingスコアを自動計算
    const wellbeingScore = body.wellbeingScore ?? calcWellbeingScore(body);

    // Notionページのプロパティを組み立てる
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const properties: Record<string, any> = {
      'サービス名': { title: [{ text: { content: body.serviceName } }] },
      '自治体名':   { rich_text: [{ text: { content: body.municipality } }] },
      'カテゴリ':   { select: { name: body.category } },
      '稼働状況':   { select: { name: body.status || '稼働中' } },
      'wellbeing_score': { number: wellbeingScore },
      '記録日': { date: { start: body.recordDate } },
    };

    // 任意フィールド（値がある場合のみセット）
    if (body.waitingMinutes !== undefined && body.waitingMinutes !== null) {
      properties['窓口待ち時間'] = { number: Number(body.waitingMinutes) };
    }
    if (body.satisfactionScore !== undefined && body.satisfactionScore !== null) {
      properties['満足度スコア'] = { number: Number(body.satisfactionScore) };
    }
    if (body.userCount !== undefined && body.userCount !== null) {
      properties['利用者数'] = { number: Number(body.userCount) };
    }
    if (body.notes) {
      properties['備考'] = { rich_text: [{ text: { content: body.notes } }] };
    }

    // Notion REST API でページを作成
    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method: 'POST',
      headers: notionHeaders(apiKey),
      body: JSON.stringify({
        parent: { database_id: WELLBEING_KPI_DB_ID },
        properties,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API エラー ${res.status}: ${err}`);
    }

    const page = await res.json();

    return NextResponse.json({
      success: true,
      message: `「${body.serviceName}」をNotionに登録しました`,
      pageId: page.id,
      wellbeingScore,
    });
  } catch (error) {
    console.error('[citizen-service POST] エラー:', error);
    return NextResponse.json(
      { error: 'Notionへの書き込みに失敗しました', details: String(error) },
      { status: 500 }
    );
  }
}
