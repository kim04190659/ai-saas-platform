'use client';

/**
 * 霧島市 チームWellBeingダッシュボード
 * /kirishima/wellbeing
 *
 * Notion DB05 WellBeing のデータをリアルタイムで取得し、
 * チームメンバーの健康・満足度・業務負荷を可視化する
 */

import { useState, useEffect } from 'react';

// ─── 型定義 ──────────────────────────────────────────────

type Member = {
  id: string;
  name: string;
  wbScore: number | null;
  healthScore: number | null;
  workSatisfaction: number | null;
  workload: number | null;
  comment: string;
  month: string;
};

// ─── スコアのラベル・色マッピング ───────────────────────

function getScoreColor(score: number | null, lowerIsBetter = false): string {
  if (score === null) return 'text-gray-400';
  const threshold = lowerIsBetter
    ? (score <= 3 ? 'good' : score <= 6 ? 'warn' : 'danger')
    : (score >= 7 ? 'good' : score >= 5 ? 'warn' : 'danger');
  return threshold === 'good' ? 'text-emerald-600' : threshold === 'warn' ? 'text-amber-500' : 'text-red-500';
}

function getBarColor(score: number | null, lowerIsBetter = false): string {
  if (score === null) return '#94a3b8';
  const threshold = lowerIsBetter
    ? (score <= 3 ? 'good' : score <= 6 ? 'warn' : 'danger')
    : (score >= 7 ? 'good' : score >= 5 ? 'warn' : 'danger');
  return threshold === 'good' ? '#22c55e' : threshold === 'warn' ? '#f59e0b' : '#ef4444';
}

function scoreLabel(score: number | null, lowerIsBetter = false): string {
  if (score === null) return '-';
  const threshold = lowerIsBetter
    ? (score <= 3 ? '良好' : score <= 6 ? '注意' : '要対応')
    : (score >= 7 ? '良好' : score >= 5 ? '注意' : '要対応');
  return threshold;
}

// ─── ラジアルゲージ（SVG） ───────────────────────────────

function RadialGauge({
  value,
  max = 10,
  size = 80,
  color,
  label,
}: {
  value: number | null;
  max?: number;
  size?: number;
  color: string;
  label: string;
}) {
  const r = (size - 8) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const circumference = 2 * Math.PI * r;
  const pct = value !== null ? Math.min(1, value / max) : 0;
  const dash = circumference * pct;
  const gap = circumference - dash;

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="-rotate-90">
        {/* 背景 */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e5e7eb" strokeWidth={6} />
        {/* 値 */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray={`${dash} ${gap}`}
          style={{ transition: 'stroke-dasharray 0.5s ease' }}
        />
        {/* 中央のテキスト（回転を打ち消す） */}
        <text
          x={cx} y={cy + 5}
          textAnchor="middle"
          fontSize={14}
          fontWeight="700"
          fill={color}
          style={{ transform: `rotate(90deg)`, transformOrigin: `${cx}px ${cy}px` }}
        >
          {value !== null ? value.toFixed(1) : '-'}
        </text>
      </svg>
      <span className="text-xs text-gray-500 text-center leading-tight">{label}</span>
    </div>
  );
}

// ─── メンバーカード コンポーネント ────────────────────────

function MemberCard({ member }: { member: Member }) {
  const items = [
    { label: 'WBスコア',   value: member.wbScore,          max: 10, lowerIsBetter: false, color: '#14b8a6' },
    { label: '体調',       value: member.healthScore,       max: 10, lowerIsBetter: false, color: '#22c55e' },
    { label: '手応え',     value: member.workSatisfaction,  max: 10, lowerIsBetter: false, color: '#8b5cf6' },
    { label: '負荷',       value: member.workload,          max: 10, lowerIsBetter: true,  color: '#f59e0b' },
  ];

  // WBスコアでアラートラインを決定
  const wbAlert = member.wbScore !== null && member.wbScore < 5;

  return (
    <div className={`bg-white border rounded-xl p-4 ${wbAlert ? 'border-red-300 shadow-md shadow-red-50' : 'border-gray-200'}`}>
      {/* ヘッダー */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">👤</span>
            <span className="font-semibold text-gray-800">{member.name || '記録者'}</span>
            {wbAlert && (
              <span className="text-xs px-2 py-0.5 bg-red-100 text-red-600 rounded-full font-medium">
                ⚠️ 要サポート
              </span>
            )}
          </div>
          <div className="text-xs text-gray-400 mt-0.5 ml-8">
            {member.month ? member.month.slice(0, 7) : '-'}
          </div>
        </div>
        <div className="text-right">
          <div className={`text-2xl font-bold ${getScoreColor(member.wbScore)}`}>
            {member.wbScore !== null ? member.wbScore.toFixed(1) : '-'}
          </div>
          <div className="text-xs text-gray-400">WB総合</div>
        </div>
      </div>

      {/* 4指標ゲージ */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {items.map((item) => (
          <RadialGauge
            key={item.label}
            value={item.value}
            max={item.max}
            size={64}
            color={getBarColor(item.value, item.lowerIsBetter)}
            label={item.label}
          />
        ))}
      </div>

      {/* スコアバー（補足） */}
      <div className="space-y-1.5">
        {items.map((item) => {
          const pct = item.value !== null ? Math.min(100, (item.value / item.max) * 100) : 0;
          const barColor = getBarColor(item.value, item.lowerIsBetter);
          return (
            <div key={item.label} className="flex items-center gap-2">
              <span className="text-xs text-gray-500 w-12 shrink-0">{item.label}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
              <span className="text-xs font-medium w-16 text-right" style={{ color: barColor }}>
                {item.value !== null ? item.value.toFixed(1) : '-'}
                　{scoreLabel(item.value, item.lowerIsBetter)}
              </span>
            </div>
          );
        })}
      </div>

      {/* コメント */}
      {member.comment && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs text-gray-500 leading-relaxed">
            💬 {member.comment}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── チーム平均バー ───────────────────────────────────────

function TeamAvgBar({
  label,
  value,
  max = 10,
  lowerIsBetter = false,
}: {
  label: string;
  value: number | null;
  max?: number;
  lowerIsBetter?: boolean;
}) {
  const pct = value !== null ? Math.min(100, (value / max) * 100) : 0;
  const color = getBarColor(value, lowerIsBetter);
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-600 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
        <div className="h-3 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-sm font-bold w-12 text-right" style={{ color }}>
        {value !== null ? value.toFixed(1) : '-'}
      </span>
    </div>
  );
}

// ─── メインページ コンポーネント ─────────────────────────

export default function KirishimaWellbeingPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/notion/kirishima/wellbeing');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json.error) throw new Error(json.error);
      setMembers(json.members ?? []);
      setLastUpdated(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'データの取得に失敗しました');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // ─── チーム平均を計算 ─────────────────────────────────

  function teamAvg(key: keyof Member): number | null {
    const vals = members.map((m) => m[key]).filter((v): v is number => typeof v === 'number');
    if (vals.length === 0) return null;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  const avgWB   = teamAvg('wbScore');
  const avgH    = teamAvg('healthScore');
  const avgWS   = teamAvg('workSatisfaction');
  const avgWL   = teamAvg('workload');

  // 要サポートメンバー数
  const needSupport = members.filter((m) => m.wbScore !== null && m.wbScore < 5).length;

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
          <h1 className="text-2xl font-bold text-gray-800">💚 チームWellBeing</h1>
          <p className="text-sm text-gray-500 mt-1">
            霧島市 職員コンディション管理 — Notion DB05 リアルタイム連携
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

      {/* サマリー */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'チームWB平均', value: avgWB !== null ? avgWB.toFixed(1) : '-', icon: '💚', sub: '/10', alert: avgWB !== null && avgWB < 6 },
          { label: '体調スコア平均', value: avgH !== null ? avgH.toFixed(1) : '-', icon: '🩺', sub: '/10', alert: avgH !== null && avgH < 6 },
          { label: '手応え平均', value: avgWS !== null ? avgWS.toFixed(1) : '-', icon: '💪', sub: '/10', alert: avgWS !== null && avgWS < 5 },
          { label: '要サポート', value: `${needSupport}名`, icon: '⚠️', sub: `/${members.length}名`, alert: needSupport > 0 },
        ].map((card) => (
          <div
            key={card.label}
            className={`rounded-xl border p-4 ${card.alert ? 'bg-red-50 border-red-200' : 'bg-teal-50 border-teal-200'}`}
          >
            <div className="text-2xl mb-1">{card.icon}</div>
            <div className={`text-2xl font-bold ${card.alert ? 'text-red-600' : 'text-teal-700'}`}>
              {card.value}
              <span className="text-sm font-normal text-gray-400 ml-1">{card.sub}</span>
            </div>
            <div className="text-xs mt-1 text-gray-500">{card.label}</div>
          </div>
        ))}
      </div>

      {/* チーム平均サマリーバー */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">📊 チーム平均スコア（/10）</h2>
        <div className="space-y-3">
          <TeamAvgBar label="WBスコア総合"  value={avgWB}  lowerIsBetter={false} />
          <TeamAvgBar label="体調スコア"     value={avgH}   lowerIsBetter={false} />
          <TeamAvgBar label="仕事の手応え"   value={avgWS}  lowerIsBetter={false} />
          <TeamAvgBar label="業務負荷（低が良）" value={avgWL}  lowerIsBetter={true} />
        </div>
        <p className="text-xs text-gray-400 mt-4">
          ※ 業務負荷スコアは低いほど良好（スコア3以下 = 良好 / 7以上 = 要対応）
        </p>
      </div>

      {/* メンバーカード一覧 */}
      <div>
        <h2 className="text-sm font-semibold text-gray-700 mb-3">👥 メンバー別コンディション</h2>
        {members.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {members.map((member) => (
              <MemberCard key={member.id} member={member} />
            ))}
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
            <p className="text-gray-400 text-sm">WellBeingデータがありません</p>
          </div>
        )}
      </div>

      {/* SDL視点のインサイト */}
      <div className="bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-100 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-teal-800 mb-2">🔵 SDL視点インサイト</h2>
        <p className="text-xs text-teal-700 leading-relaxed">
          {avgWB !== null && avgWB >= 7 && (
            <>チームWBスコアは<strong>{avgWB.toFixed(1)}</strong>と良好です。職員のWell-Beingが高い状態は、SDL（サービス支配論理）における<strong>資源（Resource）軸</strong>の強化を意味し、市民への価値共創品質向上につながります。</>
          )}
          {avgWB !== null && avgWB >= 5 && avgWB < 7 && (
            <>チームWBスコアは<strong>{avgWB.toFixed(1)}</strong>で改善の余地があります。業務負荷の分散や、個別サポート施策を検討してください。職員のWell-Beingはサービス品質に直結します。</>
          )}
          {(avgWB === null || avgWB < 5) && (
            <>チームWBスコアが<strong>5未満</strong>の状態です。優先的な職員サポートが必要です。SDL「統合（Integration）」の視点から、組織資源の再配分を即座に検討してください。</>
          )}
        </p>
      </div>
    </div>
  );
}
