// =====================================================
//  src/app/(dashboard)/gyosei/fiscal-health/page.tsx
//  財政健全化管理 ページ（共通）— Sprint #56
//  ヘッダーのセレクターで選択中の自治体に動的切り替え
// =====================================================

'use client'

import { FiscalHealthPanel } from '@/components/fiscal/FiscalHealthPanel'
import { useMunicipality }   from '@/contexts/MunicipalityContext'

export default function GyoseiFiscalHealthPage() {
  // 選択中の自治体を取得（ヘッダーのセレクターで切り替え可能）
  const { municipality } = useMunicipality()

  return (
    <FiscalHealthPanel
      apiBase={`/api/gyosei/fiscal-health?municipalityId=${municipality.id}`}
      municipalityName={municipality.shortName}
    />
  )
}
