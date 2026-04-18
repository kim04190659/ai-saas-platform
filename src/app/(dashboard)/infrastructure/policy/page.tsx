import { AIPolicyPanel } from '@/components/dept/AIPolicyPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <AIPolicyPanel dept={getDept('infrastructure')} />; }
