// Deadline helpers — derive accurate tracking from endDate vs today, instead of
// relying on the stale, hand-stored `daysDelayed` field.

export function parseDate(dateStr?: string | null): Date | null {
  if (!dateStr) return null;
  const d = new Date(`${dateStr}T00:00:00`);
  return isNaN(d.getTime()) ? null : d;
}

/** Whole days from today to `dateStr` (negative = in the past). */
export function daysUntil(dateStr?: string | null): number | null {
  const target = parseDate(dateStr);
  if (!target) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.round((target.getTime() - now.getTime()) / 86_400_000);
}

export type DeadlineTone = 'overdue' | 'soon' | 'ok' | 'done' | 'none';

export interface DeadlineInfo {
  tone: DeadlineTone;
  days: number | null; // days until deadline (negative if overdue)
  label: string;
}

/** Human, accurate deadline status for a project. */
export function deadlineInfo(endDate?: string | null, status?: string): DeadlineInfo {
  if (status === 'הסתיים') return { tone: 'done', days: null, label: 'הושלם' };
  const days = daysUntil(endDate);
  if (days === null) return { tone: 'none', days: null, label: 'אין יעד' };
  if (days < 0) return { tone: 'overdue', days, label: `באיחור ${Math.abs(days)} ימים` };
  if (days === 0) return { tone: 'soon', days, label: 'היעד היום' };
  if (days <= 7) return { tone: 'soon', days, label: `${days} ימים ליעד` };
  return { tone: 'ok', days, label: `${days} ימים ליעד` };
}
