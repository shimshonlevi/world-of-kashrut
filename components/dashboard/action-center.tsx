'use client';

import { useMemo } from 'react';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertTriangle,
  FileCheck,
  MessageSquare,
  Plane,
  ListChecks,
  CheckCircle2,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { deadlineInfo } from '@/lib/dates';

type Urgency = 'high' | 'medium' | 'low';

interface ActionItem {
  id: string;
  projectId: string;
  projectName: string;
  importer: string;
  icon: React.ComponentType<{ className?: string }>;
  text: string;
  urgency: Urgency;
}

const URGENCY_RANK: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };

const URGENCY_STYLE: Record<Urgency, string> = {
  high: 'text-rose-600 bg-rose-500/10',
  medium: 'text-amber-600 bg-amber-500/10',
  low: 'text-sky-600 bg-sky-500/10',
};

function buildActions(projects: Project[]): ActionItem[] {
  const items: ActionItem[] = [];

  for (const p of projects) {
    if (p.status === 'הסתיים') continue;
    const base = { projectId: p.id, projectName: p.projectName, importer: p.importer };

    // 1) Deadline — computed from endDate vs today (accurate, not stale)
    const dl = deadlineInfo(p.endDate, p.status);
    if (dl.tone === 'overdue') {
      items.push({ ...base, id: `${p.id}-overdue`, icon: AlertTriangle, urgency: 'high', text: `${dl.label} — חרג מהיעד` });
    } else if (dl.tone === 'soon') {
      items.push({ ...base, id: `${p.id}-soon`, icon: AlertTriangle, urgency: 'medium', text: `מתקרב ליעד (${dl.label})` });
    }

    // 2) Documents awaiting review (from the live stage snapshot)
    const submittedDocs = (p.stages ?? []).flatMap((s) =>
      s.requirements.filter((r) => r.type === 'document' && r.status === 'submitted')
    );
    if (submittedDocs.length) {
      items.push({ ...base, id: `${p.id}-docrev`, icon: FileCheck, urgency: 'high', text: `${submittedDocs.length} מסמכים ממתינים לאישורך` });
    }

    // 3) Client awaiting response
    if (p.clientAwaitingResponse) {
      items.push({ ...base, id: `${p.id}-client`, icon: MessageSquare, urgency: 'medium', text: 'היבואן ממתין למענה' });
    }

    // 4) Flight to book
    if (p.needsFlightBooking && p.flight?.status === 'not_booked') {
      items.push({ ...base, id: `${p.id}-flight`, icon: Plane, urgency: 'medium', text: 'יש להזמין טיסה למשגיח' });
    }

    // 5) Next open requirements in the active stage
    const activeStage = (p.stages ?? []).find((s) => s.status === 'active');
    if (activeStage) {
      const open = activeStage.requirements.filter(
        (r) => r.required && r.status !== 'approved' && r.status !== 'done' && r.status !== 'submitted'
      );
      if (open.length) {
        const first = open[0];
        const extra = open.length > 1 ? ` (+${open.length - 1})` : '';
        items.push({
          ...base,
          id: `${p.id}-req`,
          icon: ListChecks,
          urgency: 'low',
          text: `${activeStage.name}: ${first.label}${extra}`,
        });
      }
    }
  }

  return items.sort((a, b) => URGENCY_RANK[a.urgency] - URGENCY_RANK[b.urgency]);
}

interface ActionCenterProps {
  projects: Project[];
  onOpenCase: (projectId: string) => void;
}

export function ActionCenter({ projects, onOpenCase }: ActionCenterProps) {
  const actions = useMemo(() => buildActions(projects), [projects]);
  const highCount = actions.filter((a) => a.urgency === 'high').length;

  return (
    <Card className="border-border/60 elevated overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <ListChecks className="h-4 w-4" />
            </span>
            מה דורש ממך טיפול עכשיו
          </CardTitle>
          {actions.length > 0 && (
            <Badge variant="outline" className={cn(highCount > 0 && 'border-rose-200 text-rose-600 bg-rose-50')}>
              {actions.length} פעולות{highCount > 0 ? ` · ${highCount} דחופות` : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {actions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
            <CheckCircle2 className="h-9 w-9 text-emerald-500 mb-2" />
            <p className="font-medium text-foreground">הכל מטופל — אין משימות פתוחות 🎉</p>
            <p className="text-sm">כל הכבוד, אתה מעודכן בכל התיקים שלך</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60 max-h-[22rem] overflow-y-auto">
            {actions.map((a) => (
              <li key={a.id}>
                <button
                  onClick={() => onOpenCase(a.projectId)}
                  className="group flex w-full items-center gap-3 px-4 py-3 text-right transition-colors hover:bg-muted/60"
                >
                  <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', URGENCY_STYLE[a.urgency])}>
                    <a.icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{a.text}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {a.projectName} · {a.importer}
                    </span>
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
