'use client';

/**
 * 🧠 組織設計ウィザード（進化版）
 * ─────────────────────────────────────────────────────────
 * RunWith オントロジー設計フレームワーク。
 * 「課題優先選択 → AIロードマップ生成 → Notion自動構築」の起動UI。
 *
 * ■ 画面の流れ（7ステップ）
 *   Step 0: スタート画面
 *   Step 1: Block A — 組織概要（誰が誰に何を届けているか）
 *   Step 2: Block E — 課題の優先順位（何から解くか）← 新設
 *   Step 3: Block B — タッチポイントの把握
 *   Step 4: Block C — 現在のデータ状況
 *   Step 5: Block D — 組織の文脈・IT体制
 *   Step 6: ロードマップ確認（AI生成 → プレビュー）← 新設
 *   Step 7: 完了画面
 *
 * ■ 完了時に作成されるNotionページ
 *   🏙️ [組織名] RunWith（自治体トップページ）
 *   └── 🗺️ 導入ロードマップ（AIが生成した3フェーズ計画）
 *   ヒアリング結果管理DB にもレコードを追加（Agent 1 のトリガー）
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
  Map,
  Sparkles,
  Check,
} from 'lucide-react';
import type { RoadmapData } from '@/app/api/runwith/roadmap-ai/route';

// ─── 定数：課題一覧 ────────────────────────────────────

/**
 * 10の優先課題カード。
 * 最大3つ選択でき、裏でモジュールにマッピングされる。
 */
const CHALLENGES = [
  {
    id:   'citizen_service',
    emoji: '🏘️',
    label: '住民サービスの質・苦情対応',
    desc: '窓口改善・住民満足度向上・クレーム管理',
    color: 'sky',
  },
  {
    id:   'staff_burnout',
    emoji: '👥',
    label: '職員の燃え尽き・離職・人手不足',
    desc: 'コンディション管理・早期離職防止・1on1改善',
    color: 'emerald',
  },
  {
    id:   'population_decline',
    emoji: '📉',
    label: '人口減少・地域縮小対応',
    desc: '縮小シナリオ計画・地区統廃合・サービス再設計',
    color: 'violet',
  },
  {
    id:   'infra_aging',
    emoji: '🏗️',
    label: 'インフラ老朽化・維持管理コスト',
    desc: '設備点検最適化・修繕計画・AI診断',
    color: 'cyan',
  },
  {
    id:   'waste_management',
    emoji: '♻️',
    label: '廃棄物管理・収集の効率化',
    desc: 'ルート最適化・焼却施設統廃合・コスト削減',
    color: 'teal',
  },
  {
    id:   'healthcare',
    emoji: '🏥',
    label: '医療・介護サービスの持続性',
    desc: '医療従事者支援・高齢者モニタリング・施設連携',
    color: 'rose',
  },
  {
    id:   'education',
    emoji: '📚',
    label: '教育環境の維持・教職員支援',
    desc: '教職員コンディション・児童WellBeing・政策提言',
    color: 'blue',
  },
  {
    id:   'safety',
    emoji: '👮',
    label: '防災・安全・緊急対応',
    desc: '隊員管理・インシデント記録・避難情報管理',
    color: 'amber',
  },
  {
    id:   'finance',
    emoji: '💰',
    label: '財政健全化・コスト削減',
    desc: '予算最適化・収支分析・補助金活用',
    color: 'yellow',
  },
  {
    id:   'dx_data',
    emoji: '📊',
    label: 'データ化・意思決定のDX推進',
    desc: 'データ収集基盤・KPI可視化・AI政策提言',
    color: 'indigo',
  },
] as const;

type ChallengeId = typeof CHALLENGES[number]['id'];

// ─── 定数：ブロック定義 ────────────────────────────────

/** ステップインジケーター用ブロック（Step 1〜5） */
const BLOCKS = [
  { step: 1, label: 'A', title: '組織概要',  icon: Users,      color: 'blue',    minutes: 15 },
  { step: 2, label: 'E', title: '課題優先',  icon: Target,     color: 'rose',    minutes: 10 },
  { step: 3, label: 'B', title: '接点把握',  icon: MapPin,     color: 'emerald', minutes: 20 },
  { step: 4, label: 'C', title: 'データ現状', icon: Database,   color: 'violet',  minutes: 15 },
  { step: 5, label: 'D', title: '文脈・体制', icon: Lightbulb,  color: 'orange',  minutes: 10 },
];

// ─── カラーマッピング ──────────────────────────────────

const COLOR_MAP: Record<string, {
  bg: string; border: string; text: string; badge: string; btn: string
}> = {
  blue:    { bg: 'bg-blue-50',    border: 'border-blue-200',    text: 'text-blue-700',    badge: 'bg-blue-100 text-blue-700',    btn: 'bg-blue-600 hover:bg-blue-700' },
  rose:    { bg: 'bg-rose-50',    border: 'border-rose-200',    text: 'text-rose-700',    badge: 'bg-rose-100 text-rose-700',    btn: 'bg-rose-600 hover:bg-rose-700' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', badge: 'bg-emerald-100 text-emerald-700', btn: 'bg-emerald-600 hover:bg-emerald-700' },
  violet:  { bg: 'bg-violet-50',  border: 'border-violet-200',  text: 'text-violet-700',  badge: 'bg-violet-100 text-violet-700',  btn: 'bg-violet-600 hover:bg-violet-700' },
  orange:  { bg: 'bg-orange-50',  border: 'border-orange-200',  text: 'text-orange-700',  badge: 'bg-orange-100 text-orange-700',  btn: 'bg-orange-600 hover:bg-orange-700' },
  amber:   { bg: 'bg-amber-50',   border: 'border-amber-200',   text: 'text-amber-700',   badge: 'bg-amber-100 text-amber-700',   btn: 'bg-amber-600 hover:bg-amber-700' },
};

/** 課題カードの選択時・非選択時のスタイル */
const CHALLENGE_SELECTED = 'ring-2 ring-orange-500 border-orange-400 bg-orange-50';
const CHALLENGE_DEFAULT  = 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50';

// ─── 共通入力コンポーネント ────────────────────────────

function QTextarea({
  label, hint, value, onChange, placeholder, rows = 3,
}: {
  label: string; hint?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; rows?: number;
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

function QInput({
  label, value, onChange, placeholder, hint,
}: {
  label: string; value: string;
  onChange: (v: string) => void; placeholder?: string; hint?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-xs text-gray-400 mb-2">{hint}</p>}
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

// ─── 型定義 ────────────────────────────────────────────

/** ヒアリング全回答データ（Block A〜E＋IT体制） */
type HearingData = {
  // Block A: 組織概要
  a1_end_user: string;
  a1_count:    string;
  a1_relation: string;
  a2_org_name: string;
  a2_count:    string;
  a2_services: string;
  a3_teams:    string;
  // Block E: 課題の優先順位（新規）
  e_challenges:      ChallengeId[];
  e_priority_reason: string;
  // Block B: タッチポイント
  b1_channels:  string;
  b2_key_touch: string;
  b3_risk_touch: string;
  // Block C: データ状況
  c1_data_sources: string;
  c2_team_status:  string;
  c3_kpi:          string;
  // Block D: 組織の文脈・IT体制
  d1_background:  string;
  d2_stakeholders: string;
  d3_vision:       string;
  d_it_count:      string;  // IT担当者数（新規）
  d_it_level:      string;  // IT技術レベル（新規）
};

/** ウィザードのステップ（0=スタート、1〜5=BlockA〜D+E、6=ロードマップ、7=完了） */
type WizardStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

/** ロードマップ保存後のNotionリンクセット */
type NotionLinks = {
  municipalityUrl: string;
  roadmapUrl:      string;
  hearingUrl:      string;
};

// ─── メインコンポーネント ──────────────────────────────

export default function OrgWizardPage() {

  // ── 状態 ──────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>(0);

  const [data, setData] = useState<HearingData>({
    a1_end_user: '', a1_count: '', a1_relation: '直接',
    a2_org_name: '', a2_count: '', a2_services: '',
    a3_teams: '',
    e_challenges: [], e_priority_reason: '',
    b1_channels: '', b2_key_touch: '', b3_risk_touch: '',
    c1_data_sources: '', c2_team_status: '', c3_kpi: '',
    d1_background: '', d2_stakeholders: '', d3_vision: '',
    d_it_count: '', d_it_level: '初中級',
  });

  const [roadmap,      setRoadmap]      = useState<RoadmapData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [notionLinks,  setNotionLinks]  = useState<NotionLinks | null>(null);
  const [error,        setError]        = useState<string | null>(null);

  // ── ヘルパー ───────────────────────────────────────────
  const update = (key: keyof HearingData, value: string) =>
    setData((prev) => ({ ...prev, [key]: value }));

  /** 課題カードのトグル（最大3つ） */
  const toggleChallenge = (id: ChallengeId) => {
    setData((prev) => {
      const current = prev.e_challenges;
      if (current.includes(id)) {
        return { ...prev, e_challenges: current.filter((c) => c !== id) };
      }
      if (current.length >= 3) return prev; // 最大3つ
      return { ...prev, e_challenges: [...current, id] };
    });
  };

  /** 現在ステップの必須チェック */
  const canProceed = (): boolean => {
    if (step === 0) return true;
    if (step === 1) return data.a2_org_name.trim() !== '' && data.a1_end_user.trim() !== '';
    if (step === 2) return data.e_challenges.length > 0;
    if (step === 3) return data.b1_channels.trim() !== '';
    if (step === 4) return data.c1_data_sources.trim() !== '';
    if (step === 5) return data.d1_background.trim() !== '';
    if (step === 6) return roadmap !== null; // ロードマップ生成済みなら保存可能
    return true;
  };

  // ── AIロードマップ生成 ─────────────────────────────────

  /** Step 5→6 で呼ばれる。AIにロードマップを生成させる。 */
  const generateRoadmap = async () => {
    setIsGenerating(true);
    setError(null);
    setStep(6);

    try {
      const res = await fetch('/api/runwith/roadmap-ai', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orgName:        data.a2_org_name,
          challenges:     data.e_challenges,
          priorityReason: data.e_priority_reason,
          orgContext:     data.d1_background,
          itCount:        data.d_it_count,
          itLevel:        data.d_it_level,
          vision:         data.d3_vision,
        }),
      });

      const json = await res.json() as { success: boolean; roadmap?: RoadmapData; error?: string };

      if (!res.ok || !json.success) {
        throw new Error(json.error ?? 'ロードマップ生成に失敗しました');
      }

      setRoadmap(json.roadmap ?? null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep(5); // エラー時はBlock Dに戻す
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Notion保存 ─────────────────────────────────────────

  /** Step 6の「Notionに保存」ボタンで呼ばれる */
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setStep(7);

    try {
      const res = await fetch('/api/notion/create-hearing', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, roadmap }),
      });

      const json = await res.json() as {
        success?: boolean;
        municipalityUrl?: string;
        roadmapUrl?: string;
        hearingUrl?: string;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(json.error ?? 'Notionへの保存に失敗しました');
      }

      setNotionLinks({
        municipalityUrl: json.municipalityUrl ?? '',
        roadmapUrl:      json.roadmapUrl      ?? '',
        hearingUrl:      json.hearingUrl      ?? '',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setStep(6); // エラー時はロードマップ画面に戻す
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── ナビゲーション ─────────────────────────────────────

  const goNext = () => {
    if (step < 5) {
      setStep((prev) => (prev + 1) as WizardStep);
    } else if (step === 5) {
      generateRoadmap(); // AIロードマップ生成 → Step 6へ
    }
    // Step 6の「保存」は handleSubmit() を直接呼ぶ
  };

  const goBack = () => {
    if (step > 0) setStep((prev) => (prev - 1) as WizardStep);
  };

  // ─────────────────────────────────────────────────────
  // レンダリング
  // ─────────────────────────────────────────────────────

  return (
    <div className="max-w-3xl">

      {/* ── ページヘッダー ──────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-orange-100 rounded-lg">
            <Brain className="text-orange-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">組織設計ウィザード</h1>
            <p className="text-sm text-gray-500">
              課題優先選択 → AIロードマップ生成 → Notion自治体ページ自動構築
            </p>
          </div>
        </div>
      </div>

      {/* ── ステップインジケーター（Step 1〜5） ──────────── */}
      {step >= 1 && step <= 5 && (
        <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1">
          {BLOCKS.map((block, idx) => {
            const colors    = COLOR_MAP[block.color];
            const isDone    = step > block.step;
            const isCurrent = step === block.step;
            return (
              <div key={block.step} className="flex items-center gap-1 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${isDone ? 'bg-green-500 text-white' : isCurrent ? `${colors.btn} text-white` : 'bg-gray-200 text-gray-500'}`}>
                    {isDone ? <CheckCircle size={14} /> : block.label}
                  </div>
                  <div className="hidden sm:block">
                    <p className={`text-xs font-medium ${isCurrent ? colors.text : 'text-gray-400'}`}>
                      {block.title}
                    </p>
                  </div>
                </div>
                {idx < BLOCKS.length - 1 && (
                  <div className={`h-0.5 w-6 flex-shrink-0 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
          {/* ロードマップステップ表示 */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <div className="h-0.5 w-6 bg-gray-200" />
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0
              ${step === 6 ? 'bg-orange-600 text-white' : 'bg-gray-200 text-gray-400'}`}>
              <Map size={14} />
            </div>
            <p className={`text-xs font-medium hidden sm:block ${step === 6 ? 'text-orange-700' : 'text-gray-400'}`}>
              計画
            </p>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 0: スタート画面                             */}
      {/* ════════════════════════════════════════════════ */}
      {step === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-4">
              <Brain size={32} className="text-orange-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              新規組織の設定を始める
            </h2>
            <p className="text-gray-500 text-sm max-w-md mx-auto">
              「何から解くか」を決めて進むだけで、AIがフェーズ別ロードマップを生成し、
              Notionに自治体専用ページと導入計画を自動作成します。
            </p>
          </div>

          {/* できること */}
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { icon: Target,        text: '課題から逆引きで設計',      sub: '10課題から最大3つ優先選択' },
              { icon: Sparkles,      text: 'AIがロードマップを生成',     sub: '3フェーズ・具体的アクション付き' },
              { icon: Database,      text: '8つのNotionDBを自動構築',   sub: 'TouchPoint中核の標準設計' },
              { icon: MessageSquare, text: 'ロール別マニュアルを4種生成', sub: 'Agent 3が並列生成' },
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

          {/* ステップ概要 */}
          <div className="space-y-2 mb-8">
            {[
              { label: 'Block A', title: '組織概要',    sub: '誰が誰に何を届けているか',       color: 'blue',    minutes: 15 },
              { label: 'Block E', title: '課題の優先順位', sub: '何から解くかを選ぶ（最大3つ）',  color: 'rose',    minutes: 10 },
              { label: 'Block B', title: 'タッチポイント', sub: '接触の瞬間を特定する',          color: 'emerald', minutes: 20 },
              { label: 'Block C', title: 'データ状況',  sub: '何がすでに取れているか',           color: 'violet',  minutes: 15 },
              { label: 'Block D', title: '文脈・IT体制', sub: 'なぜ今・誰が推進するか',          color: 'orange',  minutes: 10 },
            ].map(({ label, title, sub, color, minutes }) => {
              const c = COLOR_MAP[color];
              return (
                <div key={label} className={`flex items-center gap-3 p-3 ${c.bg} border ${c.border} rounded-lg`}>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded ${c.badge}`}>{label}</span>
                  <div className="flex-1">
                    <span className={`text-xs font-semibold ${c.text}`}>{title}</span>
                    <span className="text-xs text-gray-500 ml-2">— {sub}</span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock size={11} />
                    <span>{minutes}分</span>
                  </div>
                </div>
              );
            })}
          </div>

          <p className="text-center text-xs text-gray-400 mb-6">
            合計所要時間：約70分 ／ チームリーダーまたは事業責任者が回答してください
          </p>

          <button
            onClick={() => setStep(1)}
            className="w-full flex items-center justify-center gap-2 py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
          >
            <ArrowRight size={18} />
            ウィザードを始める
          </button>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 1: Block A — 組織概要                       */}
      {/* ════════════════════════════════════════════════ */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-blue-100">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users size={20} className="text-blue-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wide">Block A · 15分</p>
              <h2 className="text-lg font-bold text-gray-900">組織概要</h2>
              <p className="text-sm text-gray-500">誰が誰に何を届けているかを描く</p>
            </div>
          </div>

          <div className="space-y-6">

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">A-1｜エンドユーザーの特定</p>
              <p className="text-sm text-gray-600 mb-4">
                あなたの組織が最終的に価値を届けている「お客様」は誰ですか？
              </p>
              <div className="space-y-3">
                <QInput
                  label="対象者（例：霧島市 住民）"
                  value={data.a1_end_user}
                  onChange={(v) => update('a1_end_user', v)}
                  placeholder="住民 / 社員 / 患者 など"
                />
                <QInput
                  label="人数（概算）"
                  value={data.a1_count}
                  onChange={(v) => update('a1_count', v)}
                  placeholder="例：63,000名"
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

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">A-2｜価値提供者（あなたの組織）の特定</p>
              <p className="text-sm text-gray-600 mb-4">
                そのお客様に価値を届けている組織・チームの情報を教えてください。
              </p>
              <div className="space-y-3">
                <QInput
                  label="組織名・チーム名 ★必須"
                  value={data.a2_org_name}
                  onChange={(v) => update('a2_org_name', v)}
                  placeholder="例：霧島市役所 総務課"
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
                  placeholder={"例：窓口相談対応\nLINE相談対応\n寄り添い隊訪問"}
                  hint="Service DBの初期データになります"
                />
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
              <p className="text-xs font-bold text-blue-700 mb-3">A-3｜チーム構造の把握</p>
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

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 2: Block E — 課題の優先順位                 */}
      {/* ════════════════════════════════════════════════ */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-sm border border-rose-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-rose-100">
            <div className="p-2 bg-rose-100 rounded-lg">
              <Target size={20} className="text-rose-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-rose-600 uppercase tracking-wide">Block E · 10分</p>
              <h2 className="text-lg font-bold text-gray-900">課題の優先順位</h2>
              <p className="text-sm text-gray-500">「何から解くか」を最大3つ選んでください</p>
            </div>
            {/* 選択カウント */}
            <div className={`px-3 py-1.5 rounded-full text-sm font-bold flex-shrink-0
              ${data.e_challenges.length === 3
                ? 'bg-orange-100 text-orange-700'
                : 'bg-gray-100 text-gray-600'}`}>
              {data.e_challenges.length} / 3 選択
            </div>
          </div>

          <p className="text-sm text-gray-600 mb-5">
            選んだ課題をもとに、RunWith Platform の機能が自動的にマッピングされ、
            あなたの組織に合ったロードマップが生成されます。
          </p>

          {/* 課題カードグリッド */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {CHALLENGES.map((challenge) => {
              const isSelected = data.e_challenges.includes(challenge.id);
              const isDisabled = !isSelected && data.e_challenges.length >= 3;
              return (
                <button
                  key={challenge.id}
                  onClick={() => !isDisabled && toggleChallenge(challenge.id)}
                  disabled={isDisabled}
                  className={`relative text-left p-4 rounded-xl border-2 transition-all
                    ${isSelected ? CHALLENGE_SELECTED : isDisabled ? 'border-gray-100 bg-gray-50 opacity-40 cursor-not-allowed' : CHALLENGE_DEFAULT}`}
                >
                  {/* 選択チェックマーク */}
                  {isSelected && (
                    <div className="absolute top-2 right-2 w-5 h-5 bg-orange-500 rounded-full flex items-center justify-center">
                      <Check size={12} className="text-white" />
                    </div>
                  )}
                  <div className="text-2xl mb-2">{challenge.emoji}</div>
                  <p className="text-sm font-semibold text-gray-800 mb-1 leading-tight">
                    {challenge.label}
                  </p>
                  <p className="text-xs text-gray-500">{challenge.desc}</p>
                </button>
              );
            })}
          </div>

          {/* 選択された課題の確認バッジ */}
          {data.e_challenges.length > 0 && (
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg mb-4">
              <p className="text-xs font-semibold text-orange-700 mb-2">選択した優先課題：</p>
              <div className="flex flex-wrap gap-2">
                {data.e_challenges.map((id) => {
                  const ch = CHALLENGES.find((c) => c.id === id);
                  return ch ? (
                    <span key={id} className="inline-flex items-center gap-1 text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full">
                      {ch.emoji} {ch.label}
                    </span>
                  ) : null;
                })}
              </div>
            </div>
          )}

          {/* 優先する理由 */}
          <div className="p-4 bg-rose-50 rounded-lg border border-rose-100">
            <QTextarea
              label="これらを優先課題とする理由・背景"
              value={data.e_priority_reason}
              onChange={(v) => update('e_priority_reason', v)}
              placeholder="例：人手不足が深刻で職員の離職が続いており、まず職員支援を優先。人口減少も加速しており並行して縮小シナリオの設計が急務。"
              hint="AIがロードマップの優先順位を決定する際の根拠として使用します"
              rows={3}
            />
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 3: Block B — タッチポイントの把握            */}
      {/* ════════════════════════════════════════════════ */}
      {step === 3 && (
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
            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 mb-3">B-1｜タッチポイントチャネルの列挙 ★必須</p>
              <p className="text-sm text-gray-600 mb-4">
                お客様があなたの組織と接触する場面を思いつく限り挙げてください。
              </p>
              <QTextarea
                label="チャネル一覧（1行に1チャネル）"
                value={data.b1_channels}
                onChange={(v) => update('b1_channels', v)}
                placeholder={"例：窓口対応\n電話相談\nLINE相談\n寄り添い隊訪問\nSDL研修"}
                hint="TouchPoint DBのチャネル選択肢になります"
                rows={4}
              />
            </div>

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <p className="text-xs font-bold text-emerald-700 mb-3">B-2｜最重要タッチポイント</p>
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

            <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-100">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle size={14} className="text-amber-500" />
                <p className="text-xs font-bold text-emerald-700">B-3｜最危険タッチポイント</p>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                「ここで失敗するとお客様が離れる」という最危険な場面はどれですか？
              </p>
              <QTextarea
                label="最危険チャネルと失敗時の影響"
                value={data.b3_risk_touch}
                onChange={(v) => update('b3_risk_touch', v)}
                placeholder="例：LINE相談の返答遅延。24時間以内に返答がないと住民が行政への不信感を持つ。"
                hint="Incident DBの重大度定義に使用します"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 4: Block C — 現在のデータ状況               */}
      {/* ════════════════════════════════════════════════ */}
      {step === 4 && (
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
            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-3">C-1｜既存の声の収集手段 ★必須</p>
              <p className="text-sm text-gray-600 mb-4">
                現在、お客様の声や反応を何らかの形で記録していますか？
              </p>
              <QTextarea
                label="収集方法と保存場所"
                value={data.c1_data_sources}
                onChange={(v) => update('c1_data_sources', v)}
                placeholder="例：アンケート（紙・月1回・集計のみ）、苦情記録（Excel）、LINE相談ログ（LINE Works）"
                hint="データ収集Layer 1（自動化対象）の特定に使用します"
              />
            </div>

            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-3">C-2｜チームメンバーの状態把握</p>
              <p className="text-sm text-gray-600 mb-4">
                メンバーの状態（疲弊・充実・課題）を把握する手段はありますか？
              </p>
              <QTextarea
                label="現在の把握手段と感じている課題"
                value={data.c2_team_status}
                onChange={(v) => update('c2_team_status', v)}
                placeholder="例：月1回の1on1のみ。人手不足で疲弊しているのに数字で把握できていない。"
                hint="WellBeing DBの設計方針に使用します"
              />
            </div>

            <div className="p-4 bg-violet-50 rounded-lg border border-violet-100">
              <p className="text-xs font-bold text-violet-700 mb-3">C-3｜現在の成功指標</p>
              <p className="text-sm text-gray-600 mb-4">
                「この数字が改善したら成功」と言える指標が現在ありますか？
              </p>
              <QTextarea
                label="現在追っている指標と「成功」の定義"
                value={data.c3_kpi}
                onChange={(v) => update('c3_kpi', v)}
                placeholder="例：住民満足度アンケート平均点（現在3.2/5.0）。職員の離職率（現在8%）"
                hint="9KPI設計の出発点になります"
              />
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 5: Block D — 組織の文脈・IT体制             */}
      {/* ════════════════════════════════════════════════ */}
      {step === 5 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-orange-100">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Lightbulb size={20} className="text-orange-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-orange-600 uppercase tracking-wide">Block D · 10分</p>
              <h2 className="text-lg font-bold text-gray-900">組織の文脈・IT体制</h2>
              <p className="text-sm text-gray-500">なぜ今これが必要か・誰が推進するか</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          <div className="space-y-6">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">D-1｜背景・きっかけ ★必須</p>
              <p className="text-sm text-gray-600 mb-4">
                この取り組みを始めようとしている背景・きっかけは何ですか？
              </p>
              <QTextarea
                label="背景・緊急度・経営層のスタンス"
                value={data.d1_background}
                onChange={(v) => update('d1_background', v)}
                placeholder="例：人手不足深刻化で来年度に職員10名削減が決定。同じ住民サービス水準を維持するためにDXが急務。首長も強く推進。緊急度：高"
                hint="AIロードマップの優先順位決定と文脈注入に使用します"
              />
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">D-2｜推進者と抵抗者</p>
              <p className="text-sm text-gray-600 mb-4">
                最も協力してくれそうな人と、最も抵抗しそうな人はどんな人ですか？
              </p>
              <QTextarea
                label="協力者と抵抗者（部門・役割・理由）"
                value={data.d2_stakeholders}
                onChange={(v) => update('d2_stakeholders', v)}
                placeholder="例：協力：窓口課長（データ活用に意欲的）、IT担当（システム知識あり）。抵抗：ベテラン職員（記録負荷を懸念）"
                hint="データ収集の3層設計（摩擦設計）に使用します"
              />
            </div>

            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">D-3｜半年後のビジョン</p>
              <p className="text-sm text-gray-600 mb-4">
                半年後、どんな景色になっていたら「やってよかった」と思いますか？
              </p>
              <QTextarea
                label="理想の景色（定性）と数字で表すなら"
                value={data.d3_vision}
                onChange={(v) => update('d3_vision', v)}
                placeholder="例：職員が「データがあるから安心して動ける」と言っている。住民満足度が3.2→4.0に改善。離職率が半減。"
                hint="最終KPI目標値とロードマップのゴール設定に使用します"
              />
            </div>

            {/* IT体制（新設） */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-100">
              <p className="text-xs font-bold text-orange-700 mb-3">D-4｜IT担当体制</p>
              <p className="text-sm text-gray-600 mb-4">
                IT担当者の人数と技術レベルを教えてください。
                ロードマップのフェーズ設計（機能の絞り込み）に使用します。
              </p>
              <div className="space-y-3">
                <QInput
                  label="IT担当者数（専任・兼任を含む）"
                  value={data.d_it_count}
                  onChange={(v) => update('d_it_count', v)}
                  placeholder="例：専任1名・兼任2名"
                />
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">IT技術レベル</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: '初級',  desc: 'Excelが中心、システム設定は難しい' },
                      { value: '初中級', desc: 'Notion・クラウドサービスを使える' },
                      { value: '中上級', desc: 'API連携・設定変更ができる' },
                    ].map(({ value, desc }) => (
                      <button
                        key={value}
                        onClick={() => update('d_it_level', value)}
                        className={`p-3 rounded-lg border-2 text-left transition-all
                          ${data.d_it_level === value
                            ? 'border-orange-500 bg-orange-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'}`}
                      >
                        <p className={`text-xs font-bold mb-1 ${data.d_it_level === value ? 'text-orange-700' : 'text-gray-700'}`}>
                          {value}
                        </p>
                        <p className="text-xs text-gray-400 leading-tight">{desc}</p>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 6: AIロードマップ生成・確認                  */}
      {/* ════════════════════════════════════════════════ */}
      {step === 6 && (
        <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-6">

          {/* 生成中 */}
          {isGenerating && (
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-6">
                <Sparkles size={32} className="text-orange-600 animate-pulse" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                AIがロードマップを生成中...
              </h2>
              <p className="text-sm text-gray-500">
                選択された課題と組織体制をもとに、3フェーズの導入計画を作成しています。<br />
                約10〜20秒かかります。
              </p>
              <div className="flex justify-center gap-1 mt-6">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-orange-400 animate-bounce"
                    style={{ animationDelay: `${i * 0.2}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* エラー */}
          {!isGenerating && error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-red-700 font-medium">ロードマップの生成に失敗しました</p>
                <p className="text-xs text-red-500 mt-1">{error}</p>
              </div>
            </div>
          )}

          {/* 生成完了 → プレビュー */}
          {!isGenerating && roadmap && (
            <>
              <div className="flex items-center gap-3 mb-6 pb-4 border-b border-gray-100">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Map size={20} className="text-orange-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900">
                    {data.a2_org_name} の導入ロードマップ
                  </h2>
                  <p className="text-sm text-gray-500">
                    内容を確認してから「Notionに保存」してください
                  </p>
                </div>
              </div>

              {/* 全体方針 */}
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg mb-6">
                <p className="text-xs font-bold text-orange-700 mb-2">📋 全体方針</p>
                <p className="text-sm text-gray-700">{roadmap.overview}</p>
              </div>

              {/* 3フェーズカード */}
              <div className="space-y-4 mb-6">
                {[
                  { phase: roadmap.phase1, color: 'emerald', icon: '🟢', num: 1 },
                  { phase: roadmap.phase2, color: 'amber',   icon: '🟡', num: 2 },
                  { phase: roadmap.phase3, color: 'blue',    icon: '🔵', num: 3 },
                ].map(({ phase, color, icon, num }) => {
                  const c = COLOR_MAP[color] ?? COLOR_MAP['emerald'];
                  return (
                    <div key={num} className={`p-4 rounded-xl border ${c.border} ${c.bg}`}>
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div>
                          <p className={`text-xs font-bold ${c.text} mb-0.5`}>
                            {icon} Phase {num}（{phase.period}）
                          </p>
                          <h3 className="text-base font-bold text-gray-900">{phase.title}</h3>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full flex-shrink-0 ${c.badge}`}>
                          {phase.kpi}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">{phase.goal}</p>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">導入機能</p>
                          <ul className="space-y-1">
                            {phase.features.map((f, i) => (
                              <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                <span className="text-gray-400 flex-shrink-0">•</span> {f}
                              </li>
                            ))}
                          </ul>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-gray-500 mb-1.5">具体的アクション</p>
                          <ul className="space-y-1">
                            {phase.actions.map((a, i) => (
                              <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                <span className="text-gray-400 flex-shrink-0">→</span> {a}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Notionセットアップ・リスク */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-xs font-bold text-gray-600 mb-2">🗄️ 最初に構築するDB</p>
                  <ul className="space-y-1">
                    {roadmap.notionSetup.map((db, i) => (
                      <li key={i} className="text-xs text-gray-600 flex items-start gap-1">
                        <span className="text-gray-400">•</span> {db}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <p className="text-xs font-bold text-amber-700 mb-2">⚠️ 実施リスク</p>
                  <ul className="space-y-1">
                    {roadmap.risks.map((r, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-1">
                        <span className="text-amber-400">•</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* 保存エラー */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {/* Notionに保存ボタン */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className={`w-full flex items-center justify-center gap-2 py-3.5 font-semibold rounded-xl transition-colors
                  ${!isSubmitting
                    ? 'bg-orange-600 hover:bg-orange-700 text-white'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'}`}
              >
                {isSubmitting ? (
                  <><Loader2 size={18} className="animate-spin" /> Notionに保存中...</>
                ) : (
                  <><Database size={18} /> Notionに自治体ページを作成して保存</>
                )}
              </button>
              <p className="text-center text-xs text-gray-400 mt-2">
                自治体ページ＋ロードマップサブページがNotionに自動作成されます
              </p>
            </>
          )}
        </div>
      )}

      {/* ════════════════════════════════════════════════ */}
      {/* STEP 7: 完了画面                                 */}
      {/* ════════════════════════════════════════════════ */}
      {step === 7 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">

          {/* 保存中 */}
          {isSubmitting && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-2xl mb-6">
                <Loader2 size={32} className="text-orange-600 animate-spin" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">Notionに保存中...</h2>
              <p className="text-sm text-gray-500">
                自治体ページとロードマップを作成しています。
              </p>
            </>
          )}

          {/* 完了 */}
          {!isSubmitting && notionLinks && (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-2xl mb-6">
                <CheckCircle size={32} className="text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                セットアップ完了 🎉
              </h2>
              <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
                {data.a2_org_name} の自治体ページとロードマップが<br />
                Notionに作成されました。
              </p>

              {/* Notionリンクボタン */}
              <div className="space-y-3 mb-8 max-w-sm mx-auto">
                {notionLinks.municipalityUrl && (
                  <a
                    href={notionLinks.municipalityUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 bg-orange-600 hover:bg-orange-700 text-white font-semibold rounded-xl transition-colors"
                  >
                    <ExternalLink size={16} />
                    🏙️ 自治体トップページを開く
                  </a>
                )}
                {notionLinks.roadmapUrl && (
                  <a
                    href={notionLinks.roadmapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 w-full py-3 border border-orange-300 text-orange-700 hover:bg-orange-50 font-semibold rounded-xl transition-colors"
                  >
                    <Map size={16} />
                    🗺️ 導入ロードマップを開く
                  </a>
                )}
              </div>

              {/* 次のステップ */}
              <div className="text-left space-y-2 mb-8 max-w-sm mx-auto">
                <p className="text-xs font-semibold text-gray-500 mb-3">次のステップ</p>
                {[
                  { status: '✅', label: '自治体ページ・ロードマップ作成完了' },
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

              <button
                onClick={() => {
                  setStep(0);
                  setRoadmap(null);
                  setNotionLinks(null);
                  setError(null);
                  setData({
                    a1_end_user: '', a1_count: '', a1_relation: '直接',
                    a2_org_name: '', a2_count: '', a2_services: '',
                    a3_teams: '',
                    e_challenges: [], e_priority_reason: '',
                    b1_channels: '', b2_key_touch: '', b3_risk_touch: '',
                    c1_data_sources: '', c2_team_status: '', c3_kpi: '',
                    d1_background: '', d2_stakeholders: '', d3_vision: '',
                    d_it_count: '', d_it_level: '初中級',
                  });
                }}
                className="text-sm text-gray-400 hover:text-gray-600 underline"
              >
                別の組織を設定する
              </button>
            </>
          )}
        </div>
      )}

      {/* ── ナビゲーションボタン（Step 1〜5のみ表示） ──── */}
      {step >= 1 && step <= 5 && (
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft size={16} />
            {step === 1 ? '最初に戻る' : '前へ'}
          </button>

          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-400">
              {step} / 5 ブロック完了
            </span>
            <button
              onClick={goNext}
              disabled={!canProceed() || isGenerating}
              className={`flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white rounded-xl transition-colors
                ${canProceed() && !isGenerating
                  ? 'bg-orange-600 hover:bg-orange-700'
                  : 'bg-gray-300 cursor-not-allowed'}`}
            >
              {step < 5 ? (
                <>次のブロックへ <ChevronRight size={16} /></>
              ) : (
                <><Sparkles size={16} /> AIロードマップを生成</>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
