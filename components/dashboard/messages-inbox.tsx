'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { Project } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MessagesInboxProps {
  projects: Project[];
  limit?: number;
  onOpenAll?: () => void;
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
export function MessagesInbox({ projects, limit = 6, onOpenAll }: MessagesInboxProps) {
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
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600">
              <MessageSquare className="h-4 w-4" />
            </span>
            הודעות אחרונות
            {messages.length > 0 && (
              <Badge variant="secondary" className="text-[10px]">{messages.length}</Badge>
            )}
          </CardTitle>
          {onOpenAll && (
            <button onClick={onOpenAll} className="text-xs font-semibold text-primary hover:underline">הכל ←</button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">אין הודעות עדיין.</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {messages.map(({ project, msg, t }) => (
              <li key={msg.id}>
                <button
                  onClick={() => router.push(`/case/${project.id}?section=communication`)}
                  className="group flex w-full items-center gap-2.5 px-4 py-2 text-right transition-colors hover:bg-muted/60"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {msg.sender?.charAt(0) || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[13px] font-medium truncate">{msg.sender}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(t)}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{msg.message}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
