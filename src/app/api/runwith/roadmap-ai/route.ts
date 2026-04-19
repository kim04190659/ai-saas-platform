// =====================================================
//  src/app/api/runwith/roadmap-ai/route.ts
//  組織設計ウィザード：AIロードマップ生成 API
//
//  ■ エンドポイント
//    POST /api/runwith/roadmap-ai
//
//  ■ 出力構造（RoadmapData）
//    各フェーズに DB仕様・View仕様・AI機能仕様・アプリ画面仕様を含む。
//    この出力をそのまま次の自動化処理（DB作成・ページ生成）が読める形式。
//
//  ■ フェーズ設計原則
//    Phase 1（〜3ヶ月）: DB作成 + 既存アプリ画面で即動かす
//    Phase 2（3〜6ヶ月）: AI機能追加 + 追加DB
//    Phase 3（6ヶ月〜）: 地域固有の独自拡張・高度化
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// ─── 課題マスタ ────────────────────────────────────────

const CHALLENGE_LABELS: Record<string, string> = {
  citizen_service:    '住民サービスの質・苦情対応',
  staff_burnout:      '職員の燃え尽き・離職・人手不足',
  population_decline: '人口減少・地域縮小対応',
  infra_aging:        'インフラ老朽化・維持管理コスト',
  waste_management:   '廃棄物管理・収集の効率化',
  healthcare:         '医療・介護サービスの持続性',
  education:          '教育環境の維持・教職員支援',
  safety:             '防災・安全・緊急対応',
  finance:            '財政健全化・コスト削減',
  dx_data:            'データ化・意思決定のDX推進',
}

/** 課題 → 利用可能機能のテキスト説明（プロンプト用） */
const CHALLENGE_FEATURES: Record<string, string> = {
  citizen_service:
    '住民サービス状況ダッシュボード / LINE相談管理 / AI窓口即時提案 / 住民プッシュ通知 / タッチポイント記録',
  staff_burnout:
    '職員コンディション管理 / 予兆検知ダッシュボード / 離職リスクスコアリング / 1on1リマインド自動化',
  population_decline:
    '人口・地域データ分析 / 縮小シナリオシミュレーション / 類似自治体比較 / AI政策文書生成',
  infra_aging:
    '設備稼働・点検状況 / インフラ老朽化アラート / AI設備維持管理提言 / 障害通報LINE受付',
  waste_management:
    'ごみ管理最適化（収集ルート分析 / 焼却施設稼働率 / AI最適化3シナリオ提言）',
  healthcare:
    '医療従事者コンディション / 高齢者WellBeingモニタリング / 介護サービス連携',
  education:
    '教職員コンディション / 児童・生徒WellBeing / AI教育政策提言',
  safety:
    '隊員コンディション / インシデント・出動記録 / 防災・避難情報管理',
  finance:
    '収益・財政データ / AI政策文書生成 / 週次サマリー自動生成',
  dx_data:
    'Well-Beingダッシュボード / AI Well-Being顧問 / KPIモニタリング / AI政策文書生成',
}

/** 課題 → 利用可能な既存アプリ画面（コンポーネント名付き） */
const CHALLENGE_APP_PAGES: Record<string, string> = {
  citizen_service:
    '/citizen/services(CitizenServicesPanel,existing), /citizen/line(LineChatPanel,existing), /citizen/push(PushNotificationPanel,existing)',
  staff_burnout:
    '/staff/condition(StaffConditionPanel,existing), /staff/predictive-alerts(PredictiveAlertPanel,existing), /staff/document-generator(DocumentGeneratorPanel,existing)',
  population_decline:
    '/executive/population(PopulationPanel,existing), /executive/shrink-scenario(ShrinkScenarioPanel,existing), /executive/ai-policy(AIPolicyPanel,existing)',
  infra_aging:
    '/infrastructure/facility(FacilityPanel,existing), /infrastructure/incident(InfraIncidentPanel,existing), /infrastructure/ai-advice(AIFacilityPanel,existing)',
  waste_management:
    '/[municipality]/waste(KirishimaWastePanel,existing) ※municipality名に置き換える',
  healthcare:
    '/healthcare/staff-condition(StaffConditionPanel,existing), /healthcare/elderly(ElderlyWBPanel,existing)',
  education:
    '/education/teacher-condition(StaffConditionPanel,existing), /education/student-wb(StudentWBPanel,existing)',
  safety:
    '/safety/staff-condition(StaffConditionPanel,existing), /safety/incident(IncidentPanel,existing)',
  finance:
    '/executive/finance(FinancePanel,existing)',
  dx_data:
    '/executive/wellbeing(WellBeingDashboard,existing), /executive/ai-advisor(AIAdvisorPanel,existing)',
}

// ─── 型定義（フロント・create-hearing から import して使用） ──

/** Notion DB の仕様 */
export interface DBSpec {
  name:       string    // DB名（15字以内）
  purpose:    string    // 目的（20字以内）
  properties: string[]  // 主要カラム名リスト（最大6件）
  sampleRows: number    // デモデータ行数目安
}

/** Notion View の仕様 */
export interface ViewSpec {
  name:     string  // View名（15字以内）
  type:     string  // 'table' | 'board' | 'calendar' | 'chart'
  database: string  // 対象DB名
  filter:   string  // フィルタ条件（例: 'スコア3以下', 'なし'）
}

/** AI機能の仕様 */
export interface AIFeatureSpec {
  name:    string  // 機能名（15字以内）
  trigger: string  // 実行タイミング（例: '毎週月曜09:00', '手動'）
  action:  string  // 処理内容（40字以内）
  notify:  string  // 通知先（'LINE' | 'Notion' | 'なし'）
}

/** アプリ画面の仕様 */
export interface AppPageSpec {
  name:      string  // ページ名（15字以内）
  route:     string  // URLパス（例: '/staff/condition'）
  component: string  // コンポーネント名
  status:    string  // 'existing'（既存流用）| 'new'（新規作成）
}

/** 各フェーズの仕様（Phase 1〜3 共通構造） */
export interface RoadmapPhase {
  period:     string          // 例: '〜3ヶ月'
  title:      string          // フェーズタイトル（20字以内）
  goal:       string          // このフェーズで達成すること（50字以内）
  kpi:        string          // 達成KPI（30字以内）
  databases:  DBSpec[]        // 作成するNotionDB
  views:      ViewSpec[]      // 作成するView
  aiFeatures: AIFeatureSpec[] // 有効にするAI機能
  appPages:   AppPageSpec[]   // 有効にするアプリ画面
}

/** ロードマップ全体 */
export interface RoadmapData {
  overview: string         // 全体方針サマリー（50字以内）
  phase1:   RoadmapPhase   // 詳細仕様あり
  phase2:   RoadmapPhase   // 中程度の詳細
  phase3:   RoadmapPhase   // 方向性のみ
  risks:    string[]       // 実施リスク（40字以内 × 2件）
}

// ─── リクエスト型 ──────────────────────────────────────

interface RequestBody {
  orgName:        string
  challenges:     string[]
  priorityReason: string
  orgContext:     string
  itCount:        string
  itLevel:        string
  vision:         string
}

// ─── メインハンドラ ────────────────────────────────────

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ success: false, error: 'リクエスト解析エラー' }, { status: 400 })
  }

  // 課題ごとの情報を整形
  const challengeLines = body.challenges.map(c => {
    const label    = CHALLENGE_LABELS[c]    ?? c
    const features = CHALLENGE_FEATURES[c] ?? '基本機能'
    const pages    = CHALLENGE_APP_PAGES[c] ?? 'なし'
    return [
      `・課題: ${label}`,
      `  利用可能機能: ${features}`,
      `  既存アプリ画面: ${pages}`,
    ].join('\n')
  })

  const prompt = [
    'あなたはRunWith Platformの導入設計の専門家です。',
    '以下の自治体情報をもとに、DB作成・View設計・AI機能・アプリ画面を含む',
    '具体的な3フェーズ導入仕様書をJSON形式のみで返してください。',
    '',
    `【組織名】${body.orgName}`,
    `【IT担当体制】担当者数: ${body.itCount || '不明'} / 技術レベル: ${body.itLevel || '初中級'}`,
    `【半年後のビジョン】${body.vision || '未記入'}`,
    `【課題背景】${body.orgContext || '未記入'}`,
    '',
    `【優先課題と利用可能リソース】`,
    ...challengeLines,
    '',
    '【設計ルール（必ず守ること）】',
    '- Phase 1: DB 2〜3件、View 2〜3件、AI機能 1〜2件、アプリ画面 2〜3件。IT初級なら DB 2件・アプリ2件に絞る。',
    '- Phase 2: DB 1〜2件、View 1〜2件、AI機能 1件、アプリ画面 1〜2件。',
    '- Phase 3: DB 0〜1件、View 0〜1件、AI機能 0〜1件、アプリ画面 0〜1件。方向性重視。',
    '- appPages の route は必ず上記「既存アプリ画面」から選ぶ（status: "existing"）。',
    '  新規作成が必要な場合のみ status: "new" とし route を命名する。',
    '- waste_management 選択時は route の [municipality] を実際の組織名（英小文字）に置き換える。',
    '- 各テキストフィールドの文字数制限を厳守する。',
    '- properties は日本語カラム名を最大6件（短く簡潔に）。',
    '- sampleRows は 3〜5 の整数。',
    '- filter は "スコア3以下" "ステータス:未対応" "なし" のような短い文字列。',
    '',
    '【出力JSONフォーマット（これ以外の出力は一切不要）】',
    '{',
    '  "overview": "全体方針（50字以内）",',
    '  "phase1": {',
    '    "period": "〜3ヶ月",',
    '    "title": "フェーズタイトル（20字以内）",',
    '    "goal": "達成目標（50字以内）",',
    '    "kpi": "達成KPI（30字以内）",',
    '    "databases": [',
    '      { "name": "DB名(15字)", "purpose": "目的(20字)", "properties": ["カラム1","カラム2","カラム3","カラム4","カラム5"], "sampleRows": 3 }',
    '    ],',
    '    "views": [',
    '      { "name": "View名(15字)", "type": "table|board|calendar|chart", "database": "対象DB名", "filter": "条件またはなし" }',
    '    ],',
    '    "aiFeatures": [',
    '      { "name": "機能名(15字)", "trigger": "毎週月曜|毎日|手動", "action": "処理内容(40字)", "notify": "LINE|Notion|なし" }',
    '    ],',
    '    "appPages": [',
    '      { "name": "ページ名(15字)", "route": "/パス", "component": "コンポーネント名", "status": "existing|new" }',
    '    ]',
    '  },',
    '  "phase2": { "period": "3〜6ヶ月", "title": "...", "goal": "...", "kpi": "...",',
    '    "databases": [...], "views": [...], "aiFeatures": [...], "appPages": [...] },',
    '  "phase3": { "period": "6ヶ月〜", "title": "...", "goal": "...", "kpi": "...",',
    '    "databases": [], "views": [], "aiFeatures": [...], "appPages": [] },',
    '  "risks": ["リスクと対策(40字)", "リスクと対策(40字)"]',
    '}',
  ].join('\n')

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 4000,
      messages:   [{ role: 'user', content: prompt }],
    })

    // トークン上限警告
    if (res.stop_reason === 'max_tokens') {
      console.warn('[roadmap-ai] max_tokens に達しました')
    }

    const raw     = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let roadmap: RoadmapData
    try {
      roadmap = JSON.parse(jsonStr) as RoadmapData
    } catch {
      console.error('[roadmap-ai] JSON解析失敗。stop_reason:', res.stop_reason)
      console.error('[roadmap-ai] 受信テキスト（先頭300字）:', raw.slice(0, 300))
      throw new Error(
        res.stop_reason === 'max_tokens'
          ? 'AIの出力がトークン上限に達しました。入力内容を短くしてから再試行してください。'
          : `JSON解析エラー（出力の先頭: ${raw.slice(0, 80)}）`
      )
    }

    return NextResponse.json({ success: true, roadmap })

  } catch (e) {
    console.error('[roadmap-ai] エラー:', e)
    return NextResponse.json(
      { success: false, error: e instanceof Error ? e.message : String(e) },
      { status: 500 }
    )
  }
}
