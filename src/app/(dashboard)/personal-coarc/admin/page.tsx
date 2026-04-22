'use client'

// Personal Coarc 管理者セットアップ画面
// APIキーを登録してQRコードを生成し、家族に招待URLを発行する

import { useState } from 'react'

export default function PersonalCoarcAdminPage() {
  const [apiKey, setApiKey] = useState('')
  const [inviteUrl, setInviteUrl] = useState('')
  const [qrUrl, setQrUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState(false)

  const handleGenerate = async () => {
    if (!apiKey.trim()) { setError('APIキーを入力してください'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/personal-coarc/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      const url = `${window.location.origin}/personal-coarc/join?token=${data.token}`
      setInviteUrl(url)
      setQrUrl(`https://chart.googleapis.com/chart?chs=280x280&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '生成に失敗しました')
    } finally { setLoading(false) }
  }

  const handleCopy = async () => {
    await navigator.clipboard.writeText(inviteUrl)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-slate-50 p-4">
      <div className="max-w-sm mx-auto">
        <div className="flex items-center gap-3 mb-8 pt-2">
          <div className="w-12 h-12 rounded-2xl bg-purple-600 flex items-center justify-center text-2xl shadow-lg">
            {'👨‍👩‍👧‍👦'}
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">Personal Coarc</h1>
            <p className="text-xs text-slate-500">管理者セットアップ · 家族招待</p>
          </div>
        </div>
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">1</div>
            <p className="font-semibold text-slate-800 text-sm">Claude APIキーを入力</p>
          </div>
          <p className="text-xs text-slate-400 mb-3 leading-relaxed">
            platform.anthropic.com で取得したAPIキー（sk-ant-...）を入力してください。家族全員がこのキーを共有します。
          </p>
          <input type="password" value={apiKey} onChange={e => setApiKey(e.target.value)}
            placeholder="sk-ant-api03-..."
            className="w-full px-4 py-3 border border-slate-200 rounded-2xl text-sm font-mono bg-slate-50 focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100" />
          <a href="https://platform.anthropic.com/settings/api-keys" target="_blank" rel="noopener noreferrer"
            className="text-xs text-purple-500 mt-2 inline-flex items-center gap-1">
            🔑 APIキーの取得はこちら（新規登録で無料クレジットあり）
          </a>
        </div>
        <button onClick={handleGenerate} disabled={loading || !apiKey.trim()}
          className="w-full py-4 rounded-2xl bg-purple-600 text-white font-semibold text-sm shadow-lg shadow-purple-200 disabled:opacity-40 mb-4 transition-transform active:scale-95">
          {loading ? '🔐 暗号化中...' : '✨ 家族招待QRを生成する'}
        </button>
        {error && <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-4 text-red-600 text-sm">⚠️ {error}</div>}
        {qrUrl && (
          <div className="bg-white rounded-3xl shadow-sm border border-purple-100 p-5 mb-4">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center">2</div>
              <p className="font-semibold text-slate-800 text-sm">LINEでQRコードを送る</p>
            </div>
            <div className="flex justify-center mb-4">
              <div className="bg-white p-4 rounded-2xl border-2 border-purple-100 shadow-sm">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={qrUrl} alt="家族招待QRコード" width={200} height={200} />
              </div>
            </div>
            <div className="bg-purple-50 rounded-2xl p-4 mb-4">
              <p className="text-xs font-semibold text-purple-700 mb-1">📱 家族への案内文（コピーして送信）</p>
              <p className="text-xs text-purple-600 leading-relaxed">「このQRをスキャンして、3分のアンケートに答えると、あなた専用のAIアシスタントが作られるよ！」</p>
            </div>
            <button onClick={handleCopy}
              className="w-full py-3 rounded-2xl border-2 border-purple-200 text-purple-600 text-sm font-medium">
              {copied ? '✅ コピーしました！' : '🔗 招待URLをコピー'}
            </button>
          </div>
        )}
        {qrUrl && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-7 h-7 rounded-full bg-green-500 text-white text-xs font-bold flex items-center justify-center">3</div>
              <p className="font-semibold text-slate-800 text-sm">家族がスキャンすると…</p>
            </div>
            <div className="space-y-3">
              {[
                {e:'📋',t:'7問のヒアリングに回答（約3分）'},
                {e:'🤖',t:'AIが困りを分析して個人ページを自動生成'},
                {e:'📊',t:'データを蓄積するたびにAIが進化'},
                {e:'💬',t:'いつでもAIに相談できる状態になる'}
              ].map(i=>(
                <div key={i.t} className="flex items-center gap-3 text-sm text-slate-600">
                  <span className="text-lg">{i.e}</span><span>{i.t}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <p className="text-center text-xs text-slate-300 mt-6">APIキーはデバイス内のみに保存・外部送信なし</p>
      </div>
    </div>
  )
}
