'use client';

import { useMemo } from 'react';
import type { Project } from '@/lib/types';
import { overallProgress } from '@/lib/templates';
import { StatusBadge } from '@/components/shared/status-badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Clock } from 'lucide-react';

function timeAgo(dateStr?: string): string {
  if (!dateStr) return '—';
  const t = new Date(dateStr).getTime();
  if (isNaN(t)) return '—';
  const mins = Math.round((Date.now() - t) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} ד׳`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `לפני ${hrs} ש׳`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'אתמול';
  if (days < 30) return `לפני ${days} י׳`;
  return new Date(t).toLocaleDateString('he-IL');
}

interface RecentCasesTableProps {
  projects: Project[];
  limit?: number;
  onOpenCase: (projectId: string) => void;
  onOpenAll: () => void;
}

/** Compact "recently touched cases" table for the dashboard — last N by updatedAt. */
export function RecentCasesTable({ projects, limit = 5, onOpenCase, onOpenAll }: RecentCasesTableProps) {
  const rows = useMemo(() => {
    const ts = (p: Project) => new Date(p.updatedAt || p.createdAt || 0).getTime() || 0;
    return [...projects].sort((a, b) => ts(b) - ts(a)).slice(0, limit);
  }, [projects, limit]);

  return (
    <Card className="border-border/60 elevated overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-muted text-muted-foreground">
              <Clock className="h-4 w-4" />
            </span>
            תיקים אחרונים
            <span className="text-xs font-normal text-muted-foreground">· לפי עדכון אחרון</span>
          </CardTitle>
          <button onClick={onOpenAll} className="text-xs font-semibold text-primary hover:underline">
            לכל התיקים ({projects.length}) ←
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {rows.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">אין תיקים להצגה.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>פרויקט</TableHead>
                <TableHead className="hidden md:table-cell">יבואן</TableHead>
                <TableHead>התקדמות</TableHead>
                <TableHead>סטטוס</TableHead>
                <TableHead className="hidden lg:table-cell">אחראי</TableHead>
                <TableHead className="hidden lg:table-cell">עודכן</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((p) => {
                const prog = overallProgress(p.stages ?? []);
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => onOpenCase(p.id)}>
                    <TableCell>
                      <div className="font-medium">{p.projectName}</div>
                      <div className="text-[11px] text-muted-foreground">{p.country}</div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">{p.importer}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="inline-block h-1.5 w-16 overflow-hidden rounded-full bg-muted">
                          <span className="block h-full rounded-full bg-primary" style={{ width: `${prog}%` }} />
                        </span>
                        <span className="text-[11px] text-muted-foreground tabular-nums">{prog}%</span>
                      </div>
                    </TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{p.responsible}</TableCell>
                    <TableCell className="hidden lg:table-cell text-[11px] text-muted-foreground">{timeAgo(p.updatedAt || p.createdAt)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
