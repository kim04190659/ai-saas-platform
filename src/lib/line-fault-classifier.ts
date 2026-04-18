// =====================================================
//  src/lib/line-fault-classifier.ts
//  障害通報 LINE 自動分類エンジン — Sprint #28
//
//  ■ 役割
//    住民がLINEで「断水」「停電」「ガス漏れ」などを報告したとき、
//    メッセージをキーワード＋AI で自動分類し、担当課への転送情報と
//    住民向け確認メッセージを生成する。
//
//  ■ 分類フロー
//    1. isFaultReport()    : キーワード検知（障害通報かどうか判定）
//    2. classifyFault()    : AIによる詳細分類（種別・緊急度・担当課）
//    3. buildFaultReply()  : 住民へ送る確認メッセージを生成
//
//  ■ 対応障害種別
//    断水     → 上水道課
//    停電     → 電気設備課
//    ガス漏れ → ガス供給課（緊急！）
//    道路損傷 → 道路維持課
//    下水道   → 下水道課
//    橋梁     → 橋梁管理課
//    公共施設 → 公共設備（汎用）
// =====================================================

import Anthropic from '@anthropic-ai/sdk'

// ─── 障害種別の定義 ───────────────────────────────────

/** 障害種別の定義 */
export interface FaultType {
  id:          string   // 内部ID
  label:       string   // 表示名
  emoji:       string   // 絵文字
  dept:        string   // 担当課名
  deptId:      string   // 担当課ID（infrastructureモジュールの deptId）
  urgency:     'critical' | 'high' | 'normal'  // 緊急度
  keywords:    string[] // キーワード（マッチ用）
}

/** 分類結果 */
export interface FaultClassification {
  isFault:      boolean         // 障害通報と判定したか
  faultType:    FaultType       // 障害種別
  urgency:      'critical' | 'high' | 'normal'
  location:     string          // 住民が報告した場所（AIで抽出）
  detail:       string          // AIが整理した障害の詳細
  replyMessage: string          // 住民に送る確認メッセージ（LINE用）
  notionTitle:  string          // Notionページタイトル
}

// ─── 障害種別マスター ─────────────────────────────────

export const FAULT_TYPES: FaultType[] = [
  {
    id:       'gas_leak',
    label:    'ガス漏れ',
    emoji:    '🔥',
    dept:     'ガス供給課',
    deptId:   'infrastructure',
    urgency:  'critical',
    keywords: ['ガス漏れ', 'ガスの臭い', 'ガスが漏', 'ガス臭', 'ガスくさい', 'ガスもれ'],
  },
  {
    id:       'water_outage',
    label:    '断水',
    emoji:    '🚰',
    dept:     '上水道課',
    deptId:   'infrastructure',
    urgency:  'high',
    keywords: ['断水', '水が出ない', '水道が止', '水が来ない', '水が出なく', '断水中', '水道断水'],
  },
  {
    id:       'power_outage',
    label:    '停電',
    emoji:    '⚡',
    dept:     '電気設備課',
    deptId:   'infrastructure',
    urgency:  'high',
    keywords: ['停電', '電気が来ない', '電気が止', '電気が切れ', '電灯が', '街灯が', '信号が消え'],
  },
  {
    id:       'road_damage',
    label:    '道路損傷',
    emoji:    '🛣️',
    dept:     '道路維持課',
    deptId:   'infrastructure',
    urgency:  'high',
    keywords: ['道路が陥没', '道路に穴', '道路が壊', '路面が', '道に穴', '道路陥没', '道路崩落', '道が陥没', '道路が欠け', '道路損傷', '舗装が'],
  },
  {
    id:       'sewer',
    label:    '下水道',
    emoji:    '🔧',
    dept:     '下水道課',
    deptId:   'infrastructure',
    urgency:  'normal',
    keywords: ['下水道', '下水が詰', '排水溝', '排水が詰', '下水があふれ', '汚水が', '排水管'],
  },
  {
    id:       'bridge',
    label:    '橋梁損傷',
    emoji:    '🌉',
    dept:     '橋梁管理課',
    deptId:   'infrastructure',
    urgency:  'high',
    keywords: ['橋が', '橋の', '橋梁', '橋が壊', '橋に亀裂', '歩道橋'],
  },
  {
    id:       'facility',
    label:    '公共施設損傷',
    emoji:    '🏗️',
    dept:     '公共設備（汎用）',
    deptId:   'infrastructure',
    urgency:  'normal',
    keywords: ['公園が壊', '公共施設', '街路灯', '街灯が壊', 'フェンスが壊', '遊具が', 'ブロック塀'],
  },
]

// 「障害通報」全体を検知するキーワード（FAULT_TYPESのkeywordsとは別に使う）
const FAULT_TRIGGER_KEYWORDS = [
  '障害', '通報', '緊急', '危険', '困っています', '困ってます',
  '修理', '修繕', '対応', '直し', '確認', '故障',
  ...FAULT_TYPES.flatMap(f => f.keywords),
]

// ─── キーワード検知 ────────────────────────────────────

/**
 * メッセージが障害通報かどうかをキーワードで判定する。
 * AI呼び出し前の軽量フィルターとして使う。
 */
export function isFaultReport(text: string): boolean {
  return FAULT_TRIGGER_KEYWORDS.some(kw => text.includes(kw))
}

/**
 * キーワードマッチで障害種別を推定する（AIフォールバック用の事前判定）。
 * 完全一致優先（ガス漏れは最も危険なので最初にチェック）
 */
function detectFaultTypeByKeyword(text: string): FaultType {
  for (const ft of FAULT_TYPES) {
    if (ft.keywords.some(kw => text.includes(kw))) {
      return ft
    }
  }
  // マッチしなければ汎用設備として分類
  return FAULT_TYPES[FAULT_TYPES.length - 1]
}

// ─── AI分類 ───────────────────────────────────────────

/**
 * Claude Haiku を使って障害通報を詳細分類し、
 * 担当課・緊急度・場所・詳細・住民への返信メッセージを生成する。
 */
export async function classifyFault(
  text:         string,
  anthropicKey: string,
): Promise<FaultClassification> {

  // キーワードでまず事前分類（AI失敗時のフォールバック用）
  const keywordType = detectFaultTypeByKeyword(text)

  try {
    const anthropic = new Anthropic({ apiKey: anthropicKey })

    const faultTypeList = FAULT_TYPES.map(f =>
      `- ${f.emoji}${f.label}（担当: ${f.dept}、緊急度: ${f.urgency === 'critical' ? '最優先' : f.urgency === 'high' ? '高' : '通常'}）`
    ).join('\n')

    const prompt = `あなたは屋久島町のインフラ障害通報システムです。
住民からの以下のLINEメッセージを分析してください。

【受信メッセージ】
${text}

【分類可能な障害種別】
${faultTypeList}

以下の形式で正確に回答してください：

障害種別ID: [以下から1つ選択: gas_leak / water_outage / power_outage / road_damage / sewer / bridge / facility]
緊急度: [critical / high / normal]
場所: [住民が言及した場所・地名・住所を抽出。不明なら「場所不明」]
詳細: [障害の内容を1文で整理]
住民返信: [住民への確認メッセージ（50文字以内）。受付番号・対応予定を含め、丁寧に]`

    const res = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 300,
      messages:   [{ role: 'user', content: prompt }],
    })

    const aiText = res.content[0].type === 'text' ? res.content[0].text : ''

    // AI出力をパース
    const typeIdMatch   = aiText.match(/障害種別ID:\s*(\w+)/)
    const urgencyMatch  = aiText.match(/緊急度:\s*(critical|high|normal)/)
    const locationMatch = aiText.match(/場所:\s*(.+)/)
    const detailMatch   = aiText.match(/詳細:\s*(.+)/)
    const replyMatch    = aiText.match(/住民返信:\s*(.+)/)

    const faultTypeId = typeIdMatch?.[1] ?? keywordType.id
    const faultType   = FAULT_TYPES.find(f => f.id === faultTypeId) ?? keywordType
    const urgency     = (urgencyMatch?.[1] ?? faultType.urgency) as FaultClassification['urgency']
    const location    = locationMatch?.[1]?.trim() ?? '場所不明'
    const detail      = detailMatch?.[1]?.trim()   ?? text.slice(0, 80)

    // 返信メッセージ（AI生成 or デフォルト）
    const aiReply   = replyMatch?.[1]?.trim()
    const urgencyLabel = urgency === 'critical' ? '🔥 緊急対応します' : urgency === 'high' ? '早急に確認します' : '確認・対応いたします'
    const replyMessage = aiReply
      ?? `【屋久島町 障害通報受付】\n${faultType.emoji}${faultType.label}の通報を受け付けました。\n${urgencyLabel}。担当の${faultType.dept}に転送しました。\n（屋久島町 公共設備管理室）`

    const notionTitle = `${faultType.emoji}${faultType.label}通報: ${location}`

    return {
      isFault:      true,
      faultType,
      urgency,
      location,
      detail,
      replyMessage: buildFaultReply(faultType, urgency, location, replyMessage),
      notionTitle,
    }

  } catch (e) {
    console.error('[fault-classifier] AI分類エラー:', e)

    // AI失敗時はキーワード分類でフォールバック
    return {
      isFault:      true,
      faultType:    keywordType,
      urgency:      keywordType.urgency,
      location:     '（場所不明）',
      detail:       text.slice(0, 100),
      replyMessage: buildFaultReply(keywordType, keywordType.urgency, '場所不明', undefined),
      notionTitle:  `${keywordType.emoji}${keywordType.label}通報`,
    }
  }
}

// ─── 住民返信メッセージ生成 ────────────────────────────

/**
 * 障害通報に対して住民に送る確認メッセージを組み立てる。
 * LINE のテキスト制限（5000文字）内に収める。
 */
export function buildFaultReply(
  faultType:   FaultType,
  urgency:     'critical' | 'high' | 'normal',
  location:    string,
  aiMessage?:  string,
): string {

  if (aiMessage && aiMessage.length > 10) return aiMessage

  const now         = new Date()
  const timeStr     = now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tokyo' })
  const urgencyNote =
    urgency === 'critical' ? '🔥 緊急事態です。直ちに担当班に通知しました。' :
    urgency === 'high'     ? '⚠️ 早急に現地確認の手配をします。' :
                             '📋 順次確認・対応いたします。'

  return (
    `【屋久島町 公共設備 障害通報受付】\n` +
    `\n` +
    `${faultType.emoji} 種別: ${faultType.label}\n` +
    `📍 場所: ${location}\n` +
    `🕐 受付時刻: ${timeStr}\n` +
    `\n` +
    `${urgencyNote}\n` +
    `担当: ${faultType.dept}\n` +
    `\n` +
    `追加情報（写真・詳細な場所など）があればこのチャットに送信してください。\n` +
    `（屋久島町 公共設備管理室）`
  )
}

// ─── Notion障害通報DBへの記録 ─────────────────────────

// 障害通報Notionページの親ページID（RunWithルートページ）
const FAULT_DB_PARENT_PAGE_ID = '338960a91e23813f9402f53e5240e029'
const NOTION_API_BASE         = 'https://api.notion.com/v1'
const NOTION_VERSION          = '2022-06-28'

function notionHeaders(apiKey: string) {
  return {
    'Authorization':  `Bearer ${apiKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// 環境変数で障害通報DBのIDを管理（初回は patch-notion-db で作成）
// なければページとして作成する
const FAULT_REPORT_DB_ID = process.env.FAULT_REPORT_DB_ID ?? ''

/**
 * 障害通報をNotionに記録する。
 * FAULT_REPORT_DB_ID が設定済みならDBレコードとして、
 * 未設定なら親ページ配下にページとして作成する。
 */
export async function saveFaultReport(params: {
  notionKey:   string
  title:       string
  detail:      string
  faultType:   FaultType
  urgency:     'critical' | 'high' | 'normal'
  location:    string
  messageText: string
  lineUserId:  string
  reportedAt:  string
}): Promise<{ id: string; url: string } | null> {
  const { notionKey } = params

  const urgencyLabel =
    params.urgency === 'critical' ? '最優先（ガス漏れ等）' :
    params.urgency === 'high'     ? '高（断水・停電等）' : '通常'

  const statusLabel =
    params.urgency === 'critical' ? '緊急対応中' : '未対応'

  try {
    // ── DBレコードとして保存（FAULT_REPORT_DB_ID が設定済みの場合） ──
    if (FAULT_REPORT_DB_ID) {
      const res = await fetch(`${NOTION_API_BASE}/pages`, {
        method:  'POST',
        headers: notionHeaders(notionKey),
        body: JSON.stringify({
          parent: { database_id: FAULT_REPORT_DB_ID },
          icon:   { emoji: params.faultType.emoji },
          properties: {
            '通報件名':    { title:     [{ text: { content: params.title } }] },
            '障害種別':    { select:    { name: params.faultType.label } },
            '緊急度':      { select:    { name: urgencyLabel } },
            '対応状況':    { select:    { name: statusLabel } },
            '発生場所':    { rich_text: [{ text: { content: params.location } }] },
            '詳細':        { rich_text: [{ text: { content: params.detail } }] },
            '担当課':      { rich_text: [{ text: { content: params.faultType.dept } }] },
            '通報日時':    { date:      { start: params.reportedAt } },
            'LINE_UserID': { rich_text: [{ text: { content: params.lineUserId } }] },
          },
        }),
      })
      if (res.ok) {
        const page = await res.json()
        return { id: page.id, url: page.url }
      }
    }

    // ── ページとして保存（DBが未設定の場合のフォールバック） ──
    const content =
      `> 📅 通報日時: ${new Date(params.reportedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}\n` +
      `> 緊急度: ${urgencyLabel} | 担当: ${params.faultType.dept}\n\n` +
      `## 通報内容\n\n${params.messageText}\n\n` +
      `## AI整理\n\n` +
      `- **障害種別**: ${params.faultType.emoji} ${params.faultType.label}\n` +
      `- **発生場所**: ${params.location}\n` +
      `- **詳細**: ${params.detail}\n\n` +
      `## 対応状況\n\n- [ ] 現地確認\n- [ ] 修繕対応\n- [ ] 完了報告`

    const res = await fetch(`${NOTION_API_BASE}/pages`, {
      method:  'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        parent:     { page_id: FAULT_DB_PARENT_PAGE_ID },
        icon:       { emoji: params.faultType.emoji },
        properties: {
          title: [{ text: { content: params.title } }],
        },
        children: [{
          object:    'block',
          type:      'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: content } }] },
        }],
      }),
    })

    if (!res.ok) {
      console.error('[fault-classifier] Notion保存失敗:', res.status, await res.text())
      return null
    }

    const page = await res.json()
    return { id: page.id, url: page.url }

  } catch (e) {
    console.error('[fault-classifier] Notion保存エラー:', e)
    return null
  }
}
