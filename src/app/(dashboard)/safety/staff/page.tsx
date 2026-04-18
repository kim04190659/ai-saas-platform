/**
 * src/app/(dashboard)/safety/staff/page.tsx
 * 警察・消防部門｜隊員コンディション入力ページ
 */

import { StaffConditionPanel } from '@/components/dept/StaffConditionPanel';
import { getDept } from '@/config/departments';

export default function Page() {
  return <StaffConditionPanel dept={getDept('safety')} />;
}
