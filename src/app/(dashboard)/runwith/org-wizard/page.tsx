'use client';

/**
 * 🧠 組織設計ウィザード
 * ─────────────────────────────────────────────────────────
 * RunWith オントロジー設計フレームワークに基づく
 * 「60分ヒアリング → Notion自動DB構築」の起動UI。
 *
 * ■ 画面の流れ
 *   STEP 0: スタート画面（概要説明）
 *   STEP 1–4: Block A〜D（各ブロック3問）
 *   STEP 5: 送信中・完了画面
 *
 * ■ 完了後
 *   /api/notion/create-hearing にPOSTし、
 *   Notionの「ヒアリング結果管理DB」にレコードを作成する。
 *   作成されたページのURLをNotion Custom Agent 1 が監視し、
 *   8DBを自動構築する。
 */

import { useState } from 'react';
import {
  Brain,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Loader2,
  ExternalLink,
  Users,
  MapPin,
  BarChart3,
  MessageSquare,
  AlertTriangle,
  Database,
  Target,
  Lightbulb,
  Clock,
  ArrowRight,
} from 'lucide-react';

// ─── 型定義 ────────────────────────────────────────────────

/** ヒアリング12問の全回答データ */
type HearingData = {
  // Block A: 構造の把握
  a1_end_user: string;        // A-1 エンドユーザーの定義
  a1_count: string;           // A-1 人数
  a1_relation: string;        // A-1 関係性（直接 / 間接）
  a2_org_name: string;        // A-2 組織名・チーム名
  a2_count: string;           // A-2 メンバー数
  a2_services: string;        // A-2 提供サービス一覧
  a3_teams: string;           // A-3 チーム構造

  // Block B: タッチポイントの把握
  b1_channels: string;        // B-1 チャネル一覧
  b2_key_touch: string;       // B-2 最重要タッチポイント
  b3_risk_touch: string;      // B-3 最危険タッチポイント

  // Block C: 現在のデータ状況
  c1_data_sources: string;    // C-1 既存の声の収集手段
  c2_team_status: string;     // C-2 チームメンバーの状態把握
  c3_kpi: string;             // C-3 現在の成功指標

  // Block D: 組織の文脈
  d1_background: string;      // D-1 背景・きっかけ
  d2_stakeholders: string;    // D-2 推進者と抵抗者
  d3_vision: string;          // D-3 半年後のビジョン
};

/** ウィザードの現在のステップ（0=スタート、1〜4=BlockA〜D、5=完了） */
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5;

// ─── ブロック定義 ──────────────────────────────────────────

/** 各ブロックのメタ情報 */
const BLOCKS = [
  {
    step: 1 as WizardStep,
    label: 'Block A',
    title: '構造の把握',
    subtitle: '誰が誰に何を届けているか',
    icon: Users,
    color: 'blue',
    minutes: 15,
  },
  {
    step: 2 as WizardStep,
    label: 'Block B',
    title: 'タッチポイントの把握',
    subtitle: '接触の瞬間を特定する',
    icon: MapPin,
    color: 'emerald',
    minutes: 20,
  },
  {
    step: 3 as WizardStep,
    label: 'Block C',
    title: '現在のデータ状況',
    subtitle: '何がすでに取れているか',
    icon: Database,
    color: 'violet',
    minutes: 15,
  },
  {
    step: 4 as WizardStep,
    label: 'Block D',
    title: '組織の文脈',
    subtitle: 'なぜ今これが必要か',
    icon: Lightbulb,
    color: 'orange',
    minutes: 10,
  },
];

// ─── カラーマッピング（Tailwindクラス） ────────────────────

/** ブロックカラー名 → Tailwindクラスのマッピング */
const COLOR_MAP: Record<string, { bg: string; border: string; text: string; badge: string; btn: string }> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700',  btn: 'bg-orange-600 hover:bg-orange-700' },
};

// ─── テキストエリア共通コンポーネント ─────────────────────

/** 質問カード内のテキストエリア（共通スタイル） */
function QTextarea({
  label,
  hint,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
      <textarea
        rows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-orange-400 focus:border-transparent
                   resize-none placeholder-gray-300"
      />
    </div>
  );
}

/** テキスト入力（1行） */
function QInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg
                   focus:ring-2 focus:ring-orange-400 focus:border-transparent
                   placeholder-gray-300"
      />
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export default function OrgWizardPage() {
  // ── 状態管理 ──────────────────────────────────────────────

  /** 現在表示中のウィザードステップ */
  const [step, setStep] = useState<WizardStep>(0);

  /** 全12問の回答データ */
  const [data, setData] = useState<HearingData>({
    a1_end_user: '', a1_count: '', a1_relation: '直接',
    a2_org_name: '', a2_count: '', a2_services: '',
    a3_teams: '',
    b1_channels: '', b2_key_touch: '', b3_risk_touch: '',
    c1_data_sources: '', c2_team_status: '', c3_kpi: '',
    d1_background: '', d2_stakeholders: '', d3_vision: '',
  });

  /** 送信中フラグ（ボタンの2重押し防止） */
  const [isSubmitting, setIsSubmitting] = useState(false);

  /** 完了後のNotionページURL（成功時に表示） */
  const [notionUrl, setNotionUrl] = useState<string | null>(null);

  /** エラーメッセージ */
  const [error, setError] = useState<string | null>(null);

  // ── ヘルパー関数 ───────────────────────────────────────────

  /** 回答データの1フィールドを更新する */
  const update = (key: keyof HearingData, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  /** ステップ進行（次へ） */
  const goNext = () => {
    if (step < 4) setStep((prev) => (prev + 1) as WizardStep);
    else handleSubmit();  // Block D が終わったら送信
  };

  /** ステップ戻る */
  const goBack = () => {
    if (step > 0) setStep((prev) => (prev - 1) as WizardStep);
  };

  /** 現在のブロックの必須チェック（最低1フィールドが埋まっていること） */
  const canProceed = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return data.a2_org_name.trim() !== '' && data.a1_end_user.trim() !== '';
    if (step === 2) return data.b1_channels.trim() !== '';
    if (step === 3) return data.c1_data_sources.trim() !== '';
    if (step === 4) return data.d1_background.trim() !== '';
    return true;
  };

  // ── 送信処理 ───────────────────────────────────────────────

  /** 全回答をNotionに送信する */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setStep(5);  // ローディング画面に切り替え

    try {
      const res = await fetch('/api/notion/create-hearing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? 'Notionへの保存に失敗しました');
      }

      // 成功時はNotionページのURLを表示
      setNotionUrl(json.pageUrl ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep(4);  // エラー時はBlock Dに戻す
    } finally {
      setIsSubmitting(false);
    }
  };

  // ─────────────────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl">

      {/* ── ページヘッダー ──────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Brain className="text-orange-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">組織設計ウィザード</h1>
            <p className="text-sm text-gray-500">
              オントロジー設計フレームワーク — 60分ヒアリング → Notion自動DB構築
            </p>
          </div>
        </div>
      </div>

      {/* ── ステップインジケーター（スタート画面と完了画面では非表示） ── */}
      {step >= 1 && step <= 4 && (
        <div className="flex items-center gap-2 mb-8">
          {BLOCKS.map((block, idx) => {
            const colors = COLOR_MAP[block.color];
            const isDone = step > block.step;
            const isCurrent = step === block.step;

            return (
              <div key={block.step} className="flex items-center gap-2">
                {/* ステップドット */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                      ${isDone ? 'bg-green-500 text-white' : isCurrent ? `${colors.btn} text-white` : 'bg-gray-200 text-gray-500'}`}
                  >
                    {isDone ? <CheckCircle size={14} /> : idx + 1}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-medium ${isCurrent ? colors.text : 'text-gray-400'}`}>
                      {block.label}
                    </p>
                    <p className={`text-xs ${isCurrent ? 'text-gray-600' : 'text-gray-300'}`}>
                      {block.title}
                    </p>
                  </div>
                </div>
                {/* 区切り線 */}
                {idx < BLOCKS.length - 1 && (
                  <div className={`flex-1 h-0.5 w-8 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP 0: スタート画面                                 */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          {/* タイトル */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
              <Brain size={32} className="text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              新規組織の設定を始める
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              SDL価値共創モデルに基づく12問に答えるだけで、
              Notionに8つのDBと9KPIが自動生成されます。
            </p>
          </div>

          {/* できること */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: Database,    text: '8つのNotionDBを自動構築',        sub: 'TouchPoint中核の標準設計' },
              { icon: BarChart3,   text: '9KPI合成指数を設定',             sub: '3視点×3指標の計測体系' },
              { icon: Target,      text: 'サービス仕様書を自動ドラフト',    sub: 'Agent 2が生成・人間がレビュー' },
              { icon: MessageSquare, text: 'ロール別マニュアルを4種生成',  sub: 'Agent 3が並列生成' },
            ].map(({ icon: Icon, text, sub }) => (
              <div key={text} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="p-1.5 bg-orange-100 rounded-md flex-shrink-0">
                  <Icon size={14} className="text-orange-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-700">{text}</p>
                  <p className="text-xs text-gray-400">{sub}</p>
                </div>
              </div>
            ))}
          </div>

          {/* 4ブロックの説明 */}
          <div className="space-y-2 mb-8">
            {BLOCKS.map((block) => {
              const colors = COLOR_MAP[block.color];
              const Icon = block.icon;
              return (
                <div key={block.step} className={`flex items-center gap-3 p-3 ${colors.bg} border ${colors.border} rounded-lg`}>
                  <div className={`p-1.5 rounded-md ${colors.badge}`}>
                    <Icon size={14} />
                  </div>
                  <div className="flex-1">
                    <span className={`text-xs font-semibold ${colors.text}`}>{block.label}</span>
                    <span className="text-xs text-gray-500 ml-2">{block.title} — {block.subtitle}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} />
                    <span>{block.minutes}分</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* 所要時間・注意 */}
          <p className="text-center text-xs text-gray-400 mb-6">
            合計所要時間：約60分 ／ チームリーダーまたは事業責任者が回答してください
          </p>

          {/* スタートボタン */}
          <button
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
          >
            <ArrowRight size={18} />
            ウィザードを始める
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP 1: Block A — 構造の把握                         */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-100">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Block A · 15分</p>
              <h2 className="text-lg font-bold text-gray-900">構造の把握</h2>
              <p className="text-sm text-gray-500">誰が誰に何を届けているかを描く</p>
            </div>
          </div>

          <div className="space-y-6">

            {/* A-1 エンドユーザーの特定 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">
                A-1｜エンドユーザーの特定
              </p>
              <p className="text-sm text-gray-600 mb-4">
                あなたの組織が最終的に価値を届けている「お客様（エンドユーザー）」は誰ですか？
              </p>
              <div className="space-y-3">
                <QInput
                  label="対象者（例：未来町 住民）"
                  value={data.a1_end_user}
                  onChange={(v) => update('a1_end_user', v)}
                  placeholder="住民 / 社員 / 患者 など"
                />
                <QInput
                  label="人数（概算）"
                  value={data.a1_count}
                  onChange={(v) => update('a1_count', v)}
                  placeholder="例：30,000名"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">関係性</label>
                  <div className="flex gap-4">
                    {['直接', '間接'].map((opt) => (
                      <label key={opt} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="relation"
                          value={opt}
                          checked={data.a1_relation === opt}
                          onChange={() => update('a1_relation', opt)}
                          className="text-blue-600"
                        />
                        <span className="text-sm text-gray-700">{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* A-2 価値提供者の特定 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">
                A-2｜価値提供者（あなたの組織）の特定
              </p>
              <p className="text-sm text-gray-600 mb-4">
                そのお客様に価値を届けている組織・チームの情報を教えてください。
              </p>
              <div className="space-y-3">
                <QInput
                  label="組織名・チーム名 ★必須"
                  value={data.a2_org_name}
                  onChange={(v) => update('a2_org_name', v)}
                  placeholder="例：未来町役場 総合窓口課"
                />
                <QInput
                  label="メンバー数"
                  value={data.a2_count}
                  onChange={(v) => update('a2_count', v)}
                  placeholder="例：50名"
                />
                <QTextarea
                  label="提供サービス（箇条書きで）"
                  value={data.a2_services}
                  onChange={(v) => update('a2_services', v)}
                  placeholder="例：窓口相談対応&#10;LINE相談対応&#10;寄り添い隊訪問&#10;SDL研修"
                  hint="Service DBの初期データになります"
                />
              </div>
            </div>

            {/* A-3 チーム構造 */}
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">
                A-3｜チーム構造の把握
              </p>
              <p className="text-sm text-gray-600 mb-4">
                組織内に役割の異なるチームやグループはありますか？
              </p>
              <QTextarea
                label="チーム構造（各チームの名前と人数）"
                value={data.a3_teams}
                onChange={(v) => update('a3_teams', v)}
                placeholder="例：窓口班（20名）、LINE対応班（15名）、寄り添い隊（15名）"
                hint="Member DBのサブチーム選択肢になります"
              />
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP 2: Block B — タッチポイントの把握               */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-emerald-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-emerald-100">
            <div className="p-2 bg-emerald-100 rounded-lg">
              <MapPin size={20} className="text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">Block B · 20分</p>
              <h2 className="text-lg font-bold text-gray-900">タッチポイントの把握</h2>
              <p className="text-sm text-gray-500">「接触の瞬間」がどこにあるかを特定する</p>
            </div>
          </div>

          <div className="space-y-6">

            {/* B-1 */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 mb-3">
                B-1｜タッチポイントチャネルの列挙 ★必須
              </p>
              <p className="text-sm text-gray-600 mb-4">
                お客様があなたの組織と接触する場面を思いつく限り挙げてください。
              </p>
              <QTextarea
                label="チャネル一覧（1行に1チャネル）"
                value={data.b1_channels}
                onChange={(v) => update('b1_channels', v)}
                placeholder="例：窓口対応&#10;電話相談&#10;LINE相談&#10;寄り添い隊訪問&#10;SDL研修"
                hint="TouchPoint DBのチャネル選択肢になります"
                rows={4}
              />
            </div>

            {/* B-2 */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 mb-3">
                B-2｜最重要タッチポイント
              </p>
              <p className="text-sm text-gray-600 mb-4">
                「これがうまくいくとお客様が喜ぶ」という最重要の場面はどれですか？
              </p>
              <QTextarea
                label="最重要チャネルとその理由"
                value={data.b2_key_touch}
                onChange={(v) => update('b2_key_touch', v)}
                placeholder="例：寄り添い隊訪問。住民の本音が聞ける唯一のチャネルで、ここがうまくいくと継続定住につながる。"
                hint="KPIの重み付けと「デモの刺さる一言」に使用します"
              />
            </div>

            {/* B-3 */}
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-500" />
                <p className="text-xs font-bold text-emerald-700">
                  B-3｜最危険タッチポイント
                </p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                「ここで失敗するとお客様が離れる」という最危険な場面はどれですか？
              </p>
              <QTextarea
                label="最危険チャネルと失敗時の影響"
                value={data.b3_risk_touch}
                onChange={(v) => update('b3_risk_touch', v)}
                placeholder="例：LINE相談の返答遅延。24時間以内に返答がないと住民が諦め、行政への不信感が高まる。"
                hint="Incident DBの重大度定義に使用します"
              />
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP 3: Block C — 現在のデータ状況                   */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 3 && (
        <div className="bg-white rounded-xl shadow-sm border border-violet-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-violet-100">
            <div className="p-2 bg-violet-100 rounded-lg">
              <Database size={20} className="text-violet-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Block C · 15分</p>
              <h2 className="text-lg font-bold text-gray-900">現在のデータ状況</h2>
              <p className="text-sm text-gray-500">何がすでに取れているかを確認する</p>
            </div>
          </div>

          <div className="space-y-6">

            {/* C-1 */}
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-3">
                C-1｜既存の声の収集手段 ★必須
              </p>
              <p className="text-sm text-gray-600 mb-4">
                現在、お客様の声や反応を何らかの形で記録していますか？
              </p>
              <QTextarea
                label="収集方法と保存場所"
                value={data.c1_data_sources}
                onChange={(v) => update('c1_data_sources', v)}
                placeholder="例：アンケート（紙・月1回・集計のみ）、苦情記録（Excel・担当者PC）、LINE相談ログ（LINE Works）"
                hint="データ収集Layer 1（自動化対象）の特定に使用します"
              />
            </div>

            {/* C-2 */}
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-3">
                C-2｜チームメンバーの状態把握
              </p>
              <p className="text-sm text-gray-600 mb-4">
                メンバーの状態（疲弊・充実・課題）を把握する手段はありますか？
              </p>
              <QTextarea
                label="現在の把握手段と感じている課題"
                value={data.c2_team_status}
                onChange={(v) => update('c2_team_status', v)}
                placeholder="例：月1回の1on1のみ。人手不足で疲弊しているのに数字で把握できていない。特に新人スタッフの早期離職が課題。"
                hint="WellBeing DBの設計方針に使用します"
              />
            </div>

            {/* C-3 */}
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-3">
                C-3｜現在の成功指標
              </p>
              <p className="text-sm text-gray-600 mb-4">
                「この数字が改善したら成功」と言える指標が現在ありますか？
              </p>
              <QTextarea
                label="現在追っている指標と「成功」の定義"
                value={data.c3_kpi}
                onChange={(v) => update('c3_kpi', v)}
                placeholder="例：住民満足度アンケートの平均点（現在3.2/5.0）。窓口待ち時間（目標15分以内）。職員の離職率（現在8%）"
                hint="9KPI設計の出発点になります"
              />
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP 4: Block D — 組織の文脈                         */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 4 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-orange-100">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lightbulb size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Block D · 10分</p>
              <h2 className="text-lg font-bold text-gray-900">組織の文脈</h2>
              <p className="text-sm text-gray-500">なぜ今これが必要かを理解する</p>
            </div>
          </div>

          {/* エラー表示 */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-6">

            {/* D-1 */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">
                D-1｜背景・きっかけ ★必須
              </p>
              <p className="text-sm text-gray-600 mb-4">
                この取り組みを始めようとしている背景・きっかけは何ですか？
              </p>
              <QTextarea
                label="背景・緊急度・経営層のスタンス"
                value={data.d1_background}
                onChange={(v) => update('d1_background', v)}
                placeholder="例：人手不足深刻化で来年度に職員10名削減が決定。同じ住民サービス水準を維持するためにDXが急務。首長も強く推進。緊急度：高"
                hint="SDL文脈軸の定義とAIプロンプトへの文脈注入に使用します"
              />
            </div>

            {/* D-2 */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">
                D-2｜推進者と抵抗者
              </p>
              <p className="text-sm text-gray-600 mb-4">
                最も協力してくれそうな人と、最も抵抗しそうな人はどんな人ですか？
              </p>
              <QTextarea
                label="協力者と抵抗者（部門・役割・理由）"
                value={data.d2_stakeholders}
                onChange={(v) => update('d2_stakeholders', v)}
                placeholder="例：協力：窓口課長（データ活用に意欲的）、IT担当（システム知識あり）。抵抗：ベテラン職員（記録負荷を懸念、IT苦手）"
                hint="データ収集の3層設計（摩擦設計）に使用します"
              />
            </div>

            {/* D-3 */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">
                D-3｜半年後のビジョン
              </p>
              <p className="text-sm text-gray-600 mb-4">
                半年後、どんな景色になっていたら「やってよかった」と思いますか？
              </p>
              <QTextarea
                label="理想の景色（定性）と数字で表すなら"
                value={data.d3_vision}
                onChange={(v) => update('d3_vision', v)}
                placeholder="例：職員が「データがあるから安心して動ける」と言っている。住民満足度が3.2→4.0に改善。離職率が半減して新人が3ヶ月で戦力になっている。"
                hint="最終KPI目標値とデモの「刺さる一言」に使用します"
              />
            </div>

          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* STEP 5: 送信中 / 完了画面                            */}
      {/* ════════════════════════════════════════════════════ */}
      {step === 5 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">

          {/* ローディング中 */}
          {isSubmitting && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-6">
                <Loader2 size={32} className="text-orange-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Notionに送信中...</h2>
              <p className="text-sm text-gray-500">
                ヒアリング結果を保存しています。<br />
                完了後、Notion Custom Agent 1 が自動で8DBの構築を開始します。
              </p>
            </>
          )}

          {/* 完了 */}
          {!isSubmitting && notionUrl && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                ヒアリング完了 🎉
              </h2>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                Notionに保存しました。Agent 1 が8DBの自動構築を開始しています。
                約15分後にNotionで進捗を確認してください。
              </p>

              {/* 次のステップ説明 */}
              <div className="text-left space-y-2 mb-8 max-w-sm mx-auto">
                {[
                  { status: '✅', label: 'ヒアリング完了・Notionに保存' },
                  { status: '⏳', label: 'Agent 1：8DB自動構築（約15分）' },
                  { status: '⏳', label: 'Agent 2：サービス仕様書生成（約20分）' },
                  { status: '⏳', label: '人間レビュー → 承認' },
                  { status: '⏳', label: 'Agent 3：ロール別マニュアル生成（約20分）' },
                ].map(({ status, label }) => (
                  <div key={label} className="flex items-center gap-3 text-sm text-gray-600">
                    <span>{status}</span>
                    <span>{label}</span>
                  </div>
                ))}
              </div>

              {/* Notionリンク */}
              <a
                href={notionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
              >
                <ExternalLink size={18} />
                Notionで進捗を確認する
              </a>

              {/* 別の組織を設定 */}
              <button
                onClick={() => {
                  setStep(0);
                  setNotionUrl(null);
                  setData({
                    a1_end_user: '', a1_count: '', a1_relation: '直接',
                    a2_org_name: '', a2_count: '', a2_services: '',
                    a3_teams: '',
                    b1_channels: '', b2_key_touch: '', b3_risk_touch: '',
                    c1_data_sources: '', c2_team_status: '', c3_kpi: '',
                    d1_background: '', d2_stakeholders: '', d3_vision: '',
                  });
                }}
                className="block mt-4 mx-auto text-sm text-gray-400 hover:text-gray-600 underline"
              >
                別の組織を設定する
              </button>
            </>
          )}

          {/* 完了（URLなし・エラー以外） */}
          {!isSubmitting && !notionUrl && !error && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">送信完了</h2>
              <p className="text-gray-500 text-sm">
                ヒアリング結果をNotionに保存しました。<br />
                Notionの「ヒアリング結果管理DB」をご確認ください。
              </p>
            </>
          )}
        </div>
      )}

      {/* ── ナビゲーションボタン（STEP 1〜4のみ表示） ──────── */}
      {step >= 1 && step <= 4 && (
        <div className="flex items-center justify-between mt-6">

          {/* 戻るボタン */}
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 1 ? '最初に戻る' : '前へ'}
          </button>

          {/* 右側：進捗表示 + 次へボタン */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              {step} / 4 ブロック完了
            </span>
            <button
              onClick={goNext}
              disabled={!canProceed() || isSubmitting}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors
                ${canProceed() && !isSubmitting
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {step < 4 ? (
                <>次のブロックへ <ChevronRight size={16} /></>
              ) : (
                <>
                  {isSubmitting ? (
                    <><Loader2 size={16} className="animate-spin" /> 送信中...</>
                  ) : (
                    <>Notionに送信 <ArrowRight size={16} /></>
                  )}
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
