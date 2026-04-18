/**
 * src/app/(dashboard)/education/staff/page.tsx
 * 教育部門｜教職員コンディション入力ページ
 *
 * ── このファイルの役割 ──────────────────────────────
 *  共通コンポーネント StaffConditionPanel に
 *  「教育部門」の設定を渡すだけのラッパー。
 *  UI・ロジック・API呼び出しはすべて StaffConditionPanel が担う。
 *
 *  新しい部門を追加するときは、このファイルをコピーして
 *  getDept('education') の引数を変えるだけでOK。
 * ─────────────────────────────────────────────────
 */

import { StaffConditionPanel } from '@/components/dept/StaffConditionPanel';
import { getDept } from '@/config/departments';

export default function Page() {
  // 'education' を渡すだけ。色・ラベル・DBは departments.ts で管理。
  return <StaffConditionPanel dept={getDept('education')} />;
}
