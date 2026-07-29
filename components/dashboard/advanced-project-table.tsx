'use client';

import { useState, useMemo, Fragment } from 'react';
import { Project, ProjectStatus } from '@/lib/types';
import { overallProgress, isRequirementSatisfied } from '@/lib/templates';
import { deadlineInfo } from '@/lib/dates';
import { caseMilestones } from '@/lib/pipeline';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Eye,
  MessageCircle,
  Phone,
  Mail,
  ExternalLink,
  AlertTriangle,
  Clock,
  FileWarning,
  ChevronLeft,
  CheckCircle2,
  DollarSign,
  FileCheck,
  Archive,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface AdvancedProjectTableProps {
  projects: Project[];
  onSelectProject: (project: Project) => void;
  onOpenFullCase: (project: Project) => void;
  onUpdateProject?: (id: string, patch: Partial<Project>) => void;
  onArchiveProject?: (project: Project) => void;
  onDeleteProject?: (project: Project) => void;
  isAdmin?: boolean;
  selectedProjectId?: string;
}

type SortField = 'projectName' | 'importer' | 'status' | 'urgency' | 'createdAt';
type SortDirection = 'asc' | 'desc';

const STATUS_OPTIONS: ProjectStatus[] = ['בתהליך', 'הוגש', 'הסתיים'];
const RESPONSIBLE_OPTIONS = ['נחמה', 'שירה', 'מנהל'];
const HEBREW_MONTH_NAMES = ['ינואר', 'פברואר', 'מרץ', 'אפריל', 'מאי', 'יוני', 'יולי', 'אוגוסט', 'ספטמבר', 'אוקטובר', 'נובמבר', 'דצמבר'];
const HEBREW_MONTH = (ym: string) => {
  const [y, m] = ym.split('-');
  return `${HEBREW_MONTH_NAMES[parseInt(m) - 1] ?? m} ${y}`;
};

export function AdvancedProjectTable({
  projects,
  onSelectProject,
  onOpenFullCase,
  onUpdateProject,
  onArchiveProject,
  onDeleteProject,
  isAdmin,
  selectedProjectId,
}: AdvancedProjectTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('urgency');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [groupBy, setGroupBy] = useState<'none' | 'responsible' | 'status' | 'month'>('none');
  const editable = Boolean(onUpdateProject);

  const groupInfo = (p: Project): { key: string; label: string } => {
    if (groupBy === 'responsible') return { key: p.responsible || '—', label: p.responsible || 'ללא אחראי' };
    if (groupBy === 'status') return { key: p.status, label: p.status };
    if (groupBy === 'month') {
      const m = (p.startDate || '').slice(0, 7); // YYYY-MM
      return { key: m || 'no-date', label: m ? HEBREW_MONTH(m) : 'ללא תאריך' };
    }
    return { key: 'all', label: '' };
  };

  const getUrgencyLevel = (project: Project): number => {
    let level = 0;
    const dl = deadlineInfo(project.endDate, project.status);
    if (dl.tone === 'overdue') level += 3;
    else if (dl.tone === 'soon') level += 2;
    if (project.clientAwaitingResponse) level += 2;
    if (!project.reportReceived && project.status !== 'הסתיים') level += 1;
    return level;
  };

  const filteredAndSortedProjects = useMemo(() => {
    let result = [...projects];

    if (statusFilter !== 'all') result = result.filter((p) => p.status === statusFilter);

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (p) =>
          p.projectName.toLowerCase().includes(query) ||
          p.importer.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          p.country.toLowerCase().includes(query) ||
          p.supervisor.toLowerCase().includes(query)
      );
    }

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'projectName':
          comparison = a.projectName.localeCompare(b.projectName);
          break;
        case 'importer':
          comparison = a.importer.localeCompare(b.importer);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'urgency':
          comparison = getUrgencyLevel(b) - getUrgencyLevel(a);
          break;
        case 'createdAt':
          comparison = new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [projects, searchQuery, sortField, sortDirection, statusFilter]);

  const grouped = useMemo(() => {
    if (groupBy === 'none') return [{ key: 'all', label: '', items: filteredAndSortedProjects }];
    const map = new Map<string, { key: string; label: string; items: Project[] }>();
    for (const p of filteredAndSortedProjects) {
      const { key, label } = groupInfo(p);
      if (!map.has(key)) map.set(key, { key, label, items: [] });
      map.get(key)!.items.push(p);
    }
    return [...map.values()];
  }, [filteredAndSortedProjects, groupBy]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection(field === 'urgency' ? 'desc' : 'asc');
    }
  };

  const SortHeader = ({ field, label, className }: { field: SortField; label: string; className?: string }) => (
    <TableHead className={cn('text-right font-semibold', className)}>
      <button onClick={() => handleSort(field)} className="inline-flex items-center gap-1 hover:text-foreground">
        {label}
        {sortField === field ? (
          sortDirection === 'asc' ? <ArrowUp className="h-3.5 w-3.5" /> : <ArrowDown className="h-3.5 w-3.5" />
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'בתהליך':
        return { bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300', dot: 'bg-blue-500' };
      case 'הוגש':
        return { bg: 'bg-amber-100 dark:bg-amber-900/40', text: 'text-amber-700 dark:text-amber-300', dot: 'bg-amber-500' };
      case 'הסתיים':
        return { bg: 'bg-emerald-100 dark:bg-emerald-900/40', text: 'text-emerald-700 dark:text-emerald-300', dot: 'bg-emerald-500' };
      default:
        return { bg: 'bg-muted', text: 'text-muted-foreground', dot: 'bg-gray-500' };
    }
  };

  const getUrgencyIndicators = (project: Project) => {
    const indicators = [];
    const dl = deadlineInfo(project.endDate, project.status);
    if (dl.tone === 'overdue')
      indicators.push({ icon: AlertTriangle, label: dl.label, color: 'text-red-500', bg: 'bg-red-100' });
    if (project.clientAwaitingResponse)
      indicators.push({ icon: Clock, label: 'ממתין למענה', color: 'text-amber-500', bg: 'bg-amber-100' });
    if (!project.reportReceived && project.status !== 'הסתיים')
      indicators.push({ icon: FileWarning, label: 'דוח חסר', color: 'text-purple-500', bg: 'bg-purple-100' });
    return indicators;
  };

  const getRowStyle = (project: Project, isSelected: boolean) => {
    if (isSelected) return 'bg-primary/5 border-r-4 border-r-primary';
    const urgency = getUrgencyLevel(project);
    if (urgency >= 3) return 'border-r-4 border-r-red-500 hover:bg-red-50/60 dark:hover:bg-red-950/20';
    if (urgency >= 2) return 'border-r-4 border-r-amber-400 hover:bg-amber-50/60 dark:hover:bg-amber-950/20';
    if (urgency >= 1) return 'border-r-4 border-r-purple-300 hover:bg-purple-50/40 dark:hover:bg-purple-950/20';
    return 'hover:bg-muted/50 border-r-4 border-r-transparent';
  };

  const getProgressWidth = (project: Project) => overallProgress(project.stages ?? []);

  const reqCounts = (project: Project) => {
    const required = (project.stages ?? []).flatMap((s) => s.requirements.filter((r) => r.required));
    return { done: required.filter(isRequirementSatisfied).length, total: required.length };
  };

  const stop = (e: React.MouseEvent | React.KeyboardEvent) => e.stopPropagation();

  if (projects.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-16 text-center">
          <CheckCircle2 className="h-12 w-12 mx-auto mb-4 text-muted-foreground/40" />
          <p className="text-lg font-medium text-muted-foreground">אין תיקים להצגה</p>
          <p className="text-sm text-muted-foreground/70 mt-1">צור תיק חדש כדי להתחיל</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="elevated border-border/60">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-lg font-semibold">תיקים פעילים</CardTitle>
          <div className="relative flex-1 sm:w-72">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="חיפוש תיק, יבואן, מדינה, משגיח..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-9 h-9"
            />
          </div>
        </div>

        {/* Status filter chips */}
        <div className="flex flex-wrap items-center gap-2 pt-2">
          {(['all', ...STATUS_OPTIONS] as const).map((s) => {
            const count = s === 'all' ? projects.length : projects.filter((p) => p.status === s).length;
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'rounded-full px-3 py-1 text-xs font-medium transition-colors border',
                  active
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-card text-muted-foreground border-border hover:bg-muted'
                )}
              >
                {s === 'all' ? 'הכל' : s} <span className="opacity-70">({count})</span>
              </button>
            );
          })}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-muted-foreground hidden sm:inline">קבץ לפי:</span>
            <Select value={groupBy} onValueChange={(v) => setGroupBy(v as typeof groupBy)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">ללא קיבוץ</SelectItem>
                <SelectItem value="responsible">אחראי/ת</SelectItem>
                <SelectItem value="status">סטטוס</SelectItem>
                <SelectItem value="month">חודש</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Mobile: card list (avoids horizontal scroll on small screens) */}
        <div className="md:hidden divide-y divide-border/60">
          {filteredAndSortedProjects.length === 0 && (
            <div className="py-12 text-center text-sm text-muted-foreground">לא נמצאו תיקים תואמים</div>
          )}
          {filteredAndSortedProjects.map((project) => {
            const statusConfig = getStatusConfig(project.status);
            const indicators = getUrgencyIndicators(project);
            const progress = getProgressWidth(project);
            const { done, total } = reqCounts(project);
            const milestones = caseMilestones(project);
            return (
              <Link
                key={project.id}
                href={`/case/${project.id}`}
                className="block p-4 active:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate">{project.projectName}</span>
                      {indicators.slice(0, 2).map((ind, i) => (
                        <span key={i} className={cn('p-1 rounded shrink-0', ind.bg)}>
                          <ind.icon className={cn('h-3 w-3', ind.color)} />
                        </span>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5 truncate">
                      {project.importer} · {project.country}
                    </p>
                  </div>
                  <Badge className={cn('shrink-0 gap-1 border-0', statusConfig.bg, statusConfig.text)}>
                    <span className={cn('h-1.5 w-1.5 rounded-full', statusConfig.dot)} />
                    {project.status}
                  </Badge>
                </div>

                {/* Progress */}
                <div className="mt-3 space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>התקדמות</span>
                    <span className="tabular-nums font-medium text-foreground">
                      {total > 0 ? `${done}/${total} דרישות` : `${progress}%`}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-l from-emerald-400 to-emerald-500 transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Kosher pipeline dots */}
                <div className="mt-3 flex items-center gap-1.5">
                  {milestones.map((m) => (
                    <span
                      key={String(m.key)}
                      title={m.label}
                      className={cn(
                        'h-2 w-2 rounded-full',
                        m.done ? 'bg-emerald-500' : 'bg-muted-foreground/25'
                      )}
                    />
                  ))}
                  <span className="mr-auto text-[11px] text-muted-foreground">{project.responsible}</span>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Desktop: full table */}
        <div className="overflow-x-auto hidden md:block">
          <Table>
            <TableHeader className="sticky top-0 z-10 bg-card">
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <SortHeader field="projectName" label="פרויקט" />
                <SortHeader field="importer" label="יבואן" />
                <TableHead className="text-right font-semibold hidden md:table-cell">התקדמות</TableHead>
                <SortHeader field="status" label="סטטוס" />
                <TableHead className="text-right font-semibold hidden lg:table-cell">אחראי</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {grouped.map((group) => (
                <Fragment key={group.key}>
                  {groupBy !== 'none' && (
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableCell colSpan={10} className="py-2 text-sm font-semibold">
                        {group.label} <span className="text-muted-foreground font-normal">({group.items.length})</span>
                      </TableCell>
                    </TableRow>
                  )}
                  {group.items.map((project) => {
                const statusConfig = getStatusConfig(project.status);
                const indicators = getUrgencyIndicators(project);
                const isSelected = selectedProjectId === project.id;

                return (
                  <TableRow
                    key={project.id}
                    onClick={() => onSelectProject(project)}
                    className={`cursor-pointer transition-colors ${getRowStyle(project, isSelected)}`}
                  >
                    <TableCell className="py-3.5">
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/case/${project.id}`}
                            className="font-semibold text-sm hover:text-primary hover:underline"
                            onClick={stop}
                          >
                            {project.projectName}
                          </Link>
                          {indicators.length > 0 && (
                            <div className="flex items-center gap-1">
                              {indicators.map((ind, i) => (
                                <TooltipProvider key={i}>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className={`p-1 rounded ${ind.bg}`}>
                                        <ind.icon className={`h-3 w-3 ${ind.color}`} />
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent side="top" className="text-xs">{ind.label}</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                          <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{project.id}</span>
                          <span>{project.country}</span>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell>
                      <p className="text-sm font-medium">{project.importer}</p>
                      <p className="text-[11px] text-muted-foreground">{project.importerPhone}</p>
                    </TableCell>

                    <TableCell className="hidden md:table-cell">
                      <div className="w-28">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] text-muted-foreground truncate">
                            {(() => { const c = reqCounts(project); return `${c.done}/${c.total} דרישות`; })()}
                          </span>
                          <span className="text-[10px] font-medium tabular-nums">{getProgressWidth(project)}%</span>
                        </div>
                        <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                          <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${getProgressWidth(project)}%` }} />
                        </div>
                      </div>
                    </TableCell>

                    {/* Status — inline editable */}
                    <TableCell onClick={stop}>
                      {editable ? (
                        <Select value={project.status} onValueChange={(v) => onUpdateProject!(project.id, { status: v as ProjectStatus })}>
                          <SelectTrigger className={cn('h-8 w-[110px] border-0 gap-1.5 font-medium', statusConfig.bg, statusConfig.text)}>
                            <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((s) => (
                              <SelectItem key={s} value={s}>{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge className={`${statusConfig.bg} ${statusConfig.text} border-0 gap-1.5`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${statusConfig.dot}`} />
                          {project.status}
                        </Badge>
                      )}
                    </TableCell>

                    {/* Responsible — inline editable */}
                    <TableCell className="hidden lg:table-cell" onClick={stop}>
                      {editable ? (
                        <Select value={project.responsible} onValueChange={(v) => onUpdateProject!(project.id, { responsible: v as Project['responsible'] })}>
                          <SelectTrigger className="h-8 w-[90px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {RESPONSIBLE_OPTIONS.map((r) => (
                              <SelectItem key={r} value={r}>{r}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline">{project.responsible}</Badge>
                      )}
                    </TableCell>

                    {/* Actions */}
                    <TableCell onClick={stop}>
                      <div className="flex items-center justify-end gap-0.5">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" title="פתח תיק" onClick={() => onOpenFullCase(project)}>
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onOpenFullCase(project)}>
                              <Eye className="h-4 w-4 ml-2" />
                              פתח תיק מלא
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`https://wa.me/${project.importerPhone?.replace(/\D/g, '')}`, '_blank')}>
                              <MessageCircle className="h-4 w-4 ml-2 text-emerald-600" />
                              WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`tel:${project.importerPhone}`, '_self')}>
                              <Phone className="h-4 w-4 ml-2 text-blue-600" />
                              התקשר
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(`mailto:${project.importerEmail}`, '_self')}>
                              <Mail className="h-4 w-4 ml-2" />
                              שלח אימייל
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem asChild>
                              <Link href={`/case/${project.id}`}>
                                <FileCheck className="h-4 w-4 ml-2" />
                                מסמכי התיק
                              </Link>
                            </DropdownMenuItem>
                            {onArchiveProject && (
                              <DropdownMenuItem onClick={() => onArchiveProject(project)}>
                                <Archive className="h-4 w-4 ml-2" />
                                העבר לארכיון
                              </DropdownMenuItem>
                            )}
                            {isAdmin && onDeleteProject && (
                              <DropdownMenuItem className="text-destructive" onClick={() => onDeleteProject(project)}>
                                <Trash2 className="h-4 w-4 ml-2" />
                                מחק לצמיתות
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
                  })}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="px-4 py-3 border-t bg-muted/20 text-xs text-muted-foreground flex items-center justify-between">
          <span>מציג {filteredAndSortedProjects.length} מתוך {projects.length} תיקים</span>
          {(searchQuery || statusFilter !== 'all') && (
            <Button variant="ghost" size="sm" onClick={() => { setSearchQuery(''); setStatusFilter('all'); }} className="h-7 text-xs">
              נקה סינון
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
