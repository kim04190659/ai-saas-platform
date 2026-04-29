'use client';

// =====================================================
//  src/components/gyosei/QuarterlyReportPanel.tsx
//  四半期AI分析レポート パネル — Sprint #63
//
//  ISO 23592「エクセレントサービス」4側面 × 9要素で
//  自治体の現在地をスコアリングして表示する。
//
//  ■ 表示セクション
//    ① ヘッダー    : 総合スコア・ランク・クォーター
//    ② AI総括      : Claude Haiku によるサマリーテキスト
//    ③ 4側面カード : 側面スコアバー + 要素一覧
//    ④ AI提言      : 優先度付き改善アクション
//    ⑤ データ注記  : 欠損データがある場合の注記
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { useMunicipality } from '@/contexts/MunicipalityContext';
import type {
  QuarterlyReportResponse,
  IsoAspect,
  AiRecommendation,
} from '@/app/api/gyosei/quarterly-report/route';

// ─── ランクカラー定義 ─────────────────────────────────

function rankColor(rank: string): string {
  switch (rank) {
    case 'S': return 'bg-violet-600 text-white'
    case 'A': return 'bg-emerald-600 text-white'
    case 'B': return 'bg-sky-500 text-white'
    case 'C': return 'bg-amber-500 text-white'
    case 'D': return 'bg-red-500 text-white'
    default:  return 'bg-slate-400 text-white'
  }
}

function aspectColor(num: string): string {
  switch (num) {
    case '①': return 'border-violet-300 bg-violet-50'
    case '②': return 'border-emerald-300 bg-emerald-50'
    case '③': return 'border-sky-300 bg-sky-50'
    case '④': return 'border-amber-300 bg-amber-50'
    default:  return 'border-slate-200 bg-slate-50'
  }
}

function aspectBarColor(num: string): string {
  switch (num) {
    case '①': return 'bg-violet-500'
    case '②': return 'bg-emerald-500'
    case '③': return 'bg-sky-500'
    case '④': return 'bg-amber-500'
    default:  return 'bg-slate-400'
  }
}

function priorityColor(priority: string): string {
  switch (priority) {
    case '高': return 'bg-red-100 text-red-700 border-red-200'
    case '中': return 'bg-amber-100 text-amber-700 border-amber-200'
    case '低': return 'bg-slate-100 text-slate-600 border-slate-200'
    default:   return 'bg-slate-100 text-slate-500 border-slate-200'
  }
}

// ─── 側面カード ──────────────────────────────────────

function AspectCard({ aspect }: { aspect: IsoAspect }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`rounded-xl border-2 p-5 ${aspectColor(aspect.num)}`}>
      {/* ヘッダー行 */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl font-bold text-slate-700">{aspect.num}</span>
          <p className="font-bold text-sm text-slate-800">{aspect.title}</p>
        </div>
        <span className={`text-sm font-bold px-3 py-1 rounded-full ${rankColor(aspect.rank)}`}>
          {aspect.rank}ランク
        </span>
      </div>

      {/* スコアバー */}
      <div className="mb-3">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>スコア</span>
          <span className="font-bold text-slate-800">{aspect.score}点</span>
        </div>
        <div className="w-full bg-white/70 rounded-full h-3">
          <div
            className={`h-3 rounded-full transition-all duration-700 ${aspectBarColor(aspect.num)}`}
            style={{ width: `${aspect.score}%` }}
          />
        </div>
      </div>

      {/* 要素一覧（展開トグル） */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="text-xs text-slate-500 hover:text-slate-700 underline"
      >
        {expanded ? '▲ 要素を隠す' : `▼ ${aspect.elements.length}要素の詳細を見る`}
      </button>

      {expanded && (
        <div className="mt-3 space-y-2">
          {aspect.elements.map(el => (
            <div key={el.code} className="bg-white/80 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400">{el.code}</span>
                  <span className="text-xs font-semibold text-slate-700">{el.name}</span>
                </div>
                <span className="text-sm font-bold text-slate-800">{el.score}点</span>
              </div>
              {/* ミニバー */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 mb-1">
                <div
                  className={`h-1.5 rounded-full ${aspectBarColor(aspect.num)}`}
                  style={{ width: `${el.score}%` }}
                />
              </div>
              <p className="text-xs text-slate-400">{el.note}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── AI提言カード ─────────────────────────────────────

function RecommendationCard({ rec, index }: { rec: AiRecommendation; index: number }) {
  return (
    <div className={`rounded-xl border p-4 ${priorityColor(rec.priority)}`}>
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-xs font-bold text-slate-600">
          {index + 1}
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${priorityColor(rec.priority)}`}>
              優先度: {rec.priority}
            </span>
            <span className="text-xs text-slate-500">{rec.aspect}</span>
          </div>
          <p className="font-semibold text-sm text-slate-800 mb-1">{rec.title}</p>
          <p className="text-xs text-slate-600 leading-relaxed">{rec.detail}</p>
          <p className="text-xs text-slate-400 mt-1">⏱ {rec.timing}</p>
        </div>
      </div>
    </div>
  );
}

// ─── メインパネル ─────────────────────────────────────

export function QuarterlyReportPanel() {
  const { municipalityId, municipality } = useMunicipality();
  const municipalName = municipality?.shortName ?? municipalityId;

  const [data,    setData]    = useState<QuarterlyReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // レポート取得（手動実行）
  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const res  = await fetch(`/api/gyosei/quarterly-report?municipalityId=${municipalityId}`);
      const json = await res.json() as QuarterlyReportResponse;
      if (json.status !== 'success') throw new Error('APIエラー');
      setData(json);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'レポート取得に失敗しました');
    } finally {
      setLoading(false);
    }
  }, [municipalityId]);

  // 自治体が切り替わったらリセット
  useEffect(() => {
    setData(null);
    setError(null);
  }, [municipalityId]);

  // ── 初期画面（未生成）────────────────────────────────
  if (!data && !loading) {
    return (
      <div className="space-y-6">
        {/* タイトル */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            📊 四半期AI分析レポート
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            ISO 23592「エクセレントサービス」4側面 × 9要素で {municipalName} の現在地を診断します
          </p>
        </div>

        {/* 説明カード */}
        <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-8 text-white">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80 mb-4">
            <span className="w-2 h-2 bg-emerald-400 rounded-full" />
            ISO 23592 エクセレントサービス規格準拠
          </div>
          <h2 className="text-xl font-bold mb-3">「今どこにいるか」を可視化する</h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-6">
            蓄積されたPDCA施策・住民WBスコア・財政指標・インフラ健全度のデータをAIが横断分析し、
            ISO 23592の4側面・9要素でスコアリングします。
            首長・議会への説明資料として活用できます。
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { num: '①', title: '戦略・\nリーダーシップ', src: 'PDCA施策DB' },
              { num: '②', title: '組織文化・\n人材', src: 'インフラ+PDCA' },
              { num: '③', title: '住民理解・\n体験創出', src: '住民WBコーチングDB' },
              { num: '④', title: 'プロセス・\n監視', src: '財政+インフラDB' },
            ].map(a => (
              <div key={a.num} className="bg-white/10 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-white mb-1">{a.num}</p>
                <p className="text-xs text-white/80 whitespace-pre-line leading-tight mb-1">{a.title}</p>
                <p className="text-xs text-white/50">{a.src}</p>
              </div>
            ))}
          </div>
          <button
            onClick={fetchReport}
            className="bg-emerald-500 hover:bg-emerald-400 text-white font-bold px-8 py-3 rounded-xl text-sm transition-colors"
          >
            📊 {municipalName} のレポートを生成する
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>
    );
  }

  // ── ローディング ──────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 border-4 border-violet-100 rounded-full" />
          <div className="absolute inset-0 border-4 border-violet-500 rounded-full border-t-transparent animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-2xl">📊</div>
        </div>
        <p className="text-slate-600 font-semibold">ISO 23592スコアを算出中…</p>
        <p className="text-xs text-slate-400">4領域のデータを横断分析しています</p>
      </div>
    );
  }

  // ── レポート表示 ─────────────────────────────────────
  if (!data) return null;

  return (
    <div className="space-y-8">

      {/* ══ ① ヘッダー：総合スコア ══ */}
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-3 py-1 text-xs text-white/80 mb-3">
              <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              ISO 23592 エクセレントサービス規格
            </div>
            <h1 className="text-2xl font-bold mb-1">
              {data.municipal} — {data.quarter} 四半期レポート
            </h1>
            <p className="text-slate-400 text-xs">
              生成日時: {new Date(data.generatedAt).toLocaleString('ja-JP')}
            </p>
          </div>
          {/* 総合スコア */}
          <div className="text-center">
            <div className={`text-5xl font-black mb-1 px-4 py-2 rounded-2xl ${rankColor(data.overallRank)}`}>
              {data.overallRank}
            </div>
            <p className="text-4xl font-bold text-white mt-2">{data.overallScore}<span className="text-lg text-slate-400">点</span></p>
            <p className="text-xs text-slate-400">総合スコア（4側面平均）</p>
          </div>
        </div>

        {/* 4側面のミニスコアバー */}
        <div className="grid grid-cols-4 gap-2 mt-5">
          {data.aspects.map(a => (
            <div key={a.num} className="text-center">
              <p className="text-xs text-white/60 mb-1">{a.num} {a.title.slice(0, 4)}…</p>
              <div className="w-full bg-white/10 rounded-full h-2 mb-1">
                <div
                  className="h-2 rounded-full bg-emerald-400"
                  style={{ width: `${a.score}%` }}
                />
              </div>
              <p className="text-sm font-bold text-white">{a.score}点</p>
            </div>
          ))}
        </div>
      </div>

      {/* ══ ② AI総括 ══ */}
      {data.aiSummary && (
        <div className="bg-violet-50 border-2 border-violet-200 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-lg">🤖</span>
            <h2 className="font-bold text-violet-800">AI分析サマリー</h2>
            <span className="text-xs bg-violet-100 text-violet-600 px-2 py-0.5 rounded-full">Claude Haiku</span>
          </div>
          <p className="text-sm text-slate-700 leading-relaxed">{data.aiSummary}</p>
        </div>
      )}

      {/* ══ ③ 4側面カード ══ */}
      <div>
        <h2 className="text-lg font-bold text-slate-800 mb-4">
          ISO 23592 — 4側面の詳細スコア
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data.aspects.map(aspect => (
            <AspectCard key={aspect.num} aspect={aspect} />
          ))}
        </div>
      </div>

      {/* ══ ④ AI提言 ══ */}
      {data.aiRecommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-slate-800 mb-4">
            🎯 AI改善提言（優先度順）
          </h2>
          <div className="space-y-3">
            {data.aiRecommendations.map((rec, i) => (
              <RecommendationCard key={i} rec={rec} index={i} />
            ))}
          </div>
        </div>
      )}

      {/* ══ ⑤ データ注記 ══ */}
      {data.dataNote && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs text-slate-500">
          ℹ️ データ注記: {data.dataNote}
        </div>
      )}

      {/* 再生成ボタン */}
      <div className="text-center pt-2">
        <button
          onClick={fetchReport}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          🔄 レポートを再生成する
        </button>
      </div>
    </div>
  );
}
