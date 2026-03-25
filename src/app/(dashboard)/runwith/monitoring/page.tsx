'use client';

// ============================================================
// サービス監視ダッシュボード（API Route経由版）
// CORSエラー対策: Anthropic/Notion APIはサーバーサイドのAPI Routeを経由する
// ============================================================

import { useState } from 'react';

// ============================================================
// 型定義
// ============================================================

type ServiceStatus = 'normal' | 'warning' | 'incident' | 'maintenance' | 'unknown';

interface IncidentEvent {
  time: string;
  service: string;
  summary: string;
  status: ServiceStatus;
}

interface CloudServiceResult {
  id: string;
  name: string;
  status: ServiceStatus;
  officialSummary: string;
  downdetectorSummary: string;
  maintenanceInfo: string;
  lastChecked: string;
}

interface MonitoringResult {
  services: CloudServiceResult[];
  overallAnalysis: string;
  incidents24h: IncidentEvent[];
  retrievedAt: string;
}

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================================
// 監視対象クラウドサービスの表示設定
// APIへの送信はAPI Route側で管理、ここは表示用のみ
// ============================================================
const CLOUD_SERVICES = [
  { id: 'aws',        name: 'AWS',         fullName: 'Amazon Web Services',   icon: '🟠' },
  { id: 'azure',      name: 'Azure',       fullName: 'Microsoft Azure',       icon: '🔵' },
  { id: 'gcp',        name: 'Google Cloud',fullName: 'Google Cloud Platform', icon: '🟡' },
  { id: 'salesforce', name: 'Salesforce',  fullName: 'Salesforce Platform',   icon: '🔷' },
  // ↓ 新サービス追加時はここと api/monitoring/route.ts の両方に追記
];

// ============================================================
// ステータス表示設定
// ============================================================
const STATUS_CONFIG: Record<ServiceStatus, {
  label: string; color: string; bg: string; border: string; dot: string;
}> = {
  normal:      { label: '正常',     color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  warning:     { label: '注意',     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  incident:    { label: '障害発生', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500'     },
  maintenance: { label: 'メンテ中', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  unknown:     { label: '確認中',   color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
};

// ============================================================
// メインコンポーネント
// ============================================================
export default function MonitoringPage() {
  const [result, setResult]       = useState<MonitoringResult | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // ============================================================
  // 監視情報取得関数
  // 直接Anthropic APIではなく自前のAPI Routeを呼ぶ（CORS対策）
  // ============================================================
  const fetchMonitoringData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveStatus('idle');

    try {
      // 自前のAPI Routeにリクエストする（同一ドメインなのでCORSなし）
      const response = await fetch('/api/monitoring', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error ?? `HTTPエラー: ${response.status}`);
      }

      const data: MonitoringResult = await response.json();
      setResult(data);

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      setError(`情報取得に失敗しました: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Notion保存関数
  // save-notion API Routeを経由してNotion APIに保存する
  // ============================================================
  const saveToNotion = async () => {
    if (!result) return;
    setSaveStatus('saving');

    try {
      const response = await fetch('/api/monitoring/save-notion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result }),
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error ?? `保存エラー: ${response.status}`);
      }

      setSaveStatus('saved');

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラー';
      console.error('Notion保存エラー:', message);
      setSaveStatus('error');
    }
  };

  // ============================================================
  // レンダリング
  // ============================================================
  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* ヘッダー */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white text-xl">
                  📡
                </div>
                <h1 className="text-2xl font-bold text-slate-800">サービス監視ダッシュボード</h1>
              </div>
              <p className="text-slate-500 text-sm">
                {result ? `最終更新: ${result.retrievedAt}` : 'AIがDowndetector＋公式ステータスをリアルタイムで分析します'}
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Notion保存ボタン */}
              {result && (
                <button
                  onClick={saveToNotion}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className={`flex items-center gap-2 font-semibold px-4 py-3 rounded-xl transition-colors duration-200 text-sm
                    ${saveStatus === 'saved'  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                    : saveStatus === 'error'  ? 'bg-red-100 text-red-700 border border-red-300 cursor-pointer'
                    : saveStatus === 'saving' ? 'bg-slate-100 text-slate-400 border border-slate-200'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'}`}
                >
                  {saveStatus === 'saving' && <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>}
                  <span>
                    {saveStatus === 'idle'    && '📒 Notionに保存'}
                    {saveStatus === 'saving'  && '保存中...'}
                    {saveStatus === 'saved'   && '✅ 保存済み'}
                    {saveStatus === 'error'   && '⚠️ 失敗（再試行）'}
                  </span>
                </button>
              )}

              {/* 更新ボタン */}
              <button
                onClick={fetchMonitoringData}
                disabled={loading}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-semibold px-6 py-3 rounded-xl transition-colors duration-200 shadow-sm"
              >
                {loading
                  ? <><svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg><span>AI調査中...</span></>
                  : <><span>🔄</span><span>今すぐ更新</span></>
                }
              </button>
            </div>
          </div>
        </div>

        {/* ローディング */}
        {loading && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3 animate-pulse">🤖</div>
            <p className="text-orange-700 font-semibold mb-1">AIが情報収集中です</p>
            <p className="text-orange-600 text-sm">公式ステータスページとDowndetectorを横断調査しています（最大15秒程度）</p>
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              {CLOUD_SERVICES.map((s, i) => (
                <div key={s.id} className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.3}s` }}>
                  {s.icon} {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* エラー */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-6">
            <div className="flex items-center gap-3 text-red-700">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="font-semibold">エラーが発生しました</p>
                <p className="text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 初期表示 */}
        {!loading && !result && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📡</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">監視を開始しましょう</h2>
            <p className="text-slate-500 mb-6">「今すぐ更新」ボタンを押すと、AIが各クラウドサービスの稼働状況をリアルタイムで調査します</p>
            <div className="flex flex-wrap justify-center gap-3">
              {CLOUD_SERVICES.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm">
                  <span>{s.icon}</span><span>{s.name}</span>
                </div>
              ))}
            </div>
            <div className="mt-8 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
              <span>📒</span><span>結果取得後、「Notionに保存」で記録DBに蓄積できます</span>
            </div>
          </div>
        )}

        {/* 結果表示 */}
        {result && (
          <>
            {/* サービスカード一覧 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.services.map(service => {
                const config = CLOUD_SERVICES.find(s => s.id === service.id);
                const st = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.unknown;
                return (
                  <div key={service.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${st.border}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{config?.icon ?? '☁️'}</span>
                        <div>
                          <p className="font-bold text-slate-800">{service.name}</p>
                          <p className="text-xs text-slate-400">{config?.fullName}</p>
                        </div>
                      </div>
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${st.bg} ${st.color}`}>
                        <span className={`w-2 h-2 rounded-full ${st.dot} ${service.status === 'incident' ? 'animate-pulse' : ''}`} />
                        {st.label}
                      </div>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">📋 公式ステータス</p>
                        <p className="text-sm text-slate-700">{service.officialSummary}</p>
                      </div>
                      <div className="bg-slate-50 rounded-xl p-3">
                        <p className="text-xs font-semibold text-slate-400 mb-1">📊 Downdetector</p>
                        <p className="text-sm text-slate-700">{service.downdetectorSummary}</p>
                      </div>
                      <div className={`rounded-xl p-3 ${service.maintenanceInfo === '予定なし' ? 'bg-slate-50' : 'bg-blue-50'}`}>
                        <p className="text-xs font-semibold text-slate-400 mb-1">🔧 メンテナンス</p>
                        <p className={`text-sm ${service.maintenanceInfo === '予定なし' ? 'text-slate-400' : 'text-blue-700 font-medium'}`}>
                          {service.maintenanceInfo}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* AI総合分析 */}
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-lg">🤖</div>
                <h2 className="text-lg font-bold text-slate-800">AI 総合分析</h2>
              </div>
              <p className="text-slate-700 leading-relaxed">{result.overallAnalysis}</p>
            </div>

            {/* 過去24時間タイムライン */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center text-lg">📋</div>
                <h2 className="text-lg font-bold text-slate-800">過去24時間の障害タイムライン</h2>
              </div>
              {result.incidents24h.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                  <div className="text-3xl mb-2">✅</div>
                  <p className="text-sm">過去24時間に障害・メンテナンスの記録はありません</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {result.incidents24h.map((event, i) => {
                    const st = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.unknown;
                    return (
                      <div key={i} className={`flex items-start gap-4 p-4 rounded-xl border ${st.bg} ${st.border}`}>
                        <div className="text-sm font-mono font-bold text-slate-500 whitespace-nowrap mt-0.5">{event.time}</div>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${st.dot}`} />
                        <div className="flex-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.bg} ${st.color} mr-2`}>{event.service}</span>
                          <span className="text-sm text-slate-700">{event.summary}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Notion保存バナー */}
            {saveStatus === 'idle' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-xl">📒</span>
                  <div>
                    <p className="font-semibold text-sm">この結果をNotionに保存しますか？</p>
                    <p className="text-xs text-slate-400 mt-0.5">記録DBに蓄積して、他の機能データとのAI横断分析に活用できます</p>
                  </div>
                </div>
                <button onClick={saveToNotion} className="flex-shrink-0 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-colors duration-200">
                  保存する →
                </button>
              </div>
            )}
            {saveStatus === 'saved' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-semibold text-sm">Notionに保存しました</p>
                  <p className="text-xs text-emerald-600 mt-0.5">「📊 RunWithプラットフォーム 記録DB」に記録されました</p>
                </div>
              </div>
            )}

            <div className="text-center text-xs text-slate-400 pb-4">
              この情報は {result.retrievedAt} 時点にAIが収集したものです。
            </div>
          </>
        )}
      </div>
    </div>
  );
}
