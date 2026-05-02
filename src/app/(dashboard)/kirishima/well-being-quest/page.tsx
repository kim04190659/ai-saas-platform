'use client';

/**
 * /kirishima/well-being-quest — 霧島市専用 Well-Being QUEST 起動ページ
 *
 * Sprint #87 追加：
 *   /well-being-quest は (dashboard) ルートグループ外の独自全画面レイアウトを持つため、
 *   直接リンクすると Kirishima レイアウト（サイドバー）を離脱してしまう。
 *   この起動ページを設けることで、/kirishima/* 内にとどまりながらゲームを案内できる。
 *   「ゲームを開始」ボタンでゲーム本体（フルスクリーン）へ遷移する。
 */

import Link from 'next/link';
import { Zap, ChevronRight, Users, Heart, Truck, PiggyBank } from 'lucide-react';

// ── ゲームのステップ説明 ──────────────────────────────────
const GAME_STEPS = [
  {
    step: 1,
    icon: '♦',
    iconColor: 'text-red-500',
    title: '課題を選ぶ',
    desc: '住民が直面する課題を選択。難しい課題ほど高インパクト。',
  },
  {
    step: 2,
    icon: '♥',
    iconColor: 'text-pink-500',
    title: 'ペルソナを選ぶ',
    desc: '支援対象の住民グループを選択（高齢者・移住者・子育て世帯など）。',
  },
  {
    step: 3,
    icon: '♣',
    iconColor: 'text-emerald-600',
    title: '民間委託を選ぶ（Buy）',
    desc: '民間・他自治体に委託するサービスを選択。',
  },
  {
    step: 4,
    icon: '♠',
    iconColor: 'text-sky-600',
    title: '直営業務を確認（Make）',
    desc: '自治体が直接担う業務が自動で決まり、総合評価を算出。',
  },
];

// ── 学習ポイント ──────────────────────────────────────────
const LEARNING_POINTS = [
  { icon: PiggyBank, label: '財政収支の感覚を体験的に理解できる' },
  { icon: Heart,     label: '住民満足度と行政コストのトレードオフを学べる' },
  { icon: Users,     label: '多様なペルソナ視点でサービス設計を考えられる' },
  { icon: Truck,     label: 'Make or Buy の判断力が身につく' },
];

export default function KirishimaWellBeingQuestPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-4 pb-2 border-b border-slate-200">
        <div className="w-12 h-12 bg-emerald-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Zap size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">Well-Being QUEST</h1>
          <p className="text-sm text-emerald-600">限界自治体の持続可能な街づくりを体験するシリアスゲーム</p>
        </div>
      </div>

      {/* ── ゲーム概要 ── */}
      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          人口 <span className="font-semibold text-emerald-700">1万人・高齢化率50%</span> の自治体が舞台。
          住民課題・ペルソナ・委託先を組み合わせてサービス設計を行い、
          <span className="font-semibold">財政収支・住民満足度・自治体ランク</span> で評価されます。
          行政の Make or Buy 判断を体験的に学べる研修ゲームです。
        </p>
      </div>

      {/* ── ゲームの流れ ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">ゲームの流れ</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {GAME_STEPS.map((s) => (
            <div key={s.step} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <span className={`text-2xl font-bold ${s.iconColor}`}>{s.icon}</span>
              <p className="text-xs font-semibold text-slate-700 mt-1">{s.title}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-snug">{s.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── 学習ポイント ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">このゲームで学べること</h2>
        <div className="space-y-2">
          {LEARNING_POINTS.map((pt, i) => {
            const Icon = pt.icon;
            return (
              <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
                <Icon size={15} className="text-emerald-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">{pt.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 対象者 ── */}
      <div className="text-xs text-slate-500 bg-slate-50 rounded-lg px-4 py-2.5">
        <span className="font-semibold text-slate-600">対象：</span>
        自治体職員 / 地域づくり担当者 / 屋久島実証予定
      </div>

      {/* ── 開始ボタン ── */}
      <div className="flex justify-center pt-2">
        <Link
          href="/well-being-quest"
          className="inline-flex items-center gap-2 px-8 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Zap size={18} />
          ゲームを開始する
          <ChevronRight size={16} />
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        ※ ゲームは全画面で起動します。終了後はブラウザの「戻る」でこのページに戻れます。
      </p>
    </div>
  );
}
