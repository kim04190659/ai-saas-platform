// =====================================================
//  src/app/(dashboard)/gyosei/emergency-support/page.tsx
//  緊急時住民支援 ページ — Sprint #55
// =====================================================

'use client'

import { EmergencySupportPanel } from '@/components/emergency/EmergencySupportPanel'
import { useMunicipality }       from '@/contexts/MunicipalityContext'

export default function EmergencySupportPage() {
  // 選択中の自治体を取得（ヘッダーのセレクターで切り替え可能）
  const { municipality } = useMunicipality()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <EmergencySupportPanel
        municipalityId={municipality.id}
        municipalityName={municipality.shortName}
      />
    </div>
  )
}
