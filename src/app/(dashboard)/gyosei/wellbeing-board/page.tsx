'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/wellbeing-board/page.tsx
//  Well-Being ダッシュボード(自治体職員向け) — 【結(YUI)】基盤 第二歩
//
//  ■ このページの役割
//    財政健全化・移住定着リスクという、自治体が既に持っているデータ
//    (Pulse-native型)と、てつだっての会話から検知されたSignal
//    (Signal→Pulse型)を、1つの画面にまとめて見せる。
//
//  ■ 正直に書いておくこと
//    GNH8領域(①心理的幸福〜⑧生活水準)のうち、今この画面で
//    実データが出るのは⑤⑥のみ。④教育・⑧生活水準はデータ源が
//    まだ無いため固定表示。①②③⑦はSignal由来だが、GNH領域への
//    正式な対応付けはまだコード化されていないため、現行の
//    カテゴリ名のまま「Signal」として別枠で表示している。
// =====================================================

import { useEffect, useState } from 'react'

type PulseLevel = '良好' | '要注意' | '危険' | 'データなし'

interface PulseNativeDomain {
  domain: string
  source: string
  level: PulseLevel
  detail: string
  updatedAt: string
}

interface AggregatedCategory {
  category: string
  dominantSeverity: 'info' | '注意' | '要対応'
  count: number | null
  threshold: number
}

interface WellbeingPulseResponse {
  status: 'success' | 'error'
  message?: string
  municipalityId: string
  generatedAt: string
  pulseNative: PulseNativeDomain[]
  signalPulse: { threshold: number; categories: AggregatedCategory[] }
}

const LEVEL_STYLE: Record<PulseLevel, string> = {
  良好: 'bg-green-100 text-green-700',
  要注意: 'bg-yellow-100 text-yellow-700',
  危険: 'bg-red-100 text-red-700',
  データなし: 'bg-gray-100 text-gray-500',
}

// まだデータ源が無い領域は、正直に「未着手」として固定表示する
const NOT_YET_AVAILABLE: { domain: string; note: string }[] = [
  { domain: '④教育', note: '対応するデータ源が現時点で存在しません' },
  { domain: '⑧生活水準', note: 'Coarc側の取引データを調査中です' },
]

export default function WellbeingBoardPage() {
  const [data, setData] = useState<WellbeingPulseResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/gyosei/wellbeing-pulse')
      .then(res => res.json())
      .then((json: WellbeingPulseResponse) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">地域Well-Beingダッシュボード</h1>
        <p className="text-sm text-gray-500 mt-1">
          自治体が既にお持ちのデータ(財政・移住定着)と、てつだっての会話から見えた変化を、
          まとめて確認できます。個人が特定できる情報は含みません。
        </p>
      </div>

      {loading && <div className="text-sm text-gray-400">読み込み中...</div>}

      {!loading && (!data || data.status === 'error') && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">
          データの取得に失敗しました。{data?.message ?? ''}
        </div>
      )}

      {!loading && data && data.status === 'success' && (
        <>
          <h2 className="text-lg font-semibold text-gray-800 mb-3">
            既存データより(財政・移住定着)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {data.pulseNative.map(d => (
              <div key={d.domain} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-800">{d.domain}</span>
                  <span className={`text-xs px-2 py-1 rounded-full ${LEVEL_STYLE[d.level]}`}>
                    {d.level}
                  </span>
                </div>
                <p className="text-sm text-gray-600">{d.detail}</p>
                <p className="text-xs text-gray-400 mt-2">{d.source}</p>
              </div>
            ))}
            {NOT_YET_AVAILABLE.map(d => (
              <div key={d.domain} className="bg-gray-50 border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-base font-semibold text-gray-500">{d.domain}</span>
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                    データなし
                  </span>
                </div>
                <p className="text-sm text-gray-400">{d.note}</p>
              </div>
            ))}
          </div>

          <h2 className="text-lg font-semibold text-gray-800 mb-3 mt-8">
            てつだっての会話より(Signal)
          </h2>
          <p className="text-xs text-gray-400 mb-3">
            カテゴリごとに定めた母数（5〜20件、機微度が高いほど高い基準）未満のカテゴリは、
            件数を表示せず「検知中」とだけ表示します。
          </p>
          {data.signalPulse.categories.length === 0 ? (
            <div className="bg-gray-50 border border-gray-200 text-gray-500 text-sm rounded-lg p-6 text-center">
              まだSignalが検知されていません。
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.signalPulse.categories.map(cat => (
                <div key={cat.category} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
                  <span className="text-base font-semibold text-gray-800">{cat.category}</span>
                  {cat.count !== null ? (
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {cat.count}
                      <span className="text-sm font-normal text-gray-400 ml-1">件</span>
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400 mt-2">検知中(母数{cat.threshold}件未満)</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <p className="text-xs text-gray-300 mt-6">
            最終更新: {new Date(data.generatedAt).toLocaleString('ja-JP')}
          </p>
        </>
      )}
    </div>
  )
}
