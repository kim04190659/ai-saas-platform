'use client';
/**
 * src/components/dept/StudentWellBeingPanel.tsx
 * 児童・生徒 WellBeing モニタリングパネル（教育部門固有）
 *
 * 学校生活満足度・不登校リスク・コメントを記録し、
 * Notion に蓄積する。AIが早期検知のサポートを行う。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

interface StudentRecord {
  id:             string;
  studentName:    string;
  schoolName:     string;
  grade:          string;
  satisfactionScore: number;
  absenceRisk:    '低' | '中' | '高';
  comment:        string;
  recordDate:     string;
}

interface Summary {
  totalCount:     number;
  avgScore:       number;
  highRiskCount:  number;
  schoolCount:    number;
}

interface FormState {
  studentName:       string;
  schoolName:        string;
  grade:             string;
  satisfactionScore: number;
  absenceRisk:       '低' | '中' | '高';
  comment:           string;
  recordDate:        string;
}

const GRADES = ['小1', '小2', '小3', '小4', '小5', '小6', '中1', '中2', '中3'];
const SCHOOLS = ['○○小学校', '△△小学校', '○○中学校', '△△中学校'];
const RISK_OPTIONS: ('低' | '中' | '高')[] = ['低', '中', '高'];

const makeInitialForm = (): FormState => ({
  studentName: '', schoolName: '', grade: '', satisfactionScore: 3,
  absenceRisk: '低', comment: '', recordDate: new Date().toISOString().split('T')[0],
});

function RiskBadge({ risk }: { risk: '低' | '中' | '高' }) {
  const cls = risk === '低' ? 'bg-emerald-100 text-emerald-700'
    : risk === '中' ? 'bg-amber-100 text-amber-700'
    : 'bg-red-100 text-red-700';
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>リスク: {risk}</span>;
}

export function StudentWellBeingPanel() {
  const [records,  setRecords]  = useState<StudentRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [form,     setForm]     = useState<FormState>(makeInitialForm());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res  = await fetch('/api/staff-condition?deptId=education-student');
      const data = await res.json();
      if (!data.error) { setRecords(data.records ?? []); setSummary(data.summary ?? null); }
    } catch { /* サイレント */ }
    finally { setFetching(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.studentName.trim()) { setMessage({ text: '生徒名を入力してください', ok: false }); return; }
    setLoading(true); setMessage(null);
    try {
      const res  = await fetch('/api/staff-condition', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, deptId: 'education-student' }) });
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

        <div className="rounded-2xl border bg-blue-50 border-blue-200 p-5">
          <h1 className="text-xl font-bold text-blue-700">🏫 教育｜児童・生徒 WellBeing モニタリング</h1>
          <p className="text-sm text-slate-500 mt-1">学校生活満足度・不登校リスクを記録し、早期支援につなげます</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-blue-100 text-blue-700 border-blue-200">
            📊 教育部門 専用DB に蓄積（疎結合）
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🏫', label: '総記録件数',         value: fetching ? '…' : summary?.totalCount   ?? 0, sub: '件',      cls: 'bg-white border-slate-200 text-slate-700' },
            { icon: '😊', label: '平均満足度スコア',   value: fetching ? '…' : summary?.avgScore      ?? 0, sub: '/ 5',    cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { icon: '⚠️', label: '高リスク件数',       value: fetching ? '…' : summary?.highRiskCount ?? 0, sub: '要対応', cls: 'bg-red-50 border-red-200 text-red-700' },
            { icon: '🏫', label: '記録校数',           value: fetching ? '…' : summary?.schoolCount   ?? 0, sub: '校',     cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
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
          <h2 className="text-base font-semibold text-slate-700 mb-4">📝 WellBeing 記録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">氏名 *</label>
                <input type="text" value={form.studentName} onChange={(e) => setField('studentName', e.target.value)} required placeholder="例: 山田 花子"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">学校名</label>
                <select value={form.schoolName} onChange={(e) => setField('schoolName', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">選択</option>
                  {SCHOOLS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">学年</label>
                <select value={form.grade} onChange={(e) => setField('grade', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300">
                  <option value="">選択</option>
                  {GRADES.map((g) => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">満足度スコア（1〜5）</label>
                <input type="number" value={form.satisfactionScore} onChange={(e) => setField('satisfactionScore', Number(e.target.value))} min="1" max="5"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">不登校リスク</label>
                <div className="flex gap-2">
                  {RISK_OPTIONS.map((r) => (
                    <button key={r} type="button" onClick={() => setField('absenceRisk', r)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${form.absenceRisk === r
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
                <label className="block text-xs font-medium text-slate-600 mb-1">記録日</label>
                <input type="date" value={form.recordDate} onChange={(e) => setField('recordDate', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">コメント（任意）</label>
              <textarea value={form.comment} onChange={(e) => setField('comment', e.target.value)} rows={2} placeholder="気になること、支援状況など…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none" />
            </div>
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}
            <button type="submit" disabled={loading} className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
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
                    {['氏名', '学校', '学年', '満足度', 'リスク', '記録日'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.studentName}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{r.schoolName || '—'}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{r.grade || '—'}</td>
                      <td className="py-2.5 px-3 text-slate-600">{r.satisfactionScore}/5</td>
                      <td className="py-2.5 px-3"><RiskBadge risk={r.absenceRisk} /></td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">{r.recordDate}</td>
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
