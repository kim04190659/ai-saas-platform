// =====================================================
//  src/components/ui/SummaryCard.tsx
//  汎用サマリーカード — Sprint #42 共通コンポーネント化
//
//  ■ 用途
//    ダッシュボード上部に並ぶ「アイコン＋数値＋ラベル」の
//    カードを共通化。各パネルで重複していたコードを集約。
//
//  ■ 使い方
//    import { SummaryCard } from '@/components/ui/SummaryCard'
//
//    <SummaryCard
//      icon="✅"
//      label="稼働中"
//      value={42}
//      sub="件"
//      colorClass="bg-emerald-50 border-emerald-200 text-emerald-700"
//    />
// =====================================================

// ─── Props 型定義 ─────────────────────────────────────

export interface SummaryCardProps {
  /** 絵文字またはテキストアイコン（例: "✅", "👥"） */
  icon: string
  /** カードのラベル（例: "稼働中", "平均WBスコア"） */
  label: string
  /** 表示する主な数値またはテキスト */
  value: string | number
  /** 数値の単位など補足テキスト（例: "件", "/ 100"） */
  sub?: string
  /** Tailwind クラス文字列（背景・ボーダー・テキスト色） */
  colorClass: string
}

// ─── コンポーネント ───────────────────────────────────

/**
 * SummaryCard
 * ダッシュボード上部に並ぶ集計カード。
 * colorClass で背景・枠線・テキスト色を一括指定する。
 */
export function SummaryCard({
  icon,
  label,
  value,
  sub,
  colorClass,
}: SummaryCardProps) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      {/* アイコン */}
      <div className="text-2xl mb-1">{icon}</div>
      {/* 主な数値 */}
      <div className="text-2xl font-bold">{value}</div>
      {/* ラベル */}
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {/* 補足テキスト（単位など） */}
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  )
}
