'use client';

// =====================================================
//  src/components/gyosei/FarmMatchingPanel.tsx
//  農業担い手マッチングAI UIパネル — Sprint #66
//
//  農地情報DB × 移住就農希望者DB のマッチングスコアを
//  一覧表示。担当職員が「この農地にはこの人が最適」を
//  一目で把握できるよう、スコア降順で表示する。
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useMunicipality } from '@/contexts/MunicipalityContext';
import type { FarmMatchingResponse, MatchPair } from '@/app/api/gyosei/farm-matching/route';

// ─── ランク設定 ──────────────────────────────────────

const RANK_CONFIG = {
  EXCELLENT: {
    label:   '最適マッチ',
    badge:   'bg-emerald-100 text-emerald-800 border-emerald-300',
    bar:     'bg-emerald-500',
    border:  'border-l-emerald-500',
    icon:    '🌟',
  },
  GOOD: {
    label:   '相性良好',
    badge:   'bg-blue-100 text-blue-800 border-blue-300',
    bar:     'bg-blue-500',
    border:  'border-l-blue-500',
    icon:    '✅',
  },
  FAIR: {
    label:   '検討可能',
    badge:   'bg-amber-100 text-amber-800 border-amber-300',
    bar:     'bg-amber-500',
    border:  'border-l-amber-500',
    icon:    '🔸',
  },
  LOW: {
    label:   '要調整',
    badge:   'bg-gray-100 text-gray-600 border-gray-300',
    bar:     'bg-gray-300',
    border:  'border-l-gray-300',
    icon:    '⬜',
  },
} as const;

// ─── スコアバー ───────────────────────────────────────

function ScoreBar({ score, rank }: { score: number; rank: keyof typeof RANK_CONFIG }) {
  const cfg = RANK_CONFIG[rank];
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${cfg.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="text-xs font-bold text-gray-700 w-8 text-right">{score}</span>
    </div>
  );
}

// ─── マッチングカード（モバイル） ─────────────────────

function MatchCard({
  pair,
  index,
}: {
  pair: MatchPair;
  index: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RANK_CONFIG[pair.rank];

  return (
    <div className={`bg-white rounded-xl border border-l-4 ${cfg.border} shadow-sm overflow-hidden`}>
      <div
        className="p-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        {/* ヘッダー行 */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <span className="text-lg font-bold text-gray-700">{pair.score}点</span>
        </div>

        {/* 農地 × 候補者 */}
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium shrink-0">農地</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pair.farm.name}</p>
              <p className="text-xs text-gray-500">
                {pair.farm.area}・{pair.farm.sizeHa}ha・{pair.farm.cropType}・{pair.farm.difficulty}難度
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium shrink-0">候補</span>
            <div>
              <p className="text-sm font-semibold text-gray-800">{pair.candidate.name}さん（{pair.candidate.age}歳）</p>
              <p className="text-xs text-gray-500">
                {pair.candidate.currentLocation}・経験:{pair.candidate.experience}・{pair.candidate.household}
              </p>
            </div>
          </div>
        </div>

        {/* スコアバー */}
        <div className="mt-3">
          <ScoreBar score={pair.score} rank={pair.rank} />
        </div>

        {/* 展開矢印 */}
        <div className="text-center mt-2">
          <span className="text-xs text-gray-400">{expanded ? '▲ 閉じる' : '▼ 根拠を見る'}</span>
        </div>
      </div>

      {/* 展開エリア：スコア根拠 */}
      {expanded && (
        <div className="px-4 pb-4 border-t border-gray-100 bg-gray-50">
          <p className="text-xs font-semibold text-gray-500 mt-3 mb-2">スコア根拠</p>
          <div className="flex flex-wrap gap-1.5">
            {pair.scoreFactors.map((f, i) => (
              <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                {f}
              </span>
            ))}
          </div>
          {pair.farm.notes && (
            <div className="mt-3">
              <p className="text-xs font-semibold text-gray-500 mb-1">農地メモ</p>
              <p className="text-xs text-gray-600">{pair.farm.notes}</p>
            </div>
          )}
          {pair.candidate.notes && (
            <div className="mt-2">
              <p className="text-xs font-semibold text-gray-500 mb-1">候補者メモ</p>
              <p className="text-xs text-gray-600">{pair.candidate.notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── マッチング行（デスクトップ） ────────────────────

function MatchRow({ pair, index }: { pair: MatchPair; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = RANK_CONFIG[pair.rank];

  return (
    <>
      <tr
        className="hover:bg-gray-50 cursor-pointer border-t border-gray-100"
        onClick={() => setExpanded(!expanded)}
      >
        <td className="px-4 py-3 text-sm font-bold text-gray-400">#{index + 1}</td>
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">{pair.farm.name}</p>
            <p className="text-xs text-gray-400">{pair.farm.area}・{pair.farm.cropType}・{pair.farm.sizeHa}ha</p>
          </div>
        </td>
        <td className="px-4 py-3">
          <div>
            <p className="text-sm font-semibold text-gray-800">{pair.candidate.name}（{pair.candidate.age}歳）</p>
            <p className="text-xs text-gray-400">{pair.candidate.currentLocation}・{pair.candidate.experience}</p>
          </div>
        </td>
        <td className="px-4 py-3 w-36">
          <ScoreBar score={pair.score} rank={pair.rank} />
        </td>
        <td className="px-4 py-3">
          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.badge}`}>
            {cfg.icon} {cfg.label}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-gray-400">{expanded ? '▲' : '▼'}</td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50 border-t border-gray-100">
          <td colSpan={6} className="px-6 py-3">
            <div className="flex gap-8">
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1.5">スコア根拠</p>
                <div className="flex flex-wrap gap-1.5">
                  {pair.scoreFactors.map((f, i) => (
                    <span key={i} className="text-xs bg-white border border-gray-200 text-gray-600 px-2 py-1 rounded-full">
                      {f}
                    </span>
                  ))}
                </div>
              </div>
              {pair.farm.equipment && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">農業設備</p>
                  <p className="text-xs text-gray-600">{pair.farm.equipment}</p>
                </div>
              )}
              {pair.candidate.moveTimeline && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-1.5">移住時期</p>
                  <p className="text-xs text-gray-600">{pair.candidate.moveTimeline}</p>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

// ─── メインコンポーネント ─────────────────────────────

export function FarmMatchingPanel() {
  const { municipalityId, municipality } = useMunicipality();
  const [data,    setData]    = useState<FarmMatchingResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [filter,  setFilter]  = useState<'ALL' | 'EXCELLENT' | 'GOOD' | 'FAIR'>('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/gyosei/farm-matching?municipalityId=${municipalityId}`);
      const json: FarmMatchingResponse = await res.json();
      if (json.status === 'error') throw new Error(json.message ?? 'APIエラー');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [municipalityId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filteredMatches = data?.topMatches.filter(p =>
    filter === 'ALL' ? true : p.rank === filter
  ) ?? [];

  // ─── ローディング ─────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-500">農地×就農希望者のマッチングを計算中…</p>
      </div>
    );
  }

  // ─── エラー ───────────────────────────────────────────
  if (error) {
    // 西粟倉村専用機能のため、他の自治体では friendly メッセージを表示
    if (error.includes('農地情報DBまたは移住就農希望者DBが設定されていません')) {
      return (
        <div className="max-w-2xl mx-auto mt-8 p-8 bg-amber-50 border border-amber-200 rounded-xl text-center">
          <p className="text-3xl mb-3">🌾</p>
          <p className="text-amber-800 font-semibold mb-2">
            この機能は西粟倉村（農業担い手マッチング）のデモ専用です
          </p>
          <p className="text-sm text-amber-600">
            ヘッダーの自治体セレクターで「西粟倉村」に切り替えると農地マッチングデータを確認できます。
          </p>
        </div>
      );
    }
    // その他のエラーは従来通り赤いエラーボックスを表示
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-50 border border-red-200 rounded-xl text-center">
        <p className="text-red-700 font-semibold">⚠️ データ取得エラー</p>
        <p className="text-sm text-red-500 mt-1">{error}</p>
        <button onClick={fetchData} className="mt-4 px-4 py-2 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700">
          再試行
        </button>
      </div>
    );
  }

  if (!data) return null;

  const { summary, aiRecommendations } = data;

  return (
    <div className="space-y-6 p-4 md:p-6">

      {/* ── ヘッダー ──────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">🌾 農業担い手マッチングAI</h1>
          <p className="text-sm text-gray-500 mt-1">
            {municipality.shortName}・後継者不在農地{summary.totalFarms}件 × 就農希望者{summary.totalCandidates}名
          </p>
        </div>
        <button
          onClick={fetchData}
          className="shrink-0 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
        >
          再取得
        </button>
      </div>

      {/* ── サマリーカード ────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: '最適マッチ', value: summary.excellent, icon: '🌟', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
          { label: '相性良好',   value: summary.good,      icon: '✅', color: 'bg-blue-50 border-blue-200 text-blue-700' },
          { label: '検討可能',   value: summary.fair,      icon: '🔸', color: 'bg-amber-50 border-amber-200 text-amber-700' },
          { label: '農地総数',   value: summary.totalFarms, icon: '🌱', color: 'bg-gray-50 border-gray-200 text-gray-700' },
        ].map(card => (
          <div key={card.label} className={`rounded-xl border p-4 ${card.color}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <span>{card.icon}</span>
              <span className="text-xs font-medium opacity-80">{card.label}</span>
            </div>
            <p className="text-2xl font-bold">{card.value}<span className="text-base font-normal ml-1">件</span></p>
          </div>
        ))}
      </div>

      {/* ── AI提言 ───────────────────────────────────── */}
      {aiRecommendations.length > 0 && (
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-5">
          <p className="text-sm font-semibold text-green-800 mb-3">🤖 AIマッチング提言</p>
          <ul className="space-y-2">
            {aiRecommendations.map((rec, i) => (
              <li key={i} className="flex gap-2 text-sm text-green-700">
                <span className="shrink-0 font-bold">{i + 1}.</span>
                <span>{rec}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ── フィルター ─────────────────────────────────── */}
      <div className="flex gap-2 flex-wrap">
        {(['ALL', 'EXCELLENT', 'GOOD', 'FAIR'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={[
              'px-3 py-1 text-xs rounded-full border font-medium transition-colors',
              filter === f
                ? 'bg-green-600 border-green-600 text-white'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300',
            ].join(' ')}
          >
            {f === 'ALL' ? 'すべて' : RANK_CONFIG[f].label}
            {f !== 'ALL' && (
              <span className="ml-1 opacity-70">
                ({data.topMatches.filter(p => p.rank === f).length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── マッチング一覧（モバイル：カード） ─────────── */}
      <div className="md:hidden space-y-3">
        {filteredMatches.length === 0 ? (
          <p className="text-center text-sm text-gray-400 py-8">該当するマッチングがありません</p>
        ) : (
          filteredMatches.map((pair, i) => (
            <MatchCard key={`${pair.farm.id}-${pair.candidate.id}`} pair={pair} index={i} />
          ))
        )}
      </div>

      {/* ── マッチング一覧（デスクトップ：テーブル） ──── */}
      <div className="hidden md:block bg-white border border-gray-200 rounded-xl overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">#</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">農地</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">就農希望者</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">スコア</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500">判定</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500"></th>
            </tr>
          </thead>
          <tbody>
            {filteredMatches.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-sm text-gray-400">
                  該当するマッチングがありません
                </td>
              </tr>
            ) : (
              filteredMatches.map((pair, i) => (
                <MatchRow key={`${pair.farm.id}-${pair.candidate.id}`} pair={pair} index={i} />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* ── データソース注記 ─────────────────────────── */}
      <p className="text-xs text-gray-400 text-center">
        農地情報DB × 移住就農希望者DB のデータをもとにAIがスコアリング。
        担当職員が最終判断を行ってください。
      </p>
    </div>
  );
}
