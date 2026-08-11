'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Supervisor } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Search,
  Plus,
  Phone,
  Mail,
  MapPin,
  MoreHorizontal,
  Pencil,
  MessageCircle,
  Loader2,
  ShieldCheck,
  CalendarClock,
  Briefcase,
  Trash2,
  Globe,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { cn } from '@/lib/utils';

interface SupervisorsViewProps {
  projects: Project[];
}

const EMPTY: Partial<Supervisor> = {
  name: '',
  phone: '',
  email: '',
  kosherBodies: '',
  regions: '',
  availability: '',
  active: true,
  notes: '',
};

const chips = (s?: string) =>
  (s || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

export function SupervisorsView({ projects }: SupervisorsViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [editing, setEditing] = useState<Partial<Supervisor> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/supervisors')
      .then((r) => r.json())
      .then((d) => setSupervisors(d.supervisors || []))
      .catch(() => toast({ title: 'שגיאה', description: 'לא ניתן לטעון משגיחים', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge registry supervisors with project-derived workload. Supervisors that
  // only appear on projects (not yet registered) are surfaced too.
  const rows = useMemo(() => {
    const byName = new Map<string, Supervisor & { activeCases: Project[]; totalCases: number }>();
    for (const s of supervisors) {
      byName.set(s.name, { ...s, activeCases: [], totalCases: 0 });
    }
    for (const p of projects) {
      if (!p.supervisor) continue;
      let row = byName.get(p.supervisor);
      if (!row) {
        row = { id: `derived-${p.supervisor}`, name: p.supervisor, phone: p.supervisorPhone, active: true, activeCases: [], totalCases: 0 };
        byName.set(p.supervisor, row);
      }
      row.totalCases += 1;
      if (p.status !== 'הסתיים') row.activeCases.push(p);
      if (!row.phone) row.phone = p.supervisorPhone;
    }
    let list = [...byName.values()];
    if (onlyAvailable) list = list.filter((r) => r.active !== false);
    const q = search.trim().toLowerCase();
    if (q)
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          (r.regions || '').toLowerCase().includes(q) ||
          (r.kosherBodies || '').toLowerCase().includes(q)
      );
    // Busiest first, then by name
    return list.sort((a, b) => b.activeCases.length - a.activeCases.length || a.name.localeCompare(b.name));
  }, [supervisors, projects, search, onlyAvailable]);

  const availableCount = rows.filter((r) => r.active !== false).length;

  const save = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      const isEdit = editing.id && !editing.id.startsWith('derived-');
      const res = await fetch(isEdit ? `/api/supervisors/${editing.id}` : '/api/supervisors', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || 'שמירה נכשלה');
      }
      toast({ title: 'נשמר', description: `המשגיח "${editing.name}" נשמר` });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const remove = async (sup: Supervisor) => {
    if (!sup.id || sup.id.startsWith('derived-')) return;
    if (!confirm(`למחוק את המשגיח "${sup.name}"?`)) return;
    try {
      const res = await fetch(`/api/supervisors/${sup.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('מחיקה נכשלה');
      toast({ title: 'נמחק', description: `המשגיח "${sup.name}" הוסר` });
      load();
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">משגיחים</h2>
          <p className="text-sm text-muted-foreground">
            {rows.length} משגיחים · {availableCount} זמינים לשיבוץ
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <label className="flex items-center gap-2 text-sm text-muted-foreground select-none">
            <Switch checked={onlyAvailable} onCheckedChange={setOnlyAvailable} />
            זמינים בלבד
          </label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="שם, אזור או גוף כשרות..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 w-64" />
          </div>
          <Button className="gap-2" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" />
            משגיח חדש
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          טוען...
        </div>
      ) : rows.length === 0 ? (
        <EmptyState icon={ShieldCheck} title="אין משגיחים עדיין" description="הוסף משגיח כדי לנהל לו״ז ושיבוצים." action={{ label: 'משגיח חדש', onClick: () => setEditing({ ...EMPTY }) }} />
      ) : (
        <Card className="elevated border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-card">
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-right font-semibold">משגיח</TableHead>
                  <TableHead className="text-right font-semibold hidden lg:table-cell">אזורים</TableHead>
                  <TableHead className="text-right font-semibold hidden xl:table-cell">גופי כשרות</TableHead>
                  <TableHead className="text-right font-semibold hidden md:table-cell">זמינות</TableHead>
                  <TableHead className="text-right font-semibold">עומס</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((sup) => {
                  const derived = sup.id.startsWith('derived-');
                  const load = sup.activeCases.length;
                  const loadTone = load === 0 ? 'bg-muted text-muted-foreground' : load <= 2 ? 'bg-emerald-100 text-emerald-700' : load <= 4 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
                  return (
                    <TableRow key={sup.id} className="hover:bg-muted/40">
                      <TableCell className="py-2.5">
                        <div className="flex items-center gap-2.5">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">{sup.name.charAt(0)}</span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm font-medium truncate">{sup.name}</span>
                              <span className={cn('h-1.5 w-1.5 rounded-full', sup.active === false ? 'bg-muted-foreground/40' : 'bg-emerald-500')} title={sup.active === false ? 'לא זמין' : 'זמין'} />
                            </div>
                            {sup.phone && <p className="text-[11px] text-muted-foreground truncate">{sup.phone}</p>}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {chips(sup.regions).slice(0, 2).map((r) => <Badge key={r} variant="outline" className="text-[10px] border-primary/30 text-primary">{r}</Badge>)}
                          {chips(sup.regions).length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden xl:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {chips(sup.kosherBodies).slice(0, 2).map((k) => <Badge key={k} variant="secondary" className="text-[10px]">{k}</Badge>)}
                          {chips(sup.kosherBodies).length === 0 && <span className="text-muted-foreground text-sm">—</span>}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-xs text-muted-foreground max-w-[12rem] truncate">{sup.availability || '—'}</TableCell>
                      <TableCell>
                        <Badge className={cn('gap-1 border-0 text-[10px]', loadTone)}><Briefcase className="h-3 w-3" />{load}</Badge>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem className="gap-2" onClick={() => setEditing(derived ? { ...EMPTY, name: sup.name, phone: sup.phone } : sup)}>
                              <Pencil className="h-4 w-4" /> {derived ? 'הוסף לרשימה' : 'עריכה'}
                            </DropdownMenuItem>
                            {sup.phone && (
                              <DropdownMenuItem className="gap-2" onClick={() => window.open(`https://wa.me/${sup.phone?.replace(/\D/g, '')}`, '_blank')}>
                                <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
                              </DropdownMenuItem>
                            )}
                            {sup.phone && (
                              <DropdownMenuItem className="gap-2" onClick={() => window.open(`tel:${sup.phone}`)}>
                                <Phone className="h-4 w-4 text-blue-600" /> התקשר
                              </DropdownMenuItem>
                            )}
                            {!derived && (
                              <DropdownMenuItem className="gap-2 text-destructive" onClick={() => remove(sup)}>
                                <Trash2 className="h-4 w-4" /> מחיקה
                              </DropdownMenuItem>
                            )}
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

      {/* Add / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing?.id && !editing.id.startsWith('derived-') ? 'עריכת משגיח' : 'משגיח חדש'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>שם המשגיח *</Label>
                <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>טלפון</Label>
                  <Input value={editing.phone ?? ''} onChange={(e) => setEditing({ ...editing, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>אימייל</Label>
                  <Input value={editing.email ?? ''} onChange={(e) => setEditing({ ...editing, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>גופי כשרות (מופרד בפסיקים)</Label>
                <Input placeholder="OU, בד״ץ, כ״ף" value={editing.kosherBodies ?? ''} onChange={(e) => setEditing({ ...editing, kosherBodies: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>אזורים שמוכן לקחת (מופרד בפסיקים)</Label>
                <Input placeholder="איטליה, פולין, מרכז אירופה" value={editing.regions ?? ''} onChange={(e) => setEditing({ ...editing, regions: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>לו״ז / זמינות</Label>
                <Textarea rows={2} placeholder="לדוגמה: פנוי מ-15/8, לא זמין בחגים" value={editing.availability ?? ''} onChange={(e) => setEditing({ ...editing, availability: e.target.value })} />
              </div>
              <div className="flex items-center justify-between rounded-lg border px-3 py-2">
                <div>
                  <Label className="text-sm">זמין לשיבוץ</Label>
                  <p className="text-xs text-muted-foreground">משגיח לא-זמין לא יוצע לשיבוץ בתיקים חדשים</p>
                </div>
                <Switch checked={editing.active !== false} onCheckedChange={(v) => setEditing({ ...editing, active: v })} />
              </div>
              <div className="space-y-1.5">
                <Label>הערות</Label>
                <Textarea rows={2} value={editing.notes ?? ''} onChange={(e) => setEditing({ ...editing, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)} disabled={saving}>ביטול</Button>
            <Button onClick={save} disabled={saving || !editing?.name?.trim()}>
              {saving && <Loader2 className="h-4 w-4 ml-2 animate-spin" />}
              שמור
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
