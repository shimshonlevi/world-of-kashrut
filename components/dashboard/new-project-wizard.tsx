'use client';

import { useEffect, useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { fetchTemplates } from '@/lib/templates';
import { OPTIONAL_TOOL_KEYS, getToolMeta } from '@/lib/tools';
import type { WorkflowTemplate, Importer, Supervisor } from '@/lib/types';
import { FileText, ChevronLeft, ChevronRight, Check, ListChecks, Loader2, UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

interface NewProjectWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (data: any) => void;
  defaultResponsible?: string;
}

const RESPONSIBLE_OPTIONS = ['נחמה', 'שירה', 'מנהל'];

const today = () => new Date().toISOString().split('T')[0];
const plusDays = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
};

const countRequirements = (t: WorkflowTemplate) => t.stages.reduce((s, st) => s + st.requirements.length, 0);

export function NewProjectWizard({ isOpen, onClose, onCreateProject, defaultResponsible }: NewProjectWizardProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [importers, setImporters] = useState<Importer[]>([]);
  const [supervisors, setSupervisors] = useState<Supervisor[]>([]);
  const [kosherBodies, setKosherBodies] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Inline "new importer" creation — keeps the importers registry in sync when
  // a case is opened for an importer that doesn't exist yet.
  const [newImporter, setNewImporter] = useState<Partial<Importer> | null>(null);
  const [savingImporter, setSavingImporter] = useState(false);

  const [templateId, setTemplateId] = useState('');
  const [form, setForm] = useState({
    projectName: '',
    importer: '',
    importerPhone: '',
    importerEmail: '',
    country: '',
    kosherBody: '',
    supervisor: '',
    supervisorPhone: '',
    factoryName: '',
    responsible: defaultResponsible || '',
    startDate: today(),
    endDate: plusDays(30),
  });

  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setTemplateId('');
    setForm((f) => ({ ...f, responsible: defaultResponsible || f.responsible || 'מנהל' }));
    fetchTemplates().then(setTemplates).catch(() => {});
    fetch('/api/importers').then((r) => r.json()).then((d) => setImporters(d.importers || [])).catch(() => {});
    fetch('/api/supervisors').then((r) => r.json()).then((d) => setSupervisors(d.supervisors || [])).catch(() => {});
    fetch('/api/kosher-bodies').then((r) => r.json()).then((d) => setKosherBodies((d.kosherBodies || []).map((k: { name: string }) => k.name))).catch(() => {});
  }, [isOpen, defaultResponsible]);

  const selectedTemplate = useMemo(() => templates.find((t) => t.id === templateId), [templates, templateId]);

  // Auto-fill contact when an existing importer/supervisor name is chosen.
  const onImporterChange = (name: string) => {
    const match = importers.find((i) => i.name === name);
    setForm((f) => ({
      ...f,
      importer: name,
      importerPhone: match?.phone || f.importerPhone,
      importerEmail: match?.email || f.importerEmail,
      country: match?.country || f.country,
    }));
  };
  const onSupervisorChange = (name: string) => {
    const match = supervisors.find((s) => s.name === name);
    setForm((f) => ({ ...f, supervisor: name, supervisorPhone: match?.phone || f.supervisorPhone }));
  };

  // Is the typed importer already in the registry?
  const importerIsNew = useMemo(() => {
    const name = form.importer.trim();
    return !!name && !importers.some((i) => i.name.trim() === name);
  }, [form.importer, importers]);

  // Persist a new importer to the registry, then select it.
  const saveNewImporter = async () => {
    if (!newImporter?.name?.trim()) return;
    setSavingImporter(true);
    try {
      const res = await fetch('/api/importers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newImporter),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || 'שמירה נכשלה');
      setImporters((prev) => [...prev, data.importer]);
      setForm((f) => ({
        ...f,
        importer: data.importer.name,
        importerPhone: data.importer.phone || f.importerPhone,
        importerEmail: data.importer.email || f.importerEmail,
        country: data.importer.country || f.country,
      }));
      toast({ title: 'יבואן נוצר', description: `"${data.importer.name}" נוסף לרשומת היבואנים` });
      setNewImporter(null);
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    } finally {
      setSavingImporter(false);
    }
  };

  const canSubmit = templateId && form.projectName.trim() && form.importer.trim();

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    // Keep the registry in sync: auto-create the importer if it's new (best-effort).
    if (importerIsNew) {
      try {
        const res = await fetch('/api/importers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: form.importer.trim(), phone: form.importerPhone, email: form.importerEmail, country: form.country }),
        });
        if (res.ok) {
          const data = await res.json();
          setImporters((prev) => [...prev, data.importer]);
        }
      } catch {
        /* non-blocking — the case is still created */
      }
    }
    onCreateProject({ templateId, ...form });
    // parent closes + resets; guard against staying disabled if it doesn't
    setTimeout(() => setSubmitting(false), 1500);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>תיק חדש {step === 1 ? '· בחירת תבנית' : '· פרטי התיק'}</DialogTitle>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className={cn('rounded-full px-2.5 py-1', step === 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>1 · תבנית</span>
          <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          <span className={cn('rounded-full px-2.5 py-1', step === 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>2 · פרטים</span>
        </div>

        {/* Step 1 — choose template */}
        {step === 1 && (
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">בחר תבנית — היא קובעת את הכלים והדרישות של התיק.</p>
            {templates.length === 0 ? (
              <div className="flex items-center justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin ml-2" /> טוען תבניות...
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {templates.map((t) => {
                  const active = templateId === t.id;
                  const tools = (t.enabledTools ?? []).filter((k) => OPTIONAL_TOOL_KEYS.includes(k));
                  return (
                    <button
                      key={t.id}
                      onClick={() => setTemplateId(t.id)}
                      className={cn(
                        'rounded-xl border-2 p-4 text-right transition-all',
                        active ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/40'
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">{t.name}</span>
                        {active && <Check className="h-4 w-4 text-primary" />}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{t.description}</p>
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <Badge variant="outline" className="text-[10px] gap-1">
                          <ListChecks className="h-3 w-3" />
                          {countRequirements(t)} דרישות
                        </Badge>
                        {tools.map((k) => (
                          <Badge key={k} variant="secondary" className="text-[10px]">
                            {getToolMeta(k)?.name}
                          </Badge>
                        ))}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 2 — core details */}
        {step === 2 && (
          <div className="space-y-4 py-2">
            {selectedTemplate && (
              <div className="rounded-lg bg-muted/50 border p-3 text-sm flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" />
                תבנית: <span className="font-medium">{selectedTemplate.name}</span>
                <span className="text-muted-foreground">· {countRequirements(selectedTemplate)} דרישות ייווצרו אוטומטית</span>
              </div>
            )}
            <datalist id="importer-list">
              {importers.map((i) => <option key={i.id} value={i.name} />)}
            </datalist>
            <datalist id="supervisor-list">
              {supervisors.map((s) => <option key={s.id} value={s.name} />)}
            </datalist>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>שם הפרויקט *</Label>
                <Input value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} placeholder="למשל: שוקולד מפעל X" />
              </div>
              <div className="space-y-1.5">
                <Label>יבואן *</Label>
                <Input list="importer-list" value={form.importer} onChange={(e) => onImporterChange(e.target.value)} placeholder="בחר קיים או הקלד חדש" />
                {importerIsNew && (
                  <button
                    type="button"
                    onClick={() => setNewImporter({ name: form.importer.trim(), phone: form.importerPhone, email: form.importerEmail, country: form.country })}
                    className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <UserPlus className="h-3.5 w-3.5" />
                    יבואן חדש — צור ברשומת היבואנים
                  </button>
                )}
              </div>
              <div className="space-y-1.5">
                <Label>טלפון יבואן</Label>
                <Input value={form.importerPhone} onChange={(e) => setForm({ ...form, importerPhone: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>מדינה</Label>
                <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>גוף כשרות</Label>
                <Input list="kosher-body-list" value={form.kosherBody} onChange={(e) => setForm({ ...form, kosherBody: e.target.value })} placeholder="בחר מהרשימה או הקלד" />
                <datalist id="kosher-body-list">
                  {kosherBodies.map((k) => <option key={k} value={k} />)}
                </datalist>
              </div>
              <div className="space-y-1.5">
                <Label>משגיח</Label>
                <Input list="supervisor-list" value={form.supervisor} onChange={(e) => onSupervisorChange(e.target.value)} placeholder="בחר קיים או הקלד חדש" />
              </div>
              <div className="space-y-1.5">
                <Label>מפעל</Label>
                <Input value={form.factoryName} onChange={(e) => setForm({ ...form, factoryName: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>אחראי/ת</Label>
                <Select value={form.responsible} onValueChange={(v) => setForm({ ...form, responsible: v })}>
                  <SelectTrigger><SelectValue placeholder="בחר" /></SelectTrigger>
                  <SelectContent>
                    {RESPONSIBLE_OPTIONS.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>תאריך התחלה</Label>
                <Input type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>תאריך יעד</Label>
                <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
              </div>
            </div>
          </div>
        )}

        <DialogFooter className="flex-row justify-between sm:justify-between">
          {step === 1 ? (
            <>
              <Button variant="outline" onClick={onClose}>ביטול</Button>
              <Button onClick={() => setStep(2)} disabled={!templateId} className="gap-1">
                המשך <ChevronLeft className="h-4 w-4" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} className="gap-1">
                <ChevronRight className="h-4 w-4" /> חזרה
              </Button>
              <Button onClick={submit} disabled={!canSubmit || submitting} className="gap-2">
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                צור תיק
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>

      {/* Inline new-importer creation (syncs to the importers registry) */}
      <Dialog open={!!newImporter} onOpenChange={(o) => !o && setNewImporter(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><UserPlus className="h-4 w-4 text-primary" /> יבואן חדש</DialogTitle>
          </DialogHeader>
          {newImporter && (
            <div className="space-y-3 py-1">
              <div className="space-y-1.5">
                <Label>שם היבואן *</Label>
                <Input value={newImporter.name ?? ''} onChange={(e) => setNewImporter({ ...newImporter, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>איש קשר</Label>
                  <Input value={newImporter.contactPerson ?? ''} onChange={(e) => setNewImporter({ ...newImporter, contactPerson: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>מדינה</Label>
                  <Input value={newImporter.country ?? ''} onChange={(e) => setNewImporter({ ...newImporter, country: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>טלפון</Label>
                  <Input value={newImporter.phone ?? ''} onChange={(e) => setNewImporter({ ...newImporter, phone: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <Label>אימייל</Label>
                  <Input value={newImporter.email ?? ''} onChange={(e) => setNewImporter({ ...newImporter, email: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>הערות</Label>
                <Textarea rows={2} value={newImporter.notes ?? ''} onChange={(e) => setNewImporter({ ...newImporter, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewImporter(null)} disabled={savingImporter}>ביטול</Button>
            <Button onClick={saveNewImporter} disabled={savingImporter || !newImporter?.name?.trim()} className="gap-2">
              {savingImporter && <Loader2 className="h-4 w-4 animate-spin" />}
              שמור ובחר
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
