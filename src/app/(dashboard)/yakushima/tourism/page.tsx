'use client';

/**
 * 屋久島町 観光・エコツーリズム管理ページ
 * /yakushima/tourism
 *
 * 屋久島固有の観光資源（縄文杉・白谷雲水峡・ウミガメ産卵地）を
 * 環境負荷・来訪者満足度・収益の3軸で管理する。
 * 世界遺産としての持続可能な観光を実現するためのダッシュボード。
 */

import { useState } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────

interface SpotData {
  name:        string;   // スポット名
  icon:        string;   // 絵文字
  visitors:    number;   // 月間来訪者数
  capacity:    number;   // 適正キャパシティ（人/日）
  satisfaction: number;  // 満足度（1-5）
  envLoad:     number;   // 環境負荷スコア（0-100、低いほど良い）
  status:      'green' | 'yellow' | 'red';  // 管理状況
  note:        string;   // 特記事項
}

// ─── サンプルデータ ──────────────────────────────────

/** 屋久島主要観光スポットのデータ */
const SPOT_DATA: SpotData[] = [
  {
    name:         '縄文杉トレッキングルート',
    icon:         '🌲',
    visitors:     8500,
    capacity:     300,
    satisfaction: 4.8,
    envLoad:      62,
    status:       'yellow',
    note:         '入山予約制を導入。ハイシーズン（4-5月）は満員続出。山岳ガイド同行を推奨。',
  },
  {
    name:         '白谷雲水峡',
    icon:         '🍃',
    visitors:     12000,
    capacity:     500,
    satisfaction: 4.6,
    envLoad:      45,
    status:       'green',
    note:         '映画「もののけ姫」の着想地。整備された散策路で家族連れにも人気。',
  },
  {
    name:         '永田いなか浜（ウミガメ産卵地）',
    icon:         '🐢',
    visitors:     3200,
    capacity:     100,
    satisfaction: 4.9,
    envLoad:      78,
    status:       'red',
    note:         '7月産卵シーズンは夜間立入制限あり。環境省と連携した保護活動を継続中。',
  },
  {
    name:         '屋久島灯台・西部林道',
    icon:         '🦌',
    visitors:     5600,
    capacity:     200,
    satisfaction: 4.5,
    envLoad:      30,
    status:       'green',
    note:         'ヤクシカ・ヤクサルの生息地。レンタカー利用者が多く、路上駐車問題あり。',
  },
];

// ─── サマリー集計 ────────────────────────────────────

const totalVisitors    = SPOT_DATA.reduce((s, d) => s + d.visitors, 0);
const avgSatisfaction  = Math.round(SPOT_DATA.reduce((s, d) => s + d.satisfaction, 0) / SPOT_DATA.length * 10) / 10;
const avgEnvLoad       = Math.round(SPOT_DATA.reduce((s, d) => s + d.envLoad, 0) / SPOT_DATA.length);
const redCount         = SPOT_DATA.filter(d => d.status === 'red').length;

// ─── ヘルパー ─────────────────────────────────────────

function statusLabel(s: SpotData['status']) {
  if (s === 'green')  return { label: '✅ 良好',     bg: 'bg-emerald-100 text-emerald-700' };
  if (s === 'yellow') return { label: '⚠️ 要注意',   bg: 'bg-amber-100 text-amber-700' };
  return                     { label: '🔴 要対応',   bg: 'bg-red-100 text-red-700' };
}

function envLoadColor(n: number) {
  if (n < 40) return 'bg-emerald-500';
  if (n < 65) return 'bg-amber-400';
  return 'bg-red-500';
}

// ─── メインコンポーネント ─────────────────────────────

export default function YakushimaTourismPage() {
  const [activeSpot, setActiveSpot] = useState<SpotData | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🌿 観光・エコツーリズム管理</h1>
          <p className="text-gray-500 mt-1 text-sm">
            屋久島町 — 世界遺産の持続可能な観光を環境負荷・満足度・収益の3軸で管理します
          </p>
        </div>
        <Link
          href="/yakushima"
          className="text-sm text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
        >
          ← 屋久島トップ
        </Link>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: '👣', label: '月間来訪者数',   value: totalVisitors.toLocaleString(), unit: '人',  color: 'bg-emerald-50 border-emerald-200' },
          { icon: '⭐', label: '平均満足度',     value: avgSatisfaction,               unit: '/ 5', color: 'bg-sky-50 border-sky-200' },
          { icon: '🌍', label: '平均環境負荷',   value: avgEnvLoad,                     unit: 'pt',  color: avgEnvLoad >= 65 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200' },
          { icon: '🔴', label: '要対応スポット', value: redCount,                       unit: '箇所', color: redCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200' },
        ].map((c) => (
          <div key={c.label} className={`rounded-xl border p-4 ${c.color}`}>
            <p className="text-xs text-gray-500 mb-1">{c.icon} {c.label}</p>
            <p className="text-2xl font-bold text-gray-800">
              {c.value}
              <span className="text-sm font-normal ml-1 text-gray-500">{c.unit}</span>
            </p>
          </div>
        ))}
      </div>

      {/* スポット一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">📍 主要観光スポット管理状況</h2>
          <p className="text-xs text-gray-400 mt-0.5">スポットをクリックすると詳細を表示します</p>
        </div>
        <div className="divide-y divide-gray-100">
          {SPOT_DATA.map((spot) => {
            const st = statusLabel(spot.status);
            const isActive = activeSpot?.name === spot.name;
            return (
              <div key={spot.name}>
                <button
                  onClick={() => setActiveSpot(isActive ? null : spot)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-3xl">{spot.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800 text-sm">{spot.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full ${st.bg}`}>{st.label}</span>
                      </div>
                      {/* 環境負荷バー */}
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-xs text-gray-400 w-16">環境負荷</span>
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full ${envLoadColor(spot.envLoad)}`}
                            style={{ width: `${spot.envLoad}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-600 w-8">{spot.envLoad}pt</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-sm font-bold text-gray-700">{spot.visitors.toLocaleString()}<span className="text-xs font-normal text-gray-400 ml-1">人/月</span></div>
                      <div className="text-xs text-amber-500 mt-0.5">{'★'.repeat(Math.round(spot.satisfaction))} {spot.satisfaction}</div>
                    </div>
                    <span className="text-gray-300 ml-2">{isActive ? '▲' : '▼'}</span>
                  </div>
                </button>

                {/* 詳細展開 */}
                {isActive && (
                  <div className="px-6 pb-4 bg-emerald-50 border-t border-emerald-100">
                    <p className="text-sm text-emerald-800 leading-relaxed pt-3">
                      💡 {spot.note}
                    </p>
                    <div className="flex gap-3 mt-3">
                      <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-200">
                        <div className="text-xs text-gray-500">適正キャパ</div>
                        <div className="text-sm font-bold text-emerald-700">{spot.capacity}人/日</div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-200">
                        <div className="text-xs text-gray-500">満足度</div>
                        <div className="text-sm font-bold text-emerald-700">{spot.satisfaction} / 5.0</div>
                      </div>
                      <div className="bg-white rounded-lg px-3 py-2 text-center border border-emerald-200">
                        <div className="text-xs text-gray-500">環境負荷</div>
                        <div className={`text-sm font-bold ${spot.envLoad >= 65 ? 'text-red-600' : spot.envLoad >= 40 ? 'text-amber-600' : 'text-emerald-700'}`}>{spot.envLoad}pt</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 持続可能な観光ガイド */}
      <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-5">
        <h3 className="text-sm font-semibold text-emerald-800 mb-2">
          🌍 屋久島エコツーリズムの基本方針
        </h3>
        <p className="text-xs text-emerald-700 leading-relaxed">
          屋久島町は<strong>環境省・林野庁</strong>と連携し、世界遺産エリアへの入山者数の適正管理を実施しています。
          環境負荷スコアが<strong>65pt以上</strong>のスポットは立入制限または時間帯制限の対象候補です。
          RunWith Platform はこのデータをAI顧問に連携し、観光施策の最適化提言を自動生成します。
        </p>
        <div className="flex gap-2 mt-3">
          <Link href="/ai-advisor"
            className="text-xs bg-emerald-600 text-white px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition">
            🤖 AI顧問で観光施策を分析する
          </Link>
          <Link href="/gyosei/revenue"
            className="text-xs bg-white text-emerald-700 border border-emerald-300 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition">
            💰 収益データを見る
          </Link>
        </div>
      </div>

    </div>
  );
}
