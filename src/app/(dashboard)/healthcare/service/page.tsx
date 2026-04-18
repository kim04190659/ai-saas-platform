/** 医療・介護部門｜医療サービス状況ページ */
import { ServiceStatusPanel } from '@/components/dept/ServiceStatusPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <ServiceStatusPanel dept={getDept('healthcare')} />; }
