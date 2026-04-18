'use client'

// =====================================================
//  src/components/dept/DocumentGeneratorPanel.tsx
//  行政文書 AI自動起案パネル — Sprint #29
//
//  ■ 役割
//    職員が「メモ程度の箇条書き」を入力するだけで、
//    AIが正式な行政文書の下書きを生成する。
//    4種の文書タイプに対応：
//      📝 議事録 / 📢 通知文 / 📊 業務報告書 / 📋 回覧・通達
//
//  ■ 使い方
//    1. 文書種別を選択
//    2. 必要事項を入力（ポイントだけでOK）
//    3. 「AIに起案させる」ボタンをクリック
//    4. 生成された下書きを確認・編集
//    5. 「Notionに保存」でNotionページとして保存
// =====================================================

import { useState } from 'react'
import {
  FileText,
  Megaphone,
  BarChart3,
  ClipboardList,
  Sparkles,
  Copy,
  CheckCircle,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'
import type { DocumentKind } from '@/lib/document-generator'

// ─── 型定義 ──────────────────────────────────────────

interface GenerateResult {
  status:    'success' | 'error'
  kind?:     DocumentKind
  title?:    string
  content?:  string
  wordCount?: number
  notionPage?: { id: string; url: string }
  message?:  string
}

interface FieldDef {
  key:         string
  label:       string
  placeholder: string
  multiline:   boolean
  hint?:       string
}

// ─── 文書種別定義 ─────────────────────────────────────

const DOC_KINDS: {
  id:     DocumentKind
  icon:   React.ReactNode
  label:  string
  desc:   string
  color:  string
  fields: FieldDef[]
}[] = [
  {
    id:    'minutes',
    icon:  <FileText size={18} className="text-violet-600" />,
    label: '📝 議事録',
    desc:  '会議・打合せの議事録。出席者・議題・決定事項を入力するだけ。',
    color: 'bg-violet-50 border-violet-200',
    fields: [
      { key: 'title',     label: '会議名',           placeholder: '例: 4月 庁内業務改善会議',                 multiline: false },
      { key: 'date',      label: '開催日',           placeholder: '例: 2026年4月18日（金）14:00〜15:30',     multiline: false },
      { key: 'venue',     label: '開催場所',         placeholder: '例: 屋久島町役場 第1会議室 / Zoom',        multiline: false },
      { key: 'department',label: '担当部署',         placeholder: '例: 総務課',                              multiline: false },
      { key: 'author',    label: '記録者',           placeholder: '例: 総務課 佐藤花子',                      multiline: false },
      { key: 'attendees', label: '出席者',           placeholder: '例:\n田中課長（住民課）\n佐藤係長（総務課）\n鈴木主任（財政課）', multiline: true, hint: '改行区切りで入力' },
      { key: 'agenda',    label: '議題・協議事項',   placeholder: '例:\n1. DX推進計画の進捗確認\n2. 次年度予算の概算要求について\n3. その他', multiline: true, hint: '箇条書きでOK' },
      { key: 'decisions', label: '決定事項・アクション', placeholder: '例:\n・DX計画は5月末までに修正版を提出（担当:鈴木）\n・予算要求は4/25締切', multiline: true, hint: '担当者・期限も入れると◎' },
    ],
  },
  {
    id:    'notice',
    icon:  <Megaphone size={18} className="text-blue-600" />,
    label: '📢 住民向け通知文',
    desc:  '住民へのお知らせ・案内文。伝えたいポイントを入力するだけで正式な通知文に。',
    color: 'bg-blue-50 border-blue-200',
    fields: [
      { key: 'subject',    label: '件名',           placeholder: '例: 令和8年度 春の健康診断のご案内',         multiline: false },
      { key: 'date',       label: '作成日',         placeholder: '例: 令和8年4月18日',                        multiline: false },
      { key: 'recipient',  label: '宛先',           placeholder: '例: 屋久島町民の皆様 / 40歳以上の町民の方へ', multiline: false },
      { key: 'department', label: '担当部署',       placeholder: '例: 健康福祉課',                            multiline: false },
      { key: 'author',     label: '担当者・連絡先', placeholder: '例: 健康福祉課 担当:山田　TEL:0997-46-2111',  multiline: false },
      { key: 'bodyPoints', label: '通知のポイント', placeholder: '例:\n・実施日: 4月22日（水）〜5月30日（金）\n・場所: 屋久島町保健センター\n・対象: 40歳以上の町民\n・持参物: 保険証、前回の結果\n・申込: 電話または窓口', multiline: true, hint: '箇条書きで入力。AIが正式な文章に整えます' },
    ],
  },
  {
    id:    'report',
    icon:  <BarChart3 size={18} className="text-emerald-600" />,
    label: '📊 業務報告書',
    desc:  '月次・週次の業務報告書。主なトピックと課題を入力するだけ。',
    color: 'bg-emerald-50 border-emerald-200',
    fields: [
      { key: 'title',      label: '報告書タイトル', placeholder: '例: 住民課 2026年4月 業務報告書',           multiline: false },
      { key: 'period',     label: '報告期間',       placeholder: '例: 2026年4月1日〜4月30日',                 multiline: false },
      { key: 'date',       label: '作成日',         placeholder: '例: 2026年5月2日',                          multiline: false },
      { key: 'department', label: '部署名',         placeholder: '例: 住民課',                                multiline: false },
      { key: 'author',     label: '作成者',         placeholder: '例: 住民課長 田中一郎',                      multiline: false },
      { key: 'highlights', label: '主なトピック・成果', placeholder: '例:\n・窓口対応件数: 342件（前月比+12%）\n・マイナンバーカード申請サポート: 45件\n・転入届受付: 23件', multiline: true, hint: '数字があると◎' },
      { key: 'issues',     label: '課題・懸念事項', placeholder: '例:\n・GW前の窓口混雑が予想される\n・人員不足（1名育休中）', multiline: true },
      { key: 'nextSteps',  label: '来月の予定・アクション', placeholder: '例:\n・GW特別窓口の設置（5/3〜5/5）\n・住民税通知の発送（5月中旬）', multiline: true },
    ],
  },
  {
    id:    'circular',
    icon:  <ClipboardList size={18} className="text-amber-600" />,
    label: '📋 回覧・通達',
    desc:  '職員向けの回覧文書・業務通達。連絡事項を入力するだけで正式な形式に。',
    color: 'bg-amber-50 border-amber-200',
    fields: [
      { key: 'title',      label: '件名',           placeholder: '例: 時間外勤務申請ルールの変更について',      multiline: false },
      { key: 'date',       label: '発信日',         placeholder: '例: 令和8年4月18日',                        multiline: false },
      { key: 'toStaff',    label: '宛先職員',       placeholder: '例: 全職員 / 管理職各位 / 課長・係長各位',   multiline: false },
      { key: 'department', label: '発信部署',       placeholder: '例: 総務課',                                multiline: false },
      { key: 'author',     label: '発信者',         placeholder: '例: 総務課長 中村四郎',                      multiline: false },
      { key: 'bodyPoints', label: '通達・連絡のポイント', placeholder: '例:\n・5月1日から時間外申請は前日までに提出必須\n・申請フォームは庁内ポータルに掲載\n・不明点は総務課まで（内線201）', multiline: true, hint: '箇条書きで入力。AIが正式な通達文に整えます' },
    ],
  },
]

// ─── コンポーネント ───────────────────────────────────

export function DocumentGeneratorPanel() {
  const [selectedKind,  setSelectedKind]  = useState<DocumentKind>('minutes')
  const [formValues,    setFormValues]    = useState<Record<string, string>>({})
  const [generating,    setGenerating]    = useState(false)
  const [saving,        setSaving]        = useState(false)
  const [result,        setResult]        = useState<GenerateResult | null>(null)
  const [copied,        setCopied]        = useState(false)
  const [showForm,      setShowForm]      = useState(true)

  const currentKind = DOC_KINDS.find(d => d.id === selectedKind) ?? DOC_KINDS[0]

  function handleKindChange(kind: DocumentKind) {
    setSelectedKind(kind)
    setFormValues({})
    setResult(null)
    setShowForm(true)
  }

  function handleFieldChange(key: string, value: string) {
    setFormValues(prev => ({ ...prev, [key]: value }))
  }

  // ── AI に起案させる ──
  async function handleGenerate() {
    setGenerating(true)
    setResult(null)

    // title が未入力なら警告
    const title = formValues['title'] ?? formValues['subject'] ?? ''
    if (!title.trim()) {
      setResult({ status: 'error', message: 'タイトル（件名）を入力してください' })
      setGenerating(false)
      return
    }

    try {
      const body = {
        kind:       selectedKind,
        title:      formValues['title'] ?? formValues['subject'] ?? 'タイトル未設定',
        ...formValues,
        saveToNotion: false,
      }

      const res  = await fetch('/api/documents/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json() as GenerateResult
      setResult(data)
      if (data.status === 'success') setShowForm(false)
    } catch (e) {
      setResult({ status: 'error', message: `通信エラー: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setGenerating(false)
    }
  }

  // ── Notion に保存 ──
  async function handleSaveToNotion() {
    if (!result?.content) return
    setSaving(true)

    try {
      const body = {
        kind:       selectedKind,
        title:      formValues['title'] ?? formValues['subject'] ?? 'タイトル未設定',
        ...formValues,
        saveToNotion: true,
      }

      const res  = await fetch('/api/documents/generate', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json() as GenerateResult
      if (data.notionPage) {
        setResult(prev => prev ? { ...prev, notionPage: data.notionPage } : prev)
      }
    } catch (e) {
      console.error('Notion保存エラー:', e)
    } finally {
      setSaving(false)
    }
  }

  // ── クリップボードにコピー ──
  async function handleCopy() {
    if (!result?.content) return
    await navigator.clipboard.writeText(result.content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="text-amber-500" size={28} />
          行政文書 AI自動起案
        </h1>
        <p className="mt-1 text-gray-500 text-sm">
          メモ程度の箇条書きを入力するだけで、AIが正式な行政文書の下書きを生成します。職員は確認・加筆するだけでOK。
        </p>
      </div>

      {/* 文書種別選択 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {DOC_KINDS.map(d => (
          <button
            key={d.id}
            onClick={() => handleKindChange(d.id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl border text-sm font-medium transition-all ${
              selectedKind === d.id
                ? d.color + ' shadow-sm'
                : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {d.icon}
            <span className="text-center leading-tight">{d.label}</span>
          </button>
        ))}
      </div>

      <p className="text-xs text-gray-400">{currentKind.desc}</p>

      {/* 入力フォーム（トグル可能） */}
      <div className={`rounded-xl border overflow-hidden ${currentKind.color}`}>
        <button
          onClick={() => setShowForm(!showForm)}
          className="w-full flex items-center justify-between px-5 py-3 text-sm font-semibold text-gray-700"
        >
          <span>入力フォーム</span>
          {showForm ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>

        {showForm && (
          <div className="bg-white/80 p-5 space-y-4 border-t border-current/10">
            {currentKind.fields.map(field => (
              <div key={field.key}>
                <label className="text-xs font-medium text-gray-600 block mb-1">
                  {field.label}
                  {field.hint && (
                    <span className="text-gray-400 font-normal ml-2">{field.hint}</span>
                  )}
                </label>
                {field.multiline ? (
                  <textarea
                    rows={4}
                    value={formValues[field.key] ?? ''}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none
                               focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white
                               placeholder:text-gray-300 leading-relaxed"
                  />
                ) : (
                  <input
                    type="text"
                    value={formValues[field.key] ?? ''}
                    onChange={e => handleFieldChange(field.key, e.target.value)}
                    placeholder={field.placeholder}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                               focus:outline-none focus:ring-2 focus:ring-amber-300 bg-white
                               placeholder:text-gray-300"
                  />
                )}
              </div>
            ))}

            {/* 生成ボタン */}
            <div className="pt-2 flex items-center gap-3">
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="inline-flex items-center gap-2 px-8 py-3 bg-amber-500 hover:bg-amber-600
                           disabled:bg-amber-300 text-white font-bold rounded-xl
                           transition-colors shadow-sm text-sm"
              >
                <Sparkles size={16} className={generating ? 'animate-pulse' : ''} />
                {generating ? 'AI起案中...' : 'AIに起案させる'}
              </button>
              {generating && (
                <p className="text-xs text-gray-400 animate-pulse">
                  行政文体で下書きを生成中です（10〜20秒）
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* エラー表示 */}
      {result?.status === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-2">
          <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
          <p className="text-sm text-red-700">{result.message}</p>
        </div>
      )}

      {/* 生成結果 */}
      {result?.status === 'success' && result.content && (
        <div className="space-y-3">

          {/* 結果ヘッダー */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle size={18} className="text-emerald-600" />
              <span className="font-semibold text-gray-800 text-sm">下書き生成完了</span>
              <span className="text-xs text-gray-400">{result.wordCount?.toLocaleString()}字</span>
            </div>
            <div className="flex items-center gap-2">
              {/* Notionに保存ボタン */}
              {result.notionPage ? (
                <a
                  href={result.notionPage.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-violet-600 hover:text-violet-800
                             font-medium underline underline-offset-2"
                >
                  <ExternalLink size={13} />
                  Notionで開く
                </a>
              ) : (
                <button
                  onClick={handleSaveToNotion}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                             bg-violet-600 hover:bg-violet-700 disabled:bg-violet-300
                             text-white rounded-lg transition-colors"
                >
                  <RefreshCw size={12} className={saving ? 'animate-spin' : ''} />
                  {saving ? '保存中...' : 'Notionに保存'}
                </button>
              )}
              {/* コピーボタン */}
              <button
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                           bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                {copied
                  ? <><CheckCircle size={12} className="text-emerald-600" /> コピー済み</>
                  : <><Copy size={12} /> コピー</>
                }
              </button>
              {/* 再生成ボタン */}
              <button
                onClick={() => { setShowForm(true); setResult(null) }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                           bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
              >
                <RefreshCw size={12} />
                修正して再生成
              </button>
            </div>
          </div>

          {/* 生成文書テキスト */}
          <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
            <pre className="text-sm text-gray-800 whitespace-pre-wrap font-sans leading-7">
              {result.content}
            </pre>
          </div>

          {/* 使い方ガイド */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-amber-700 mb-2">✏️ この下書きの活用方法</p>
            <div className="text-xs text-amber-700 space-y-1">
              <p>1. 「コピー」してWordやNotionに貼り付け → 加筆・修正して完成させる</p>
              <p>2. 「Notionに保存」でNotionページとして保存 → 関係者と共有・コメントできる</p>
              <p>3. 内容を修正したい場合は「修正して再生成」でフォームに戻る</p>
            </div>
          </div>
        </div>
      )}

      {/* 補足説明 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>• 生成された文書はあくまで「下書き」です。内容を必ず確認・修正してからご使用ください。</p>
        <p>• 入力情報が多いほど精度が上がります。特に数字・日付・担当者名は正確に入力してください。</p>
        <p>• Notionに保存した文書は「🌱 新RunWith Platform」配下に「[AI起案]」タグ付きで保存されます。</p>
      </div>
    </div>
  )
}
