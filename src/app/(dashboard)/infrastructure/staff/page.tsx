import { StaffConditionPanel } from '@/components/dept/StaffConditionPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <StaffConditionPanel dept={getDept('infrastructure')} />; }
