'use client';

/**
 * 霧島市 ナレッジ活用状況ダッシュボード
 * /kirishima/knowledge
 *
 * Notion DB07 KnowledgeBase + DB08 VOEInsight + DB03 Incident から
 * データをリアルタイムで取得し、ナレッジ活用・VoE・インシデント状況を可視化する
 */

import { useState, useEffect } from 'react';

// ─── 型定義 ──────────────────────────────────────────────

type KnowledgeItem = {
  id: string;
  title: string;
  category: string;
  sdlAxis: string[];
  scope: string;
  effectiveness: number | null;
  updated: string;
};

type VOEItem = {
  id: string;
  title: string;
  channel: string;
  count: number | null;
  positiveRate: number | null;
  sdlKyoso: number | null;
  sdlBunmyaku: number | null;
  sdlShigen: number | null;
  sdlTogo: number | null;
  sdlKachi: number | null;
  themes: string;
  comment: string;
};

type IncidentItem = {
  id: string;
  name: string;
  severity: string;
  rootCause: string;
  impact: number | null;
  knowledged: boolean;
  prevention: string;
  date: string;
};

// ─── 定数：色マッピング ──────────────────────────────────

const SEVERITY_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  '重大': { bg: 'bg-red-100',    text: 'text-red-700',    border: 'border-red-300' },
  '高':   { bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300' },
  '中':   { bg: 'bg-amber-100',  text: 'text-amber-700',  border: 'border-amber-300' },
  '低':   { bg: 'bg-blue-100',   text: 'text-blue-700',   border: 'border-blue-300' },
};

const CATEGORY_COLORS: Record<string, string> = {
  '窓口対応': '#0ea5e9',
  'システム': '#8b5cf6',
  '法規・制度': '#f59e0b',
  '住民対応': '#22c55e',
  'その他': '#94a3b8',
};

const SDL_LABELS: { key: keyof VOEItem; label: string; color: string }[] = [
  { key: 'sdlKyoso',   label: '共創', color: '#0ea5e9' },
  { key: 'sdlBunmyaku', label: '文脈', color: '#8b5cf6' },
  { key: 'sdlShigen',  label: '資源', color: '#22c55e' },
  { key: 'sdlTogo',    label: '統合', color: '#f59e0b' },
  { key: 'sdlKachi',   label: '価値', color: '#14b8a6' },
];

// ─── ユーティリティ関数 ──────────────────────────────────

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return dateStr.slice(0, 10).replace(/-/g, '/');
}

/** 有効性スコアに応じた色 */
function effectivenessColor(score: number | null): string {
  if (score === null) return '#94a3b8';
  if (score >= 4) return '#22c55e';
  if (score >= 3) return '#f59e0b';
  return '#ef4444';
}

// ─── 五角形レーダーチャート（SVG）──────────────────────

function PentagonRadar({ values, labels, colors }: {
  values: (number | null)[];
  labels: string[];
  colors: string[];
}) {
  const size = 140;
  const cx = size / 2;
  const cy = size / 2;
  const maxR = 50;
  const max = 10;

  // 正五角形の頂点を計算（上から時計回り）
  const angleStep = (2 * Math.PI) / 5;
  const startAngle = -Math.PI / 2;

  const points = values.map((v, i) => {
    const angle = startAngle + i * angleStep;
    const r = v !== null ? (v / max) * maxR : 0;
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    };
  });

  const outerPoints = Array.from({ length: 5 }, (_, i) => {
    const angle = startAngle + i * angleStep;
    return { x: cx + maxR * Math.cos(angle), y: cy + maxR * Math.sin(angle) };
  });

  const polyStr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const outerStr = outerPoints.map((p) => `${p.x},${p.y}`).join(' ');

  // グリッドライン（20%, 40%, 60%, 80%, 100%）
  const gridLevels = [0.2, 0.4, 0.6, 0.8, 1.0];

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {/* グリッド */}
      {gridLevels.map((level) => {
        const gPts = Array.from({ length: 5 }, (_, i) => {
          const angle = startAngle + i * angleStep;
          const r = maxR * level;
          return `${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`;
        }).join(' ');
        return (
          <polygon
            key={level}
            points={gPts}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={1}
          />
        );
      })}
      {/* 軸ライン */}
      {outerPoints.map((p, i) => (
        <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#e5e7eb" strokeWidth={1} />
      ))}
      {/* 外枠 */}
      <polygon points={outerStr} fill="none" stroke="#d1d5db" strokeWidth={1.5} />
      {/* データ多角形 */}
      <polygon points={polyStr} fill="#14b8a699" stroke="#14b8a6" strokeWidth={2} />
      {/* ラベル */}
      {outerPoints.map((p, i) => {
        const angle = startAngle + i * angleStep;
        const labelR = maxR + 14;
        const lx = cx + labelR * Math.cos(angle);
        const ly = cy + labelR * Math.sin(angle);
        return (
          <text
            key={i}
            x={lx} y={ly + 4}
            textAnchor="middle"
            fontSize={10}
            fontWeight="600"
            fill={colors[i]}
          >
            {labels[i]}
          </text>
        );
      })}
    </svg>
  );
}

// ─── メインページ コンポーネント ─────────────────────────

export default function KirishimaKnowledgePage() {
  const [knowledge, setKnowledge] = useState<KnowledgeItem[]>([]);
  const [voe, setVOE] = useState<VOEItem[]>([]);
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'knowledge' | 'voe' | 'incident'>('knowledge');

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notion/kirishima/knowledge');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setKnowledge(json.knowledge ?? []);
      setVOE(json.voe ?? []);
      setIncidents(json.incidents ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── 集計 ─────────────────────────────────────────────

  const knowledgedCount = incidents.filter((i) => i.knowledged).length;
  const knowledgedRate  = incidents.length > 0
    ? Math.round((knowledgedCount / incidents.length) * 100) : 0;
  const avgEffectiveness = knowledge.filter((k) => k.effectiveness !== null).length > 0
    ? (knowledge.reduce((s, k) => s + (k.effectiveness ?? 0), 0) /
       knowledge.filter((k) => k.effectiveness !== null).length).toFixed(1)
    : '-';
  const totalVoeCount = voe.reduce((s, v) => s + (v.count ?? 0), 0);

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

  return (
    <div className="p-6 space-y-6">

      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📚 ナレッジ活用状況</h1>
          <p className="text-sm text-gray-500 mt-1">
            霧島市 ナレッジ管理 — Notion DB07/08/03 リアルタイム連携
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
          { label: 'ナレッジ件数', value: `${knowledge.length}件`, icon: '📖', color: 'bg-teal-50 border-teal-200 text-teal-700' },
          { label: '平均有効性', value: `${avgEffectiveness} / 5`, icon: '⭐', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: 'VoE総件数', value: `${totalVoeCount}件`, icon: '💬', color: 'bg-violet-50 border-violet-200 text-violet-700' },
          { label: 'インシデント化率', value: `${knowledgedRate}%`, icon: '🔄', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
        ].map((card) => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className="text-xl font-bold">{card.value}</div>
            <div className="text-xs mt-1 opacity-75">{card.label}</div>
          </div>
        ))}
      </div>

      {/* タブ切り替え */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 w-fit">
        {([
          { key: 'knowledge', label: '📖 ナレッジベース', count: knowledge.length },
          { key: 'voe',       label: '💬 VoEインサイト',  count: voe.length },
          { key: 'incident',  label: '⚠️ インシデント',   count: incidents.length },
        ] as const).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-white shadow text-teal-700'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-60">({tab.count})</span>
          </button>
        ))}
      </div>

      {/* ─── ナレッジベース タブ ─────────────────────────── */}
      {activeTab === 'knowledge' && (
        <div className="space-y-4">
          {knowledge.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-sm">ナレッジデータがありません</p>
            </div>
          ) : (
            knowledge.map((kb) => (
              <div key={kb.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className="font-semibold text-gray-800">{kb.title || '（タイトルなし）'}</span>
                      {kb.scope && (
                        <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{kb.scope}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap mt-2">
                      {kb.category && (
                        <span
                          className="text-xs px-2 py-0.5 rounded text-white font-medium"
                          style={{ backgroundColor: CATEGORY_COLORS[kb.category] ?? '#94a3b8' }}
                        >
                          {kb.category}
                        </span>
                      )}
                      {kb.sdlAxis.map((axis) => (
                        <span key={axis} className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded">
                          SDL:{axis}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    {/* 有効性スコア */}
                    <div className="text-center">
                      <div
                        className="text-xl font-bold"
                        style={{ color: effectivenessColor(kb.effectiveness) }}
                      >
                        {kb.effectiveness !== null ? kb.effectiveness.toFixed(1) : '-'}
                      </div>
                      <div className="text-xs text-gray-400">有効性</div>
                    </div>
                    <div className="text-xs text-gray-400">更新: {formatDate(kb.updated)}</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* ─── VoEインサイト タブ ──────────────────────────── */}
      {activeTab === 'voe' && (
        <div className="space-y-4">
          {voe.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-sm">VoEデータがありません</p>
            </div>
          ) : (
            voe.map((v) => {
              const sdlValues = SDL_LABELS.map((l) => v[l.key] as number | null);
              const sdlLabels = SDL_LABELS.map((l) => l.label);
              const sdlColors = SDL_LABELS.map((l) => l.color);

              return (
                <div key={v.id} className="bg-white border border-gray-200 rounded-xl p-5">
                  <div className="flex items-start gap-4">
                    {/* 左：テキスト情報 */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="font-semibold text-gray-800">{v.title || '（タイトルなし）'}</span>
                        {v.channel && (
                          <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full">{v.channel}</span>
                        )}
                        {v.count !== null && (
                          <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">{v.count}件</span>
                        )}
                      </div>

                      {/* ポジティブ率バー */}
                      {v.positiveRate !== null && (
                        <div className="flex items-center gap-2 mb-3">
                          <span className="text-xs text-gray-500 w-20 shrink-0">ポジティブ率</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-2 rounded-full"
                              style={{
                                width: `${v.positiveRate * 100}%`,
                                backgroundColor: v.positiveRate >= 0.7 ? '#22c55e' : v.positiveRate >= 0.5 ? '#f59e0b' : '#ef4444',
                              }}
                            />
                          </div>
                          <span className="text-xs font-bold w-10 text-right text-gray-600">
                            {Math.round(v.positiveRate * 100)}%
                          </span>
                        </div>
                      )}

                      {/* 主要テーマ */}
                      {v.themes && (
                        <div className="text-xs text-gray-600 mb-2">
                          <span className="font-medium text-gray-500">主要テーマ：</span>
                          {v.themes}
                        </div>
                      )}

                      {/* コメント */}
                      {v.comment && (
                        <div className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                          💬 {v.comment}
                        </div>
                      )}
                    </div>

                    {/* 右：SDL五角形レーダー */}
                    <div className="shrink-0">
                      <PentagonRadar values={sdlValues} labels={sdlLabels} colors={sdlColors} />
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ─── インシデント タブ ───────────────────────────── */}
      {activeTab === 'incident' && (
        <div className="space-y-4">
          {/* インシデント集計サマリー */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-gray-800">{incidents.length}</div>
              <div className="text-xs text-gray-500">総インシデント数</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-emerald-600">{knowledgedCount}</div>
              <div className="text-xs text-gray-500">ナレッジ化済み</div>
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
              <div className="text-2xl font-bold text-teal-600">{knowledgedRate}%</div>
              <div className="text-xs text-gray-500">ナレッジ化率</div>
            </div>
          </div>

          {/* インシデント一覧 */}
          {incidents.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
              <p className="text-gray-400 text-sm">インシデントデータがありません</p>
            </div>
          ) : (
            incidents.map((inc) => {
              const sevCfg = SEVERITY_CONFIG[inc.severity] ?? { bg: 'bg-gray-100', text: 'text-gray-700', border: 'border-gray-200' };
              return (
                <div key={inc.id} className={`bg-white border rounded-xl p-4 ${sevCfg.border}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${sevCfg.bg} ${sevCfg.text}`}>
                          {inc.severity || '不明'}
                        </span>
                        <span className="font-semibold text-gray-800">{inc.name || '（名称なし）'}</span>
                        {inc.knowledged && (
                          <span className="text-xs px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">
                            ✅ ナレッジ化済
                          </span>
                        )}
                        {!inc.knowledged && (
                          <span className="text-xs px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full">
                            ⏳ 未ナレッジ化
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 text-xs text-gray-500 mb-2">
                        {inc.rootCause && <span>根本原因：<strong>{inc.rootCause}</strong></span>}
                        {inc.impact !== null && <span>影響人数：<strong>{inc.impact}名</strong></span>}
                        {inc.date && <span>検知日：{formatDate(inc.date)}</span>}
                      </div>

                      {inc.prevention && (
                        <div className="text-xs text-gray-600 bg-amber-50 border border-amber-100 rounded-lg p-2">
                          🛡️ 再発防止策：{inc.prevention}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
