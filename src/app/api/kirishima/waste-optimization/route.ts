// =====================================================
//  src/app/api/kirishima/waste-optimization/route.ts
//  霧島市 廃棄物管理 AI最適化提言 API
//
//  ■ エンドポイント
//    POST /api/kirishima/waste-optimization
//
//  ■ リクエスト
//    { scenario: 'current' | 'merge_routes' | 'regionalize' }
//    scenario:
//      current      — 現状分析（問題点の洗い出し）
//      merge_routes — 路線統廃合シナリオの試算
//      regionalize  — 広域化・焼却炉集約シナリオの試算
//
//  ■ レスポンス
//    { scenario, summary, recommendations[], costEffect, notionPage? }
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const NOTION_API  = 'https://api.notion.com/v1'
const NOTION_VER  = '2022-06-28'
const PARENT_PAGE = process.env.NOTION_PARENT_PAGE_ID ?? '338960a91e23813f9402f53e5240e029'

// ─── Notion DBクエリ（簡略版） ───────────────────────

async function fetchWasteData(notionKey: string) {
  const DISTRICT_DB = process.env.KIRISHIMA_WASTE_DISTRICT_DB_ID ?? '0bac5b57a15745a1bf8eaea27241e2e5'
  const FACILITY_DB = process.env.KIRISHIMA_WASTE_FACILITY_DB_ID ?? '1b7e2dbcebae43c1b26091af8de5f0de'
  const ROUTE_DB    = process.env.KIRISHIMA_WASTE_ROUTE_DB_ID    ?? '7b9d763f21154c5eb2e7f27f12abe984'

  async function query(dbId: string) {
    const res = await fetch(`${NOTION_API}/databases/${dbId}/query`, {
      method: 'POST',
      headers: {
        'Authorization':  `Bearer ${notionKey}`,
        'Content-Type':   'application/json',
        'Notion-Version': NOTION_VER,
      },
      body: JSON.stringify({ page_size: 100 }),
    })
    if (!res.ok) return []
    const d = await res.json()
    return (d.results ?? []) as Record<string, unknown>[]
  }

  const [dRows, fRows, rRows] = await Promise.all([
    query(DISTRICT_DB),
    query(FACILITY_DB),
    query(ROUTE_DB),
  ])

  // テキスト要約用に各DBを簡潔に変換
  const districts = dRows.map(r => {
    const p = r.properties as Record<string, Record<string, unknown>>
    return {
      name:    (p['地区名']?.title   as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      pop2020: (p['人口_2020']?.number   as number) ?? 0,
      pop2035: (p['人口_2035推計']?.number as number) ?? 0,
      cost:    (p['年間収集コスト_万円']?.number  as number) ?? 0,
      costHH:  (p['1世帯あたりコスト_円']?.number as number) ?? 0,
      status:  (p['ステータス']?.select as {name:string})?.name ?? '',
    }
  })

  const facilities = fRows.map(r => {
    const p = r.properties as Record<string, Record<string, unknown>>
    return {
      name:   (p['施設名']?.title    as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      age:    (p['築年数_年']?.number  as number) ?? 0,
      util:   (p['稼働率_%']?.number   as number) ?? 0,
      cost:   (p['年間維持費_万円']?.number as number) ?? 0,
      status: (p['広域化対象']?.select as {name:string})?.name ?? '',
    }
  })

  const routes = rRows.map(r => {
    const p = r.properties as Record<string, Record<string, unknown>>
    return {
      name:     (p['ルート名']?.title   as Array<{plain_text:string}>)?.[0]?.plain_text ?? '',
      hh:       (p['対象世帯数']?.number  as number) ?? 0,
      costHH:   (p['1世帯あたりコスト_円']?.number as number) ?? 0,
      score:    (p['効率スコア']?.number   as number) ?? 0,
      proposal: (p['最適化提案']?.select  as {name:string})?.name ?? '',
    }
  })

  return { districts, facilities, routes }
}

// ─── シナリオ別プロンプト生成 ─────────────────────────

function buildPrompt(
  scenario: string,
  data: { districts: Record<string, unknown>[]; facilities: Record<string, unknown>[]; routes: Record<string, unknown>[] },
): string {

  const dataText = `
【地区別データ（人口推移・収集コスト）】
${data.districts.map((d: Record<string, unknown>) =>
  `${d.name}: 人口${d.pop2020}→${d.pop2035}人, 1世帯コスト${(d.costHH as number)?.toLocaleString()}円/年, ステータス:${d.status}`
).join('\n')}

【焼却施設】
${data.facilities.map((f: Record<string, unknown>) =>
  `${f.name}: 築${f.age}年, 稼働率${f.util}%, 維持費${(f.cost as number)?.toLocaleString()}万円, 判定:${f.status}`
).join('\n')}

【収集ルート効率スコア（100点満点）】
${data.routes.map((r: Record<string, unknown>) =>
  `${r.name}: ${r.hh}世帯, 1世帯${(r.costHH as number)?.toLocaleString()}円, スコア${r.score}, AI提案:${r.proposal}`
).join('\n')}
`.trim()

  const scenarioInstruction = {
    current: `
シナリオ: 現状分析
このデータをもとに「現在の廃棄物管理が抱える問題点と緊急性の高い課題」を分析してください。
特に「2030年・2035年時点で深刻になる地区・路線」を具体的に指摘してください。`,

    merge_routes: `
シナリオ: 収集路線 統廃合シナリオ
「統合推奨」「廃止・委託」と判定されている路線を具体的にどう整理すればよいか提言してください。
① 優先度高い統合（2025〜2027年）② 中期統合（2028〜2030年）③ 廃止・拠点化 に分けて提言し、
コスト削減効果の概算（年間何万円削減できるか）も示してください。`,

    regionalize: `
シナリオ: 焼却炉の集約・広域化シナリオ
「隼人環境センター（築32年・稼働率55%）」「霧島北部リサイクルセンター（稼働率48%・廃止予定）」の
2施設を集約した場合の年間コスト削減額を試算し、広域化パートナー候補の自治体（鹿児島県内）を
具体的に提案してください。また「霧島クリーンセンター」のみに集約した場合の処理能力の余裕度も試算してください。`,
  }[scenario as keyof typeof scenarioInstruction] ?? `
シナリオ: 現状分析
このデータをもとに廃棄物管理の課題と改善提言を行ってください。`

  return `あなたは日本の地方自治体の廃棄物管理・インフラ縮小政策の専門家です。
霧島市の廃棄物管理データを分析し、具体的な改善提言を作成してください。

${dataText}

${scenarioInstruction}

【出力形式（JSON）】
{
  "summary": "全体サマリー（3〜4文）",
  "urgentIssues": ["緊急課題1", "緊急課題2", "緊急課題3"],
  "recommendations": [
    {
      "priority": "高|中|低",
      "title": "提言タイトル",
      "detail": "具体的な内容（2〜3文）",
      "timing": "実施目標時期",
      "costEffect": "コスト削減効果の概算"
    }
  ],
  "totalCostReduction": "全提言実施後の年間削減効果合計（概算）",
  "risks": ["実施リスク1", "実施リスク2"]
}`
}

// ─── メインハンドラ ───────────────────────────────────

export async function POST(req: NextRequest) {
  const notionKey    = process.env.NOTION_API_KEY    ?? ''
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  const { scenario = 'current' } = await req.json() as { scenario?: string }

  try {
    // データ取得
    const data = await fetchWasteData(notionKey)

    // AI 分析
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const prompt    = buildPrompt(scenario, data)

    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 1500,
      messages:   [{ role: 'user', content: prompt }],
    })

    const raw     = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
    const parsed  = JSON.parse(jsonStr) as {
      summary:          string
      urgentIssues:     string[]
      recommendations:  Array<{
        priority:    string
        title:       string
        detail:      string
        timing:      string
        costEffect:  string
      }>
      totalCostReduction: string
      risks:            string[]
    }

    // Notion にレポートを保存
    const scenarioLabel: Record<string, string> = {
      current:      '現状分析',
      merge_routes: '路線統廃合シナリオ',
      regionalize:  '焼却炉広域化シナリオ',
    }
    const today   = new Date().toLocaleDateString('ja-JP')
    const title   = `♻️ [AI提言] 霧島市 廃棄物管理 ${scenarioLabel[scenario] ?? scenario} — ${today}`
    const content = `# ${title}\n\n` +
      `## サマリー\n${parsed.summary}\n\n` +
      `## 緊急課題\n${parsed.urgentIssues.map(i => `- ${i}`).join('\n')}\n\n` +
      `## 提言一覧\n` +
      parsed.recommendations.map((r, i) =>
        `### ${i+1}. [${r.priority}] ${r.title}\n` +
        `${r.detail}\n**時期:** ${r.timing}　**効果:** ${r.costEffect}\n`
      ).join('\n') +
      `\n## 年間削減効果合計\n**${parsed.totalCostReduction}**\n\n` +
      `## 実施リスク\n${parsed.risks.map(r => `- ${r}`).join('\n')}\n\n` +
      `---\n分析日時: ${new Date().toLocaleString('ja-JP')}`

    let notionPage = null
    if (notionKey) {
      const chunks: string[] = []
      for (let i = 0; i < content.length; i += 1900) chunks.push(content.slice(i, i + 1900))
      const nr = await fetch(`${NOTION_API}/pages`, {
        method:  'POST',
        headers: {
          'Authorization':  `Bearer ${notionKey}`,
          'Content-Type':   'application/json',
          'Notion-Version': NOTION_VER,
        },
        body: JSON.stringify({
          parent:     { page_id: PARENT_PAGE },
          icon:       { emoji: '♻️' },
          properties: { title: [{ text: { content: title } }] },
          children:   chunks.map(c => ({
            object: 'block', type: 'paragraph',
            paragraph: { rich_text: [{ type: 'text', text: { content: c } }] },
          })),
        }),
      })
      if (nr.ok) {
        const np = await nr.json()
        notionPage = { id: np.id, url: np.url }
      }
    }

    return NextResponse.json({
      status:    'success',
      scenario,
      summary:   parsed.summary,
      urgentIssues: parsed.urgentIssues,
      recommendations: parsed.recommendations,
      totalCostReduction: parsed.totalCostReduction,
      risks:     parsed.risks,
      notionPage,
    })

  } catch (e) {
    console.error('[waste-optimization] エラー:', e)
    return NextResponse.json({
      status:  'error',
      message: e instanceof Error ? e.message : String(e),
    }, { status: 500 })
  }
}
