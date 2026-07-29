'use client';

import { useEffect, useState } from 'react';
import { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Archive, RotateCcw, Loader2 } from 'lucide-react';
import { AdvancedProjectTable } from '@/components/dashboard/advanced-project-table';

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onOpenFullCase: (project: Project) => void;
  onUpdateProject?: (id: string, patch: Partial<Project>) => void;
  onArchiveProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  onBulkArchive?: (projects: Project[]) => void;
  isAdmin?: boolean;
}

export function ProjectsView({
  projects,
  onSelectProject,
  onOpenFullCase,
  onUpdateProject,
  onArchiveProject,
  onDeleteProject,
  onBulkArchive,
  isAdmin,
}: ProjectsViewProps) {
  const { toast } = useToast();
  const [showArchive, setShowArchive] = useState(false);
  const [archived, setArchived] = useState<Project[]>([]);
  const [loadingArchive, setLoadingArchive] = useState(false);

  const loadArchive = () => {
    setLoadingArchive(true);
    fetch('/api/projects?archived=1')
      .then((r) => r.json())
      .then((d) => setArchived(d.projects || []))
      .catch(() => {})
      .finally(() => setLoadingArchive(false));
  };
  useEffect(() => { if (showArchive) loadArchive(); }, [showArchive]);

  const restore = async (p: Project) => {
    setArchived((prev) => prev.filter((x) => x.id !== p.id));
    try {
      const res = await fetch(`/api/projects/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ archived: false }),
      });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'שוחזר', description: `"${p.projectName}" חזר לתיקים הפעילים` });
    } catch {
      toast({ title: 'שגיאה', description: 'השחזור נכשל', variant: 'destructive' });
      loadArchive();
    }
  };

  const purge = async (p: Project) => {
    const typed = window.prompt(`מחיקה לצמיתות — ללא שחזור.\nהקלד את שם התיק לאישור:\n"${p.projectName}"`);
    if (typed == null) return;
    if (typed.trim() !== p.projectName.trim()) { toast({ title: 'השם לא תואם', variant: 'destructive' }); return; }
    setArchived((prev) => prev.filter((x) => x.id !== p.id));
    try {
      const res = await fetch(`/api/projects/${p.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'נמחק לצמיתות', description: p.projectName });
    } catch {
      toast({ title: 'שגיאה', description: 'המחיקה נכשלה', variant: 'destructive' });
      loadArchive();
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">תיקים</h2>
          <p className="text-sm text-muted-foreground">
            {showArchive ? `${archived.length} בארכיון` : `${projects.length} תיקים · ${projects.filter((p) => p.status === 'בתהליך').length} בתהליך`}
          </p>
        </div>
        <Button variant={showArchive ? 'default' : 'outline'} className="gap-2" onClick={() => setShowArchive((v) => !v)}>
          <Archive className="h-4 w-4" />
          {showArchive ? 'חזרה לפעילים' : 'ארכיון'}
        </Button>
      </div>

      {showArchive ? (
        loadingArchive ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin ml-2" /> טוען ארכיון...
          </div>
        ) : archived.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center text-muted-foreground">
              <Archive className="h-9 w-9 mx-auto mb-3 opacity-40" />
              הארכיון ריק.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {archived.map((p) => (
              <Card key={p.id} className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{p.projectName}</CardTitle>
                  <p className="text-sm text-muted-foreground">{p.importer} · {p.country}</p>
                </CardHeader>
                <CardContent className="flex items-center gap-2 pt-1">
                  <Button variant="outline" size="sm" className="gap-1.5 flex-1" onClick={() => restore(p)}>
                    <RotateCcw className="h-3.5 w-3.5" /> שחזר
                  </Button>
                  <Button variant="outline" size="sm" className="gap-1.5 text-destructive" onClick={() => purge(p)}>
                    מחק לצמיתות
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        <AdvancedProjectTable
          projects={projects}
          onSelectProject={onSelectProject}
          onOpenFullCase={onOpenFullCase}
          onUpdateProject={onUpdateProject}
          onArchiveProject={onArchiveProject}
          onDeleteProject={onDeleteProject}
          onBulkArchive={onBulkArchive}
          isAdmin={isAdmin}
        />
      )}
    </div>
  );
}
