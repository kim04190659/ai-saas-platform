'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'

type Question = { id: string; text: string; type: 'text' | 'select'; options?: string[]; placeholder?: string }

const QUESTIONS: Question[] = [
  { id: 'name', text: 'ニックネームを教えてください', type: 'text', placeholder: '例：たろう、おかあさん、ゆき' },
  { id: 'lifeType', text: '今の生活環境はどれに近いですか？', type: 'select', options: ['🧑 一人暮らし（若年）','👫 共働き・子育て中','🏠 専業＋子育て中','👨‍👩‍👴 仕事と介護の両立','🧓 シニア・一人暮らし','💼 フリーランス・副業中','🌾 地方移住・田舎暮らし'] },
  { id: 'age', text: '年代を教えてください', type: 'select', options: ['10代','20代','30代','40代','50代','60代','70代以上'] },
  { id: 'mainWorry', text: '今一番気になっていることは？', type: 'select', options: ['💰 お金・家計','🏥 健康・体調','🏠 家事・生活','👶 子育て・教育','👴 介護・見守り','💼 仕事・キャリア','🤝 人間関係','📚 学習・成長'] },
  { id: 'worryDetail', text: 'その困りをもう少し教えてください', type: 'text', placeholder: '例：毎月お金が足りない、睡眠が浅くて疲れが取れない...' },
  { id: 'idealState', text: '3ヶ月後、どんな状態になっていたいですか？', type: 'text', placeholder: '例：毎月51万円貯蓄できている、ぐっすり眠れている...' },
  { id: 'dataHabit', text: 'データを記録する習慣はありますか？', type: 'select', options: ['📱 アプリで毎日記録している','📝 たまにメモする程度','🤔 あまりない・これから始めたい'] },
]

function JoinContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const [token, setToken] = useState('')
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [notionUrl, setNotionUrl] = useState('')

  useEffect(() => {
    const t = searchParams.get('token')
    if (t) { setToken(t); localStorage.setItem('pc_token', t) }
    else { const s = localStorage.getItem('pc_token'); if (s) setToken(s) }
  }, [searchParams])

  const q = QUESTIONS[step]
  const answer = answers[q?.id] ?? ''
  const progress = Math.round((step / QUESTIONS.length) * 100)
  const setAnswer = (v: string) => setAnswers(p => ({ ...p, [q.id]: v }))

  const handleNext = async () => {
    if (!answer.trim()) return
    if (step < QUESTIONS.length - 1) { setStep(s => s + 1); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/personal-coarc/setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, answers }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setNotionUrl(data.notionUrl); setDone(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'セットアップ失敗')
    } finally { setLoading(false) }
  }

  if (done) return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-slate-50 flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-7xl mb-6">🎉</div>
        <h1 className="text-2xl font-bold text-slate-800 mb-3">{answers.name}さんのページができました！</h1>
        <p className="text-sm text-slate-500 mb-8 leading-relaxed">あなた専用のAIアシスタントが準備できました。<br />
        Notionでいつでも確認できます。</p>
        <a href={notionUrl} target="_blank" rel="noopener noreferrer"
          className="block w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-200 mb-4 text-center">
          📋 自分のページを見る（Notion）
        </a>
        <button
          onClick={() => router.push('/personal-coarc/chat')}
          className="block w-full py-4 rounded-2xl bg-white border-2 border-purple-300 text-purple-600 font-bold text-sm mb-4 text-center"
        >
          💬 AIアシスタントと話す
        </button>
        <button onClick={() => router.push('/')} className="text-sm text-slate-400">ホームに戻る</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-50 p-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-2 mb-6 pt-2">
          <span className="text-2xl">{'👨‍👩‍👧‍👦'}</span>
          <div>
            <h1 className="text-base font-bold text-slate-800">Personal Coarc 登録</h1>
            <p className="text-xs text-slate-400">あなた専用AIページを作成します</p>
          </div>
        </div>
        <div className="mb-6">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>質問 {step + 1} / {QUESTIONS.length}</span><span>{progress}%</span>
          </div>
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-purple-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 mb-4">
          <p className="text-base font-semibold text-slate-800 mb-5 leading-relaxed">{q.text}</p>
          {q.type === 'text' && (
            <textarea value={answer} onChange={e => setAnswer(e.target.value)} placeholder={q.placeholder} rows={3}
              className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm bg-slate-50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100 resize-none" />
          )}
          {q.type === 'select' && (
            <div className="space-y-2">
              {q.options?.map(opt => (
                <button key={opt} onClick={() => setAnswer(opt)}
                  className={`w-full text-left px-4 py-3 rounded-2xl border-2 text-sm font-medium transition-all ${
                    answer === opt ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-white text-slate-700 border-slate-100 hover:border-purple-200'
                  }`}>{opt}</button>
              ))}
            </div>
          )}
        </div>
        {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-red-600 text-sm">⚠️ {error}</div>}
        <button onClick={handleNext} disabled={!answer.trim() || loading}
          className="w-full py-4 rounded-2xl bg-purple-600 text-white font-bold text-sm shadow-lg shadow-purple-200 disabled:opacity-40 transition-transform active:scale-95">
          {loading ? '🤖 AIが分析中...' : step < QUESTIONS.length - 1 ? '次へ →' : '🚀 個人ページを作成する'}
        </button>
        <p className="text-center text-xs text-slate-300 mt-4">回答はあなたのデバイスとNotionにのみ保存されます</p>
      </div>
    </div>
  )
}

export default function PersonalCoarcJoinPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center text-slate-400">読み込み中...</div>}>
      <JoinContent />
    </Suspense>
  )
}
