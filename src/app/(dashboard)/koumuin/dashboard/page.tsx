'use client';

/**
 * ════════════════════════════════════════════════════════
 *  /koumuin/dashboard/page.tsx
 *  公務員連携 統合ダッシュボード
 * ════════════════════════════════════════════════════════
 *
 *  ビジョン：縮んでいく自治体を公務員全体で支えるモデル
 *  行政・教育・警察消防・医療介護 の全部門 WellBeing を
 *  一画面で俯瞰し、街全体の支援力を可視化する。
 */

import { useState } from 'react';
import {
  Users,
  Shield,
  Heart,
  Globe,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
} from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────────

/** 各部門のデータ型 */
type DepartmentData = {
  id: string;
  name: string;            // 部門名
  emoji: string;
  color: string;           // Tailwind テキストカラー
  bgColor: string;         // Tailwind 背景カラー
  borderColor: string;     // Tailwind ボーダーカラー
  badgeColor: string;      // バッジ
  staffCount: number;      // 職員数
  wellbeing: number;       // WellBeingスコア（0〜100）
  trend: 'up' | 'down' | 'flat';   // 先月比
  trendValue: number;      // 先月比の数値
  alerts: string[];        // 注意事項
  highlights: string[];    // ポジティブ情報
  coverageRate: number;    // カバー率（住民への対応充足度）
  status: 'good' | 'caution' | 'warning';  // 総合状態
};

// ─── モックデータ（実際はNotionAPIから取得）────────────────

/** 各部門のWellBeing・状況データ */
const DEPARTMENTS: DepartmentData[] = [
  {
    id: 'gyosei',
    name: '行政',
    emoji: '🏛️',
    color: 'text-emerald-700',
    bgColor: 'bg-emerald-50',
    borderColor: 'border-emerald-200',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    staffCount: 48,
    wellbeing: 72,
    trend: 'up',
    trendValue: 4,
    alerts: ['窓口業務の繁忙期：残業が増加傾向'],
    highlights: ['LINE相談対応が安定稼働', 'AI窓口提案で処理時間15%短縮'],
    coverageRate: 88,
    status: 'good',
  },
  {
    id: 'education',
    name: '教育',
    emoji: '🏫',
    color: 'text-blue-700',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    badgeColor: 'bg-blue-100 text-blue-700',
    staffCount: 32,
    wellbeing: 65,
    trend: 'down',
    trendValue: -3,
    alerts: ['教職員の疲労度が高まっています', '小学校2校で代替教員が不足'],
    highlights: ['不登校支援プログラムが効果を発揮'],
    coverageRate: 79,
    status: 'caution',
  },
  {
    id: 'safety',
    name: '警察・消防',
    emoji: '👮',
    color: 'text-amber-700',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    badgeColor: 'bg-amber-100 text-amber-700',
    staffCount: 27,
    wellbeing: 70,
    trend: 'flat',
    trendValue: 0,
    alerts: ['夜間の救急出動が増加（前月比+12%）'],
    highlights: ['地域パトロール強化で犯罪件数が減少'],
    coverageRate: 82,
    status: 'good',
  },
  {
    id: 'healthcare',
    name: '医療・介護',
    emoji: '🏥',
    color: 'text-rose-700',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    badgeColor: 'bg-rose-100 text-rose-700',
    staffCount: 54,
    wellbeing: 58,
    trend: 'down',
    trendValue: -6,
    alerts: [
      '介護職員の離職率が上昇中（要対策）',
      '訪問介護のカバー率が低下',
    ],
    highlights: ['在宅医療連携チームが発足'],
    coverageRate: 71,
    status: 'warning',
  },
];

/** 全部門統合スコア */
const TOTAL_STAFF = DEPARTMENTS.reduce((s, d) => s + d.staffCount, 0);
const AVG_WELLBEING = Math.round(
  DEPARTMENTS.reduce((s, d) => s + d.wellbeing, 0) / DEPARTMENTS.length
);
const AVG_COVERAGE = Math.round(
  DEPARTMENTS.reduce((s, d) => s + d.coverageRate, 0) / DEPARTMENTS.length
);

/** AI提言メッセージ（実際は /api/ai-advisor から取得） */
const AI_SUGGESTIONS = [
  {
    priority: 'high',
    dept: '医療・介護',
    message:
      '介護職員の離職率上昇が深刻です。行政の「AI窓口提案」機能を介護相談窓口にも展開し、職員の負荷軽減を図ることを推奨します。',
  },
  {
    priority: 'medium',
    dept: '教育',
    message:
      '教職員WellBeingが低下しています。警察・消防の研修カードゲーム手法を応用した「教育版 Well-Being QUEST」の導入を検討してください。',
  },
  {
    priority: 'low',
    dept: '全部門',
    message:
      '全公務員の合計 161名で住民 12,400名を支えています。住民1人あたりの公務員数は 0.013人。部門横断の連携強化で支援力を10%向上できる試算です。',
  },
];

// ─── サブコンポーネント ────────────────────────────────────

/** WellBeingゲージバー */
function WellBeingBar({ score, color }: { score: number; color: string }) {
  // スコアに応じてバーの色を変える（70以上：緑、50-70：黄、50未満：赤）
  const barColor =
    score >= 70 ? 'bg-emerald-500' : score >= 50 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className={`text-sm font-bold w-8 text-right ${color}`}>{score}</span>
    </div>
  );
}

/** カバー率ゲージバー */
function CoverageBar({ rate }: { rate: number }) {
  const barColor =
    rate >= 80 ? 'bg-blue-500' : rate >= 65 ? 'bg-amber-400' : 'bg-rose-500';

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${barColor}`}
          style={{ width: `${rate}%` }}
        />
      </div>
      <span className="text-xs text-slate-500 w-8 text-right">{rate}%</span>
    </div>
  );
}

/** トレンドアイコン */
function TrendIcon({ trend, value }: { trend: 'up' | 'down' | 'flat'; value: number }) {
  if (trend === 'up') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-emerald-600">
        <TrendingUp size={12} />+{value}
      </span>
    );
  }
  if (trend === 'down') {
    return (
      <span className="flex items-center gap-0.5 text-xs text-rose-600">
        <TrendingDown size={12} />{value}
      </span>
    );
  }
  return (
    <span className="flex items-center gap-0.5 text-xs text-slate-400">
      <Minus size={12} />±0
    </span>
  );
}

/** 状態バッジ */
function StatusBadge({ status }: { status: DepartmentData['status'] }) {
  const map = {
    good: { label: '良好', color: 'bg-emerald-100 text-emerald-700' },
    caution: { label: '注意', color: 'bg-amber-100 text-amber-700' },
    warning: { label: '要対応', color: 'bg-rose-100 text-rose-700' },
  };
  const { label, color } = map[status];
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${color}`}>
      {label}
    </span>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export default function KoumuinDashboardPage() {
  // 表示中の部門カードの詳細パネル
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  const selectedData = DEPARTMENTS.find((d) => d.id === selectedDept);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">

      {/* ── ヘッダー ── */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Globe size={20} className="text-indigo-600" />
            <h1 className="text-xl font-bold text-slate-800">
              公務員連携 統合ダッシュボード
            </h1>
          </div>
          <p className="text-sm text-slate-500">
            縮んでいく自治体を、公務員全体で支えるモデル。全部門のWellBeingと住民カバー率を一画面で俯瞰します。
          </p>
        </div>
        <div className="text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
          最終更新: {new Date().toLocaleDateString('ja-JP')}
        </div>
      </div>

      {/* ── サマリーKPI ── */}
      <div className="grid grid-cols-4 gap-4">
        {/* 全公務員数 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Users size={16} className="text-indigo-500" />
            <span className="text-xs text-slate-500">全公務員数</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{TOTAL_STAFF}<span className="text-sm font-normal text-slate-400 ml-1">名</span></p>
          <p className="text-xs text-slate-400 mt-1">4部門合計</p>
        </div>

        {/* 平均WellBeing */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Heart size={16} className="text-rose-500" />
            <span className="text-xs text-slate-500">平均WellBeing</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{AVG_WELLBEING}<span className="text-sm font-normal text-slate-400 ml-1">/ 100</span></p>
          <p className="text-xs text-amber-600 mt-1">⚠ 目標値 75 に未達</p>
        </div>

        {/* 住民カバー率 */}
        <div className="bg-white border border-slate-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield size={16} className="text-amber-500" />
            <span className="text-xs text-slate-500">平均カバー率</span>
          </div>
          <p className="text-2xl font-bold text-slate-800">{AVG_COVERAGE}<span className="text-sm font-normal text-slate-400 ml-1">%</span></p>
          <p className="text-xs text-slate-400 mt-1">住民への対応充足度</p>
        </div>

        {/* 要対応部門 */}
        <div className="bg-white border border-rose-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-rose-500" />
            <span className="text-xs text-slate-500">要対応部門</span>
          </div>
          <p className="text-2xl font-bold text-rose-600">
            {DEPARTMENTS.filter((d) => d.status === 'warning').length}
            <span className="text-sm font-normal text-slate-400 ml-1">部門</span>
          </p>
          <p className="text-xs text-rose-500 mt-1">
            {DEPARTMENTS.filter((d) => d.status === 'warning').map((d) => d.name).join('・')}
          </p>
        </div>
      </div>

      {/* ── 部門カード一覧 ── */}
      <div>
        <h2 className="text-sm font-semibold text-slate-600 mb-3">各部門の状況</h2>
        <div className="grid grid-cols-2 gap-4">
          {DEPARTMENTS.map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(selectedDept === dept.id ? null : dept.id)}
              className={`text-left border rounded-xl p-4 transition-all ${dept.bgColor} ${dept.borderColor} hover:shadow-md`}
            >
              {/* 部門ヘッダー */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{dept.emoji}</span>
                  <div>
                    <span className={`font-semibold text-sm ${dept.color}`}>{dept.name}</span>
                    <span className={`ml-2 text-xs px-1.5 py-0.5 rounded ${dept.badgeColor}`}>
                      {dept.staffCount}名
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={dept.status} />
                  <ChevronRight
                    size={14}
                    className={`text-slate-400 transition-transform ${selectedDept === dept.id ? 'rotate-90' : ''}`}
                  />
                </div>
              </div>

              {/* WellBeingスコア */}
              <div className="mb-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">WellBeingスコア</span>
                  <TrendIcon trend={dept.trend} value={dept.trendValue} />
                </div>
                <WellBeingBar score={dept.wellbeing} color={dept.color} />
              </div>

              {/* カバー率 */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-slate-500">住民カバー率</span>
                </div>
                <CoverageBar rate={dept.coverageRate} />
              </div>

              {/* アラート（警告がある場合のみ） */}
              {dept.alerts.length > 0 && (
                <div className="mt-3 flex items-start gap-1.5">
                  <AlertTriangle size={12} className="text-amber-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 leading-snug">{dept.alerts[0]}</p>
                </div>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ── 詳細パネル（部門カードをクリックすると展開）── */}
      {selectedData && (
        <div className={`border rounded-xl p-5 ${selectedData.bgColor} ${selectedData.borderColor}`}>
          <h3 className={`font-semibold mb-3 ${selectedData.color}`}>
            {selectedData.emoji} {selectedData.name} 詳細
          </h3>
          <div className="grid grid-cols-2 gap-4">
            {/* 課題・アラート */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">⚠ 課題・注意事項</p>
              <ul className="space-y-1.5">
                {selectedData.alerts.map((a, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-amber-700">
                    <AlertTriangle size={11} className="flex-shrink-0 mt-0.5" />
                    {a}
                  </li>
                ))}
                {selectedData.alerts.length === 0 && (
                  <li className="text-xs text-slate-400">現在特記事項はありません</li>
                )}
              </ul>
            </div>
            {/* ポジティブ情報 */}
            <div>
              <p className="text-xs font-medium text-slate-500 mb-2">✅ 取り組み・成果</p>
              <ul className="space-y-1.5">
                {selectedData.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-xs text-emerald-700">
                    <CheckCircle size={11} className="flex-shrink-0 mt-0.5" />
                    {h}
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-4">
            ※ 詳細な部門ダッシュボードは左メニューから各部門を選択してください（準備中）
          </p>
        </div>
      )}

      {/* ── 部門横断 WellBeing比較バー ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-4">部門横断 WellBeing 比較</h2>
        <div className="space-y-3">
          {/* 目標ライン説明 */}
          <div className="flex items-center justify-end gap-1 mb-1">
            <div className="w-8 border-t-2 border-dashed border-slate-300" />
            <span className="text-xs text-slate-400">目標: 75</span>
          </div>

          {DEPARTMENTS.map((dept) => (
            <div key={dept.id} className="flex items-center gap-3">
              {/* 部門名 */}
              <div className="w-24 flex items-center gap-1.5 flex-shrink-0">
                <span className="text-base">{dept.emoji}</span>
                <span className="text-xs text-slate-600">{dept.name}</span>
              </div>
              {/* バー */}
              <div className="flex-1 relative">
                <div className="h-6 bg-slate-100 rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg flex items-center justify-end pr-2 transition-all ${
                      dept.wellbeing >= 70
                        ? 'bg-emerald-400'
                        : dept.wellbeing >= 50
                        ? 'bg-amber-400'
                        : 'bg-rose-400'
                    }`}
                    style={{ width: `${dept.wellbeing}%` }}
                  >
                    <span className="text-xs font-bold text-white">{dept.wellbeing}</span>
                  </div>
                </div>
                {/* 目標ライン（75%の位置） */}
                <div
                  className="absolute top-0 bottom-0 w-px bg-slate-400 border-dashed"
                  style={{ left: '75%' }}
                />
              </div>
              {/* トレンド */}
              <div className="w-12 flex-shrink-0">
                <TrendIcon trend={dept.trend} value={dept.trendValue} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── AI提言パネル ── */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white text-xs font-bold">AI</span>
          </div>
          <h2 className="text-sm font-semibold text-indigo-700">AI 横断提言</h2>
          <span className="text-xs text-indigo-400">（全部門データをもとに自動生成）</span>
        </div>
        <div className="space-y-3">
          {AI_SUGGESTIONS.map((s, i) => {
            const priorityMap = {
              high: { label: '優先度: 高', color: 'bg-rose-100 text-rose-700' },
              medium: { label: '優先度: 中', color: 'bg-amber-100 text-amber-700' },
              low: { label: '優先度: 低', color: 'bg-slate-100 text-slate-600' },
            };
            const { label, color } = priorityMap[s.priority as 'high' | 'medium' | 'low'];
            return (
              <div key={i} className="bg-white rounded-lg p-3 border border-indigo-100">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${color}`}>
                    {label}
                  </span>
                  <span className="text-xs text-indigo-600 font-medium">{s.dept}</span>
                </div>
                <p className="text-xs text-slate-700 leading-relaxed">{s.message}</p>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-indigo-400 mt-3 flex items-center gap-1">
          <Clock size={11} />
          AIの提言は各部門データが蓄積されるとより精度が向上します
        </p>
      </div>

      {/* ── 将来の部門展開ロードマップ ── */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-700 mb-3">各部門ダッシュボード 展開ロードマップ</h2>
        <div className="grid grid-cols-4 gap-3">
          {[
            { emoji: '🏛️', name: '行政', status: '稼働中', color: 'bg-emerald-100 text-emerald-700', pages: 7 },
            { emoji: '🏫', name: '教育', status: '設計中', color: 'bg-blue-100 text-blue-700', pages: 4 },
            { emoji: '👮', name: '警察・消防', status: '設計中', color: 'bg-amber-100 text-amber-700', pages: 4 },
            { emoji: '🏥', name: '医療・介護', status: '設計中', color: 'bg-rose-100 text-rose-700', pages: 4 },
          ].map((item) => (
            <div key={item.name} className="text-center p-3 bg-slate-50 rounded-lg border border-slate-100">
              <div className="text-2xl mb-1">{item.emoji}</div>
              <p className="text-xs font-medium text-slate-700">{item.name}</p>
              <span className={`text-xs px-2 py-0.5 rounded-full mt-1 inline-block ${item.color}`}>
                {item.status}
              </span>
              <p className="text-xs text-slate-400 mt-1">{item.pages}ページ予定</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
