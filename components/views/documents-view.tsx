'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { Project, StoredDocument } from '@/lib/types';
import { DOCUMENT_CATEGORIES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Search,
  Loader2,
  FileText,
  FileImage,
  FolderOpen,
  Download,
  Trash2,
  ExternalLink,
  Files,
} from 'lucide-react';
import { DocumentShareMenu } from '@/components/case/document-share-menu';
import { cn } from '@/lib/utils';

interface DocumentsViewProps {
  projects: Project[];
}

const categoryLabel = (v?: string | null) => DOCUMENT_CATEGORIES.find((c) => c.value === v)?.label || 'אחר';

const isImage = (mime?: string | null) => !!mime && mime.startsWith('image/');

const fmtSize = (n?: number | null) => {
  if (!n) return '';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
};

const fmtDate = (s?: string) => {
  if (!s) return '';
  try {
    return new Intl.DateTimeFormat('he-IL', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(s));
  } catch {
    return '';
  }
};

export function DocumentsView({ projects }: DocumentsViewProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<string>('all');

  const projectName = useMemo(() => {
    const m = new Map<string, Project>();
    for (const p of projects) m.set(p.id, p);
    return m;
  }, [projects]);

  const load = () => {
    setLoading(true);
    fetch('/api/documents')
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []))
      .catch(() => toast({ title: 'שגיאה', description: 'לא ניתן לטעון מסמכים', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };
  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return docs.filter((d) => {
      if (category !== 'all' && d.category !== category) return false;
      if (!q) return true;
      const proj = projectName.get(d.projectId);
      return (
        d.originalName.toLowerCase().includes(q) ||
        (d.category || '').toLowerCase().includes(q) ||
        (proj?.projectName || '').toLowerCase().includes(q) ||
        (proj?.importer || '').toLowerCase().includes(q)
      );
    });
  }, [docs, search, category, projectName]);

  // Group into per-project folders (newest activity first).
  const folders = useMemo(() => {
    const map = new Map<string, { projectId: string; items: StoredDocument[] }>();
    for (const d of filtered) {
      if (!map.has(d.projectId)) map.set(d.projectId, { projectId: d.projectId, items: [] });
      map.get(d.projectId)!.items.push(d);
    }
    return [...map.values()];
  }, [filtered]);

  const updateCategory = async (doc: StoredDocument, category: string) => {
    setDocs((prev) => prev.map((d) => (d.id === doc.id ? { ...d, category } : d))); // optimistic
    try {
      const res = await fetch(`/api/documents/${doc.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      toast({ title: 'שגיאה', description: 'עדכון הקטגוריה נכשל', variant: 'destructive' });
      load();
    }
  };

  const remove = async (doc: StoredDocument) => {
    if (!confirm(`למחוק את "${doc.originalName}"?`)) return;
    setDocs((prev) => prev.filter((d) => d.id !== doc.id)); // optimistic
    try {
      const res = await fetch(`/api/documents/${doc.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('failed');
      toast({ title: 'נמחק', description: doc.originalName });
    } catch {
      toast({ title: 'שגיאה', description: 'מחיקה נכשלה', variant: 'destructive' });
      load();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">מסמכים</h2>
          <p className="text-muted-foreground">
            {docs.length} מסמכים ב-{new Set(docs.map((d) => d.projectId)).size} תיקים
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="חיפוש מסמך, תיק או יבואן..." value={search} onChange={(e) => setSearch(e.target.value)} className="pr-9" />
        </div>
      </div>

      {/* Category filter chips */}
      <div className="flex flex-wrap items-center gap-2">
        {[{ value: 'all', label: 'הכל' }, ...DOCUMENT_CATEGORIES].map((c) => {
          const count = c.value === 'all' ? docs.length : docs.filter((d) => d.category === c.value).length;
          const active = category === c.value;
          return (
            <button
              key={c.value}
              onClick={() => setCategory(c.value)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-colors',
                active ? 'bg-primary text-primary-foreground border-primary' : 'bg-card text-muted-foreground hover:border-primary/40'
              )}
            >
              {c.label} {count > 0 && <span className={cn('mr-1', active ? 'opacity-80' : 'text-muted-foreground/70')}>({count})</span>}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          טוען...
        </div>
      ) : folders.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground">
            <Files className="h-10 w-10 mx-auto mb-3 opacity-40" />
            {docs.length === 0 ? 'עדיין לא הועלו מסמכים למערכת.' : 'לא נמצאו מסמכים תואמים.'}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {folders.map(({ projectId, items }) => {
            const proj = projectName.get(projectId);
            return (
              <Card key={projectId} className="border-border/60 elevated">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        <FolderOpen className="h-4 w-4" />
                      </span>
                      {proj?.projectName || 'תיק לא ידוע'}
                      <Badge variant="secondary" className="text-[10px]">{items.length}</Badge>
                    </CardTitle>
                    {proj && (
                      <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground" onClick={() => router.push(`/case/${projectId}`)}>
                        <ExternalLink className="h-3.5 w-3.5" />
                        פתח תיק
                      </Button>
                    )}
                  </div>
                  {proj && <p className="text-xs text-muted-foreground">{proj.importer} · {proj.country}</p>}
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {items.map((d) => (
                      <div key={d.id} className="group flex items-center gap-3 rounded-lg border p-2.5 bg-card hover:border-primary/40 transition-colors">
                        <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', isImage(d.mimeType) ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600')}>
                          {isImage(d.mimeType) ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <a href={d.url} target="_blank" rel="noreferrer" className="block text-sm font-medium truncate hover:text-primary hover:underline">
                            {d.originalName}
                          </a>
                          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                            <Select value={d.category || 'other'} onValueChange={(v) => updateCategory(d, v)}>
                              <SelectTrigger className="h-6 w-24 text-[10px] px-2 gap-1"><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                              </SelectContent>
                            </Select>
                            {d.size ? <span>{fmtSize(d.size)}</span> : null}
                            <span>· {fmtDate(d.createdAt)}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                          <DocumentShareMenu
                            doc={d}
                            importerPhone={proj?.importerPhone}
                            importerEmail={proj?.importerEmail}
                            supervisorPhone={proj?.supervisorPhone}
                          />
                          <a href={d.url} download className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground">
                            <Download className="h-4 w-4" />
                          </a>
                          <button onClick={() => remove(d)} className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
