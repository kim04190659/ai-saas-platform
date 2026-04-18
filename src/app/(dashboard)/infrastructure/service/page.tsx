import { ServiceStatusPanel } from '@/components/dept/ServiceStatusPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <ServiceStatusPanel dept={getDept('infrastructure')} />; }
