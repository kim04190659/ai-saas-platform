// =====================================================
//  src/app/(dashboard)/kirishima/infra-aging/page.tsx
//  霧島市 インフラ老朽化管理 ページ — Sprint #51
// =====================================================

import { InfraAgingPanel } from '@/components/infra/InfraAgingPanel'

export const metadata = {
  title: 'インフラ老朽化管理 | 霧島市 RunWith',
}

export default function KirishimaInfraAgingPage() {
  return (
    <InfraAgingPanel
      apiBase="/api/kirishima/infra-aging"
      municipalityName="霧島市"
      themeColor="teal"
    />
  )
}
