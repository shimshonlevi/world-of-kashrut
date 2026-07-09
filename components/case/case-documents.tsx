'use client';

import { useEffect, useState } from 'react';
import type { Project, StoredDocument } from '@/lib/types';
import { DOCUMENT_CATEGORIES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Loader2, FileText, FileImage, Download, Trash2, Files } from 'lucide-react';
import { DocumentShareMenu } from '@/components/case/document-share-menu';
import { cn } from '@/lib/utils';

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

/** All documents uploaded to a case, pulled from the central index. */
export function CaseDocuments({ project, reloadKey }: { project: Project; reloadKey?: number }) {
  const { toast } = useToast();
  const projectId = project.id;
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/documents`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [projectId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const remove = async (doc: StoredDocument) => {
    if (!confirm(`למחוק את "${doc.originalName}"?`)) return;
    setDocs((prev) => prev.filter((d) => d.id !== doc.id));
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
    <div className="max-w-3xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold">מסמכי התיק</h2>
        <p className="text-sm text-muted-foreground mt-1">כל המסמכים והתמונות שהועלו לתיק זה, במקום אחד.</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          טוען...
        </div>
      ) : docs.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-14 text-center text-muted-foreground">
            <Files className="h-9 w-9 mx-auto mb-3 opacity-40" />
            עדיין לא הועלו מסמכים לתיק. העלה קבצים דרך "מסמכים ודרישות".
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {docs.map((d) => (
            <div key={d.id} className="group flex items-center gap-3 rounded-lg border p-3 bg-card hover:border-primary/40 transition-colors">
              <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', isImage(d.mimeType) ? 'bg-violet-100 text-violet-600' : 'bg-sky-100 text-sky-600')}>
                {isImage(d.mimeType) ? <FileImage className="h-4 w-4" /> : <FileText className="h-4 w-4" />}
              </span>
              <div className="min-w-0 flex-1">
                <a href={d.url} target="_blank" rel="noreferrer" className="block text-sm font-medium truncate hover:text-primary hover:underline">
                  {d.originalName}
                </a>
                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] h-4 px-1.5">{categoryLabel(d.category)}</Badge>
                  {d.size ? <span>{fmtSize(d.size)}</span> : null}
                  <span>· {fmtDate(d.createdAt)}</span>
                  {d.uploadedBy && <span>· {d.uploadedBy}</span>}
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <DocumentShareMenu
                  doc={d}
                  importerPhone={project.importerPhone}
                  importerEmail={project.importerEmail}
                  supervisorPhone={project.supervisorPhone}
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
      )}
    </div>
  );
}
