'use client';
/**
 * src/components/dept/ServiceStatusPanel.tsx
 * サービス状況 共通パネル
 *
 * 行政・教育・医療介護の全部門で共有する「サービス状況」
 * 記録ページ。DeptConfig を受け取り部門ごとに切り替える。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DeptConfig } from '@/config/departments';

// ─── 型定義 ──────────────────────────────────────────────

interface ServiceRecord {
  id:                string;
  serviceName:       string;
  municipality:      string;
  category:          string;
  status:            string;
  userCount:         number;
  satisfactionScore: number;
  wellbeingScore:    number;
  recordDate:        string;
  notes:             string;
}

interface Summary {
  totalCount:      number;
  activeCount:     number;
  avgSatisfaction: number;
  avgWellbeing:    number;
}

interface FormState {
  serviceName:       string;
  municipality:      string;
  category:          string;
  status:            string;
  userCount:         string;
  satisfactionScore: string;
  recordDate:        string;
  notes:             string;
}

const STATUS_OPTIONS = ['稼働中', '停止中', '制限中', '点検中'];

const makeInitialForm = (): FormState => ({
  serviceName:       '',
  municipality:      '',
  category:          '',
  status:            '稼働中',
  userCount:         '',
  satisfactionScore: '3',
  recordDate:        new Date().toISOString().split('T')[0],
  notes:             '',
});

// ─── サブコンポーネント ────────────────────────────────────

function SummaryCard({ icon, label, value, sub, colorClass }: {
  icon: string; label: string; value: string | number; sub?: string; colorClass: string;
}) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-xs font-medium mt-0.5">{label}</div>
      {sub && <div className="text-xs opacity-70 mt-0.5">{sub}</div>}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === '稼働中' ? 'bg-emerald-100 text-emerald-700'
    : status === '制限中' ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export function ServiceStatusPanel({ dept }: { dept: DeptConfig }) {
  const { color } = dept;

  const [records,  setRecords]  = useState<ServiceRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [form,     setForm]     = useState<FormState>(makeInitialForm());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res  = await fetch(`/api/citizen-service?deptId=${dept.id}`);
      const data = await res.json();
      if (!data.error) {
        setRecords(data.records ?? []);
        setSummary(data.summary  ?? null);
      }
    } catch { /* サイレント */ }
    finally { setFetching(false); }
  };

  useEffect(() => { fetchData(); }, [dept.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.serviceName.trim()) {
      setMessage({ text: 'サービス名を入力してください', ok: false });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res  = await fetch('/api/citizen-service', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, deptId: dept.id }),
      });
      const data = await res.json();
      if (data.error) {
        setMessage({ text: data.error, ok: false });
      } else {
        setMessage({ text: data.message ?? '記録しました', ok: true });
        setForm(makeInitialForm());
        await fetchData();
      }
    } catch {
      setMessage({ text: 'ネットワークエラーが発生しました', ok: false });
    } finally {
      setLoading(false);
    }
  };

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) =>
    setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className={`rounded-2xl border ${color.bg} ${color.border} p-5`}>
          <h1 className={`text-xl font-bold ${color.text}`}>
            {dept.emoji} {dept.name}｜サービス状況
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {dept.name}が提供するサービスの稼働状況・利用者数・満足度を記録します
          </p>
          <span className={`mt-2 inline-block text-xs px-2.5 py-1 rounded-full border ${color.badge} ${color.border}`}>
            📊 {dept.fullName} 専用DB に蓄積（疎結合）
          </span>
        </div>

        {/* サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard icon={dept.emoji} label="総サービス数" value={fetching ? '…' : summary?.totalCount ?? 0} sub="件" colorClass="bg-white border-slate-200 text-slate-700" />
          <SummaryCard icon="✅" label="稼働中"     value={fetching ? '…' : summary?.activeCount ?? 0}     sub="件" colorClass={`${color.bg} ${color.border} ${color.text}`} />
          <SummaryCard icon="⭐" label="平均満足度" value={fetching ? '…' : summary?.avgSatisfaction ?? 0}  sub="/ 5.0" colorClass="bg-amber-50 border-amber-200 text-amber-700" />
          <SummaryCard icon="💚" label="WBスコア"   value={fetching ? '…' : summary?.avgWellbeing ?? 0}     sub="/ 100" colorClass="bg-emerald-50 border-emerald-200 text-emerald-700" />
        </div>

        {/* 入力フォーム */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">📝 サービス記録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">サービス名 *</label>
                <input type="text" value={form.serviceName} onChange={(e) => setField('serviceName', e.target.value)} required
                  placeholder="例: 住民票発行" className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">自治体名</label>
                <input type="text" value={form.municipality} onChange={(e) => setField('municipality', e.target.value)}
                  placeholder="例: 屋久島町" className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">カテゴリ</label>
                <select value={form.category} onChange={(e) => setField('category', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`}>
                  <option value="">選択してください</option>
                  {dept.serviceCategories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`}>
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">利用者数</label>
                <input type="number" value={form.userCount} onChange={(e) => setField('userCount', e.target.value)}
                  placeholder="例: 42" min="0" className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">満足度スコア（1〜5）</label>
                <input type="number" value={form.satisfactionScore} onChange={(e) => setField('satisfactionScore', e.target.value)}
                  min="1" max="5" className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">記録日</label>
                <input type="date" value={form.recordDate} onChange={(e) => setField('recordDate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">メモ</label>
                <input type="text" value={form.notes} onChange={(e) => setField('notes', e.target.value)}
                  placeholder="特記事項など" className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`} />
              </div>
            </div>
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}
            <button type="submit" disabled={loading}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : color.primary}`}>
              {loading ? '記録中…' : '💾 Notionに記録する'}
            </button>
          </form>
        </div>

        {/* 一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">📋 サービス記録一覧</h2>
          {fetching ? (
            <p className="text-sm text-slate-400 text-center py-8">読み込み中…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">まだ記録がありません</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['サービス名', 'カテゴリ', 'ステータス', '利用者数', '満足度', '記録日'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.serviceName}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{r.category || '—'}</td>
                      <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-2.5 px-3 text-slate-600">{r.userCount ?? '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.satisfactionScore ? `${r.satisfactionScore}/5` : '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">{r.recordDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 統合ダッシュボードへの導線 */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-1">🌐 公務員連携 統合ダッシュボードと連動</p>
          <p className="text-xs text-indigo-600">ここで記録したサービス状況は、統合ダッシュボードの住民カバー率として反映されます。</p>
          <Link href="/koumuin/dashboard" className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200">
            🌐 統合ダッシュボードを見る
          </Link>
        </div>

      </div>
    </div>
  );
}
