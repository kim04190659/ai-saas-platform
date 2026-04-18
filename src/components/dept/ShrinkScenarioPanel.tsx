'use client';
/**
 * src/components/dept/ShrinkScenarioPanel.tsx
 * 縮小シナリオ × 地区 WellBeing 密度マップ（町長・議会向け）
 *
 * ■ コンセプト（シナリオB：自然収束・透明化モデル）
 *   人口10,000人→5,000人の縮小を「逃げずに計画する」ツール。
 *   20地区を「拠点型／移行型／終息型」に分類し、
 *   各地区の人口推移・WellBeingスコア・予測閉鎖年を可視化。
 *   住民に10年前から透明に伝え、一緒に縮む計画を立てる。
 *
 * ■ 核心の数式
 *   総幸福量 = 人口 × 一人あたりWBスコア
 *   目標: 5,000人 × WB90点 = 450,000  ← 放置(200,000)の2倍以上
 */

import { useState } from 'react';
import Link from 'next/link';

// ─── 型定義 ──────────────────────────────────────────────

type DistrictType = '拠点型' | '移行型' | '終息型';

interface District {
  id:          string;
  name:        string;
  type:        DistrictType;
  pop2026:     number;   // 現在人口
  pop2036:     number;   // 10年後予測
  pop2046:     number;   // 20年後予測
  wbScore:     number;   // 現在のWellBeingスコア（0〜100）
  wbTrend:     '+' | '-' | '=';  // スコアのトレンド
  closureYear: number | null;    // 予測閉鎖年（終息型のみ）
  services: {
    medical:    '維持' | '縮小' | '終了';
    education:  '維持' | '縮小' | '終了';
    welfare:    '維持' | '縮小' | '終了';
    infra:      '維持' | '縮小' | '終了';
  };
  note: string;
}

// ─── モックデータ（20地区）─────────────────────────────

const DISTRICTS: District[] = [
  // ══ 拠点型（5地区）: サービス強化・投資継続 ══
  {
    id: 'd01', name: '中央地区',   type: '拠点型',
    pop2026: 2100, pop2036: 1950, pop2046: 1750,
    wbScore: 78, wbTrend: '+',
    closureYear: null,
    services: { medical: '維持', education: '維持', welfare: '維持', infra: '維持' },
    note: '行政・医療・商業の中核。他地区からのサービス受入を強化する',
  },
  {
    id: 'd02', name: '港湾地区',   type: '拠点型',
    pop2026: 1400, pop2036: 1300, pop2046: 1150,
    wbScore: 74, wbTrend: '+',
    closureYear: null,
    services: { medical: '維持', education: '維持', welfare: '維持', infra: '維持' },
    note: '産業・物流の拠点。移住・定住促進で人口維持を目指す',
  },
  {
    id: 'd03', name: '南部地区',   type: '拠点型',
    pop2026: 980,  pop2036: 920,  pop2046: 840,
    wbScore: 72, wbTrend: '=',
    closureYear: null,
    services: { medical: '維持', education: '維持', welfare: '維持', infra: '維持' },
    note: '観光・農業の集積地。6次産業化で若年層の定着を図る',
  },
  {
    id: 'd04', name: '北部地区',   type: '拠点型',
    pop2026: 820,  pop2036: 770,  pop2046: 700,
    wbScore: 70, wbTrend: '=',
    closureYear: null,
    services: { medical: '維持', education: '維持', welfare: '維持', infra: '維持' },
    note: '教育・文化施設を集約。子育て支援を強化',
  },
  {
    id: 'd05', name: '東部地区',   type: '拠点型',
    pop2026: 700,  pop2036: 660,  pop2046: 610,
    wbScore: 69, wbTrend: '+',
    closureYear: null,
    services: { medical: '維持', education: '維持', welfare: '維持', infra: '維持' },
    note: '医療・介護施設を強化。高齢者ケアの中核拠点に',
  },

  // ══ 移行型（10地区）: 段階的サービス移転 ══
  {
    id: 'd06', name: '山田地区',   type: '移行型',
    pop2026: 480,  pop2036: 370,  pop2046: 250,
    wbScore: 62, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '縮小', welfare: '維持', infra: '維持' },
    note: '2032年に学校を中央地区へ統合予定。巡回医療に移行',
  },
  {
    id: 'd07', name: '川上地区',   type: '移行型',
    pop2026: 420,  pop2036: 310,  pop2046: 200,
    wbScore: 60, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '維持' },
    note: '2030年に小学校統廃合済み。週3回の巡回バスで拠点と接続',
  },
  {
    id: 'd08', name: '西山地区',   type: '移行型',
    pop2026: 390,  pop2036: 290,  pop2046: 180,
    wbScore: 58, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '農業従事者が多い。後継者不在で10年以内に担い手不足が深刻化',
  },
  {
    id: 'd09', name: '桜台地区',   type: '移行型',
    pop2026: 350,  pop2036: 260,  pop2046: 160,
    wbScore: 61, wbTrend: '=',
    closureYear: null,
    services: { medical: '縮小', education: '縮小', welfare: '維持', infra: '維持' },
    note: '高齢者コミュニティが活発。住民主体の見守りネットワークを維持',
  },
  {
    id: 'd10', name: '緑丘地区',   type: '移行型',
    pop2026: 320,  pop2036: 230,  pop2046: 140,
    wbScore: 57, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '道路老朽化が深刻。2035年を目処に生活圏の拠点移転を推奨',
  },
  {
    id: 'd11', name: '梅林地区',   type: '移行型',
    pop2026: 290,  pop2036: 210,  pop2046: 130,
    wbScore: 59, wbTrend: '=',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '維持' },
    note: '観光資源あり。季節就労者の受入で関係人口を維持',
  },
  {
    id: 'd12', name: '竹園地区',   type: '移行型',
    pop2026: 260,  pop2036: 185,  pop2046: 110,
    wbScore: 55, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '独居高齢者比率42%。緊急の見守り体制強化が必要',
  },
  {
    id: 'd13', name: '松原地区',   type: '移行型',
    pop2026: 240,  pop2036: 170,  pop2046: 100,
    wbScore: 56, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '水道老朽化による更新費用が財政を圧迫。計画的移転を検討',
  },
  {
    id: 'd14', name: '若葉地区',   type: '移行型',
    pop2026: 210,  pop2036: 145,  pop2046: 80,
    wbScore: 54, wbTrend: '-',
    closureYear: null,
    services: { medical: '縮小', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '2040年頃に要支援者が多数残留する見込み。介護連携を強化',
  },
  {
    id: 'd15', name: '花岡地区',   type: '移行型',
    pop2026: 190,  pop2036: 130,  pop2046: 70,
    wbScore: 52, wbTrend: '-',
    closureYear: null,
    services: { medical: '終了', education: '終了', welfare: '縮小', infra: '縮小' },
    note: 'すでに診療所が廃止。月2回の巡回診療で対応中',
  },

  // ══ 終息型（5地区）: 自然閉鎖へ向けて透明に計画 ══
  {
    id: 'd16', name: '奥山地区',   type: '終息型',
    pop2026: 95,  pop2036: 42,  pop2046: 8,
    wbScore: 45, wbTrend: '-',
    closureYear: 2048,
    services: { medical: '終了', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '2048年の自然閉鎖を住民と合意済み。移転支援を2030年から開始',
  },
  {
    id: 'd17', name: '深沢地区',   type: '終息型',
    pop2026: 78,  pop2036: 31,  pop2046: 5,
    wbScore: 43, wbTrend: '-',
    closureYear: 2047,
    services: { medical: '終了', education: '終了', welfare: '縮小', infra: '縮小' },
    note: '高齢者8割。2047年閉鎖予定。残留希望者への在宅ケア体制を整備',
  },
  {
    id: 'd18', name: '岩根地区',   type: '終息型',
    pop2026: 62,  pop2036: 22,  pop2046: 3,
    wbScore: 40, wbTrend: '-',
    closureYear: 2046,
    services: { medical: '終了', education: '終了', welfare: '終了', infra: '縮小' },
    note: '2046年閉鎖予定。地区の歴史・文化をデジタルアーカイブで保存',
  },
  {
    id: 'd19', name: '上原地区',   type: '終息型',
    pop2026: 48,  pop2036: 15,  pop2046: 2,
    wbScore: 38, wbTrend: '-',
    closureYear: 2044,
    services: { medical: '終了', education: '終了', welfare: '終了', infra: '縮小' },
    note: '2044年閉鎖予定。残り住民7名と個別移転計画を策定中',
  },
  {
    id: 'd20', name: '離島地区',   type: '終息型',
    pop2026: 35,  pop2036: 10,  pop2046: 0,
    wbScore: 35, wbTrend: '-',
    closureYear: 2041,
    services: { medical: '終了', education: '終了', welfare: '終了', infra: '終了' },
    note: '2041年閉鎖予定（最早）。全住民との個別面談を2028年から開始',
  },
];

// ─── ユーティリティ ───────────────────────────────────────

const TYPE_STYLE: Record<DistrictType, { bg: string; border: string; text: string; badge: string }> = {
  '拠点型': { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700' },
  '移行型': { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700'   },
  '終息型': { bg: 'bg-red-50',     border: 'border-red-200',     text: 'text-red-700',     badge: 'bg-red-100 text-red-700'       },
};

const SERVICE_STYLE: Record<string, string> = {
  '維持': 'bg-emerald-100 text-emerald-700',
  '縮小': 'bg-amber-100 text-amber-700',
  '終了': 'bg-slate-100 text-slate-400 line-through',
};

function WBBar({ score }: { score: number }) {
  const color = score >= 70 ? 'bg-emerald-500' : score >= 55 ? 'bg-amber-400' : 'bg-red-400';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-xs font-bold text-slate-600 w-8 text-right">{score}</span>
    </div>
  );
}

function PopTrend({ now, future }: { now: number; future: number }) {
  const ratio = Math.round((future / now) * 100);
  const color = ratio >= 80 ? 'text-emerald-600' : ratio >= 60 ? 'text-amber-600' : 'text-red-500';
  return <span className={`text-xs font-bold ${color}`}>{ratio}%</span>;
}

// ─── メインコンポーネント ──────────────────────────────────

export function ShrinkScenarioPanel() {
  const [filter, setFilter]     = useState<DistrictType | 'すべて'>('すべて');
  const [sortKey, setSortKey]   = useState<'type' | 'wb' | 'pop'>('type');

  const totalPop2026 = DISTRICTS.reduce((s, d) => s + d.pop2026, 0);
  const totalPop2046 = DISTRICTS.reduce((s, d) => s + d.pop2046, 0);
  const avgWB        = Math.round(DISTRICTS.reduce((s, d) => s + d.wbScore, 0) / DISTRICTS.length);
  // 総幸福量（人口×平均WB）
  const totalHappy2026 = Math.round(totalPop2026 * avgWB / 100);
  const projectedWB46  = 82; // 施策実施後の目標WBスコア
  const totalHappy2046 = Math.round(totalPop2046 * projectedWB46 / 100);

  const counts = {
    '拠点型': DISTRICTS.filter((d) => d.type === '拠点型').length,
  '移行型': DISTRICTS.filter((d) => d.type === '移行型').length,
  '終息型': DISTRICTS.filter((d) => d.type === '終息型').length,
  };

  const filtered = DISTRICTS
    .filter((d) => filter === 'すべて' || d.type === filter)
    .sort((a, b) => {
      if (sortKey === 'wb')  return b.wbScore - a.wbScore;
      if (sortKey === 'pop') return b.pop2026 - a.pop2026;
      // type順: 拠点→移行→終息
      const order: Record<DistrictType, number> = { '拠点型': 0, '移行型': 1, '終息型': 2 };
      return order[a.type] - order[b.type];
    });

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-5">

        {/* ヘッダー */}
        <div className="rounded-2xl border bg-violet-50 border-violet-200 p-5">
          <div className="flex items-start justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-xl font-bold text-violet-700">🗺️ 縮小シナリオ × 地区 WellBeing マップ</h1>
              <p className="text-sm text-slate-500 mt-1">
                人口10,000人→5,000人の30年縮小を「逃げずに計画する」意思決定ツール
              </p>
              <div className="flex gap-2 mt-2 flex-wrap">
                <span className="text-xs px-2.5 py-1 rounded-full border bg-violet-100 text-violet-700 border-violet-200">
                  👑 町長・議会 向け
                </span>
                <span className="text-xs px-2.5 py-1 rounded-full border bg-slate-100 text-slate-600 border-slate-200">
                  シナリオB：自然収束・透明化モデル
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 総幸福量カード（核心の数式） */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 mb-3">📐 核心の数式：総幸福量 = 人口 × 一人あたり WellBeing スコア</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-4 text-center">
              <p className="text-xs text-slate-500 mb-1">現在（2026年）</p>
              <p className="text-2xl font-bold text-slate-700">{totalPop2026.toLocaleString()}人</p>
              <p className="text-xs text-slate-400 mt-1">× WB{avgWB}点</p>
              <p className="text-lg font-bold text-slate-600 mt-1">= {totalHappy2026.toLocaleString()} <span className="text-xs font-normal">WB総量</span></p>
            </div>
            <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-center">
              <p className="text-xs text-red-500 mb-1">放置した場合（2046年）</p>
              <p className="text-2xl font-bold text-red-700">{totalPop2046.toLocaleString()}人</p>
              <p className="text-xs text-red-400 mt-1">× WB40点（推定）</p>
              <p className="text-lg font-bold text-red-600 mt-1">= {Math.round(totalPop2046 * 40 / 100).toLocaleString()} <span className="text-xs font-normal">WB総量</span></p>
              <p className="text-xs text-red-400 mt-1">現在の {Math.round(Math.round(totalPop2046 * 40 / 100) / totalHappy2026 * 100)}%</p>
            </div>
            <div className="rounded-xl bg-emerald-50 border border-emerald-300 p-4 text-center ring-2 ring-emerald-300">
              <p className="text-xs text-emerald-600 mb-1 font-semibold">✨ RunWith 介入後（2046年）目標</p>
              <p className="text-2xl font-bold text-emerald-700">{totalPop2046.toLocaleString()}人</p>
              <p className="text-xs text-emerald-500 mt-1">× WB{projectedWB46}点（目標）</p>
              <p className="text-lg font-bold text-emerald-600 mt-1">= {totalHappy2046.toLocaleString()} <span className="text-xs font-normal">WB総量</span></p>
              <p className="text-xs text-emerald-500 mt-1">現在の {Math.round(totalHappy2046 / totalHappy2026 * 100)}% を維持</p>
            </div>
          </div>
        </div>

        {/* 地区分類サマリー */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { icon: '🟢', label: '拠点型',   value: counts['拠点型'], sub: 'サービス強化・投資継続', cls: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
            { icon: '🟡', label: '移行型',   value: counts['移行型'], sub: '段階的サービス移転',    cls: 'bg-amber-50 border-amber-200 text-amber-700' },
            { icon: '🔴', label: '終息型',   value: counts['終息型'], sub: '自然閉鎖へ透明計画',    cls: 'bg-red-50 border-red-200 text-red-700' },
            { icon: '📅', label: '最早閉鎖予定', value: '2041年', sub: '離島地区',             cls: 'bg-slate-50 border-slate-200 text-slate-700' },
          ].map((c) => (
            <div key={c.label} className={`rounded-xl border p-4 ${c.cls}`}>
              <div className="text-2xl mb-1">{c.icon}</div>
              <div className="text-2xl font-bold">{c.value}</div>
              <div className="text-xs font-medium mt-0.5">{c.label}</div>
              <div className="text-xs opacity-70 mt-0.5">{c.sub}</div>
            </div>
          ))}
        </div>

        {/* 30年ロードマップ */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">📅 30年縮小ロードマップ</h2>
          <div className="space-y-3">
            {[
              {
                phase: 'フェーズ1 【準備期】',
                period: '2026〜2035年',
                pop: '10,000 → 8,000人',
                color: 'border-l-4 border-blue-400 bg-blue-50',
                items: [
                  '20地区を「拠点型/移行型/終息型」に分類し、住民と合意形成',
                  '終息型5地区の住民へ閉鎖予定年を10年前に透明に通知',
                  'デジタル行政サービスで行政コスト30%削減',
                  '拠点型5地区のサービスを充実・移住受入体制を整備',
                ],
              },
              {
                phase: 'フェーズ2 【移行期】',
                period: '2035〜2045年',
                pop: '8,000 → 6,000人',
                color: 'border-l-4 border-amber-400 bg-amber-50',
                items: [
                  '移行型10地区のサービスを拠点へ順次移転',
                  '巡回医療・巡回教育・巡回介護を本格稼働',
                  '終息型地区の住民移転支援（住宅・就労・コミュニティ）を実施',
                  '公務員を「インフラ維持」から「WellBeing支援」へ再配置',
                ],
              },
              {
                phase: 'フェーズ3 【安定期】',
                period: '2045〜2056年',
                pop: '6,000 → 5,000人',
                color: 'border-l-4 border-emerald-400 bg-emerald-50',
                items: [
                  '5拠点コミュニティへの集約完了',
                  '一人あたりのWellBeingスコアが2026年比+12点以上を達成',
                  '終息地区の文化・歴史をデジタルアーカイブで永久保存',
                  '「小さくても豊かな街」モデルを全国に横展開',
                ],
              },
            ].map((p) => (
              <div key={p.phase} className={`rounded-xl p-4 ${p.color}`}>
                <div className="flex items-center gap-3 mb-2 flex-wrap">
                  <span className="font-bold text-slate-700">{p.phase}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">{p.period}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-600">人口 {p.pop}</span>
                </div>
                <ul className="space-y-1">
                  {p.items.map((item, i) => (
                    <li key={i} className="text-sm text-slate-700">・{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* 地区一覧 */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-base font-semibold text-slate-700">🏘️ 20地区 WellBeing 詳細</h2>
            <div className="flex gap-2 flex-wrap items-center">
              {/* フィルター */}
              <div className="flex gap-1">
                {(['すべて', '拠点型', '移行型', '終息型'] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setFilter(t)}
                    className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${filter === t ? 'bg-violet-600 text-white border-transparent' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'}`}>
                    {t}
                  </button>
                ))}
              </div>
              {/* ソート */}
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as typeof sortKey)}
                className="text-xs px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 focus:outline-none">
                <option value="type">分類順</option>
                <option value="wb">WBスコア順</option>
                <option value="pop">人口順</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            {filtered.map((d) => {
              const style = TYPE_STYLE[d.type];
              return (
                <div key={d.id} className={`rounded-xl border ${style.border} ${style.bg} p-4`}>
                  <div className="flex items-start gap-3 flex-wrap">
                    {/* 地区名・分類 */}
                    <div className="min-w-[130px]">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-slate-700">{d.name}</span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${style.badge}`}>{d.type}</span>
                        {d.closureYear && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-bold">
                            {d.closureYear}年閉鎖予定
                          </span>
                        )}
                      </div>
                      {/* WBスコア */}
                      <div className="text-xs text-slate-500 mb-1">WellBeing スコア</div>
                      <WBBar score={d.wbScore} />
                    </div>

                    {/* 人口推移 */}
                    <div className="text-xs text-slate-600 min-w-[120px]">
                      <div className="font-medium text-slate-500 mb-1">人口推移</div>
                      <div className="space-y-0.5">
                        <div>2026年: <span className="font-bold text-slate-700">{d.pop2026.toLocaleString()}人</span></div>
                        <div>2036年: {d.pop2036.toLocaleString()}人 <PopTrend now={d.pop2026} future={d.pop2036} /></div>
                        <div>2046年: {d.pop2046.toLocaleString()}人 <PopTrend now={d.pop2026} future={d.pop2046} /></div>
                      </div>
                    </div>

                    {/* サービス状況 */}
                    <div className="text-xs min-w-[180px]">
                      <div className="font-medium text-slate-500 mb-1">サービス状況</div>
                      <div className="flex flex-wrap gap-1">
                        {(['medical', 'education', 'welfare', 'infra'] as const).map((key) => {
                          const labels = { medical: '医療', education: '教育', welfare: '福祉', infra: 'インフラ' };
                          return (
                            <span key={key} className={`px-1.5 py-0.5 rounded text-xs font-medium ${SERVICE_STYLE[d.services[key]]}`}>
                              {labels[key]}:{d.services[key]}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* メモ */}
                    <div className="flex-1 min-w-[160px]">
                      <div className="text-xs font-medium text-slate-500 mb-1">今後の方針</div>
                      <p className="text-xs text-slate-600 leading-relaxed">{d.note}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 議会・住民説明への導線 */}
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4">
          <p className="text-xs font-semibold text-violet-700 mb-2">💡 このデータを使った次のアクション</p>
          <div className="flex gap-2 flex-wrap">
            <Link href="/gyosei/document-gen"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 hover:bg-violet-200 border border-violet-200">
              📋 AI政策文書生成（議会向けレポートを自動作成）
            </Link>
            <Link href="/koumuin/ai-advisor"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 border border-indigo-200">
              🤖 AI全体最適化提言と連動
            </Link>
            <Link href="/koumuin/dashboard"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200">
              🌐 公務員連携ダッシュボード
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
