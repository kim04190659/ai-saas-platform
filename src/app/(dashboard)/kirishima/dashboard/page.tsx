/**
 * /kirishima/dashboard — 霧島市専用 WBダッシュボード
 *
 * Sprint #87 追加：
 *   /gyosei/dashboard?municipalityId=kirishima へ遷移すると
 *   Kirishimaレイアウト（/kirishima/*）の外に出てしまう問題を解決するため、
 *   同じ DashboardContent を /kirishima/* 配下で表示するページを新設。
 *
 *   DashboardContent は useSearchParams() で ?municipalityId=kirishima を読み、
 *   自動的に霧島市データを表示する。
 */

import { Suspense } from 'react';
import DashboardContent from '@/app/(dashboard)/gyosei/dashboard/DashboardContent';

// useSearchParams() を含む Client Component があるため force-dynamic が必要
export const dynamic = 'force-dynamic';

export default function KirishimaDashboardPage() {
  return (
    // DashboardContent が useSearchParams() を使うため Suspense で包む（Next.js 要件）
    <Suspense fallback={
      <div className="flex items-center justify-center h-64 text-gray-400">
        <span>ダッシュボードを読み込み中...</span>
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}
