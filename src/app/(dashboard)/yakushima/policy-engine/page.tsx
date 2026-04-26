// =====================================================
//  src/app/(dashboard)/yakushima/policy-engine/page.tsx
//  屋久島町 データ参照型AI施策エンジン ページ — Sprint #46
// =====================================================

import { YakushimaPolicyPanel } from '@/components/yakushima/YakushimaPolicyPanel'

export const metadata = {
  title: 'データ参照型施策提案 | 屋久島町 RunWith',
}

export default function YakushimaPolicyEnginePage() {
  return <YakushimaPolicyPanel />
}
