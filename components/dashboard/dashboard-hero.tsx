'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, FolderKanban, AlertTriangle, CheckCircle2, BadgeCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return 'לילה טוב';
  if (h < 12) return 'בוקר טוב';
  if (h < 17) return 'צהריים טובים';
  if (h < 21) return 'ערב טוב';
  return 'לילה טוב';
}

function hebrewDate(): string {
  try {
    return new Intl.DateTimeFormat('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date());
  } catch {
    return '';
  }
}

interface DashboardHeroProps {
  name?: string;
  activeProjects: number;
  urgentTasks: number;
  pendingApprovals?: number;
  onApprovalsClick?: () => void;
  children?: React.ReactNode; // admin tabs slot
}

/**
 * Compact office header for the dashboard — greeting + date on the start,
 * an at-a-glance status strip (data, not decoration) on the end.
 */
export function DashboardHero({ name, activeProjects, urgentTasks, pendingApprovals = 0, onApprovalsClick, children }: DashboardHeroProps) {
  // Render date only after mount to avoid SSR/client hydration mismatch.
  const [date, setDate] = useState('');
  useEffect(() => setDate(hebrewDate()), []);

  return (
    <div dir="rtl" className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {greeting()}{name ? `, ${name}` : ''}
        </h1>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
          <CalendarDays className="h-3.5 w-3.5" />
          <span className="truncate">{date || ' '}</span>
        </div>
      </div>

      {/* Compact status strip */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground">
          <FolderKanban className="h-3.5 w-3.5" />
          <span className="font-semibold text-foreground tabular-nums">{activeProjects}</span> תיקים פעילים
        </span>
        <span className={cn('inline-flex items-center gap-1.5', urgentTasks > 0 ? 'text-amber-700' : 'text-emerald-700')}>
          {urgentTasks > 0 ? <AlertTriangle className="h-3.5 w-3.5" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {urgentTasks > 0 ? <><span className="font-semibold tabular-nums">{urgentTasks}</span> דחופים</> : 'אין דחופים'}
        </span>
        {pendingApprovals > 0 && (
          <button onClick={onApprovalsClick} className="inline-flex items-center gap-1.5 text-primary hover:underline">
            <BadgeCheck className="h-3.5 w-3.5" />
            <span className="font-semibold tabular-nums">{pendingApprovals}</span> לאישורך
          </button>
        )}
        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
