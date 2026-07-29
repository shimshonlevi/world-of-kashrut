'use client';

import { useEffect, useMemo, useState } from 'react';
import { Project } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Search,
  Plus,
  Filter,
  Grid3X3,
  List,
  FolderKanban,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  Archive,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onOpenFullCase: (project: Project) => void;
}

export function ProjectsView({ projects, onSelectProject, onOpenFullCase }: ProjectsViewProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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

  const visibleProjects = useMemo(() => {
    return projects.filter((project) => {
      const matchesSearch = project.projectName.toLowerCase().includes(searchQuery.toLowerCase())
        || project.importer.toLowerCase().includes(searchQuery.toLowerCase())
        || project.country.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all'
        || (statusFilter === 'active' && project.status === 'בתהליך')
        || (statusFilter === 'submitted' && project.status === 'הוגש')
        || (statusFilter === 'done' && project.status === 'הסתיים');

      return matchesSearch && matchesStatus;
    });
  }, [projects, searchQuery, statusFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'בתהליך':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'הוגש':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'הסתיים':
        return 'bg-green-100 text-green-700 border-green-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getProgressPercent = (project: Project) => {
    const totalSteps = 5;
    const completedSteps = project.timeline.filter((t) => t.completed).length;
    return Math.round((completedSteps / totalSteps) * 100);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">תיקים</h2>
          <p className="text-muted-foreground">
            {visibleProjects.length} תיקים מוצגים מתוך {projects.length} • {projects.filter((p) => p.status === 'בתהליך').length} בתהליך
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש תיק..."
              className="pr-9 w-48"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value)}>
            <SelectTrigger className="w-32">
              <Filter className="h-4 w-4 ml-2" />
              <SelectValue placeholder="סטטוס" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">הכל</SelectItem>
              <SelectItem value="active">בתהליך</SelectItem>
              <SelectItem value="submitted">הוגש</SelectItem>
              <SelectItem value="done">הסתיים</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex border rounded-lg">
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-r-lg rounded-l-none">
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-9 w-9 rounded-l-lg rounded-r-none bg-muted">
              <List className="h-4 w-4" />
            </Button>
          </div>
          <Button
            variant={showArchive ? 'default' : 'outline'}
            className="gap-2"
            onClick={() => setShowArchive((v) => !v)}
          >
            <Archive className="h-4 w-4" />
            {showArchive ? 'חזרה לפעילים' : 'ארכיון'}
          </Button>
          {!showArchive && (
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              תיק חדש
            </Button>
          )}
        </div>
      </div>

      {/* Archived cases */}
      {showArchive && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
      )}

      {/* Projects Grid */}
      {!showArchive && (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {visibleProjects.length === 0 ? (
          <div className="col-span-full rounded-xl border border-dashed border-muted/50 bg-muted/20 p-10 text-center text-muted-foreground">
            <p className="text-base font-medium">לא נמצאו תיקים לפי הקריטריונים שלך.</p>
            <p className="text-sm mt-2">נסה לשנות את החיפוש או הסינון כדי לראות תיקים אחרים.</p>
          </div>
        ) : visibleProjects.map((project) => {
          const progress = getProgressPercent(project);
          const hasUrgentTask = !project.reportReceived && project.status !== 'הסתיים';

          return (
            <Card
              key={project.id}
              className={cn(
                'group cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/30',
                hasUrgentTask && 'border-l-4 border-l-amber-500'
              )}
              onClick={() => onSelectProject(project)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-primary/10">
                      <FolderKanban className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base leading-tight">{project.projectName}</CardTitle>
                      <p className="text-sm text-muted-foreground">{project.importer}</p>
                    </div>
                  </div>
                  <Badge className={cn('text-[11px]', getStatusColor(project.status))}>
                    {project.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Progress */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">התקדמות</span>
                    <span className="font-medium">{progress}%</span>
                  </div>
                  <Progress value={progress} className="h-2" />
                </div>

                {/* Info */}
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {project.timeline[project.timeline.length - 1]?.date || 'לא ידוע'}
                  </div>
                  {hasUrgentTask && (
                    <div className="flex items-center gap-1 text-amber-600">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      ממתין לדוח
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-3 border-t">
                  <div className="flex items-center gap-1.5">
                    <Badge variant="outline" className="text-[10px] h-5">
                      {project.country}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] h-5">
                      {project.kosherBody}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1 h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenFullCase(project);
                    }}
                  >
                    פתח תיק
                    <ChevronLeft className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      )}
    </div>
  );
}
