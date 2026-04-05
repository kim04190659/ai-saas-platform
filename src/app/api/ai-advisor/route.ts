// =====================================================
//  src/app/api/ai-advisor/route.ts
//  AI Well-Being顧問 APIルート — Layer 3（Sprint #19）
//
//  ■ このファイルの役割
//    - NotionのDBから蓄積データを取得する（Layer 3: 7本並列）
//    - 取得したデータをRAGコンテキストとしてClaude APIに渡す
//    - SDL五軸・Well-Being視点の回答をフロントに返す
//
//  ■ 使用するNotionDB（Layer 3: 7本 + 自治体プロフィール）
//    1. エクセレントサービス学習ログDB（カードゲーム結果）
//    2. RunWithプラットフォーム記録DB（IT運用診断・監視ログ）
//    3. PopulationData DB（人口・高齢化・世帯データ）
//    4. WellBeingKPI DB（住民サービス稼働・満足度スコア）
//    5. MunicipalityProfile DB（自治体プロフィール）← Layer 2
//    6. 収益データDB（観光・産品・宿泊など地域収益）← Sprint #19 Layer 3追加
//    7. 比較分析マスタDB（類似自治体ベンチマーク）← Sprint #19 Layer 3追加
//
//  ■ Layer 3設計（Sprint #19の核心）
//    収益データと類似自治体比較をRAGに加えることで、
//    「財政的な裏付けのある提言」と「他の自治体と比べてどうか」
//    という2軸の回答精度が大幅に向上する。
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

// Notion APIの共通ヘッダーを生成するヘルパー
function notionHeaders(apiKey: string) {
  return {
    'Authorization': `Bearer ${apiKey}`,
    'Notion-Version': '2022-06-28',
    'Content-Type': 'application/json',
  }
}

// =====================================================
//  [Phase 1] ヘルパー関数: エクセレントサービス学習ログを取得
// =====================================================

async function fetchLearningLogs(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // エクセレントサービス学習ログDB のID
  const dbId = 'cab4357ef4d7425496e5c0416866c6dd'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      // 直近20件を新しい順で取得
      body: JSON.stringify({
        page_size: 20,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（学習ログ取得エラー）'

    const data = await res.json()

    // 各レコードから必要なフィールドを取り出して文字列化
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      // Notionの各プロパティ型に合わせて安全に値を取得
      const session  = p['セッション名']?.title?.[0]?.plain_text ?? ''
      const gameType = p['ゲーム種別']?.select?.name ?? ''
      const score    = p['スコア']?.number ?? ''
      const staff    = p['職員名']?.rich_text?.[0]?.plain_text ?? ''
      const dept     = p['部署名']?.rich_text?.[0]?.plain_text ?? ''
      const cards    = p['選択カード']?.rich_text?.[0]?.plain_text ?? ''
      const idea     = p['改善アイデア']?.rich_text?.[0]?.plain_text ?? ''
      const feedback = p['AIフィードバック']?.rich_text?.[0]?.plain_text ?? ''

      return (
        `・${session}（${gameType}）スコア:${score}` +
        (staff ? ` 職員:${staff}` : '') +
        (dept  ? ` / ${dept}` : '') +
        `\n  選択カード: ${cards}` +
        `\n  改善アイデア: ${idea}` +
        `\n  AIフィードバック: ${feedback.slice(0, 100)}`
      )
    }) ?? []

    return rows.length > 0 ? rows.join('\n') : '（まだデータがありません）'
  } catch {
    return '（学習ログ取得エラー）'
  }
}

// =====================================================
//  [Phase 1] ヘルパー関数: Notionからプラットフォーム記録を取得
// =====================================================

async function fetchPlatformRecords(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // RunWithプラットフォーム記録DB のID
  const dbId = '32b960a91e2381228dcbdd56375cba03'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      // 直近20件を新しい順で取得
      body: JSON.stringify({
        page_size: 20,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（記録DB取得エラー）'

    const data = await res.json()

    // 各レコードから必要なフィールドを取り出して文字列化
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      const title    = p['タイトル']?.title?.[0]?.plain_text ?? ''
      const type     = p['種別']?.select?.name ?? ''
      const score    = p['スコア']?.number ?? ''
      const maxScore = p['最大スコア']?.number ?? ''
      const level    = p['レベル/ランク']?.rich_text?.[0]?.plain_text ?? ''
      const weakness = p['弱点・改善領域']?.rich_text?.[0]?.plain_text ?? ''
      const note     = p['補足情報']?.rich_text?.[0]?.plain_text ?? ''

      return (
        `・${title}（${type}）スコア:${score}/${maxScore} レベル:${level}` +
        `\n  弱点: ${weakness}` +
        `\n  補足: ${note.slice(0, 80)}`
      )
    }) ?? []

    return rows.length > 0 ? rows.join('\n') : '（まだデータがありません）'
  } catch {
    return '（記録DB取得エラー）'
  }
}

// =====================================================
//  [Phase 2] ヘルパー関数: 人口・地域データを取得
//  Sprint #11 で蓄積した PopulationData DB から取得
// =====================================================

async function fetchPopulationData(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // PopulationData DB のID（Sprint #11で作成）
  const dbId = '91876a16eed64ee5badc72b1c697154d'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      // 直近30件を新しい順で取得（年度ごとの時系列データが入っているため多めに）
      body: JSON.stringify({
        page_size: 30,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（人口データ取得エラー）'

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      // 各種人口指標を取得（CSVからNotionに取り込んだフィールド）
      const title        = p['名称']?.title?.[0]?.plain_text ?? ''
      const population   = p['総人口']?.number ?? ''
      const elderly      = p['65歳以上人口']?.number ?? ''
      const elderlyRate  = p['高齢化率']?.number ?? ''
      const births       = p['出生数']?.number ?? ''
      const deaths       = p['死亡数']?.number ?? ''
      const households   = p['世帯数']?.number ?? ''
      const futureEst    = p['将来推計人口']?.number ?? ''
      const year         = p['年度']?.rich_text?.[0]?.plain_text ?? ''

      // 高齢化率を%表示に変換（数値が0-1の場合）
      const elderlyRateStr = elderlyRate
        ? (elderlyRate > 1 ? `${elderlyRate.toFixed(1)}%` : `${(elderlyRate * 100).toFixed(1)}%`)
        : ''

      return (
        `・${title}${year ? `（${year}）` : ''}` +
        (population  ? ` 総人口:${population.toLocaleString()}人` : '') +
        (elderly     ? ` 65歳以上:${elderly.toLocaleString()}人` : '') +
        (elderlyRateStr ? ` 高齢化率:${elderlyRateStr}` : '') +
        (births      ? ` 出生数:${births}人` : '') +
        (deaths      ? ` 死亡数:${deaths}人` : '') +
        (households  ? ` 世帯数:${households.toLocaleString()}世帯` : '') +
        (futureEst   ? ` 将来推計:${futureEst.toLocaleString()}人` : '')
      )
    }) ?? []

    return rows.length > 0 ? rows.join('\n') : '（人口データはまだ登録されていません）'
  } catch {
    return '（人口データ取得エラー）'
  }
}

// =====================================================
//  [Layer 2 / Sprint #14.8] ヘルパー関数: 自治体プロフィールを取得
//  MunicipalityProfile DB から最新のプロフィール1件を取得し
//  システムプロンプトへの差し込み用テキストを生成する
// =====================================================

async function fetchMunicipalityProfile(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // MunicipalityProfile DB のID（Sprint #14.8で活用）
  const dbId = '1488c8cb1d7346e39cb18998fa9b39c3'

  try {
    // 最新更新日時の降順で1件だけ取得
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      body: JSON.stringify({
        page_size: 1,
        sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '' // プロフィール未設定でもAPIは動作を継続する

    const data = await res.json()

    if (!data.results || data.results.length === 0) {
      return '' // まだ設定されていない場合は空文字（デフォルトプロンプトで動作）
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = data.results[0] as any
    const p = r.properties

    // プロパティを取得
    const municipalityName = p['自治体名']?.title?.[0]?.plain_text ?? ''
    const populationSize   = p['人口規模']?.select?.name ?? ''
    const advisorStyle     = p['AI顧問スタイル']?.select?.name ?? ''
    const regionNote       = p['地域の特色メモ']?.rich_text?.[0]?.plain_text ?? ''

    // multi_select フィールドを「、」区切りの文字列に変換
    const mainChallenges = (p['主要課題']?.multi_select ?? [])
      .map((o: { name: string }) => o.name).join('、')
    const serviceAreas   = (p['重点サービス領域']?.multi_select ?? [])
      .map((o: { name: string }) => o.name).join('、')
    const sdlAxes        = (p['SDL強化重点軸']?.multi_select ?? [])
      .map((o: { name: string }) => o.name).join('、')

    // ─── システムプロンプトに差し込むテキストを生成 ───
    // この文字列がAI回答を「この自治体専用」にするLayer 2の核心
    const lines: string[] = []

    if (municipalityName) lines.push(`自治体名: ${municipalityName}`)
    if (populationSize)   lines.push(`人口規模: ${populationSize}`)
    if (mainChallenges)   lines.push(`主要課題: ${mainChallenges}`)
    if (serviceAreas)     lines.push(`重点サービス領域: ${serviceAreas}`)
    if (sdlAxes)          lines.push(`SDL強化重点軸: ${sdlAxes}`)
    if (advisorStyle)     lines.push(`AI顧問スタイル: ${advisorStyle}`)
    if (regionNote)       lines.push(`地域の特色: ${regionNote}`)

    return lines.length > 0 ? lines.join('\n') : ''
  } catch {
    return '' // エラー時もAPIは継続動作（プロフィールなしとして扱う）
  }
}

// =====================================================
//  [Phase 2] ヘルパー関数: 住民サービスKPIデータを取得
//  Sprint #12 で蓄積した WellBeingKPI DB から取得
// =====================================================

async function fetchWellBeingKPI(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // WellBeingKPI DB のID（Sprint #12で作成）
  const dbId = 'af1e5c71a95546c3aff0c00ec7068552'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      // 直近50件を記録日の新しい順で取得
      body: JSON.stringify({
        page_size: 50,
        sorts: [{ property: '記録日', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（Well-BeingKPIデータ取得エラー）'

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      // 住民サービスKPIの各フィールドを取得
      const serviceName      = p['サービス名']?.title?.[0]?.plain_text ?? '不明'
      const municipality     = p['自治体名']?.rich_text?.[0]?.plain_text ?? ''
      const category         = p['カテゴリ']?.select?.name ?? ''
      const status           = p['稼働状況']?.select?.name ?? ''
      const satisfactionScore = p['満足度スコア']?.number ?? ''
      const waitingMinutes   = p['窓口待ち時間']?.number ?? ''
      const userCount        = p['利用者数']?.number ?? ''
      const wellbeingScore   = p['wellbeing_score']?.number ?? ''
      const recordDate       = p['記録日']?.date?.start ?? ''

      return (
        `・[${category}]${serviceName}` +
        (municipality ? `（${municipality}）` : '') +
        ` 状態:${status}` +
        (wellbeingScore !== '' ? ` WBスコア:${wellbeingScore}` : '') +
        (satisfactionScore !== '' ? ` 満足度:${satisfactionScore}/5` : '') +
        (waitingMinutes !== '' ? ` 待ち時間:${waitingMinutes}分` : '') +
        (userCount !== '' ? ` 利用者数:${userCount}人` : '') +
        (recordDate ? ` 記録日:${recordDate}` : '')
      )
    }) ?? []

    // カテゴリ別の平均Well-Beingスコアを集計してサマリを追加
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const categoryMap: Record<string, { total: number; count: number }> = {}
    data.results?.forEach((r: any) => {
      const cat   = r.properties['カテゴリ']?.select?.name ?? '不明'
      const score = r.properties['wellbeing_score']?.number
      if (score !== undefined && score !== null) {
        if (!categoryMap[cat]) categoryMap[cat] = { total: 0, count: 0 }
        categoryMap[cat].total += score
        categoryMap[cat].count++
      }
    })

    // カテゴリ別平均スコアのサマリ文字列を生成
    const categorySummary = Object.entries(categoryMap)
      .map(([cat, { total, count }]) =>
        `  【${cat}】平均WBスコア: ${Math.round(total / count)}点（${count}件）`
      )
      .join('\n')

    const summary = categorySummary
      ? `\n■ カテゴリ別Well-Beingスコア集計:\n${categorySummary}`
      : ''

    return rows.length > 0
      ? rows.join('\n') + summary
      : '（住民サービスデータはまだ登録されていません）'
  } catch {
    return '（Well-BeingKPIデータ取得エラー）'
  }
}

// =====================================================
//  [Layer 3 / Sprint #19] ヘルパー関数: 収益データを取得
//  Sprint #17 で蓄積した 収益データDB から最新データを取得し
//  「財政的な裏付けのある提言」をAIに可能にする
// =====================================================

async function fetchRevenueData(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // 収益データDB のID（Sprint #17で活用）
  const dbId = '00dc2b2f34ef44f78f8dd6551258a9f2'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      // 直近30件を記録日の新しい順で取得
      body: JSON.stringify({
        page_size: 30,
        sorts: [{ property: '記録日', direction: 'descending' }],
      }),
    })

    if (!res.ok) return '（収益データ取得エラー）'

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results?.map((r: any) => {
      const p = r.properties

      const name         = p['データ名']?.title?.[0]?.plain_text     ?? '（名称なし）'
      const type         = p['種別']?.select?.name                    ?? ''
      const regionType   = p['地域タイプ']?.select?.name             ?? ''
      const value        = p['数値']?.number                          ?? null
      const baseValue    = p['比較基準値']?.number                    ?? null
      const unit         = p['単位']?.rich_text?.[0]?.plain_text     ?? ''
      const reliability  = p['信頼度']?.select?.name                  ?? ''
      const municipality = p['自治体名']?.rich_text?.[0]?.plain_text  ?? ''
      const period       = p['記録期間']?.rich_text?.[0]?.plain_text  ?? ''
      const aiHint       = p['AI示唆']?.rich_text?.[0]?.plain_text    ?? ''

      // 基準値乖離率を計算（値と基準値が両方ある場合）
      let deviationStr = ''
      if (value !== null && baseValue !== null && baseValue !== 0) {
        const deviation = ((value - baseValue) / baseValue) * 100
        deviationStr = ` 基準比:${deviation >= 0 ? '+' : ''}${deviation.toFixed(1)}%`
      }

      return (
        `・[${type}]${name}` +
        (municipality ? `（${municipality}）` : '') +
        (regionType   ? ` 地域:${regionType}` : '') +
        (value !== null ? ` ${value.toLocaleString()}${unit}` : '') +
        deviationStr +
        (period       ? ` 期間:${period}` : '') +
        (reliability  ? ` 信頼度:${reliability}` : '') +
        (aiHint       ? `\n  →AI示唆: ${aiHint.slice(0, 120)}` : '')
      )
    }) ?? []

    return rows.length > 0 ? rows.join('\n') : '（収益データはまだ登録されていません）'
  } catch {
    return '（収益データ取得エラー）'
  }
}

// =====================================================
//  [Layer 3 / Sprint #19] ヘルパー関数: 類似自治体比較データを取得
//  Sprint #18 で蓄積した 比較分析マスタDB から取得し
//  「他の自治体と比べてどうか」という分析を可能にする
// =====================================================

async function fetchCompareData(): Promise<string> {
  const notionApiKey = process.env.NOTION_API_KEY

  // 比較分析マスタ DB のID（Sprint #18で活用）
  const dbId = 'f209f175d6f44efb9dee02c59d893aed'

  try {
    const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
      method: 'POST',
      headers: notionHeaders(notionApiKey ?? ''),
      body: JSON.stringify({
        page_size: 50,
        sorts: [{ property: '自治体名', direction: 'ascending' }],
      }),
    })

    if (!res.ok) return '（比較分析データ取得エラー）'

    const data = await res.json()

    if (!data.results || data.results.length === 0) {
      return '（類似自治体データはまだ登録されていません）'
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rows = data.results.map((r: any) => {
      const p = r.properties

      const name          = p['自治体名']?.title?.[0]?.plain_text     ?? '（名称なし）'
      const prefecture    = p['都道府県']?.rich_text?.[0]?.plain_text  ?? ''
      const regionType    = p['地域タイプ']?.select?.name             ?? ''
      const sizeCategory  = p['人口規模']?.select?.name               ?? ''
      const population    = p['総人口']?.number                        ?? null
      const elderlyRate   = p['高齢化率（%）']?.number                 ?? null
      const fiscalStr     = p['財政力指数']?.number                    ?? null
      const wbScore       = p['Well-Beingスコア']?.number             ?? null
      const dxScore       = p['DX成熟度スコア']?.number               ?? null
      const runwith       = p['RunWith導入状況']?.select?.name        ?? ''
      // multi_select: 主要産業
      const industries    = (p['主要産業']?.multi_select ?? [])
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((s: any) => s.name).join('・')

      return (
        `・${name}（${prefecture}）${regionType} ${sizeCategory}` +
        (population   !== null ? ` 人口:${population.toLocaleString()}人` : '') +
        (elderlyRate  !== null ? ` 高齢化率:${elderlyRate}%` : '') +
        (fiscalStr    !== null ? ` 財政力:${fiscalStr}` : '') +
        (wbScore      !== null ? ` WBスコア:${wbScore}` : '') +
        (dxScore      !== null ? ` DXスコア:${dxScore}` : '') +
        (runwith      ? ` RunWith:${runwith}` : '') +
        (industries   ? ` 産業:${industries}` : '')
      )
    })

    // RunWith導入済み自治体の平均WBスコアも計算してサマリに追加
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const introduced = data.results.filter((r: any) =>
      r.properties['RunWith導入状況']?.select?.name === '導入済' &&
      r.properties['Well-Beingスコア']?.number !== null
    )
    let compareSummary = ''
    if (introduced.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avgWB = introduced.reduce((s: number, r: any) =>
        s + (r.properties['Well-Beingスコア']?.number ?? 0), 0
      ) / introduced.length
      compareSummary = `\n■ RunWith導入済み${introduced.length}自治体の平均Well-Beingスコア: ${avgWB.toFixed(1)}点`
    }

    return rows.join('\n') + compareSummary
  } catch {
    return '（比較分析データ取得エラー）'
  }
}

// =====================================================
//  POSTハンドラ: チャットメッセージを受け取りAI回答を返す
// =====================================================

export async function POST(req: NextRequest) {
  try {
    // フロントエンドからの入力: ユーザーのメッセージと会話履歴
    const { message, conversationHistory } = await req.json()

    // ─────────────────────────────────────────────────
    //  Layer 3（Sprint #19）: Notion 7DBから最新データを並列で取得
    //  Promise.all で全て同時実行して応答速度を最大化
    //  ★ Sprint #19: 収益データDB・比較分析マスタDBを追加（6・7本目）
    // ─────────────────────────────────────────────────
    const [
      learningLogs,
      platformRecords,
      populationData,
      wellBeingKPI,
      municipalityProfile,
      revenueData,    // Sprint #19 Layer 3: 収益データ
      compareData,    // Sprint #19 Layer 3: 類似自治体比較
    ] = await Promise.all([
      fetchLearningLogs(),          // エクセレントサービス学習ログ
      fetchPlatformRecords(),       // IT運用診断・監視ログ
      fetchPopulationData(),        // 人口・地域データ
      fetchWellBeingKPI(),          // 住民サービスKPI
      fetchMunicipalityProfile(),   // 自治体プロフィール（Layer 2）
      fetchRevenueData(),           // 収益データ（Layer 3追加）
      fetchCompareData(),           // 類似自治体比較（Layer 3追加）
    ])

    // ─────────────────────────────────────────────────
    //  Phase 2 RAGコンテキスト:
    //  自治体固有データ（人口・サービスKPI）を含む4DB統合コンテキスト
    //  「このデータを参照して、SDL五軸の視点で具体的な提言を行う」
    // ─────────────────────────────────────────────────
    const ragContext = `
【この自治体のRunWithプラットフォーム蓄積データ — Layer 3（7DB統合）】

■ 人口・地域データ:
${populationData}

■ 住民サービスKPI・Well-Beingスコア:
${wellBeingKPI}

■ 収益・財政データ（Layer 3追加 — 観光・産品・宿泊など）:
${revenueData}

■ 類似自治体ベンチマーク比較（Layer 3追加）:
${compareData}

■ エクセレントサービス学習ログ（カードゲーム結果）:
${learningLogs}

■ IT運用診断・監視・カードゲーム記録:
${platformRecords}
`

    // ─────────────────────────────────────────────────
    //  Layer 2 自治体プロフィールブロック（Sprint #14.8）:
    //  プロフィールが設定されている場合のみ差し込む
    //  「この自治体向け」という文脈を冒頭でAIに明示する
    // ─────────────────────────────────────────────────
    const profileBlock = municipalityProfile
      ? `\n【この自治体のプロフィール設定（Layer 2）】\n${municipalityProfile}\n\n上記のプロフィールを踏まえ、この自治体の文脈・課題・スタイルに合わせた回答を行うこと。`
      : ''

    // AI顧問スタイルに応じた回答スタイル指示を生成する
    // ※ プロフィールの「AI顧問スタイル」フィールドを取り出してスタイル指示に変換
    let styleInstruction = ''
    if (municipalityProfile.includes('提言型')) {
      styleInstruction = '\n回答スタイル：具体的な施策提言を中心に、実行ステップを明確に示す。'
    } else if (municipalityProfile.includes('対話型')) {
      styleInstruction = '\n回答スタイル：対話的に質問を投げかけながら、現場の状況を引き出すように進める。'
    } else if (municipalityProfile.includes('分析型')) {
      styleInstruction = '\n回答スタイル：データを深く分析し、数値と根拠を丁寧に示す。'
    }

    // ─────────────────────────────────────────────────
    //  Phase 2 + Layer 2 システムプロンプト:
    //  人口動態 × サービスKPI × SDL五軸 の横断分析 +
    //  自治体プロフィールによる「この自治体専用」カスタマイズ
    // ─────────────────────────────────────────────────
    const systemPrompt = `あなたは「RunWith Well-Being顧問AI」です。
人口減少が進む日本の自治体が住民と職員双方のWell-Beingを高めながら
持続可能な行政サービスを実現するために、データに基づいた具体的な改善提言を行う専門家AIです。
${profileBlock}${styleInstruction}

あなたの分析は、原浦龍典教授（東京大学）のService Dominant Logic（SDL）価値共創モデルの
五軸に基づきます：
- 共創軸：住民・職員・行政が共に価値を生み出しているか
- 文脈軸：サービスが住民の生活文脈に合っているか
- 資源軸：外部パートナーや地域資源を活用できているか
- 統合軸：複数のサービスや知識を組み合わせているか
- 価値軸：最終的に住民・職員の生活の質が向上しているか

Layer 3強化ポイント（収益データ × 類似自治体比較 の2軸追加）:
- 蓄積された人口データ・サービスKPIに加え、収益データと類似自治体比較を横断分析する
- 例：「高齢化率XX%という文脈では、福祉サービスのWell-Beingスコア向上が最優先」
- 例：「収益データを見ると観光収益が基準比+XX%で、類似自治体の平均を上回っている」
- 例：「類似離島3自治体と比べてDX成熟度スコアがYY点低い。RunWith導入済み自治体の平均Well-BeingスコアはZZ点」
- 財政的な裏付けと他自治体との比較を組み合わせた根拠ある提言を行う

回答の原則：
1. 必ず蓄積データを参照し「このデータによると〜」という形で数値とともに根拠を示す
2. 抽象的なアドバイスではなく、明日から実行できる具体的な提言を3つ以内で示す
3. SDL五軸のどの軸に関連するかを明示する（例：「【共創軸】」）
4. 人口動態データとサービスKPIを横断して分析し、自治体固有の文脈で語る
5. 職員のWell-Beingと住民サービス品質の両立を常に意識する
6. 日本語で、自治体職員が理解しやすい言葉で話す

${ragContext}`

    // ─────────────────────────────────────────────────
    //  会話履歴 + 今回のメッセージを組み立てる
    //  過去の会話を引き継ぐことで文脈を持った対話が可能になる
    // ─────────────────────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const messages: any[] = [
      ...(conversationHistory ?? []),   // 過去の会話履歴
      { role: 'user', content: message }, // 今回の質問
    ]

    // Claude API を呼び出す（サーバーサイドなのでAPIキーが安全に使える）
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY ?? '',
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-5',    // 高品質な分析に最適なモデル
        max_tokens: 2000,             // Phase 2: 横断分析で回答が長くなるため増量
        system: systemPrompt,
        messages,
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return NextResponse.json(
        { error: `Claude APIエラー: ${errText}` },
        { status: 500 }
      )
    }

    const claudeData = await claudeRes.json()
    const aiReply = claudeData.content?.[0]?.text ?? '回答を取得できませんでした'

    // フロントエンドに返す内容
    return NextResponse.json({
      // AIの回答本文
      reply: aiReply,

      // 次回のリクエストで会話文脈を維持するための履歴
      updatedHistory: [
        ...(conversationHistory ?? []),
        { role: 'user',      content: message  },
        { role: 'assistant', content: aiReply  },
      ],

      // Layer 3: 参照したデータ件数（フロントのバッジ表示に使用）
      dataStats: {
        learningLogLines:        learningLogs.split('\n').filter(l => l.startsWith('・')).length,
        platformRecordLines:     platformRecords.split('\n').filter(l => l.startsWith('・')).length,
        populationDataLines:     populationData.split('\n').filter(l => l.startsWith('・')).length,
        wellBeingKPILines:       wellBeingKPI.split('\n').filter(l => l.startsWith('・')).length,
        municipalityConfigured:  municipalityProfile.length > 0,
        revenueDataLines:        revenueData.split('\n').filter(l => l.startsWith('・')).length,   // Layer 3追加
        compareDataLines:        compareData.split('\n').filter(l => l.startsWith('・')).length,   // Layer 3追加
      },
    })

  } catch (err) {
    console.error('AI顧問APIエラー:', err)
    return NextResponse.json({ error: 'サーバーエラーが発生しました' }, { status: 500 })
  }
}
