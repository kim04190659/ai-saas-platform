'use client'

// =====================================================
//  src/components/dept/PushNotificationPanel.tsx
//  住民プッシュ通知 管理パネル — Sprint #29
//
//  ■ 役割
//    職員が住民のLINEに「能動的な通知」を送るための管理画面。
//    2つのタブで機能を分離：
//
//    [緊急配信タブ]
//      → 今すぐ全フォロワーに一斉送信（ブロードキャスト）
//      → 緊急アラート・設備メンテナンス・行事案内等のテンプレート付き
//
//    [期限リマインドタブ]
//      → Notionの通知スケジュールDBから今日の配信対象を確認・手動実行
//      → Vercel Cronで毎朝8時に自動実行される
// =====================================================

import { useState } from 'react'
import {
  Bell,
  Send,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Megaphone,
  Calendar,
  Zap,
  Wrench,
  FileText,
  Leaf,
  Eye,
  Clock,
} from 'lucide-react'

// ─── 型定義 ──────────────────────────────────────────

type Tab = 'broadcast' | 'reminder'
type Template = 'emergency_alert' | 'deadline_reminder' | 'announcement' | 'maintenance' | 'seasonal_welfare'

interface BroadcastResult {
  status:   'success' | 'error'
  message:  string
  sentAt?:  string
  preview?: string
}

interface ReminderResult {
  status:  'success' | 'error'
  sent?:   number
  errors?: number
  message: string
}

// ─── テンプレート定義 ─────────────────────────────────

const TEMPLATES = [
  {
    id:    'emergency_alert' as Template,
    icon:  <Zap size={16} className="text-red-500" />,
    label: '🚨 緊急・災害アラート',
    color: 'bg-red-50 border-red-300',
    fields: ['alertType', 'area', 'detail', 'contact'] as const,
    defaults: {
      alertType: '断水',
      area:      '安房地区',
      detail:    '本日午前9時〜午後3時の間、断水作業を行います。水の確保をお願いします。',
      contact:   '屋久島町 上水道課 0997-46-2111',
    },
  },
  {
    id:    'announcement' as Template,
    icon:  <Megaphone size={16} className="text-blue-500" />,
    label: '📢 行事・一般お知らせ',
    color: 'bg-blue-50 border-blue-200',
    fields: ['title', 'body', 'url'] as const,
    defaults: {
      title: '春の健康診断のご案内',
      body:  '4月より春の健康診断を受け付けています。詳しくは健康福祉課までお問い合わせください。',
      url:   '',
    },
  },
  {
    id:    'maintenance' as Template,
    icon:  <Wrench size={16} className="text-amber-600" />,
    label: '🔧 設備メンテナンス',
    color: 'bg-amber-50 border-amber-200',
    fields: ['facility', 'startDate', 'endDate', 'impact'] as const,
    defaults: {
      facility:  '安房地区 上水道',
      startDate: '2026年5月1日',
      endDate:   '2026年5月1日',
      impact:    '作業中（9:00〜15:00）は断水します',
    },
  },
  {
    id:    'seasonal_welfare' as Template,
    icon:  <Leaf size={16} className="text-emerald-600" />,
    label: '🌿 季節別 福祉サービス',
    color: 'bg-emerald-50 border-emerald-200',
    fields: ['season'] as const,
    defaults: {
      season: '夏',
    },
  },
]

const SEASONAL_SERVICES: Record<string, string[]> = {
  '春': ['春の健康診断（4〜5月）', '介護予防教室（毎月第2火曜）', '花粉症相談（保健センター）'],
  '夏': ['熱中症アラート配信（6〜9月）', '冷房費支援制度（低所得者向け）', '夏の子育て相談会'],
  '秋': ['インフルエンザ予防接種（10〜11月）', '介護認定申請サポート', '健康長寿セミナー'],
  '冬': ['暖房費支援制度（11〜2月）', '流感予防接種助成', '年末年始の緊急相談窓口'],
}

// ─── メッセージプレビュー生成（フロント側） ───────────────

function buildPreview(template: Template, params: Record<string, string>): string {
  const footer = '\n\n（屋久島町）'
  switch (template) {
    case 'emergency_alert':
      return `🚨【緊急情報】${params.alertType ?? ''}のお知らせ\n\n対象地域: ${params.area ?? ''}\n\n${params.detail ?? ''}\n\n📞 問い合わせ: ${params.contact ?? ''}` + footer
    case 'announcement':
      return `📢【お知らせ】${params.title ?? ''}\n\n${params.body ?? ''}${params.url ? '\n\n🔗 詳細: ' + params.url : ''}` + footer
    case 'maintenance':
      return `🔧【設備メンテナンスのお知らせ】\n\n対象設備: ${params.facility ?? ''}\n作業期間: ${params.startDate ?? ''}〜${params.endDate ?? ''}\n\n影響: ${params.impact ?? ''}` + footer
    case 'seasonal_welfare': {
      const services = SEASONAL_SERVICES[params.season ?? '夏'] ?? []
      return `🌿【${params.season ?? ''}の福祉サービスのご案内】\n\n以下のサービスをご利用いただけます：\n${services.map(s => `  ・${s}`).join('\n')}\n\n詳細・申込: 福祉課（0997-46-2111）` + footer
    }
    default:
      return ''
  }
}

// ─── コンポーネント ───────────────────────────────────

export function PushNotificationPanel() {
  const [activeTab,     setActiveTab]     = useState<Tab>('broadcast')
  const [selectedTpl,   setSelectedTpl]   = useState<Template>('emergency_alert')
  const [params,        setParams]        = useState<Record<string, string>>(TEMPLATES[0].defaults as Record<string, string>)
  const [customText,    setCustomText]    = useState('')
  const [useCustom,     setUseCustom]     = useState(false)
  const [showPreview,   setShowPreview]   = useState(false)
  const [sending,       setSending]       = useState(false)
  const [broadcastResult, setBroadcastResult] = useState<BroadcastResult | null>(null)
  const [reminderResult,  setReminderResult]  = useState<ReminderResult | null>(null)

  const currentTpl = TEMPLATES.find(t => t.id === selectedTpl) ?? TEMPLATES[0]
  const previewText = useCustom
    ? customText
    : buildPreview(selectedTpl, params)

  function handleTemplateChange(id: Template) {
    setSelectedTpl(id)
    const tpl = TEMPLATES.find(t => t.id === id)
    if (tpl) setParams({ ...tpl.defaults } as Record<string, string>)
    setShowPreview(false)
    setBroadcastResult(null)
  }

  function handleParamChange(key: string, value: string) {
    setParams(prev => ({ ...prev, [key]: value }))
  }

  // ブロードキャスト送信
  async function handleBroadcast() {
    setSending(true)
    setBroadcastResult(null)
    try {
      const body = useCustom
        ? { template: selectedTpl, params: {}, customText }
        : { template: selectedTpl, params }

      const res  = await fetch('/api/notifications/broadcast', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      })
      const data = await res.json()
      setBroadcastResult(data)
    } catch (e) {
      setBroadcastResult({ status: 'error', message: `通信エラー: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSending(false)
    }
  }

  // 今日のリマインドを手動実行
  async function handleRunReminders() {
    setSending(true)
    setReminderResult(null)
    try {
      const res  = await fetch('/api/notifications/reminders')
      const data = await res.json()
      setReminderResult(data)
    } catch (e) {
      setReminderResult({ status: 'error', message: `通信エラー: ${e instanceof Error ? e.message : String(e)}` })
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ヘッダー */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Bell className="text-indigo-600" size={28} />
          住民プッシュ通知
        </h1>
        <p className="mt-1 text-gray-500 text-sm">
          住民が相談する前に、必要な情報をLINEで先回りして届けます。職員が対応する前に問題を解決できます。
        </p>
      </div>

      {/* タブ */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1">
        {[
          { id: 'broadcast' as Tab, icon: <Send size={14} />,      label: '緊急・一斉配信' },
          { id: 'reminder'  as Tab, icon: <Calendar size={14} />,  label: '期限リマインド（自動）' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === t.id
                ? 'bg-white shadow-sm text-gray-900'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════ 緊急・一斉配信タブ ════════════════════════ */}
      {activeTab === 'broadcast' && (
        <div className="space-y-5">

          {/* テンプレート選択 */}
          <div>
            <p className="text-xs font-semibold text-gray-500 mb-2">通知テンプレートを選択</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {TEMPLATES.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`flex flex-col items-center gap-1 p-3 rounded-xl border text-xs font-medium transition-all ${
                    selectedTpl === t.id
                      ? t.color + ' shadow-sm'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {t.icon}
                  <span className="text-center leading-tight">{t.label.slice(3)}</span>
                </button>
              ))}
            </div>
          </div>

          {/* カスタムテキスト切り替え */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setUseCustom(!useCustom)}
              className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                useCustom
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              {useCustom ? '✏️ 自由入力モード' : '📝 テンプレートモード'}
            </button>
            <span className="text-xs text-gray-400">（クリックで切り替え）</span>
          </div>

          {useCustom ? (
            /* 自由入力 */
            <textarea
              value={customText}
              onChange={e => setCustomText(e.target.value)}
              rows={6}
              placeholder="住民に送るメッセージを入力してください..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          ) : (
            /* テンプレートパラメータ入力 */
            <div className={`rounded-xl border p-4 space-y-3 ${currentTpl.color}`}>
              <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                {currentTpl.icon} {currentTpl.label} — 内容を入力
              </p>
              {(currentTpl.fields as readonly string[]).map(field => {
                if (field === 'season') {
                  return (
                    <div key={field}>
                      <label className="text-xs text-gray-500 block mb-1">季節</label>
                      <div className="flex gap-2">
                        {['春', '夏', '秋', '冬'].map(s => (
                          <button
                            key={s}
                            onClick={() => handleParamChange('season', s)}
                            className={`px-4 py-1.5 rounded-lg text-sm border transition-colors ${
                              params.season === s
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-gray-600 border-gray-200'
                            }`}
                          >{s}</button>
                        ))}
                      </div>
                    </div>
                  )
                }
                const labels: Record<string, string> = {
                  alertType: '障害種別',
                  area:      '対象地域',
                  detail:    '詳細説明',
                  contact:   '問い合わせ先',
                  title:     'タイトル',
                  body:      '本文',
                  url:       '詳細URL（任意）',
                  facility:  '対象設備',
                  startDate: '作業開始日',
                  endDate:   '作業終了日',
                  impact:    '影響内容',
                }
                const isLong = ['detail', 'body', 'impact'].includes(field)
                return (
                  <div key={field}>
                    <label className="text-xs text-gray-500 block mb-1">{labels[field] ?? field}</label>
                    {isLong ? (
                      <textarea
                        rows={2}
                        value={params[field] ?? ''}
                        onChange={e => handleParamChange(field, e.target.value)}
                        className="w-full border border-white/60 bg-white/80 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    ) : (
                      <input
                        type="text"
                        value={params[field] ?? ''}
                        onChange={e => handleParamChange(field, e.target.value)}
                        className="w-full border border-white/60 bg-white/80 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
                      />
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* プレビュー + 送信ボタン */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-gray-300
                         bg-white text-gray-700 rounded-xl text-sm hover:bg-gray-50 transition-colors"
            >
              <Eye size={15} />
              {showPreview ? 'プレビューを閉じる' : 'メッセージを確認'}
            </button>
            <button
              onClick={handleBroadcast}
              disabled={sending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700
                         disabled:bg-indigo-300 text-white font-semibold rounded-xl
                         transition-colors text-sm"
            >
              <Send size={15} className={sending ? 'animate-pulse' : ''} />
              {sending ? '送信中...' : '全フォロワーに今すぐ配信'}
            </button>
          </div>

          {/* プレビュー */}
          {showPreview && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs font-semibold text-green-700 mb-2 flex items-center gap-1">
                <Eye size={12} /> 住民LINEに届くメッセージ（プレビュー）
              </p>
              <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-white rounded-lg p-3 border border-green-100">
                {previewText || '（本文を入力してください）'}
              </pre>
            </div>
          )}

          {/* 送信結果 */}
          {broadcastResult && (
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${
              broadcastResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {broadcastResult.status === 'success'
                ? <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                : <AlertTriangle size={18} className="text-red-500 shrink-0" />
              }
              <div>
                <p className={`font-semibold text-sm ${
                  broadcastResult.status === 'success' ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {broadcastResult.status === 'success' ? '配信完了' : 'エラー'}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{broadcastResult.message}</p>
                {broadcastResult.sentAt && (
                  <p className="text-xs text-gray-400 mt-1">
                    送信日時: {new Date(broadcastResult.sentAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ════════════════════════ 期限リマインドタブ ════════════════════════ */}
      {activeTab === 'reminder' && (
        <div className="space-y-5">

          {/* 説明 */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
            <p className="text-sm font-semibold text-indigo-800 flex items-center gap-2">
              <Clock size={16} />
              自動リマインドの仕組み
            </p>
            <div className="text-xs text-indigo-700 space-y-1">
              <p>1. 職員がNotionの「通知スケジュールDB」に送信日・サービス名・期限を登録</p>
              <p>2. 毎朝8時（JST）に Vercel Cron が自動実行され、今日送信予定の通知をLINEへ配信</p>
              <p>3. 送信済みになったレコードは自動的に「送信済み ✅」に更新される</p>
            </div>
          </div>

          {/* Notionスキーマ説明 */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
              <FileText size={12} />
              Notion「通知スケジュールDB」のフィールド構成
            </p>
            <div className="space-y-1">
              {[
                { field: 'タイトル',       type: 'title',     desc: '通知の件名（例: 国民健康保険 更新リマインド）' },
                { field: '送信日',         type: 'date',      desc: 'この日の朝8時に自動送信' },
                { field: 'サービス名',     type: 'rich_text', desc: '例: 国民健康保険、介護認定更新' },
                { field: '期限日',         type: 'rich_text', desc: '例: 2026年5月31日' },
                { field: '担当窓口',       type: 'rich_text', desc: '例: 住民課 0997-46-2111' },
                { field: '対象ユーザーID', type: 'rich_text', desc: 'LINEのuserID（カンマ区切り）。空なら全員に配信' },
                { field: '送信済み',       type: 'checkbox',  desc: '送信後に自動でチェックされる' },
              ].map(row => (
                <div key={row.field} className="flex items-start gap-2 text-xs">
                  <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 shrink-0 w-28">{row.field}</span>
                  <span className="text-gray-400 w-16 shrink-0">{row.type}</span>
                  <span className="text-gray-600">{row.desc}</span>
                </div>
              ))}
            </div>
          </div>

          {/* 手動実行ボタン */}
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center space-y-3">
            <p className="text-sm text-gray-600">
              今日送信予定のリマインドをすぐに実行したい場合は、手動で実行できます。
            </p>
            <button
              onClick={handleRunReminders}
              disabled={sending}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700
                         disabled:bg-indigo-300 text-white font-semibold rounded-xl
                         transition-colors text-sm"
            >
              <RefreshCw size={15} className={sending ? 'animate-spin' : ''} />
              {sending ? '確認・送信中...' : '今日のリマインドを今すぐ実行'}
            </button>
            {sending && (
              <p className="text-xs text-gray-400 animate-pulse">
                Notionの送信スケジュールを確認しています...
              </p>
            )}
          </div>

          {/* 実行結果 */}
          {reminderResult && (
            <div className={`border rounded-xl p-4 flex items-start gap-3 ${
              reminderResult.status === 'success'
                ? 'bg-emerald-50 border-emerald-200'
                : 'bg-red-50 border-red-200'
            }`}>
              {reminderResult.status === 'success'
                ? <CheckCircle size={18} className="text-emerald-600 shrink-0" />
                : <AlertTriangle size={18} className="text-red-500 shrink-0" />
              }
              <div>
                <p className={`font-semibold text-sm ${
                  reminderResult.status === 'success' ? 'text-emerald-700' : 'text-red-600'
                }`}>
                  {reminderResult.status === 'success' ? '実行完了' : 'エラー'}
                </p>
                <p className="text-sm text-gray-600 mt-0.5">{reminderResult.message}</p>
                {reminderResult.sent !== undefined && (
                  <p className="text-xs text-gray-500 mt-1">
                    送信成功: {reminderResult.sent}件
                    {reminderResult.errors ? ` / 失敗: ${reminderResult.errors}件` : ''}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 補足説明 */}
      <div className="text-xs text-gray-400 space-y-1 border-t pt-4">
        <p>• ブロードキャストはLINE公式アカウントを「友だち追加」している住民全員に届きます。</p>
        <p>• 期限リマインドはVercel Cronにより毎朝8時（JST）に自動実行されます（<code>REMINDER_DB_ID</code>の設定が必要）。</p>
        <p>• 送信した通知はすべてNotionにログが記録されます。</p>
        <p>• LINEの無料プランは月5000通まで。大量配信はLINE有料プランをご検討ください。</p>
      </div>
    </div>
  )
}
