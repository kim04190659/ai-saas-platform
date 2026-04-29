// =====================================================
//  src/app/(dashboard)/gyosei/farm-matching/page.tsx
//  農業担い手マッチングAI — Sprint #66
//
//  FarmMatchingPanel を呼び出すだけのシンプルなページ。
//  データ取得・表示ロジックはすべて Panel 側に集約している。
// =====================================================

import { FarmMatchingPanel } from '@/components/gyosei/FarmMatchingPanel'

export default function FarmMatchingPage() {
  return <FarmMatchingPanel />
}
