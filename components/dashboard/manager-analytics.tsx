'use client';

import { Project } from '@/lib/types';
import { getWorkloadBySecretary, getProfitabilityData } from '@/lib/data';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useMemo } from 'react';

interface ManagerAnalyticsProps {
  projects: Project[];
}

export function ManagerAnalytics({ projects }: ManagerAnalyticsProps) {
  const workloadData = useMemo(() => getWorkloadBySecretary(projects), [projects]);
  const profitabilityData = useMemo(() => getProfitabilityData(projects), [projects]);

  const maxWorkload = Math.max(...Object.values(workloadData).map(w => w.total), 1);

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-semibold">תצוגת מנהל</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Workload Chart */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">חלוקת עומס לפי מזכירה</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {Object.entries(workloadData).map(([name, data]) => (
              <div key={name}>
                <div className="flex items-center justify-between mb-2">
                  <span className={`font-medium ${name === 'נחמה' ? 'text-pink-600' : 'text-cyan-600'}`}>
                    {name}
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {data.total} תיקים
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">בתהליך</span>
                    <Progress
                      value={(data.inProgress / maxWorkload) * 100}
                      className="h-3 flex-1"
                    />
                    <span className="text-xs font-medium w-8 text-left">{data.inProgress}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground w-20">הושלמו</span>
                    <Progress
                      value={(data.completed / maxWorkload) * 100}
                      className="h-3 flex-1 [&>div]:bg-emerald-500"
                    />
                    <span className="text-xs font-medium w-8 text-left">{data.completed}</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Profitability List */}
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base font-medium">רווחיות פרויקטים</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {profitabilityData.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      הצעה: ₪{item.quoted.toLocaleString()} | בפועל: ₪{item.actual.toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={
                      item.profit > 0
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-red-50 text-red-700 border-red-200'
                    }
                  >
                    {item.profit > 0 ? '+' : ''}₪{item.profit.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
