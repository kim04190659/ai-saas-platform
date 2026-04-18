/** 教育部門｜AI教育政策提言ページ */
import { AIPolicyPanel } from '@/components/dept/AIPolicyPanel';
import { getDept } from '@/config/departments';
export default function Page() { return <AIPolicyPanel dept={getDept('education')} />; }
