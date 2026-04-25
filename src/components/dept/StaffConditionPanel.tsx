'use client';

/**
 * ════════════════════════════════════════════════════════
 *  src/components/dept/StaffConditionPanel.tsx
 *  職員コンディション 共通パネル
 * ════════════════════════════════════════════════════════
 *
 *  ■ 役割
 *    行政・教育・警察消防・医療介護の全部門で共有する
 *    コンディション記録ページのコンポーネント。
 *    DeptConfig を props で受け取り、部門ごとに
 *    ラベル・色・Notion DB を切り替える。
 *
 *  ■ 各部門ページはこれを呼ぶだけ
 *    例: education/staff/page.tsx
 *      import { StaffConditionPanel } from '@/components/dept/StaffConditionPanel'
 *      import { getDept } from '@/config/departments'
 *      export default function Page() {
 *        return <StaffConditionPanel dept={getDept('education')} />
 *      }
 *
 *  ■ 疎結合の実現
 *    API 呼び出し時に deptId を送信する。
 *    サーバー側は deptId に対応した Notion DB に書き込む。
 *    部門間のデータは完全に分離される。
 */

import { useState, useEffect } from 'react';
import Link from 'next/link';
import type { DeptConfig } from '@/config/departments';
// Sprint #42: 共通コンポーネントから SummaryCard をインポート
import { SummaryCard } from '@/components/ui/SummaryCard';

// ─── 型定義 ──────────────────────────────────────────────

/** コンディション記録 1 件（API レスポンス） */
interface StaffRecord {
  id:                 string;
  staffName:          string;
  municipalityName:   string;
  department:         string;
  healthScore:        number;
  workloadScore:      number;
  teamWellBeingScore: number;
  wellbeingScore:     number;
  comment:            string;
  recordDate:         string;
}

/** サマリー統計 */
interface Summary {
  totalCount:        number;
  avgWellbeingScore: number;
  highWorkloadCount: number;
  departmentCount:   number;
}

/** フォームの入力状態 */
interface FormState {
  staffName:          string;
  municipalityName:   string;
  department:         string;
  healthScore:        number;
  workloadScore:      number;
  teamWellBeingScore: number;
  comment:            string;
  recordDate:         string;
}

// ─── 定数 ────────────────────────────────────────────────

/** 体調スコアのラベル（添え字 1〜5 を使う） */
const HEALTH_LABELS   = ['', '不調', '疲れ気味', '普通', '良好', '絶好調'];
/** 業務負荷スコアのラベル */
const WORKLOAD_LABELS = ['', '余裕', 'やや余裕', '標準', 'やや多い', '限界'];
/** チーム WellBeing スコアのラベル */
const TEAM_LABELS     = ['', '低い', 'やや低い', '普通', '良い', '非常に良い'];

/** フォームの初期値 */
const makeInitialForm = (): FormState => ({
  staffName:          '',
  municipalityName:   '',
  department:         '',
  healthScore:        3,
  workloadScore:      3,
  teamWellBeingScore: 3,
  comment:            '',
  recordDate:         new Date().toISOString().split('T')[0],
});

// ─── 子コンポーネント ─────────────────────────────────────
// SummaryCard は src/components/ui/SummaryCard から共通インポート済み（Sprint #42）

/**
 * スコア入力ボタン（1〜5）
 * 選択中のボタンは dept のアクセントカラーで強調表示。
 */
function ScoreButtons({
  value, labels, onChange, activeBg,
}: {
  value: number; labels: string[];
  onChange: (v: number) => void; activeBg: string;
}) {
  return (
    <div className="flex gap-2 flex-wrap">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          className={`flex-1 min-w-[3rem] py-2 rounded-lg text-sm font-medium transition-all border ${
            value === n
              ? `${activeBg} text-white border-transparent shadow-md`
              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
          }`}
        >
          <span className="block text-base font-bold">{n}</span>
          <span className="block text-xs opacity-80">{labels[n]}</span>
        </button>
      ))}
    </div>
  );
}

/** Well-Being スコアバッジ */
function WBScoreBadge({ score }: { score: number }) {
  const cls =
    score >= 70 ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
    : score >= 40 ? 'bg-amber-100 text-amber-700 border-amber-200'
    :               'bg-red-100 text-red-700 border-red-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${cls}`}>
      WB {score}
    </span>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

interface Props {
  /** departments.ts から取得した部門設定 */
  dept: DeptConfig;
}

export function StaffConditionPanel({ dept }: Props) {
  const { color, staffLabel, unitLabel, deptOptions, aiAdvisorHref } = dept;

  // ── State ──
  const [records,  setRecords]  = useState<StaffRecord[]>([]);
  const [summary,  setSummary]  = useState<Summary | null>(null);
  const [form,     setForm]     = useState<FormState>(makeInitialForm());
  const [loading,  setLoading]  = useState(false);
  const [fetching, setFetching] = useState(true);
  const [message,  setMessage]  = useState<{ text: string; ok: boolean } | null>(null);

  // ── データ取得
  // deptId をクエリパラメータで渡し、部門ごとの DB からデータを取得する
  const fetchData = async () => {
    setFetching(true);
    try {
      const res  = await fetch(`/api/staff-condition?deptId=${dept.id}`);
      const data = await res.json();
      if (!data.error) {
        setRecords(data.records ?? []);
        setSummary(data.summary  ?? null);
      }
    } catch {
      // 取得失敗時はサイレントに処理
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => { fetchData(); }, [dept.id]);

  // ── フォーム送信
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffName.trim()) {
      setMessage({ text: `${staffLabel}名を入力してください`, ok: false });
      return;
    }
    setLoading(true);
    setMessage(null);

    try {
      const res  = await fetch('/api/staff-condition', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        // deptId を含めることで API が正しい Notion DB に書き込む（疎結合）
        body: JSON.stringify({ ...form, deptId: dept.id }),
      });
      const data = await res.json();

      if (data.error) {
        setMessage({ text: data.error, ok: false });
      } else {
        setMessage({ text: data.message, ok: true });
        setForm(makeInitialForm());
        await fetchData();
      }
    } catch {
      setMessage({ text: 'ネットワークエラーが発生しました', ok: false });
    } finally {
      setLoading(false);
    }
  };

  // ── フィールド更新ヘルパー
  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // ── 業務負荷の色（高いほど赤）
  const workloadColor = (score: number) =>
    score >= 4 ? 'bg-red-500'
    : score >= 3 ? 'bg-amber-500'
    : 'bg-emerald-500';

  // ── WellBeing プレビュー計算（クライアント側）
  const previewScore = Math.min(100, Math.max(0,
    (form.healthScore - 1) * 10 +
    (5 - form.workloadScore) * 10 +
    (form.teamWellBeingScore - 1) * 5,
  ));

  // ─────────────────────────────────────────────────
  //  レンダリング
  // ─────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto space-y-5">

        {/* ── ページヘッダー ── */}
        <div className={`rounded-2xl border ${color.bg} ${color.border} shadow-sm p-5`}>
          <h1 className={`text-xl font-bold flex items-center gap-2 ${color.text}`}>
            {dept.emoji} {dept.name}｜{staffLabel}コンディション入力
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            体調・業務負荷・チームWell-Beingを日次記録して、
            {dept.name}全体のWellBeing向上に役立てます
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border ${color.badge} ${color.border}`}>
              📊 {dept.fullName} 専用DB に蓄積（疎結合）
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700 border border-indigo-200">
              🌐 公務員連携 統合ダッシュボードと連動
            </span>
          </div>
        </div>

        {/* ── サマリーカード（4枚）── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SummaryCard
            icon={dept.emoji}
            label={`${staffLabel}記録件数`}
            value={fetching ? '…' : summary?.totalCount ?? 0}
            sub="件"
            colorClass="bg-white border-slate-200 text-slate-700"
          />
          <SummaryCard
            icon="💚"
            label="平均WBスコア"
            value={fetching ? '…' : summary?.avgWellbeingScore ?? 0}
            sub="/ 100pt"
            colorClass={`${color.bg} ${color.border} ${color.text}`}
          />
          <SummaryCard
            icon="⚠️"
            label={`高負荷${staffLabel}`}
            value={fetching ? '…' : summary?.highWorkloadCount ?? 0}
            sub="業務負荷4以上"
            colorClass="bg-amber-50 border-amber-200 text-amber-700"
          />
          <SummaryCard
            icon="🏢"
            label={`記録${unitLabel}数`}
            value={fetching ? '…' : summary?.departmentCount ?? 0}
            sub={unitLabel}
            colorClass="bg-blue-50 border-blue-200 text-blue-700"
          />
        </div>

        {/* ── 入力フォーム ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-4">
            📝 コンディション記録
          </h2>

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* 行 1: 氏名 / 自治体名 / 所属 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* 氏名 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {staffLabel}名 <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={form.staffName}
                  onChange={(e) => setField('staffName', e.target.value)}
                  placeholder={`例: 田中 太郎`}
                  required
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
                />
              </div>

              {/* 自治体名 */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  自治体名
                </label>
                <input
                  type="text"
                  value={form.municipalityName}
                  onChange={(e) => setField('municipalityName', e.target.value)}
                  placeholder="例: 屋久島町"
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
                />
              </div>

              {/* 所属（クイック選択付き） */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  所属{unitLabel}
                </label>
                <input
                  type="text"
                  value={form.department}
                  onChange={(e) => setField('department', e.target.value)}
                  placeholder={`例: ${deptOptions[0]}`}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring} mb-1`}
                />
                {/* クイック選択ボタン */}
                <div className="flex flex-wrap gap-1">
                  {deptOptions.map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setField('department', opt)}
                      className="px-2 py-0.5 rounded-md text-xs border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 体調スコア */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                体調スコア
                <span className="ml-2 text-slate-400 font-normal">（40ptまで）</span>
              </label>
              <ScoreButtons
                value={form.healthScore}
                labels={HEALTH_LABELS}
                onChange={(v) => setField('healthScore', v)}
                activeBg="bg-emerald-500"
              />
              <p className="text-xs text-slate-400 mt-1">1（不調）〜 5（絶好調）</p>
            </div>

            {/* 業務負荷スコア */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                業務負荷スコア
                <span className="ml-2 text-slate-400 font-normal">（低いほど高得点、40ptまで）</span>
              </label>
              <ScoreButtons
                value={form.workloadScore}
                labels={WORKLOAD_LABELS}
                onChange={(v) => setField('workloadScore', v)}
                activeBg="bg-amber-500"
              />
              <p className="text-xs text-slate-400 mt-1">
                1（余裕）〜 5（限界）。業務負荷が少ないほどWell-Beingが上がります。
              </p>
            </div>

            {/* チーム Well-Being */}
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">
                チームWell-Beingスコア
                <span className="ml-2 text-slate-400 font-normal">（20ptまで）</span>
              </label>
              <ScoreButtons
                value={form.teamWellBeingScore}
                labels={TEAM_LABELS}
                onChange={(v) => setField('teamWellBeingScore', v)}
                activeBg={color.scoreBtn}
              />
              <p className="text-xs text-slate-400 mt-1">
                1（低い）〜 5（非常に良い）。チームの雰囲気・連携・安心感を評価します。
              </p>
            </div>

            {/* コメント / 記録日 */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  コメント（任意）
                </label>
                <textarea
                  value={form.comment}
                  onChange={(e) => setField('comment', e.target.value)}
                  placeholder="気になること、申し送り事項など…"
                  rows={2}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring} resize-none`}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  記録日
                </label>
                <input
                  type="date"
                  value={form.recordDate}
                  onChange={(e) => setField('recordDate', e.target.value)}
                  className={`w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 ${color.ring}`}
                />
                {/* リアルタイム WellBeing プレビュー */}
                <div className={`mt-2 p-2 rounded-lg ${color.bg} border ${color.border} text-center`}>
                  <p className={`text-xs font-medium ${color.text}`}>予測 WellBeingスコア</p>
                  <p className={`text-xl font-bold ${color.text}`}>
                    {previewScore}
                    <span className="text-xs font-normal"> / 100pt</span>
                  </p>
                </div>
              </div>
            </div>

            {/* メッセージ */}
            {message && (
              <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
                message.ok
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-red-50 text-red-700 border border-red-200'
              }`}>
                {message.ok ? '✅ ' : '❌ '}{message.text}
              </div>
            )}

            {/* 送信ボタン */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 rounded-xl font-medium text-sm transition-colors ${
                loading
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : color.primary
              }`}
            >
              {loading ? '記録中…' : '💾 Notionに記録する'}
            </button>
          </form>
        </div>

        {/* ── 記録一覧テーブル ── */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
          <h2 className="text-base font-semibold text-slate-700 mb-3">
            📋 コンディション記録一覧
          </h2>

          {fetching ? (
            <p className="text-sm text-slate-400 text-center py-8">読み込み中…</p>
          ) : records.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-8">
              まだ記録がありません。上のフォームから入力してください。
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">{staffLabel}名</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">所属{unitLabel}</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">体調</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">業務負荷</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">チームWB</th>
                    <th className="text-center py-2 px-3 text-xs font-medium text-slate-500">WBスコア</th>
                    <th className="text-left py-2 px-3 text-xs font-medium text-slate-500">記録日</th>
                  </tr>
                </thead>
                <tbody>
                  {records.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={`border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                        idx % 2 === 0 ? '' : 'bg-slate-50/40'
                      }`}
                    >
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-700">{r.staffName}</div>
                        {r.municipalityName && (
                          <div className="text-xs text-slate-400">{r.municipalityName}</div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-xs">
                        {r.department || '—'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${
                          r.healthScore >= 4 ? 'bg-emerald-500'
                          : r.healthScore >= 3 ? 'bg-amber-400'
                          : 'bg-red-400'
                        }`}>
                          {r.healthScore}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${workloadColor(r.workloadScore)}`}>
                          {r.workloadScore}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className={`inline-block w-7 h-7 rounded-full text-white text-xs font-bold leading-7 ${
                          r.teamWellBeingScore >= 4 ? 'bg-blue-500'
                          : r.teamWellBeingScore >= 3 ? 'bg-blue-300'
                          : 'bg-slate-400'
                        }`}>
                          {r.teamWellBeingScore}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <WBScoreBadge score={r.wellbeingScore} />
                      </td>
                      <td className="py-2.5 px-3 text-xs text-slate-400">
                        {r.recordDate}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── 公務員連携への導線 ── */}
        <div className="bg-indigo-50 rounded-2xl border border-indigo-200 p-4">
          <p className="text-xs font-semibold text-indigo-600 mb-2">
            🌐 このデータが使われる場面
          </p>
          <p className="text-sm text-indigo-700 leading-relaxed">
            ここで蓄積した{staffLabel}コンディションデータは、
            <strong>公務員連携 統合ダッシュボード</strong>で
            行政・教育・警察消防・医療介護の全部門と合算され、
            街全体の支援力として可視化されます。
          </p>
          <div className="mt-3 flex gap-2 flex-wrap">
            <Link
              href="/koumuin/dashboard"
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-700 hover:bg-indigo-200 transition-colors border border-indigo-200"
            >
              🌐 統合ダッシュボードを見る
            </Link>
            <Link
              href={aiAdvisorHref}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium ${color.badge} hover:opacity-80 transition-opacity border ${color.border}`}
            >
              🤖 AI顧問で分析する
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
