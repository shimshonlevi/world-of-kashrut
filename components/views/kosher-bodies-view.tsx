'use client';

import { useEffect, useMemo, useState } from 'react';
import { Project, KosherBody } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Search, Plus, Phone, Mail, MoreHorizontal, Pencil, Loader2, BadgeCheck, Trash2 } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

interface KosherBodiesViewProps {
  projects: Project[];
}

const EMPTY: Partial<KosherBody> = { name: '', contactPerson: '', phone: '', email: '', region: '', notes: '', active: true };

export function KosherBodiesView({ projects }: KosherBodiesViewProps) {
  const { toast } = useToast();
  const [bodies, setBodies] = useState<KosherBody[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<KosherBody> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/kosher-bodies')
      .then((r) => r.json())
      .then((d) => setBodies(d.kosherBodies || []))
      .catch(() => toast({ title: 'שגיאה', description: 'לא ניתן לטעון גופי כשרות', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge registry bodies with project-derived counts (bodies used only on
  // projects are surfaced too).
  const rows = useMemo(() => {
    const byName = new Map<string, KosherBody & { projectCount: number; activeProjects: number }>();
    for (const b of bodies) byName.set(b.name, { ...b, projectCount: 0, activeProjects: 0 });
    for (const p of projects) {
      if (!p.kosherBody) continue;
      let row = byName.get(p.kosherBody);
      if (!row) { row = { id: `derived-${p.kosherBody}`, name: p.kosherBody, active: true, projectCount: 0, activeProjects: 0 }; byName.set(p.kosherBody, row); }
      row.projectCount += 1;
      if (p.status !== 'הסתיים') row.activeProjects += 1;
    }
    const list = [...byName.values()];
    const q = search.trim().toLowerCase();
    return q ? list.filter((r) => r.name.toLowerCase().includes(q) || (r.region || '').toLowerCase().includes(q)) : list;
  }, [bodies, projects, search]);

  const save = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      const isEdit = editing.id && !editing.id.startsWith('derived-');
      const res = await fetch(isEdit ? `/api/kosher-bodies/${editing.id}` : '/api/kosher-bodies', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error || 'שמירה נכשלה'); }
      toast({ title: 'נשמר', description: `"${editing.name}" נשמר` });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (b: KosherBody) => {
    if (!b.id || b.id.startsWith('derived-')) return;
    if (!confirm(`למחוק את "${b.name}"?`)) return;
    try {
      const res = await fetch(`/api/kosher-bodies/${b.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'נמחק', description: b.name });
      load();
    } catch {
      toast({ title: 'שגיאה', description: 'מחיקה נכשלה', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">גופי כשרות</h2>
          <p className="text-sm text-muted-foreground">{rows.length} גופי כשרות</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש גוף כשרות..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 w-64" />
          </div>
          <Button className="gap-2" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" /> גוף כשרות חדש
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" /> טוען...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={BadgeCheck} title="אין גופי כשרות עדיין" description="הוסף גוף כשרות לניהול השיבוצים." action={{ label: 'גוף כשרות חדש', onClick: () => setEditing({ ...EMPTY }) }} />
      ) : (
        <Card className="elevated border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-right font-semibold">גוף כשרות</TableHead>
                  <TableHead className="text-right font-semibold hidden md:table-cell">איש קשר</TableHead>
                  <TableHead className="text-right font-semibold hidden lg:table-cell">אזור</TableHead>
                  <TableHead className="text-right font-semibold">תיקים</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((b) => {
                  const derived = b.id.startsWith('derived-');
                  return (
                    <TableRow key={b.id} className="hover:bg-muted/40">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary"><BadgeCheck className="h-4 w-4" /></span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{b.name}</span>
                              {b.active === false && <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" title="לא פעיל" />}
                            </div>
                            {b.phone && <p className="text-[11px] text-muted-foreground truncate">{b.phone}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{b.contactPerson || '—'}</TableCell>
                      <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{b.region || '—'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm tabular-nums">{b.projectCount}</span>
                          {b.activeProjects > 0 && <Badge className="h-5 gap-1 bg-primary/10 text-primary hover:bg-primary/10 text-[10px]">{b.activeProjects} פעילים</Badge>}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => setEditing(derived ? { ...EMPTY, name: b.name } : b)}>
                              <Pencil className="h-4 w-4" /> {derived ? 'הוסף לרשימה' : 'עריכה'}
                            </DropdownMenuItem>
                            {b.phone && <DropdownMenuItem className="gap-2" onClick={() => window.open(`tel:${b.phone}`)}><Phone className="h-4 w-4 text-blue-600" /> התקשר</DropdownMenuItem>}
                            {b.email && <DropdownMenuItem className="gap-2" onClick={() => window.open(`mailto:${b.email}`)}><Mail className="h-4 w-4" /> שלח מייל</DropdownMenuItem>}
                            {!derived && <DropdownMenuItem className="gap-2 text-destructive" onClick={() => remove(b)}><Trash2 className="h-4 w-4" /> מחיקה</DropdownMenuItem>}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id && !editing.id.startsWith('derived-') ? 'עריכת גוף כשרות' : 'גוף כשרות חדש'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5"><Label>שם גוף הכשרות *</Label><Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} placeholder="OU / בד״ץ / Star-K..." /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5"><Label>איש קשר</Label><Input value={editing.contactPerson ?? ''} onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>אזור</Label><Input value={editing.region ?? ''} onChange={(e) => setEditing({ ...editing, region: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>טלפון</Label><Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} /></div>
                <div className="space-y-1.5"><Label>אימייל</Label><Input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} /></div>
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <Label className="text-sm">פעיל</Label>
                <Switch checked={editing.active !== false} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
              <div className="space-y-1.5"><Label>הערות</Label><Textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} /></div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>ביטול</Button>
            <Button onClick={save} disabled={saving || !editing?.name?.trim()} className="gap-2">
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
