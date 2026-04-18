'use client';
/**
 * src/components/dept/DisasterMgmtPanel.tsx
 * 防災・避難所管理パネル（警察・消防部門固有）
 *
 * 避難所の開設状況・収容数・物資管理を一元管理する。
 */

import { useState } from 'react';
import Link from 'next/link';

// ─── モックデータ ──────────────────────────────────────────

const SHELTERS = [
  { id: '1', name: '○○小学校 体育館', capacity: 300, current: 0,  status: '閉鎖中', manager: '住民課', supplies: { food: 500, water: 200, blankets: 300 } },
  { id: '2', name: '△△公民館',       capacity: 150, current: 0,  status: '閉鎖中', manager: '総務課', supplies: { food: 200, water: 100, blankets: 150 } },
  { id: '3', name: '□□福祉センター', capacity: 80,  current: 0,  status: '閉鎖中', manager: '福祉課', supplies: { food: 150, water:  80, blankets: 100 } },
];

const DISASTER_TIPS = [
  '✅ 避難所の定期点検・備蓄品の確認を毎月実施してください',
  '✅ 要配慮者（高齢者・障害者）の避難支援リストを更新してください',
  '✅ 防災無線・緊急速報メールの配信テストを四半期に一度実施してください',
  '✅ 地域住民との防災訓練を年1回以上実施してください',
];

export function DisasterMgmtPanel() {
  const [shelters, setShelters] = useState(SHELTERS);
  const [activeId, setActiveId] = useState<string | null>(null);

  const toggleShelter = (id: string) => {
    setShelters((prev) => prev.map((s) =>
      s.id === id ? { ...s, status: s.status === '閉鎖中' ? '開設中' : '閉鎖中' } : s
    ));
  };

  const totalCapacity = shelters.reduce((s, sh) => s + sh.capacity, 0);
  const openCount     = shelters.filter((s) => s.status === '開設中').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="rounded-2xl border bg-amber-50 border-amber-200 p-5">
          <h1 className="text-xl font-bold text-amber-700">👮 警察・消防｜防災・避難所管理</h1>
          <p className="text-sm text-slate-500 mt-1">避難所の開設状況・収容数・物資備蓄を一元管理します</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🏠', label: '登録避難所数',   value: shelters.length,  sub: '箇所', cls: 'bg-white border-slate-200 text-slate-700' },
            { icon: '🟢', label: '現在開設中',     value: openCount,         sub: '箇所', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { icon: '👥', label: '総収容可能人数', value: totalCapacity,     sub: '名',   cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { icon: '📦', label: '物資充足状況',   value: '確認要',          sub: '毎月点検', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 避難所一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">🏠 避難所 開設状況管理</h2>
          <div className="space-y-3">
            {shelters.map((s) => (
              <div key={s.id} className={`border rounded-xl p-4 transition-all ${s.status === '開設中' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-white'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-slate-700">{s.name}</p>
                    <p className="text-xs text-slate-500 mt-0.5">収容可能: {s.capacity}名　担当: {s.manager}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${s.status === '開設中' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                      {s.status}
                    </span>
                    <button type="button" onClick={() => toggleShelter(s.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${s.status === '開設中' ? 'bg-red-100 text-red-700 border-red-200 hover:bg-red-200' : 'bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200'}`}>
                      {s.status === '開設中' ? '🔴 閉鎖する' : '🟢 開設する'}
                    </button>
                    <button type="button" onClick={() => setActiveId(activeId === s.id ? null : s.id)}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200">
                      物資確認
                    </button>
                  </div>
                </div>
                {activeId === s.id && (
                  <div className="mt-3 pt-3 border-t border-slate-200 grid grid-cols-3 gap-3">
                    {[
                      { icon: '🍱', label: '食料備蓄', value: s.supplies.food,    unit: '食' },
                      { icon: '💧', label: '水備蓄',   value: s.supplies.water,   unit: 'L' },
                      { icon: '🛏️', label: '毛布備蓄', value: s.supplies.blankets, unit: '枚' },
                    ].map((item) => (
                      <div key={item.label} className="text-center p-2 bg-slate-50 rounded-lg">
                        <div className="text-lg">{item.icon}</div>
                        <div className="text-sm font-bold text-slate-700">{item.value}{item.unit}</div>
                        <div className="text-xs text-slate-500">{item.label}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* 防災チェックリスト */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">📋 防災管理チェックリスト</h2>
          <ul className="space-y-2">
            {DISASTER_TIPS.map((tip, i) => (
              <li key={i} className="text-sm text-slate-700 bg-amber-50 rounded-lg px-4 py-2 border border-amber-100">{tip}</li>
            ))}
          </ul>
        </div>

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
