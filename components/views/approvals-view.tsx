'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, ProjectRequirement } from '@/lib/types';
import { corePatchFromRequirement } from '@/lib/templates';
import { useAuth } from '@/components/auth-provider';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ShieldCheck, FileText, Check, X, ExternalLink, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ApprovalsViewProps {
  projects: Project[];
  onUpdate: (id: string, patch: Partial<Project>) => void;
}

interface PendingApproval {
  project: Project;
  stageId: string;
  req: ProjectRequirement;
  kind: 'approval' | 'document';
}

// A requirement is "awaiting review" once it's been sent: an approval submitted
// to someone, or a document submitted for review.
function isAwaitingReview(r: ProjectRequirement): 'approval' | 'document' | null {
  if (r.type === 'approval' && r.status === 'submitted') return 'approval';
  if (r.type === 'document' && r.status === 'submitted') return 'document';
  return null;
}

export function ApprovalsView({ projects, onUpdate }: ApprovalsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();
  const [scope, setScope] = useState<'mine' | 'all'>('mine');

  // Does this awaiting item belong to the current user?
  const isMine = (p: PendingApproval) =>
    p.kind === 'approval'
      ? p.req.approverName === user?.name
      : p.project.responsible === user?.name;

  const allPending = useMemo<PendingApproval[]>(() => {
    const out: PendingApproval[] = [];
    for (const project of projects) {
      if (project.status === 'הסתיים') continue;
      for (const stage of project.stages ?? []) {
        for (const req of stage.requirements) {
          const kind = isAwaitingReview(req);
          if (kind) out.push({ project, stageId: stage.id, req, kind });
        }
      }
    }
    return out;
  }, [projects]);

  const pending = useMemo(
    () => (scope === 'mine' ? allPending.filter(isMine) : allPending),
    [allPending, scope, user?.name] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const byProject = useMemo(() => {
    const map = new Map<string, { project: Project; items: PendingApproval[] }>();
    for (const p of pending) {
      if (!map.has(p.project.id)) map.set(p.project.id, { project: p.project, items: [] });
      map.get(p.project.id)!.items.push(p);
    }
    return [...map.values()];
  }, [pending]);

  const decide = (p: PendingApproval, status: 'approved' | 'rejected') => {
    const stages = (p.project.stages ?? []).map((s) =>
      s.id === p.stageId
        ? { ...s, requirements: s.requirements.map((r) => (r.id === p.req.id ? { ...r, status } : r)) }
        : s
    );
    const changed = { ...p.req, status };
    const corePatch = corePatchFromRequirement(changed);
    onUpdate(p.project.id, { stages, ...corePatch });
    toast({
      title: status === 'approved' ? '✓ אושר' : 'נדחה',
      description: `"${p.req.label}" · ${p.project.projectName}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">{scope === 'mine' ? 'לאישורי' : 'כל האישורים'}</h2>
          <p className="text-muted-foreground">
            {pending.length > 0
              ? `${pending.length} פריטים ממתינים ${scope === 'mine' ? 'לך' : ''} ב-${byProject.length} תיקים`
              : scope === 'mine' ? 'אין פריטים הממתינים לך' : 'אין פריטים הממתינים לאישור'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border bg-card p-0.5 text-sm">
            <button
              onClick={() => setScope('mine')}
              className={cn('rounded-md px-3 py-1 transition-colors', scope === 'mine' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
            >
              לאישורי {allPending.filter(isMine).length > 0 && `(${allPending.filter(isMine).length})`}
            </button>
            <button
              onClick={() => setScope('all')}
              className={cn('rounded-md px-3 py-1 transition-colors', scope === 'all' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground')}
            >
              הכל ({allPending.length})
            </button>
          </div>
        </div>
      </div>

      {pending.length === 0 ? (
        <Card className="border-emerald-200/70 bg-gradient-to-l from-card to-emerald-50/40">
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-6 w-6" />
            </span>
            <p className="font-semibold">הכל מאושר</p>
            <p className="text-sm text-muted-foreground">אין מסמכים או אישורים הממתינים כרגע.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {byProject.map(({ project, items }) => (
            <Card key={project.id} className="border-border/60 elevated">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    {project.projectName}
                    <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                  </CardTitle>
                  <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => router.push(`/case/${project.id}`)}>
                    <ExternalLink className="h-3.5 w-3.5" />
                    פתח תיק
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">{project.importer} · {project.country}</p>
              </CardHeader>
              <CardContent className="space-y-2">
                {items.map((p) => (
                  <div
                    key={p.req.id}
                    className="flex items-center gap-3 rounded-lg border p-3 bg-card"
                  >
                    <span className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-lg', p.kind === 'document' ? 'bg-sky-100 text-sky-600' : 'bg-primary/10 text-primary')}>
                      {p.kind === 'document' ? <FileText className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{p.req.label}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {p.kind === 'document'
                          ? 'מסמך הוגש לבדיקה'
                          : `אישור${p.req.approverName ? ` · ${p.req.approverName}` : ''}`}
                      </p>
                    </div>
                    {p.kind === 'document' && p.req.value && (
                      <a href={p.req.value} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline inline-flex items-center gap-1 shrink-0">
                        צפה <ChevronLeft className="h-3 w-3" />
                      </a>
                    )}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-emerald-700 border-emerald-200 hover:bg-emerald-50" onClick={() => decide(p, 'approved')}>
                        <Check className="h-3.5 w-3.5" />
                        אשר
                      </Button>
                      <Button size="sm" variant="outline" className="h-8 gap-1 text-destructive border-red-200 hover:bg-red-50" onClick={() => decide(p, 'rejected')}>
                        <X className="h-3.5 w-3.5" />
                        דחה
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
