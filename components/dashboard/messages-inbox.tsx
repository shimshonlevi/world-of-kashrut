'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, ChevronLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagesInboxProps {
  projects: Project[];
  limit?: number;
}

// Chat message ids are minted as `m-<epoch>` — recover the time for sorting.
function epochOf(m: { id: string; timestamp: string }) {
  const fromId = /^m-(\d+)/.exec(m.id)?.[1];
  if (fromId) return parseInt(fromId);
  const d = new Date(m.timestamp).getTime();
  return isNaN(d) ? 0 : d;
}

const timeAgo = (epoch: number) => {
  if (!epoch) return '';
  const mins = Math.round((Date.now() - epoch) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} ד׳`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `לפני ${hrs} ש׳`;
  const days = Math.round(hrs / 24);
  return `לפני ${days} י׳`;
};

/** Recent conversations across all cases — who wrote, in which case. */
export function MessagesInbox({ projects, limit = 6 }: MessagesInboxProps) {
  const router = useRouter();

  const messages = useMemo(() => {
    const all = projects.flatMap((p) =>
      (p.chatHistory ?? [])
        .filter((m) => !m.isInternal)
        .map((m) => ({ project: p, msg: m, t: epochOf(m) }))
    );
    return all.sort((a, b) => b.t - a.t).slice(0, limit);
  }, [projects, limit]);

  return (
    <Card className="border-border/60 elevated overflow-hidden">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
            <MessageSquare className="h-4 w-4" />
          </span>
          הודעות אחרונות
          {messages.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">{messages.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">אין הודעות עדיין.</p>
        ) : (
          <div className="space-y-1">
            {messages.map(({ project, msg, t }) => (
              <button
                key={msg.id}
                onClick={() => router.push(`/case/${project.id}?section=communication`)}
                className="group flex w-full items-center gap-3 rounded-lg p-2 text-right transition-colors hover:bg-muted/60"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                  {msg.sender?.charAt(0) || '?'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium truncate">{msg.sender}</span>
                    <span className="text-[11px] text-muted-foreground shrink-0">{timeAgo(t)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                  <span className="text-[10px] text-primary/80 truncate">{project.projectName}</span>
                </div>
                <ChevronLeft className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
