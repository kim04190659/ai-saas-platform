'use client'
// =====================================================
//  src/components/yakushima/YakushimaResidentCoachPanel.tsx
//  屋久島町 住民個人AIコーチ パネル — Sprint #48
//
//  ・住民一覧（WBスコアバー付き、低スコア順）
//  ・住民を選択すると右側に詳細パネルが開く
//    - 相談履歴リスト
//    - AIコーチングメッセージ
//    - 「このコーチングを更新」ボタン
//  ・「全住民一括コーチング」ボタン
// =====================================================

import { useState, useEffect, useCallback } from 'react'

// ── 型定義 ────────────────────────────────────────

type ConsultationRecord = {
  id:           string
  相談名:       string
  住民ID:       string
  相談日:       string | null
  相談カテゴリ: string
  相談内容:     string
  担当職員:     string
  解決状況:     string
}

type ResidentWithConsultations = {
  id:           string
  住民名:       string
  住民ID:       string
  地区:         string
  WBスコア:     number | null
  主な課題:     string
  AIコーチングメッセージ: string
  相談回数:     number | null
  コーチングステータス: string
  相談履歴:     ConsultationRecord[]
  カテゴリ別件数: Record<string, number>
}

// ── WBスコアバー ──────────────────────────────────

function WbScoreBar({ score }: { score: number | null }) {
  const s    = score ?? 0
  const pct  = Math.round((s / 10) * 100)
  const color = s <= 3 ? 'bg-red-400' : s <= 5 ? 'bg-yellow-400' : s <= 7 ? 'bg-blue-400' : 'bg-green-400'
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-200 rounded-full h-2">
        <div className={`${color} h-2 rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs font-bold w-6 text-right">{s}</span>
    </div>
  )
}

// ── 解決状況バッジ ────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    '解決済み': 'bg-green-100 text-green-700',
    '対応中':   'bg-orange-100 text-orange-700',
    '継続支援': 'bg-blue-100 text-blue-700',
    '未対応':   'bg-red-100 text-red-700',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

// ── カテゴリバッジ ────────────────────────────────

function CategoryBadge({ category }: { category: string }) {
  const colors: Record<string, string> = {
    '健康・医療':   'bg-pink-100 text-pink-700',
    '子育て・教育': 'bg-green-100 text-green-700',
    '移住・定住':   'bg-orange-100 text-orange-700',
    '観光・騒音':   'bg-yellow-100 text-yellow-700',
    '高齢者支援':   'bg-purple-100 text-purple-700',
    '生活インフラ': 'bg-gray-100 text-gray-700',
    'その他':       'bg-slate-100 text-slate-600',
  }
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${colors[category] ?? 'bg-gray-100 text-gray-600'}`}>
      {category}
    </span>
  )
}

// ── コーチングステータスバッジ ───────────────────

function CoachStatusBadge({ status }: { status: string }) {
  const s = status === '最新' ? 'bg-green-100 text-green-700'
          : status === '更新待ち' ? 'bg-orange-100 text-orange-700'
          : 'bg-gray-100 text-gray-500'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${s}`}>{status || '未実施'}</span>
  )
}

// ── メインコンポーネント ──────────────────────────

export function YakushimaResidentCoachPanel() {
  const [residents, setResidents] = useState<ResidentWithConsultations[]>([])
  const [selected,  setSelected]  = useState<ResidentWithConsultations | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [coaching,  setCoaching]  = useState(false)   // 個別コーチング中
  const [allCoach,  setAllCoach]  = useState(false)   // 全住民一括中
  const [message,   setMessage]   = useState('')

  // 住民一覧を取得する。
  // keepSelectedId を渡すと、その住民IDの最新データで selected を更新する。
  // useCallback の依存配列には含めず、引数で住民IDを受け取ることでクロージャ問題を回避。
  const load = useCallback(async (keepSelectedId?: string) => {
    setLoading(true)
    try {
      const res  = await fetch('/api/yakushima/resident-coach')
      const data = await res.json() as { residents?: ResidentWithConsultations[] }
      const list = data.residents ?? []
      setResidents(list)
      // 引数で渡された住民IDをもとに selected を最新データで上書きする
      if (keepSelectedId) {
        const updated = list.find(r => r.住民ID === keepSelectedId)
        if (updated) setSelected(updated)
      }
    } catch {
      setMessage('データ取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }, [])  // selected に依存しない設計のため空配列でOK

  useEffect(() => { load() }, [load])

  // 個別コーチング実行
  const handleCoachOne = async () => {
    if (!selected) return
    // この時点の selected.住民ID をローカル変数に退避（非同期完了後も正確に参照できるよう）
    const targetId   = selected.住民ID
    const targetName = selected.住民名
    setCoaching(true)
    setMessage('')
    try {
      const res  = await fetch('/api/yakushima/resident-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'coach_one', residentId: targetId }),
      })
      const data = await res.json() as { status: string; message?: string }
      if (data.status === 'success') {
        setMessage(`${targetName} のコーチングを更新しました`)
        // keepSelectedId を渡すことで、load完了後に selected が最新データで上書きされる
        await load(targetId)
      } else {
        setMessage(`エラー: ${data.message ?? '不明'}`)
      }
    } catch {
      setMessage('通信エラーが発生しました')
    } finally {
      setCoaching(false)
    }
  }

  // 全住民一括コーチング
  const handleCoachAll = async () => {
    setAllCoach(true)
    setMessage('')
    try {
      const res  = await fetch('/api/yakushima/resident-coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'coach_all' }),
      })
      const data = await res.json() as { status: string; processed?: number; message?: string }
      if (data.status === 'success') {
        setMessage(`全住民コーチング完了（${data.processed ?? 0}名更新）`)
        // 一括の場合も、選択中住民があればその最新データを表示する
        await load(selected?.住民ID)
      } else {
        setMessage(`エラー: ${data.message ?? '不明'}`)
      }
    } catch {
      setMessage('通信エラーが発生しました')
    } finally {
      setAllCoach(false)
    }
  }

  return (
    <div className="p-6 space-y-4">

      {/* ヘッダー */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">住民個人AIコーチ</h1>
          <p className="text-sm text-gray-500 mt-1">
            相談履歴を分析し、住民ひとりひとりに合ったWell-Being改善提案を生成します
          </p>
        </div>
        <button
          onClick={handleCoachAll}
          disabled={allCoach || loading}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
        >
          {allCoach ? '一括コーチング中…' : '全住民一括コーチング実行'}
        </button>
      </div>

      {/* メッセージ */}
      {message && (
        <div className="text-sm text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg px-4 py-2">
          {message}
        </div>
      )}

      {loading ? (
        <div className="text-center py-20 text-gray-400">読み込み中…</div>
      ) : (
        <div className="flex gap-4" style={{ minHeight: '600px' }}>

          {/* ── 住民リスト（左列） ── */}
          <div className="w-72 shrink-0 space-y-2 overflow-y-auto">
            <p className="text-xs text-gray-400 px-1">
              ※ WBスコア昇順（支援優先度順）
            </p>
            {residents.map(r => (
              <button
                key={r.id}
                onClick={() => setSelected(r)}
                className={`w-full text-left p-3 rounded-xl border transition ${
                  selected?.住民ID === r.住民ID
                    ? 'border-indigo-400 bg-indigo-50'
                    : 'border-gray-200 bg-white hover:border-indigo-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-medium text-sm text-gray-800">{r.住民名}</span>
                  <CoachStatusBadge status={r.コーチングステータス} />
                </div>
                <div className="text-xs text-gray-400 mb-2">{r.地区} ・ 相談{r.相談回数 ?? 0}件</div>
                <WbScoreBar score={r.WBスコア} />
              </button>
            ))}
          </div>

          {/* ── 詳細パネル（右側） ── */}
          {selected ? (
            <div className="flex-1 bg-white rounded-xl border border-gray-200 p-5 overflow-y-auto space-y-5">

              {/* 住民ヘッダー */}
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">{selected.住民名}</h2>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-sm text-gray-500">{selected.地区}</span>
                    <span className="text-gray-300">|</span>
                    <span className="text-sm text-gray-500">住民ID: {selected.住民ID}</span>
                    <CoachStatusBadge status={selected.コーチングステータス} />
                  </div>
                </div>
                <button
                  onClick={handleCoachOne}
                  disabled={coaching}
                  className="shrink-0 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white text-sm font-medium rounded-lg transition"
                >
                  {coaching ? 'コーチング中…' : 'このコーチングを更新'}
                </button>
              </div>

              {/* WBスコア */}
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold text-gray-600">WBスコア</span>
                  <span className="text-2xl font-bold text-indigo-600">{selected.WBスコア ?? '—'} / 10</span>
                </div>
                <WbScoreBar score={selected.WBスコア} />
              </div>

              {/* 主な課題 */}
              {selected.主な課題 && selected.主な課題 !== '（未実施）' && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-600 mb-1">主な課題</h3>
                  <p className="text-sm text-gray-700 bg-orange-50 border border-orange-200 rounded-lg p-3">
                    {selected.主な課題}
                  </p>
                </div>
              )}

              {/* AIコーチングメッセージ */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-1">🤖 AIコーチングメッセージ</h3>
                {selected.AIコーチングメッセージ && selected.AIコーチングメッセージ !== '（未実施）' ? (
                  <div className="text-sm text-gray-700 bg-indigo-50 border border-indigo-200 rounded-lg p-4 leading-relaxed whitespace-pre-wrap">
                    {selected.AIコーチングメッセージ}
                  </div>
                ) : (
                  <div className="text-sm text-gray-400 bg-gray-50 rounded-lg p-4">
                    まだコーチングが実行されていません。「このコーチングを更新」ボタンを押してください。
                  </div>
                )}
              </div>

              {/* 相談履歴 */}
              <div>
                <h3 className="text-sm font-semibold text-gray-600 mb-2">
                  相談履歴（{selected.相談履歴.length}件）
                </h3>
                <div className="space-y-2">
                  {selected.相談履歴.length === 0 ? (
                    <p className="text-sm text-gray-400">相談履歴がありません</p>
                  ) : (
                    selected.相談履歴.map(c => (
                      <div key={c.id} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="text-xs text-gray-400">{c.相談日 ?? '日付不明'}</span>
                          <CategoryBadge category={c.相談カテゴリ} />
                          <StatusBadge status={c.解決状況} />
                        </div>
                        <p className="text-xs font-medium text-gray-700 mb-1">{c.相談名}</p>
                        <p className="text-xs text-gray-500 leading-relaxed">{c.相談内容}</p>
                        <p className="text-xs text-gray-400 mt-1">担当: {c.担当職員}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <div className="text-4xl mb-3">👤</div>
                <p className="text-sm">左の住民リストから選択してください</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
