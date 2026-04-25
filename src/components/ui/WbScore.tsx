// =====================================================
//  src/components/ui/WbScore.tsx
//  WellBeing スコア 色ヘルパー — Sprint #42 共通コンポーネント化
//
//  ■ 用途
//    WBスコア（0〜100）を緑・黄・赤・グレーで色分けする関数と
//    コンポーネントを提供。
//    RiskScoringPanel と WeeklyWBSummaryPanel で重複していた
//    wbColor / wbBg を共通化。
//
//  ■ 使い方（関数）
//    import { wbColor, wbBg } from '@/components/ui/WbScore'
//    <span className={`text-lg font-bold ${wbColor(score)}`}>{score}</span>
//
//  ■ 使い方（コンポーネント）
//    import { WbScoreBadge } from '@/components/ui/WbScore'
//    <WbScoreBadge score={72} />  → "72" を緑色で表示
// =====================================================

// ─── 色しきい値 ───────────────────────────────────────

/**
 * WBスコアのしきい値。
 * 70以上 → 良好（緑）、55以上 → 注意（黄）、55未満 → 警戒（赤）、0 → データなし（グレー）
 */
const WB_HIGH    = 70
const WB_MIDDLE  = 55

// ─── ヘルパー関数 ─────────────────────────────────────

/**
 * WBスコアに対応する Tailwind テキスト色クラスを返す。
 * @param score WBスコア（0〜100）。0 の場合はデータなし（グレー）。
 */
export function wbColor(score: number): string {
  if (score <= 0)        return 'text-gray-400'
  if (score >= WB_HIGH)  return 'text-emerald-600'
  if (score >= WB_MIDDLE) return 'text-amber-500'
  return 'text-red-500'
}

/**
 * WBスコアに対応する Tailwind 背景色クラスを返す。
 * @param score WBスコア（0〜100）。0 の場合はグレー背景。
 */
export function wbBg(score: number): string {
  if (score <= 0)        return 'bg-gray-50'
  if (score >= WB_HIGH)  return 'bg-emerald-50'
  if (score >= WB_MIDDLE) return 'bg-amber-50'
  return 'bg-red-50'
}

/**
 * WBスコアに対応する Tailwind ボーダー色クラスを返す。
 * @param score WBスコア（0〜100）
 */
export function wbBorder(score: number): string {
  if (score <= 0)        return 'border-gray-200'
  if (score >= WB_HIGH)  return 'border-emerald-200'
  if (score >= WB_MIDDLE) return 'border-amber-200'
  return 'border-red-200'
}

// ─── コンポーネント Props 型 ──────────────────────────

export interface WbScoreBadgeProps {
  /** WBスコア（0〜100）*/
  score: number
  /** 追加の Tailwind クラス（例: "text-lg", "font-bold"） */
  className?: string
  /** スコアが 0 のときに表示する代替テキスト */
  emptyLabel?: string
}

// ─── コンポーネント ───────────────────────────────────

/**
 * WbScoreBadge
 * WBスコアを色付きテキストで表示する。
 * 0（データなし）のときは emptyLabel を表示。
 */
export function WbScoreBadge({
  score,
  className = 'text-sm font-bold',
  emptyLabel = '—',
}: WbScoreBadgeProps) {
  const colorCls = wbColor(score)

  if (score <= 0) {
    return (
      <span className={`text-gray-400 ${className}`}>{emptyLabel}</span>
    )
  }

  return (
    <span className={`${colorCls} ${className}`}>{score}</span>
  )
}
