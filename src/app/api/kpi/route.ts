// =====================================================
//  src/app/api/kpi/route.ts
//  運用KPIダッシュボード データ取得APIルート
//
//  ■ このファイルの役割
//    Notionの2つのDBから蓄積データを取得し、
//    KPIダッシュボードで表示するための統計データを返す。
//
//  ■ 取得するNotionDB
//    - RunWithプラットフォーム記録DB: 成熟度診断スコア・監視ログ
//    - エクセレントサービス学習ログDB: カードゲーム学習スコア
// =====================================================

import { NextResponse } from 'next/server'

// ─── 型定義 ──────────────────────────────────────────

/** プラットフォーム記録1件 */
export type PlatformRecord = {
  title: string        // タイトル
  type: string         // 種別（成熟度診断・カードゲーム・監視ログ等）
  score: number | null // スコア
  maxScore: number | null // 最大スコア
  level: string        // レベル/ランク
  weakness: string     // 弱点・改善領域
  note: string         // 補足情報
  createdAt: string    // 作成日時（ISO）
}

/** 学習ログ1件 */
export type LearningLog = {
  session: string      // セッション名
  gameType: string     // ゲーム種別
  score: number | null // スコア
  staff: string        // 職員名
  dept: string         // 部署名
  feedback: string     // AIフィードバック（先頭120文字）
  createdAt: string    // 作成日時（ISO）
}

/** APIレスポンスの型 */
export type KpiResponse = {
  platformRecords: PlatformRecord[]
  learningLogs: LearningLog[]
  summary: {
    totalPlatformRecords: number   // 記録総数
    totalLearningLogs: number      // 学習セッション総数
    avgMaturityScore: number       // 平均成熟度スコア（0-100）
    avgGameScore: number           // 平均ゲームスコア（0-100）
    // IT成熟度5領域スコア（レーダーチャート用・0〜100）
    maturityAxes: {
      incident: number     // インシデント管理
      change: number       // 変更管理
      monitoring: number   // 監視・モニタリング
      document: number     // ドキュメント管理
      security: number     // セキュリティ
    }
  }
}

// ─── Notionヘルパー ───────────────────────────────────

/** Notion APIへの共通リクエスト */
async function notionQuery(dbId: string, pageSize = 30) {
  const res = await fetch(`https://api.notion.com/v1/databases/${dbId}/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
      'Notion-Version': '2022-06-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      page_size: pageSize,
      sorts: [{ timestamp: 'created_time', direction: 'descending' }],
    }),
  })
  if (!res.ok) return null
  return res.json()
}

// ─── GETハンドラ ──────────────────────────────────────

export async function GET() {
  try {
    const notionKey = process.env.NOTION_API_KEY
    if (!notionKey) {
      return NextResponse.json({ error: 'NOTION_API_KEY が未設定です' }, { status: 500 })
    }

    // 2つのDBを並列取得（速度優先）
    const [platformData, learningData] = await Promise.all([
      notionQuery('32b960a91e2381228dcbdd56375cba03', 30), // RunWithプラットフォーム記録DB
      notionQuery('cab4357ef4d7425496e5c0416866c6dd', 30), // エクセレントサービス学習ログDB
    ])

    // ─── プラットフォーム記録を整形 ───────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const platformRecords: PlatformRecord[] = (platformData?.results ?? []).map((r: any) => {
      const p = r.properties
      return {
        title:    p['タイトル']?.title?.[0]?.plain_text ?? '',
        type:     p['種別']?.select?.name ?? '',
        score:    p['スコア']?.number ?? null,
        maxScore: p['最大スコア']?.number ?? null,
        level:    p['レベル/ランク']?.rich_text?.[0]?.plain_text ?? '',
        weakness: p['弱点・改善領域']?.rich_text?.[0]?.plain_text ?? '',
        note:     p['補足情報']?.rich_text?.[0]?.plain_text ?? '',
        createdAt: r.created_time ?? '',
      }
    })

    // ─── 学習ログを整形 ──────────────────────────────────
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const learningLogs: LearningLog[] = (learningData?.results ?? []).map((r: any) => {
      const p = r.properties
      const feedback = p['AIフィードバック']?.rich_text?.[0]?.plain_text ?? ''
      return {
        session:  p['セッション名']?.title?.[0]?.plain_text ?? '',
        gameType: p['ゲーム種別']?.select?.name ?? '',
        score:    p['スコア']?.number ?? null,
        staff:    p['職員名']?.rich_text?.[0]?.plain_text ?? '',
        dept:     p['部署名']?.rich_text?.[0]?.plain_text ?? '',
        feedback: feedback.slice(0, 120),
        createdAt: r.created_time ?? '',
      }
    })

    // ─── サマリーを計算 ──────────────────────────────────

    // 成熟度診断レコード（種別に「診断」か「成熟度」が含まれるもの）
    const maturityRecords = platformRecords.filter(r =>
      r.type.includes('診断') || r.type.includes('成熟度') || r.type.includes('maturity')
    )

    // ゲームスコアがあるレコード（0〜100換算）
    const scoredPlatform = platformRecords.filter(r =>
      r.score !== null && r.maxScore !== null && r.maxScore > 0
    )
    const avgMaturityScore = scoredPlatform.length > 0
      ? Math.round(scoredPlatform.reduce((acc, r) => acc + (r.score! / r.maxScore!) * 100, 0) / scoredPlatform.length)
      : 0

    const scoredLearning = learningLogs.filter(r => r.score !== null)
    const avgGameScore = scoredLearning.length > 0
      ? Math.round(scoredLearning.reduce((acc, r) => acc + r.score!, 0) / scoredLearning.length)
      : 0

    // IT成熟度5領域スコア算出
    // ─ 「弱点・改善領域」テキストに各キーワードが含まれる場合、スコアを下げる
    // ─ データが少ない場合は全領域に基礎スコアを設定
    const computeAxisScore = (keyword: string): number => {
      // 弱点として記録されているレコード数を数える
      const weakCount = platformRecords.filter(r =>
        r.weakness.includes(keyword)
      ).length
      const base = maturityRecords.length > 0
        ? Math.round(avgMaturityScore * 0.8 + 10) // 基礎スコア
        : 50 // データなしの場合のデフォルト
      // 弱点としての言及が多いほどスコアを下げる
      const penalty = Math.min(weakCount * 10, 30)
      return Math.max(0, Math.min(100, base - penalty))
    }

    const maturityAxes = {
      incident:   computeAxisScore('インシデント'),
      change:     computeAxisScore('変更'),
      monitoring: computeAxisScore('監視'),
      document:   computeAxisScore('ドキュメント'),
      security:   computeAxisScore('セキュリティ'),
    }

    // データが0件の場合、デモ用の初期値を設定
    if (platformRecords.length === 0 && learningLogs.length === 0) {
      maturityAxes.incident   = 40
      maturityAxes.change     = 35
      maturityAxes.monitoring = 55
      maturityAxes.document   = 30
      maturityAxes.security   = 45
    }

    const response: KpiResponse = {
      platformRecords: platformRecords.slice(0, 10), // 最新10件
      learningLogs:    learningLogs.slice(0, 8),     // 最新8件
      summary: {
        totalPlatformRecords: platformRecords.length,
        totalLearningLogs:    learningLogs.length,
        avgMaturityScore,
        avgGameScore,
        maturityAxes,
      },
    }

    return NextResponse.json(response)

  } catch (err) {
    console.error('KPI API エラー:', err)
    return NextResponse.json({ error: 'データ取得に失敗しました' }, { status: 500 })
  }
}
