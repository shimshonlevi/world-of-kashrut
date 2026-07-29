'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Project, Importer } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Building2,
  MoreHorizontal,
  Pencil,
  MessageCircle,
  Loader2,
  User,
} from 'lucide-react';

interface ClientsViewProps {
  projects: Project[];
}

const EMPTY = { name: '', contactPerson: '', phone: '', email: '', country: '', notes: '' };

export function ClientsView({ projects }: ClientsViewProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [importers, setImporters] = useState<Importer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Partial<Importer> | null>(null);
  const [saving, setSaving] = useState(false);

  const load = () => {
    setLoading(true);
    fetch('/api/importers')
      .then((r) => r.json())
      .then((d) => setImporters(d.importers || []))
      .catch(() => toast({ title: 'שגיאה', description: 'לא ניתן לטעון יבואנים', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge registry importers with project-derived stats. Importers that only
  // appear on projects (not yet in the registry) are surfaced too.
  const rows = useMemo(() => {
    const byName = new Map<string, Importer & { projectCount: number; activeProjects: number; cases: Project[] }>();
    for (const imp of importers) {
      byName.set(imp.name, { ...imp, projectCount: 0, activeProjects: 0, cases: [] });
    }
    for (const p of projects) {
      let row = byName.get(p.importer);
      if (!row) {
        row = { id: `derived-${p.importer}`, name: p.importer, country: p.country, phone: p.importerPhone, email: p.importerEmail, projectCount: 0, activeProjects: 0, cases: [] };
        byName.set(p.importer, row);
      }
      row.projectCount += 1;
      if (p.status !== 'הסתיים') row.activeProjects += 1;
      row.cases.push(p);
      if (!row.country) row.country = p.country;
      if (!row.phone) row.phone = p.importerPhone;
    }
    const list = [...byName.values()];
    const q = search.trim().toLowerCase();
    return q ? list.filter((r) => r.name.toLowerCase().includes(q) || (r.country || '').toLowerCase().includes(q)) : list;
  }, [importers, projects, search]);

  const save = async () => {
    if (!editing?.name?.trim()) return;
    setSaving(true);
    try {
      const isEdit = editing.id && !editing.id.startsWith('derived-');
      const res = await fetch(isEdit ? `/api/importers/${editing.id}` : '/api/importers', {
        method: isEdit ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editing),
      });
      if (!res.ok) {
        const e = await res.json().catch(() => ({}));
        throw new Error(e?.error || 'שמירה נכשלה');
      }
      toast({ title: 'נשמר', description: `היבואן "${editing.name}" נשמר` });
      setEditing(null);
      load();
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">יבואנים</h2>
          <p className="text-muted-foreground">{rows.length} יבואנים</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="חיפוש יבואן..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9 w-64" />
          </div>
          <Button className="gap-2" onClick={() => setEditing({ ...EMPTY })}>
            <Plus className="h-4 w-4" />
            יבואן חדש
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          טוען...
        </div>
      ) : rows.length === 0 ? (
        <Card className="border-dashed"><CardContent className="py-16 text-center text-muted-foreground">לא נמצאו יבואנים.</CardContent></Card>
      ) : (
        <Card className="elevated border-border/60 overflow-hidden">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 hover:bg-muted/30">
                  <TableHead className="text-right font-semibold">יבואן</TableHead>
                  <TableHead className="text-right font-semibold hidden md:table-cell">איש קשר</TableHead>
                  <TableHead className="text-right font-semibold hidden lg:table-cell">מדינה</TableHead>
                  <TableHead className="text-right font-semibold">תיקים</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((imp) => (
                  <TableRow key={imp.id} className="hover:bg-muted/40">
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary text-sm font-semibold">
                          {imp.name.charAt(0)}
                        </span>
                        <div className="min-w-0">
                          <p className="text-sm font-medium truncate">{imp.name}</p>
                          {imp.phone && <p className="text-[11px] text-muted-foreground truncate">{imp.phone}</p>}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">{imp.contactPerson || '—'}</TableCell>
                    <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">{imp.country || '—'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm tabular-nums">{imp.projectCount}</span>
                        {imp.activeProjects > 0 && (
                          <Badge className="h-5 gap-1 bg-primary/10 text-primary hover:bg-primary/10 text-[10px]">{imp.activeProjects} פעילים</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem className="gap-2" onClick={() => setEditing(imp)}>
                            <Pencil className="h-4 w-4" /> עריכה
                          </DropdownMenuItem>
                          {imp.phone && (
                            <DropdownMenuItem className="gap-2" onClick={() => window.open(`https://wa.me/${imp.phone?.replace(/\D/g, '')}`, '_blank')}>
                              <MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp
                            </DropdownMenuItem>
                          )}
                          {imp.phone && (
                            <DropdownMenuItem className="gap-2" onClick={() => window.open(`tel:${imp.phone}`)}>
                              <Phone className="h-4 w-4 text-blue-600" /> התקשר
                            </DropdownMenuItem>
                          )}
                          {imp.email && (
                            <DropdownMenuItem className="gap-2" onClick={() => window.open(`mailto:${imp.email}`)}>
                              <Mail className="h-4 w-4" /> שלח מייל
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {/* Add / edit dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id && !editing.id.startsWith('derived-') ? 'עריכת יבואן' : 'יבואן חדש'}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="space-y-3 py-2">
              <div className="space-y-1.5">
                <Label>שם היבואן *</Label>
                <Input value={editing.name ?? ''} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>איש קשר</Label>
                  <Input value={editing.contactPerson ?? ''} onChange={(e) => setEditing({ ...editing, contactPerson: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>מדינה</Label>
                  <Input value={editing.country ?? ''} onChange={(e) => setEditing({ ...editing, country: e.target.value })} />
                </div>
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
