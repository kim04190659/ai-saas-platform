'use client';
/**
 * src/components/dept/CrossIssueMgmtPanel.tsx
 * 部門横断 課題連携パネル（公務員連携モジュール固有）
 *
 * 高齢者・子育て・障害者支援など、複数部門にまたがる課題を
 * 一元管理し、担当部門が協調して解決するハブ機能。
 */

import { useState } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

type IssueStatus = '対応中' | '調整待ち' | '解決済み' | '要エスカレーション';
type IssueCategory = '高齢者支援' | '子育て支援' | '障害者支援' | '生活困窮' | '防災・安全' | 'その他';
type DeptTag = '行政' | '教育' | '警察・消防' | '医療・介護';

interface CrossIssue {
  id:           string;
  title:        string;
  category:     IssueCategory;
  status:       IssueStatus;
  depts:        DeptTag[];
  description:  string;
  owner:        string;
  updatedAt:    string;
  priority:     '高' | '中' | '低';
}

// ─── モックデータ ──────────────────────────────────────────

const MOCK_ISSUES: CrossIssue[] = [
  {
    id: '1',
    title: '独居高齢者の見守り体制強化',
    category: '高齢者支援',
    status: '対応中',
    depts: ['行政', '医療・介護', '警察・消防'],
    description: '75歳以上独居世帯216件のうち、定期訪問が月1回未満の世帯が約40件あります。地区担当者・ケアマネ・地域包括センターの三者連携で見守り頻度を引き上げます。',
    owner: '地域支援課 中村',
    updatedAt: '2026-04-17',
    priority: '高',
  },
  {
    id: '2',
    title: '不登校児童への多機関支援チーム立ち上げ',
    category: '子育て支援',
    status: '調整待ち',
    depts: ['教育', '行政', '医療・介護'],
    description: '今年度の不登校・長期欠席者が前年比+18%増加。スクールカウンセラー・福祉課・医療機関が連携するケア会議を月1回設置する方向で調整中です。',
    owner: '学務課 田村',
    updatedAt: '2026-04-15',
    priority: '高',
  },
  {
    id: '3',
    title: '障害者就労支援と行政サービスの連携',
    category: '障害者支援',
    status: '対応中',
    depts: ['行政', '教育'],
    description: '特別支援学校卒業後の就労移行支援に空白期間が発生しています。行政の就労支援センターと学校の進路指導担当者の情報共有ルートを整備します。',
    owner: '福祉課 鈴木',
    updatedAt: '2026-04-14',
    priority: '中',
  },
  {
    id: '4',
    title: '生活困窮世帯への緊急食料支援',
    category: '生活困窮',
    status: '解決済み',
    depts: ['行政', '医療・介護'],
    description: '3月の電気代高騰に伴い7世帯から緊急支援要請。フードバンクと連携し食料支援を完了。今後の再発防止のため定期訪問リストへ追加しました。',
    owner: '福祉課 山田',
    updatedAt: '2026-04-10',
    priority: '低',
  },
  {
    id: '5',
    title: '大雨時の要配慮者避難支援体制の整備',
    category: '防災・安全',
    status: '要エスカレーション',
    depts: ['警察・消防', '行政', '医療・介護'],
    description: '要支援者名簿の更新が2年間未実施であることが判明。名簿の最新化と個別避難計画の策定を急ぎ実施する必要があります。消防と行政のトップ決裁が必要です。',
    owner: '危機管理室 佐藤',
    updatedAt: '2026-04-16',
    priority: '高',
  },
];

const STATUS_COLORS: Record<IssueStatus, string> = {
  '対応中':         'bg-amber-100 text-amber-700',
  '調整待ち':       'bg-blue-100 text-blue-700',
  '解決済み':       'bg-emerald-100 text-emerald-700',
  '要エスカレーション': 'bg-red-100 text-red-700',
};

const DEPT_COLORS: Record<DeptTag, string> = {
  '行政':         'bg-indigo-100 text-indigo-700',
  '教育':         'bg-blue-100 text-blue-700',
  '警察・消防':   'bg-amber-100 text-amber-700',
  '医療・介護':   'bg-rose-100 text-rose-700',
};

function StatusBadge({ status }: { status: IssueStatus }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
      {status}
    </span>
  );
}

export function CrossIssueMgmtPanel() {
  const [filter, setFilter] = useState<IssueStatus | 'すべて'>('すべて');
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === 'すべて'
    ? MOCK_ISSUES
    : MOCK_ISSUES.filter((i) => i.status === filter);

  const counts = {
    active:    MOCK_ISSUES.filter((i) => i.status === '対応中').length,
    waiting:   MOCK_ISSUES.filter((i) => i.status === '調整待ち').length,
    escalate:  MOCK_ISSUES.filter((i) => i.status === '要エスカレーション').length,
    resolved:  MOCK_ISSUES.filter((i) => i.status === '解決済み').length,
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className="rounded-2xl border bg-indigo-50 border-indigo-200 p-5">
          <h1 className="text-xl font-bold text-indigo-700">🔄 部門横断 課題連携</h1>
          <p className="text-sm text-slate-500 mt-1">高齢者・子育て・障害者等の複合的な課題を部門の壁を越えて一元管理します</p>
          <span className="mt-2 inline-block text-xs px-2.5 py-1 rounded-full border bg-indigo-100 text-indigo-700 border-indigo-200">
            🌐 公務員連携モジュール | 全4部門横断
          </span>
        </div>

        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🔴', label: 'エスカレーション', value: counts.escalate, sub: '件', cls: 'bg-red-50 border-red-200 text-red-700' },
            { icon: '🟡', label: '対応中',          value: counts.active,   sub: '件', cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { icon: '🔵', label: '調整待ち',        value: counts.waiting,  sub: '件', cls: 'bg-blue-50 border-blue-200 text-blue-700' },
            { icon: '✅', label: '解決済み',        value: counts.resolved, sub: '件', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 課題一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-slate-700">📋 横断課題 一覧</h2>
            {/* ステータスフィルター */}
            <div className="flex gap-2 flex-wrap">
              {(['すべて', '対応中', '調整待ち', '解決済み', '要エスカレーション'] as const).map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setFilter(s)}
                  className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                    filter === s
                      ? 'bg-indigo-600 text-white border-transparent'
                      : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            {filtered.map((issue) => (
              <div
                key={issue.id}
                className={`border rounded-xl overflow-hidden transition-all ${
                  issue.status === '要エスカレーション' ? 'border-red-200' :
                  issue.priority === '高' ? 'border-amber-200' : 'border-slate-200'
                }`}
              >
                {/* ヘッダー行 */}
                <button
                  type="button"
                  onClick={() => setExpanded(expanded === issue.id ? null : issue.id)}
                  className="w-full text-left p-4 flex items-start justify-between gap-3 hover:bg-slate-50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <StatusBadge status={issue.status} />
                      <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">{issue.category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${issue.priority === '高' ? 'bg-orange-100 text-orange-700' : issue.priority === '中' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-500'}`}>
                        優先度: {issue.priority}
                      </span>
                    </div>
                    <p className="font-semibold text-slate-700 text-sm">{issue.title}</p>
                    <div className="flex gap-1 mt-1.5 flex-wrap">
                      {issue.depts.map((d) => (
                        <span key={d} className={`text-xs px-1.5 py-0.5 rounded font-medium ${DEPT_COLORS[d]}`}>{d}</span>
                      ))}
                    </div>
                  </div>
                  <span className="text-slate-400 text-sm flex-shrink-0 mt-1">
                    {expanded === issue.id ? '▲' : '▼'}
                  </span>
                </button>

                {/* 展開詳細 */}
                {expanded === issue.id && (
                  <div className="border-t border-slate-100 p-4 bg-slate-50 space-y-3">
                    <p className="text-sm text-slate-700">{issue.description}</p>
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>👤 担当: {issue.owner}</span>
                      <span>📅 更新: {issue.updatedAt}</span>
                    </div>
                    {issue.status === '要エスカレーション' && (
                      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2">
                        <p className="text-xs font-semibold text-red-700">⚠️ 上位者の判断が必要です。関係部門の管理職に共有してください。</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-3">
            ※ 横断課題の登録・更新は各部門担当者が行います。Notion DB連携後はリアルタイム更新されます。
          </p>
        </div>

        {/* 連携強化ヒント */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">💡 横断連携のポイント</h2>
          <ul className="space-y-2">
            {[
              '✅ 複数部門にまたがる課題は、主管部門を明確に決めて「担当者」を1名アサインしてください',
              '✅ 月1回の横断会議（30分）を設定し、エスカレーション案件を優先議題にしてください',
              '✅ 解決済み案件も3ヶ月は記録保持し、再発防止の参照データとして活用してください',
              '✅ 課題登録は簡潔に（5行以内）。詳細はNotionの個別ページで管理してください',
            ].map((tip, i) => (
              <li key={i} className="text-sm text-slate-700 bg-indigo-50 rounded-lg px-4 py-2 border border-indigo-100">{tip}</li>
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
