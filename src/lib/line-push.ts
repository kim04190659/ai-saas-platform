// =====================================================
//  src/lib/line-push.ts
//  LINE プッシュ通知ライブラリ — Sprint #29
//
//  ■ 役割
//    住民へのプロアクティブな通知を送信するための
//    LINE Messaging API ラッパー。
//
//  ■ 3つの送信モード
//    broadcast  : LINE公式アカウントの全フォロワーに一斉送信
//                 → 緊急アラート・行事案内・設備メンテ情報
//    multicast  : 指定したユーザーID一覧に送信（最大500件/回）
//                 → 手続き期限リマインド・個別通知
//    push       : 特定の1ユーザーに送信
//                 → 問い合わせ後のフォローアップ
//
//  ■ メッセージテンプレート
//    NOTIFICATION_TEMPLATES に定義した5種のテンプレートから
//    プレースホルダー置換で本文を組み立てる。
//
//  ■ 環境変数
//    LINE_CHANNEL_ACCESS_TOKEN: 送信用トークン
// =====================================================

// ─── LINE API エンドポイント ──────────────────────────

const LINE_API_BROADCAST  = 'https://api.line.me/v2/bot/message/broadcast'
const LINE_API_MULTICAST  = 'https://api.line.me/v2/bot/message/multicast'
const LINE_API_PUSH       = 'https://api.line.me/v2/bot/message/push'

// ─── 型定義 ──────────────────────────────────────────

/** LINE テキストメッセージ */
export interface LineTextMessage {
  type: 'text'
  text: string
}

/** 送信結果 */
export interface PushResult {
  success:   boolean
  mode:      'broadcast' | 'multicast' | 'push'
  recipients?: number   // multicast の場合の送信人数
  error?:    string
}

/** 通知テンプレートの種別 */
export type NotificationTemplate =
  | 'emergency_alert'     // 🚨 緊急・災害アラート
  | 'deadline_reminder'   // 📋 手続き期限リマインド
  | 'announcement'        // 📢 一般お知らせ
  | 'maintenance'         // 🔧 設備メンテナンス
  | 'seasonal_welfare'    // 🌿 季節別福祉サービス案内

/** テンプレートのパラメータ（種別によって異なる） */
export interface TemplateParams {
  // emergency_alert
  alertType?:    string   // 例: '断水', '避難勧告', '停電'
  area?:         string   // 例: '安房地区', '屋久島町全域'
  detail?:       string   // 詳細説明
  contact?:      string   // 問い合わせ先

  // deadline_reminder
  serviceName?:  string   // 例: '国民健康保険', '介護認定更新'
  deadline?:     string   // 例: '2026年5月31日'
  daysLeft?:     number   // 残り日数
  office?:       string   // 担当窓口

  // announcement
  title?:        string   // お知らせタイトル
  body?:         string   // 本文
  url?:          string   // 詳細URL（任意）

  // maintenance
  facility?:     string   // 例: '安房地区 上水道'
  startDate?:    string   // 作業開始
  endDate?:      string   // 作業終了
  impact?:       string   // 影響内容

  // seasonal_welfare
  season?:       string   // 例: '冬', '夏'
  serviceList?:  string[] // サービス一覧
}

// ─── 通知テンプレート定義 ─────────────────────────────

/**
 * 通知テンプレートからメッセージ本文を組み立てる。
 * プレースホルダーが足りない場合はデフォルト値を使用する。
 */
export function buildNotificationText(
  template: NotificationTemplate,
  params:   TemplateParams,
): string {
  const footer = '\n\n（屋久島町）'

  switch (template) {
    case 'emergency_alert':
      return (
        `🚨【緊急情報】${params.alertType ?? '緊急事態'}のお知らせ\n` +
        `\n` +
        `対象地域: ${params.area ?? '屋久島町全域'}\n` +
        `\n` +
        `${params.detail ?? '詳細は町のホームページをご確認ください。'}\n` +
        `\n` +
        `📞 問い合わせ: ${params.contact ?? '屋久島町役場 0997-46-2111'}` +
        footer
      )

    case 'deadline_reminder':
      return (
        `📋【手続き期限のお知らせ】\n` +
        `\n` +
        `「${params.serviceName ?? '各種手続き'}」の期限が近づいています。\n` +
        `\n` +
        `⏰ 期限: ${params.deadline ?? '今月末'}\n` +
        (params.daysLeft !== undefined
          ? `（あと ${params.daysLeft} 日）\n`
          : '') +
        `\n` +
        `お手続きは窓口・オンラインで受け付けています。\n` +
        `担当窓口: ${params.office ?? '住民課（0997-46-2111）'}` +
        footer
      )

    case 'announcement':
      return (
        `📢【お知らせ】${params.title ?? ''}\n` +
        `\n` +
        `${params.body ?? ''}` +
        (params.url ? `\n\n🔗 詳細: ${params.url}` : '') +
        footer
      )

    case 'maintenance':
      return (
        `🔧【設備メンテナンスのお知らせ】\n` +
        `\n` +
        `対象設備: ${params.facility ?? '公共設備'}\n` +
        `作業期間: ${params.startDate ?? ''}〜${params.endDate ?? ''}\n` +
        `\n` +
        `影響: ${params.impact ?? '作業中は一時的にサービスを停止します。'}\n` +
        `ご不便をおかけしますが、ご協力をお願いします。` +
        footer
      )

    case 'seasonal_welfare':
      const services = params.serviceList ?? []
      const serviceText = services.length > 0
        ? services.map(s => `  ・${s}`).join('\n')
        : '  詳細は担当窓口へお問い合わせください。'
      return (
        `🌿【${params.season ?? ''}の福祉サービスのご案内】\n` +
        `\n` +
        `以下のサービスをご利用いただけます：\n` +
        serviceText + '\n' +
        `\n` +
        `詳細・申込: 福祉課（0997-46-2111）` +
        footer
      )

    default:
      return params.body ?? ''
  }
}

// ─── LINE 送信ヘルパー ────────────────────────────────

function lineHeaders(accessToken: string): Record<string, string> {
  return {
    'Authorization': `Bearer ${accessToken}`,
    'Content-Type':  'application/json',
  }
}

// ─── ブロードキャスト（全フォロワー一斉送信） ────────────

/**
 * LINE公式アカウントの全フォロワーにメッセージを送信する。
 * 緊急アラート・全町向けお知らせに使用。
 *
 * ※ LINE Messaging API の broadcast は月5000通まで無料（Freeプラン）
 *    それ以上は有料プランが必要。
 */
export async function broadcastMessage(
  text:        string,
  accessToken: string,
): Promise<PushResult> {
  if (!accessToken) {
    return { success: false, mode: 'broadcast', error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }
  }

  try {
    const res = await fetch(LINE_API_BROADCAST, {
      method:  'POST',
      headers: lineHeaders(accessToken),
      body: JSON.stringify({
        messages: [{ type: 'text', text }],
      }),
    })

    if (res.ok) {
      console.log('[line-push] ブロードキャスト送信成功')
      return { success: true, mode: 'broadcast' }
    } else {
      const err = await res.text()
      console.error('[line-push] ブロードキャスト失敗:', res.status, err)
      return { success: false, mode: 'broadcast', error: `${res.status}: ${err}` }
    }
  } catch (e) {
    console.error('[line-push] ブロードキャストエラー:', e)
    return { success: false, mode: 'broadcast', error: String(e) }
  }
}

// ─── マルチキャスト（特定ユーザーに送信） ────────────────

/**
 * 指定したユーザーID一覧にメッセージを送信する。
 * 手続き期限リマインドなど個別通知に使用。
 *
 * @param userIds LINE ユーザーIDの配列（最大500件）
 *                自動で500件ずつに分割して送信する。
 */
export async function multicastMessage(
  userIds:     string[],
  text:        string,
  accessToken: string,
): Promise<PushResult> {
  if (!accessToken) {
    return { success: false, mode: 'multicast', error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }
  }
  if (userIds.length === 0) {
    return { success: false, mode: 'multicast', error: '送信先ユーザーIDが0件です' }
  }

  // 500件ずつに分割
  const CHUNK_SIZE = 500
  let totalSent = 0

  try {
    for (let i = 0; i < userIds.length; i += CHUNK_SIZE) {
      const chunk = userIds.slice(i, i + CHUNK_SIZE)

      const res = await fetch(LINE_API_MULTICAST, {
        method:  'POST',
        headers: lineHeaders(accessToken),
        body: JSON.stringify({
          to:       chunk,
          messages: [{ type: 'text', text }],
        }),
      })

      if (res.ok) {
        totalSent += chunk.length
        console.log(`[line-push] マルチキャスト: ${chunk.length}件 送信成功`)
      } else {
        const err = await res.text()
        console.error('[line-push] マルチキャスト失敗:', res.status, err)
        return {
          success:    totalSent > 0,
          mode:       'multicast',
          recipients: totalSent,
          error:      `${res.status}: ${err}`,
        }
      }

      // APIレート制限対応: 200ms 待機
      if (i + CHUNK_SIZE < userIds.length) {
        await new Promise(r => setTimeout(r, 200))
      }
    }

    return { success: true, mode: 'multicast', recipients: totalSent }

  } catch (e) {
    console.error('[line-push] マルチキャストエラー:', e)
    return { success: false, mode: 'multicast', recipients: totalSent, error: String(e) }
  }
}

// ─── プッシュ（1ユーザーに送信） ─────────────────────────

/**
 * 特定の1ユーザーにメッセージを送信する。
 * 問い合わせ後のフォローアップ・個別対応に使用。
 */
export async function pushMessage(
  userId:      string,
  text:        string,
  accessToken: string,
): Promise<PushResult> {
  if (!accessToken) {
    return { success: false, mode: 'push', error: 'LINE_CHANNEL_ACCESS_TOKEN 未設定' }
  }

  try {
    const res = await fetch(LINE_API_PUSH, {
      method:  'POST',
      headers: lineHeaders(accessToken),
      body: JSON.stringify({
        to:       userId,
        messages: [{ type: 'text', text }],
      }),
    })

    if (res.ok) {
      return { success: true, mode: 'push', recipients: 1 }
    } else {
      const err = await res.text()
      return { success: false, mode: 'push', error: `${res.status}: ${err}` }
    }
  } catch (e) {
    return { success: false, mode: 'push', error: String(e) }
  }
}

// ─── Notion 通知ログ保存 ─────────────────────────────────

const NOTION_API_BASE        = 'https://api.notion.com/v1'
const NOTION_VERSION         = '2022-06-28'
const NOTIFICATION_LOG_DB_ID = process.env.NOTIFICATION_LOG_DB_ID ?? ''  // 任意
const NOTION_PARENT_PAGE_ID  = '338960a91e23813f9402f53e5240e029'

/**
 * 送信した通知をNotionに記録する。
 * 通知ログDBが設定されていない場合はページとして保存。
 */
export async function logNotificationToNotion(params: {
  notionKey:    string
  template:     NotificationTemplate
  title:        string
  text:         string
  mode:         'broadcast' | 'multicast' | 'push'
  recipients?:  number
  success:      boolean
  sentAt:       string
}): Promise<void> {
  const headers = {
    'Authorization':  `Bearer ${params.notionKey}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }

  const emoji =
    params.template === 'emergency_alert'   ? '🚨' :
    params.template === 'deadline_reminder' ? '📋' :
    params.template === 'announcement'      ? '📢' :
    params.template === 'maintenance'       ? '🔧' : '🌿'

  const modeLabel =
    params.mode === 'broadcast'  ? '全員一斉' :
    params.mode === 'multicast'  ? `個別${params.recipients ?? 0}名` : '個別1名'

  const statusLabel = params.success ? '送信済み ✅' : '送信失敗 ❌'

  // DBが設定済みならDBレコード、未設定ならページとして保存
  if (NOTIFICATION_LOG_DB_ID) {
    try {
      await fetch(`${NOTION_API_BASE}/pages`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          parent: { database_id: NOTIFICATION_LOG_DB_ID },
          icon:   { emoji },
          properties: {
            '通知タイトル': { title:     [{ text: { content: params.title } }] },
            '通知種別':     { select:    { name: params.template } },
            '送信モード':   { select:    { name: modeLabel } },
            '対応状況':     { select:    { name: statusLabel } },
            '送信日時':     { date:      { start: params.sentAt } },
            '本文':         { rich_text: [{ text: { content: params.text.slice(0, 2000) } }] },
          },
        }),
      })
    } catch (e) {
      console.error('[line-push] 通知ログ保存エラー:', e)
    }
  } else {
    // ページとして保存
    try {
      await fetch(`${NOTION_API_BASE}/pages`, {
        method:  'POST',
        headers,
        body: JSON.stringify({
          parent:     { page_id: NOTION_PARENT_PAGE_ID },
          icon:       { emoji },
          properties: {
            title: [{ text: { content: `${emoji} ${params.title} [${modeLabel}] [${statusLabel}]` } }],
          },
          children: [{
            object:    'block',
            type:      'paragraph',
            paragraph: {
              rich_text: [{ type: 'text', text: { content: params.text } }],
            },
          }],
        }),
      })
    } catch (e) {
      console.error('[line-push] 通知ログページ保存エラー:', e)
    }
  }
}
