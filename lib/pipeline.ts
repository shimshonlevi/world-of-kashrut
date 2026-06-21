import type { Project } from './types';

// The kosher-certification milestones, mirroring the office Excel columns.
// Each maps to a boolean flag on the project (kept in sync with the bound steps).
export const KASHRUT_MILESTONES: { key: keyof Project; label: string; short: string }[] = [
  { key: 'reportReceived', label: 'דו״ח משגיח התקבל', short: 'דו״ח' },
  { key: 'sentToChaim', label: 'נשלח לחיים לבדיקה', short: 'חיים' },
  { key: 'sentToKosherBody', label: 'הועבר לגוף הכשרות', short: 'כשרות' },
  { key: 'certReceived', label: 'התקבלה תעודה', short: 'תעודה' },
  { key: 'submittedToRabbinate', label: 'הוגש לרבנות', short: 'רבנות' },
  { key: 'paid', label: 'שולם', short: 'תשלום' },
];

export function caseMilestones(p: Project) {
  return KASHRUT_MILESTONES.map((m) => ({ ...m, done: Boolean(p[m.key]) }));
}
