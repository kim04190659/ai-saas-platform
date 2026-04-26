// =====================================================
//  src/app/(dashboard)/kirishima/pdca-tracking/page.tsx
//  霧島市 施策PDCA追跡 ページ — Sprint #49
// =====================================================

import { KirishimaPdcaPanel } from '@/components/kirishima/KirishimaPdcaPanel'

export const metadata = {
  title: '施策PDCA追跡 | 霧島市 RunWith',
}

export default function KirishimaPdcaPage() {
  return <KirishimaPdcaPanel />
}
