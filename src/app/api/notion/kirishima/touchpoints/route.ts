/**
 * GET /api/notion/kirishima/touchpoints
 * 霧島市オントロジー DB02 TouchPoint からデータ取得
 */
import { NextResponse } from 'next/server';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const TP_DB_ID = '808fe668f5a242dd864df6ecc53f9b5c';

async function queryDB(dbId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: 50,
      sorts: [{ property: '発生日時', direction: 'descending' }],
    }),
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
    const data = await queryDB(TP_DB_ID);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const touchpoints = data.results.map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        name:        p['Name']?.title?.[0]?.text?.content ?? '',
        channel:     p['チャネル']?.select?.name ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        userType:    p['ユーザー属性（部門）']?.multi_select?.map((s: any) => s.name) ?? [],
        category:    p['内容カテゴリ']?.select?.name ?? '',
        status:      p['解決ステータス']?.select?.name ?? '',
        satisfaction: p['市民満足度']?.number ?? null,
        resolveTime:  p['解決時間（分）']?.number ?? null,
        sdlAxis:     p['SDL軸分類']?.select?.name ?? '',
        date:        p['発生日時']?.date?.start ?? '',
        analysis:    p['AIによるSDL分析']?.rich_text?.[0]?.text?.content ?? '',
      };
    });
    return NextResponse.json({ touchpoints });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
