// =====================================================
//  src/app/(dashboard)/gyosei/infra-aging/page.tsx
//  インフラ老朽化管理 ページ（共通）— Sprint #56
//  ヘッダーのセレクターで選択中の自治体に動的切り替え
// =====================================================

'use client'

import { InfraAgingPanel } from '@/components/infra/InfraAgingPanel'
import { useMunicipality } from '@/contexts/MunicipalityContext'

export default function GyoseiInfraAgingPage() {
  // 選択中の自治体を取得（ヘッダーのセレクターで切り替え可能）
  const { municipality } = useMunicipality()

  return (
    <InfraAgingPanel
      apiBase={`/api/gyosei/infra-aging?municipalityId=${municipality.id}`}
      municipalityName={municipality.shortName}
      themeColor="teal"
    />
  )
}
