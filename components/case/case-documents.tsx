'use client';

import { useEffect, useRef, useState } from 'react';
import type { Project, StoredDocument } from '@/lib/types';
import { DOCUMENT_CATEGORIES } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { useConfirm } from '@/components/ui/confirm-dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, FileText, FileImage, Download, Trash2, Files, Upload } from 'lucide-react';
import { DocumentShareMenu } from '@/components/case/document-share-menu';
import { cn } from '@/lib/utils';

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
  const confirm = useConfirm();
  const projectId = project.id;
  const [docs, setDocs] = useState<StoredDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadCategory, setUploadCategory] = useState('other');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = () => {
    setLoading(true);
    fetch(`/api/projects/${projectId}/documents`)
      .then((r) => r.json())
      .then((d) => setDocs(d.documents || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  };
  useEffect(load, [projectId, reloadKey]); // eslint-disable-line react-hooks/exhaustive-deps

  // Upload a file directly to the case with the chosen category.
  const doUpload = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 4.4 * 1024 * 1024) {
      toast({ title: 'הקובץ גדול מדי', description: 'מקסימום 4.5MB כרגע. כווץ את הקובץ או פצל אותו (בקרוב נתמוך בקבצים גדולים).', variant: 'destructive' });
      return;
    }
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category', uploadCategory);
      fd.append('uploadedBy', ''); // filled server-side context if available
      const res = await fetch(`/api/projects/${projectId}/documents`, { method: 'POST', body: fd });
      if (res.status === 503) {
        toast({ title: '📎 העלאת מסמכים — בקרוב', description: 'אחסון הקבצים בהגדרה אחרונה ויופעל בקרוב.' });
        return;
      }
      if (!res.ok) throw new Error('failed');
      toast({ title: 'הקובץ הועלה', description: file.name });
      load();
    } catch {
      toast({ title: 'שגיאה', description: 'העלאת הקובץ נכשלה', variant: 'destructive' });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

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
    if (!(await confirm({ title: 'מחיקת מסמך', description: `למחוק את "${doc.originalName}"?`, variant: 'destructive', confirmText: 'מחק' }))) return;
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
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold">מסמכי התיק</h2>
          <p className="text-sm text-muted-foreground mt-1">כל המסמכים והתמונות שהועלו לתיק זה, במקום אחד.</p>
        </div>
        {/* Upload with a chosen category */}
        <div className="flex items-center gap-2">
          <Select value={uploadCategory} onValueChange={setUploadCategory}>
            <SelectTrigger className="h-9 w-32 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
            </SelectContent>
          </Select>
          <input ref={fileRef} type="file" hidden onChange={(e) => doUpload(e.target.files?.[0])} />
          <Button size="sm" className="gap-1.5" disabled={uploading} onClick={() => fileRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            העלה קובץ
          </Button>
        </div>
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
            עדיין לא הועלו מסמכים לתיק. בחר קטגוריה והעלה קובץ, או העלה דרך "דרישות".
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
                  {/* Inline editable category */}
                  <Select value={d.category || 'other'} onValueChange={(v) => updateCategory(d, v)}>
                    <SelectTrigger className="h-6 w-24 text-[10px] px-2 gap-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
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
