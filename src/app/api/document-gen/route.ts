// =====================================================
//  src/app/api/document-gen/route.ts
//  AI政策文書生成 API ルート — Sprint #22
//
//  ■ このファイルの役割
//    - POST: テンプレート種別と対象期間を受け取り、
//            Notionの全DBからデータを収集して
//            Claude APIで政策文書を自動生成して返す
//
//  ■ 生成できる文書テンプレート
//    1. 議会向け月次レポート       — 住民サービス・財政・人口動態を議会向けに整理
//    2. SDL政策提言書              — SDL五軸に基づく具体的施策提言
//    3. 首長向けブリーフィング     — 1ページで伝えるエグゼクティブサマリー
//    4. 財政状況報告               — 収益データ・財政力指数の分析報告
//    5. IT運用成熟度報告           — CMDB・IT診断結果の報告書
//    6. 類似自治体比較レポート     — ベンチマーク比較と施策インプリケーション
//
//  ■ データソース（全DB横断）
//    WellBeingKPI / 収益データ / 人口データ / 類似自治体比較 /
//    タッチポイント / LINE相談 / 職員コンディション / CMDB /
//    自治体プロフィール / 集合知ナレッジ
// =====================================================

import { NextRequest, NextResponse } from 'next/server'

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'

// Notion DB IDs
const DB_IDS = {
  wellBeingKPI:   'af1e5c71a95546c3aff0c00ec7068552',
  revenue:        '00dc2b2f34ef44f78f8dd6551258a9f2',
  population:     '91876a16eed64ee5badc72b1c697154d',
  compare:        'f209f175d6f44efb9dee02c59d893aed',
  touchpoints:    '16f70d3d19c04be6842564af0e5461ea',
  lineConsult:    'd3c225835ec440f495bf79cd737eb862',
  staffCondition: 'b8f9c3d2e1a445f6b7c8d9e0f1a23456', // StaffCondition DB
  cmdb:           'e9b083f7b88e4b709517ff304e812010',
  profile:        '1488c8cb1d7346e39cb18998fa9b39c3',
  knowledge:      '904e1be93bc2497387c2fbe8560fab5f',
}

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

/** 指定DBから最新N件を取得して文字列化（汎用）*/
async function fetchDbSummary(
  apiKey: string,
  dbId: string,
  pageSize: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  mapper: (r: any) => string,
  label: string
): Promise<string> {
  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${dbId}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({
        page_size: pageSize,
        sorts: [{ timestamp: 'created_time', direction: 'descending' }],
      }),
    })
    if (!res.ok) return `（${label}取得エラー）`
    const data = await res.json()
    const rows = (data.results ?? []).map(mapper).filter(Boolean)
    return rows.length > 0 ? rows.join('\n') : `（${label}はまだ登録されていません）`
  } catch {
    return `（${label}取得エラー）`
  }
}

/** 自治体プロフィールを取得 */
async function fetchProfile(apiKey: string): Promise<string> {
  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${DB_IDS.profile}/query`, {
      method:  'POST',
      headers: notionHeaders(apiKey),
      body:    JSON.stringify({ page_size: 1, sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }] }),
    })
    if (!res.ok) return ''
    const data = await res.json()
    if (!data.results?.length) return ''
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const p = (data.results[0] as any).properties
    const lines = []
    const name = p['自治体名']?.title?.[0]?.plain_text
    if (name) lines.push(`自治体名: ${name}`)
    const pop  = p['人口規模']?.select?.name
    if (pop)  lines.push(`人口規模: ${pop}`)
    const challenges = (p['主要課題']?.multi_select ?? []).map((o: { name: string }) => o.name).join('、')
    if (challenges) lines.push(`主要課題: ${challenges}`)
    const note = p['地域の特色メモ']?.rich_text?.[0]?.plain_text
    if (note) lines.push(`地域特色: ${note}`)
    return lines.join('\n')
  } catch {
    return ''
  }
}

// ── テンプレート定義 ──────────────────────────────────

const TEMPLATES: Record<string, {
  label: string
  prompt: (ctx: string, profile: string, period: string) => string
}> = {
  assembly_report: {
    label: '議会向け月次レポート',
    prompt: (ctx, profile, period) => `
あなたは自治体の政策担当AIです。以下の蓄積データを基に、
議会向けの月次レポートを作成してください。

【対象期間】${period}
【自治体情報】
${profile}

【蓄積データ】
${ctx}

## 出力形式（必ずこの構成で作成してください）

# ${period} 月次行政報告書

## 1. 住民サービス状況サマリー
（WellBeingKPIデータから稼働状況・満足度・窓口状況を数値付きで整理）

## 2. 財政・収益状況
（収益データから歳入状況・観光収益・基準値比較を記載）

## 3. 人口・地域動向
（人口データから直近トレンド・高齢化率・将来推計を要約）

## 4. SDL指標（価値共創スコア）
（タッチポイント・LINE相談データからSDLスコアと主要な接点を整理）

## 5. 課題と対応方針（3点以内）
（データから読み取れる課題を具体的に。次月のアクションを提示）

## 6. 参考: 類似自治体との比較
（比較分析データがあれば要点を1〜2行で記載）

※ 数値は必ず元データから引用し、根拠を示すこと。
※ 議会議員が理解できる平易な日本語で記述すること。
`,
  },

  sdl_proposal: {
    label: 'SDL政策提言書',
    prompt: (ctx, profile, period) => `
あなたはService Dominant Logic（SDL）の専門家AIです。
以下の蓄積データを基に、SDL五軸に基づく政策提言書を作成してください。

【対象期間】${period}
【自治体情報】
${profile}

【蓄積データ】
${ctx}

## 出力形式

# SDL価値共創に基づく政策提言書
## 〜${profile.split('\n')[0] || '自治体'} Well-Being向上計画〜

## エグゼクティブサマリー（200字以内）

## SDL五軸 現状分析

### 【共創軸】住民・職員・行政の協働状況
（現状スコア・課題・改善提言）

### 【文脈軸】住民生活文脈への適合度
（現状スコア・課題・改善提言）

### 【資源軸】地域資源・外部連携の活用
（現状スコア・課題・改善提言）

### 【統合軸】サービス横断連携の状況
（現状スコア・課題・改善提言）

### 【価値軸】住民Well-Beingの実現度
（現状スコア・課題・改善提言）

## 優先施策 TOP3（実施期間・期待効果付き）

## 類似自治体からの示唆
（集合知ナレッジ・比較分析データがあれば活用）

## 実装ロードマップ（概略）

※ 各提言は「明日から実行できる具体性」を持たせること。
`,
  },

  executive_brief: {
    label: '首長向けブリーフィング',
    prompt: (ctx, profile, period) => `
あなたは自治体の首長補佐AIです。
多忙な首長が3分で読める、A4一枚相当のブリーフィング資料を作成してください。

【対象期間】${period}
【自治体情報】
${profile}

【蓄積データ】
${ctx}

## 出力形式（簡潔・箇条書き中心で）

# 首長向けブリーフィング｜${period}

## 📊 今週の数字（3つだけ）
1. （最重要指標を1行で）
2. （2番目に重要な指標）
3. （注意が必要な数値）

## ✅ 進捗良好な取り組み（2点）
・
・

## ⚠️ 要判断・要対応事項（2点以内）
・（何を、いつまでに判断するか）
・

## 🔍 類似自治体の動向（1点）
・（比較分析・集合知から1つ）

## 今週の推奨アクション（1つだけ）
→

※ 数値は具体的に。曖昧な表現は使わないこと。
※ 判断が必要な事項は選択肢を2つ提示すること。
`,
  },

  fiscal_report: {
    label: '財政状況報告書',
    prompt: (ctx, profile, period) => `
あなたは自治体財政の分析AIです。
以下のデータから財政状況報告書を作成してください。

【対象期間】${period}
【自治体情報】
${profile}

【蓄積データ】
${ctx}

## 出力形式

# 財政状況報告書｜${period}

## 1. 財政力指数・概況
（比較分析データから財政力指数を取り上げ、類似自治体比較を含める）

## 2. 収益構造分析
（収益データから種別・地域タイプ別・基準値比較を整理）
| 収益種別 | 数値 | 基準比 | 評価 |
|---------|------|--------|------|

## 3. AI示唆のポイント
（収益データのAI示唆フィールドから重要な示唆を3点抽出）

## 4. 類似自治体との比較
（財政力指数・Well-Beingスコアの順位と差異）

## 5. 財政改善に向けた提言（3点）
1.
2.
3.

※ 数値はすべて元データから引用すること。
※ グラフはテキストベースの表で代替すること。
`,
  },

  it_maturity_report: {
    label: 'IT運用成熟度報告書',
    prompt: (ctx, profile, period) => `
あなたはIT運用の専門家AIです。
CMDB・IT診断データからIT運用成熟度報告書を作成してください。

【対象期間】${period}
【自治体情報】
${profile}

【蓄積データ】
${ctx}

## 出力形式

# IT運用成熟度報告書｜${period}

## 1. IT資産構成サマリー
（CMDB データから総資産数・稼働状況・月額費用を整理）

## 2. リスク・注意事項
（廃棄予定・更新期限の近い資産・メンテナンス中の資産）

## 3. コスト最適化の余地
（月額費用の分析、クラウド移行の検討余地）

## 4. IT成熟度評価
（RunWithプラットフォーム記録から現在のレベルを整理）

## 5. 推奨アクション（優先度順）
1. 【緊急】
2. 【短期】
3. 【中期】

※ CMDBデータが少ない場合は「データ蓄積推奨」と明記すること。
`,
  },

  benchmark_report: {
    label: '類似自治体比較レポート',
    prompt: (ctx, profile, period) => `
あなたは自治体政策の比較分析AIです。
類似自治体との比較分析レポートを作成してください。

【対象期間】${period}
【自治体情報】
${profile}

【蓄積データ】
${ctx}

## 出力形式

# 類似自治体ベンチマーク比較レポート｜${period}

## 1. 比較対象自治体の概要
（比較分析マスタDBに登録された自治体を一覧化）

## 2. Well-Beingスコア比較
（自治体名・スコア・RunWith導入状況を表形式で）
| 自治体 | WBスコア | DXスコア | 財政力指数 | RunWith |
|-------|---------|---------|----------|---------|

## 3. 主要な差異と示唆
（3点以内で、差異の原因と自治体への示唆を）

## 4. 集合知ナレッジからの学び
（類似課題を解決した他自治体の事例を2〜3件）

## 5. 自治体が取り組むべき優先課題
（比較データから導かれる具体的アクション）

※ データがない項目は「（データなし）」と明記すること。
`,
  },
}

// ─── POST ────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const apiKey        = process.env.NOTION_API_KEY
  const anthropicKey  = process.env.ANTHROPIC_API_KEY
  if (!apiKey)       return NextResponse.json({ error: 'NOTION_API_KEY が未設定' }, { status: 500 })
  if (!anthropicKey) return NextResponse.json({ error: 'ANTHROPIC_API_KEY が未設定' }, { status: 500 })

  try {
    const body = await req.json()
    const { templateId, period } = body

    if (!templateId || !TEMPLATES[templateId]) {
      return NextResponse.json({ error: '無効なテンプレートIDです' }, { status: 400 })
    }
    if (!period?.trim()) {
      return NextResponse.json({ error: '対象期間を入力してください' }, { status: 400 })
    }

    // ── 全DBから並列でデータ収集 ──────────────────────────
    const [
      profile,
      wellBeingCtx,
      revenueCtx,
      populationCtx,
      compareCtx,
      touchpointCtx,
      lineCtx,
      cmdbCtx,
      knowledgeCtx,
    ] = await Promise.all([

      // 自治体プロフィール
      fetchProfile(apiKey),

      // WellBeingKPI
      fetchDbSummary(apiKey, DB_IDS.wellBeingKPI, 20,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p = r.properties
          const name  = p['サービス名']?.title?.[0]?.plain_text ?? ''
          const cat   = p['カテゴリ']?.select?.name ?? ''
          const score = p['wellbeing_score']?.number
          const sat   = p['満足度スコア']?.number
          const date  = p['記録日']?.date?.start ?? ''
          return `・[${cat}]${name} WB:${score ?? '—'} 満足度:${sat ?? '—'} (${date})`
        }, '住民サービスKPI'),

      // 収益データ
      fetchDbSummary(apiKey, DB_IDS.revenue, 20,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p    = r.properties
          const name = p['データ名']?.title?.[0]?.plain_text ?? ''
          const type = p['種別']?.select?.name ?? ''
          const val  = p['数値']?.number
          const base = p['比較基準値']?.number
          const unit = p['単位']?.rich_text?.[0]?.plain_text ?? ''
          const hint = p['AI示唆']?.rich_text?.[0]?.plain_text ?? ''
          let dev = ''
          if (val !== null && val !== undefined && base !== null && base !== undefined && base !== 0) {
            dev = ` 基準比:${(((val - base) / base) * 100).toFixed(1)}%`
          }
          return `・[${type}]${name} ${val ?? '—'}${unit}${dev}${hint ? ` →${hint.slice(0, 60)}` : ''}`
        }, '収益データ'),

      // 人口データ
      fetchDbSummary(apiKey, DB_IDS.population, 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p    = r.properties
          const name = p['名称']?.title?.[0]?.plain_text ?? ''
          const pop  = p['総人口']?.number
          const rate = p['高齢化率']?.number
          const year = p['年度']?.rich_text?.[0]?.plain_text ?? ''
          return `・${name}(${year}) 人口:${pop?.toLocaleString() ?? '—'}人 高齢化率:${rate ?? '—'}%`
        }, '人口データ'),

      // 比較分析
      fetchDbSummary(apiKey, DB_IDS.compare, 20,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p   = r.properties
          const name = p['自治体名']?.title?.[0]?.plain_text ?? ''
          const wb   = p['Well-Beingスコア']?.number
          const dx   = p['DX成熟度スコア']?.number
          const fis  = p['財政力指数']?.number
          const rw   = p['RunWith導入状況']?.select?.name ?? ''
          return `・${name} WB:${wb ?? '—'} DX:${dx ?? '—'} 財政力:${fis ?? '—'} RunWith:${rw}`
        }, '類似自治体比較'),

      // タッチポイント
      fetchDbSummary(apiKey, DB_IDS.touchpoints, 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p    = r.properties
          const type = p['タッチポイント種別']?.select?.name ?? ''
          const sdl  = p['SDL価値共創スコア']?.number
          const date = p['記録日時']?.date?.start ?? ''
          return `・${type} SDL:${sdl ?? '—'} (${date})`
        }, 'タッチポイント'),

      // LINE相談
      fetchDbSummary(apiKey, DB_IDS.lineConsult, 10,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p      = r.properties
          const status = p['対応状況']?.select?.name ?? ''
          const cat    = p['相談カテゴリ']?.select?.name ?? ''
          return `・LINE相談[${cat}] 状態:${status}`
        }, 'LINE相談'),

      // CMDB
      fetchDbSummary(apiKey, DB_IDS.cmdb, 20,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p      = r.properties
          const name   = p['資産名']?.title?.[0]?.plain_text ?? ''
          const type   = p['資産種別']?.select?.name ?? ''
          const status = p['稼働状態']?.select?.name ?? ''
          const cost   = p['月額費用（円）']?.number
          return `・[${type}]${name} ${status}${cost ? ` 月額:${cost.toLocaleString()}円` : ''}`
        }, 'IT資産'),

      // 集合知ナレッジ
      fetchDbSummary(apiKey, DB_IDS.knowledge, 5,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (r: any) => {
          const p      = r.properties
          const title  = p['タイトル']?.title?.[0]?.plain_text ?? ''
          const effect = p['得られた効果']?.rich_text?.[0]?.plain_text ?? ''
          return `・${title}${effect ? ` →効果:${effect.slice(0, 60)}` : ''}`
        }, '集合知ナレッジ'),
    ])

    // ── RAGコンテキスト組み立て ──────────────────────────
    const context = `
■ 住民サービスKPI・Well-Beingスコア:
${wellBeingCtx}

■ 収益・財政データ:
${revenueCtx}

■ 人口・地域データ:
${populationCtx}

■ 類似自治体比較:
${compareCtx}

■ タッチポイント記録:
${touchpointCtx}

■ LINE相談状況:
${lineCtx}

■ IT資産（CMDB）:
${cmdbCtx}

■ 集合知ナレッジ（他自治体事例）:
${knowledgeCtx}
`

    // ── テンプレートのプロンプト生成 ──────────────────────
    const template = TEMPLATES[templateId]
    const userPrompt = template.prompt(context, profile, period)

    // ── Claude API 呼び出し ───────────────────────────────
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method:  'POST',
      headers: {
        'x-api-key':         anthropicKey,
        'anthropic-version': '2023-06-01',
        'Content-Type':      'application/json',
      },
      body: JSON.stringify({
        model:      'claude-opus-4-5',
        max_tokens: 4000,       // 長文文書のため多めに確保
        system:     'あなたは日本の地方自治体の政策立案・行政文書作成を支援するAIです。与えられたデータを正確に参照し、根拠のある文書を作成してください。架空のデータは使わず、データがない項目は（データなし）と明記してください。',
        messages:   [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!claudeRes.ok) {
      const errText = await claudeRes.text()
      return NextResponse.json({ error: `Claude APIエラー: ${errText}` }, { status: 500 })
    }

    const claudeData = await claudeRes.json()
    const document   = claudeData.content?.[0]?.text ?? '（文書生成に失敗しました）'

    return NextResponse.json({
      document,
      templateLabel: template.label,
      period,
      generatedAt: new Date().toISOString(),
      dataStats: {
        wellBeingLines:   wellBeingCtx.split('\n').filter(l => l.startsWith('・')).length,
        revenueLines:     revenueCtx.split('\n').filter(l => l.startsWith('・')).length,
        compareLines:     compareCtx.split('\n').filter(l => l.startsWith('・')).length,
        knowledgeLines:   knowledgeCtx.split('\n').filter(l => l.startsWith('・')).length,
        profileSet:       profile.length > 0,
      },
    })

  } catch (err) {
    console.error('document-gen POSTエラー:', err)
    return NextResponse.json({ error: 'サーバーエラー' }, { status: 500 })
  }
}
