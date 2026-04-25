'use client';
/**
 * src/components/dept/CareCoordinationPanel.tsx
 * 介護サービス連携パネル（医療・介護部門固有）
 *
 * 居宅介護・施設介護・訪問看護・地域包括の
 * 連携施設の稼働状況・充足率を一元管理する。
 */

import { useState } from 'react';
import Link from 'next/link';
// Sprint #42: 共通コンポーネントからインポート
import { StatusBadge } from '@/components/ui/StatusBadge';
import { ProgressBar } from '@/components/ui/ProgressBar';

// ─── 型定義 ──────────────────────────────────────────────

type ServiceType = '居宅介護' | '施設介護（特養）' | '訪問看護' | '訪問介護' | '地域包括支援センター' | 'デイサービス';

interface FacilityRecord {
  id:          string;
  name:        string;
  serviceType: ServiceType;
  capacity:    number;
  current:     number;
  manager:     string;
  phone:       string;
  status:      '受入可' | '満床' | '要相談';
}

// ─── モックデータ ──────────────────────────────────────────

const INITIAL_FACILITIES: FacilityRecord[] = [
  { id: '1', name: '○○特別養護老人ホーム', serviceType: '施設介護（特養）', capacity: 60,  current: 58, manager: '山田所長',  phone: '0997-xx-xxxx', status: '要相談' },
  { id: '2', name: '△△デイサービスセンター', serviceType: 'デイサービス',   capacity: 20,  current: 14, manager: '鈴木主任',  phone: '0997-xx-xxxx', status: '受入可' },
  { id: '3', name: '□□訪問看護ステーション', serviceType: '訪問看護',       capacity: 30,  current: 22, manager: '佐藤看護長', phone: '0997-xx-xxxx', status: '受入可' },
  { id: '4', name: '地域包括支援センター',    serviceType: '地域包括支援センター', capacity: 0, current: 0, manager: '中村主任',  phone: '0997-xx-xxxx', status: '受入可' },
];

// StatusBadge / ProgressBar は src/components/ui/ から共通インポート済み（Sprint #42）
// StatusBadge の色マップ（介護施設専用）
const CARE_STATUS_COLOR_MAP = {
  '受入可': 'bg-emerald-100 text-emerald-700',
  '満床':   'bg-red-100 text-red-700',
  '要相談': 'bg-amber-100 text-amber-700',
}

export function CareCoordinationPanel() {
  const [facilities] = useState<FacilityRecord[]>(INITIAL_FACILITIES);

  const totalCapacity = facilities.filter((f) => f.capacity > 0).reduce((s, f) => s + f.capacity, 0);
  const totalCurrent  = facilities.filter((f) => f.capacity > 0).reduce((s, f) => s + f.current, 0);
  const avgOccupancy  = totalCapacity > 0 ? Math.round((totalCurrent / totalCapacity) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        <div className="rounded-2xl border bg-rose-50 border-rose-200 p-5">
          <h1 className="text-xl font-bold text-rose-700">🏥 医療・介護｜介護サービス連携</h1>
          <p className="text-sm text-slate-500 mt-1">居宅介護・施設・訪問看護・地域包括の連携状況を一元管理します</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-rose-100 text-rose-700 border-rose-200">
            📊 医療・介護 専用DB に蓄積（疎結合）
          </span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🏠', label: '連携施設数',   value: facilities.length, sub: '施設',      cls: 'bg-white border-slate-200 text-slate-700' },
            { icon: '👥', label: '総定員',       value: totalCapacity,     sub: '名',        cls: 'bg-rose-50 border-rose-200 text-rose-700' },
            { icon: '👴', label: '現在利用者',   value: totalCurrent,      sub: '名',        cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { icon: '📊', label: '平均充足率',   value: `${avgOccupancy}%`, sub: '高いほど逼迫', cls: avgOccupancy >= 85 ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 施設一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">🤝 連携施設 一覧</h2>
          <div className="space-y-3">
            {facilities.map((f) => (
              <div key={f.id} className="border border-slate-200 rounded-xl p-4 hover:border-rose-200 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-slate-700">{f.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-rose-100 text-rose-700">{f.serviceType}</span>
                      <StatusBadge status={f.status} colorMap={CARE_STATUS_COLOR_MAP} />
                    </div>
                    <p className="text-xs text-slate-500 mt-1">担当: {f.manager}　📞 {f.phone}</p>
                    <div className="mt-2">
                      {/* OccupancyBar → 共通 ProgressBar に置換（Sprint #42） */}
                      <ProgressBar current={f.current} max={f.capacity} showLabel unit="名" />
                    </div>
                  </div>
                  <a href={`tel:${f.phone}`} className="flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium bg-rose-100 text-rose-700 border border-rose-200 hover:bg-rose-200 transition-colors">
                    📞 連絡
                  </a>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            ※ 施設情報の追加・更新は担当者に連絡してください。Notion DB 接続後は自動更新されます。
          </p>
        </div>

        {/* 連携強化のヒント */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">💡 連携強化のポイント</h2>
          <ul className="space-y-2">
            {[
              '✅ 充足率が90%を超えた施設は早期に代替受け入れ先を確認してください',
              '✅ 月1回の連携会議で各施設の状況共有を行ってください',
              '✅ 地域包括支援センターを中心に行政・医療・介護の3者連携を強化してください',
              '✅ 新規要介護認定者には、適切なサービスを48時間以内にマッチングしてください',
            ].map((tip, i) => (
              <li key={i} className="text-sm text-slate-700 bg-rose-50 rounded-lg px-4 py-2 border border-rose-100">{tip}</li>
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
