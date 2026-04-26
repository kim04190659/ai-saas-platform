// =====================================================
//  src/app/(dashboard)/yakushima/pdca-tracking/page.tsx
//  屋久島町 PDCA 追跡ページ — Sprint #47
// =====================================================

import { YakushimaPdcaPanel } from '@/components/yakushima/YakushimaPdcaPanel'

export const metadata = {
  title: '施策PDCA追跡 | 屋久島町 RunWith',
}

export default function YakushimaPdcaPage() {
  return <YakushimaPdcaPanel />
}
