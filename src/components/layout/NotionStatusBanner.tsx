'use client';

// =====================================================
//  src/components/layout/NotionStatusBanner.tsx
//  Notion 障害・遅延時のバナー通知 — Sprint #81
//
//  ■ 役割
//    Notion API の状態を定期的に確認し、障害または遅延が
//    発生している場合に画面上部にバナーを表示する。
//
//  ■ 表示条件
//    - 'ok'      → 非表示
//    - 'degraded'→ 黄色バナー「Notion の応答が遅くなっています」
//    - 'down'    → 赤バナー「Notion に接続できません。バックアップデータで表示中」
//    - 'unknown' → 非表示（初回チェック前）
//
//  ■ チェック頻度
//    - ページロード時に1回実行
//    - その後 5分ごとに再チェック（軽量エンドポイントを使用）
// =====================================================

import { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, XCircle, X, RefreshCw } from 'lucide-react';

// ─── 型定義 ──────────────────────────────────────────

type NotionStatus = 'ok' | 'degraded' | 'down' | 'unknown';

// ─── メインコンポーネント ─────────────────────────────

export default function NotionStatusBanner() {
  const [status,     setStatus]     = useState<NotionStatus>('unknown');
  const [checkedAt,  setCheckedAt]  = useState<string | null>(null);
  const [dismissed,  setDismissed]  = useState(false);

  // ── Notion ヘルスチェック ─────────────────────────────
  const checkHealth = useCallback(async () => {
    try {
      const res  = await fetch('/api/admin/notion-health?notify=false');
      const data = await res.json() as {
        status:    NotionStatus;
        checkedAt: string;
      };
      setStatus(data.status ?? 'unknown');
      setCheckedAt(data.checkedAt ?? null);

      // 復旧したらバナーを自動で閉じる
      if (data.status === 'ok') setDismissed(false);
    } catch {
      // ネットワークエラー → unknown のまま（バナーは出さない）
    }
  }, []);

  // ページロード時 + 5分ごとにチェック
  useEffect(() => {
    checkHealth();
    const timer = setInterval(checkHealth, 5 * 60 * 1000);
    return () => clearInterval(timer);
  }, [checkHealth]);

  // 'ok' または 'unknown' またはユーザーが閉じた場合は非表示
  if (status === 'ok' || status === 'unknown' || dismissed) return null;

  // ── バナーの見た目を決定 ──────────────────────────────
  const isDegraded = status === 'degraded';
  const bannerCls  = isDegraded
    ? 'bg-yellow-50 border-yellow-300 text-yellow-800'
    : 'bg-red-50 border-red-300 text-red-800';
  const Icon       = isDegraded ? AlertTriangle : XCircle;

  const checkedAtLabel = checkedAt
    ? new Date(checkedAt).toLocaleString('ja-JP', {
        timeZone: 'Asia/Tokyo',
        month: 'numeric', day: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : '';

  return (
    <div className={`w-full border-b px-4 py-2.5 ${bannerCls}`}>
      <div className="max-w-5xl mx-auto flex items-center justify-between gap-3">

        {/* ── メッセージ ── */}
        <div className="flex items-center gap-2 text-sm">
          <Icon size={15} className="flex-shrink-0" />
          <span>
            {isDegraded ? (
              <>
                <span className="font-semibold">Notion の応答が遅くなっています。</span>
                {' '}一部の画面でデータの取得に時間がかかる場合があります。
              </>
            ) : (
              <>
                <span className="font-semibold">Notion に接続できません。</span>
                {' '}バックアップデータで表示しています
                {checkedAtLabel && <span className="ml-1 opacity-70">（{checkedAtLabel} 時点）</span>}
                。
              </>
            )}
          </span>
        </div>

        {/* ── 操作ボタン ── */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* 再チェックボタン */}
          <button
            onClick={checkHealth}
            className="flex items-center gap-1 text-xs underline opacity-70 hover:opacity-100"
            title="Notion の状態を再確認する"
          >
            <RefreshCw size={11} />
            再確認
          </button>
          {/* 閉じるボタン */}
          <button
            onClick={() => setDismissed(true)}
            className="p-0.5 opacity-60 hover:opacity-100"
            aria-label="バナーを閉じる"
          >
            <X size={14} />
          </button>
        </div>

      </div>
    </div>
  );
}
