'use client';
/**
 * src/components/dept/ElderlyWellBeingPanel.tsx
 * 高齢者 WellBeing モニタリングパネル（医療・介護部門固有）
 *
 * 要介護高齢者の生活状況・孤独死リスクを記録・管理する。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

type CareLevel = '要支援1' | '要支援2' | '要介護1' | '要介護2' | '要介護3' | '要介護4' | '要介護5';
type IsolationRisk = '低' | '中' | '高';

interface ElderlyRecord {
  id:               string;
  name:             string;
  age:              number;
  careLevel:        CareLevel;
  livingScore:      number;
  isolationRisk:    IsolationRisk;
  lastVisitDate:    string;
  careManager:      string;
  notes:            string;
}

interface Summary {
  totalCount:        number;
  highRiskCount:     number;
  avgLivingScore:    number;
  visitScheduled:    number;
}

interface FormState {
  name:          string;
  age:           string;
  careLevel:     CareLevel;
  livingScore:   number;
  isolationRisk: IsolationRisk;
  lastVisitDate: string;
  careManager:   string;
  notes:         string;
}

const CARE_LEVELS: CareLevel[] = ['要支援1', '要支援2', '要介護1', '要介護2', '要介護3', '要介護4', '要介護5'];
const RISK_OPTIONS: IsolationRisk[] = ['低', '中', '高'];

const makeInitialForm = (): FormState => ({
  name: '', age: '', careLevel: '要介護1', livingScore: 3,
  isolationRisk: '低', lastVisitDate: new Date().toISOString().split('T')[0],
  careManager: '', notes: '',
});

function RiskBadge({ risk }: { risk: IsolationRisk }) {
  const cls = risk === '低' ? 'bg-emerald-100 text-emerald-700'
    : risk === '中' ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>孤独死リスク: {risk}</span>;
}

export function ElderlyWellBeingPanel() {
  const [records,  setRecords]  = useState<ElderlyRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [form,     setForm]     = useState<FormState>(makeInitialForm());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res  = await fetch('/api/staff-condition?deptId=healthcare-elderly');
      const data = await res.json();
      if (!data.error) { setRecords(data.records ?? []); setSummary(data.summary ?? null); }
    } catch { /* サイレント */ }
    finally { setFetching(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setMessage({ text: '氏名を入力してください', ok: false }); return; }
    setLoading(true); setMessage(null);
    try {
      const res  = await fetch('/api/staff-condition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, deptId: 'healthcare-elderly' }) });
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

        <div className="rounded-2xl border bg-rose-50 border-rose-200 p-5">
          <h1 className="text-xl font-bold text-rose-700">🏥 医療・介護｜高齢者 WellBeing モニタリング</h1>
          <p className="text-sm text-slate-500 mt-1">要介護高齢者の生活状況・孤独死リスクを継続的に記録します</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-rose-100 text-rose-700 border-rose-200">
            📊 医療・介護 専用DB に蓄積（疎結合）
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '👴', label: '登録件数',        value: fetching ? '…' : summary?.totalCount     ?? 0, sub: '名',    cls: 'bg-white border-slate-200 text-slate-700' },
            { icon: '⚠️', label: '高リスク件数',    value: fetching ? '…' : summary?.highRiskCount   ?? 0, sub: '要対応', cls: 'bg-red-50 border-red-200 text-red-700' },
            { icon: '💚', label: '平均生活状況スコア', value: fetching ? '…' : summary?.avgLivingScore ?? 0, sub: '/ 5',  cls: 'bg-rose-50 border-rose-200 text-rose-700' },
            { icon: '📅', label: '今週訪問予定',    value: fetching ? '…' : summary?.visitScheduled  ?? 0, sub: '件',    cls: 'bg-amber-50 border-amber-200 text-amber-700' },
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
          <h2 className="text-base font-semibold text-slate-700 mb-4">📝 高齢者 WellBeing 記録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">氏名 *</label>
                <input type="text" value={form.name} onChange={(e) => setField('name', e.target.value)} required placeholder="例: 田中 ふみ"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">年齢</label>
                <input type="number" value={form.age} onChange={(e) => setField('age', e.target.value)} min="65" max="120" placeholder="例: 82"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">介護度</label>
                <select value={form.careLevel} onChange={(e) => setField('careLevel', e.target.value as CareLevel)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300">
                  {CARE_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">生活状況スコア（1〜5）</label>
                <input type="number" value={form.livingScore} onChange={(e) => setField('livingScore', Number(e.target.value))} min="1" max="5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">孤独死リスク</label>
                <div className="flex gap-2">
                  {RISK_OPTIONS.map((r) => (
                    <button key={r} type="button" onClick={() => setField('isolationRisk', r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${form.isolationRisk === r
                        ? r === '低' ? 'bg-emerald-500 text-white border-transparent'
                          : r === '中' ? 'bg-amber-400 text-white border-transparent'
                          : 'bg-red-500 text-white border-transparent'
                        : 'bg-white border-slate-200 text-slate-500'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">最終訪問日</label>
                <input type="date" value={form.lastVisitDate} onChange={(e) => setField('lastVisitDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">担当ケアマネージャー</label>
                <input type="text" value={form.careManager} onChange={(e) => setField('careManager', e.target.value)} placeholder="例: 鈴木 一郎"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">申し送り・メモ</label>
                <input type="text" value={form.notes} onChange={(e) => setField('notes', e.target.value)} placeholder="変化・気になる点など"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
            </div>
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-rose-600 hover:bg-rose-700 text-white'}`}>
              {loading ? '記録中…' : '💾 Notionに記録する'}
            </button>
          </form>
        </div>

        {records.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-3">📋 モニタリング記録一覧</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['氏名', '年齢', '介護度', '生活状況', 'リスク', '最終訪問日'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.name}</td>
                      <td className="py-2.5 px-3 text-slate-500">{r.age}歳</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{r.careLevel}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.livingScore}/5</td>
                      <td className="py-2.5 px-3"><RiskBadge risk={r.isolationRisk} /></td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">{r.lastVisitDate}</td>
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
