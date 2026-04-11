/**
 * GET /api/notion/kirishima/knowledge
 * 霧島市オントロジー DB07 KnowledgeBase + DB08 VOEInsight + DB03 Incident からデータ取得
 */
import { NextResponse } from 'next/server';

const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const KB_DB_ID  = '21fc0040206e45b8a59e1376333ea8a6';
const VOE_DB_ID = 'f5a7cae8143343acb08b33577392dfa7';
const INC_DB_ID = 'e0c52ccc96414bc682dc97c79afed795';

async function queryDB(dbId: string) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ page_size: 20 }),
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
    const [kbData, voeData, incData] = await Promise.all([
      queryDB(KB_DB_ID),
      queryDB(VOE_DB_ID),
      queryDB(INC_DB_ID),
    ]);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const knowledge = kbData.results.map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        title:       p['タイトル']?.title?.[0]?.text?.content ?? '',
        category:    p['カテゴリ']?.select?.name ?? '',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        sdlAxis:     p['SDL軸']?.multi_select?.map((s: any) => s.name) ?? [],
        scope:       p['公開範囲']?.select?.name ?? '',
        effectiveness: p['有効性スコア']?.number ?? null,
        updated:     p['最終更新']?.date?.start ?? '',
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const voe = voeData.results.map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        title:        p['タイトル']?.title?.[0]?.text?.content ?? '',
        channel:      p['収集チャネル']?.select?.name ?? '',
        count:        p['件数']?.number ?? null,
        positiveRate: p['ポジティブ比率']?.number ?? null,
        sdlKyoso:     p['SDL共創スコア']?.number ?? null,
        sdlBunmyaku:  p['SDL文脈スコア']?.number ?? null,
        sdlShigen:    p['SDL資源スコア']?.number ?? null,
        sdlTogo:      p['SDL統合スコア']?.number ?? null,
        sdlKachi:     p['SDL価値スコア']?.number ?? null,
        themes:       p['主要テーマ（上位3）']?.rich_text?.[0]?.text?.content ?? '',
        comment:      p['前期比コメント']?.rich_text?.[0]?.text?.content ?? '',
      };
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const incidents = incData.results.map((page: any) => {
      const p = page.properties;
      return {
        id: page.id,
        name:       p['インシデント名']?.title?.[0]?.text?.content ?? '',
        severity:   p['重大度']?.select?.name ?? '',
        rootCause:  p['根本原因カテゴリ']?.select?.name ?? '',
        impact:     p['影響人数']?.number ?? null,
        knowledged: p['ナレッジ化']?.checkbox ?? false,
        prevention: p['再発防止策']?.rich_text?.[0]?.text?.content ?? '',
        date:       p['検知日時']?.date?.start ?? '',
      };
    });

    return NextResponse.json({ knowledge, voe, incidents });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
