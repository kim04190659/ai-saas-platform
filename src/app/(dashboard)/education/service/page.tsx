/** 教育部門｜学校サービス状況ページ */
import { ServiceStatusPanel } from '@/components/dept/ServiceStatusPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <ServiceStatusPanel dept={getDept('education')} />; }
