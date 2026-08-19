'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { Project, ChatMessage } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EmptyState } from '@/components/shared/empty-state';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  MessageSquare, Users, FolderOpen, Send, Link2, ExternalLink, Search, ChevronDown, Lock, Sparkles,
} from 'lucide-react';

// ---- types ----
interface TeamMessage {
  id: string; body: string; fromUserId: string; fromName: string;
  toUserId: string | null; toName: string | null; caseId: string | null; createdAt: string;
}
type Dir = 'in' | 'out' | 'note';
interface NormMsg { id: string; sender: string; body: string; at: number; dir: Dir; caseId?: string | null; via?: string }
interface Thread {
  id: string; kind: 'case' | 'team'; title: string; subtitle?: string;
  caseId?: string; partnerId?: string; messages: NormMsg[]; lastAt: number; lastPreview: string;
}

const TEAM_ID = 'team-all';
const TEMPLATES = ['קיבלתי, מטפל 👍', 'נא לעדכן סטטוס', 'הועבר לטיפולך', 'ממתין לתשובה מהיבואן', 'סיימתי — אפשר להתקדם'];

function epochOf(m: { id: string; timestamp: string }) {
  const fromId = /^m-(\d+)/.exec(m.id)?.[1];
  if (fromId) return parseInt(fromId);
  const d = new Date(m.timestamp).getTime();
  return isNaN(d) ? 0 : d;
}
function timeAgo(epoch: number) {
  if (!epoch) return '';
  const mins = Math.round((Date.now() - epoch) / 60000);
  if (mins < 1) return 'עכשיו';
  if (mins < 60) return `לפני ${mins} ד׳`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `לפני ${hrs} ש׳`;
  const days = Math.round(hrs / 24);
  if (days === 1) return 'אתמול';
  return `לפני ${days} י׳`;
}

interface CommunicationViewProps {
  projects: Project[];
  userId?: string;
  userName?: string;
  onUpdateProject: (id: string, patch: Partial<Project>) => void;
  onOpenCase: (projectId: string) => void;
}

export function CommunicationView({ projects, userId, userName, onUpdateProject, onOpenCase }: CommunicationViewProps) {
  const { toast } = useToast();
  const [team, setTeam] = useState<TeamMessage[]>([]);
  const [users, setUsers] = useState<{ id: string; name: string }[]>([]);
  const [tab, setTab] = useState<'all' | 'case' | 'team'>('all');
  const [activeId, setActiveId] = useState<string>(TEAM_ID);
  const [search, setSearch] = useState('');
  const [draft, setDraft] = useState('');
  const [linkCaseId, setLinkCaseId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const bodyRef = useRef<HTMLDivElement>(null);

  const loadTeam = () => fetch('/api/messages').then((r) => r.json()).then((d) => setTeam(d.messages || [])).catch(() => {});
  useEffect(() => {
    loadTeam();
    fetch('/api/users/names').then((r) => r.json()).then((d) => setUsers(d.users || [])).catch(() => {});
  }, []);

  const projName = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // ---- build threads (case chats + one shared team feed) ----
  const threads = useMemo<Thread[]>(() => {
    const out: Thread[] = [];
    for (const p of projects) {
      const msgs = (p.chatHistory ?? []);
      if (msgs.length === 0 && p.status === 'הסתיים') continue;
      const norm: NormMsg[] = msgs
        .map((m: ChatMessage) => ({
          id: m.id, sender: m.sender, body: m.message, at: epochOf(m),
          dir: (m.isInternal ? 'note' : m.direction === 'in' ? 'in' : 'out') as Dir, via: m.via,
        }))
        .sort((a, b) => a.at - b.at);
      const last = norm[norm.length - 1];
      out.push({
        id: `case-${p.id}`, kind: 'case', title: p.projectName, subtitle: `${p.importer} · ${p.country}`,
        caseId: p.id, messages: norm, lastAt: last?.at ?? new Date(p.updatedAt || 0).getTime(),
        lastPreview: last ? last.body : 'אין הודעות עדיין',
      });
    }
    const normTeam = (m: TeamMessage): NormMsg => ({ id: m.id, sender: m.fromName, body: m.body, at: new Date(m.createdAt).getTime(), dir: (m.fromUserId === userId ? 'out' : 'in') as Dir, caseId: m.caseId });
    // Office-wide broadcast feed
    const bc = team.filter((m) => !m.toUserId).map(normTeam).sort((a, b) => a.at - b.at);
    const lastBc = bc[bc.length - 1];
    out.push({ id: TEAM_ID, kind: 'team', title: 'כל הצוות', subtitle: 'צ׳אט משרדי פנימי', messages: bc, lastAt: lastBc?.at ?? 0, lastPreview: lastBc ? lastBc.body : 'התחילו שיחת צוות' });
    // A direct thread per teammate (so you can DM anyone, even with no history)
    for (const u of users) {
      if (u.id === userId) continue;
      const dm = team.filter((m) => (m.fromUserId === userId && m.toUserId === u.id) || (m.fromUserId === u.id && m.toUserId === userId)).map(normTeam).sort((a, b) => a.at - b.at);
      const last = dm[dm.length - 1];
      out.push({ id: `team-dm-${u.id}`, kind: 'team', title: u.name, subtitle: 'צ׳אט אישי', partnerId: u.id, messages: dm, lastAt: last?.at ?? 0, lastPreview: last ? last.body : 'אין הודעות עדיין' });
    }
    return out.sort((a, b) => b.lastAt - a.lastAt);
  }, [projects, team, users, userId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return threads.filter((t) => {
      if (tab === 'case' && t.kind !== 'case') return false;
      if (tab === 'team' && t.kind !== 'team') return false;
      if (q && !(t.title.toLowerCase().includes(q) || (t.subtitle || '').toLowerCase().includes(q))) return false;
      return true;
    });
  }, [threads, tab, search]);

  const active = threads.find((t) => t.id === activeId) ?? threads.find((t) => t.id === TEAM_ID)!;

  useEffect(() => { bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight }); }, [active?.messages.length, activeId]);

  const send = async () => {
    const text = draft.trim();
    if (!text || sending) return;
    setSending(true);
    try {
      if (active.kind === 'team') {
        const res = await fetch('/api/messages', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ body: text, caseId: linkCaseId, toUserId: active.partnerId ?? null, toName: active.partnerId ? active.title : null }),
        });
        if (!res.ok) throw new Error('failed');
        await loadTeam();
      } else if (active.kind === 'case' && active.caseId) {
        const p = projName.get(active.caseId);
        if (!p) throw new Error('no project');
        const msg: ChatMessage = {
          id: `m-${Date.now()}`, sender: userName || 'מערכת', message: text,
          timestamp: new Date().toLocaleString('he-IL'), isInternal: false, direction: 'out',
        };
        onUpdateProject(active.caseId, { chatHistory: [...(p.chatHistory ?? []), msg] });
      }
      setDraft(''); setLinkCaseId(null);
    } catch {
      toast({ title: 'שגיאה', description: 'ההודעה לא נשלחה', variant: 'destructive' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-primary" /> מרכז תקשורת
        </h2>
        <p className="text-sm text-muted-foreground">כל השיחות — תיקים וצוות — במקום אחד, בלי להיכנס לכל תיק.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-0 rounded-xl border border-border/60 bg-card overflow-hidden lg:h-[calc(100vh-13rem)] min-h-[28rem]">
        {/* ---- thread list ---- */}
        <div className="flex flex-col border-b lg:border-b-0 lg:border-l border-border/60 min-h-0">
          <div className="p-2.5 border-b border-border/60 space-y-2 shrink-0">
            <div className="relative">
              <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="חיפוש שיחה…" className="pr-9 h-9 bg-muted/50 border-0" />
            </div>
            <div className="flex gap-1">
              {(['all', 'case', 'team'] as const).map((k) => (
                <button key={k} onClick={() => setTab(k)}
                  className={cn('flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors', tab === k ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted/60')}>
                  {k === 'all' ? 'הכל' : k === 'case' ? 'תיקים' : 'צוות'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto no-scrollbar min-h-0">
            {filtered.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">אין שיחות</p>
            ) : filtered.map((t) => {
              const isActive = t.id === activeId;
              const lastCaseLinked = t.kind === 'team' && t.messages[t.messages.length - 1]?.caseId;
              return (
                <button key={t.id} onClick={() => setActiveId(t.id)}
                  className={cn('w-full flex items-start gap-2.5 px-3 py-2.5 text-right border-b border-border/60 transition-colors', isActive ? 'bg-primary/5' : 'hover:bg-muted/50')}>
                  <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold', t.kind === 'case' ? 'bg-muted text-muted-foreground' : 'bg-primary/10 text-primary')}>
                    {t.kind === 'case' ? <FolderOpen className="h-4 w-4" /> : t.partnerId ? t.title.charAt(0) : <Users className="h-4 w-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-semibold">{t.title}</span>
                      <span className="shrink-0 text-[10px] text-muted-foreground">{t.lastAt ? timeAgo(t.lastAt) : ''}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {lastCaseLinked && <span className="shrink-0 rounded bg-primary/10 px-1.5 text-[10px] font-bold text-primary">{projName.get(lastCaseLinked)?.projectName?.slice(0, 12) || 'תיק'}</span>}
                      <span className="truncate">{t.lastPreview}</span>
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ---- conversation ---- */}
        <div className="flex flex-col min-h-0">
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-border/60 shrink-0">
            <div className="min-w-0">
              <div className="flex items-center gap-2 font-semibold truncate">
                {active.kind === 'case' ? <FolderOpen className="h-4 w-4 text-muted-foreground" /> : active.partnerId ? <span className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary text-[11px]">{active.title.charAt(0)}</span> : <Users className="h-4 w-4 text-primary" />}
                {active.title}
              </div>
              {active.subtitle && <p className="text-xs text-muted-foreground truncate">{active.subtitle}</p>}
            </div>
            {active.kind === 'case' && active.caseId && (
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground shrink-0" onClick={() => onOpenCase(active.caseId!)}>
                <ExternalLink className="h-3.5 w-3.5" /> פתח תיק
              </Button>
            )}
          </div>

          <div ref={bodyRef} className="flex-1 overflow-y-auto no-scrollbar min-h-0 bg-muted/30 px-4 py-4 space-y-2.5">
            {active.messages.length === 0 ? (
              <div className="h-full grid place-items-center">
                <EmptyState icon={MessageSquare} title="אין הודעות עדיין" description={active.kind === 'team' ? 'כתבו הודעה ראשונה לצוות המשרד.' : 'שלחו הודעה או פתחו את התיק לפעולות נוספות.'} />
              </div>
            ) : active.messages.map((m) => (
              <div key={m.id} className={cn('flex', m.dir === 'out' ? 'justify-start' : m.dir === 'in' ? 'justify-end' : 'justify-center')}>
                <div className={cn('max-w-[75%] rounded-2xl px-3.5 py-2 text-sm leading-relaxed',
                  m.dir === 'out' ? 'bg-primary text-primary-foreground rounded-tl-sm'
                    : m.dir === 'in' ? 'bg-card border border-border/60 rounded-tr-sm'
                    : 'bg-amber-50 dark:bg-amber-950/30 border border-dashed border-amber-300 dark:border-amber-800 text-foreground')}>
                  <div className={cn('mb-1 flex items-center gap-1.5 text-[10px] font-semibold', m.dir === 'out' ? 'text-primary-foreground/80' : m.dir === 'note' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground')}>
                    {m.dir === 'note' && <Lock className="h-2.5 w-2.5" />}
                    {m.dir === 'note' ? 'הערה פנימית' : m.sender}{m.via ? ` · ${m.via}` : ''}
                  </div>
                  {m.body}
                  {m.caseId && projName.get(m.caseId) && (
                    <button onClick={() => onOpenCase(m.caseId!)} className={cn('mt-1.5 flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold', m.dir === 'out' ? 'bg-white/20' : 'bg-primary/10 text-primary')}>
                      <Link2 className="h-2.5 w-2.5" /> {projName.get(m.caseId)?.projectName}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* ---- composer ---- */}
          <div className="border-t border-border/60 p-2.5 shrink-0 space-y-2">
            <div className="flex items-center gap-1.5">
              {active.kind === 'team' && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className={cn('flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-semibold', linkCaseId ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
                      <Link2 className="h-3 w-3" />
                      {linkCaseId ? projName.get(linkCaseId)?.projectName?.slice(0, 16) : 'שייך לתיק'}
                      <ChevronDown className="h-3 w-3" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="max-h-64 overflow-y-auto">
                    <DropdownMenuItem onSelect={() => setLinkCaseId(null)}>ללא שיוך</DropdownMenuItem>
                    {projects.filter((p) => p.status !== 'הסתיים').map((p) => (
                      <DropdownMenuItem key={p.id} onSelect={() => setLinkCaseId(p.id)}>{p.projectName}</DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-1 rounded-lg bg-muted px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground">
                    <Sparkles className="h-3 w-3 text-primary" /> תבניות מוכנות
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {TEMPLATES.map((t) => (
                    <DropdownMenuItem key={t} onSelect={() => setDraft((d) => (d ? d + ' ' + t : t))}>{t}</DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <div className="flex items-center gap-2">
              <Input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                placeholder={active.kind === 'case' ? 'כתוב הודעה לתיק…' : active.partnerId ? `הודעה ל${active.title}…` : 'הודעה לצוות…  (@ לתיוג · 🔗 לשיוך תיק)'}
                className="flex-1 h-10"
              />
              <Button onClick={send} disabled={!draft.trim() || sending} className="gap-1.5 h-10">
                <Send className="h-4 w-4" /> שלח
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
