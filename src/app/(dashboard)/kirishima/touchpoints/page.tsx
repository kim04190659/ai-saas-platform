'use client';

/**
 * 霧島市 市民接触・満足度分析ダッシュボード
 * /kirishima/touchpoints
 *
 * Notion DB02 TouchPoint のデータをリアルタイムで取得し、
 * チャネル別・カテゴリ別・SDL軸別に可視化する
 */

import { useState, useEffect } from 'react';

// ─── 型定義 ──────────────────────────────────────────────

type Touchpoint = {
  id: string;
  name: string;
  channel: string;
  userType: string[];
  category: string;
  status: string;
  satisfaction: number | null;
  resolveTime: number | null;
  sdlAxis: string;
  date: string;
  analysis: string;
};

// ─── 定数：チャネル・カテゴリ・ステータスの色定義 ─────────

const CHANNEL_COLORS: Record<string, string> = {
  '窓口来庁':   '#0ea5e9',  // sky
  'LINE':       '#22c55e',  // green
  'Web':        '#8b5cf6',  // violet
  '電話':       '#f59e0b',  // amber
  '市民センター': '#14b8a6', // teal
};

const CATEGORY_COLORS: Record<string, string> = {
  '苦情':     '#ef4444',  // red
  '手続き':   '#3b82f6',  // blue
  '情報照会': '#8b5cf6',  // violet
  '賞賛':     '#22c55e',  // green
  'その他':   '#94a3b8',  // slate
};

const STATUS_CONFIG: Record<string, { bg: string; text: string; label: string }> = {
  '解決済':       { bg: 'bg-emerald-100', text: 'text-emerald-700', label: '解決済' },
  '対応中':       { bg: 'bg-amber-100',   text: 'text-amber-700',   label: '対応中' },
  '未対応':       { bg: 'bg-red-100',     text: 'text-red-700',     label: '未対応' },
  'エスカレ':     { bg: 'bg-violet-100',  text: 'text-violet-700',  label: 'エスカレ' },
};

const SDL_COLORS: Record<string, string> = {
  '共創': '#0ea5e9',
  '文脈': '#8b5cf6',
  '資源': '#22c55e',
  '統合': '#f59e0b',
  '価値': '#14b8a6',
};

// ─── ユーティリティ関数 ──────────────────────────────────

/** 配列を集計して {key: count} のマップを返す */
function countBy(arr: string[]): Record<string, number> {
  return arr.reduce((acc, v) => {
    acc[v] = (acc[v] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);
}

/** チャネルごとの平均満足度を計算 */
function avgSatisfactionByChannel(items: Touchpoint[]): Record<string, number> {
  const sums: Record<string, number> = {};
  const counts: Record<string, number> = {};
  for (const tp of items) {
    if (tp.satisfaction !== null) {
      sums[tp.channel] = (sums[tp.channel] ?? 0) + tp.satisfaction;
      counts[tp.channel] = (counts[tp.channel] ?? 0) + 1;
    }
  }
  return Object.fromEntries(
    Object.keys(sums).map((ch) => [ch, Math.round((sums[ch] / counts[ch]) * 10) / 10])
  );
}

/** 日付文字列を "YYYY/MM/DD" 形式に変換 */
function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

// ─── SVGバーチャート コンポーネント ──────────────────────

function BarChart({
  data,
  colors,
  maxVal,
  height = 120,
}: {
  data: Record<string, number>;
  colors: Record<string, string>;
  maxVal?: number;
  height?: number;
}) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = maxVal ?? Math.max(...entries.map(([, v]) => v), 1);
  const barWidth = 36;
  const gap = 16;
  const totalWidth = entries.length * (barWidth + gap) - gap + 40;

  return (
    <svg width="100%" viewBox={`0 0 ${totalWidth} ${height + 40}`} className="overflow-visible">
      {entries.map(([key, val], i) => {
        const barH = Math.max(4, (val / max) * height);
        const x = 20 + i * (barWidth + gap);
        const y = height - barH;
        const color = colors[key] ?? '#94a3b8';
        return (
          <g key={key}>
            {/* バー本体 */}
            <rect x={x} y={y} width={barWidth} height={barH} rx={4} fill={color} opacity={0.85} />
            {/* 値ラベル */}
            <text x={x + barWidth / 2} y={y - 4} textAnchor="middle" fontSize={11} fill="#374151" fontWeight="600">
              {val}
            </text>
            {/* キーラベル（改行対応のため2行） */}
            {key.length > 4 ? (
              <>
                <text x={x + barWidth / 2} y={height + 14} textAnchor="middle" fontSize={9} fill="#6b7280">{key.slice(0, 4)}</text>
                <text x={x + barWidth / 2} y={height + 26} textAnchor="middle" fontSize={9} fill="#6b7280">{key.slice(4)}</text>
              </>
            ) : (
              <text x={x + barWidth / 2} y={height + 16} textAnchor="middle" fontSize={10} fill="#6b7280">{key}</text>
            )}
          </g>
        );
      })}
    </svg>
  );
}

// ─── 満足度ゲージ（横バー）コンポーネント ─────────────────

function SatisfactionBar({ value, max = 5 }: { value: number; max?: number }) {
  const pct = Math.min(100, (value / max) * 100);
  // スコアに応じて色を変える
  const color = value >= 4 ? '#22c55e' : value >= 3 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
        <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold w-8 text-right" style={{ color }}>{value.toFixed(1)}</span>
    </div>
  );
}

// ─── メインページ コンポーネント ─────────────────────────

export default function KirishimaTouchpointsPage() {
  const [touchpoints, setTouchpoints] = useState<Touchpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // データフェッチ
  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notion/kirishima/touchpoints');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setTouchpoints(json.touchpoints ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── 集計 ─────────────────────────────────────────────

  const channelCounts  = countBy(touchpoints.map((t) => t.channel));
  const categoryCounts = countBy(touchpoints.map((t) => t.category));
  const sdlCounts      = countBy(touchpoints.filter((t) => t.sdlAxis).map((t) => t.sdlAxis));
  const statusCounts   = countBy(touchpoints.map((t) => t.status));
  const avgByCh        = avgSatisfactionByChannel(touchpoints);

  const totalTP     = touchpoints.length;
  const resolvedPct = totalTP > 0
    ? Math.round(((statusCounts['解決済'] ?? 0) / totalTP) * 100)
    : 0;
  const avgSat = touchpoints.filter((t) => t.satisfaction !== null).length > 0
    ? (
        touchpoints.reduce((s, t) => s + (t.satisfaction ?? 0), 0) /
        touchpoints.filter((t) => t.satisfaction !== null).length
      ).toFixed(1)
    : '-';
  const avgResolveTime = touchpoints.filter((t) => t.resolveTime !== null).length > 0
    ? Math.round(
        touchpoints.reduce((s, t) => s + (t.resolveTime ?? 0), 0) /
        touchpoints.filter((t) => t.resolveTime !== null).length
      )
    : null;

  // ─── ローディング / エラー表示 ────────────────────────

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-teal-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-gray-500 text-sm">Notionからデータを取得中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <p className="text-red-500 font-semibold mb-2">⚠️ データ取得エラー</p>
          <p className="text-gray-500 text-sm mb-4">{error}</p>
          <button onClick={fetchData} className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700">
            再試行
          </button>
        </div>
      </div>
    );
  }

  // ─── メインUI ────────────────────────────────────────

  return (
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">🎯 市民接触・満足度分析</h1>
          <p className="text-sm text-gray-500 mt-1">
            霧島市 タッチポイント管理 — Notion DB02 リアルタイム連携
            {lastUpdated && (
              <span className="ml-2 text-xs text-gray-400">
                最終更新: {lastUpdated.toLocaleTimeString('ja-JP')}
              </span>
            )}
          </p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm hover:bg-teal-700 transition-colors"
        >
          🔄 更新
        </button>
      </div>

      {/* サマリーカード */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '総タッチポイント', value: `${totalTP}件`, icon: '📍', color: 'bg-teal-50 border-teal-200 text-teal-700' },
          { label: '解決率', value: `${resolvedPct}%`, icon: '✅', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: '平均満足度', value: `${avgSat} / 5.0`, icon: '⭐', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: '平均解決時間', value: avgResolveTime !== null ? `${avgResolveTime}分` : '-', icon: '⏱️', color: 'bg-sky-50 border-sky-200 text-sky-700' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-xs mt-1 opacity-75">{card.label}</div>
          </div>
        ))}
      </div>

      {/* チャート行：チャネル分布 + カテゴリ分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* チャネル別件数 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">📡 チャネル別 タッチポイント数</h2>
          <BarChart data={channelCounts} colors={CHANNEL_COLORS} height={100} />
        </div>

        {/* カテゴリ別件数 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">🏷️ 内容カテゴリ別 件数</h2>
          <BarChart data={categoryCounts} colors={CATEGORY_COLORS} height={100} />
        </div>
      </div>

      {/* チャート行：チャネル別満足度 + SDL軸分布 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* チャネル別平均満足度 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">⭐ チャネル別 平均満足度（/5.0）</h2>
          <div className="space-y-3">
            {Object.entries(avgByCh)
              .sort((a, b) => b[1] - a[1])
              .map(([ch, avg]) => (
                <div key={ch}>
                  <div className="flex justify-between text-xs text-gray-600 mb-1">
                    <span className="font-medium">{ch}</span>
                    <span className="text-gray-400">{channelCounts[ch] ?? 0}件</span>
                  </div>
                  <SatisfactionBar value={avg} />
                </div>
              ))}
            {Object.keys(avgByCh).length === 0 && (
              <p className="text-xs text-gray-400 text-center py-4">満足度データなし</p>
            )}
          </div>
        </div>

        {/* SDL軸分布 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">🔵 SDL軸分類 分布</h2>
          {Object.keys(sdlCounts).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(sdlCounts)
                .sort((a, b) => b[1] - a[1])
                .map(([axis, cnt]) => {
                  const pct = Math.round((cnt / totalTP) * 100);
                  const color = SDL_COLORS[axis] ?? '#94a3b8';
                  return (
                    <div key={axis}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="font-medium text-gray-700">{axis}</span>
                        <span className="text-gray-400">{cnt}件 ({pct}%)</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2 overflow-hidden">
                        <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-xs text-gray-400 text-center py-4">SDL軸データなし</p>
          )}

          {/* ステータス集計（SDL軸の下に配置） */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-500 mb-3">解決ステータス内訳</h3>
            <div className="flex flex-wrap gap-2">
              {Object.entries(statusCounts).map(([st, cnt]) => {
                const cfg = STATUS_CONFIG[st] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: st };
                return (
                  <span key={st} className={`px-2 py-1 rounded-lg text-xs font-semibold ${cfg.bg} ${cfg.text}`}>
                    {cfg.label}：{cnt}件
                  </span>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 直近タッチポイント一覧 */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">📋 タッチポイント一覧（直近順）</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100">
                {['日付', 'チャネル', 'カテゴリ', 'SDL軸', 'ステータス', '満足度', '解決時間', 'AI分析'].map((h) => (
                  <th key={h} className="text-left py-2 pr-3 text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {touchpoints.map((tp) => {
                const stCfg = STATUS_CONFIG[tp.status] ?? { bg: 'bg-gray-100', text: 'text-gray-700', label: tp.status };
                return (
                  <tr key={tp.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 whitespace-nowrap text-gray-500">{formatDate(tp.date)}</td>
                    <td className="py-2 pr-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: CHANNEL_COLORS[tp.channel] ?? '#94a3b8' }}
                      >
                        {tp.channel || '-'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      <span
                        className="px-2 py-0.5 rounded text-xs font-medium text-white"
                        style={{ backgroundColor: CATEGORY_COLORS[tp.category] ?? '#94a3b8' }}
                      >
                        {tp.category || '-'}
                      </span>
                    </td>
                    <td className="py-2 pr-3">
                      {tp.sdlAxis ? (
                        <span
                          className="px-2 py-0.5 rounded text-xs font-medium text-white"
                          style={{ backgroundColor: SDL_COLORS[tp.sdlAxis] ?? '#94a3b8' }}
                        >
                          {tp.sdlAxis}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${stCfg.bg} ${stCfg.text}`}>
                        {stCfg.label}
                      </span>
                    </td>
                    <td className="py-2 pr-3 text-center">
                      {tp.satisfaction !== null ? (
                        <span className={`font-bold ${tp.satisfaction >= 4 ? 'text-emerald-600' : tp.satisfaction >= 3 ? 'text-amber-500' : 'text-red-500'}`}>
                          {tp.satisfaction.toFixed(1)}
                        </span>
                      ) : <span className="text-gray-300">-</span>}
                    </td>
                    <td className="py-2 pr-3 text-center text-gray-600">
                      {tp.resolveTime !== null ? `${tp.resolveTime}分` : '-'}
                    </td>
                    <td className="py-2 max-w-xs">
                      <span className="text-gray-500 line-clamp-1" title={tp.analysis}>
                        {tp.analysis || '-'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {touchpoints.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-8">タッチポイントデータがありません</p>
          )}
        </div>
      </div>
    </div>
  );
}
