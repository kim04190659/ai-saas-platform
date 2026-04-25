// =====================================================
//  src/components/ui/StatusBadge.tsx
//  汎用ステータスバッジ — Sprint #42 共通コンポーネント化
//
//  ■ 用途
//    テーブル・カードのステータス表示に使う丸バッジ。
//    CareCoordinationPanel / CrossIssueMgmtPanel /
//    IncidentLogPanel / InfraIncidentPanel / ServiceStatusPanel
//    で重複していた StatusBadge を統合。
//
//  ■ 使い方（1）：文字列を渡してデフォルトの色マップを使う
//    import { StatusBadge } from '@/components/ui/StatusBadge'
//    <StatusBadge status="稼働中" />   → 緑
//    <StatusBadge status="対応中" />   → 黄
//    <StatusBadge status="停止中" />   → 赤
//
//  ■ 使い方（2）：colorMap で色を上書き
//    <StatusBadge
//      status={r.status}
//      colorMap={{
//        '受入可':  'bg-emerald-100 text-emerald-700',
//        '満床':    'bg-red-100 text-red-700',
//        '制限中':  'bg-amber-100 text-amber-700',
//      }}
//    />
//
//  ■ 使い方（3）：アラートレベル（critical / warning / info）
//    <StatusBadge status="critical" />  → 🔴 緊急
//    <StatusBadge status="warning"  />  → 🟡 注意
//    <StatusBadge status="info"     />  → 🟢 正常
// =====================================================

// ─── デフォルトの色マップ ─────────────────────────────

/**
 * よく使うステータス文字列 → Tailwind クラス のデフォルト対応表。
 * colorMap props で任意に上書きできる。
 */
const DEFAULT_COLOR_MAP: Record<string, string> = {
  // 一般的な稼働状態
  '稼働中':  'bg-emerald-100 text-emerald-700',
  '制限中':  'bg-amber-100 text-amber-700',
  '停止中':  'bg-red-100 text-red-700',
  '停止':    'bg-red-100 text-red-700',
  // インシデント
  '対応中':  'bg-amber-100 text-amber-700',
  '解決済み': 'bg-emerald-100 text-emerald-700',
  '報告済み': 'bg-blue-100 text-blue-700',
  // 施設（介護）
  '受入可':  'bg-emerald-100 text-emerald-700',
  '満床':    'bg-red-100 text-red-700',
  // 課題管理
  '未着手':  'bg-slate-100 text-slate-600',
  '進行中':  'bg-blue-100 text-blue-700',
  '完了':    'bg-emerald-100 text-emerald-700',
  '保留':    'bg-yellow-100 text-yellow-700',
  // アラートレベル（英語）
  'critical': 'bg-red-100 text-red-700',
  'warning':  'bg-yellow-100 text-yellow-700',
  'info':     'bg-green-100 text-green-700',
}

/** アラートレベルの表示ラベル（絵文字付き） */
const LEVEL_LABELS: Record<string, string> = {
  'critical': '🔴 緊急',
  'warning':  '🟡 注意',
  'info':     '🟢 正常',
}

// ─── Props 型定義 ─────────────────────────────────────

export interface StatusBadgeProps {
  /** 表示するステータス文字列またはアラートレベル */
  status: string
  /**
   * ステータス → Tailwind クラス の上書きマップ。
   * ここで指定したキーは DEFAULT_COLOR_MAP より優先される。
   */
  colorMap?: Record<string, string>
  /** フォールバックのクラス（マップにないステータスのとき） */
  fallbackClass?: string
}

// ─── コンポーネント ───────────────────────────────────

/**
 * StatusBadge
 * ステータスや重要度を丸みを帯びたバッジで表示する。
 * colorMap を渡さない場合は DEFAULT_COLOR_MAP を使う。
 */
export function StatusBadge({
  status,
  colorMap,
  fallbackClass = 'bg-slate-100 text-slate-600',
}: StatusBadgeProps) {
  // colorMap（上書き） → DEFAULT_COLOR_MAP → fallback の順で解決
  const merged = { ...DEFAULT_COLOR_MAP, ...colorMap }
  const cls    = merged[status] ?? fallbackClass
  // アラートレベル（critical/warning/info）は絵文字付きラベルを使う
  const label  = LEVEL_LABELS[status] ?? status

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}
    >
      {label}
    </span>
  )
}
