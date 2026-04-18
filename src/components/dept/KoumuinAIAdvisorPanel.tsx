'use client';
/**
 * src/components/dept/KoumuinAIAdvisorPanel.tsx
 * AI全体最適化提言パネル（公務員連携モジュール固有）
 *
 * 全部門（行政・教育・警察消防・医療介護）のデータをAIが横断分析し、
 * 人員配置最適化・部門連携強化ポイントを提言する。
 */

import { useState } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

type Priority = '緊急' | '高' | '中' | '低';
type Category = '人員配置' | '連携強化' | 'コスト削減' | 'リスク対応' | 'サービス改善';

interface AIAdvice {
  id:          string;
  priority:    Priority;
  category:    Category;
  title:       string;
  description: string;
  departments: string[];
  impact:      string;
  action:      string;
}

// ─── モックデータ ──────────────────────────────────────────

const MOCK_ADVICES: AIAdvice[] = [
  {
    id: '1',
    priority: '緊急',
    category: 'リスク対応',
    title: '医療・介護の高齢者孤立リスクが急増中',
    description: '直近30日で孤独死リスク「高」判定の件数が前月比+42%増加しています。訪問看護の稼働率も91%に達しており、受け入れキャパシティが逼迫しています。',
    departments: ['医療・介護', '行政'],
    impact: '孤独死・介護放棄リスクの早期解消',
    action: '行政の地域支援員を週3件以上、医療・介護担当者と協働訪問に充てることを推奨',
  },
  {
    id: '2',
    priority: '高',
    category: '人員配置',
    title: '教育部門の職員ストレス指数が全部門最高水準',
    description: '教員の平均WellBeingスコアが2.9/5と他部門平均3.6を大きく下回っています。特に月曜・火曜の午後に記録件数が集中しており、週初め業務集中が原因と推定されます。',
    departments: ['教育', '行政'],
    impact: '教員離職リスク低減・学習支援品質の維持',
    action: '行政部門のAI文書生成ツールを教育部門でも導入し、週報・保護者対応文書の作成工数を削減することを推奨',
  },
  {
    id: '3',
    priority: '高',
    category: '連携強化',
    title: '警察・消防と医療介護の連携フローに抜け漏れ',
    description: '救急搬送後の要介護認定手続きが平均11日かかっています。搬送情報を医療・介護部門にリアルタイム共有することで、ケアマネージャーの早期介入が可能になります。',
    departments: ['警察・消防', '医療・介護'],
    impact: '退院後の介護空白期間を平均7日短縮',
    action: '搬送記録APIを医療・介護DBと連携させるインターフェース設計を開始することを推奨',
  },
  {
    id: '4',
    priority: '中',
    category: 'コスト削減',
    title: '4部門で重複している研修コンテンツの統合機会',
    description: 'ハラスメント防止・情報セキュリティ・個人情報保護の研修が4部門個別に実施されています。統合eラーニング化により年間約80万円のコスト削減が見込まれます。',
    departments: ['行政', '教育', '警察・消防', '医療・介護'],
    impact: '年間研修コスト約80万円削減',
    action: '行政部門を主管として共通研修プラットフォームを整備することを推奨',
  },
  {
    id: '5',
    priority: '中',
    category: 'サービス改善',
    title: '子育て世帯への複合支援サービスの一元化',
    description: '子育て関連の問い合わせが行政(38%)・教育(31%)・医療介護(18%)に分散しています。ワンストップ窓口を設けることで住民満足度の向上が期待できます。',
    departments: ['行政', '教育', '医療・介護'],
    impact: '住民の問い合わせ解決時間を平均3日短縮',
    action: 'LINEチャットボットに子育て複合案内機能を追加し、3部門を横断する案内フローを設計することを推奨',
  },
];

const DEPT_STATS = [
  { dept: '行政',       score: 3.8, trend: '+0.2', color: 'bg-indigo-500',  light: 'bg-indigo-50  border-indigo-200  text-indigo-700'  },
  { dept: '教育',       score: 2.9, trend: '-0.3', color: 'bg-blue-500',    light: 'bg-blue-50    border-blue-200    text-blue-700'    },
  { dept: '警察・消防', score: 3.5, trend: '+0.1', color: 'bg-amber-500',   light: 'bg-amber-50   border-amber-200   text-amber-700'   },
  { dept: '医療・介護', score: 3.2, trend: '-0.1', color: 'bg-rose-500',    light: 'bg-rose-50    border-rose-200    text-rose-700'    },
];

function PriorityBadge({ priority }: { priority: Priority }) {
  const cls =
    priority === '緊急' ? 'bg-red-100 text-red-700 border-red-200' :
    priority === '高'   ? 'bg-orange-100 text-orange-700 border-orange-200' :
    priority === '中'   ? 'bg-amber-100 text-amber-700 border-amber-200' :
                          'bg-slate-100 text-slate-600 border-slate-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      {priority}
    </span>
  );
}

function CategoryBadge({ category }: { category: Category }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200">
      {category}
    </span>
  );
}

export function KoumuinAIAdvisorPanel() {
  const [selectedPriority, setSelectedPriority] = useState<Priority | 'すべて'>('すべて');
  const [expanded, setExpanded] = useState<string | null>('1'); // 最初の1件は展開済み

  // 優先度フィルタリング
  const filtered = selectedPriority === 'すべて'
    ? MOCK_ADVICES
    : MOCK_ADVICES.filter((a) => a.priority === selectedPriority);

  const urgentCount = MOCK_ADVICES.filter((a) => a.priority === '緊急').length;
  const highCount   = MOCK_ADVICES.filter((a) => a.priority === '高').length;

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className="rounded-2xl border bg-indigo-50 border-indigo-200 p-5">
          <h1 className="text-xl font-bold text-indigo-700">🤖 AI 全体最適化提言</h1>
          <p className="text-sm text-slate-500 mt-1">全部門データをAIが横断分析し、人員配置・連携強化ポイントを自動提言します</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-200">
            🌐 公務員連携モジュール | 全4部門データを統合分析
          </span>
        </div>

        {/* 部門別WellBeingサマリー */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">📊 部門別 WellBeing スコア（直近30日）</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {DEPT_STATS.map((d) => (
              <div key={d.dept} className={`rounded-xl border p-4 ${d.light}`}>
                <div className="text-xs font-medium mb-2">{d.dept}</div>
                <div className="text-2xl font-bold">{d.score}<span className="text-sm font-normal">/5</span></div>
                <div className={`text-xs mt-1 font-medium ${d.trend.startsWith('+') ? 'text-emerald-600' : 'text-red-500'}`}>
                  前月比 {d.trend}
                </div>
                <div className="mt-2 h-1.5 bg-white/60 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${d.color}`} style={{ width: `${(d.score / 5) * 100}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* AIサマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🚨', label: '緊急提言',   value: urgentCount, sub: '件',    cls: 'bg-red-50 border-red-200 text-red-700' },
            { icon: '⚠️', label: '高優先提言', value: highCount,   sub: '件',    cls: 'bg-orange-50 border-orange-200 text-orange-700' },
            { icon: '🤖', label: '分析対象部門', value: 4,          sub: '部門', cls: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
            { icon: '📅', label: '最終分析',   value: '今日',      sub: '自動更新', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 提言一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-slate-700">💡 AI 最適化提言一覧</h2>
            {/* 優先度フィルター */}
            <div className="flex gap-2 flex-wrap">
              {(['すべて', '緊急', '高', '中', '低'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setSelectedPriority(p)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    selectedPriority === p
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((advice) => (
              <div
                key={advice.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  advice.priority === '緊急' ? 'border-red-200' :
                  advice.priority === '高'   ? 'border-orange-200' :
                  'border-slate-200'
                }`}
              >
                {/* ヘッダー行（クリックで展開） */}
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === advice.id ? null : advice.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <PriorityBadge priority={advice.priority} />
                      <CategoryBadge category={advice.category} />
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">{advice.title}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {advice.departments.map((d) => (
                        <span key={d} className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">{d}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm flex-shrink-0 mt-1">
                    {expanded === advice.id ? '▲' : '▼'}
                  </span>
                </button>

                {/* 展開詳細 */}
                {expanded === advice.id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    <div>
                      <p className="text-xs font-medium text-slate-500 mb-1">📋 分析内容</p>
                      <p className="text-sm text-slate-700">{advice.description}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-emerald-700 mb-1">✨ 期待インパクト</p>
                        <p className="text-sm text-emerald-700">{advice.impact}</p>
                      </div>
                      <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
                        <p className="text-xs font-medium text-indigo-700 mb-1">🎯 推奨アクション</p>
                        <p className="text-sm text-indigo-700">{advice.action}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            ※ 提言はモックデータに基づくサンプルです。Notion DBとのリアルタイム連携後に実データで更新されます。
          </p>
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
