'use client';
/**
 * src/components/dept/WellBeingDashboardPanel.tsx
 * WellBeing ダッシュボード 共通パネル
 *
 * 全部門共有の WellBeing 総合ダッシュボード。
 * DeptConfig を受け取り、部門ごとに色・ラベルを切り替える。
 * SDL五軸スコア・月別推移・KPIカードを表示する。
 */

import { useState } from 'react';
import Link from 'next/link';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import type { DeptConfig } from '@/config/departments';

// ─── 型定義 ──────────────────────────────────────────────

/** SDL 五軸スコア */
type SDLAxes = {
  E: number;  // Experience（体験価値）
  T: number;  // Trust（信頼）
  L: number;  // Learning（学習）
  W: number;  // Wellbeing（健康・幸福）
  P: number;  // Performance（成果）
};

/** 月別 WellBeing データ */
type MonthlyData = { month: string; score: number };

// ─── モックデータ生成（部門IDごとに少しずらす）──────────

function getMockData(deptId: string): { axes: SDLAxes; monthly: MonthlyData[]; avg: number; high: number; low: number; trend: number } {
  // 部門ごとに異なるスコアを返す（実際はNotionAPIから取得）
  const base: Record<string, SDLAxes> = {
    gyosei:     { E: 72, T: 68, L: 75, W: 70, P: 65 },
    education:  { E: 65, T: 62, L: 80, W: 63, P: 60 },
    safety:     { E: 70, T: 75, L: 68, W: 68, P: 72 },
    healthcare: { E: 58, T: 65, L: 62, W: 56, P: 60 },
  };
  const axes = base[deptId] ?? base.gyosei;
  const avg  = Math.round(Object.values(axes).reduce((s, v) => s + v, 0) / 5);

  const monthly: MonthlyData[] = [
    { month: '10月', score: avg - 5 },
    { month: '11月', score: avg - 3 },
    { month: '12月', score: avg - 6 },
    { month: '1月',  score: avg - 2 },
    { month: '2月',  score: avg + 1 },
    { month: '3月',  score: avg - 1 },
    { month: '4月',  score: avg },
  ];

  const scores = monthly.map((m) => m.score);
  const trend  = monthly[monthly.length - 1].score - monthly[monthly.length - 2].score;

  return { axes, monthly, avg, high: Math.max(...scores), low: Math.min(...scores), trend };
}

// ─── サブコンポーネント ────────────────────────────────────

/** SDL 軸バー */
function SDLBar({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="w-5 text-xs font-bold text-slate-500">{label}</span>
      <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorClass}`} style={{ width: `${score}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-semibold text-slate-600">{score}</span>
    </div>
  );
}

/** 月別グラフ（簡易バーチャート） */
function MonthlyChart({ data, colorClass }: { data: MonthlyData[]; colorClass: string }) {
  const max = Math.max(...data.map((d) => d.score));
  return (
    <div className="flex items-end gap-2 h-24">
      {data.map((d) => (
        <div key={d.month} className="flex-1 flex flex-col items-center gap-1">
          <div
            className={`w-full rounded-t-sm ${colorClass} opacity-80 transition-all`}
            style={{ height: `${(d.score / max) * 80}px` }}
          />
          <span className="text-xs text-slate-400">{d.month}</span>
        </div>
      ))}
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export function WellBeingDashboardPanel({ dept }: { dept: DeptConfig }) {
  const { color } = dept;
  const { axes, monthly, avg, high, low, trend } = getMockData(dept.id);

  const [selectedAxis, setSelectedAxis] = useState<keyof SDLAxes | null>(null);

  const SDL_LABELS: Record<keyof SDLAxes, string> = {
    E: 'Experience（体験価値）',
    T: 'Trust（信頼）',
    L: 'Learning（学習）',
    W: 'Wellbeing（健康・幸福）',
    P: 'Performance（成果）',
  };

  const TrendIcon = trend > 0
    ? <span className="flex items-center gap-0.5 text-emerald-600"><TrendingUp size={14} />+{trend}</span>
    : trend < 0
    ? <span className="flex items-center gap-0.5 text-rose-600"><TrendingDown size={14} />{trend}</span>
    : <span className="flex items-center gap-0.5 text-slate-400"><Minus size={14} />±0</span>;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className={`rounded-2xl border ${color.bg} ${color.border} p-5`}>
          <h1 className={`text-xl font-bold ${color.text}`}>
            {dept.emoji} {dept.name}｜WellBeingダッシュボード
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            {dept.staffLabel}のWellBeingをSDL五軸で総合可視化します
          </p>
          <div className="mt-2 flex gap-2 flex-wrap">
            <span className={`text-xs px-2.5 py-1 rounded-full border ${color.badge} ${color.border}`}>
              📊 {dept.fullName} 専用DB（疎結合）
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full border bg-slate-100 text-slate-500 border-slate-200">
              ※ 表示データはモック。Notion DB 接続後に実データに切り替わります
            </span>
          </div>
        </div>

        {/* KPI カード 4枚 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '💚', label: '平均WBスコア', value: avg, sub: '/ 100', cls: `${color.bg} ${color.border} ${color.text}` },
            { icon: '🏆', label: '最高スコア',   value: high, sub: '今期最高',   cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { icon: '⚠️', label: '最低スコア',   value: low,  sub: '要フォロー', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { icon: '📈', label: '先月比',       value: `${trend > 0 ? '+' : ''}${trend}`, sub: 'ポイント変化', cls: trend >= 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* SDL 五軸スコア */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">SDL 五軸スコア</h2>
          <div className="space-y-3">
            {(Object.entries(axes) as [keyof SDLAxes, number][]).map(([key, score]) => (
              <div key={key}>
                <button
                  type="button"
                  onClick={() => setSelectedAxis(selectedAxis === key ? null : key)}
                  className="w-full text-left"
                >
                  <SDLBar
                    label={key}
                    score={score}
                    colorClass={score >= 70 ? color.scoreBtn : score >= 50 ? 'bg-amber-400' : 'bg-rose-400'}
                  />
                </button>
                {selectedAxis === key && (
                  <p className="mt-1 ml-8 text-xs text-slate-500">{SDL_LABELS[key]}</p>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">軸名をクリックすると説明を表示します</p>
        </div>

        {/* 月別推移グラフ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-slate-700">月別 WellBeing 推移</h2>
            <div className="flex items-center gap-1 text-sm">{TrendIcon}</div>
          </div>
          <MonthlyChart data={monthly} colorClass={color.scoreBtn} />
        </div>

        {/* AI 顧問・統合ダッシュボードへの導線 */}
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-2">🌐 さらに深く分析するには</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/koumuin/dashboard" className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200">
              🌐 全部門統合ダッシュボード
            </Link>
            <Link href={dept.aiAdvisorHref} className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${color.badge} hover:opacity-80 border ${color.border}`}>
              🤖 AI顧問で分析する
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
