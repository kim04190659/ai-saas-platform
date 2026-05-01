'use client';

/**
 * MunicipalitySearchParamsSync.tsx
 *
 * Sprint #75: URLパラメータ ?municipalityId=xxx を MunicipalityContext に
 * グローバルで同期するためのヘルパーコンポーネント。
 *
 * ■ 配置場所
 *   (dashboard)/layout.tsx 内の <Suspense> で包んで設置する。
 *   UI を描画しないため（return null）、全ページに影響なくサイドバーリンクの
 *   自治体自動切り替えを実現できる。
 *
 * ■ なぜ Suspense が必要か
 *   useSearchParams() はブラウザ専用 API。
 *   Next.js App Router では、これを使う Client Component を
 *   必ず <Suspense> で包む必要がある（そうしないとビルドエラーになる）。
 *
 * ■ 動作の流れ
 *   サイドバーリンク（例: /gyosei/migration-risk?municipalityId=amacho）をクリック
 *     → Next.js クライアントサイドナビゲーションでURL変化
 *     → useSearchParams() が再発火
 *     → setMunicipalityId('amacho') でグローバル Context を更新
 *     → 各ページの Panel が新しい municipalityId で API を再取得
 */

import { useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMunicipality } from '@/contexts/MunicipalityContext';

export function MunicipalitySearchParamsSync() {
  // グローバルな自治体コンテキスト
  const { municipalityId, setMunicipalityId } = useMunicipality();

  // URLパラメータをリアクティブに監視（Next.js クライアントサイドナビゲーションでも再発火）
  const searchParams = useSearchParams();

  useEffect(() => {
    const urlId = searchParams.get('municipalityId');
    // URLに municipalityId があり、かつ現在の Context と異なる場合のみ更新
    // （同じ値の場合は無限ループを防ぐためスキップ）
    if (urlId && urlId !== municipalityId) {
      setMunicipalityId(urlId);
    }
  // municipalityId を依存配列に含めると無限ループになるため除外
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  // UIを描画しない（副作用のみのコンポーネント）
  return null;
}
