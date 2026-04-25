// =====================================================
//  src/components/ui/ProgressBar.tsx
//  汎用プログレスバー — Sprint #42 共通コンポーネント化
//
//  ■ 用途
//    施設の占有率・スコアの達成率など「値/最大値」を
//    横バーで可視化する。スコアに応じて自動で色を変える。
//    CareCoordinationPanel の OccupancyBar を汎用化。
//
//  ■ 使い方（1）：占有率（人数/定員）
//    import { ProgressBar } from '@/components/ui/ProgressBar'
//    <ProgressBar current={45} max={50} showLabel />
//    → 90% → 赤（高負荷） バー + "45/50"
//
//  ■ 使い方（2）：スコア（0〜100）
//    <ProgressBar current={72} max={100} />
//    → 72% → 緑（良好）バー
//
//  ■ 使い方（3）：色のしきい値を上書き
//    <ProgressBar
//      current={3}
//      max={5}
//      thresholds={{ danger: 40, warning: 70 }}  // % で指定
//    />
// =====================================================

// ─── Props 型定義 ─────────────────────────────────────

export interface ProgressBarThresholds {
  /**
   * この %以上 → 赤（danger）色
   * （例: 90 → 90%以上で赤）
   */
  danger: number
  /**
   * この %以上 → 黄（warning）色
   * （danger 未満かつ warning 以上のとき）
   * （例: 70 → 70〜89%で黄）
   */
  warning: number
}

export interface ProgressBarProps {
  /** 現在値 */
  current: number
  /** 最大値（これに対する current の割合をバーにする） */
  max: number
  /**
   * 色切り替えのしきい値（%）。
   * デフォルト: 90%以上=赤、70%以上=黄、それ以外=緑
   */
  thresholds?: ProgressBarThresholds
  /**
   * ラベルを表示するか。
   * true のとき "current/max" 形式で右側に表示。
   */
  showLabel?: boolean
  /**
   * ラベルの単位文字列（例: "名", "%"）。
   * showLabel が true のときに current/max の後に付く。
   */
  unit?: string
  /** バーの高さクラス（Tailwind）。デフォルト "h-1.5" */
  heightClass?: string
}

// ─── 色しきい値のデフォルト ───────────────────────────

const DEFAULT_THRESHOLDS: ProgressBarThresholds = {
  danger:  90,  // 90%以上 → 赤
  warning: 70,  // 70%以上 → 黄
}

// ─── 色クラス選択ヘルパー ────────────────────────────

/**
 * パーセンテージとしきい値から Tailwind の bg クラスを返す。
 */
function resolveColor(
  pct: number,
  thresholds: ProgressBarThresholds,
): string {
  if (pct >= thresholds.danger)  return 'bg-red-400'
  if (pct >= thresholds.warning) return 'bg-amber-400'
  return 'bg-emerald-400'
}

// ─── コンポーネント ───────────────────────────────────

/**
 * ProgressBar
 * current / max の割合をバーで表示する。
 * 割合に応じて自動で緑・黄・赤に変わる。
 */
export function ProgressBar({
  current,
  max,
  thresholds = DEFAULT_THRESHOLDS,
  showLabel = false,
  unit = '',
  heightClass = 'h-1.5',
}: ProgressBarProps) {
  // max が 0 の場合は表示なし
  if (max === 0) {
    return <span className="text-xs text-slate-400">—</span>
  }

  const pct      = Math.min(100, Math.round((current / max) * 100))
  const colorCls = resolveColor(pct, thresholds)

  return (
    <div className="flex items-center gap-2">
      {/* バー本体 */}
      <div className={`flex-1 ${heightClass} bg-slate-100 rounded-full overflow-hidden`}>
        <div
          className={`h-full rounded-full ${colorCls} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {/* ラベル（オプション） */}
      {showLabel && (
        <span className="text-xs text-slate-500 w-16 text-right shrink-0">
          {current}/{max}{unit}
        </span>
      )}
    </div>
  )
}
