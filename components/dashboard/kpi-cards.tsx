'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertTriangle,
  Clock,
  FileCheck,
  TrendingUp,
  TrendingDown,
  Users,
  DollarSign,
  CheckCircle2,
} from 'lucide-react';

interface KPICardsProps {
  stats: {
    urgentTasks: number;
    pendingReports: number;
    awaitingFlightAssignment?: number;
    clientsAwaitingResponse: number;
    totalProfit: number;
    monthlyGrowth: number;
    totalProjects?: number;
    completedThisMonth?: number;
  };
}

export function KPICards({ stats }: KPICardsProps) {
  const cards = [
    {
      id: 'urgent',
      label: 'דורשים טיפול היום',
      value: stats.urgentTasks,
      icon: AlertTriangle,
      tone: stats.urgentTasks > 0 ? 'rose' : 'emerald',
      trend: null,
      pulse: stats.urgentTasks > 0,
      description: stats.urgentTasks > 0 ? 'תיקים דחופים ממתינים' : 'אין משימות דחופות',
    },
    {
      id: 'reports',
      label: 'דוחות לבדיקה',
      value: stats.pendingReports,
      icon: FileCheck,
      tone: 'amber',
      trend: null,
      pulse: false,
      description: 'דוחות משגיח ממתינים לאישור',
    },
    {
      id: 'clients',
      label: 'ממתינים למענה',
      value: stats.clientsAwaitingResponse,
      icon: Users,
      tone: 'sky',
      trend: null,
      pulse: stats.clientsAwaitingResponse > 2,
      description: 'יבואנים שפנו וטרם קיבלו מענה',
    },
    {
      id: 'profit',
      label: 'רווח חודשי',
      value: `${(stats.totalProfit / 1000).toFixed(1)}K`,
      icon: DollarSign,
      tone: 'gold',
      trend: stats.monthlyGrowth,
      pulse: false,
      description: 'רווח מצטבר החודש',
      suffix: '₪',
    },
  ] as const;

  const TONES: Record<string, { rail: string; chip: string; icon: string }> = {
    rose: { rail: 'bg-rose-500', chip: 'bg-rose-500/10', icon: 'text-rose-600' },
    amber: { rail: 'bg-amber-500', chip: 'bg-amber-500/10', icon: 'text-amber-600' },
    sky: { rail: 'bg-sky-500', chip: 'bg-sky-500/10', icon: 'text-sky-600' },
    emerald: { rail: 'bg-emerald-500', chip: 'bg-emerald-500/10', icon: 'text-emerald-600' },
    gold: { rail: 'bg-gold-gradient', chip: 'bg-primary/10', icon: 'text-primary' },
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card) => {
        const t = TONES[card.tone];
        return (
          <TooltipProvider key={card.id}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="bg-card border border-border/60 elevated hover:-translate-y-0.5 hover:shadow-lg transition-all cursor-default overflow-hidden relative">
                  {/* top accent rail */}
                  <div className={`absolute inset-x-0 top-0 h-1 ${t.rail}`} />
                  {card.pulse && (
                    <div className="absolute top-3.5 left-3">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                      </span>
                    </div>
                  )}
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between">
                      <div className="space-y-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                          {card.label}
                        </p>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-3xl font-bold text-foreground tabular-nums">{card.value}</span>
                          {'suffix' in card && card.suffix && (
                            <span className="text-lg text-muted-foreground">{card.suffix}</span>
                          )}
                        </div>
                        {card.trend !== null && (
                          <div className="flex items-center gap-1.5">
                            {card.trend >= 0 ? (
                              <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 gap-1 text-xs dark:bg-emerald-900/40 dark:text-emerald-400">
                                <TrendingUp className="h-3 w-3" />+{card.trend}%
                              </Badge>
                            ) : (
                              <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 gap-1 text-xs dark:bg-rose-900/40 dark:text-rose-400">
                                <TrendingDown className="h-3 w-3" />
                                {card.trend}%
                              </Badge>
                            )}
                            <span className="text-[10px] text-muted-foreground">מהחודש שעבר</span>
                          </div>
                        )}
                      </div>
                      <div className={`p-3 rounded-xl ${t.chip}`}>
                        <card.icon className={`h-6 w-6 ${t.icon}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{card.description}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      })}
    </div>
  );
}
