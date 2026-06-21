'use client';

import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  BUILTIN_TOOLS,
  CustomTool,
  fetchCustomTools,
  saveCustomTools,
} from '@/lib/tools';
import type { RequirementType, RequirementSource, TemplateRequirement } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  LayoutDashboard,
  Building2,
  Plane,
  Factory,
  FileText,
  CheckCircle2,
  MessageCircle,
  History,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Wrench,
  ListChecks,
  HelpCircle,
  Type,
  CheckSquare,
  ShieldCheck,
} from 'lucide-react';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  LayoutDashboard, Building2, Plane, Factory, FileText, CheckCircle2, MessageCircle, History, ListChecks, Wrench,
};
const TOOL_ICON_OPTIONS = ['FileText', 'ListChecks', 'CheckCircle2', 'Building2', 'Factory', 'Wrench'];

const REQ_TYPES: { type: RequirementType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'document', label: 'מסמך', icon: FileText },
  { type: 'question', label: 'שאלה', icon: HelpCircle },
  { type: 'field', label: 'שדה', icon: Type },
  { type: 'task', label: 'משימה', icon: CheckSquare },
  { type: 'approval', label: 'אישור', icon: ShieldCheck },
];
const SOURCE_OPTIONS: { value: RequirementSource; label: string }[] = [
  { value: 'office', label: 'המשרד' },
  { value: 'supervisor', label: 'המשגיח' },
  { value: 'importer', label: 'היבואן' },
  { value: 'factory', label: 'המפעל' },
];

let _uid = 0;
const uid = (p: string) => `${p}-${Date.now().toString(36)}-${(_uid++).toString(36)}`;

export function ToolsView() {
  const { toast } = useToast();
  const [customTools, setCustomTools] = useState<CustomTool[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CustomTool | null>(null);

  useEffect(() => {
    fetchCustomTools()
      .then(setCustomTools)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const persist = async (tools: CustomTool[]) => {
    setCustomTools(tools);
    try {
      await saveCustomTools(tools);
    } catch {
      toast({ title: 'שגיאה', description: 'שמירת הכלים נכשלה', variant: 'destructive' });
    }
  };

  const saveTool = async (tool: CustomTool) => {
    const idx = customTools.findIndex((t) => t.id === tool.id);
    const next = idx >= 0 ? customTools.map((t) => (t.id === tool.id ? tool : t)) : [...customTools, tool];
    await persist(next);
    setEditing(null);
    toast({ title: 'נשמר', description: `הכלי "${tool.name}" נשמר בספרייה` });
  };

  const deleteTool = async (id: string) => {
    await persist(customTools.filter((t) => t.id !== id));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Wrench className="h-5 w-5 text-primary" />
          ניהול כלים
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          כלי המערכת זמינים לכל תבנית; כלים מותאמים הם ספריית מקטעים לשימוש חוזר בתבניות.
        </p>
      </div>

      {/* Builtin catalog */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">כלי המערכת</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUILTIN_TOOLS.map((t) => {
            const Icon = ICONS[t.icon] || Wrench;
            return (
              <Card key={t.key} className="border-border/60">
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{t.name}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {t.alwaysOn ? 'תמיד פעיל' : 'אופציונלי'}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{t.description}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Custom tools library */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-muted-foreground">כלים מותאמים (ספרייה)</h3>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setEditing({ id: uid('ct'), name: '', icon: 'ListChecks', description: '', requirements: [] })}
          >
            <Plus className="h-4 w-4" />
            כלי חדש
          </Button>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin ml-2" />טוען...
          </div>
        ) : customTools.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center border rounded-lg border-dashed">
            אין כלים מותאמים. צור כלי לשימוש חוזר בתבניות (למשל "מסמכי מכס", "בדיקות מעבדה").
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {customTools.map((t) => {
              const Icon = ICONS[t.icon] || ListChecks;
              return (
                <Card key={t.id} className="border-border/60 group">
                  <CardContent className="p-4 flex items-start gap-3">
                    <div className="h-10 w-10 rounded-lg bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{t.name}</p>
                      <p className="text-xs text-muted-foreground">{t.requirements.length} דרישות</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditing(structuredClone(t))}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => deleteTool(t.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {editing && <CustomToolDialog tool={editing} onClose={() => setEditing(null)} onSave={saveTool} />}
    </div>
  );
}

function CustomToolDialog({ tool, onClose, onSave }: { tool: CustomTool; onClose: () => void; onSave: (t: CustomTool) => void }) {
  const [edited, setEdited] = useState<CustomTool>(tool);

  const addReq = (type: RequirementType) =>
    setEdited((t) => ({
      ...t,
      requirements: [
        ...t.requirements,
        { id: uid('r'), type, label: '', required: true, ...(type === 'field' ? { dataType: 'text' as const } : {}), ...(type !== 'approval' ? { source: 'office' as RequirementSource } : {}) },
      ],
    }));
  const updateReq = (id: string, patch: Partial<TemplateRequirement>) =>
    setEdited((t) => ({ ...t, requirements: t.requirements.map((r) => (r.id === id ? { ...r, ...patch } : r)) }));
  const removeReq = (id: string) =>
    setEdited((t) => ({ ...t, requirements: t.requirements.filter((r) => r.id !== id) }));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tool.name ? 'עריכת כלי' : 'כלי מותאם חדש'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>שם הכלי</Label>
              <Input value={edited.name} onChange={(e) => setEdited({ ...edited, name: e.target.value })} placeholder="למשל: מסמכי מכס" />
            </div>
            <div className="space-y-1.5">
              <Label>אייקון</Label>
              <div className="flex gap-2">
                {TOOL_ICON_OPTIONS.map((ic) => {
                  const Icon = ICONS[ic] || ListChecks;
                  return (
                    <button
                      key={ic}
                      type="button"
                      onClick={() => setEdited({ ...edited, icon: ic })}
                      className={`p-2 rounded-lg border-2 transition-all ${edited.icon === ic ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'}`}
                    >
                      <Icon className="h-4 w-4" />
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>תיאור</Label>
            <Input value={edited.description ?? ''} onChange={(e) => setEdited({ ...edited, description: e.target.value })} />
          </div>

          <div className="space-y-2">
            <Label>דרישות הכלי</Label>
            {edited.requirements.map((req) => {
              const meta = REQ_TYPES.find((x) => x.type === req.type) ?? REQ_TYPES[0];
              return (
                <div key={req.id} className="rounded-md border p-2 flex flex-wrap items-center gap-2 bg-background">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
                    <meta.icon className="h-3.5 w-3.5" />
                    {meta.label}
                  </span>
                  <Input value={req.label} onChange={(e) => updateReq(req.id, { label: e.target.value })} placeholder="תיאור הדרישה" className="h-8 flex-1 min-w-[10rem]" />
                  {req.type !== 'approval' && (
                    <Select value={req.source ?? 'office'} onValueChange={(v) => updateReq(req.id, { source: v as RequirementSource })}>
                      <SelectTrigger className="h-8 w-24"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {SOURCE_OPTIONS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  )}
                  <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Switch checked={req.required} onCheckedChange={(v) => updateReq(req.id, { required: v })} />
                    חובה
                  </label>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeReq(req.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })}
            <div className="flex flex-wrap gap-2 pt-1">
              {REQ_TYPES.map((rt) => (
                <Button key={rt.type} variant="outline" size="sm" className="gap-1.5" onClick={() => addReq(rt.type)}>
                  <rt.icon className="h-3.5 w-3.5" />
                  {rt.label}
                </Button>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>ביטול</Button>
          <Button onClick={() => onSave(edited)} disabled={!edited.name.trim()}>שמור כלי</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
