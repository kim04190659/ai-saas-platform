'use client';

/**
 * 霧島市 RunWith トップページ
 * /kirishima
 *
 * Sprint #87 更新：4グループ構成のハブページ
 * サイドバーと同じメニュー構成をカード形式で表示する。
 */

import Link from 'next/link';
import {
  Home,
  MessageSquare,
  Users,
  BarChart2,
  Heart,
  Briefcase,
  RefreshCw,
  CalendarDays,
  Truck,
  Trash2,
  PiggyBank,
  Building2,
  UserCheck,
  BookOpen,
  Zap,
  Gamepad2,
} from 'lucide-react';

// ─── グループ・リンク定義（サイドバーと同じ構成） ─────────

const GROUPS = [
  {
    id:    'essentials',
    label: '必須機能',
    emoji: '⚡',
    color: 'border-teal-400',
    headColor: 'bg-teal-600',
    items: [
      { href: '/kirishima/dashboard?municipalityId=kirishima', icon: Home,            label: 'WBダッシュボード',   desc: '市民・職員のWell-Beingを一元把握' },
      { href: '/kirishima/line-consultation',               icon: MessageSquare,   label: '住民LINE相談',       desc: 'LINEで届いた相談を職員が対応管理' },
      { href: '/kirishima/touchpoints',                     icon: Users,           label: '住民タッチポイント', desc: 'チャネル別接触・SDL五軸満足度分析' },
    ],
  },
  {
    id:    'basic-ai',
    label: '基本AI',
    emoji: '🤖',
    color: 'border-sky-400',
    headColor: 'bg-sky-600',
    items: [
      { href: '/kirishima/kpi',                                    icon: BarChart2,  label: 'KPI総合',         desc: 'E軸・T軸・L軸の9KPIをリアルタイム可視化' },
      { href: '/kirishima/wellbeing',                              icon: Heart,      label: 'チームWellBeing', desc: '職員のWBスコア・体調・業務負荷を個人別表示' },
      { href: '/kirishima/management-dashboard',                   icon: Briefcase,  label: '経営ダッシュボード', desc: '財政・住民・職員データを経営視点で統合' },
      { href: '/kirishima/pdca-tracking',                          icon: RefreshCw,  label: '施策PDCA',        desc: '実施中施策のPDCA進捗をAIが分析・提案' },
      { href: '/kirishima/weekly-summary',   icon: CalendarDays, label: '週次WBサマリー', desc: 'AI生成の週次レポートをNotionに自動保存' },
    ],
  },
  {
    id:    'specialized-ai',
    label: '課題特化型AI',
    emoji: '🎯',
    color: 'border-amber-400',
    headColor: 'bg-amber-600',
    items: [
      { href: '/kirishima/roads',          icon: Truck,     label: '道路修復AI',      desc: '老朽化・損傷をAIが分析し修繕優先度を算出' },
      { href: '/kirishima/waste',          icon: Trash2,    label: 'ごみ管理最適化',  desc: '収集ルート・排出量データから効率改善案を提案' },
      { href: '/kirishima/fiscal-health',  icon: PiggyBank, label: '財政健全化',      desc: '財政指標をAIが分析しコスト削減案を提言' },
      { href: '/kirishima/infra-aging',    icon: Building2, label: 'インフラ老朽化',  desc: '施設の老朽化リスクを評価し更新計画を提案' },
      { href: '/kirishima/resident-coach', icon: UserCheck, label: '住民個人AIコーチ', desc: '相談履歴・WBスコアからパーソナルアドバイス生成' },
    ],
  },
  {
    id:    'learning',
    label: '研修・学習',
    emoji: '📚',
    color: 'border-violet-400',
    headColor: 'bg-violet-600',
    items: [
      { href: '/kirishima/knowledge', icon: BookOpen,  label: 'ナレッジ活用',     desc: 'ナレッジ記事の活用状況・有効性スコアを可視化' },
      { href: '/kirishima/well-being-quest',    icon: Zap,       label: 'Well-Being QUEST', desc: '限界自治体の持続可能な街づくりを体験するゲーム' },
      { href: '/kirishima/card-game',           icon: Gamepad2,  label: 'カードゲーム',     desc: 'DX・アジャイル・行政改革を体験型で学ぶ研修ゲーム' },
    ],
  },
];

// ─── コンポーネント ─────────────────────────────────────────

export default function KirishimaTopPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center gap-4 pb-2 border-b border-slate-200">
        <div className="w-12 h-12 bg-teal-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">🏙️</span>
        </div>
        <div>
          <h1 className="text-xl font-bold text-slate-800">霧島市 RunWith</h1>
          <p className="text-sm text-teal-600">市民Well-Being向上プラットフォーム — 鹿児島県霧島市役所</p>
        </div>
      </div>

      {/* ── グループ別リンク一覧 ── */}
      {GROUPS.map((group) => (
        <div key={group.id}>

          {/* グループヘッダー */}
          <div className="flex items-center gap-2 mb-3">
            <span className="text-base font-bold text-slate-700">
              {group.emoji} {group.label}
            </span>
            <div className="flex-1 border-t border-slate-200" />
          </div>

          {/* リンクカード */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {group.items.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-start gap-3 p-4 bg-white rounded-xl border-l-4 border border-slate-200 hover:shadow-md transition-all hover:-translate-y-0.5 ${group.color}`}
                >
                  <div className={`w-8 h-8 rounded-lg ${group.headColor} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                    <Icon size={15} className="text-white" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 leading-tight">{item.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5 leading-snug">{item.desc}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      {/* ── フッター ── */}
      <div className="text-center text-xs text-slate-400 pt-2 pb-4">
        Powered by RunWith Platform × Claude AI ／ データソース: Notion DB・LINE Webhook
      </div>
    </div>
  );
}
