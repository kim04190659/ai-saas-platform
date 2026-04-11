/**
 * GET /api/notion/kirishima/kpi
 * 霧島市オントロジー DB06 KPISnapshot からデータ取得
 */
import { NextResponse } from 'next/server';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const KPI_DB_ID = '4006e5d221d9407eaec42b8868c8013f';

async function queryDB(dbId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 10 }),
    cache: 'no-store',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Notion API ${res.status}: ${err}`);
  }
  return res.json();
}

export async function GET() {
  if (!NOTION_API_KEY) {
    return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' }, { status: 500 });
  }
  try {
    const data = await queryDB(KPI_DB_ID);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const kpis = data.results.map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        name:       p['スナップショット名']?.title?.[0]?.text?.content ?? '',
        scope:      p['スコープ']?.select?.name ?? '',
        department: p['対象部署']?.rich_text?.[0]?.text?.content ?? '',
        e1: p['KPI-E1 市民満足度スコア']?.number ?? null,
        e2: p['KPI-E2 窓口待ち時間（分）']?.number ?? null,
        e3: p['KPI-E3 オンライン手続き率（%）']?.number ?? null,
        t1: p['KPI-T1 電話一次解決率（%）']?.number ?? null,
        t2: p['KPI-T2 新任職員戦力化期間（ヶ月）']?.number ?? null,
        t3: p['KPI-T3 ナレッジ活用率（%）']?.number ?? null,
        l1: p['KPI-L1 DX投資対効果']?.number ?? null,
        l2: p['KPI-L2 職員研修受講率（%）']?.number ?? null,
        l3: p['KPI-L3 WB総合スコア（チーム平均）']?.number ?? null,
        comment: p['前期比コメント']?.rich_text?.[0]?.text?.content ?? '',
      };
    });
    return NextResponse.json({ kpis });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
