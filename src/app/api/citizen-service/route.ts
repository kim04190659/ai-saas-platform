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
import { getMunicipalityById } from '@/config/municipalities';

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

// ─── 自治体別サンプルデータ（Notion が空のときのフォールバック用）────

/** サービスサンプル1件の型（id は動的生成） */
type SampleService = Omit<CitizenServiceRecord, 'wellbeingScore'> & { wellbeingScore: number };

/** 屋久島町の住民サービスサンプル */
const YAKUSHIMA_SAMPLE_SERVICES: SampleService[] = [
  { serviceName: '住民票・証明書交付窓口', municipality: '屋久島町', category: '窓口',   status: '稼働中', waitingMinutes: 20, satisfactionScore: 3.8, userCount: 280,  wellbeingScore: 72, recordDate: '2026-04-01', notes: '窓口は週3日（月水金）対応' },
  { serviceName: '高齢者介護相談窓口',     municipality: '屋久島町', category: '福祉',   status: '稼働中', waitingMinutes: 10, satisfactionScore: 4.2, userCount: 95,   wellbeingScore: 80, recordDate: '2026-04-01', notes: '島内唯一の介護相談窓口' },
  { serviceName: '国民健康保険窓口',       municipality: '屋久島町', category: '医療',   status: '稼働中', waitingMinutes: 15, satisfactionScore: 4.0, userCount: 120,  wellbeingScore: 76, recordDate: '2026-04-01' },
  { serviceName: '観光・移住相談コーナー', municipality: '屋久島町', category: '窓口',   status: '稼働中', waitingMinutes: 5,  satisfactionScore: 4.5, userCount: 65,   wellbeingScore: 85, recordDate: '2026-04-01', notes: '移住希望者の問い合わせ増加中' },
  { serviceName: '小中学校就学支援',       municipality: '屋久島町', category: '教育',   status: '稼働中', waitingMinutes: 0,  satisfactionScore: 4.3, userCount: 310,  wellbeingScore: 82, recordDate: '2026-04-01' },
  { serviceName: '上下水道サービス',       municipality: '屋久島町', category: 'インフラ', status: '稼働中', waitingMinutes: 0,  satisfactionScore: 3.5, userCount: 4800, wellbeingScore: 68, recordDate: '2026-04-01', notes: '島内全域の水道普及率98%' },
  { serviceName: '税務申告・納付窓口',     municipality: '屋久島町', category: '財政',   status: '稼働中', waitingMinutes: 25, satisfactionScore: 3.5, userCount: 180,  wellbeingScore: 63, recordDate: '2026-04-01' },
];

/** 霧島市の住民サービスサンプル */
const KIRISHIMA_SAMPLE_SERVICES: SampleService[] = [
  { serviceName: '住民票・証明書交付',         municipality: '霧島市', category: '窓口',   status: '稼働中', waitingMinutes: 18, satisfactionScore: 3.9, userCount: 1200,  wellbeingScore: 73, recordDate: '2026-04-01' },
  { serviceName: '高齢者福祉サービス',         municipality: '霧島市', category: '福祉',   status: '稼働中', waitingMinutes: 8,  satisfactionScore: 4.3, userCount: 420,   wellbeingScore: 81, recordDate: '2026-04-01', notes: '在宅介護支援センター連携' },
  { serviceName: '国保・後期高齢者医療窓口',   municipality: '霧島市', category: '医療',   status: '稼働中', waitingMinutes: 12, satisfactionScore: 4.1, userCount: 580,   wellbeingScore: 78, recordDate: '2026-04-01' },
  { serviceName: '保育所・こども園',           municipality: '霧島市', category: '教育',   status: '稼働中', waitingMinutes: 0,  satisfactionScore: 4.4, userCount: 1350,  wellbeingScore: 83, recordDate: '2026-04-01', notes: '待機児童ゼロを達成' },
  { serviceName: '水道サービス',               municipality: '霧島市', category: 'インフラ', status: '稼働中', waitingMinutes: 0,  satisfactionScore: 4.0, userCount: 18000, wellbeingScore: 76, recordDate: '2026-04-01' },
  { serviceName: '市税申告・納付窓口',         municipality: '霧島市', category: '財政',   status: '稼働中', waitingMinutes: 22, satisfactionScore: 3.6, userCount: 850,   wellbeingScore: 65, recordDate: '2026-04-01' },
  { serviceName: '霧島神宮・温泉地観光案内',   municipality: '霧島市', category: 'インフラ', status: '稼働中', waitingMinutes: 3,  satisfactionScore: 4.6, userCount: 2400,  wellbeingScore: 88, recordDate: '2026-04-01', notes: '年間来訪者250万人超' },
];

/** 自治体IDに応じたサンプルデータを返す */
function getSampleServices(municipalityId: string): SampleService[] {
  const map: Record<string, SampleService[]> = {
    yakushima: YAKUSHIMA_SAMPLE_SERVICES,
    kirishima: KIRISHIMA_SAMPLE_SERVICES,
  };
  return map[municipalityId] ?? YAKUSHIMA_SAMPLE_SERVICES;
}

/** サービス配列からサマリーを集計する（サンプル・Notionデータ共通） */
function buildServiceSummary(services: (CitizenServiceRecord & { wellbeingScore?: number })[]) {
  const categoryStats: Record<string, { count: number; avgScore: number }> = {};
  services.forEach(svc => {
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
  const activeCount = services.filter(s => s.status === '稼働中').length;
  const scoreList = services
    .map(s => s.satisfactionScore)
    .filter((s): s is number => s !== undefined);
  const avgSatisfaction =
    scoreList.length > 0
      ? Math.round((scoreList.reduce((a, b) => a + b, 0) / scoreList.length) * 10) / 10
      : null;
  return { totalCount: services.length, activeCount, avgSatisfaction, categoryStats };
}

// ─── GETハンドラー ────────────────────────────────────────

// Sprint #35: NextRequest を受け取り municipalityId クエリを処理するように変更
export async function GET(req: NextRequest) {
  const apiKey = process.env.NOTION_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' }, { status: 500 });
  }

  // ── Sprint #35: クエリパラメータから自治体IDを取得 ──
  const { searchParams } = new URL(req.url);
  const municipalityId   = searchParams.get('municipalityId') ?? 'kirishima';
  const municipality     = getMunicipalityById(municipalityId);

  try {
    // 自治体名でフィルタリングしてサービスデータを取得（マルチテナント対応）
    const res = await fetch(`${NOTION_API_BASE}/databases/${WELLBEING_KPI_DB_ID}/query`, {
      method: 'POST',
      headers: notionHeaders(apiKey),
      body: JSON.stringify({
        filter: {
          property: '自治体名',
          rich_text: { contains: municipality.shortName },
        },
        sorts: [{ property: '記録日', direction: 'descending' }],
        page_size: 100,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Notion API エラー ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Sprint #37: Notion が空の場合は自治体別サンプルデータにフォールバック
    if (!data.results || data.results.length === 0) {
      const sampleServices = getSampleServices(municipalityId);
      return NextResponse.json({
        services: sampleServices.map((s, i) => ({ ...s, id: `sample-${i}` })),
        summary:  buildServiceSummary(sampleServices),
        source:   'sample',  // サンプルデータであることをフロントに伝える
      });
    }

    const services = data.results.map(extractService);
    return NextResponse.json({
      services,
      summary: buildServiceSummary(services),
      source:  'notion',
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
