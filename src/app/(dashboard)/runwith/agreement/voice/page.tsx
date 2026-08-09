'use client'
// =====================================================
//  src/app/(dashboard)/runwith/agreement/voice/page.tsx
//  意見を寄せる（非同期・低圧力の意見収集） — Sprint #94（REQ-03）
//
//  ■ このページの役割
//    論点に対する立場を、ワークショップのような公の場ではなく
//    好きなタイミングで記録できるようにする。
//    要件定義書 P2（既存事業者）ペルソナ「公の場で反対意見を言うと
//    角が立つので黙ってしまう」への対応。
//
//  ■ 同意文言（Sprint #93 k匿名性設計書 第6章より転記）
//    「あなたの立場は誰にも見せません。この論点に20人以上の方が
//    意見を寄せたときだけ、匿名の割合として地域に共有されます。」
//
//  ■ 技術ポイント
//    - GET  /api/issues        で論点の選択肢を取得
//    - GET  /api/stakeholders  でステークホルダーの選択肢を取得
//    - POST /api/position-records で立場表明を記録
// =====================================================

import { useState, useEffect, useCallback } from 'react'

interface IssueOption { id: string; title: string; status: string }
interface StakeholderOption { id: string; name: string }

const STANCES = ['賛成', '条件付き賛成', '保留', '反対']
const SDL_TAGS = ['健康', '仕事', 'コミュニティ', '教育', '環境', 'ガバナンス', '心理的Well-Being', '物質的基盤']
const CHANNELS = ['てつだって', 'ワークショップ', '窓口', 'その他']

const INITIAL_FORM = {
  issueId: '', stakeholderId: '', stance: '', sdlTags: [] as string[],
  freeText: '', channel: 'てつだって',
}

export default function VoicePage() {
  const [issues,       setIssues]       = useState<IssueOption[]>([])
  const [stakeholders, setStakeholders] = useState<StakeholderOption[]>([])
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState('')
  const [submitting,   setSubmitting]   = useState(false)
  const [submitMsg,    setSubmitMsg]    = useState('')

  const [form, setForm] = useState(INITIAL_FORM)

  const fetchOptions = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [issuesRes, stakeholdersRes] = await Promise.all([
        fetch('/api/issues'),
        fetch('/api/stakeholders'),
      ])
      const issuesJson       = await issuesRes.json()
      const stakeholdersJson = await stakeholdersRes.json()
      if (!issuesRes.ok)       throw new Error(issuesJson.error ?? '論点の取得に失敗しました')
      if (!stakeholdersRes.ok) throw new Error(stakeholdersJson.error ?? 'ステークホルダーの取得に失敗しました')

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setIssues(issuesJson.records.map((r: any) => ({ id: r.id, title: r.title, status: r.status })))
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setStakeholders(stakeholdersJson.records.map((r: any) => ({ id: r.id, name: r.name })))
    } catch (e) {
      setError(e instanceof Error ? e.message : 'エラーが発生しました')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchOptions() }, [fetchOptions])

  const toggleTag = (tag: string) => {
    setForm(p => ({
      ...p,
      sdlTags: p.sdlTags.includes(tag) ? p.sdlTags.filter(t => t !== tag) : [...p.sdlTags, tag],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setSubmitMsg('')
    try {
      const res  = await fetch('/api/position-records', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? '送信失敗')
      setSubmitMsg(json.message ?? '記録しました')
      setForm(INITIAL_FORM)
    } catch (e) {
      setSubmitMsg(`エラー: ${e instanceof Error ? e.message : '不明なエラー'}`)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">📮 意見を寄せる</h1>
        <p className="text-sm text-gray-500 mt-1">好きなタイミングで、論点への立場を記録できます</p>
      </div>

      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 text-sm text-teal-800">
        🔒 あなたの立場は誰にも見せません。この論点に20人以上の方が意見を寄せたときだけ、
        匿名の割合として地域に共有されます。
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-4">⚠️ {error}</div>
      )}

      {loading ? (
        <div className="text-center text-gray-400 py-12">読み込み中...</div>
      ) : (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div>
            <label className="block text-xs text-gray-600 mb-1">論点 <span className="text-red-500">*</span></label>
            <select
              required
              value={form.issueId}
              onChange={e => setForm(p => ({ ...p, issueId: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
            >
              <option value="">選択してください</option>
              {issues.map(i => <option key={i.id} value={i.id}>{i.title}（{i.status}）</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">あなた（ステークホルダー） <span className="text-red-500">*</span></label>
            <select
              required
              value={form.stakeholderId}
              onChange={e => setForm(p => ({ ...p, stakeholderId: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
            >
              <option value="">選択してください</option>
              {stakeholders.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              一覧にない場合は、先に「🧑‍🤝‍🧑 ステークホルダーマップ」から登録してください。
            </p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-2">あなたの立場 <span className="text-red-500">*</span></label>
            <div className="flex flex-wrap gap-2">
              {STANCES.map(s => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setForm(p => ({ ...p, stance: s }))}
                  className={`text-sm px-4 py-2 rounded-full border transition-colors ${
                    form.stance === s
                      ? 'bg-teal-600 text-white border-teal-600'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-teal-300'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-2">関係するテーマ（任意・複数選択可）</label>
            <div className="flex flex-wrap gap-2">
              {SDL_TAGS.map(tag => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => toggleTag(tag)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                    form.sdlTags.includes(tag)
                      ? 'bg-teal-500 text-white border-teal-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-teal-300'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">自由記述（任意・2000字以内）</label>
            <textarea
              value={form.freeText}
              onChange={e => setForm(p => ({ ...p, freeText: e.target.value.slice(0, 2000) }))}
              rows={4}
              placeholder="思っていることを自由にお書きください（個人が特定される表現は避けてください）"
              className="w-full text-sm border border-gray-300 rounded px-3 py-2"
            />
            <p className="text-xs text-gray-400 mt-1 text-right">{form.freeText.length} / 2000字</p>
          </div>

          <div>
            <label className="block text-xs text-gray-600 mb-1">どこから記録していますか</label>
            <select
              value={form.channel}
              onChange={e => setForm(p => ({ ...p, channel: e.target.value }))}
              className="w-full text-sm border border-gray-300 rounded px-3 py-2 bg-white"
            >
              {CHANNELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !form.issueId || !form.stakeholderId || !form.stance}
              className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-5 py-2 rounded-lg disabled:opacity-50"
            >
              {submitting ? '送信中...' : 'この立場を記録する'}
            </button>
            {submitMsg && (
              <p className={`text-sm ${submitMsg.startsWith('エラー') ? 'text-red-600' : 'text-green-600'}`}>{submitMsg}</p>
            )}
          </div>
        </form>
      )}
    </div>
  )
}
