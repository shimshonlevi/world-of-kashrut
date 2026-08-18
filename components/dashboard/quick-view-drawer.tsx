'use client';

import { useRouter } from 'next/navigation';
import { Project } from '@/lib/types';
import { overallProgress } from '@/lib/templates';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/status-badge';
import { deadlineInfo } from '@/lib/dates';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Phone,
  Mail,
  MessageCircle,
  ExternalLink,
  ArrowLeft,
  Clock,
  FileText,
  CheckCircle2,
  Circle,
  AlertTriangle,
} from 'lucide-react';

interface QuickViewDrawerProps {
  project: Project | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewDrawer({ project, isOpen, onClose }: QuickViewDrawerProps) {
  const router = useRouter();

  if (!project) return null;

  const progress = overallProgress(project.stages ?? []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'בתהליך':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'הוגש':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'הסתיים':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-full sm:w-[480px] p-0 bg-background">
        <SheetHeader className="p-6 pb-4 border-b bg-muted/30">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <SheetTitle className="text-xl font-semibold text-right">
                {project.projectName}
              </SheetTitle>
              <p className="text-sm text-muted-foreground">{project.importer}</p>
            </div>
            <StatusBadge status={project.status} />
          </div>
          <div className="flex items-center gap-2 pt-2 text-sm text-muted-foreground">
            <span className="font-mono">{project.id}</span>
            <span>•</span>
            <span>{project.country}</span>
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-280px)]">
          <div className="p-6 space-y-6">
            {/* Urgent Alerts */}
            {(() => {
              const dl = deadlineInfo(project.endDate, project.status);
              const overdue = dl.tone === 'overdue';
              if (!overdue && !project.clientAwaitingResponse) return null;
              return (
                <div className="p-4 rounded-lg bg-destructive/5 border border-destructive/20">
                  <div className="flex items-center gap-2 text-destructive mb-2">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium text-sm">התראות</span>
                  </div>
                  <ul className="space-y-1 text-sm text-destructive/80">
                    {overdue && <li>{dl.label}</li>}
                    {project.clientAwaitingResponse && <li>יבואן ממתין לתגובה</li>}
                  </ul>
                </div>
              );
            })()}

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-sm font-medium text-muted-foreground">התקדמות התיק</h4>
                <span className="text-sm font-semibold tabular-nums">{progress}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div className={`h-full rounded-full transition-all duration-500 ${progress === 100 ? 'bg-emerald-500' : 'bg-primary'}`} style={{ width: `${progress}%` }} />
              </div>
            </div>

            <Separator />

            {/* Quick Chat */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">הודעות אחרונות</h4>
              <div className="space-y-2">
                {project.chatHistory.slice(-2).map((msg) => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-lg text-sm ${
                      msg.isInternal ? 'bg-blue-50 border-blue-100' : 'bg-muted'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-xs">{msg.sender}</span>
                      <span className="text-[10px] text-muted-foreground">{msg.timestamp.split(' ')[1]}</span>
                    </div>
                    <p className="text-muted-foreground">{msg.message}</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Quick Actions */}
            <div>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">פעולות מהירות</h4>
              <div className="grid grid-cols-3 gap-2">
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                  <a href={`https://wa.me/${project.importerPhone?.replace(/\D/g, '')}`} target="_blank" rel="noreferrer noopener">
                    <MessageCircle className="h-4 w-4 text-emerald-600" />
                    <span className="text-[10px]">WhatsApp</span>
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                  <a href={`tel:${project.importerPhone}`}>
                    <Phone className="h-4 w-4 text-blue-600" />
                    <span className="text-[10px]">טלפון</span>
                  </a>
                </Button>
                <Button variant="outline" size="sm" className="h-auto py-3 flex-col gap-1" asChild>
                  <a href={`mailto:${project.importerEmail}`}>
                    <Mail className="h-4 w-4 text-amber-600" />
                    <span className="text-[10px]">אימייל</span>
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-background">
          <Button 
            className="w-full gap-2" 
            onClick={() => {
              onClose();
              router.push(`/case/${project.id}`);
            }}
          >
            <span>למעבר לתיק המלא</span>
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
