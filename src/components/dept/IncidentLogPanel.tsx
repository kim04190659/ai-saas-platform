'use client';
/**
 * src/components/dept/IncidentLogPanel.tsx
 * インシデント・出動記録パネル（警察・消防部門固有）
 *
 * 事件・火災・救急出動などのインシデントを記録・管理する。
 * AI がパターン分析し予防策を提言する（将来機能）。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

type IncidentType = '🚨 事件' | '🔥 火災' | '🚑 救急' | '🌊 自然災害' | '🚗 交通事故' | '📞 通報・相談';
type IncidentStatus = '対応中' | '解決済み' | '調査中';

interface IncidentRecord {
  id:             string;
  incidentType:   IncidentType;
  location:       string;
  dispatchCount:  number;
  status:         IncidentStatus;
  details:        string;
  occurredAt:     string;
}

interface Summary {
  totalThisMonth:   number;
  resolved:         number;
  inProgress:       number;
  totalDispatch:    number;
}

interface FormState {
  incidentType:  IncidentType;
  location:      string;
  dispatchCount: string;
  status:        IncidentStatus;
  details:       string;
  occurredAt:    string;
}

const INCIDENT_TYPES: IncidentType[] = ['🚨 事件', '🔥 火災', '🚑 救急', '🌊 自然災害', '🚗 交通事故', '📞 通報・相談'];
const STATUS_OPTIONS: IncidentStatus[] = ['対応中', '解決済み', '調査中'];

const makeInitialForm = (): FormState => ({
  incidentType: '🚑 救急', location: '', dispatchCount: '1', status: '解決済み', details: '', occurredAt: new Date().toISOString().slice(0, 16),
});

function StatusBadge({ status }: { status: IncidentStatus }) {
  const cls = status === '解決済み' ? 'bg-emerald-100 text-emerald-700'
    : status === '対応中' ? 'bg-amber-100 text-amber-700'
    : 'bg-blue-100 text-blue-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>{status}</span>;
}

export function IncidentLogPanel() {
  const [records,  setRecords]  = useState<IncidentRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [form,     setForm]     = useState<FormState>(makeInitialForm());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res  = await fetch('/api/citizen-service?deptId=safety-incident');
      const data = await res.json();
      if (!data.error) { setRecords(data.records ?? []); setSummary(data.summary ?? null); }
    } catch { /* サイレント */ }
    finally { setFetching(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim()) { setMessage({ text: '発生場所を入力してください', ok: false }); return; }
    setLoading(true); setMessage(null);
    try {
      const res  = await fetch('/api/citizen-service', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, deptId: 'safety-incident' }) });
      const data = await res.json();
      if (data.error) { setMessage({ text: data.error, ok: false }); }
      else { setMessage({ text: data.message ?? '記録しました', ok: true }); setForm(makeInitialForm()); await fetchData(); }
    } catch { setMessage({ text: 'ネットワークエラーが発生しました', ok: false }); }
    finally { setLoading(false); }
  };

  const setField = <K extends keyof FormState>(key: K, val: FormState[K]) => setForm((p) => ({ ...p, [key]: val }));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="rounded-2xl border bg-amber-50 border-amber-200 p-5">
          <h1 className="text-xl font-bold text-amber-700">👮 警察・消防｜インシデント・出動記録</h1>
          <p className="text-sm text-slate-500 mt-1">事件・火災・救急出動を記録し、地域安全の分析に活用します</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-amber-100 text-amber-700 border-amber-200">
            📊 警察・消防 専用DB に蓄積（疎結合）
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🚨', label: '今月件数',   value: fetching ? '…' : summary?.totalThisMonth ?? 0, sub: '件',    cls: 'bg-white border-slate-200 text-slate-700' },
            { icon: '✅', label: '解決済み',   value: fetching ? '…' : summary?.resolved        ?? 0, sub: '件',    cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { icon: '🔴', label: '対応中',     value: fetching ? '…' : summary?.inProgress      ?? 0, sub: '件',    cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { icon: '🚒', label: '延べ出動人数', value: fetching ? '…' : summary?.totalDispatch  ?? 0, sub: '名',   cls: 'bg-blue-50 border-blue-200 text-blue-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">📝 インシデント記録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">インシデント種別</label>
                <select value={form.incidentType} onChange={(e) => setField('incidentType', e.target.value as IncidentType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                  {INCIDENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">発生場所 *</label>
                <input type="text" value={form.location} onChange={(e) => setField('location', e.target.value)} required placeholder="例: ○○町地内"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">出動人数</label>
                <input type="number" value={form.dispatchCount} onChange={(e) => setField('dispatchCount', e.target.value)} min="0" placeholder="名"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">ステータス</label>
                <select value={form.status} onChange={(e) => setField('status', e.target.value as IncidentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300">
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">発生日時</label>
                <input type="datetime-local" value={form.occurredAt} onChange={(e) => setField('occurredAt', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">詳細・対応内容（任意）</label>
              <textarea value={form.details} onChange={(e) => setField('details', e.target.value)} rows={2} placeholder="状況の概要、対応内容など…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none" />
            </div>
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-amber-600 hover:bg-amber-700 text-white'}`}>
              {loading ? '記録中…' : '💾 Notionに記録する'}
            </button>
          </form>
        </div>

        {records.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-3">📋 記録一覧</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['種別', '発生場所', '出動人数', 'ステータス', '発生日時'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.incidentType}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{r.location}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.dispatchCount}名</td>
                      <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">{r.occurredAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-1">🌐 公務員連携 統合ダッシュボードと連動</p>
          <Link href="/koumuin/dashboard" className="mt-1 inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200">
            🌐 統合ダッシュボードを見る
          </Link>
        </div>
      </div>
    </div>
  );
}
