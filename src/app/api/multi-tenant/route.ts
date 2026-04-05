/**
 * ════════════════════════════════════════════════════════
 *  src/app/api/multi-tenant/route.ts
 *  Sprint #23: 横展開設定（マルチ自治体対応基盤）API
 * ════════════════════════════════════════════════════════
 *
 * 概要:
 *   RunWith Platformを複数の自治体で運用するためのテナント管理API。
 *   比較分析マスタDBから展開済み・候補自治体の一覧を取得し、
 *   アクティブテナントの設定・切り替えを管理する。
 *
 * GET  /api/multi-tenant
 *   → 全自治体一覧 + テナント状況サマリーを返す
 *
 * POST /api/multi-tenant
 *   → 新自治体のテナント登録、またはアクティブテナント切り替え
 */

import { NextRequest, NextResponse } from 'next/server';

// ─── Notion 設定 ──────────────────────────────────────────
const NOTION_API_KEY = process.env.NOTION_API_KEY!;
const NOTION_VERSION = '2022-06-28';

// 比較分析マスタDB（Sprint #18 で作成済み）
const COMPARE_DB_ID = 'f209f175d6f44efb9dee02c59d893aed';

// 自治体プロフィールDB（自治体固有設定の格納先）
const PROFILE_DB_ID = 'b6c5b6f0c3414b8d85ff2a54c14b1d6a';

// ─── 型定義 ──────────────────────────────────────────────

/** 自治体テナント情報 */
type MunicipalityTenant = {
  id: string;
  name: string;
  regionType: string;           // 地域タイプ（離島/山間部/沿岸部 等）
  population: number | null;    // 人口
  runWithStatus: string;        // RunWith導入状況
  wellBeingScore: number | null; // Well-Beingスコア
  dxScore: number | null;       // DX成熟度スコア
  mainIndustries: string[];     // 主要産業
  tenantStatus: 'active' | 'candidate' | 'evaluating' | 'none';
  onboardingSteps: OnboardingStep[];
};

/** オンボーディングチェックリストの1ステップ */
type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
};

/** テナントサマリー */
type TenantSummary = {
  totalMunicipalities: number;    // 総自治体数
  activeTenants: number;          // 導入済みテナント数
  evaluatingTenants: number;      // 評価中テナント数
  candidateTenants: number;       // 候補自治体数
  avgWellBeingActive: number;     // 導入済み平均WBスコア
  regionTypes: Record<string, number>; // 地域タイプ別件数
};

// ─── ヘルパー関数 ─────────────────────────────────────────

/**
 * Notion DB から指定ページ数のレコードを取得する汎用関数
 */
async function fetchNotionDB(
  dbId: string,
  pageSize = 100,
  filter?: object,
  sorts?: object[]
): Promise<Record<string, unknown>[]> {
  const body: Record<string, unknown> = { page_size: pageSize };
  if (filter) body.filter = filter;
  if (sorts) body.sorts = sorts;

  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_API_KEY}`,
      'Notion-Version': NOTION_VERSION,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    console.error(`Notion DB fetch error (${dbId}):`, await res.text());
    return [];
  }

  const data = await res.json();
  return data.results ?? [];
}

/**
 * Notion プロパティの安全な取得ヘルパー
 */
function getProp(props: Record<string, unknown>, key: string): unknown {
  return props[key];
}
function getTitle(props: Record<string, unknown>, key: string): string {
  const p = getProp(props, key) as { title?: Array<{ plain_text?: string }> };
  return p?.title?.[0]?.plain_text ?? '';
}
function getSelect(props: Record<string, unknown>, key: string): string {
  const p = getProp(props, key) as { select?: { name?: string } };
  return p?.select?.name ?? '';
}
function getNumber(props: Record<string, unknown>, key: string): number | null {
  const p = getProp(props, key) as { number?: number };
  return p?.number ?? null;
}
function getMultiSelect(props: Record<string, unknown>, key: string): string[] {
  const p = getProp(props, key) as { multi_select?: Array<{ name?: string }> };
  return p?.multi_select?.map((x) => x.name ?? '') ?? [];
}

/**
 * RunWith導入状況からテナントステータスに変換
 */
function toTenantStatus(
  runWithStatus: string
): 'active' | 'candidate' | 'evaluating' | 'none' {
  if (runWithStatus.includes('導入済み')) return 'active';
  if (runWithStatus.includes('評価中')) return 'evaluating';
  if (runWithStatus.includes('検討中')) return 'candidate';
  return 'none';
}

/**
 * テナントステータスに応じたオンボーディングチェックリストを生成
 * RunWith新規導入自治体が踏むべき7ステップを定義
 */
function buildOnboardingSteps(status: string): OnboardingStep[] {
  const isActive = status.includes('導入済み');
  const isEvaluating = status.includes('評価中');

  return [
    {
      id: 'profile',
      label: '① 自治体プロフィール設定',
      description: '自治体名・地域タイプ・人口・主要産業をNotionに登録',
      completed: isActive || isEvaluating,
    },
    {
      id: 'notion-integration',
      label: '② Notion インテグレーション連携',
      description: 'ワークOS インテグレーションを全DBに接続',
      completed: isActive || isEvaluating,
    },
    {
      id: 'env-vars',
      label: '③ 環境変数設定（Vercel）',
      description: 'NOTION_API_KEY・ANTHROPIC_API_KEY をVercelに設定',
      completed: isActive,
    },
    {
      id: 'initial-data',
      label: '④ 初期データ投入',
      description: 'WellBeingKPI・人口データ・職員コンディションの初回入力',
      completed: isActive,
    },
    {
      id: 'ai-advisor',
      label: '⑤ AI顧問 動作確認',
      description: 'AI顧問が自治体固有の言葉でレスポンスすることを確認',
      completed: isActive,
    },
    {
      id: 'line-setup',
      label: '⑥ LINE連携設定（任意）',
      description: 'LINE公式アカウントとの連携Webhook設定',
      completed: false,
    },
    {
      id: 'training',
      label: '⑦ 職員研修・カードゲーム実施',
      description: 'SDL研修カードゲームで職員のWell-Being意識を醸成',
      completed: isActive,
    },
  ];
}

// ─── GET ─────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status'); // active/evaluating/candidate/none

    // 比較分析マスタDBから全自治体を取得（DXスコア降順）
    const records = await fetchNotionDB(COMPARE_DB_ID, 100, undefined, [
      { property: 'DX成熟度スコア', direction: 'descending' },
    ]);

    // Notion レコードを MunicipalityTenant 型に変換
    let tenants: MunicipalityTenant[] = records.map((r) => {
      const page = r as {
        id: string;
        properties: Record<string, unknown>;
      };
      const props = page.properties;

      const runWithStatus = getSelect(props, 'RunWith導入状況');
      const tenantStatus = toTenantStatus(runWithStatus);

      return {
        id: page.id,
        name: getTitle(props, '自治体名'),
        regionType: getSelect(props, '地域タイプ'),
        population: getNumber(props, '人口'),
        runWithStatus,
        wellBeingScore: getNumber(props, 'Well-Beingスコア'),
        dxScore: getNumber(props, 'DX成熟度スコア'),
        mainIndustries: getMultiSelect(props, '主要産業'),
        tenantStatus,
        onboardingSteps: buildOnboardingSteps(runWithStatus),
      };
    });

    // ステータスフィルタが指定された場合は絞り込む
    if (statusFilter) {
      tenants = tenants.filter((t) => t.tenantStatus === statusFilter);
    }

    // ─── サマリー計算 ──────────────────────────────────────

    const activeTenants = tenants.filter((t) => t.tenantStatus === 'active');
    const evaluatingTenants = tenants.filter((t) => t.tenantStatus === 'evaluating');
    const candidateTenants = tenants.filter((t) => t.tenantStatus === 'candidate');

    // 導入済み自治体の平均WBスコア
    const activeWBScores = activeTenants
      .map((t) => t.wellBeingScore)
      .filter((s): s is number => s !== null);
    const avgWellBeingActive =
      activeWBScores.length > 0
        ? Math.round(
            (activeWBScores.reduce((a, b) => a + b, 0) / activeWBScores.length) * 10
          ) / 10
        : 0;

    // 地域タイプ別件数
    const regionTypes: Record<string, number> = {};
    tenants.forEach((t) => {
      if (t.regionType) {
        regionTypes[t.regionType] = (regionTypes[t.regionType] ?? 0) + 1;
      }
    });

    const summary: TenantSummary = {
      totalMunicipalities: tenants.length,
      activeTenants: activeTenants.length,
      evaluatingTenants: evaluatingTenants.length,
      candidateTenants: candidateTenants.length,
      avgWellBeingActive,
      regionTypes,
    };

    return NextResponse.json({
      success: true,
      tenants,
      summary,
    });
  } catch (err) {
    console.error('multi-tenant GET error:', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}

// ─── POST ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, municipalityId, municipalityName } = body;

    // ── アクション分岐 ────────────────────────────────────

    if (action === 'register') {
      // 新自治体を比較分析マスタDBに登録
      // 必須: municipalityName, regionType, population
      const { regionType, population, mainIndustries } = body;

      const res = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${NOTION_API_KEY}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          parent: { database_id: COMPARE_DB_ID },
          properties: {
            自治体名: {
              title: [{ text: { content: municipalityName ?? '新規自治体' } }],
            },
            地域タイプ: {
              select: { name: regionType ?? '未分類' },
            },
            RunWith導入状況: {
              select: { name: '検討中' }, // 新規登録は「検討中」からスタート
            },
            人口: {
              number: population ?? null,
            },
            主要産業: {
              multi_select: (mainIndustries ?? []).map((name: string) => ({ name })),
            },
          },
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(JSON.stringify(err));
      }

      const created = await res.json();
      return NextResponse.json({
        success: true,
        action: 'register',
        message: `${municipalityName} をテナント候補として登録しました`,
        pageId: created.id,
      });
    }

    if (action === 'switch') {
      // アクティブテナント切り替え
      // 実際のマルチテナント実装では Cookie/DB で管理するが
      // Sprint #23 では切り替え記録のみ返す（フロントで localStorage 管理）
      return NextResponse.json({
        success: true,
        action: 'switch',
        activeMunicipalityId: municipalityId,
        activeMunicipalityName: municipalityName,
        message: `アクティブ自治体を ${municipalityName} に切り替えました`,
        switchedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json(
      { success: false, error: '不明なアクション: ' + action },
      { status: 400 }
    );
  } catch (err) {
    console.error('multi-tenant POST error:', err);
    return NextResponse.json(
      { success: false, error: String(err) },
      { status: 500 }
    );
  }
}
