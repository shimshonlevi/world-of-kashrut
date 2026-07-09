'use client';

import { useEffect, useState } from 'react';
import { CalendarDays, FolderKanban, AlertTriangle, CheckCircle2, BadgeCheck } from 'lucide-react';

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
 * Premium branded welcome banner for the dashboard — the first thing managers
 * see. Time-aware greeting, Hebrew date, and at-a-glance status chips.
 */
export function DashboardHero({ name, activeProjects, urgentTasks, pendingApprovals = 0, onApprovalsClick, children }: DashboardHeroProps) {
  // Render date only after mount to avoid SSR/client hydration mismatch.
  const [date, setDate] = useState('');
  useEffect(() => setDate(hebrewDate()), []);

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border/60 bg-gradient-to-l from-card via-card to-gold/[0.06] elevated">
      {/* Decorative gold glow */}
      <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
      <div className="pointer-events-none absolute right-0 bottom-0 h-32 w-32 rounded-full bg-primary/[0.04] blur-2xl" />

      <div className="relative flex flex-col gap-5 p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-gold" />
            <span className="truncate">{date || ' '}</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {greeting()}
            {name ? <span className="text-gold">, {name}</span> : ''}
          </h1>

          {/* Status chips */}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 bg-background/60 px-3 py-1 text-xs font-medium text-foreground">
              <FolderKanban className="h-3.5 w-3.5 text-primary" />
              {activeProjects} תיקים פעילים
            </span>
            {urgentTasks > 0 ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-300/60 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                <AlertTriangle className="h-3.5 w-3.5" />
                {urgentTasks} משימות דחופות היום
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-300/60 bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5" />
                אין משימות דחופות — יום מצוין!
              </span>
            )}
            {pendingApprovals > 0 && (
              <button
                onClick={onApprovalsClick}
                className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/5 px-3 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
              >
                <BadgeCheck className="h-3.5 w-3.5" />
                {pendingApprovals} ממתינים לאישור
              </button>
            )}
          </div>
        </div>

        {children && <div className="shrink-0">{children}</div>}
      </div>
    </div>
  );
}
