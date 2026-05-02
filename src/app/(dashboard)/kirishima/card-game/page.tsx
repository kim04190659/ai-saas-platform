'use client';

/**
 * /kirishima/card-game — 霧島市専用 カードゲーム 起動ページ
 *
 * Sprint #87 追加：
 *   /card-game は (dashboard) ルートグループ外の独自全画面レイアウトを持つため、
 *   直接リンクすると Kirishima レイアウト（サイドバー）を離脱してしまう。
 *   この起動ページを設けることで、/kirishima/* 内にとどまりながらゲームを案内できる。
 *   「ゲームを選ぶ」ボタンでゲーム選択画面（/card-game）へ遷移する。
 */

import Link from 'next/link';
import { Gamepad2, ChevronRight, TrendingUp, Users, BookOpen, Star } from 'lucide-react';

// ── 提供中のゲーム一覧 ──────────────────────────────────────
const GAMES = [
  {
    icon: '🃏',
    title: 'PBL カードゲーム',
    subtitle: '52枚・AI評価付き',
    desc: 'ITIL/SIAMの知見を「チームで体験」する形式に変換。チームの必要性を肌で学べる研修ゲーム。',
    target: '職員研修 / 管理職 / 新人向け',
    color: 'border-blue-200',
    headColor: 'bg-blue-600',
    badge: '推奨',
    badgeColor: 'bg-green-100 text-green-800',
  },
  {
    icon: '🌿',
    title: 'Well-Being QUEST',
    subtitle: '限界自治体版 v4',
    desc: '人口1万人・高齢化率50%の自治体でサービス設計を体験するシリアスゲーム。',
    target: '地域づくり担当者 / 自治体職員',
    color: 'border-emerald-200',
    headColor: 'bg-emerald-600',
    badge: null,
    badgeColor: '',
  },
  {
    icon: '🏛️',
    title: '行政DX カードゲーム（準備中）',
    subtitle: '霧島市版 Coming Soon',
    desc: '霧島市の実際の業務課題をベースにしたDX体験ゲーム。リリース予定。',
    target: '霧島市職員',
    color: 'border-slate-200',
    headColor: 'bg-slate-400',
    badge: '準備中',
    badgeColor: 'bg-slate-100 text-slate-500',
  },
];

// ── 研修効果 ─────────────────────────────────────────────────
const EFFECTS = [
  { icon: Users,    label: 'チームワークと役割分担を体験的に理解' },
  { icon: BookOpen, label: 'DX・アジャイル・行政改革の概念を実践学習' },
  { icon: TrendingUp, label: 'ゲーム後のAI評価で学びを可視化' },
  { icon: Star,     label: '行政OSシナリオへのシームレスな連携' },
];

export default function KirishimaCardGamePage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-4 pb-2 border-b border-slate-200">
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <Gamepad2 size={22} className="text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">研修カードゲーム</h1>
          <p className="text-sm text-indigo-600">DX・アジャイル・行政改革を体験型で学ぶ研修ゲーム</p>
        </div>
      </div>

      {/* ── 概要 ── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <p className="text-sm text-slate-700 leading-relaxed">
          RunWith Platform のカードゲームは、
          <span className="font-semibold text-indigo-700">1人では絶対に完成しない設計</span> により、
          チームで協力することの重要性を体感できます。
          プレイ後にAIが評価・フィードバックを生成します。
        </p>
      </div>

      {/* ── ゲーム一覧 ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">提供中のゲーム</h2>
        <div className="space-y-3">
          {GAMES.map((g, i) => (
            <div
              key={i}
              className={`flex items-start gap-3 p-4 bg-white rounded-xl border-l-4 border border-slate-200 ${g.color}`}
            >
              <div className={`w-10 h-10 rounded-lg ${g.headColor} flex items-center justify-center flex-shrink-0 text-xl`}>
                {g.icon}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-slate-800">{g.title}</p>
                  {g.badge && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${g.badgeColor}`}>
                      {g.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{g.subtitle}</p>
                <p className="text-xs text-slate-600 mt-1 leading-snug">{g.desc}</p>
                <p className="text-xs text-slate-400 mt-1">対象: {g.target}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── 研修効果 ── */}
      <div>
        <h2 className="text-sm font-bold text-slate-700 mb-3">研修効果</h2>
        <div className="space-y-2">
          {EFFECTS.map((e, i) => {
            const Icon = e.icon;
            return (
              <div key={i} className="flex items-center gap-3 bg-white border border-slate-200 rounded-lg px-4 py-2.5">
                <Icon size={15} className="text-indigo-600 flex-shrink-0" />
                <span className="text-sm text-slate-700">{e.label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── 開始ボタン ── */}
      <div className="flex justify-center pt-2">
        <Link
          href="/card-game"
          className="inline-flex items-center gap-2 px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <Gamepad2 size={18} />
          ゲームを選ぶ
          <ChevronRight size={16} />
        </Link>
      </div>

      <p className="text-center text-xs text-slate-400">
        ※ ゲームは全画面で起動します。終了後はブラウザの「戻る」でこのページに戻れます。
      </p>
    </div>
  );
}
