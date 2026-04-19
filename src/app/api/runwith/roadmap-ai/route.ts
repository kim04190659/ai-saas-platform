// =====================================================
//  src/app/api/runwith/roadmap-ai/route.ts
//  組織設計ウィザード：AIロードマップ生成 API
//
//  ■ エンドポイント
//    POST /api/runwith/roadmap-ai
//
//  ■ リクエスト
//    { orgName, challenges[], priorityReason, orgContext, itCount, itLevel, vision }
//
//  ■ レスポンス
//    { success, roadmap: RoadmapData }
//
//  ■ 処理概要
//    選択された優先課題とIT担当体制をもとに、Claude Haiku が
//    3フェーズの導入ロードマップをJSON形式で生成する。
//    フェーズ設計の原則：
//      Phase 1（〜3ヶ月）: 最優先課題の基盤機能に絞る
//      Phase 2（3〜6ヶ月）: Phase 1 効果確認後に機能拡張
//      Phase 3（6ヶ月〜）: 地域固有課題への独自拡張
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

// ─── 課題ラベル ────────────────────────────────────────

/** 課題ID → 日本語ラベル（フロントの CHALLENGES 定義と対応） */
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

/** 課題ID → RunWith Platform で利用できる機能一覧 */
const CHALLENGE_FEATURES: Record<string, string> = {
  citizen_service:
    '住民サービス状況ダッシュボード / LINE相談管理 / AI窓口即時提案 / 住民プッシュ通知 / タッチポイント記録',
  staff_burnout:
    '職員コンディション管理 / 予兆検知ダッシュボード / 離職リスクスコアリング / 1on1リマインド自動化 / LINE業務対応',
  population_decline:
    '人口・地域データ分析 / 縮小シナリオシミュレーション / 類似自治体比較 / AI政策文書生成 / 地区Well-Being分析',
  infra_aging:
    '設備稼働・点検状況管理 / インフラ老朽化アラート（毎週自動検知） / AI設備維持管理提言 / 障害通報LINE受付',
  waste_management:
    'ごみ管理最適化（収集ルート分析 / 焼却施設稼働率分析 / AI最適化3シナリオ提言）',
  healthcare:
    '医療従事者コンディション管理 / 高齢者Well-Beingモニタリング / 介護サービス連携管理 / 医療サービス状況',
  education:
    '教職員コンディション管理 / 児童・生徒Well-Being / 学校サービス状況 / AI教育政策提言',
  safety:
    '隊員コンディション管理 / インシデント・出動記録 / 地域安全ダッシュボード / 防災・避難情報管理',
  finance:
    '収益・財政データ分析 / AI政策文書生成 / 週次サマリー自動生成 / Well-Beingダッシュボード',
  dx_data:
    'Well-Beingダッシュボード統合 / AI Well-Being顧問 / KPIモニタリング / 週次WBサマリー生成 / AI政策文書生成',
}

// ─── 型定義（フロントからも import して使用） ──────────

/** ロードマップの1フェーズ */
export interface RoadmapPhase {
  period:   string    // 例: "〜3ヶ月"
  title:    string    // フェーズタイトル
  goal:     string    // このフェーズで達成すること
  features: string[]  // 導入する機能名
  actions:  string[]  // 具体的アクション
  kpi:      string    // 達成KPI（数値目標）
}

/** AIが生成するロードマップ全体 */
export interface RoadmapData {
  overview:    string    // 全体方針サマリー
  phase1:      RoadmapPhase
  phase2:      RoadmapPhase
  phase3:      RoadmapPhase
  notionSetup: string[]  // 最初に構築するNotionDB
  risks:       string[]  // 実施リスク（対策込み）
}

/** リクエストボディ */
interface RequestBody {
  orgName:        string    // 組織名・自治体名
  challenges:     string[]  // 選択された課題ID（最大3つ）
  priorityReason: string    // 課題を優先する理由
  orgContext:     string    // 組織の背景・文脈（D-1）
  itCount:        string    // IT担当者数
  itLevel:        string    // IT技術レベル
  vision:         string    // 半年後のビジョン（D-3）
}

// ─── メインハンドラ ────────────────────────────────────

export async function POST(req: NextRequest) {
  const anthropicKey = process.env.ANTHROPIC_API_KEY ?? ''

  // リクエストボディ取得
  let body: RequestBody
  try {
    body = await req.json() as RequestBody
  } catch {
    return NextResponse.json({ success: false, error: 'リクエスト解析エラー' }, { status: 400 })
  }

  // 課題ごとの利用可能機能を整形
  const challengeLines = body.challenges.map(c => {
    const label    = CHALLENGE_LABELS[c]    ?? c
    const features = CHALLENGE_FEATURES[c] ?? '基本機能'
    return `・${label}: 利用可能機能 → ${features}`
  })

  // Claude Haiku へのプロンプト構築
  const prompt = [
    'あなたはRunWith Platformの導入コンサルタントです。',
    '以下の自治体情報をもとに、実現可能な3フェーズ導入ロードマップをJSON形式のみで返してください。',
    '',
    `【組織名】${body.orgName}`,
    '',
    `【優先課題（${body.challenges.length}つ）と利用可能機能】`,
    ...challengeLines,
    '',
    `【課題を優先する理由】${body.priorityReason || '未記入'}`,
    `【組織の背景・文脈】${body.orgContext || '未記入'}`,
    `【IT担当体制】担当者数: ${body.itCount || '不明'} / 技術レベル: ${body.itLevel || '初中級'}`,
    `【半年後のビジョン】${body.vision || '未記入'}`,
    '',
    '【ロードマップ設計の原則（文字数を必ず守ること）】',
    '- Phase 1（〜3ヶ月）: 最優先課題の基盤機能に絞る。IT担当が少ない・初級の場合は2機能以下。',
    '- Phase 2（3〜6ヶ月）: Phase 1で効果確認後に拡張する機能群を追加する。',
    '- Phase 3（6ヶ月〜）: 地域固有課題への独自拡張・データ高度活用フェーズ。',
    '- 各フェーズに達成KPI（数値目標）を1つ必ず設定する。',
    '- featuresは利用可能機能から選ぶこと（各フェーズ最大3項目）。',
    '- actionsは各フェーズ最大3項目、1項目あたり30文字以内。',
    '- goal・overviewは各50文字以内。kpiは30文字以内。',
    '- notionSetupは3項目以内。risksは2項目以内（各40文字以内）。',
    '',
    '【出力形式（必ずJSONのみで返すこと。マークダウン・説明文は一切不要）】',
    '{',
    '  "overview": "全体方針（50字以内）",',
    '  "phase1": {',
    '    "period": "〜3ヶ月",',
    '    "title": "フェーズタイトル（20字以内）",',
    '    "goal": "達成目標（50字以内）",',
    '    "features": ["機能1", "機能2", "機能3"],',
    '    "actions": ["アクション1（30字以内）", "アクション2", "アクション3"],',
    '    "kpi": "達成KPI（30字以内）"',
    '  },',
    '  "phase2": { "period": "3〜6ヶ月", "title": "20字以内", "goal": "50字以内", "features": ["機能1","機能2","機能3"], "actions": ["30字以内","30字以内","30字以内"], "kpi": "30字以内" },',
    '  "phase3": { "period": "6ヶ月〜",  "title": "20字以内", "goal": "50字以内", "features": ["機能1","機能2","機能3"], "actions": ["30字以内","30字以内","30字以内"], "kpi": "30字以内" },',
    '  "notionSetup": ["DB名1", "DB名2", "DB名3"],',
    '  "risks": ["リスクと対策（40字以内）", "リスクと対策（40字以内）"]',
    '}',
  ].join('\n')

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })
    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 3000,   // 2000→3000: JSON切断を防ぐ
      messages:   [{ role: 'user', content: prompt }],
    })

    // トークン上限で途中切断された場合はエラーにする
    if (res.stop_reason === 'max_tokens') {
      console.warn('[roadmap-ai] max_tokens に達しました。出力が短縮されます。')
    }

    // テキスト抽出 → コードブロック除去 → JSON.parse
    const raw     = res.content[0].type === 'text' ? res.content[0].text.trim() : '{}'
    const jsonStr = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let roadmap: RoadmapData
    try {
      roadmap = JSON.parse(jsonStr) as RoadmapData
    } catch {
      // JSONが壊れている場合（トークン切断など）の詳細エラー
      console.error('[roadmap-ai] JSON解析失敗。stop_reason:', res.stop_reason)
      console.error('[roadmap-ai] 受信テキスト（先頭300字）:', raw.slice(0, 300))
      throw new Error(
        res.stop_reason === 'max_tokens'
          ? 'AIの出力がトークン上限に達しました。入力内容を短くしてから再試行してください。'
          : `JSON解析エラー: ${jsonStr.slice(0, 100)}`
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
