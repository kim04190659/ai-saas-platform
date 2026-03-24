'use client';

// ============================================================
// サービス監視ダッシュボード（Notion保存機能付き）
// RunWithモジュール - クラウドサービス稼働状況監視ページ
// AIがDowndetector＋公式ステータスを統合分析して表示する
// 結果はNotionの記録DBに自動保存して横断分析に活用する
// ============================================================

import { useState } from 'react';

// ============================================================
// 型定義
// ============================================================

/** ステータスの種類 */
type ServiceStatus = 'normal' | 'warning' | 'incident' | 'maintenance' | 'unknown';

/** 過去24時間の障害イベント */
interface IncidentEvent {
  time: string;
  service: string;
  summary: string;
  status: ServiceStatus;
}

/** 各クラウドサービスの監視結果 */
interface CloudServiceResult {
  id: string;
  name: string;
  status: ServiceStatus;
  officialSummary: string;
  downdetectorSummary: string;
  maintenanceInfo: string;
  lastChecked: string;
}

/** AI分析の全体結果 */
interface MonitoringResult {
  services: CloudServiceResult[];
  overallAnalysis: string;
  incidents24h: IncidentEvent[];
  retrievedAt: string;
}

/** Notion保存の状態 */
type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

// ============================================================
// 監視対象クラウドサービスの設定リスト
// 新しいサービスを追加するときはここに1行追加するだけでOK
// ============================================================
const CLOUD_SERVICES = [
  {
    id: 'aws',
    name: 'AWS',
    fullName: 'Amazon Web Services',
    icon: '🟠',
    officialUrl: 'status.aws.amazon.com',
    downdetectorUrl: 'downdetector.jp/status/amazon-web-services',
  },
  {
    id: 'azure',
    name: 'Azure',
    fullName: 'Microsoft Azure',
    icon: '🔵',
    officialUrl: 'status.azure.com',
    downdetectorUrl: 'downdetector.jp/status/microsoft-azure',
  },
  {
    id: 'gcp',
    name: 'Google Cloud',
    fullName: 'Google Cloud Platform',
    icon: '🟡',
    officialUrl: 'status.cloud.google.com',
    downdetectorUrl: 'downdetector.jp/status/google-cloud',
  },
  {
    id: 'salesforce',
    name: 'Salesforce',
    fullName: 'Salesforce Platform',
    icon: '🔷',
    officialUrl: 'status.salesforce.com',
    downdetectorUrl: 'downdetector.jp/status/salesforce',
  },
  // ↓ 新しいサービスを追加する場合はここに追記
  // { id: 'oracle', name: 'Oracle Cloud', fullName: 'Oracle Cloud Infrastructure',
  //   icon: '🔴', officialUrl: 'ocistatus.oraclecloud.com', downdetectorUrl: 'downdetector.jp/status/oracle-cloud' },
];

// ============================================================
// ステータスに対応する表示設定
// ============================================================
const STATUS_CONFIG: Record<ServiceStatus, {
  label: string;
  color: string;
  bg: string;
  border: string;
  dot: string;
}> = {
  normal:      { label: '正常',     color: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', dot: 'bg-emerald-500' },
  warning:     { label: '注意',     color: 'text-amber-700',   bg: 'bg-amber-50',   border: 'border-amber-200',   dot: 'bg-amber-500'   },
  incident:    { label: '障害発生', color: 'text-red-700',     bg: 'bg-red-50',     border: 'border-red-200',     dot: 'bg-red-500'     },
  maintenance: { label: 'メンテ中', color: 'text-blue-700',    bg: 'bg-blue-50',    border: 'border-blue-200',    dot: 'bg-blue-500'    },
  unknown:     { label: '確認中',   color: 'text-slate-500',   bg: 'bg-slate-50',   border: 'border-slate-200',   dot: 'bg-slate-400'   },
};

// ============================================================
// 全体ステータスを判定する関数
// 監視結果から最も深刻なステータスを返す
// ============================================================
function getOverallStatus(services: CloudServiceResult[]): ServiceStatus {
  if (services.some(s => s.status === 'incident'))    return 'incident';
  if (services.some(s => s.status === 'warning'))     return 'warning';
  if (services.some(s => s.status === 'maintenance')) return 'maintenance';
  if (services.every(s => s.status === 'normal'))     return 'normal';
  return 'unknown';
}

// ============================================================
// 全体ステータスをレベル/ランク文字列に変換する関数
// Notionのレベル/ランクフィールドに格納する
// ============================================================
function statusToRank(status: ServiceStatus): string {
  const map: Record<ServiceStatus, string> = {
    normal:      '正常',
    warning:     '注意あり',
    incident:    '障害発生中',
    maintenance: 'メンテナンス中',
    unknown:     '確認中',
  };
  return map[status];
}

// ============================================================
// AIプロンプト生成関数
// ============================================================
function buildMonitoringPrompt(services: typeof CLOUD_SERVICES): string {
  const serviceList = services.map(s =>
    `- ${s.fullName}（公式: ${s.officialUrl} / Downdetector: ${s.downdetectorUrl}）`
  ).join('\n');

  return `
あなたはITサービス監視の専門家です。
以下のクラウドサービスについて、現在の稼働状況と過去24時間の障害情報を調査してください。

【調査対象サービス】
${serviceList}

【調査する情報】
1. 各サービスの公式ステータスページの現在の状態
2. Downdetector（downdetector.jp）での各サービスの障害報告状況
3. 予定メンテナンス情報
4. 過去24時間に発生した障害・インシデント

【回答形式】
必ず以下のJSON形式のみで回答してください。前置きや説明文は不要です。

{
  "services": [
    {
      "id": "サービスID（aws/azure/gcp/salesforce）",
      "name": "サービス表示名",
      "status": "normal または warning または incident または maintenance または unknown",
      "officialSummary": "公式ステータスページの状況（50文字以内）",
      "downdetectorSummary": "Downdetectorの障害報告状況（50文字以内）",
      "maintenanceInfo": "予定メンテナンス情報。なければ「予定なし」",
      "lastChecked": "現在時刻（HH:MM形式）"
    }
  ],
  "overallAnalysis": "全体的な状況の分析コメント（100文字以内）",
  "incidents24h": [
    {
      "time": "発生時刻（HH:MM形式）",
      "service": "サービス名",
      "summary": "障害概要（40文字以内）",
      "status": "incident または warning または maintenance"
    }
  ],
  "retrievedAt": "現在の日本時間（YYYY/MM/DD HH:MM形式）"
}

incidents24hは過去24時間に障害・メンテナンスがあった場合のみ含める。何もなければ空配列にする。
statusの値は必ず normal/warning/incident/maintenance/unknown のいずれかにする。
`;
}

// ============================================================
// NotionへのMCP経由保存プロンプトを生成する関数
// Anthropic APIのNotion MCP機能を使って記録DBに保存する
// ============================================================
function buildNotionSavePrompt(result: MonitoringResult): string {
  // 正常なサービス数を計算する
  const normalCount = result.services.filter(s => s.status === 'normal').length;
  const totalCount = result.services.length;
  const overallStatus = getOverallStatus(result.services);
  const rank = statusToRank(overallStatus);

  // 問題のあるサービスをリストアップする
  const problemServices = result.services
    .filter(s => s.status !== 'normal')
    .map(s => `${s.name}(${STATUS_CONFIG[s.status]?.label ?? s.status})`)
    .join('、') || 'なし';

  // 補足情報として各サービスの詳細をまとめる
  const detail = result.services.map(s =>
    `${s.name}: ${STATUS_CONFIG[s.status]?.label ?? s.status} / ${s.officialSummary} / DD:${s.downdetectorSummary}`
  ).join('\n');

  return `
以下の情報をNotionの「📊 RunWithプラットフォーム 記録DB」（collection ID: 32b960a9-1e23-810f-b27f-000b2a3ac6dd）に新しいページとして保存してください。

【保存するデータ】
- タイトル: 📡 サービス監視 — ${result.retrievedAt}
- 種別: サービス監視
- 記録日時: ${result.retrievedAt.split(' ')[0].replace(/\//g, '-')}
- レベル/ランク: ${rank}
- スコア: ${normalCount}
- 最大スコア: ${totalCount}
- 弱点・改善領域: ${problemServices}
- 補足情報: ${result.overallAnalysis}\n\n【各サービス詳細】\n${detail}\n\n【過去24時間の障害】\n${result.incidents24h.length > 0 ? result.incidents24h.map(i => `${i.time} ${i.service}: ${i.summary}`).join('\n') : 'なし'}

上記の内容でNotionのデータベースにページを作成してください。
種別フィールドに「サービス監視」という選択肢がない場合は、新しい選択肢として追加してください。
`;
}

// ============================================================
// メインコンポーネント
// ============================================================
export default function MonitoringPage() {
  // 監視結果の状態管理
  const [result, setResult] = useState<MonitoringResult | null>(null);
  // ローディング状態
  const [loading, setLoading] = useState(false);
  // エラーメッセージ
  const [error, setError] = useState<string | null>(null);
  // Notion保存の状態
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');

  // ============================================================
  // AIによる監視情報取得関数
  // ============================================================
  const fetchMonitoringData = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    setSaveStatus('idle');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          // Web検索ツールを有効化してリアルタイム情報を取得する
          tools: [{ type: 'web_search_20250305', name: 'web_search' }],
          messages: [{ role: 'user', content: buildMonitoringPrompt(CLOUD_SERVICES) }],
        }),
      });

      if (!response.ok) throw new Error(`API エラー: ${response.status}`);

      const data = await response.json();

      // レスポンスからテキスト部分を抽出する
      const textContent = data.content
        ?.filter((item: { type: string }) => item.type === 'text')
        ?.map((item: { text: string }) => item.text)
        ?.join('') ?? '';

      if (!textContent) throw new Error('AIからの応答が空でした');

      // JSON部分を抽出してパースする
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error('JSON形式の応答を取得できませんでした');

      const parsed: MonitoringResult = JSON.parse(jsonMatch[0]);
      setResult(parsed);

    } catch (err) {
      const message = err instanceof Error ? err.message : '不明なエラーが発生しました';
      setError(`情報取得に失敗しました: ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ============================================================
  // Notionへの保存関数
  // Anthropic APIのNotion MCP経由で記録DBに保存する
  // ============================================================
  const saveToNotion = async () => {
    if (!result) return;
    setSaveStatus('saving');

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          // Notion MCPサーバーを接続してDBに保存する
          mcp_servers: [
            {
              type: 'url',
              url: 'https://mcp.notion.com/mcp',
              name: 'notion-mcp',
            },
          ],
          messages: [{ role: 'user', content: buildNotionSavePrompt(result) }],
        }),
      });

      if (!response.ok) throw new Error(`保存APIエラー: ${response.status}`);

      const data = await response.json();

      // レスポンスに成功を示すテキストが含まれているか確認する
      const responseText = data.content
        ?.filter((item: { type: string }) => item.type === 'text')
        ?.map((item: { text: string }) => item.text)
        ?.join('') ?? '';

      // エラーレスポンスでないことを確認する
      if (responseText.includes('error') && !responseText.includes('success')) {
        throw new Error('Notionへの保存に失敗しました');
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

        {/* ===== ヘッダーセクション ===== */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">

            {/* タイトルエリア */}
            <div>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 bg-orange-600 rounded-xl flex items-center justify-center text-white text-xl">
                  📡
                </div>
                <h1 className="text-2xl font-bold text-slate-800">
                  サービス監視ダッシュボード
                </h1>
              </div>
              <p className="text-slate-500 text-sm">
                {result
                  ? `最終更新: ${result.retrievedAt}`
                  : 'AIがDowndetector＋公式ステータスをリアルタイムで分析します'}
              </p>
            </div>

            {/* ボタンエリア */}
            <div className="flex items-center gap-3">

              {/* Notion保存ボタン（結果がある場合のみ表示） */}
              {result && (
                <button
                  onClick={saveToNotion}
                  disabled={saveStatus === 'saving' || saveStatus === 'saved'}
                  className={`flex items-center gap-2 font-semibold px-4 py-3 rounded-xl transition-colors duration-200 text-sm
                    ${saveStatus === 'saved'
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : saveStatus === 'error'
                      ? 'bg-red-100 text-red-700 border border-red-300'
                      : saveStatus === 'saving'
                      ? 'bg-slate-100 text-slate-400 border border-slate-200'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200'
                    }`}
                >
                  {saveStatus === 'saving' && (
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                  )}
                  {saveStatus === 'idle'   && <span>📒</span>}
                  {saveStatus === 'saving' && <span>保存中...</span>}
                  {saveStatus === 'saved'  && <span>✅ Notionに保存済み</span>}
                  {saveStatus === 'error'  && <span>⚠️ 保存失敗（再試行）</span>}
                  {saveStatus === 'idle'   && <span>Notionに保存</span>}
                </button>
              )}

              {/* 更新ボタン */}
              <button
                onClick={fetchMonitoringData}
                disabled={loading}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:bg-orange-300 text-white font-semibold px-6 py-3 rounded-xl transition-colors duration-200 shadow-sm"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>AI調査中...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>今すぐ更新</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* ===== ローディング中の説明 ===== */}
        {loading && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 text-center">
            <div className="text-4xl mb-3 animate-pulse">🤖</div>
            <p className="text-orange-700 font-semibold mb-1">AIが情報収集中です</p>
            <p className="text-orange-600 text-sm">
              公式ステータスページとDowndetectorを横断調査しています（最大15秒程度かかります）
            </p>
            <div className="mt-4 flex justify-center gap-2 flex-wrap">
              {CLOUD_SERVICES.map((s, i) => (
                <div
                  key={s.id}
                  className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded-full animate-pulse"
                  style={{ animationDelay: `${i * 0.3}s` }}
                >
                  {s.icon} {s.name}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== エラー表示 ===== */}
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

        {/* ===== 初期表示（未取得状態） ===== */}
        {!loading && !result && !error && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 text-center">
            <div className="text-6xl mb-4">📡</div>
            <h2 className="text-xl font-bold text-slate-700 mb-2">監視を開始しましょう</h2>
            <p className="text-slate-500 mb-6">
              「今すぐ更新」ボタンを押すと、AIが各クラウドサービスの<br />
              稼働状況をリアルタイムで調査します
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {CLOUD_SERVICES.map(s => (
                <div key={s.id} className="flex items-center gap-2 bg-slate-100 text-slate-600 px-4 py-2 rounded-full text-sm">
                  <span>{s.icon}</span>
                  <span>{s.name}</span>
                </div>
              ))}
            </div>
            {/* Notionとの連携説明 */}
            <div className="mt-8 inline-flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-500">
              <span>📒</span>
              <span>結果取得後、「Notionに保存」で記録DBに蓄積できます</span>
            </div>
          </div>
        )}

        {/* ===== 結果表示エリア ===== */}
        {result && (
          <>
            {/* ----- サービスステータスカード一覧 ----- */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {result.services.map(service => {
                const config = CLOUD_SERVICES.find(s => s.id === service.id);
                const statusStyle = STATUS_CONFIG[service.status] ?? STATUS_CONFIG.unknown;

                return (
                  <div key={service.id} className={`bg-white rounded-2xl border shadow-sm p-5 ${statusStyle.border}`}>
                    {/* カードヘッダー */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{config?.icon ?? '☁️'}</span>
                        <div>
                          <p className="font-bold text-slate-800">{service.name}</p>
                          <p className="text-xs text-slate-400">{config?.fullName}</p>
                        </div>
                      </div>
                      {/* ステータスバッジ */}
                      <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold ${statusStyle.bg} ${statusStyle.color}`}>
                        <span className={`w-2 h-2 rounded-full ${statusStyle.dot} ${service.status === 'incident' ? 'animate-pulse' : ''}`} />
                        {statusStyle.label}
                      </div>
                    </div>

                    {/* 情報グリッド */}
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

            {/* ----- AI総合分析カード ----- */}
            <div className="bg-white rounded-2xl border border-orange-200 shadow-sm p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center text-lg">🤖</div>
                <h2 className="text-lg font-bold text-slate-800">AI 総合分析</h2>
              </div>
              <p className="text-slate-700 leading-relaxed">{result.overallAnalysis}</p>
            </div>

            {/* ----- 過去24時間の障害タイムライン ----- */}
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
                  {result.incidents24h.map((event, index) => {
                    const eventStyle = STATUS_CONFIG[event.status] ?? STATUS_CONFIG.unknown;
                    return (
                      <div key={index} className={`flex items-start gap-4 p-4 rounded-xl border ${eventStyle.bg} ${eventStyle.border}`}>
                        <div className="text-sm font-mono font-bold text-slate-500 whitespace-nowrap mt-0.5">{event.time}</div>
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${eventStyle.dot}`} />
                        <div className="flex-1">
                          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${eventStyle.bg} ${eventStyle.color} mr-2`}>
                            {event.service}
                          </span>
                          <span className="text-sm text-slate-700">{event.summary}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ----- Notion保存案内バナー ----- */}
            {saveStatus === 'idle' && (
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3 text-slate-600">
                  <span className="text-xl">📒</span>
                  <div>
                    <p className="font-semibold text-sm">この結果をNotionに保存しますか？</p>
                    <p className="text-xs text-slate-400 mt-0.5">記録DBに蓄積して、他の機能のデータとAI横断分析に活用できます</p>
                  </div>
                </div>
                <button
                  onClick={saveToNotion}
                  className="flex-shrink-0 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold px-4 py-2 rounded-xl text-sm transition-colors duration-200"
                >
                  保存する →
                </button>
              </div>
            )}

            {/* Notion保存完了メッセージ */}
            {saveStatus === 'saved' && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-700">
                <span className="text-xl">✅</span>
                <div>
                  <p className="font-semibold text-sm">Notionに保存しました</p>
                  <p className="text-xs text-emerald-600 mt-0.5">「📊 RunWithプラットフォーム 記録DB」に記録されました</p>
                </div>
              </div>
            )}

            {/* フッター */}
            <div className="text-center text-xs text-slate-400 pb-4">
              この情報は {result.retrievedAt} 時点にAIが収集したものです。
              最新情報は各サービスの公式ステータスページをご確認ください。
            </div>
          </>
        )}

      </div>
    </div>
  );
}
