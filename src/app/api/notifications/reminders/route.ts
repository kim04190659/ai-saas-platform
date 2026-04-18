// =====================================================
//  src/app/api/notifications/reminders/route.ts
//  手続き期限リマインド 自動送信 Cron — Sprint #29
//
//  ■ 役割
//    Notionの「通知スケジュールDB」を毎朝8時に参照し、
//    「今日送信すべきリマインド」を自動的に住民のLINEへ送る。
//
//  ■ 通知スケジュールDBの構造（Notionで職員が入力）
//    - タイトル     : 通知件名（例: 国民健康保険 更新リマインド）
//    - 送信日       : date（この日に自動送信）
//    - 対象ユーザーID: rich_text（LINEのUserID、空なら全員ブロードキャスト）
//    - サービス名   : rich_text
//    - 期限日       : rich_text（例: 2026年5月31日）
//    - 担当窓口     : rich_text
//    - 送信済み     : checkbox（送信後にtrueにする）
//
//  ■ 動作フロー
//    1. Notionから「送信日=今日 かつ 送信済み=false」のレコードを取得
//    2. 対象ユーザーIDが空 → broadcast（全員）
//       対象ユーザーIDあり → multicast（指定ユーザーのみ）
//    3. 送信後、Notionレコードの「送信済み」をtrueに更新
//    4. 送信ログをNotionに記録
//
//  ■ Vercel Cron スケジュール
//    毎朝8時（JST）= UTC 23:00（前日）= "0 23 * * *"
//
//  ■ 環境変数
//    REMINDER_DB_ID              : 通知スケジュールDB ID（Notion）
//    LINE_CHANNEL_ACCESS_TOKEN   : LINE送信トークン
//    NOTION_API_KEY              : Notion APIキー
// =====================================================

import { NextRequest, NextResponse } from 'next/server'
import {
  buildNotificationText,
  broadcastMessage,
  multicastMessage,
  logNotificationToNotion,
} from '@/lib/line-push'

// ─── 定数 ────────────────────────────────────────────

const NOTION_API_BASE = 'https://api.notion.com/v1'
const NOTION_VERSION  = '2022-06-28'

// Notionの通知スケジュールDB（環境変数で設定）
// 未設定の場合はデモデータで動作確認できる
const REMINDER_DB_ID  = process.env.REMINDER_DB_ID ?? ''

// ─── Notion ヘルパー ──────────────────────────────────

function notionHeaders(key: string) {
  return {
    'Authorization':  `Bearer ${key}`,
    'Content-Type':   'application/json',
    'Notion-Version': NOTION_VERSION,
  }
}

// ─── 今日の送信予定を取得 ─────────────────────────────

interface ReminderRecord {
  pageId:      string
  title:       string
  serviceName: string
  deadline:    string
  office:      string
  userIds:     string[]    // 空配列 → broadcast
  daysLeft?:   number
}

/**
 * Notionの通知スケジュールDBから「今日送信すべきリマインド」を取得する。
 */
async function fetchTodayReminders(
  today:      string,   // yyyy-mm-dd
  notionKey:  string,
): Promise<ReminderRecord[]> {
  if (!REMINDER_DB_ID) {
    console.warn('[reminders] REMINDER_DB_ID 未設定 — Notionからの取得をスキップ')
    return []
  }

  try {
    const res = await fetch(`${NOTION_API_BASE}/databases/${REMINDER_DB_ID}/query`, {
      method:  'POST',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        page_size: 100,
        filter: {
          and: [
            // 送信日が今日
            { property: '送信日', date: { equals: today } },
            // まだ送信していない
            { property: '送信済み', checkbox: { equals: false } },
          ],
        },
      }),
    })

    if (!res.ok) {
      console.warn('[reminders] Notionクエリ失敗:', res.status)
      return []
    }

    const data = await res.json()

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (data.results ?? []).map((r: any) => {
      const p = r.properties

      // 対象ユーザーID（カンマ区切りで複数指定可能）
      const userIdRaw = p['対象ユーザーID']?.rich_text?.[0]?.plain_text ?? ''
      const userIds   = userIdRaw
        ? userIdRaw.split(',').map((s: string) => s.trim()).filter(Boolean)
        : []

      // 残り日数計算
      const deadlineRaw = p['期限日']?.rich_text?.[0]?.plain_text ?? ''
      const daysLeft    = calcDaysLeft(deadlineRaw)

      return {
        pageId:      r.id,
        title:       p['タイトル']?.title?.[0]?.plain_text ?? '通知',
        serviceName: p['サービス名']?.rich_text?.[0]?.plain_text ?? '',
        deadline:    deadlineRaw,
        office:      p['担当窓口']?.rich_text?.[0]?.plain_text ?? '担当窓口',
        userIds,
        daysLeft,
      }
    })
  } catch (e) {
    console.error('[reminders] 取得エラー:', e)
    return []
  }
}

/**
 * 期限日文字列から残り日数を計算する。
 * 「2026年5月31日」形式に対応。
 */
function calcDaysLeft(deadlineStr: string): number | undefined {
  try {
    // 「2026年5月31日」→「2026-05-31」に変換
    const normalized = deadlineStr
      .replace(/年/, '-')
      .replace(/月/, '-')
      .replace(/日/, '')
      .padStart(10, '0')
    const d = new Date(normalized)
    if (isNaN(d.getTime())) return undefined
    const today = new Date()
    const diff  = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    return diff >= 0 ? diff : 0
  } catch {
    return undefined
  }
}

// ─── 送信済みフラグをNotionに書き込む ─────────────────

async function markAsSent(pageId: string, notionKey: string): Promise<void> {
  try {
    await fetch(`${NOTION_API_BASE}/pages/${pageId}`, {
      method:  'PATCH',
      headers: notionHeaders(notionKey),
      body: JSON.stringify({
        properties: {
          '送信済み': { checkbox: true },
        },
      }),
    })
  } catch (e) {
    console.error('[reminders] 送信済みフラグ更新エラー:', e)
  }
}

// ─── メイン処理 ───────────────────────────────────────

async function runDailyReminders(): Promise<{
  success:  boolean
  sent:     number
  skipped:  number
  errors:   number
  message:  string
}> {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN ?? ''
  const notionKey   = process.env.NOTION_API_KEY            ?? ''

  if (!notionKey) {
    return { success: false, sent: 0, skipped: 0, errors: 0, message: 'NOTION_API_KEY 未設定' }
  }

  // 今日の日付（JST）
  const now   = new Date()
  const jst   = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const today = jst.toISOString().slice(0, 10)

  console.log(`[reminders] ${today} の送信スケジュールを確認中...`)

  const reminders = await fetchTodayReminders(today, notionKey)
  console.log(`[reminders] 送信予定: ${reminders.length}件`)

  if (reminders.length === 0) {
    return {
      success: true,
      sent:    0,
      skipped: 0,
      errors:  0,
      message: `${today} の送信予定はありませんでした`,
    }
  }

  let sent    = 0
  let skipped = 0
  let errors  = 0

  for (const reminder of reminders) {
    // 通知テキストを生成
    const text = buildNotificationText('deadline_reminder', {
      serviceName: reminder.serviceName,
      deadline:    reminder.deadline,
      daysLeft:    reminder.daysLeft,
      office:      reminder.office,
    })

    // 送信モードを判定（userIds が空 → broadcast）
    const result = reminder.userIds.length > 0
      ? await multicastMessage(reminder.userIds, text, accessToken)
      : await broadcastMessage(text, accessToken)

    if (result.success) {
      sent++
      // Notionの「送信済み」フラグをtrueに更新
      await markAsSent(reminder.pageId, notionKey)
      // 送信ログを記録
      if (notionKey) {
        await logNotificationToNotion({
          notionKey,
          template:   'deadline_reminder',
          title:      reminder.title,
          text,
          mode:       result.mode,
          recipients: result.recipients,
          success:    true,
          sentAt:     now.toISOString(),
        })
      }
      console.log(`[reminders] ✅ 送信済み: ${reminder.title} (${result.mode})`)
    } else {
      errors++
      console.error(`[reminders] ❌ 送信失敗: ${reminder.title} — ${result.error}`)
    }

    // APIレート制限対応
    await new Promise(r => setTimeout(r, 300))
  }

  return {
    success: errors === 0,
    sent,
    skipped,
    errors,
    message: `${today}: ${sent}件送信完了、${errors}件失敗`,
  }
}

// ─── GET ハンドラ（Cron または手動テスト） ─────────────

export async function GET(req: NextRequest) {
  // Vercel Cron のセキュリティチェック
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const authHeader = req.headers.get('Authorization')
    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: '認証エラー' }, { status: 401 })
    }
  }

  console.log('[reminders] 日次リマインド送信開始')
  const result = await runDailyReminders()
  console.log('[reminders] 完了:', result.message)

  return NextResponse.json({
    status:  result.success ? 'success' : 'error',
    ...result,
  })
}

export async function POST(req: NextRequest) {
  return GET(req)
}
