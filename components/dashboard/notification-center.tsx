'use client';

import { useEffect, useMemo, useState } from 'react';
import { Project } from '@/lib/types';
import {
  computeNotifications,
  mergeRules,
  RECIPIENT_LABEL,
  type NotificationRule,
  type NotificationItem,
  type Urgency,
} from '@/lib/notifications';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { AlertTriangle, Clock, FileWarning, MessageCircle, Phone, ChevronLeft, X, Bell } from 'lucide-react';

interface NotificationCenterProps {
  projects: Project[];
  isOpen: boolean;
  onClose: () => void;
  onSelectProject: (project: Project) => void;
}

const URGENCY_CONFIG: Record<Urgency, { icon: React.ComponentType<{ className?: string }>; bg: string; border: string; iconColor: string }> = {
  high: { icon: AlertTriangle, bg: 'bg-red-50 dark:bg-red-950/30', border: 'border-red-200 dark:border-red-900', iconColor: 'text-red-500' },
  medium: { icon: Clock, bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-200 dark:border-amber-900', iconColor: 'text-amber-500' },
  low: { icon: FileWarning, bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-200 dark:border-blue-900', iconColor: 'text-blue-500' },
};

export function NotificationCenter({ projects, isOpen, onClose, onSelectProject }: NotificationCenterProps) {
  const [rules, setRules] = useState<NotificationRule[]>(mergeRules(null));

  useEffect(() => {
    if (!isOpen) return;
    fetch('/api/settings/notifications')
      .then((r) => r.json())
      .then((d) => setRules(mergeRules(d.value)))
      .catch(() => {});
  }, [isOpen]);

  const notifications: NotificationItem[] = useMemo(
    () => computeNotifications(projects, rules),
    [projects, rules]
  );

  const urgentCount = notifications.filter((n) => n.urgency === 'high').length;
  const warningCount = notifications.filter((n) => n.urgency === 'medium').length;

  if (!isOpen) return null;

  return (
    <Card className="fixed top-20 left-4 w-96 shadow-xl z-50 max-h-[calc(100vh-6rem)]">
      <CardHeader className="pb-3 border-b">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">מרכז התראות</CardTitle>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-2 mt-2">
          {urgentCount > 0 && <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{urgentCount} דחוף</Badge>}
          {warningCount > 0 && <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">{warningCount} אזהרות</Badge>}
          <Badge variant="secondary">{notifications.length} סה״כ</Badge>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {notifications.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground">
            <Bell className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">אין התראות חדשות</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {notifications.map((notif) => {
                const config = URGENCY_CONFIG[notif.urgency];
                const project = projects.find((p) => p.id === notif.projectId);
                return (
                  <div
                    key={notif.id}
                    className={`p-4 ${config.bg} hover:opacity-90 cursor-pointer transition-opacity`}
                    onClick={() => project && onSelectProject(project)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg} border ${config.border}`}>
                        <config.icon className={`h-4 w-4 ${config.iconColor}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold mb-0.5">{notif.title}</p>
                        <p className="text-xs text-muted-foreground mb-2">
                          {notif.projectName} · {notif.importer}
                        </p>

                        {/* Recipients */}
                        {notif.recipients.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1 mb-2">
                            <span className="text-[10px] text-muted-foreground">לעדכן:</span>
                            {notif.recipients.map((r) => (
                              <Badge key={r.role} variant="outline" className="text-[9px] h-4 px-1.5">
                                {RECIPIENT_LABEL[r.role]}: {r.name}
                              </Badge>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-end gap-1">
                          {project?.importerPhone && (
                            <>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-emerald-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`https://wa.me/${project.importerPhone?.replace(/\D/g, '')}`, '_blank');
                                }}
                              >
                                <MessageCircle className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-blue-600"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  window.open(`tel:${project.importerPhone}`, '_self');
                                }}
                              >
                                <Phone className="h-3.5 w-3.5" />
                              </Button>
                            </>
                          )}
                          <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
