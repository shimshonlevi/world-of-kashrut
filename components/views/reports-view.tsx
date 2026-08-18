'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import { overallProgress } from '@/lib/templates';
import { deadlineInfo } from '@/lib/dates';
import { downloadCsv } from '@/lib/export';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  FileText,
  Download,
  CheckCircle2,
  Clock,
  TrendingUp,
  DollarSign,
  Wallet,
  Users,
} from 'lucide-react';

interface ReportsViewProps {
  projects: Project[];
}

const fmt = (n: number) => `₪${n.toLocaleString()}`;

export function ReportsView({ projects }: ReportsViewProps) {
  const router = useRouter();

  const stats = useMemo(() => {
    const revenue = projects.reduce((s, p) => s + (p.quotedPrice || 0), 0);
    const expenses = projects.reduce((s, p) => s + (p.actualExpenses || 0), 0);
    const unpaid = projects.filter((p) => !p.paid);
    const unpaidSum = unpaid.reduce((s, p) => s + (p.quotedPrice || 0), 0);
    const byStatus = {
      'בתהליך': projects.filter((p) => p.status === 'בתהליך').length,
      'הוגש': projects.filter((p) => p.status === 'הוגש').length,
      'הסתיים': projects.filter((p) => p.status === 'הסתיים').length,
    };
    const byResponsible = new Map<string, number>();
    for (const p of projects) byResponsible.set(p.responsible, (byResponsible.get(p.responsible) || 0) + 1);
    return { revenue, expenses, profit: revenue - expenses, unpaidCount: unpaid.length, unpaidSum, byStatus, byResponsible };
  }, [projects]);

  const documents = useMemo(
    () =>
      projects.flatMap((p) =>
        (p.stages ?? []).flatMap((s) =>
          s.requirements
            .filter((r) => r.type === 'document')
            .map((r) => ({ projectId: p.id, projectName: p.projectName, importer: p.importer, stage: s.name, label: r.label, status: r.status }))
        )
      ),
    [projects]
  );

  const exportProjects = () => {
    downloadCsv(
      `תיקים-${new Date().toISOString().split('T')[0]}`,
      ['מזהה', 'פרויקט', 'יבואן', 'מדינה', 'סוג כשרות', 'אחראי', 'סטטוס', 'שלב', 'התקדמות%', 'יעד', 'הצעת מחיר', 'הוצאות', 'שולם'],
      projects.map((p) => [
        p.id, p.projectName, p.importer, p.country, p.kosherBody, p.responsible, p.status,
        p.currentStage, p.stages?.length ? overallProgress(p.stages) : 0, p.endDate,
        p.quotedPrice || 0, p.actualExpenses || 0, p.paid ? 'כן' : 'לא',
      ])
    );
  };

  const exportDocuments = () => {
    downloadCsv(
      `מסמכים-${new Date().toISOString().split('T')[0]}`,
      ['פרויקט', 'יבואן', 'שלב', 'מסמך', 'סטטוס'],
      documents.map((d) => [d.projectName, d.importer, d.stage, d.label, d.status])
    );
  };

  const docStatusLabel = (s: string) =>
    s === 'approved' ? 'מאושר' : s === 'rejected' ? 'נדחה' : s === 'submitted' ? 'ממתין לבדיקה' : 'טרם הועלה';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">דוחות וסיכומים</h2>
          <p className="text-muted-foreground">סקירת ביצועים, פיננסים ומסמכים</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={exportProjects}>
            <Download className="h-4 w-4" />
            ייצוא תיקים (Excel)
          </Button>
          <Button variant="outline" className="gap-2" onClick={exportDocuments}>
            <Download className="h-4 w-4" />
            ייצוא מסמכים
          </Button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={DollarSign} tone="text-sky-600 bg-sky-500/10" label="הכנסות (הצעות)" value={fmt(stats.revenue)} />
        <StatCard icon={Wallet} tone="text-amber-600 bg-amber-500/10" label="הוצאות בפועל" value={fmt(stats.expenses)} />
        <StatCard icon={TrendingUp} tone="text-emerald-600 bg-emerald-500/10" label="רווח" value={fmt(stats.profit)} />
        <StatCard icon={Clock} tone="text-rose-600 bg-rose-500/10" label={`חוב פתוח (${stats.unpaidCount})`} value={fmt(stats.unpaidSum)} />
      </div>

      {/* Status + workload */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">תיקים לפי סטטוס</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.byStatus).map(([label, count]) => {
              const total = projects.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{label}</span>
                    <span className="text-muted-foreground tabular-nums">{count} · {pct}%</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" /> עומס לפי אחראי</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {[...stats.byResponsible.entries()].map(([name, count]) => {
              const total = projects.length || 1;
              const pct = Math.round((count / total) * 100);
              return (
                <div key={name}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{name}</span>
                    <span className="text-muted-foreground tabular-nums">{count} תיקים</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-gold-gradient rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
            {stats.byResponsible.size === 0 && <p className="text-sm text-muted-foreground">אין נתונים</p>}
          </CardContent>
        </Card>
      </div>

      {/* Documents */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4" /> מסמכי כל התיקים ({documents.length})</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">אין מסמכים מוגדרים בתיקים.</p>
          ) : (
            <div className="space-y-2 max-h-[28rem] overflow-y-auto">
              {documents.map((d, i) => (
                <button
                  key={i}
                  onClick={() => router.push(`/case/${d.projectId}`)}
                  className="w-full flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors text-right"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {d.status === 'approved' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                    ) : d.status === 'submitted' ? (
                      <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    ) : (
                      <FileText className="h-4 w-4 text-muted-foreground shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{d.label}</p>
                      <p className="text-xs text-muted-foreground truncate">{d.projectName} · {d.stage}</p>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      d.status === 'approved'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : d.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : d.status === 'submitted'
                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                        : 'bg-muted text-muted-foreground'
                    }
                  >
                    {docStatusLabel(d.status)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, tone, label, value }: { icon: React.ComponentType<{ className?: string }>; tone: string; label: string; value: string }) {
  return (
    <Card className="border-border/60 elevated">
      <CardContent className="p-5 flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
          <p className="text-xl font-bold mt-1 tabular-nums">{value}</p>
        </div>
        <div className={`p-3 rounded-xl ${tone}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}
