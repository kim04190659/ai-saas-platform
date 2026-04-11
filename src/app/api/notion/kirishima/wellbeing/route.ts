/**
 * GET /api/notion/kirishima/wellbeing
 * 霧島市オントロジー DB05 WellBeing からデータ取得
 */
import { NextResponse } from 'next/server';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const WB_DB_ID = '903945fd11f648d0a8aade9fe32fd49f';

async function queryDB(dbId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 30 }),
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
    const data = await queryDB(WB_DB_ID);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const members = data.results.map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        name:             p['記録名']?.title?.[0]?.text?.content ?? '',
        wbScore:          p['チームWBスコア']?.number ?? null,
        healthScore:      p['体調スコア']?.number ?? null,
        workSatisfaction: p['仕事の手応え']?.number ?? null,
        workload:         p['業務負荷スコア']?.number ?? null,
        comment:          p['今月の一言']?.rich_text?.[0]?.text?.content ?? '',
        month:            p['記録月']?.date?.start ?? '',
      };
    });
    return NextResponse.json({ members });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
