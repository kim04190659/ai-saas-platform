'use client';

/**
 * ════════════════════════════════════════════════════════
 *  src/app/(dashboard)/runwith/multi-tenant/page.tsx
 *  Sprint #23: 横展開設定（マルチ自治体対応基盤）UI
 * ════════════════════════════════════════════════════════
 *
 * 概要:
 *   RunWith Platformを複数の自治体に展開するためのテナント管理画面。
 *   導入済み自治体・評価中・候補の一覧を表示し、
 *   新自治体の登録とオンボーディング状況を管理する。
 *
 * 主な機能:
 *   - テナント状況サマリー（4枚カード）
 *   - 展開先自治体の一覧（ステータス別タブ）
 *   - オンボーディングチェックリスト（7ステップ）
 *   - 新自治体登録フォーム
 *   - アクティブテナント切り替えボタン
 */

import { useEffect, useState, useMemo } from 'react';

// ─── 型定義 ──────────────────────────────────────────────

type OnboardingStep = {
  id: string;
  label: string;
  description: string;
  completed: boolean;
};

type MunicipalityTenant = {
  id: string;
  name: string;
  regionType: string;
  population: number | null;
  runWithStatus: string;
  wellBeingScore: number | null;
  dxScore: number | null;
  mainIndustries: string[];
  tenantStatus: 'active' | 'candidate' | 'evaluating' | 'none';
  onboardingSteps: OnboardingStep[];
};

type TenantSummary = {
  totalMunicipalities: number;
  activeTenants: number;
  evaluatingTenants: number;
  candidateTenants: number;
  avgWellBeingActive: number;
  regionTypes: Record<string, number>;
};

// ─── 定数 ─────────────────────────────────────────────────

// テナントステータスの表示設定
const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; border: string; dot: string }
> = {
  active: {
    label: '導入済み',
    color: 'text-emerald-700',
    bg: 'bg-emerald-100',
    border: 'border-emerald-300',
    dot: 'bg-emerald-500',
  },
  evaluating: {
    label: '評価中',
    color: 'text-blue-700',
    bg: 'bg-blue-100',
    border: 'border-blue-300',
    dot: 'bg-blue-500',
  },
  candidate: {
    label: '検討中',
    color: 'text-amber-700',
    bg: 'bg-amber-100',
    border: 'border-amber-300',
    dot: 'bg-amber-500',
  },
  none: {
    label: '未導入',
    color: 'text-gray-600',
    bg: 'bg-gray-100',
    border: 'border-gray-300',
    dot: 'bg-gray-400',
  },
};

const REGION_TYPES = [
  '離島', '山間部', '沿岸部', '平野部', '都市近郊', 'その他',
];

const MAIN_INDUSTRIES = [
  '農業', '漁業', '林業', '観光業', '製造業', '商業', '公共サービス',
];

// ─── サブコンポーネント ────────────────────────────────────

/** スコアバー（0〜100を視覚化） */
function ScoreBar({
  value,
  color = 'bg-violet-500',
}: {
  value: number | null;
  color?: string;
}) {
  if (value === null) return <span className="text-gray-400 text-xs">—</span>;
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-700 w-8 text-right">
        {value}
      </span>
    </div>
  );
}

/** ステータスバッジ */
function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.none;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.bg} ${cfg.color}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

/** オンボーディングチェックリスト */
function OnboardingChecklist({ steps }: { steps: OnboardingStep[] }) {
  const completed = steps.filter((s) => s.completed).length;
  const total = steps.length;
  const pct = Math.round((completed / total) * 100);

  return (
    <div className="space-y-3">
      {/* 進捗バー */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-violet-500 rounded-full transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-sm font-medium text-gray-700">
          {completed}/{total}
        </span>
      </div>

      {/* ステップ一覧 */}
      <div className="space-y-2">
        {steps.map((step) => (
          <div key={step.id} className="flex items-start gap-2">
            <div
              className={`mt-0.5 w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                step.completed
                  ? 'bg-emerald-500 border-emerald-500'
                  : 'bg-white border-gray-300'
              }`}
            >
              {step.completed && (
                <span className="text-white text-xs">✓</span>
              )}
            </div>
            <div>
              <p
                className={`text-sm font-medium ${
                  step.completed ? 'text-gray-500 line-through' : 'text-gray-800'
                }`}
              >
                {step.label}
              </p>
              <p className="text-xs text-gray-500">{step.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── メインコンポーネント ──────────────────────────────────

export default function MultiTenantPage() {
  // ── State ────────────────────────────────────────────────
  const [tenants, setTenants] = useState<MunicipalityTenant[]>([]);
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // タブ（ステータス別絞り込み）
  const [activeTab, setActiveTab] = useState<
    'all' | 'active' | 'evaluating' | 'candidate' | 'none'
  >('all');

  // 選択中テナント（チェックリスト表示用）
  const [selectedTenant, setSelectedTenant] =
    useState<MunicipalityTenant | null>(null);

  // アクティブテナント（作業中の自治体）
  const [activeMunicipalityId, setActiveMunicipalityId] = useState<
    string | null
  >(null);
  const [activeMunicipalityName, setActiveMunicipalityName] = useState<
    string | null
  >(null);

  // 新規登録フォーム
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formRegionType, setFormRegionType] = useState('離島');
  const [formPopulation, setFormPopulation] = useState('');
  const [formIndustries, setFormIndustries] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState('');

  // ── データ取得 ────────────────────────────────────────────

  useEffect(() => {
    // localStorage からアクティブテナントを復元
    const savedId = localStorage.getItem('runwith_active_tenant_id');
    const savedName = localStorage.getItem('runwith_active_tenant_name');
    if (savedId) setActiveMunicipalityId(savedId);
    if (savedName) setActiveMunicipalityName(savedName);

    fetchTenants();
  }, []);

  async function fetchTenants() {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/multi-tenant');
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'APIエラー');
      setTenants(data.tenants ?? []);
      setSummary(data.summary ?? null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── フィルタリング ────────────────────────────────────────

  const filteredTenants = useMemo(() => {
    if (activeTab === 'all') return tenants;
    return tenants.filter((t) => t.tenantStatus === activeTab);
  }, [tenants, activeTab]);

  // ── アクティブテナント切り替え ────────────────────────────

  async function handleSwitch(tenant: MunicipalityTenant) {
    const res = await fetch('/api/multi-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'switch',
        municipalityId: tenant.id,
        municipalityName: tenant.name,
      }),
    });
    const data = await res.json();
    if (data.success) {
      // localStorage に保存して全ページで参照できるようにする
      localStorage.setItem('runwith_active_tenant_id', tenant.id);
      localStorage.setItem('runwith_active_tenant_name', tenant.name);
      setActiveMunicipalityId(tenant.id);
      setActiveMunicipalityName(tenant.name);
    }
  }

  // ── 新規登録 ─────────────────────────────────────────────

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!formName.trim()) return;
    setSubmitting(true);
    setSubmitMsg('');

    const res = await fetch('/api/multi-tenant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'register',
        municipalityName: formName,
        regionType: formRegionType,
        population: formPopulation ? Number(formPopulation) : null,
        mainIndustries: formIndustries,
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (data.success) {
      setSubmitMsg('✅ ' + data.message);
      setFormName('');
      setFormPopulation('');
      setFormIndustries([]);
      fetchTenants(); // 一覧を再取得
    } else {
      setSubmitMsg('❌ 登録に失敗しました: ' + data.error);
    }
  }

  // ── 産業チェックボックス ──────────────────────────────────

  function toggleIndustry(ind: string) {
    setFormIndustries((prev) =>
      prev.includes(ind) ? prev.filter((x) => x !== ind) : [...prev, ind]
    );
  }

  // ── ローディング / エラー ─────────────────────────────────

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <div className="text-center space-y-3">
          <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-gray-500 text-sm">自治体テナント情報を読み込み中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
          <p className="text-red-600 font-medium">⚠️ データ取得エラー</p>
          <p className="text-red-500 text-sm mt-1">{error}</p>
          <button
            onClick={fetchTenants}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
          >
            再試行
          </button>
        </div>
      </div>
    );
  }

  // ── レンダリング ──────────────────────────────────────────

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">

      {/* ── ページタイトル ── */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            🌐 横展開設定（マルチ自治体対応）
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            RunWith Platform の展開済み・候補自治体を管理し、テナント切り替えを行います
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 flex items-center gap-2"
        >
          ＋ 新自治体を追加
        </button>
      </div>

      {/* ── アクティブテナントバナー ── */}
      {activeMunicipalityName && (
        <div className="bg-violet-50 border border-violet-200 rounded-xl p-4 flex items-center gap-3">
          <span className="text-2xl">🏛️</span>
          <div>
            <p className="text-sm font-medium text-violet-700">
              現在の作業自治体
            </p>
            <p className="text-lg font-bold text-violet-900">
              {activeMunicipalityName}
            </p>
          </div>
          <div className="ml-auto">
            <span className="text-xs text-violet-500">
              ← 下のカードの「この自治体で作業」ボタンで切り替え
            </span>
          </div>
        </div>
      )}

      {/* ── サマリーカード（4枚） ── */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              label: '登録自治体数',
              value: summary.totalMunicipalities,
              sub: '比較分析マスタDB',
              icon: '🏘️',
              color: 'text-gray-700',
            },
            {
              label: '導入済みテナント',
              value: summary.activeTenants,
              sub: 'RunWith稼働中',
              icon: '✅',
              color: 'text-emerald-600',
            },
            {
              label: '評価中・検討中',
              value: summary.evaluatingTenants + summary.candidateTenants,
              sub: '展開候補',
              icon: '🔍',
              color: 'text-blue-600',
            },
            {
              label: '平均WBスコア',
              value: summary.avgWellBeingActive || '—',
              sub: '導入済み自治体',
              icon: '💚',
              color: 'text-violet-600',
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm"
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xl">{card.icon}</span>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
              <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-1">{card.sub}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── 地域タイプ分布バー ── */}
      {summary && Object.keys(summary.regionTypes).length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-700 mb-3">地域タイプ別 自治体分布</p>
          <div className="flex flex-wrap gap-2">
            {Object.entries(summary.regionTypes).map(([type, count]) => (
              <div
                key={type}
                className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 rounded-lg px-3 py-1.5"
              >
                <span className="text-xs font-medium text-orange-700">{type}</span>
                <span className="bg-orange-200 text-orange-800 text-xs font-bold px-1.5 rounded">
                  {count}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── ステータスタブ ── */}
      <div className="flex gap-2 flex-wrap">
        {(
          [
            { key: 'all', label: `すべて (${tenants.length})` },
            { key: 'active', label: `導入済み (${summary?.activeTenants ?? 0})` },
            { key: 'evaluating', label: `評価中 (${summary?.evaluatingTenants ?? 0})` },
            { key: 'candidate', label: `検討中 (${summary?.candidateTenants ?? 0})` },
            {
              key: 'none',
              label: `未導入 (${(tenants.length) - (summary?.activeTenants ?? 0) - (summary?.evaluatingTenants ?? 0) - (summary?.candidateTenants ?? 0)})`,
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-orange-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── 自治体カード一覧 ── */}
      {filteredTenants.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center text-gray-500">
          <p className="text-4xl mb-3">🏘️</p>
          <p className="font-medium">登録されたデータがありません</p>
          <p className="text-sm mt-1">「新自治体を追加」ボタンから登録できます</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredTenants.map((tenant) => {
            const isActive = activeMunicipalityId === tenant.id;
            const cfg = STATUS_CONFIG[tenant.tenantStatus] ?? STATUS_CONFIG.none;

            return (
              <div
                key={tenant.id}
                className={`bg-white border rounded-xl p-5 shadow-sm transition-all ${
                  isActive
                    ? 'border-violet-400 ring-2 ring-violet-200'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                {/* カードヘッダー */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-gray-900 text-lg">
                        {tenant.name || '（名称未設定）'}
                      </h3>
                      {isActive && (
                        <span className="bg-violet-100 text-violet-700 text-xs px-2 py-0.5 rounded-full font-medium">
                          作業中
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-gray-500">{tenant.regionType}</span>
                      {tenant.population && (
                        <span className="text-xs text-gray-400">
                          人口 {tenant.population.toLocaleString()}人
                        </span>
                      )}
                    </div>
                  </div>
                  <StatusBadge status={tenant.tenantStatus} />
                </div>

                {/* スコア */}
                <div className="space-y-2 mb-3">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Well-Beingスコア</p>
                    <ScoreBar value={tenant.wellBeingScore} color="bg-violet-500" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">DX成熟度スコア</p>
                    <ScoreBar value={tenant.dxScore} color="bg-blue-500" />
                  </div>
                </div>

                {/* 主要産業 */}
                {tenant.mainIndustries.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-3">
                    {tenant.mainIndustries.map((ind) => (
                      <span
                        key={ind}
                        className="bg-orange-50 text-orange-700 text-xs px-2 py-0.5 rounded border border-orange-200"
                      >
                        {ind}
                      </span>
                    ))}
                  </div>
                )}

                {/* オンボーディング進捗（コンパクト） */}
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-gray-500">オンボーディング進捗</p>
                    <p className="text-xs text-gray-500">
                      {tenant.onboardingSteps.filter((s) => s.completed).length}/
                      {tenant.onboardingSteps.length}
                    </p>
                  </div>
                  <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{
                        width: `${
                          (tenant.onboardingSteps.filter((s) => s.completed).length /
                            tenant.onboardingSteps.length) *
                          100
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* アクションボタン */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSwitch(tenant)}
                    disabled={isActive}
                    className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-violet-100 text-violet-600 cursor-default'
                        : 'bg-violet-600 text-white hover:bg-violet-700'
                    }`}
                  >
                    {isActive ? '✓ 作業中の自治体' : 'この自治体で作業'}
                  </button>
                  <button
                    onClick={() =>
                      setSelectedTenant(
                        selectedTenant?.id === tenant.id ? null : tenant
                      )
                    }
                    className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
                  >
                    {selectedTenant?.id === tenant.id ? '▲ 閉じる' : '詳細 ▼'}
                  </button>
                </div>

                {/* オンボーディング詳細（展開時） */}
                {selectedTenant?.id === tenant.id && (
                  <div className="mt-4 border-t pt-4">
                    <p className="text-sm font-semibold text-gray-700 mb-3">
                      📋 オンボーディングチェックリスト
                    </p>
                    <OnboardingChecklist steps={tenant.onboardingSteps} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── 新自治体登録フォーム ── */}
      {showForm && (
        <div className="bg-white border border-orange-200 rounded-xl p-6 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-4">＋ 新自治体の登録</h2>
          <form onSubmit={handleRegister} className="space-y-4">

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                自治体名 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="例: 五島市、黒部市..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400 focus:border-orange-400"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  地域タイプ
                </label>
                <select
                  value={formRegionType}
                  onChange={(e) => setFormRegionType(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                >
                  {REGION_TYPES.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  人口
                </label>
                <input
                  type="number"
                  value={formPopulation}
                  onChange={(e) => setFormPopulation(e.target.value)}
                  placeholder="例: 12000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                主要産業（複数選択可）
              </label>
              <div className="flex flex-wrap gap-2">
                {MAIN_INDUSTRIES.map((ind) => (
                  <label
                    key={ind}
                    className={`flex items-center gap-1.5 cursor-pointer px-3 py-1.5 rounded-lg border text-sm transition-colors ${
                      formIndustries.includes(ind)
                        ? 'bg-orange-100 border-orange-400 text-orange-800 font-medium'
                        : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="hidden"
                      checked={formIndustries.includes(ind)}
                      onChange={() => toggleIndustry(ind)}
                    />
                    {ind}
                  </label>
                ))}
              </div>
            </div>

            {submitMsg && (
              <div
                className={`rounded-lg px-4 py-3 text-sm ${
                  submitMsg.startsWith('✅')
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {submitMsg}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
              >
                {submitting && (
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {submitting ? '登録中...' : '登録する'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                キャンセル
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── 横展開ロードマップ ── */}
      <div className="bg-gradient-to-br from-violet-50 to-orange-50 border border-violet-200 rounded-xl p-6">
        <h2 className="font-bold text-gray-900 mb-4">
          🗺️ RunWith Platform 横展開ロードマップ
        </h2>
        <div className="space-y-3">
          {[
            {
              phase: 'Phase 1（現在）',
              desc: '屋久島での実証・データ蓄積',
              status: '完了',
              color: 'bg-emerald-100 text-emerald-700',
            },
            {
              phase: 'Phase 2（Sprint #23〜）',
              desc: 'テナント基盤整備・自治体コード管理',
              status: '進行中',
              color: 'bg-blue-100 text-blue-700',
            },
            {
              phase: 'Phase 3',
              desc: '2〜3自治体でのパイロット展開',
              status: '計画中',
              color: 'bg-amber-100 text-amber-700',
            },
            {
              phase: 'Phase 4',
              desc: '全国の限界自治体への本格展開',
              status: '将来',
              color: 'bg-gray-100 text-gray-600',
            },
          ].map((item) => (
            <div
              key={item.phase}
              className="flex items-center gap-3 bg-white rounded-lg p-3 border border-white/80"
            >
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap ${item.color}`}
              >
                {item.status}
              </span>
              <div>
                <p className="text-sm font-medium text-gray-700">{item.phase}</p>
                <p className="text-xs text-gray-500">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
