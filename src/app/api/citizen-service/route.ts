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
 *   フィールド: サービス名/自治体名/カテゴリ/稼働状況/窓口待ち時間/満足度スコア/利用者数/wellbeing_score/記録日/備考
 */

import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@notionhq/client';

// Notionクライアントの初期化
const notion = new Client({ auth: process.env.NOTION_TOKEN });

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

/** NotionページのプロパティからサービスデータをExtract */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function extractService(page: any): CitizenServiceRecord & { id: string } {
  const props = page.properties;

  // タイトル型プロパティ（サービス名）
  const serviceName =
    props['サービス名']?.title?.[0]?.plain_text ?? '不明';

  // リッチテキスト型プロパティ（自治体名、備考）
  const municipality =
    props['自治体名']?.rich_text?.[0]?.plain_text ?? '';
  const notes =
    props['備考']?.rich_text?.[0]?.plain_text ?? '';

  // セレクト型プロパティ（カテゴリ、稼働状況）
  const category = props['カテゴリ']?.select?.name ?? '';
  const status = props['稼働状況']?.select?.name ?? '稼働中';

  // 数値型プロパティ
  const waitingMinutes = props['窓口待ち時間']?.number ?? undefined;
  const satisfactionScore = props['満足度スコア']?.number ?? undefined;
  const userCount = props['利用者数']?.number ?? undefined;
  const wellbeingScore = props['wellbeing_score']?.number ?? undefined;

  // 日付型プロパティ
  const recordDate = props['記録日']?.date?.start ?? '';

  return {
    id: page.id,
    serviceName,
    municipality,
    category,
    status,
    waitingMinutes,
    satisfactionScore,
    userCount,
    wellbeingScore,
    recordDate,
    notes,
  };
}

// ─── Well-Beingスコアの自動計算 ──────────────────────────

/**
 * 入力値からWell-Beingスコア（0〜100）を算出する
 * 計算式:
 *   稼働中=50点ベース + 満足度スコア×10点 + 窓口待ち0分なら+20点（分が増えると減少）
 */
function calcWellbeingScore(record: CitizenServiceRecord): number {
  let score = 0;

  // 稼働状況のベーススコア
  if (record.status === '稼働中') score += 50;
  else if (record.status === 'メンテナンス中') score += 20;
  else score += 0; // 停止

  // 満足度スコア（1〜5 → 0〜30点）
  if (record.satisfactionScore) {
    score += (record.satisfactionScore - 1) * 7.5; // 最大30点
  }

  // 窓口待ち時間（0分=+20点、30分以上=0点、線形減少）
  if (record.waitingMinutes !== undefined) {
    const waitScore = Math.max(0, 20 - (record.waitingMinutes / 30) * 20);
    score += waitScore;
  }

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── GETハンドラー ────────────────────────────────────────

export async function GET() {
  try {
    // Notion DBからサービスデータを全件取得
    const response = await notion.databases.query({
      database_id: WELLBEING_KPI_DB_ID,
      sorts: [
        {
          property: '記録日',
          direction: 'descending',
        },
      ],
      page_size: 100,
    });

    // データを整形
    const services = response.results.map(extractService);

    // カテゴリ別集計
    const categoryStats: Record<string, { count: number; avgScore: number }> = {};
    services.forEach((svc) => {
      if (!categoryStats[svc.category]) {
        categoryStats[svc.category] = { count: 0, avgScore: 0 };
      }
      categoryStats[svc.category].count++;
      categoryStats[svc.category].avgScore +=
        svc.wellbeingScore ?? 0;
    });
    // 平均スコアの計算
    Object.keys(categoryStats).forEach((cat) => {
      const stat = categoryStats[cat];
      stat.avgScore = Math.round(stat.avgScore / stat.count);
    });

    // 稼働中サービス数
    const activeCount = services.filter((s) => s.status === '稼働中').length;

    // 全体の平均満足度
    const scoreList = services
      .map((s) => s.satisfactionScore)
      .filter((s): s is number => s !== undefined);
    const avgSatisfaction =
      scoreList.length > 0
        ? Math.round((scoreList.reduce((a, b) => a + b, 0) / scoreList.length) * 10) / 10
        : null;

    return NextResponse.json({
      services,
      summary: {
        totalCount: services.length,
        activeCount,
        avgSatisfaction,
        categoryStats,
      },
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
  try {
    const body = await req.json() as CitizenServiceRecord;

    // 入力バリデーション
    if (!body.serviceName || !body.municipality || !body.category || !body.recordDate) {
      return NextResponse.json(
        { error: 'サービス名・自治体名・カテゴリ・記録日は必須です' },
        { status: 400 }
      );
    }

    // Well-Beingスコアを自動計算（入力がない場合）
    const wellbeingScore = body.wellbeingScore ?? calcWellbeingScore(body);

    // Notion DBに書き込み
    const page = await notion.pages.create({
      parent: { database_id: WELLBEING_KPI_DB_ID },
      properties: {
        // TITLE型（サービス名）
        'サービス名': {
          title: [{ text: { content: body.serviceName } }],
        },
        // RICH_TEXT型（自治体名）
        '自治体名': {
          rich_text: [{ text: { content: body.municipality } }],
        },
        // SELECT型（カテゴリ）
        'カテゴリ': {
          select: { name: body.category },
        },
        // SELECT型（稼働状況）
        '稼働状況': {
          select: { name: body.status || '稼働中' },
        },
        // NUMBER型（各数値）
        ...(body.waitingMinutes !== undefined && {
          '窓口待ち時間': { number: body.waitingMinutes },
        }),
        ...(body.satisfactionScore !== undefined && {
          '満足度スコア': { number: body.satisfactionScore },
        }),
        ...(body.userCount !== undefined && {
          '利用者数': { number: body.userCount },
        }),
        'wellbeing_score': { number: wellbeingScore },
        // DATE型（記録日）
        '記録日': {
          date: { start: body.recordDate },
        },
        // RICH_TEXT型（備考）
        ...(body.notes && {
          '備考': {
            rich_text: [{ text: { content: body.notes } }],
          },
        }),
      },
    });

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
