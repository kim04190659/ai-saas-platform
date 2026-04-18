/**
 * src/app/(dashboard)/healthcare/staff/page.tsx
 * 医療・介護部門｜医療従事者コンディション入力ページ
 */

import { StaffConditionPanel } from '@/components/dept/StaffConditionPanel';
import { getDept } from '@/config/departments';

export default function Page() {
  return <StaffConditionPanel dept={getDept('healthcare')} />;
}
