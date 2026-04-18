/** 警察・消防部門｜地域安全 WellBeingダッシュボードページ */
import { WellBeingDashboardPanel } from '@/components/dept/WellBeingDashboardPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <WellBeingDashboardPanel dept={getDept('safety')} />; }
