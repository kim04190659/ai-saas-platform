'use client'

// =====================================================
//  src/app/(dashboard)/gyosei/settings/page.tsx
//  自治体プロフィール設定画面 — Sprint #14.8
//
//  ■ このページの役割
//    導入時に自治体が「選ぶだけ」でAI顧問の回答が
//    その自治体の言葉・文脈に自動カスタマイズされる（Layer 2設計）。
//
//  ■ 設計思想
//    設定30分で完了。以降はデータが積み上がるたびに
//    AI回答が自動的に「この自治体専用」になっていく。
//
//  ■ 技術ポイント
//    - /api/municipality-profile に GET/POST
//    - multi-select はチェックボックスグループで選択
//    - 設定保存後、/ai-advisor のシステムプロンプトに自動反映
// =====================================================

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useMunicipality } from '@/contexts/MunicipalityContext'

// ─── 型定義 ──────────────────────────────────────────

interface Profile {
  id?:              string
  municipalityName: string
  populationSize:   string
  mainChallenges:   string[]
  serviceAreas:     string[]
  sdlAxes:          string[]
  advisorStyle:     string
  regionNote:       string
  introducedDate:   string
}

// ─── 選択肢の定数 ────────────────────────────────────

const POPULATION_SIZES = ['〜1万人', '1〜3万人', '3〜5万人', '5〜10万人', '10万人以上']

const MAIN_CHALLENGES = [
  { value: '人口減少', emoji: '📉' },
  { value: '高齢化',   emoji: '👴' },
  { value: '財政逼迫', emoji: '💴' },
  { value: '担い手不足', emoji: '👥' },
  { value: '防災強化', emoji: '🌊' },
  { value: 'DX推進',   emoji: '💻' },
  { value: '観光振興', emoji: '🗾' },
  { value: '子育て支援', emoji: '👶' },
]

const SERVICE_AREAS = [
  { value: '福祉・介護',   emoji: '🏥' },
  { value: '子育て支援',   emoji: '👶' },
  { value: '防災・安全',   emoji: '🛡️' },
  { value: '産業・観光',   emoji: '🗾' },
  { value: 'インフラ管理', emoji: '🔧' },
  { value: '行政DX',       emoji: '💻' },
  { value: '教育',         emoji: '📚' },
  { value: '医療・健康',   emoji: '💊' },
]

const SDL_AXES = [
  { value: '共創軸', color: 'bg-purple-100 text-purple-700 border-purple-200', desc: '住民・職員・行政が共に価値を生み出す' },
  { value: '文脈軸', color: 'bg-blue-100 text-blue-700 border-blue-200',       desc: 'サービスが住民の生活文脈に合っている' },
  { value: '資源軸', color: 'bg-green-100 text-green-700 border-green-200',    desc: '外部パートナーや地域資源を活用している' },
  { value: '統合軸', color: 'bg-amber-100 text-amber-700 border-amber-200',    desc: '複数のサービスや知識を組み合わせている' },
  { value: '価値軸', color: 'bg-rose-100 text-rose-700 border-rose-200',       desc: '住民・職員の生活の質が向上している' },
]

const ADVISOR_STYLES = [
  { value: '提言型', desc: '課題に対して具体的な施策を積極的に提案する',   emoji: '💡' },
  { value: '対話型', desc: '質問を通じて担当者自身が気づきを得るよう促す', emoji: '💬' },
  { value: '分析型', desc: 'データに基づいた詳細な分析レポートを提供する', emoji: '📊' },
]

const EMPTY_PROFILE: Profile = {
  municipalityName: '',
  populationSize:   '',
  mainChallenges:   [],
  serviceAreas:     [],
  sdlAxes:          [],
  advisorStyle:     '提言型',
  regionNote:       '',
  introducedDate:   new Date().toISOString().split('T')[0],
}

// ─── 子コンポーネント ─────────────────────────────────

/** チェックボックスグループ（multi-select用） */
function CheckGroup({
  items,
  selected,
  onChange,
  activeClass = 'bg-emerald-600 text-white border-emerald-600',
}: {
  items: { value: string; emoji?: string; color?: string; desc?: string }[]
  selected: string[]
  onChange: (vals: string[]) => void
  activeClass?: string
}) {
  const toggle = (val: string) => {
    onChange(
      selected.includes(val)
        ? selected.filter(v => v !== val)
        : [...selected, val]
    )
  }

  return (
    <div className="flex flex-wrap gap-2">
      {items.map(item => {
        const isOn = selected.includes(item.value)
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => toggle(item.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
              isOn
                ? (item.color ?? activeClass)
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
            }`}
          >
            {item.emoji && <span className="mr-1">{item.emoji}</span>}
            {item.value}
          </button>
        )
      })}
    </div>
  )
}

// ─── メインコンポーネント ─────────────────────────────

export default function SettingsPage() {
  // Sprint #38B: 選択中の自治体を取得
  const { municipalityId, municipality } = useMunicipality()

  const [profile,  setProfile]  = useState<Profile>(EMPTY_PROFILE)
  const [saved,    setSaved]    = useState<Profile | null>(null)   // 保存済みプロフィール
  const [loading,  setLoading]  = useState(false)
  const [fetching, setFetching] = useState(true)
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null)

  // ── 保存済みプロフィールを読み込む（自治体切り替え時に再取得）──
  useEffect(() => {
    setFetching(true)
    setSaved(null)
    setProfile(EMPTY_PROFILE)
    setMessage(null)

    const load = async () => {
      try {
        // Sprint #38B: municipalityId をクエリパラメータで渡す
        const res  = await fetch(`/api/municipality-profile?municipalityId=${municipalityId}`)
        const data = await res.json()
        if (data.profile) {
          setProfile(data.profile)
          setSaved(data.profile)
        }
      } catch {
        // サイレントに処理
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [municipalityId])  // 自治体が切り替わると再読み込み

  // ── フォーム保存 ──
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile.municipalityName.trim()) {
      setMessage({ text: '自治体名を入力してください', ok: false })
      return
    }
    setLoading(true)
    setMessage(null)

    try {
      const res  = await fetch('/api/municipality-profile', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // Sprint #38B: municipalityId を一緒に送信
        body:    JSON.stringify({ ...profile, municipalityId }),
      })
      const data = await res.json()

      if (data.error) {
        setMessage({ text: data.error, ok: false })
      } else {
        setMessage({ text: data.message, ok: true })
        setSaved({ ...profile })
      }
    } catch {
      setMessage({ text: 'ネットワークエラーが発生しました', ok: false })
    } finally {
      setLoading(false)
    }
  }

  // ── フィールド更新ヘルパー ──
  const setField = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile(prev => ({ ...prev, [key]: value }))
  }

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-3xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            ⚙️ 自治体プロフィール設定
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {municipality.name} — 選ぶだけでAI顧問の回答がこの自治体専用の言葉に変わります
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
              🏛️ Layer 2 — AI自動カスタマイズ設定
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
              ⏱️ 設定30分で完了
            </span>
          </div>
        </div>

        {/* 保存済みプロフィールのサマリー */}
        {!fetching && saved && (
          <div className="bg-emerald-50 rounded-2xl border border-emerald-200 p-4">
            <p className="text-xs font-semibold text-emerald-600 mb-2">✅ 現在設定中のプロフィール</p>
            <div className="flex flex-wrap gap-3 text-sm text-emerald-800">
              <span className="font-bold text-base">{saved.municipalityName}</span>
              {saved.populationSize && <span>人口規模: {saved.populationSize}</span>}
              {saved.advisorStyle   && <span>AI顧問スタイル: {saved.advisorStyle}</span>}
            </div>
            {saved.mainChallenges.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {saved.mainChallenges.map(c => (
                  <span key={c} className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">
                    {c}
                  </span>
                ))}
              </div>
            )}
            <p className="text-xs text-emerald-600 mt-2">
              🤖 このプロフィールが <Link href="/ai-advisor" className="underline">AI Well-Being顧問</Link> に自動反映されています
            </p>
          </div>
        )}

        {/* ── 設定フォーム ── */}
        <form onSubmit={handleSave} className="space-y-5">

          {/* 基本情報 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">📍 基本情報</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* 自治体名 */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  自治体名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={profile.municipalityName}
                  onChange={e => setField('municipalityName', e.target.value)}
                  placeholder="例: 屋久島町"
                  required
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>

              {/* 人口規模 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-2">人口規模</label>
                <div className="flex flex-wrap gap-2">
                  {POPULATION_SIZES.map(size => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => setField('populationSize', size)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                        profile.populationSize === size
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>

              {/* 導入日 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">RunWith 導入日</label>
                <input
                  type="date"
                  value={profile.introducedDate}
                  onChange={e => setField('introducedDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                />
              </div>
            </div>
          </div>

          {/* 主要課題 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">⚠️ 主要課題（複数選択可）</h2>
            <p className="text-xs text-slate-400 mb-3">この自治体が抱える主な課題を選んでください</p>
            <CheckGroup
              items={MAIN_CHALLENGES}
              selected={profile.mainChallenges}
              onChange={vals => setField('mainChallenges', vals)}
              activeClass="bg-red-500 text-white border-red-500"
            />
          </div>

          {/* 重点サービス領域 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">🎯 重点サービス領域（複数選択可）</h2>
            <p className="text-xs text-slate-400 mb-3">住民サービスとして力を入れている領域を選んでください</p>
            <CheckGroup
              items={SERVICE_AREAS}
              selected={profile.serviceAreas}
              onChange={vals => setField('serviceAreas', vals)}
              activeClass="bg-blue-600 text-white border-blue-600"
            />
          </div>

          {/* SDL強化重点軸 */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">📐 SDL強化重点軸（複数選択可）</h2>
            <p className="text-xs text-slate-400 mb-3">AI顧問に特に注目してほしいSDL五軸を選んでください</p>
            <div className="space-y-2">
              {SDL_AXES.map(axis => {
                const isOn = profile.sdlAxes.includes(axis.value)
                return (
                  <button
                    key={axis.value}
                    type="button"
                    onClick={() => {
                      const next = isOn
                        ? profile.sdlAxes.filter(v => v !== axis.value)
                        : [...profile.sdlAxes, axis.value]
                      setField('sdlAxes', next)
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all ${
                      isOn
                        ? `${axis.color} shadow-sm`
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <span className={`w-4 h-4 rounded border-2 flex-shrink-0 flex items-center justify-center ${
                      isOn ? 'border-current bg-current' : 'border-slate-300'
                    }`}>
                      {isOn && <span className="text-white text-xs font-bold">✓</span>}
                    </span>
                    <span>
                      <span className="font-semibold text-sm">{axis.value}</span>
                      <span className="ml-2 text-xs opacity-70">{axis.desc}</span>
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* AI顧問スタイル */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">🤖 AI顧問スタイル</h2>
            <p className="text-xs text-slate-400 mb-3">どのようなスタイルで提言を受けたいですか？</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {ADVISOR_STYLES.map(style => {
                const isOn = profile.advisorStyle === style.value
                return (
                  <button
                    key={style.value}
                    type="button"
                    onClick={() => setField('advisorStyle', style.value)}
                    className={`p-4 rounded-xl border text-left transition-all ${
                      isOn
                        ? 'bg-violet-50 border-violet-300 text-violet-700'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                    }`}
                  >
                    <div className="text-2xl mb-2">{style.emoji}</div>
                    <div className="font-semibold text-sm">{style.value}</div>
                    <div className="text-xs mt-1 opacity-80 leading-relaxed">{style.desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 地域の特色メモ */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-slate-700 mb-1">📝 地域の特色メモ（任意）</h2>
            <p className="text-xs text-slate-400 mb-3">
              AI顧問に伝えたい地域固有の背景・状況・特色を自由に記述してください
            </p>
            <textarea
              value={profile.regionNote}
              onChange={e => setField('regionNote', e.target.value)}
              placeholder={`例：\n・世界自然遺産を持つ離島で、年間観光客が約30万人\n・職員12名で全行政サービスを運営している\n・高齢化率が全国平均の1.5倍で、介護サービス需要が急増中\n・移住者受け入れに積極的で、直近3年間で42世帯が移住`}
              rows={5}
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300 resize-none"
            />
            <p className="text-xs text-slate-400 mt-1">
              💡 ここに書いた内容がAI顧問の文脈理解に使われます。具体的なほど精度が上がります。
            </p>
          </div>

          {/* メッセージ */}
          {message && (
            <div className={`px-4 py-3 rounded-xl text-sm font-medium ${
              message.ok
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}>
              {message.ok ? '✅ ' : '❌ '}{message.text}
            </div>
          )}

          {/* 保存ボタン */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-4 rounded-xl bg-emerald-600 text-white font-semibold text-base hover:bg-emerald-700 transition-colors disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed shadow-sm"
          >
            {loading ? '保存中…' : '💾 プロフィールを保存してAI顧問に反映する'}
          </button>
        </form>

        {/* 連携説明 */}
        <div className="bg-violet-50 rounded-2xl border border-violet-200 p-4">
          <p className="text-xs font-semibold text-violet-600 mb-2">
            🔗 このプロフィールが使われる場面
          </p>
          <p className="text-sm text-violet-700 leading-relaxed">
            保存したプロフィールは <strong>AI Well-Being顧問</strong> の回答に自動反映されます。
            例えば「人口減少」「高齢化」を主要課題に設定すると、AIは常にその文脈で分析・提言を行います。
          </p>
          <div className="mt-3">
            <Link
              href="/ai-advisor"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 transition-colors border border-violet-200"
            >
              🤖 AI Well-Being顧問を開く
            </Link>
          </div>
        </div>

      </div>
    </div>
  )
}
