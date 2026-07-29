'use client';

import type { Project } from '@/lib/types';
import { overallProgress, stageProgress } from '@/lib/templates';
import { caseAttention, type AttentionSection } from '@/lib/attention';
import { deadlineInfo } from '@/lib/dates';
import { exportProjectCsv, requirementValueText } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Printer,
  Building2,
  Globe,
  User,
  CalendarDays,
  Plane,
  Hotel,
  Factory,
  DollarSign,
  FileText,
  ListChecks,
  CheckCircle2,
  Clock,
  ExternalLink,
  AlertTriangle,
  ChevronLeft,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const reqValue = requirementValueText;

function Field({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex justify-between gap-3 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm font-medium text-left">{value || '—'}</span>
    </div>
  );
}

function Section({ icon: Icon, title, children }: { icon: React.ComponentType<{ className?: string }>; title: string; children: React.ReactNode }) {
  return (
    <Card className="border-border/60 break-inside-avoid">
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Icon className="h-4 w-4" />
          </span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

export function CaseOverview({
  project,
  onNavigate,
}: {
  project: Project;
  onNavigate?: (section: AttentionSection) => void;
}) {
  const stages = project.stages ?? [];
  const progress = overallProgress(stages);
  const deadline = deadlineInfo(project.endDate, project.status);
  const profit = (project.quotedPrice || 0) - (project.actualExpenses || 0);
  const money = (n?: number) => (n != null ? `₪${n.toLocaleString()}` : '—');
  const attention = caseAttention(project);

  const toneCls: Record<string, string> = {
    danger: 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100',
    warning: 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100',
    info: 'border-sky-200 bg-sky-50 text-sky-700 hover:bg-sky-100',
  };

  const exportToExcel = () => exportProjectCsv(project);

  return (
    <div className="max-w-4xl space-y-4">
      {/* What needs work now — the first thing you see on entering the case */}
      {attention.length > 0 ? (
        <Card className="border-amber-200/70 bg-gradient-to-l from-card to-amber-50/40 elevated">
          <CardHeader className="pb-2.5">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </span>
              דורש טיפול עכשיו
              <Badge variant="outline" className="text-[10px] border-amber-300 text-amber-700">{attention.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {attention.map((a) => (
                <button
                  key={a.id}
                  onClick={() => onNavigate?.(a.section)}
                  className={cn(
                    'group flex items-center gap-2 rounded-lg border px-3 py-2 text-right transition-colors',
                    toneCls[a.tone]
                  )}
                >
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm font-medium truncate">{a.label}</span>
                    {a.detail && <span className="block text-[11px] opacity-80">{a.detail}</span>}
                  </span>
                  <ChevronLeft className="h-4 w-4 shrink-0 opacity-60 group-hover:opacity-100" />
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-emerald-200/70 bg-gradient-to-l from-card to-emerald-50/40">
          <CardContent className="flex items-center gap-3 py-4">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold text-sm">התיק מסודר — אין משימות פתוחות</p>
              <p className="text-xs text-muted-foreground">כל דרישות החובה טופלו ואין התראות פעילות.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Header + actions */}
      <div className="flex items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-base font-semibold">מסמך התיק</h2>
          <p className="text-sm text-muted-foreground">כל פרטי הפרויקט במקום אחד — לייצוא או הדפסה</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            הדפסה / PDF
          </Button>
          <Button className="gap-2" onClick={exportToExcel}>
            <Download className="h-4 w-4" />
            ייצוא לאקסל
          </Button>
        </div>
      </div>

      {/* Progress banner */}
      <Card className="border-border/60 elevated">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold">התקדמות כללית</span>
            <span className="text-sm tabular-nums font-medium">{progress}%</span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div className={cn('h-full transition-all', progress === 100 ? 'bg-emerald-500' : 'bg-primary')} style={{ width: `${progress}%` }} />
          </div>
          <div className="flex flex-wrap gap-2 mt-3">
            <Badge variant="outline">{project.status}</Badge>
            {deadline.tone !== 'none' && deadline.tone !== 'done' && (
              <Badge variant="outline" className={deadline.tone === 'overdue' ? 'bg-red-50 text-red-700 border-red-200' : deadline.tone === 'soon' ? 'bg-amber-50 text-amber-700 border-amber-200' : ''}>
                <Clock className="h-3 w-3 ml-1" />{deadline.label}
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Section icon={Building2} title="פרטים כלליים">
          <Field label="יבואן" value={project.importer} />
          <Field label="טלפון" value={project.importerPhone} />
          <Field label="אימייל" value={project.importerEmail} />
          <Field label="מדינה" value={project.country} />
          <Field label="סוג כשרות" value={project.kosherBody} />
          <Field label="אחראי/ת" value={project.responsible} />
          <Field label="מפעל" value={project.factoryName} />
        </Section>

        <Section icon={DollarSign} title="פיננסי">
          <Field label="הצעת מחיר" value={money(project.quotedPrice)} />
          <Field label="הוצאות בפועל" value={money(project.actualExpenses)} />
          <Field label="רווח" value={money(profit)} />
          <Field label="תשלום" value={project.paid ? 'שולם' : 'חוב פתוח'} />
          <Field label="התחלה → יעד" value={`${project.startDate} → ${project.endDate}`} />
        </Section>

        <Section icon={Plane} title="לוגיסטיקה">
          <Field label="חברת תעופה" value={project.flight?.airline} />
          <Field label="מספר טיסה" value={project.flight?.flightNumber} />
          <Field label="יציאה → חזרה" value={`${project.flight?.departureDate || '—'} → ${project.flight?.arrivalDate || '—'}`} />
          <Field label="סטטוס טיסה" value={project.flight?.status === 'confirmed' ? 'מאושר' : project.flight?.status === 'pending' ? 'בהמתנה' : 'לא הוזמן'} />
          <Field label="מלון" value={project.hotel?.hotelName} />
          <Field label="סטטוס מלון" value={project.hotel?.status === 'confirmed' ? 'מאושר' : project.hotel?.status === 'pending' ? 'בהמתנה' : 'לא הוזמן'} />
        </Section>

        <Section icon={User} title="משגיח ודוח">
          <Field label="משגיח" value={project.supervisor} />
          <Field label="טלפון משגיח" value={project.supervisorPhone} />
          <Field label="דוח התקבל" value={project.reportReceived ? 'כן' : 'לא'} />
          {project.productionDetails && (
            <>
              <Field label="שעות ייצור/יום" value={project.productionDetails.productionHoursPerDay} />
              <Field label="כמות (טון)" value={project.productionDetails.expectedQuantityTons} />
              <Field label="איש קשר מקומי" value={project.productionDetails.localContact} />
            </>
          )}
        </Section>
      </div>

      {/* Requirement groups with filled values — the unified workflow record */}
      <Section icon={ListChecks} title="דרישות התיק">
        <div className="space-y-4">
          {stages.length === 0 && <p className="text-sm text-muted-foreground">לא הוגדרו שלבים לתיק זה.</p>}
          {stages.map((s, i) => (
            <div key={s.id} className="break-inside-avoid">
              <div className="flex items-center gap-2 mb-1.5">
                <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold', s.status === 'completed' ? 'bg-emerald-500 text-white' : 'bg-muted text-muted-foreground')}>
                  {s.status === 'completed' ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <span className="font-semibold text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground">· {stageProgress(s)}%</span>
              </div>
              <div className="pr-8 space-y-0.5">
                {s.requirements.map((r) => (
                  <div key={r.id} className="flex justify-between gap-3 text-sm py-1 border-b border-border/40 last:border-0">
                    <span className="text-muted-foreground">{r.label}</span>
                    <span className={cn('font-medium text-left', (r.status === 'approved' || r.status === 'done') && 'text-emerald-600', r.status === 'rejected' && 'text-red-600')}>
                      {reqValue(r)}
                    </span>
                  </div>
                ))}
                {s.requirements.length === 0 && <span className="text-xs text-muted-foreground">אין דרישות</span>}
              </div>
            </div>
          ))}
        </div>
      </Section>
    </div>
  );
}
