import { cn } from '@/lib/utils';

// Single source of truth for project-status styling across the app (table,
// case header, cards) — so a status always looks identical everywhere.
const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  'בתהליך': { bg: 'bg-blue-50 dark:bg-blue-950/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' },
  'הוגש': { bg: 'bg-amber-50 dark:bg-amber-950/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' },
  'הסתיים': { bg: 'bg-emerald-50 dark:bg-emerald-950/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-muted-foreground/50' };
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', s.bg, s.text, className)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {status}
    </span>
  );
}
