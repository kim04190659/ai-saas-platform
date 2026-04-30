/**
 * /gyosei/dashboard — ページエントリポイント（Server Component）
 *
 * Sprint #74 : useSearchParams() はブラウザ専用 API のため、
 *   Next.js ビルド時のプリレンダリングで落ちる問題を修正。
 *
 * ■ 解決策
 *   1. このファイルを Server Component（'use client' なし）として残す
 *   2. export const dynamic = 'force-dynamic' を宣言してプリレンダリングをスキップ
 *      → Server Component にのみ効果がある設定。Client Component では無視される。
 *   3. useSearchParams() を使う実際のコードは DashboardContent.tsx（Client Component）へ分離
 *   4. <Suspense> で DashboardContent を包む
 *      → Next.js App Router の要件：useSearchParams() を含む Client Component は
 *        必ず親の Server Component から Suspense で包む必要がある。
 */

import { Suspense } from 'react';
import DashboardContent from './DashboardContent';

// Server Component なので force-dynamic が有効になり、ビルド時プリレンダリングをスキップする
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    // DashboardContent が useSearchParams() を使うため Suspense が必須
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-400">
        <span>ダッシュボードを読み込み中...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
