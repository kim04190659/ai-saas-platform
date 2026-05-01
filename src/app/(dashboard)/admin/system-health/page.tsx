'use client';

// =====================================================
//  src/app/(dashboard)/admin/system-health/page.tsx
//  システムヘルス管理画面 — Sprint #79/#80
//
//  ■ 役割
//    Notion・Vercel・LINE 各サービスの死活状態を確認する管理者向けページ。
//    手動でヘルスチェックを実行し、結果をリアルタイムで表示する。
//    Sprint #80 追加: Supabase バックアップの状態確認と手動実行。
//
//  ■ 表示内容
//    - 各サービスのステータス（正常 / 遅延 / 障害）
//    - Notion の応答時間
//    - 最終確認時刻
//    - 過去の確認履歴（セッション内）
//    - バックアップ最終実行時刻・件数（Sprint #80）
// =====================================================

import { useState, useCallback, useEffect } from 'react';
import {
  Activity,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Clock,
  Database,
  MessageSquare,
  Globe,
  Bell,
  HardDrive,
} from 'lucide-react';

// ─── 型定義 ─────────────────────────────────────────

interface ServiceStatus {
  name:       string;
  icon:       React.ReactNode;
  status:     'ok' | 'degraded' | 'down' | 'unknown';
  message:    string;
  responseMs: number | null;
  checkedAt:  string | null;
}

interface HealthLog {
  checkedAt: string;
  status:    'ok' | 'degraded' | 'down';
  message:   string;
  responseMs: number;
}

// ─── ステータス表示ヘルパー ───────────────────────────

function StatusBadge({ status }: { status: ServiceStatus['status'] }) {
  const config = {
    ok:      { icon: <CheckCircle  size={16} />, label: '正常',  cls: 'bg-green-100 text-green-800'  },
    degraded:{ icon: <AlertTriangle size={16}/>, label: '遅延',  cls: 'bg-yellow-100 text-yellow-800'},
    down:    { icon: <XCircle      size={16} />, label: '障害',  cls: 'bg-red-100 text-red-800'      },
    unknown: { icon: <Clock        size={16} />, label: '未確認',cls: 'bg-gray-100 text-gray-600'    },
  }[status];

  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.cls}`}>
      {config.icon}{config.label}
    </span>
  );
}

// ─── バックアップ状態の型 ────────────────────────────

interface BackupInfo {
  lastBackedUpAt: string | null
  totalEntries:   number
  loading:        boolean
  error:          string | null
}

// ─── メインコンポーネント ────────────────────────────

export default function SystemHealthPage() {
  // Notion のステータス
  const [notionStatus, setNotionStatus] = useState<ServiceStatus>({
    name:       'Notion',
    icon:       <Database size={20} />,
    status:     'unknown',
    message:    'まだ確認していません',
    responseMs: null,
    checkedAt:  null,
  });

  // 確認履歴（セッション内・最大20件）
  const [logs, setLogs] = useState<HealthLog[]>([]);

  // ローディング状態
  const [loading, setLoading] = useState(false);

  // ── バックアップ状態 ─────────────────────────────────
  const [backup, setBackup] = useState<BackupInfo>({
    lastBackedUpAt: null,
    totalEntries:   0,
    loading:        false,
    error:          null,
  });
  const [backupRunning, setBackupRunning] = useState(false);

  // ── Notion ヘルスチェックを手動実行 ──────────────────
  const checkNotionHealth = useCallback(async () => {
    setLoading(true);
    try {
      // notify=false: 手動確認なので LINE 通知はスキップ
      const res  = await fetch('/api/admin/notion-health?notify=false');
      const data = await res.json();

      const newStatus: ServiceStatus = {
        name:       'Notion',
        icon:       <Database size={20} />,
        status:     data.status     ?? 'unknown',
        message:    data.message    ?? '不明なエラー',
        responseMs: data.responseMs ?? null,
        checkedAt:  data.checkedAt  ?? new Date().toISOString(),
      };
      setNotionStatus(newStatus);

      // 履歴に追加
      if (data.status && data.checkedAt) {
        setLogs((prev) => [
          {
            checkedAt:  data.checkedAt,
            status:     data.status,
            message:    data.message,
            responseMs: data.responseMs ?? 0,
          },
          ...prev.slice(0, 19), // 最大20件
        ]);
      }
    } catch {
      setNotionStatus((prev) => ({
        ...prev,
        status:  'down',
        message: '確認リクエスト自体が失敗しました',
        checkedAt: new Date().toISOString(),
      }));
    } finally {
      setLoading(false);
    }
  }, []);

  // ── バックアップ状態をページロード時に取得 ────────────
  const fetchBackupStatus = useCallback(async () => {
    setBackup((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res  = await fetch('/api/admin/notion-backup');
      const data = await res.json();
      setBackup({
        lastBackedUpAt: data.lastBackedUpAt ?? null,
        totalEntries:   data.totalEntries   ?? 0,
        loading:        false,
        error:          null,
      });
    } catch {
      setBackup((prev) => ({ ...prev, loading: false, error: 'バックアップ状態の取得に失敗しました' }));
    }
  }, []);

  useEffect(() => { fetchBackupStatus(); }, [fetchBackupStatus]);

  // ── 手動バックアップ実行 ──────────────────────────────
  const runBackup = useCallback(async () => {
    setBackupRunning(true);
    try {
      await fetch('/api/admin/notion-backup', { method: 'POST' });
      // 完了後にステータスを再取得
      await fetchBackupStatus();
    } catch {
      setBackup((prev) => ({ ...prev, error: 'バックアップ実行に失敗しました' }));
    } finally {
      setBackupRunning(false);
    }
  }, [fetchBackupStatus]);

  // ── 他サービスは静的表示（将来拡張予定）─────────────

  const staticServices: ServiceStatus[] = [
    {
      name:       'Vercel（ホスティング）',
      icon:       <Globe size={20} />,
      status:     'ok',
      message:    'このページが表示されているため正常',
      responseMs: null,
      checkedAt:  null,
    },
    {
      name:       'LINE Messaging API',
      icon:       <MessageSquare size={20} />,
      status:     'unknown',
      message:    '自動チェック未実装（手動で送信テストを行ってください）',
      responseMs: null,
      checkedAt:  null,
    },
  ];

  // ── ステータスに応じた背景色 ──────────────────────────
  const cardBg = {
    ok:      'border-green-200 bg-green-50',
    degraded:'border-yellow-200 bg-yellow-50',
    down:    'border-red-200 bg-red-50',
    unknown: 'border-gray-200 bg-gray-50',
  }[notionStatus.status];

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* ── ヘッダー ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Activity size={24} className="text-gray-700" />
          <div>
            <h1 className="text-xl font-semibold text-gray-800">システムヘルス</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              外部サービスの死活状態を確認します
            </p>
          </div>
        </div>
        <button
          onClick={checkNotionHealth}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg
                     hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors text-sm font-medium"
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          {loading ? '確認中...' : '今すぐ確認'}
        </button>
      </div>

      {/* ── BCP ステータスバナー ── */}
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-blue-700 leading-relaxed">
        <span className="font-semibold">💡 BCP 方針：</span>
        Notion に障害が発生した場合、RunWith Platform は
        <span className="font-semibold">「最後のバックアップ時点のデータ」で読み取り専用モードに移行</span>
        します。
        データの書き込みは復旧後に自動的に同期されます。
        Cron ジョブが5分ごとに自動チェックを実行し、障害を検知した際は管理者に LINE 通知を送信します。
      </div>

      {/* ── Notion ステータスカード ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <Bell size={14} />
          自動監視対象（Cron 5分ごと）
        </h2>

        <div className={`rounded-xl border-2 ${cardBg} p-5`}>
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-600">{notionStatus.icon}</span>
              <div>
                <p className="font-semibold text-gray-800">{notionStatus.name}</p>
                <p className="text-sm text-gray-600 mt-0.5">{notionStatus.message}</p>
              </div>
            </div>
            <StatusBadge status={notionStatus.status} />
          </div>

          {/* 詳細メトリクス */}
          {notionStatus.checkedAt && (
            <div className="mt-4 flex gap-6 text-xs text-gray-500">
              <span>
                <span className="font-medium">応答時間：</span>
                {notionStatus.responseMs !== null
                  ? `${notionStatus.responseMs.toLocaleString()} ms`
                  : 'タイムアウト'}
              </span>
              <span>
                <span className="font-medium">確認時刻：</span>
                {new Date(notionStatus.checkedAt).toLocaleString('ja-JP', {
                  timeZone: 'Asia/Tokyo',
                  month: 'numeric', day: 'numeric',
                  hour: '2-digit', minute: '2-digit', second: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* ── その他サービス（静的） ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <Globe size={14} />
          その他のサービス
        </h2>
        <div className="space-y-3">
          {staticServices.map((svc) => (
            <div key={svc.name} className="flex items-center justify-between
                                           rounded-lg border border-gray-200 bg-white p-4">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">{svc.icon}</span>
                <div>
                  <p className="text-sm font-medium text-gray-800">{svc.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{svc.message}</p>
                </div>
              </div>
              <StatusBadge status={svc.status} />
            </div>
          ))}
        </div>
      </section>

      {/* ── 確認履歴 ── */}
      {logs.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-600 mb-3">
            📋 確認履歴（今セッション内）
          </h2>
          <div className="rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left p-3 text-gray-500 font-medium">確認時刻</th>
                  <th className="text-left p-3 text-gray-500 font-medium">ステータス</th>
                  <th className="text-left p-3 text-gray-500 font-medium">応答</th>
                  <th className="text-left p-3 text-gray-500 font-medium">詳細</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {logs.map((log, i) => (
                  <tr key={i} className="bg-white hover:bg-gray-50">
                    <td className="p-3 text-gray-600">
                      {new Date(log.checkedAt).toLocaleString('ja-JP', {
                        timeZone: 'Asia/Tokyo',
                        hour: '2-digit', minute: '2-digit', second: '2-digit',
                      })}
                    </td>
                    <td className="p-3">
                      <StatusBadge status={log.status} />
                    </td>
                    <td className="p-3 text-gray-600">
                      {log.responseMs > 0 ? `${log.responseMs.toLocaleString()} ms` : '—'}
                    </td>
                    <td className="p-3 text-gray-600">{log.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ── バックアップ状態 ── */}
      <section>
        <h2 className="text-sm font-semibold text-gray-600 mb-3 flex items-center gap-2">
          <HardDrive size={14} />
          Supabase バックアップ（毎日 1:00 AM 自動実行）
        </h2>
        <div className="rounded-xl border border-gray-200 bg-white p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <span className="text-gray-500"><HardDrive size={20} /></span>
              <div>
                <p className="font-semibold text-gray-800 text-sm">Notion → Supabase バックアップ</p>
                {backup.loading ? (
                  <p className="text-xs text-gray-400 mt-0.5">読み込み中...</p>
                ) : backup.error ? (
                  <p className="text-xs text-red-500 mt-0.5">{backup.error}</p>
                ) : backup.lastBackedUpAt ? (
                  <p className="text-xs text-gray-500 mt-0.5">
                    最終バックアップ：
                    {new Date(backup.lastBackedUpAt).toLocaleString('ja-JP', {
                      timeZone: 'Asia/Tokyo',
                      month: 'numeric', day: 'numeric',
                      hour: '2-digit', minute: '2-digit',
                    })}
                    　({backup.totalEntries} エントリ保存済み)
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 mt-0.5">まだバックアップが実行されていません</p>
                )}
              </div>
            </div>
            <button
              onClick={runBackup}
              disabled={backupRunning}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 text-white rounded-lg
                         hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed
                         transition-colors text-xs font-medium whitespace-nowrap"
            >
              <RefreshCw size={12} className={backupRunning ? 'animate-spin' : ''} />
              {backupRunning ? '実行中...' : '今すぐバックアップ'}
            </button>
          </div>
          <p className="mt-3 text-xs text-gray-400 leading-relaxed">
            全自治体の住民相談・WBコーチング・施策実行記録の3DBを Supabase に保存します。
            自治体×DB種別ごとに最新3世代を保持します。
          </p>
        </div>
      </section>

      {/* ── 設定確認 ── */}
      <section className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <p className="text-xs font-semibold text-gray-700 mb-2">⚙️ 管理者通知の設定</p>
        <p className="text-xs text-gray-500 leading-relaxed">
          障害検知時の LINE 通知を受け取るには、Vercel の環境変数に
          <code className="bg-gray-200 px-1 rounded mx-1">ADMIN_LINE_USER_ID</code>
          を設定してください。
          管理者の LINE ユーザーID は、LINE 公式アカウントにメッセージを送信した際の
          Webhook ログから取得できます。
        </p>
      </section>
    </div>
  );
}
