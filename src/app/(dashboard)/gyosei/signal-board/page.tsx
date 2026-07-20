'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/signal-board/page.tsx
//  Signalボード（企業・自治体向け） — 【結(YUI)】基盤開発 第一歩
//
//  ■ このページの役割
//    「てつだって」(personal-coarc)での会話から検知されたSignalを、
//    カテゴリ別に匿名化・集計した状態で企業・自治体の担当者に見せる。
//
//  ■ 表示のルール(重要)
//    母数(件数)が閾値未満のカテゴリは、実数を絶対に表示しない。
//    「検知中」とだけ表示し、あと何件で公開になるかも出さない
//    （件数を出すと、少人数の場合に個人が推測できてしまうため）。
// =====================================================

import { useEffect, useState } from 'react'

type SignalCategory =
  | '生活・家事' | '移動・外出' | '健康・体調' | '孤立・つながり' | '経済・お金' | 'その他'

interface AggregatedCategory {
  category: SignalCategory
  dominantSeverity: 'info' | '注意' | '要対応'
  count: number | null
  threshold: number
}

interface SignalBoardResponse {
  status: 'success' | 'error'
  message?: string
  threshold: number
  generatedAt: string
  categories: AggregatedCategory[]
}

// カテゴリごとのアイコン（絵文字。lucide-reactを増やさずシンプルに保つ）
const CATEGORY_EMOJI: Record<SignalCategory, string> = {
  '生活・家事':   '🏠',
  '移動・外出':   '🚶',
  '健康・体調':   '❤️',
  '孤立・つながり': '🤝',
  '経済・お金':   '💰',
  'その他':      '📋',
}

const SEVERITY_STYLE: Record<AggregatedCategory['dominantSeverity'], string> = {
  info:   'bg-gray-100 text-gray-600',
  '注意': 'bg-yellow-100 text-yellow-700',
  '要対応': 'bg-red-100 text-red-700',
}

export default function SignalBoardPage() {
  const [data, setData] = useState<SignalBoardResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/signal')
      .then(res => res.json())
      .then((json: SignalBoardResponse) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          🔔 Signalボード
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          「てつだって」の会話から検知された、地域の小さな変化のサインです。
          個人が特定できる情報は含まれておらず、カテゴリごとに定めた一定数
          （母数5〜20件、機微度が高い内容ほど基準を高くしています）
          以上集まったカテゴリのみ件数を表示します。
        </p>
      </div>

      {loading && (
        <div className="text-sm text-gray-400">読み込み中...</div>
      )}

      {!loading && (!data || data.status === 'error') && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
          Signalの取得に失敗しました。{data?.message ?? ''}
        </div>
      )}

      {!loading && data && data.status === 'success' && data.categories.length === 0 && (
        <div className="bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-lg p-6 text-center">
          まだSignalが検知されていません。「てつだって」の利用が増えると、ここに反映されます。
        </div>
      )}

      {!loading && data && data.categories.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.categories.map(cat => (
            <div
              key={cat.category}
              className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-lg font-semibold text-gray-800">
                  {CATEGORY_EMOJI[cat.category]} {cat.category}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded-full ${SEVERITY_STYLE[cat.dominantSeverity]}`}
                >
                  {cat.dominantSeverity}
                </span>
              </div>
              {cat.count !== null ? (
                <p className="text-3xl font-bold text-gray-900">
                  {cat.count}
                  <span className="text-sm font-normal text-gray-400 ml-1">件</span>
                </p>
              ) : (
                <p className="text-sm text-gray-400">検知中（母数{cat.threshold}件未満のため非公開）</p>
              )}
            </div>
          ))}
        </div>
      )}

      {data?.generatedAt && (
        <p className="text-xs text-gray-300 mt-6">
          最終更新: {new Date(data.generatedAt).toLocaleString('ja-JP')}
        </p>
      )}
    </div>
  )
}
