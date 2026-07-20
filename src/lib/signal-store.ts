// =====================================================
//  src/lib/signal-store.ts
//  Signal保存・集計エンジン — 【結(YUI)】基盤開発 第一歩
//
//  ■ このファイルの役割
//    signal-detector.ts が検知したSignalをNotionの
//    「🔔 Signalログ DB(結)」に保存する。
//    また、企業・自治体向けAPI(/api/signal)からは、
//    このファイルの fetchAggregatedSignals() を通してのみSignalを取得させる。
//
//  ■ k-匿名性ルール(CLAUDE.md 1.5 参照)
//    母数(同一カテゴリのSignal件数)が THRESHOLD 件未満のカテゴリは、
//    件数を一切外部に出さない(「検知中」とだけ表示する)。
//    これにより「1件しかない = 個人が特定できてしまう」事態を防ぐ。
// =====================================================

import { randomUUID, createHash } from 'crypto'
import type { DetectedSignal, SignalCategory, SignalSeverity } from './signal-detector'

const NOTION_API = 'https://api.notion.com/v1'
const NOTION_VER = '2022-06-28'

// 🔔 Signalログ DB(結) のID(2026-07-18 作成)
export const SIGNAL_DB_ID = '685537658bf545419264d58b2e3d30d4'

// カテゴリ別の匿名化閾値(母数) — Notion「ゴール設計原則」2026-07-20決定分
//   機微度が高いカテゴリ(健康・お金)ほど閾値を高くし、
//   機微度が低いカテゴリ(移動・外出)は閾値を低くする。
//   一覧に無いカテゴリは中間的な値(10人)を既定値として使う。
const CATEGORY_THRESHOLDS: Record<SignalCategory, number> = {
  '健康・体調':    20, // 体調・服薬など最も機微度が高い
  '経済・お金':    20, // 金銭状況は機微度が高い
  '孤立・つながり': 10, // 心理面に関わるため中程度
  '生活・家事':    10, // 生活全般、中程度
  'その他':       10, // 分類しきれない内容のため中程度で保守的に扱う
  '移動・外出':    5,  // 相対的に機微度が低い
}

// 結全体として「これより下回ってはいけない」絶対下限。
// カテゴリ別の値がこれを下回ることはない(下限のみ結が保証し、上は運用側の裁量)。
const ABSOLUTE_MINIMUM_THRESHOLD = Number(process.env.SIGNAL_K_THRESHOLD_MIN ?? '5')

function getThresholdForCategory(category: SignalCategory): number {
  const configured = CATEGORY_THRESHOLDS[category] ?? 10
  return Math.max(configured, ABSOLUTE_MINIMUM_THRESHOLD)
}

// ─── 内部参照IDの生成 ────────────────────────────────
// 個人のNotionページIDをそのまま持たず、一方向ハッシュにしてから保存する。
// (元のnotionPageIdに戻すことはできない = Signal側から個人を逆引きできない設計)
export function hashInternalRef(notionPageId: string): string {
  const salt = process.env.SIGNAL_HASH_SALT ?? 'yui-signal-salt-v1'
  return createHash('sha256').update(`${salt}:${notionPageId}`).digest('hex').slice(0, 16)
}

// ─── 保存 ─────────────────────────────────────────────

/**
 * 検知したSignalをNotionに保存する
 * @param notionKey       Notion Integration Token
 * @param signal          detectSignal() の結果(detected: true のもののみ渡すこと)
 * @param internalRef     hashInternalRef() で生成した匿名参照ID
 */
export async function saveSignal(
  notionKey: string,
  signal: DetectedSignal,
  internalRef: string
): Promise<void> {
  if (!signal.detected || !signal.category || !signal.summary) return

  const res = await fetch(`${NOTION_API}/pages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VER,
    },
    body: JSON.stringify({
      parent: { database_id: SIGNAL_DB_ID },
      properties: {
        '要約':         { title: [{ text: { content: signal.summary } }] },
        'カテゴリ':      { select: { name: signal.category } },
        '深刻度':        { select: { name: signal.severity ?? 'info' } },
        '内部参照ID':    { rich_text: [{ text: { content: internalRef } }] },
        '検知日時':      { date: { start: new Date().toISOString() } },
        '公開ステータス': { select: { name: '匿名化待ち(母数未達)' } },
      },
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('[signal-store] Signal保存失敗:', res.status, body)
  }
}

// ─── 集計(k-匿名性を満たすもののみ返す) ───────────────

export interface AggregatedCategory {
  category: SignalCategory
  dominantSeverity: SignalSeverity
  /** k-匿名性を満たした場合のみ実数、満たさない場合は null(「検知中」表示用) */
  count: number | null
  /** このカテゴリに適用された閾値(母数)。画面側で「あと何人で公開」等は出さないが、基準値の説明に使う */
  threshold: number
}

export interface SignalBoardResponse {
  status: 'success' | 'error'
  message?: string
  /** 結全体の絶対下限(カテゴリ別の値の参考値。個々の基準は各カテゴリのthresholdを見ること) */
  threshold: number
  generatedAt: string
  categories: AggregatedCategory[]
}

/**
 * 直近のSignalをカテゴリ別に集計し、カテゴリごとの母数閾値以上のものだけ
 * 実数を返す(未満のカテゴリは count: null にして「検知中」であることだけ伝える)。
 */
export async function fetchAggregatedSignals(notionKey: string): Promise<SignalBoardResponse> {
  const res = await fetch(`${NOTION_API}/databases/${SIGNAL_DB_ID}/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${notionKey}`,
      'Content-Type': 'application/json',
      'Notion-Version': NOTION_VER,
    },
    // 直近200件で十分(MVP段階の想定件数)。将来的には検知日時でのフィルタを追加する。
    body: JSON.stringify({ page_size: 100 }),
  })

  if (!res.ok) {
    return {
      status: 'error',
      message: `Notionクエリ失敗: ${res.status}`,
      threshold: ABSOLUTE_MINIMUM_THRESHOLD,
      generatedAt: new Date().toISOString(),
      categories: [],
    }
  }

  const data = await res.json()
  type NProps = Record<string, Record<string, unknown>>
  const rows = (data.results ?? []) as Array<{ properties: NProps }>

  // カテゴリ別に件数・深刻度をカウント
  const tally = new Map<string, { count: number; severities: Record<string, number> }>()
  for (const row of rows) {
    const category = (row.properties['カテゴリ']?.select as { name?: string } | null)?.name
    const severity = (row.properties['深刻度']?.select as { name?: string } | null)?.name ?? 'info'
    if (!category) continue
    const entry = tally.get(category) ?? { count: 0, severities: {} }
    entry.count += 1
    entry.severities[severity] = (entry.severities[severity] ?? 0) + 1
    tally.set(category, entry)
  }

  const categories: AggregatedCategory[] = Array.from(tally.entries()).map(([category, v]) => {
    // 最頻の深刻度を採用(「要対応」が1件でもあれば注意喚起のため優先表示する)
    const dominantSeverity = (v.severities['要対応'] ? '要対応'
      : v.severities['注意'] ? '注意'
      : 'info') as SignalSeverity
    const threshold = getThresholdForCategory(category as SignalCategory)
    return {
      category: category as SignalCategory,
      dominantSeverity,
      count: v.count >= threshold ? v.count : null,
      threshold,
    }
  })

  return {
    status: 'success',
    threshold: ABSOLUTE_MINIMUM_THRESHOLD,
    generatedAt: new Date().toISOString(),
    categories,
  }
}

// テスト・デバッグ用に一意なダミー参照IDを作る場合に使う(本番では hashInternalRef を使うこと)
export function debugRandomRef(): string {
  return randomUUID().slice(0, 16)
}
