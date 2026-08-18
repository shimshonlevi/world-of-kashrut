'use client';

import { useMemo } from 'react';
import type { Project } from '@/lib/types';
import { myAwaitingReviewItems } from '@/lib/attention';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BadgeCheck, ChevronLeft, CheckCircle2 } from 'lucide-react';

interface ApprovalsPreviewProps {
  projects: Project[];
  userName?: string;
  limit?: number;
  onOpenAll: () => void;
  onOpenCase: (projectId: string) => void;
}

/** Compact "waiting for your approval" preview for the dashboard side rail. */
export function ApprovalsPreview({ projects, userName, limit = 3, onOpenAll, onOpenCase }: ApprovalsPreviewProps) {
  const items = useMemo(() => myAwaitingReviewItems(projects, userName), [projects, userName]);
  const shown = items.slice(0, limit);

  return (
    <Card className="border-border/60 elevated overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <BadgeCheck className="h-4 w-4" />
            </span>
            לאישורך
            {items.length > 0 && (
              <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[11px] font-bold text-primary tabular-nums">{items.length}</span>
            )}
          </CardTitle>
          <button onClick={onOpenAll} className="text-xs font-semibold text-primary hover:underline">הכל ←</button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {shown.length === 0 ? (
          <div className="flex flex-col items-center gap-1 py-7 text-center text-muted-foreground">
            <CheckCircle2 className="h-7 w-7 text-emerald-500" />
            <p className="text-sm">אין פריטים הממתינים לאישורך</p>
          </div>
        ) : (
          <ul className="divide-y divide-border/60">
            {shown.map((it) => (
              <li key={it.id}>
                <button onClick={() => onOpenCase(it.projectId)} className="group flex w-full items-center gap-3 px-4 py-2.5 text-right transition-colors hover:bg-muted/60">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary text-xs">✓</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-medium">{it.label}</span>
                    <span className="block truncate text-xs text-muted-foreground">{it.projectName}</span>
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
