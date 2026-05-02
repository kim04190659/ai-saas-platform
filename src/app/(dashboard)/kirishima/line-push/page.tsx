'use client';

/**
 * /kirishima/line-push — LINE プッシュ通知管理ページ
 * Sprint #88-C
 *
 * 霧島市の職員がRunWith管理画面から住民向けに
 * LINEプッシュ通知を手動送信するためのUI。
 *
 * 機能:
 *  - 送信先選択（ブロードキャスト / グループ / ユーザーID指定）
 *  - メッセージ入力（プレビュー付き）
 *  - 送信実行 → 送信履歴に追記
 */

import { useState, useRef } from 'react';
import {
  Send,
  Users,
  Radio,
  UserCheck,
  Clock,
  CheckCircle2,
  XCircle,
  Info,
  Megaphone,
} from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────────

/** 送信履歴の1件 */
interface SentRecord {
  id:        number;
  mode:      string;
  target:    string;
  message:   string;
  sentAt:    string;
  status:    'success' | 'error';
  errorMsg?: string;
}

/** 送信先モードの選択肢 */
const MODES = [
  {
    value: 'broadcast',
    label: 'ブロードキャスト（全友達）',
    icon:  Radio,
    desc:  'LINE公式アカウントの全友達に送信します',
    color: 'border-teal-400 bg-teal-50',
    badge: 'bg-teal-600',
  },
  {
    value: 'push-group',
    label: 'グループに送信',
    icon:  Users,
    desc:  '指定したLINEグループIDに送信します',
    color: 'border-sky-400 bg-sky-50',
    badge: 'bg-sky-600',
  },
  {
    value: 'push-user',
    label: 'ユーザーIDに送信',
    icon:  UserCheck,
    desc:  '特定のユーザーIDを指定して送信します（テスト用）',
    color: 'border-violet-400 bg-violet-50',
    badge: 'bg-violet-600',
  },
] as const;

/** メッセージテンプレート */
const TEMPLATES = [
  {
    label:   '断水のお知らせ',
    content: '【断水のお知らせ】\n○○地区において、配水管工事のため断水を実施します。\n・日時：〇月〇日（〇）〇時〜〇時\n・対象：〇〇町〇〇丁目\nご不便をおかけし申し訳ありません。',
  },
  {
    label:   'ごみ収集日変更',
    content: '【ごみ収集日変更のお知らせ】\n祝日のため、〇月〇日（〇）のごみ収集は翌日〇月〇日（〇）に変更になります。\nごみ出しは変更日の朝8時までにお願いします。',
  },
  {
    label:   'イベント案内',
    content: '【イベントのご案内】\n〇〇イベントを開催します！\n・日時：〇月〇日（〇）〇時〜〇時\n・場所：〇〇会館\n・内容：〇〇\nお気軽にご参加ください。',
  },
  {
    label:   '緊急避難情報',
    content: '【避難情報】\n〇〇地区に〇〇警報が発令されました。\n直ちに〇〇避難所（〇〇公民館）へ避難してください。\n危険な場所には近づかないでください。',
  },
];

// ─── コンポーネント ───────────────────────────────────────

export default function LinePushPage() {
  // フォームの状態
  const [mode,      setMode]      = useState<string>('broadcast');
  const [targetId,  setTargetId]  = useState('');
  const [message,   setMessage]   = useState('');
  const [sender,    setSender]    = useState('霧島市役所');
  const [sending,   setSending]   = useState(false);
  const [history,   setHistory]   = useState<SentRecord[]>([]);
  const idCounter = useRef(0);

  // メッセージのプレビュー文字（送信者名あり）
  const previewText = sender
    ? `【${sender}からのお知らせ】\n\n${message}`
    : message;

  // ── 送信処理 ─────────────────────────────────────────

  const handleSend = async () => {
    if (!message.trim()) {
      alert('メッセージを入力してください');
      return;
    }

    // 送信先IDが必要なモードの確認
    if ((mode === 'push-group' || mode === 'push-user') && !targetId.trim()) {
      alert('送信先IDを入力してください');
      return;
    }

    // ブロードキャストは確認ダイアログ
    if (mode === 'broadcast') {
      const ok = window.confirm(
        '全友達に送信します。\nよろしいですか？\n\n' + previewText.slice(0, 80) + '...'
      );
      if (!ok) return;
    }

    setSending(true);

    try {
      // APIに合わせてモードを変換
      const apiMode = mode === 'broadcast'
        ? 'broadcast'
        : mode === 'push-group' || mode === 'push-user'
          ? 'push'
          : 'push';

      const res = await fetch('/api/line/push-notify', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          mode:    apiMode,
          to:      (mode !== 'broadcast') ? targetId.trim() : undefined,
          message: message.trim(),
          sender:  sender.trim() || undefined,
        }),
      });

      const data = await res.json();
      idCounter.current += 1;

      if (res.ok && data.ok) {
        // 成功 → 履歴に追加
        setHistory((prev) => [
          {
            id:      idCounter.current,
            mode,
            target:  mode === 'broadcast' ? '全友達' : targetId,
            message: message.trim(),
            sentAt:  data.sentAt ?? new Date().toISOString(),
            status:  'success',
          },
          ...prev,
        ]);
        setMessage('');  // 送信後にメッセージをクリア
      } else {
        // エラー → 履歴にエラーとして追加
        setHistory((prev) => [
          {
            id:       idCounter.current,
            mode,
            target:   mode === 'broadcast' ? '全友達' : targetId,
            message:  message.trim(),
            sentAt:   new Date().toISOString(),
            status:   'error',
            errorMsg: data.error ?? '不明なエラー',
          },
          ...prev,
        ]);
      }
    } catch (e) {
      console.error('[LinePushPage] 送信例外:', e);
      idCounter.current += 1;
      setHistory((prev) => [
        {
          id:       idCounter.current,
          mode,
          target:   mode === 'broadcast' ? '全友達' : targetId,
          message:  message.trim(),
          sentAt:   new Date().toISOString(),
          status:   'error',
          errorMsg: 'ネットワークエラー',
        },
        ...prev,
      ]);
    } finally {
      setSending(false);
    }
  };

  // ── 日時フォーマット ──────────────────────────────────

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString('ja-JP', {
      month:  'numeric',
      day:    'numeric',
      hour:   '2-digit',
      minute: '2-digit',
    });
  };

  // ── レンダリング ──────────────────────────────────────

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-4 pb-2 border-b border-slate-200">
        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Megaphone className="text-white" size={22} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">LINE プッシュ通知</h1>
          <p className="text-sm text-slate-500">住民向けLINEメッセージを一斉送信します</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── 左列: 送信フォーム ── */}
        <div className="space-y-5">

          {/* 送信先モード選択 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              送信先
            </label>
            <div className="space-y-2">
              {MODES.map((m) => {
                const Icon    = m.icon;
                const checked = mode === m.value;
                return (
                  <button
                    key={m.value}
                    onClick={() => { setMode(m.value); setTargetId(''); }}
                    className={`w-full flex items-start gap-3 p-3 rounded-xl border-2 text-left transition-all ${
                      checked ? m.color + ' border-2' : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-lg ${checked ? m.badge : 'bg-slate-200'} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <Icon size={14} className={checked ? 'text-white' : 'text-slate-500'} />
                    </div>
                    <div>
                      <p className={`text-sm font-medium ${checked ? 'text-slate-800' : 'text-slate-600'}`}>
                        {m.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{m.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* グループID / ユーザーID 入力（broadcast以外） */}
          {(mode === 'push-group' || mode === 'push-user') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                {mode === 'push-group' ? 'グループID' : 'ユーザーID'}
              </label>
              <input
                type="text"
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                placeholder={mode === 'push-group' ? 'C xxxxxxxx...' : 'U xxxxxxxx...'}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              <p className="text-xs text-slate-400 mt-1">
                LINE Developersコンソール、またはWebhookログから確認できます。
              </p>
            </div>
          )}

          {/* 送信者名 */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              送信者名（任意）
            </label>
            <input
              type="text"
              value={sender}
              onChange={(e) => setSender(e.target.value)}
              placeholder="例：霧島市役所、環境課"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* テンプレート */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1">
              テンプレートから挿入
            </label>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  onClick={() => setMessage(t.content)}
                  className="px-3 py-1 text-xs rounded-full border border-teal-300 text-teal-700 hover:bg-teal-50 transition-colors"
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* メッセージ入力 */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-sm font-semibold text-slate-700">
                メッセージ本文
              </label>
              <span className={`text-xs ${message.length > 4000 ? 'text-red-500' : 'text-slate-400'}`}>
                {message.length} / 4000字
              </span>
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={6}
              maxLength={4000}
              placeholder="住民へのメッセージを入力してください..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          {/* 送信ボタン */}
          <button
            onClick={handleSend}
            disabled={sending || !message.trim()}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all ${
              sending || !message.trim()
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                : 'bg-teal-600 text-white hover:bg-teal-700 active:scale-95'
            }`}
          >
            <Send size={16} />
            {sending ? '送信中...' : 'LINEで送信する'}
          </button>
        </div>

        {/* ── 右列: プレビュー＋履歴 ── */}
        <div className="space-y-5">

          {/* メッセージプレビュー */}
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">
              送信イメージ（プレビュー）
            </label>
            <div className="bg-slate-100 rounded-xl p-4 min-h-[160px]">
              <div className="flex items-end gap-2">
                {/* アイコン */}
                <div className="w-8 h-8 bg-teal-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-white text-xs font-bold">官</span>
                </div>
                {/* バブル */}
                <div className="bg-white rounded-xl rounded-bl-sm px-4 py-3 max-w-[85%] shadow-sm">
                  {previewText
                    ? previewText.split('\n').map((line, i) => (
                        <p key={i} className="text-sm text-slate-800 leading-relaxed">
                          {line || <br />}
                        </p>
                      ))
                    : <p className="text-sm text-slate-400 italic">メッセージを入力すると<br />プレビューが表示されます</p>
                  }
                </div>
              </div>
            </div>
          </div>

          {/* 注意事項 */}
          <div className="flex gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl">
            <Info size={15} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 space-y-1">
              <p className="font-semibold">送信前の確認事項</p>
              <p>・ブロードキャストは全友達に届きます。誤送信に注意してください。</p>
              <p>・一度送信したメッセージは取り消せません。</p>
              <p>・LINE公式アカウントのメッセージ通数制限に注意してください。</p>
            </div>
          </div>

          {/* 送信履歴 */}
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Clock size={14} className="text-slate-500" />
              <span className="text-sm font-semibold text-slate-700">
                今セッションの送信履歴
              </span>
              <span className="text-xs text-slate-400">（{history.length}件）</span>
            </div>

            {history.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-sm border border-dashed border-slate-200 rounded-xl">
                まだ送信していません
              </div>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                {history.map((rec) => (
                  <div
                    key={rec.id}
                    className={`p-3 rounded-xl border text-xs space-y-1 ${
                      rec.status === 'success'
                        ? 'border-teal-200 bg-teal-50'
                        : 'border-red-200 bg-red-50'
                    }`}
                  >
                    {/* ステータスバッジ + 日時 */}
                    <div className="flex items-center gap-2">
                      {rec.status === 'success'
                        ? <CheckCircle2 size={13} className="text-teal-600" />
                        : <XCircle     size={13} className="text-red-500" />
                      }
                      <span className={rec.status === 'success' ? 'text-teal-700 font-medium' : 'text-red-600 font-medium'}>
                        {rec.status === 'success' ? '送信完了' : '送信失敗'}
                      </span>
                      <span className="text-slate-400 ml-auto">{formatDate(rec.sentAt)}</span>
                    </div>
                    {/* 送信先 */}
                    <p className="text-slate-600">
                      送信先: {rec.target}
                    </p>
                    {/* メッセージ冒頭 */}
                    <p className="text-slate-700 truncate">
                      {rec.message.slice(0, 60)}{rec.message.length > 60 ? '…' : ''}
                    </p>
                    {/* エラー詳細 */}
                    {rec.errorMsg && (
                      <p className="text-red-500">エラー: {rec.errorMsg}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
