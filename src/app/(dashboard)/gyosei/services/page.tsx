'use client';
/**
 * ════════════════════════════════════════════════════════
 *  src/app/(dashboard)/gyosei/services/page.tsx
 *  Sprint #12: 住民サービス状況ページ
 * ════════════════════════════════════════════════════════
 *
 * ■ 概要
 *   自治体の行政サービス（福祉・医療・財政・窓口など）の
 *   稼働状況・窓口待ち時間・満足度スコアを入力し、Notionに蓄積する。
 *
 * ■ オントロジー連携
 *   CitizenService クラス × SDL「価値軸」
 *   → 住民Well-Beingスコアを自動計算してNotionに書き込む
 *
 * ■ UI構成
 *   1. サマリーカード（総サービス数・稼働中・平均満足度・Well-Beingスコア）
 *   2. サービス一覧テーブル（Notionから取得）
 *   3. 新規サービス記録フォーム
 */

import { useState, useEffect, useCallback } from 'react';

// ─── 型定義 ──────────────────────────────────────────────

/** APIから返ってくるサービス1件の型 */
interface ServiceRecord {
  id: string;
  serviceName: string;
  municipality: string;
  category: string;
  status: string;
  waitingMinutes?: number;
  satisfactionScore?: number;
  userCount?: number;
  wellbeingScore?: number;
  recordDate: string;
  notes?: string;
}

/** APIのサマリーデータの型 */
interface Summary {
  totalCount: number;
  activeCount: number;
  avgSatisfaction: number | null;
  categoryStats: Record<string, { count: number; avgScore: number }>;
}

/** フォーム入力値の型 */
interface FormData {
  serviceName: string;
  municipality: string;
  category: string;
  status: string;
  waitingMinutes: string;
  satisfactionScore: string;
  userCount: string;
  recordDate: string;
  notes: string;
}

// ─── 定数 ────────────────────────────────────────────────

/** サービスカテゴリの選択肢 */
const CATEGORIES = ['福祉', '医療', '財政', '窓口', '教育', 'インフラ'];

/** 稼働状況の選択肢と表示スタイル */
const STATUS_OPTIONS: Record<string, { label: string; color: string; bg: string }> = {
  '稼働中':       { label: '✅ 稼働中',       color: 'text-emerald-700', bg: 'bg-emerald-100' },
  'メンテナンス中': { label: '⚠️ メンテナンス中', color: 'text-yellow-700',  bg: 'bg-yellow-100'  },
  '停止':         { label: '🔴 停止',         color: 'text-red-700',     bg: 'bg-red-100'     },
};

/** カテゴリ別のアイコン */
const CATEGORY_ICONS: Record<string, string> = {
  '福祉': '🤝', '医療': '🏥', '財政': '💴', '窓口': '🏢', '教育': '📚', 'インフラ': '🏗️',
};

/** 屋久島町の代表的なサービス例（フォームの入力補助） */
const SAMPLE_SERVICES = [
  { name: '住民票交付窓口', category: '窓口' },
  { name: '介護保険サービス', category: '福祉' },
  { name: '国民健康保険', category: '医療' },
  { name: '保育所・こども園', category: '教育' },
  { name: '水道サービス', category: 'インフラ' },
  { name: '税務申告窓口', category: '財政' },
];

// ─── サブコンポーネント ───────────────────────────────────

/** Well-Beingスコアを色付きバッジで表示 */
function ScoreBadge({ score }: { score?: number }) {
  if (score === undefined || score === null) {
    return <span className="text-gray-400 text-sm">-</span>;
  }
  const color =
    score >= 70 ? 'bg-emerald-100 text-emerald-700' :
    score >= 40 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700';
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${color}`}>
      {score}点
    </span>
  );
}

/** サマリーカード1枚 */
function SummaryCard({
  label, value, unit, sub, color,
}: {
  label: string; value: string | number; unit?: string; sub?: string; color: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-xs text-gray-500 mb-1">{label}</p>
      <p className="text-2xl font-bold text-gray-800">
        {value}
        {unit && <span className="text-sm font-normal ml-1 text-gray-500">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export default function CitizenServicesPage() {
  // 一覧データ
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // フォーム状態
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  /** フォーム初期値 */
  const initialForm: FormData = {
    serviceName: '',
    municipality: '屋久島町',
    category: '窓口',
    status: '稼働中',
    waitingMinutes: '',
    satisfactionScore: '',
    userCount: '',
    recordDate: new Date().toISOString().split('T')[0],
    notes: '',
  };
  const [form, setForm] = useState<FormData>(initialForm);

  // ─── データ取得 ─────────────────────────────────────────

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/citizen-service');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setServices(data.services ?? []);
      setSummary(data.summary ?? null);
    } catch (e) {
      setError(`データ取得エラー: ${String(e)}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ─── フォーム送信 ────────────────────────────────────────

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitMsg(null);

    try {
      const payload = {
        serviceName: form.serviceName,
        municipality: form.municipality,
        category: form.category,
        status: form.status,
        recordDate: form.recordDate,
        ...(form.waitingMinutes && { waitingMinutes: Number(form.waitingMinutes) }),
        ...(form.satisfactionScore && { satisfactionScore: Number(form.satisfactionScore) }),
        ...(form.userCount && { userCount: Number(form.userCount) }),
        ...(form.notes && { notes: form.notes }),
      };

      const res = await fetch('/api/citizen-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || '登録失敗');

      setSubmitMsg({
        type: 'success',
        text: `✅ ${result.message}（Well-Beingスコア: ${result.wellbeingScore}点）`,
      });
      setForm(initialForm);
      // 一覧を再取得
      await fetchData();
      // 3秒後にメッセージ消去
      setTimeout(() => setSubmitMsg(null), 4000);
    } catch (e) {
      setSubmitMsg({ type: 'error', text: `❌ エラー: ${String(e)}` });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── レンダリング ────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">

      {/* ══════ ページヘッダー ══════ */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏘️ 住民サービス状況</h1>
          <p className="text-gray-500 mt-1 text-sm">
            行政サービスの稼働状況・窓口待ち時間・満足度を記録し、CitizenService × SDL価値軸で分析します
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          {showForm ? '✕ 閉じる' : '＋ 新規記録'}
        </button>
      </div>

      {/* ══════ サマリーカード ══════ */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <SummaryCard
            label="登録サービス数"
            value={summary.totalCount}
            unit="件"
            color="bg-white border-gray-200"
          />
          <SummaryCard
            label="稼働中"
            value={summary.activeCount}
            unit="件"
            sub={`${summary.totalCount ? Math.round((summary.activeCount / summary.totalCount) * 100) : 0}% 稼働率`}
            color="bg-emerald-50 border-emerald-200"
          />
          <SummaryCard
            label="平均満足度スコア"
            value={summary.avgSatisfaction ?? '-'}
            unit={summary.avgSatisfaction ? '/ 5' : ''}
            sub="1〜5点評価"
            color="bg-blue-50 border-blue-200"
          />
          <SummaryCard
            label="カテゴリ数"
            value={Object.keys(summary.categoryStats).length}
            unit="種類"
            sub={Object.keys(summary.categoryStats).map(c => CATEGORY_ICONS[c] ?? '').join(' ')}
            color="bg-purple-50 border-purple-200"
          />
        </div>
      )}

      {/* ══════ 新規記録フォーム ══════ */}
      {showForm && (
        <div className="bg-white border border-emerald-200 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-emerald-800 mb-4">📋 サービス状況を記録</h2>

          {/* 入力例ボタン */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-gray-500 self-center">入力例：</span>
            {SAMPLE_SERVICES.map(s => (
              <button
                key={s.name}
                type="button"
                onClick={() => setForm(f => ({ ...f, serviceName: s.name, category: s.category }))}
                className="text-xs bg-gray-100 hover:bg-emerald-100 text-gray-600 px-2 py-1 rounded transition"
              >
                {CATEGORY_ICONS[s.category]} {s.name}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              {/* サービス名 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  サービス名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.serviceName}
                  onChange={e => setForm(f => ({ ...f, serviceName: e.target.value }))}
                  placeholder="例: 住民票交付窓口"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* 自治体名 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  自治体名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.municipality}
                  onChange={e => setForm(f => ({ ...f, municipality: e.target.value }))}
                  placeholder="例: 屋久島町"
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* カテゴリ */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  カテゴリ <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {CATEGORIES.map(cat => (
                    <option key={cat} value={cat}>
                      {CATEGORY_ICONS[cat]} {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* 稼働状況 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">稼働状況</label>
                <select
                  value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                >
                  {Object.entries(STATUS_OPTIONS).map(([val, opt]) => (
                    <option key={val} value={val}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* 窓口待ち時間 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  窓口待ち時間（分）
                </label>
                <input
                  type="number"
                  value={form.waitingMinutes}
                  onChange={e => setForm(f => ({ ...f, waitingMinutes: e.target.value }))}
                  placeholder="例: 15"
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* 満足度スコア */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  満足度スコア（1〜5）
                </label>
                <input
                  type="number"
                  value={form.satisfactionScore}
                  onChange={e => setForm(f => ({ ...f, satisfactionScore: e.target.value }))}
                  placeholder="例: 4"
                  min={1}
                  max={5}
                  step={0.5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* 利用者数 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  月間利用者数（人）
                </label>
                <input
                  type="number"
                  value={form.userCount}
                  onChange={e => setForm(f => ({ ...f, userCount: e.target.value }))}
                  placeholder="例: 120"
                  min={0}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              {/* 記録日 */}
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  記録日 <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={e => setForm(f => ({ ...f, recordDate: e.target.value }))}
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>
            </div>

            {/* 備考 */}
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">備考</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="特記事項があれば記入"
                rows={2}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>

            {/* 送信メッセージ */}
            {submitMsg && (
              <div className={`text-sm rounded-lg px-4 py-2 ${
                submitMsg.type === 'success'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {submitMsg.text}
              </div>
            )}

            {/* 送信ボタン */}
            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-300 text-white text-sm font-medium px-6 py-2 rounded-lg transition"
              >
                {submitting ? '⏳ 送信中...' : '📝 Notionに記録する'}
              </button>
              <button
                type="button"
                onClick={() => setForm(initialForm)}
                className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2 rounded-lg border border-gray-200 hover:border-gray-300 transition"
              >
                リセット
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ══════ サービス一覧テーブル ══════ */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">📊 サービス記録一覧</h2>
          <button
            onClick={fetchData}
            className="text-xs text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            🔄 更新
          </button>
        </div>

        {loading ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">読み込み中...</div>
        ) : error ? (
          <div className="px-6 py-8 text-center text-red-500 text-sm">{error}</div>
        ) : services.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-gray-400 text-sm">まだ記録がありません</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-3 text-sm text-emerald-600 hover:underline"
            >
              最初のサービスを記録する →
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">サービス名</th>
                  <th className="text-left px-4 py-3 font-medium">カテゴリ</th>
                  <th className="text-left px-4 py-3 font-medium">稼働状況</th>
                  <th className="text-right px-4 py-3 font-medium">待ち時間</th>
                  <th className="text-right px-4 py-3 font-medium">満足度</th>
                  <th className="text-center px-4 py-3 font-medium">Well-Beingスコア</th>
                  <th className="text-left px-4 py-3 font-medium">記録日</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {services.map(svc => {
                  const statusStyle = STATUS_OPTIONS[svc.status] ?? STATUS_OPTIONS['稼働中'];
                  return (
                    <tr key={svc.id} className="hover:bg-gray-50 transition">
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {svc.serviceName}
                        {svc.notes && (
                          <p className="text-xs text-gray-400 font-normal">{svc.notes}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {CATEGORY_ICONS[svc.category] ?? ''} {svc.category}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusStyle.bg} ${statusStyle.color}`}>
                          {statusStyle.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {svc.waitingMinutes !== undefined ? `${svc.waitingMinutes}分` : '-'}
                      </td>
                      <td className="px-4 py-3 text-right text-gray-600">
                        {svc.satisfactionScore !== undefined
                          ? `${'★'.repeat(Math.round(svc.satisfactionScore))} ${svc.satisfactionScore}`
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <ScoreBadge score={svc.wellbeingScore} />
                      </td>
                      <td className="px-4 py-3 text-gray-400 text-xs">{svc.recordDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ══════ SDL価値軸ガイド ══════ */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2">
          💡 CitizenService × SDL価値軸の考え方
        </h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          住民サービスの質は単なる「稼働率」だけでなく、住民との<strong>共創（Co-creation）</strong>で生まれる価値です。
          窓口待ち時間・満足度・利用者数を継続記録することで、SDL五軸（共創・文脈・資源・統合・価値）に基づく
          Well-Beingスコアが自動算出されます。AI顧問タブで詳細分析が可能です。
        </p>
        <a
          href="/ai-advisor"
          className="inline-block mt-3 text-xs text-emerald-700 hover:text-emerald-900 underline"
        >
          🤖 AI Well-Being顧問で詳細分析する →
        </a>
      </div>

    </div>
  );
}
