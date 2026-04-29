'use client';

// =====================================================
//  src/app/(dashboard)/page.tsx
//  RunWith Platform — ログイン後トップページ（刷新版）
//
//  Sprint #62 全面リデザイン
//  エレベーターピッチ v3.0（2026-04-28）に基づき
//  「何をするプラットフォームか」を最初に伝える構成に変更。
//
//  ■ セクション構成
//    ① ヒーロー        : 価値訴求 + 選択中自治体
//    ② 3ステップフロー  : 知識を残す → 学ぶ → 四半期分析
//    ③ 今日のサマリー  : management-summary APIから3KPI
//    ④ Quick Actions   : よく使う6機能へのショートカット
//    ⑤ ISO 23592対応表 : 4側面・9要素とRunWith機能の対応
// =====================================================

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useMunicipality } from '@/contexts/MunicipalityContext';

// ─── 型定義（management-summary APIレスポンスの最低限） ──

interface ManagementSummary {
  status:    string;
  municipal: string;
  wb?:  { total: number; avgScore: number; lowScoreCount: number } | null;
  pdca?: { total: number; statusCount: { 実施中: number } } | null;
  fiscal?: { criticalCount: number } | null;
}

// ─── Quick Actions 定義（6本に絞る）───────────────────

const QUICK_ACTIONS = [
  {
    emoji: '💬',
    label: 'LINE相談管理',
    desc:  '住民からの相談を一元管理',
    href:  '/gyosei/line-consultation',
    color: 'border-sky-200 bg-sky-50 hover:border-sky-400',
    text:  'text-sky-700',
  },
  {
    emoji: '💚',
    label: '職員コンディション',
    desc:  '体調・業務負荷の日次記録',
    href:  '/gyosei/staff',
    color: 'border-emerald-200 bg-emerald-50 hover:border-emerald-400',
    text:  'text-emerald-700',
  },
  {
    emoji: '🚨',
    label: '緊急時住民支援',
    desc:  '台風・地震時の優先順位AI算出',
    href:  '/gyosei/emergency-support',
    color: 'border-red-200 bg-red-50 hover:border-red-400',
    text:  'text-red-700',
  },
  {
    emoji: '🤖',
    label: 'AI Well-Being顧問',
    desc:  'データ横断AIチャット',
    href:  '/ai-advisor',
    color: 'border-violet-200 bg-violet-50 hover:border-violet-400',
    text:  'text-violet-700',
  },
  {
    emoji: '🏛️',
    label: '経営ダッシュボード',
    desc:  '財政・インフラ・WBの4領域集約',
    href:  '/gyosei/management-dashboard',
    color: 'border-indigo-200 bg-indigo-50 hover:border-indigo-400',
    text:  'text-indigo-700',
  },
  {
    emoji: '📈',
    label: '施策PDCA追跡',
    desc:  'AI提案施策の実行状況カンバン',
    href:  '/gyosei/issue-policy',
    color: 'border-amber-200 bg-amber-50 hover:border-amber-400',
    text:  'text-amber-700',
  },
] as const;

// ─── ISO 23592 対応表 ─────────────────────────────────

const ISO_ASPECTS = [
  {
    num:      '①',
    title:    '戦略・リーダーシップ',
    elements: 'ビジョン・ミッション・戦略 / リーダーシップ条件',
    feature:  '四半期AI分析レポート',
    color:    'bg-violet-50 border-violet-200 text-violet-700',
  },
  {
    num:      '②',
    title:    '組織文化・人材',
    elements: 'サービスエクセレンス文化 / 従業員エンゲージメント',
    feature:  '職員コンディションDB · 判断ロジック捕捉',
    color:    'bg-emerald-50 border-emerald-200 text-emerald-700',
  },
  {
    num:      '③',
    title:    '住民理解・体験創出',
    elements: '住民のニーズ・期待・要望の理解 / 卓越した体験創出',
    feature:  'カードゲーム研修 · AI施策提案 · LINE相談分析',
    color:    'bg-sky-50 border-sky-200 text-sky-700',
  },
  {
    num:      '④',
    title:    'プロセス・監視',
    elements: '機能別プロセス管理 / 活動及び結果の監視',
    feature:  '施策PDCA追跡 · KPIダッシュボード · 予兆検知',
    color:    'bg-amber-50 border-amber-200 text-amber-700',
  },
] as const;

// ─── 今日のサマリーカード ─────────────────────────────

function TodaySummary({ municipalityId }: { municipalityId: string }) {
  const [data,    setData]    = useState<ManagementSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/gyosei/management-summary?municipalityId=${municipalityId}`)
      .then(r => r.json())
      .then((json: ManagementSummary) => {
        if (json.status === 'success') setData(json);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [municipalityId]);

  if (loading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 animate-pulse">
            <div className="h-8 bg-slate-100 rounded mb-2 w-16" />
            <div className="h-4 bg-slate-100 rounded w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!data) return null;

  const kpis = [
    {
      value: data.wb?.lowScoreCount ?? '—',
      label: '要支援住民',
      sub:   'WBスコア3以下',
      alert: (data.wb?.lowScoreCount ?? 0) > 0,
      color: 'text-red-600',
      border: 'border-red-200',
    },
    {
      value: data.wb?.avgScore?.toFixed(1) ?? '—',
      label: '住民WBスコア平均',
      sub:   `対象 ${data.wb?.total ?? 0} 名`,
      alert: false,
      color: 'text-emerald-600',
      border: 'border-emerald-200',
    },
    {
      value: data.pdca?.statusCount?.実施中 ?? '—',
      label: '実施中の施策',
      sub:   `全 ${data.pdca?.total ?? 0} 件中`,
      alert: false,
      color: 'text-violet-600',
      border: 'border-violet-200',
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {kpis.map((kpi, i) => (
        <div key={i} className={`bg-white rounded-xl border p-5 ${kpi.border}`}>
          <p className={`text-4xl font-bold ${kpi.color}`}>{kpi.value}</p>
          <p className="text-sm font-semibold text-slate-700 mt-1">{kpi.label}</p>
          <p className="text-xs text-slate-400">{kpi.sub}</p>
          {kpi.alert && (
            <p className="text-xs text-red-500 font-semibold mt-1">⚠ 要対応</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── メインページ ─────────────────────────────────────

export default function Dashboard() {
  const { municipalityId, municipality } = useMunicipality();
  const municipalName = municipality?.shortName ?? municipalityId;

  return (
    <div className="p-6 space-y-10 max-w-5xl mx-auto">

      {/* ══════════════════════════════════════
          ① ヒーローセクション
             価値訴求 + 選択中自治体の表示
          ══════════════════════════════════════ */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
        {/* ISO バッジ */}
        <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80 mb-4">
          <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
          ISO 23592 エクセレントサービス規格準拠
        </div>

        <h1 className="text-2xl md:text-3xl font-bold leading-snug mb-3">
          職員が減っても、<br className="md:hidden" />
          住民サービスの質は守れる。
        </h1>

        <p className="text-slate-300 text-sm leading-relaxed max-w-2xl mb-6">
          RunWith は、東京大学・原辰徳先生が主導した世界標準 ISO 23592「エクセレントサービス」を基盤に、
          自治体職員の経験・判断・知識を AI が構造化して組織に残し、
          少人数でも住民サービスの質を維持・向上するプラットフォームです。
        </p>

        {/* 選択中自治体表示 */}
        <div className="flex items-center gap-3">
          <div className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 flex items-center gap-2">
            <span className="text-emerald-400 text-lg">🏛️</span>
            <div>
              <p className="text-xs text-white/60">現在表示中の自治体</p>
              <p className="text-sm font-semibold">{municipalName}</p>
            </div>
          </div>
          <Link href="/gyosei/management-dashboard">
            <button className="bg-emerald-500 hover:bg-emerald-400 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors">
              経営ダッシュボードを開く →
            </button>
          </Link>
        </div>
      </div>

      {/* ══════════════════════════════════════
          ② 3ステップフロー
             RunWithが提供する価値の流れ
          ══════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          RunWith が実現する 3つのステップ
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              num:   'STEP 1',
              emoji: '🧠',
              title: '知識を組織に残す',
              desc:  'ベテラン職員の経験・判断ロジックをAIが構造化。退職しても暗黙知が消えない。',
              iso:   '② 組織文化・人材',
              color: 'border-emerald-200 bg-emerald-50',
              badge: 'bg-emerald-100 text-emerald-700',
            },
            {
              num:   'STEP 2',
              emoji: '🎮',
              title: '職員全員が学ぶ',
              desc:  '住民に感動を与える卓越したサービスの設計能力を、カードゲーム研修で職員全員が体験的に習得。',
              iso:   '③ 住民理解・体験創出',
              color: 'border-sky-200 bg-sky-50',
              badge: 'bg-sky-100 text-sky-700',
            },
            {
              num:   'STEP 3',
              emoji: '📊',
              title: '四半期AI分析で現在地確認',
              desc:  '蓄積データをAIが ISO 23592 の4側面・9要素で分析。首長・議会に「今どこにいるか」を説明できる。',
              iso:   '① 戦略・④ プロセス監視',
              color: 'border-violet-200 bg-violet-50',
              badge: 'bg-violet-100 text-violet-700',
            },
          ].map((step, i) => (
            <div key={i} className={`rounded-xl border p-5 ${step.color}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{step.emoji}</span>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wide">{step.num}</p>
                  <p className="text-sm font-bold text-slate-800">{step.title}</p>
                </div>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed mb-3">{step.desc}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${step.badge}`}>
                ISO 23592: {step.iso}
              </span>
            </div>
          ))}
        </div>

        {/* ステップをつなぐ矢印（デスクトップのみ） */}
        <p className="hidden md:block text-center text-slate-400 text-xs mt-3">
          この3ステップを繰り返すことで「住民Well-Being」が継続的に向上します
        </p>
      </div>

      {/* ══════════════════════════════════════
          ③ 今日のサマリー
             選択中自治体のKPI 3項目
          ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-800">
            📋 今日の {municipalName} サマリー
          </h2>
          <Link href="/gyosei/management-dashboard" className="text-xs text-slate-400 hover:text-slate-600 underline">
            詳細を見る →
          </Link>
        </div>
        <TodaySummary municipalityId={municipalityId} />
      </div>

      {/* ══════════════════════════════════════
          ④ Quick Actions（6本）
             最もよく使う機能へのショートカット
          ══════════════════════════════════════ */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">⚡ よく使う機能</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {QUICK_ACTIONS.map(action => (
            <Link key={action.href} href={action.href}>
              <div className={`rounded-xl border p-4 cursor-pointer transition-all ${action.color}`}>
                <span className="text-2xl">{action.emoji}</span>
                <p className={`text-sm font-semibold mt-2 ${action.text}`}>{action.label}</p>
                <p className="text-xs text-slate-500 mt-0.5">{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          ⑤ ISO 23592 — 4側面との対応
             RunWithがISO規格とどう対応するか
          ══════════════════════════════════════ */}
      <div>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-800">
              🏆 ISO 23592 — エクセレントサービス 4側面との対応
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              東京大学・原辰徳先生主導の世界標準規格。RunWithの全機能はこの4側面を体現するように設計されています。
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {ISO_ASPECTS.map(aspect => (
            <div key={aspect.num} className={`rounded-xl border p-4 ${aspect.color}`}>
              <div className="flex items-center gap-2 mb-2">
                <span className="font-bold text-lg">{aspect.num}</span>
                <p className="font-bold text-sm">{aspect.title}</p>
              </div>
              <p className="text-xs text-slate-500 mb-2">{aspect.elements}</p>
              <div className="flex items-start gap-1.5">
                <span className="text-xs font-semibold text-slate-400 shrink-0 mt-0.5">→</span>
                <p className="text-xs font-semibold text-slate-700">{aspect.feature}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════
          フッター テーゼ
          ══════════════════════════════════════ */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
        <p className="text-xs text-slate-400 font-semibold uppercase tracking-wide mb-1">📍 RunWith のテーゼ</p>
        <p className="text-sm text-slate-700 leading-relaxed">
          生産人口が減っても、生産量は増やせる。<br />
          それは人の数の問題ではなく、<strong className="text-slate-900">設計の問題</strong>だ。
        </p>
      </div>

    </div>
  );
}
