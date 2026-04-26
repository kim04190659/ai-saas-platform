// =====================================================
//  src/app/(dashboard)/kirishima/fiscal-health/page.tsx
//  霧島市 財政健全化管理 ページ — Sprint #52
// =====================================================

import { FiscalHealthPanel } from '@/components/fiscal/FiscalHealthPanel'

export const metadata = {
  title: '財政健全化管理 | 霧島市 RunWith',
}

export default function KirishimaFiscalHealthPage() {
  return (
    <FiscalHealthPanel
      apiBase="/api/kirishima/fiscal-health"
      municipalityName="霧島市"
    />
  )
}
