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
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((imp) => (
            <Card key={imp.id} className="group hover:shadow-lg transition-all duration-200 border-border/60">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-12 w-12 border-2 border-primary/10">
                      <AvatarFallback className="bg-primary/10 text-primary font-semibold text-lg">
                        {imp.name.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-base">{imp.name}</CardTitle>
                      <div className="flex items-center gap-1 text-sm text-muted-foreground">
                        <MapPin className="h-3.5 w-3.5" />
                        {imp.country || '—'}
                      </div>
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem className="gap-2" onClick={() => setEditing(imp)}>
                        <Pencil className="h-4 w-4" />
                        עריכה
                      </DropdownMenuItem>
                      {imp.phone && (
                        <DropdownMenuItem className="gap-2" onClick={() => window.open(`tel:${imp.phone}`)}>
                          <Phone className="h-4 w-4" />
                          התקשר
                        </DropdownMenuItem>
                      )}
                      {imp.email && (
                        <DropdownMenuItem className="gap-2" onClick={() => window.open(`mailto:${imp.email}`)}>
                          <Mail className="h-4 w-4" />
                          שלח מייל
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {(imp.contactPerson || imp.phone) && (
                  <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                    <User className="h-3.5 w-3.5" />
                    {imp.contactPerson || 'איש קשר'} {imp.phone && <span className="text-foreground/70">· {imp.phone}</span>}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="gap-1">
                    <Building2 className="h-3 w-3" />
                    {imp.projectCount} תיקים
                  </Badge>
                  {imp.activeProjects > 0 && (
                    <Badge className="gap-1 bg-primary/10 text-primary hover:bg-primary/20">{imp.activeProjects} פעילים</Badge>
                  )}
                </div>

                {imp.cases.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {imp.cases.slice(0, 4).map((c) => (
                      <button
                        key={c.id}
                        onClick={() => router.push(`/case/${c.id}`)}
                        className="text-[11px] rounded-md border border-border bg-muted/40 px-2 py-1 hover:border-primary/40 hover:text-primary transition-colors truncate max-w-[10rem]"
                      >
                        {c.projectName}
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Button variant="outline" size="sm" className="flex-1 gap-2 h-9" disabled={!imp.phone} onClick={() => window.open(`tel:${imp.phone}`)}>
                    <Phone className="h-3.5 w-3.5" />
                    התקשר
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2 h-9 text-emerald-600" disabled={!imp.phone} onClick={() => window.open(`https://wa.me/${imp.phone?.replace(/\D/g, '')}`, '_blank')}>
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 gap-2 h-9" disabled={!imp.email} onClick={() => window.open(`mailto:${imp.email}`)}>
                    <Mail className="h-3.5 w-3.5" />
                    מייל
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {rows.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">לא נמצאו יבואנים.</div>
          )}
        </div>
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
