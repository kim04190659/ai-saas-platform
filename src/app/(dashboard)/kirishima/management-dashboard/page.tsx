// =====================================================
//  src/app/(dashboard)/kirishima/management-dashboard/page.tsx
//  霧島市 経営ダッシュボード — Sprint #53
// =====================================================

import { ManagementDashboard } from '@/components/management/ManagementDashboard'

export const metadata = {
  title: '経営ダッシュボード | 霧島市 RunWith',
}

export default function KirishimaManagementDashboardPage() {
  return <ManagementDashboard municipalityName="霧島市" />
}
