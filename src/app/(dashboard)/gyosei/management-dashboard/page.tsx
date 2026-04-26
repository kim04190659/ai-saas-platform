// =====================================================
//  src/app/(dashboard)/gyosei/management-dashboard/page.tsx
//  経営ダッシュボード ページ（共通）— Sprint #56
//  ヘッダーのセレクターで選択中の自治体に動的切り替え
// =====================================================

'use client'

import { ManagementDashboard } from '@/components/management/ManagementDashboard'
import { useMunicipality }     from '@/contexts/MunicipalityContext'

export default function GyoseiManagementDashboardPage() {
  // 選択中の自治体を取得（ヘッダーのセレクターで切り替え可能）
  const { municipality } = useMunicipality()

  return (
    <ManagementDashboard
      municipalityName={municipality.shortName}
      apiBase={`/api/gyosei/management-summary?municipalityId=${municipality.id}`}
    />
  )
}
