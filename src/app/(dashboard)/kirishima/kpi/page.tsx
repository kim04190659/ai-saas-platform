'use client';
/**
 * /kirishima/kpi — 霧島市 KPI総合ダッシュボード
 * E軸（市民視点）・T軸（提供者視点）・L軸（責任者視点）の9KPIを可視化
 */

import { useEffect, useState } from 'react';
import { Loader2, TrendingUp, TrendingDown, Minus, RefreshCw, ExternalLink } from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────────────
type KPIRecord = {
  id: string;
  name: string;
  scope: string;
  department: string;
  e1: number | null; e2: number | null; e3: number | null;
  t1: number | null; t2: number | null; t3: number | null;
  l1: number | null; l2: number | null; l3: number | null;
  comment: string;
};

// ─── KPIメタデータ（目標値・単位・方向性など） ────────────────
type KPIMeta = {
  key: keyof KPIRecord;
  axis: 'E' | 'T' | 'L';
  label: string;
  unit: string;
  target: number;
  current?: number | null;
  higherIsBetter: boolean;
  description: string;
};

const KPI_METAS: KPIMeta[] = [
  { key: 'e1', axis: 'E', label: '市民満足度スコア',        unit: '点',   target: 3.8,  higherIsBetter: true,  description: '市民が感じるサービス品質（1〜5点）' },
  { key: 'e2', axis: 'E', label: '窓口待ち時間',            unit: '分',   target: 20,   higherIsBetter: false, description: '窓口平均待ち時間。20分以内が目標' },
  { key: 'e3', axis: 'E', label: 'オンライン手続き率',       unit: '%',    target: 50,   higherIsBetter: true,  description: '手続き全体のオンライン完結割合' },
  { key: 't1', axis: 'T', label: '電話一次解決率',           unit: '%',    target: 70,   higherIsBetter: true,  description: '電話対応でその場で解決した割合' },
  { key: 't2', axis: 'T', label: '新任職員戦力化期間',       unit: 'ヶ月', target: 3,    higherIsBetter: false, description: '新任者が独立対応できるまでの期間' },
  { key: 't3', axis: 'T', label: 'ナレッジ活用率',           unit: '%',    target: 60,   higherIsBetter: true,  description: 'KB参照後の解決率（計測開始後設定）' },
  { key: 'l1', axis: 'L', label: 'DX投資対効果',             unit: '倍',   target: 1.5,  higherIsBetter: true,  description: '稼働後に計測開始予定' },
  { key: 'l2', axis: 'L', label: '職員研修受講率',           unit: '%',    target: 90,   higherIsBetter: true,  description: '年度内研修完了率。目標90%' },
  { key: 'l3', axis: 'L', label: 'WB総合スコア',             unit: '点',   target: 4.0,  higherIsBetter: true,  description: 'チームWell-Being平均（1〜5点）' },
];

const AXIS_CONFIG = {
  E: { label: 'E軸 市民視点',   color: 'teal',   bg: 'bg-teal-50',   border: 'border-teal-200',  pill: 'bg-teal-100 text-teal-800',  bar: 'bg-teal-500'  },
  T: { label: 'T軸 提供者視点', color: 'blue',   bg: 'bg-blue-50',   border: 'border-blue-200',  pill: 'bg-blue-100 text-blue-800',  bar: 'bg-blue-500'  },
  L: { label: 'L軸 責任者視点', color: 'violet', bg: 'bg-violet-50', border: 'border-violet-200', pill: 'bg-violet-100 text-violet-800', bar: 'bg-violet-500' },
};

// ─── 進捗計算（高いほど良い場合 / 低いほど良い場合） ──────────
function calcProgress(current: number, target: number, higherIsBetter: boolean): number {
  if (higherIsBetter) return Math.min(100, (current / target) * 100);
  // 低いほど良い場合：target の 2倍を基準として逆算
  const worst = target * 2;
  return Math.max(0, Math.min(100, ((worst - current) / (worst - target)) * 100));
}

function getStatus(current: number, target: number, higherIsBetter: boolean) {
  const ratio = higherIsBetter ? current / target : target / current;
  if (ratio >= 0.95) return 'good';
  if (ratio >= 0.75) return 'warn';
  return 'danger';
}

// ─── SVG ゲージ（半円） ───────────────────────────────────────
function SemiGauge({ value, color }: { value: number; color: string }) {
  const r = 44;
  const cx = 56, cy = 56;
  const circumference = Math.PI * r;  // 半円の円弧長
  const filled = (value / 100) * circumference;
  const colorMap: Record<string, string> = {
    teal: '#0d9488', blue: '#3b82f6', violet: '#7c3aed',
    good: '#22c55e', warn: '#f59e0b', danger: '#ef4444',
  };
  return (
    <svg width="112" height="70" viewBox="0 0 112 70">
      {/* 背景トラック */}
      <path d={`M 12 56 A 44 44 0 0 1 100 56`} fill="none" stroke="#e5e7eb" strokeWidth="10" strokeLinecap="round" />
      {/* 値トラック */}
      <path
        d={`M 12 56 A 44 44 0 0 1 100 56`}
        fill="none"
        stroke={colorMap[color] ?? '#0d9488'}
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={`${filled} ${circumference}`}
        style={{ transition: 'stroke-dasharray 0.8s ease' }}
      />
    </svg>
  );
}

// ─── KPIカード ─────────────────────────────────────────────
function KPICard({ meta, current }: { meta: KPIMeta; current: number | null }) {
  const ax = AXIS_CONFIG[meta.axis];
  const isNull = current === null;
  const progress = isNull ? 0 : calcProgress(current, meta.target, meta.higherIsBetter);
  const status   = isNull ? 'null' : getStatus(current, meta.target, meta.higherIsBetter);

  const statusColor = { good: 'text-green-600', warn: 'text-amber-500', danger: 'text-red-500', null: 'text-gray-400' }[status];
  const barColor    = { good: 'bg-green-500', warn: 'bg-amber-400', danger: 'bg-red-400', null: 'bg-gray-300' }[status];
  const StatusIcon  = status === 'good' ? TrendingUp : status === 'danger' ? TrendingDown : Minus;

  // 目標との差を表示
  const gap = isNull ? null : meta.higherIsBetter
    ? (current - meta.target).toFixed(meta.unit === '点' ? 1 : 0)
    : (current - meta.target).toFixed(0);

  return (
    <div className={`rounded-xl border ${ax.border} ${ax.bg} p-4 flex flex-col gap-3 shadow-sm hover:shadow-md transition-shadow`}>
      {/* ヘッダー */}
      <div className="flex items-start justify-between">
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${ax.pill}`}>{ax.label}</span>
        <StatusIcon size={16} className={statusColor} />
      </div>

      {/* メトリック名 */}
      <p className="text-sm font-semibold text-gray-700 leading-tight">{meta.label}</p>

      {/* 値表示 */}
      <div className="flex items-end gap-2">
        {isNull ? (
          <span className="text-2xl font-bold text-gray-300">—</span>
        ) : (
          <span className={`text-3xl font-bold ${statusColor}`}>{current}<span className="text-lg ml-0.5">{meta.unit}</span></span>
        )}
        <span className="text-xs text-gray-400 mb-1">目標: {meta.target}{meta.unit}</span>
      </div>

      {/* プログレスバー */}
      <div className="space-y-1">
        <div className="flex justify-between text-xs text-gray-400">
          <span>{isNull ? '計測前' : `${Math.round(progress)}%達成`}</span>
          {gap !== null && (
            <span className={statusColor}>
              {Number(gap) > 0 && meta.higherIsBetter ? `+${gap}` : gap}{meta.unit}
            </span>
          )}
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-700 ${barColor}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* 説明 */}
      <p className="text-xs text-gray-400 leading-snug">{meta.description}</p>
    </div>
  );
}

// ─── 軸スコアゲージ ──────────────────────────────────────────
function AxisGauge({ axis, metas, record }: { axis: 'E' | 'T' | 'L'; metas: KPIMeta[]; record: KPIRecord }) {
  const ax = AXIS_CONFIG[axis];
  const validMetas = metas.filter(m => m.axis === axis && record[m.key] !== null);
  const scores = validMetas.map(m => {
    const cur = record[m.key] as number;
    return calcProgress(cur, m.target, m.higherIsBetter);
  });
  const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;

  return (
    <div className={`rounded-xl border ${ax.border} ${ax.bg} p-5 flex flex-col items-center gap-2 shadow-sm`}>
      <SemiGauge value={avg} color={ax.color} />
      <span className="text-2xl font-bold text-gray-700 -mt-2">{Math.round(avg)}%</span>
      <span className={`text-xs font-bold px-3 py-1 rounded-full ${ax.pill}`}>{ax.label}</span>
      <p className="text-xs text-gray-400 text-center">{scores.length}/{metas.filter(m => m.axis === axis).length} KPI計測中</p>
    </div>
  );
}

// ─── メインページ ────────────────────────────────────────────
export default function KirishimaKPIPage() {
  const [record, setRecord] = useState<KPIRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notion/kirishima/kpi');
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.kpis?.length > 0) setRecord(data.kpis[0]);
      else setRecord(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // ─── ローディング ─────────────────────────────────────────
  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-teal-600" size={36} />
      <span className="ml-3 text-gray-500">Notionからデータ取得中…</span>
    </div>
  );

  // ─── エラー ──────────────────────────────────────────────
  if (error) return (
    <div className="p-6 max-w-lg mx-auto mt-10 bg-red-50 border border-red-200 rounded-xl">
      <p className="text-red-600 font-semibold mb-2">データ取得エラー</p>
      <p className="text-sm text-red-500">{error}</p>
      <button onClick={load} className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">再試行</button>
    </div>
  );

  // ─── データなし ──────────────────────────────────────────
  if (!record) return (
    <div className="p-6 text-center text-gray-400">
      KPIスナップショットが見つかりません。Notionで DB06 KPISnapshot にデータを登録してください。
    </div>
  );

  const metasWithValue = KPI_METAS.map(m => ({ ...m, current: record[m.key] as number | null }));

  return (
    <div className="p-6 space-y-8 max-w-6xl mx-auto">

      {/* ── ヘッダー ─────────────────────────────────────── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-sm text-teal-600 font-semibold mb-1">
            <span>🏙️ 霧島市役所</span>
            <span className="text-gray-300">›</span>
            <span>KPI総合ダッシュボード</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-800">📊 KPI総合ダッシュボード</h1>
          <p className="text-sm text-gray-500 mt-1">
            スナップショット: <span className="font-semibold text-gray-700">{record.name}</span>
            　対象: {record.department}
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
        >
          <RefreshCw size={14} />
          Notionから再取得
        </button>
      </div>

      {/* ── 軸別達成率ゲージ（3つ並び） ─────────────────── */}
      <section>
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-4">軸別 達成率サマリー</h2>
        <div className="grid grid-cols-3 gap-4">
          {(['E', 'T', 'L'] as const).map(ax => (
            <AxisGauge key={ax} axis={ax} metas={KPI_METAS} record={record} />
          ))}
        </div>
      </section>

      {/* ── KPIカードグリッド（軸ごとに3列） ─────────────── */}
      {(['E', 'T', 'L'] as const).map(ax => (
        <section key={ax}>
          <h2 className={`text-sm font-bold uppercase tracking-wide mb-4 ${
            ax === 'E' ? 'text-teal-600' : ax === 'T' ? 'text-blue-600' : 'text-violet-600'
          }`}>
            {AXIS_CONFIG[ax].label}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metasWithValue.filter(m => m.axis === ax).map(meta => (
              <KPICard key={meta.key as string} meta={meta} current={meta.current} />
            ))}
          </div>
        </section>
      ))}

      {/* ── コメント ─────────────────────────────────────── */}
      {record.comment && (
        <section className="bg-teal-50 border border-teal-200 rounded-xl p-5">
          <h2 className="text-sm font-bold text-teal-700 mb-2">📝 前期比コメント（AI分析）</h2>
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{record.comment}</p>
        </section>
      )}

      {/* ── Notionリンク ─────────────────────────────────── */}
      <div className="flex justify-end">
        <a
          href="https://www.notion.so/4006e5d221d9407eaec42b8868c8013f"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 text-sm text-teal-600 hover:text-teal-800 hover:underline"
        >
          <ExternalLink size={14} />
          Notionで詳細を確認
        </a>
      </div>
    </div>
  );
}
