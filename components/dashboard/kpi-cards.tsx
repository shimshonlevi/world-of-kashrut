'use client';

import { AlertTriangle, FileCheck, Users, DollarSign, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardsProps {
  stats: {
    urgentTasks: number;
    pendingReports: number;
    clientsAwaitingResponse: number;
    totalProfit: number;
    monthlyGrowth: number;
  };
  onNavigate?: (page: string) => void;
}

type Tone = 'ok' | 'acc' | 'warn' | 'crit';

const TONES: Record<Tone, { chip: string; stroke: string }> = {
  ok: { chip: 'bg-emerald-500/10 text-emerald-600', stroke: 'stroke-emerald-500' },
  acc: { chip: 'bg-primary/10 text-primary', stroke: 'stroke-primary' },
  warn: { chip: 'bg-amber-500/10 text-amber-600', stroke: 'stroke-amber-500' },
  crit: { chip: 'bg-rose-500/10 text-rose-600', stroke: 'stroke-rose-500' },
};

// Small deterministic sparkline paths (viewBox 66x22) — one representative shape
// per metric. Wire to real weekly history once we track it.
const SPARK: Record<string, string> = {
  profit: '0,18 11,15 22,16 33,10 44,11 55,5 66,3',
  clients: '0,10 11,12 22,9 33,11 44,10 55,12 66,10',
  reports: '0,15 11,13 22,14 33,9 44,11 55,7 66,8',
  urgent: '0,7 11,9 22,6 33,8 44,5 55,9 66,13',
};

export function KPICards({ stats, onNavigate }: KPICardsProps) {
  const growthUp = stats.monthlyGrowth >= 0;
  const cards = [
    {
      id: 'profit', target: 'reports', label: 'רווח חודשי', icon: DollarSign, tone: 'ok' as Tone,
      value: `₪${(stats.totalProfit / 1000).toFixed(1)}K`,
      delta: { text: `${growthUp ? '▲' : '▼'} ${Math.abs(stats.monthlyGrowth)}%`, cls: growthUp ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600' },
    },
    {
      id: 'clients', target: 'projects', label: 'ממתינים למענה', icon: Users, tone: 'acc' as Tone,
      value: stats.clientsAwaitingResponse,
      delta: { text: 'ללא שינוי', cls: 'bg-muted text-muted-foreground' },
    },
    {
      id: 'reports', target: 'approvals', label: 'דוחות לבדיקה', icon: FileCheck, tone: 'warn' as Tone,
      value: stats.pendingReports,
      delta: { text: `▲ ${stats.pendingReports}`, cls: 'bg-emerald-500/10 text-emerald-600' },
    },
    {
      id: 'urgent', target: 'projects', label: 'דורשים טיפול היום', icon: AlertTriangle, tone: 'crit' as Tone,
      value: stats.urgentTasks,
      delta: stats.urgentTasks > 0
        ? { text: `▲ ${stats.urgentTasks} חדשים`, cls: 'bg-rose-500/10 text-rose-600' }
        : { text: 'אין דחופים', cls: 'bg-emerald-500/10 text-emerald-600' },
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {cards.map((c) => {
        const t = TONES[c.tone];
        return (
          <button
            key={c.id}
            onClick={() => onNavigate?.(c.target)}
            className="group relative text-right rounded-xl border border-border/60 bg-card p-4 transition-all hover:-translate-y-0.5 hover:shadow-[0_8px_22px_-12px_rgba(20,35,63,0.3)] hover:border-border"
          >
            <ArrowLeft className="absolute top-4 left-4 h-4 w-4 text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className={cn('flex h-6 w-6 items-center justify-center rounded-md', t.chip)}>
                <c.icon className="h-3.5 w-3.5" />
              </span>
              {c.label}
            </div>
            <div className="mt-2 text-2xl font-bold tabular-nums">{c.value}</div>
            <div className="mt-1 flex items-end justify-between">
              <span className={cn('rounded-full px-2 py-0.5 text-[11px] font-bold', c.delta.cls)}>{c.delta.text}</span>
              <svg width="66" height="22" viewBox="0 0 66 22" className="shrink-0" fill="none">
                <polyline points={SPARK[c.id]} className={t.stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
          </button>
        );
      })}
    </div>
  );
}
