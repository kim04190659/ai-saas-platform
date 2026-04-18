'use client';
/**
 * src/components/dept/InfraIncidentPanel.tsx
 * 公共設備 障害・緊急修繕記録パネル（公共設備部門固有）
 *
 * 電気・水道・ガス・道路の障害発生〜復旧までを記録・管理する。
 * 影響世帯数・対応状況・復旧見込み時刻を一元管理。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

type InfraType   = '⚡ 電気' | '💧 上水道' | '🚿 下水道' | '🔥 ガス' | '🛣️ 道路' | '🌉 橋梁';
type IncidentStatus = '対応中' | '復旧済み' | '調査中' | '復旧見込み';
type Severity    = '大（100世帯以上）' | '中（10〜99世帯）' | '小（10世帯未満）' | '施設のみ';

interface InfraRecord {
  id:           string;
  infraType:    InfraType;
  location:     string;
  severity:     Severity;
  affectedCount: number;
  status:       IncidentStatus;
  details:      string;
  occurredAt:   string;
  estimatedRecovery: string;
}

interface Summary {
  totalThisMonth:  number;
  inProgress:      number;
  resolved:        number;
  totalAffected:   number;
}

interface FormState {
  infraType:         InfraType;
  location:          string;
  severity:          Severity;
  affectedCount:     string;
  status:            IncidentStatus;
  details:           string;
  occurredAt:        string;
  estimatedRecovery: string;
}

const INFRA_TYPES: InfraType[]      = ['⚡ 電気', '💧 上水道', '🚿 下水道', '🔥 ガス', '🛣️ 道路', '🌉 橋梁'];
const STATUS_OPTIONS: IncidentStatus[] = ['対応中', '復旧済み', '調査中', '復旧見込み'];
const SEVERITY_OPTIONS: Severity[]  = ['大（100世帯以上）', '中（10〜99世帯）', '小（10世帯未満）', '施設のみ'];

const makeInitialForm = (): FormState => ({
  infraType:         '💧 上水道',
  location:          '',
  severity:          '小（10世帯未満）',
  affectedCount:     '0',
  status:            '復旧済み',
  details:           '',
  occurredAt:        new Date().toISOString().slice(0, 16),
  estimatedRecovery: '',
});

function StatusBadge({ status }: { status: IncidentStatus }) {
  const cls =
    status === '復旧済み'   ? 'bg-emerald-100 text-emerald-700' :
    status === '対応中'     ? 'bg-amber-100 text-amber-700' :
    status === '復旧見込み' ? 'bg-blue-100 text-blue-700' :
                              'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {status}
    </span>
  );
}

function SeverityBadge({ severity }: { severity: Severity }) {
  const cls =
    severity === '大（100世帯以上）' ? 'bg-red-100 text-red-700' :
    severity === '中（10〜99世帯）'  ? 'bg-orange-100 text-orange-700' :
    severity === '小（10世帯未満）'  ? 'bg-amber-100 text-amber-700' :
                                       'bg-slate-100 text-slate-600';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}>
      {severity}
    </span>
  );
}

export function InfraIncidentPanel() {
  const [records,  setRecords]  = useState<InfraRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [form,     setForm]     = useState<FormState>(makeInitialForm());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  const fetchData = async () => {
    setFetching(true);
    try {
      const res  = await fetch('/api/citizen-service?deptId=infrastructure-incident');
      const data = await res.json();
      if (!data.error) {
        setRecords(data.records ?? []);
        setSummary(data.summary ?? null);
      }
    } catch { /* サイレント */ }
    finally { setFetching(false); }
  };
  useEffect(() => { fetchData(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.location.trim()) {
      setMessage({ text: '発生場所を入力してください', ok: false });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      const res  = await fetch('/api/citizen-service', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, deptId: 'infrastructure-incident' }),
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
        <div className="rounded-2xl border bg-cyan-50 border-cyan-200 p-5">
          <h1 className="text-xl font-bold text-cyan-700">🏗️ 公共設備｜障害・緊急修繕記録</h1>
          <p className="text-sm text-slate-500 mt-1">電気・水道・ガス・道路の障害発生から復旧完了まで記録・管理します</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-cyan-100 text-cyan-700 border-cyan-200">
            📊 公共設備 専用DB に蓄積（疎結合）
          </span>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🚨', label: '今月件数',     value: fetching ? '…' : summary?.totalThisMonth ?? 0, sub: '件',   cls: 'bg-white border-slate-200 text-slate-700' },
            { icon: '🔴', label: '対応中',       value: fetching ? '…' : summary?.inProgress      ?? 0, sub: '件',   cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { icon: '✅', label: '復旧済み',     value: fetching ? '…' : summary?.resolved         ?? 0, sub: '件',   cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { icon: '🏠', label: '累計影響世帯', value: fetching ? '…' : summary?.totalAffected    ?? 0, sub: '世帯', cls: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 記録フォーム */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">📝 障害・緊急修繕 記録</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* 設備種別・発生場所 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">設備種別</label>
                <select
                  value={form.infraType}
                  onChange={(e) => setField('infraType', e.target.value as InfraType)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  {INFRA_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">発生場所 *</label>
                <input
                  type="text"
                  value={form.location}
                  onChange={(e) => setField('location', e.target.value)}
                  required
                  placeholder="例: ○○町地内"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
            </div>

            {/* 影響規模・影響世帯数・ステータス */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">影響規模</label>
                <select
                  value={form.severity}
                  onChange={(e) => setField('severity', e.target.value as Severity)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  {SEVERITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">影響世帯数（戸）</label>
                <input
                  type="number"
                  value={form.affectedCount}
                  onChange={(e) => setField('affectedCount', e.target.value)}
                  min="0"
                  placeholder="0"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">対応状況</label>
                <select
                  value={form.status}
                  onChange={(e) => setField('status', e.target.value as IncidentStatus)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                >
                  {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* 発生日時・復旧見込み */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">発生日時</label>
                <input
                  type="datetime-local"
                  value={form.occurredAt}
                  onChange={(e) => setField('occurredAt', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">復旧見込み日時</label>
                <input
                  type="datetime-local"
                  value={form.estimatedRecovery}
                  onChange={(e) => setField('estimatedRecovery', e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300"
                />
              </div>
            </div>

            {/* 詳細 */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">詳細・対応内容（任意）</label>
              <textarea
                value={form.details}
                onChange={(e) => setField('details', e.target.value)}
                rows={2}
                placeholder="障害原因・対応内容・住民への周知状況など…"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-300 resize-none"
              />
            </div>

            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm ${message.ok ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${loading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-cyan-600 hover:bg-cyan-700 text-white'}`}
            >
              {loading ? '記録中…' : '💾 Notionに記録する'}
            </button>
          </form>
        </div>

        {/* 記録一覧 */}
        {records.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-5">
            <h2 className="text-base font-semibold text-slate-700 mb-3">📋 障害記録 一覧</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    {['設備種別', '発生場所', '影響規模', 'ステータス', '発生日時'].map((h) => (
                      <th key={h} className="text-left py-2 px-3 text-xs font-medium text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, i) => (
                    <tr key={r.id} className={`border-b border-slate-50 hover:bg-slate-50 ${i % 2 === 1 ? 'bg-slate-50/40' : ''}`}>
                      <td className="py-2.5 px-3 font-medium text-slate-700">{r.infraType}</td>
                      <td className="py-2.5 px-3 text-xs text-slate-500">{r.location}</td>
                      <td className="py-2.5 px-3"><SeverityBadge severity={r.severity} /></td>
                      <td className="py-2.5 px-3"><StatusBadge status={r.status} /></td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">{r.occurredAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 設備管理チェックリスト */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">💡 設備管理チェックポイント</h2>
          <ul className="space-y-2">
            {[
              '✅ 影響世帯100戸以上の障害は発生から30分以内に市長・担当副市長へ報告してください',
              '✅ 道路陥没・橋梁亀裂は通行止め措置を最優先で実施してください',
              '✅ ガス漏れは消防署への即時通報と周辺住民の避難誘導を優先してください',
              '✅ 復旧見込み時刻はLINEまたは防災無線で住民へ周知してください',
              '✅ 月1回の設備巡回点検結果をこの画面に記録し、老朽化トレンドを把握してください',
            ].map((tip, i) => (
              <li key={i} className="text-sm text-slate-700 bg-cyan-50 rounded-lg px-4 py-2 border border-cyan-100">{tip}</li>
            ))}
          </ul>
        </div>

        {/* 統合ダッシュボードへ */}
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
