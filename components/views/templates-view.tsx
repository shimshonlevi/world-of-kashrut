'use client';

import { useEffect, useState } from 'react';
import {
  WorkflowTemplate,
  TemplateStage,
  TemplateRequirement,
  RequirementType,
  FieldDataType,
  RequirementSource,
  ToolKey,
} from '@/lib/types';
import {
  fetchTemplates,
  saveTemplate,
  deleteTemplate as apiDeleteTemplate,
} from '@/lib/templates';
import { fetchCustomTools, BUILTIN_TOOLS, type CustomTool } from '@/lib/tools';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Plus,
  MoreVertical,
  Edit,
  Copy,
  Trash2,
  Milk,
  Beef,
  Cookie,
  Wine,
  Fish,
  Leaf,
  FileText,
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle2,
  Search,
  HelpCircle,
  Type,
  CheckSquare,
  ShieldCheck,
  Loader2,
  Check,
  Wrench,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Milk,
  Beef,
  Cookie,
  Wine,
  Fish,
  Leaf,
  FileText,
};

const ICON_OPTIONS = [
  { id: 'Milk', icon: Milk },
  { id: 'Beef', icon: Beef },
  { id: 'Cookie', icon: Cookie },
  { id: 'Wine', icon: Wine },
  { id: 'Fish', icon: Fish },
  { id: 'Leaf', icon: Leaf },
  { id: 'FileText', icon: FileText },
];

const COLOR_OPTIONS = [
  { id: 'blue', classes: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'red', classes: 'bg-red-50 border-red-200 text-red-700' },
  { id: 'amber', classes: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'purple', classes: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'cyan', classes: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { id: 'emerald', classes: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'slate', classes: 'bg-slate-50 border-slate-200 text-slate-700' },
];

const REQ_TYPES: { type: RequirementType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { type: 'document', label: 'מסמך', icon: FileText },
  { type: 'question', label: 'שאלה', icon: HelpCircle },
  { type: 'field', label: 'שדה למילוי', icon: Type },
  { type: 'task', label: 'משימה', icon: CheckSquare },
  { type: 'approval', label: 'אישור', icon: ShieldCheck },
];

const FIELD_TYPES: { value: FieldDataType; label: string }[] = [
  { value: 'text', label: 'טקסט קצר' },
  { value: 'longtext', label: 'טקסט ארוך' },
  { value: 'number', label: 'מספר' },
  { value: 'date', label: 'תאריך' },
  { value: 'select', label: 'בחירה מרשימה' },
  { value: 'boolean', label: 'כן / לא' },
];

const SOURCE_OPTIONS: { value: RequirementSource; label: string }[] = [
  { value: 'office', label: 'המשרד' },
  { value: 'supervisor', label: 'המשגיח' },
  { value: 'importer', label: 'היבואן' },
  { value: 'factory', label: 'המפעל' },
];

const TOOL_OPTIONS: { value: ToolKey; label: string; desc: string }[] = [
  { value: 'supervision', label: 'השגחה וטיסות', desc: 'משגיח, טיסות ומלון' },
  { value: 'production', label: 'פרטי ייצור', desc: 'תאריכים, כמות, מרכיבים' },
  { value: 'approvals', label: 'אישורים', desc: 'גורמים מאשרים' },
];

let _uid = 0;
const uid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${(_uid++).toString(36)}`;

function reqTypeMeta(type: RequirementType) {
  return REQ_TYPES.find((r) => r.type === type) ?? REQ_TYPES[0];
}

export function TemplatesView() {
  const { toast } = useToast();
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WorkflowTemplate | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const load = () => {
    setLoading(true);
    fetchTemplates()
      .then(setTemplates)
      .catch(() => toast({ title: 'שגיאה', description: 'לא ניתן לטעון תבניות', variant: 'destructive' }))
      .finally(() => setLoading(false));
  };

  useEffect(load, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filteredTemplates = templates.filter(
    (t) => t.name.includes(searchQuery) || t.description.includes(searchQuery)
  );

  const handleCreateNew = () => {
    const blank: WorkflowTemplate = {
      id: '',
      name: 'תבנית חדשה',
      description: '',
      icon: 'FileText',
      color: 'bg-slate-50 border-slate-200 text-slate-700',
      category: '',
      stages: [
        {
          id: uid('s'),
          name: 'פתיחת תיק',
          description: 'קבלת פרטי היבואן ופתיחת תיק',
          order: 1,
          estimatedDays: 1,
          requirements: [],
        },
        {
          id: uid('s'),
          name: 'אישור סופי',
          description: 'הנפקת תעודה',
          order: 2,
          estimatedDays: 2,
          requirements: [],
        },
      ],
      enabledTools: ['supervision', 'production', 'approvals'],
      isDefault: false,
      usageCount: 0,
      createdAt: '',
      updatedAt: '',
    };
    setEditingTemplate(blank);
    setIsEditorOpen(true);
  };

  const handleEdit = (template: WorkflowTemplate) => {
    setEditingTemplate(structuredClone(template));
    setIsEditorOpen(true);
  };

  const handleDuplicate = async (template: WorkflowTemplate) => {
    try {
      const created = await saveTemplate({
        name: `${template.name} (העתק)`,
        description: template.description,
        icon: template.icon,
        color: template.color,
        category: template.category,
        stages: template.stages.map((s) => ({ ...s, id: uid('s') })),
      });
      setTemplates((prev) => [created, ...prev]);
      toast({ title: 'שוכפל', description: `התבנית "${created.name}" נוצרה` });
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    setDeleteConfirmId(null);
    try {
      await apiDeleteTemplate(id);
      setTemplates((prev) => prev.filter((t) => t.id !== id));
      toast({ title: 'נמחק', description: 'התבנית הוסרה' });
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    }
  };

  const handleSaveTemplate = async (template: WorkflowTemplate) => {
    try {
      const saved = await saveTemplate(template);
      setTemplates((prev) => {
        const idx = prev.findIndex((t) => t.id === saved.id);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = saved;
          return next;
        }
        return [saved, ...prev];
      });
      setIsEditorOpen(false);
      setEditingTemplate(null);
      toast({ title: 'נשמר', description: `התבנית "${saved.name}" נשמרה` });
    } catch (e) {
      toast({ title: 'שגיאה', description: (e as Error).message, variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold">ניהול תבניות</h1>
          <p className="text-muted-foreground mt-1">
            צור וערוך תבניות תהליך — הגדר לכל שלב אילו מסמכים, שאלות ושדות נדרשים
          </p>
        </div>
        <Button onClick={handleCreateNew} className="gap-2">
          <Plus className="h-4 w-4" />
          תבנית חדשה
        </Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="חיפוש תבנית..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pr-10"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">
          <Loader2 className="h-6 w-6 animate-spin ml-2" />
          טוען תבניות...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => {
            const IconComponent = ICONS[template.icon] || FileText;
            const totalDays = template.stages.reduce((sum, s) => sum + (s.estimatedDays || 0), 0);
            const totalReqs = template.stages.reduce((sum, s) => sum + s.requirements.length, 0);

            return (
              <Card key={template.id} className="group hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center ${template.color}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        <div className="flex items-center gap-2 mt-1">
                          {template.isDefault && (
                            <Badge variant="secondary" className="text-[10px] h-5">
                              ברירת מחדל
                            </Badge>
                          )}
                          <span className="text-xs text-muted-foreground">{template.usageCount} שימושים</span>
                        </div>
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4 ml-2" />
                          עריכה
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4 ml-2" />
                          שכפול
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onClick={() => setDeleteConfirmId(template.id)}>
                          <Trash2 className="h-4 w-4 ml-2" />
                          {template.isDefault ? 'העבר לארכיון' : 'מחיקה'}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>

                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 min-h-[2.5rem]">{template.description}</p>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{template.stages.length} קבוצות דרישות</span>
                      <span className="text-muted-foreground flex items-center gap-1">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        {totalReqs} דרישות
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      {template.stages.map((stage, index) => (
                        <div
                          key={stage.id}
                          className="flex-1 h-2 rounded-full bg-primary first:rounded-r-full last:rounded-l-full"
                          style={{ opacity: 1 - index * 0.13 }}
                        />
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {template.stages.slice(0, 3).map((stage) => (
                        <Badge key={stage.id} variant="outline" className="text-[10px] h-5">
                          {stage.name}
                        </Badge>
                      ))}
                      {template.stages.length > 3 && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          +{template.stages.length - 3}
                        </Badge>
                      )}
                    </div>
                  </div>

                  <Button variant="outline" className="w-full" onClick={() => handleEdit(template)}>
                    <Edit className="h-4 w-4 ml-2" />
                    עריכת תבנית
                  </Button>
                </CardContent>
              </Card>
            );
          })}

          {filteredTemplates.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground">
              לא נמצאו תבניות. צור תבנית חדשה כדי להתחיל.
            </div>
          )}
        </div>
      )}

      {editingTemplate && (
        <TemplateEditorDialog
          template={editingTemplate}
          isOpen={isEditorOpen}
          onClose={() => {
            setIsEditorOpen(false);
            setEditingTemplate(null);
          }}
          onSave={handleSaveTemplate}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={() => setDeleteConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>מחיקת תבנית</AlertDialogTitle>
            <AlertDialogDescription>
              תבניות ברירת מחדל יועברו לארכיון; תבניות מותאמות יימחקו לצמיתות. פרויקטים קיימים לא יושפעו.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
            >
              אישור
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ============================================================================
// Editor dialog
// ============================================================================

interface TemplateEditorDialogProps {
  template: WorkflowTemplate;
  isOpen: boolean;
  onClose: () => void;
  onSave: (template: WorkflowTemplate) => void;
}

function TemplateEditorDialog({ template, isOpen, onClose, onSave }: TemplateEditorDialogProps) {
  const [edited, setEdited] = useState<WorkflowTemplate>(template);
  const [expandedStage, setExpandedStage] = useState<string | null>(template.stages[0]?.id ?? null);
  const [saving, setSaving] = useState(false);
  const [library, setLibrary] = useState<CustomTool[]>([]);
  const [team, setTeam] = useState<{ id: string; name: string; role: string }[]>([]);

  useEffect(() => {
    setEdited(template);
    setExpandedStage(template.stages[0]?.id ?? null);
  }, [template]);

  useEffect(() => {
    fetchCustomTools().then(setLibrary).catch(() => {});
    fetch('/api/users/names').then((r) => r.json()).then((d) => setTeam(d.users || [])).catch(() => {});
  }, []);

  // Insert a reusable custom tool from the library as a new section.
  const insertCustomTool = (tool: CustomTool) => {
    const newStage: TemplateStage = {
      id: uid('s'),
      name: tool.name,
      description: tool.description ?? '',
      order: edited.stages.length + 1,
      estimatedDays: 1,
      requirements: tool.requirements.map((r) => ({ ...r, id: uid('r') })),
    };
    setEdited((t) => ({ ...t, stages: [...t.stages, newStage] }));
    setExpandedStage(newStage.id);
  };

  const updateStage = (stageId: string, patch: Partial<TemplateStage>) =>
    setEdited((t) => ({
      ...t,
      stages: t.stages.map((s) => (s.id === stageId ? { ...s, ...patch } : s)),
    }));

  const addStage = () => {
    const newStage: TemplateStage = {
      id: uid('s'),
      name: 'קבוצה חדשה',
      description: '',
      order: edited.stages.length + 1,
      estimatedDays: 1,
      requirements: [],
    };
    setEdited((t) => ({ ...t, stages: [...t.stages, newStage] }));
    setExpandedStage(newStage.id);
  };

  const removeStage = (stageId: string) => {
    if (edited.stages.length <= 1) return;
    setEdited((t) => ({
      ...t,
      stages: t.stages.filter((s) => s.id !== stageId).map((s, i) => ({ ...s, order: i + 1 })),
    }));
  };

  const moveStage = (stageId: string, dir: 'up' | 'down') => {
    const idx = edited.stages.findIndex((s) => s.id === stageId);
    const swap = dir === 'up' ? idx - 1 : idx + 1;
    if (swap < 0 || swap >= edited.stages.length) return;
    const next = [...edited.stages];
    [next[idx], next[swap]] = [next[swap], next[idx]];
    setEdited((t) => ({ ...t, stages: next.map((s, i) => ({ ...s, order: i + 1 })) }));
  };

  const addRequirement = (stageId: string, type: RequirementType) => {
    const req: TemplateRequirement = {
      id: uid('r'),
      type,
      label: '',
      required: true,
      ...(type === 'field' ? { dataType: 'text' as FieldDataType } : {}),
      ...(type === 'question' ? { dataType: 'longtext' as FieldDataType } : {}),
    };
    setEdited((t) => ({
      ...t,
      stages: t.stages.map((s) =>
        s.id === stageId ? { ...s, requirements: [...s.requirements, req] } : s
      ),
    }));
  };

  const updateRequirement = (stageId: string, reqId: string, patch: Partial<TemplateRequirement>) =>
    setEdited((t) => ({
      ...t,
      stages: t.stages.map((s) =>
        s.id === stageId
          ? { ...s, requirements: s.requirements.map((r) => (r.id === reqId ? { ...r, ...patch } : r)) }
          : s
      ),
    }));

  const removeRequirement = (stageId: string, reqId: string) =>
    setEdited((t) => ({
      ...t,
      stages: t.stages.map((s) =>
        s.id === stageId ? { ...s, requirements: s.requirements.filter((r) => r.id !== reqId) } : s
      ),
    }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(edited);
    setSaving(false);
  };

  const isNew = !edited.id;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isNew ? 'תבנית חדשה' : 'עריכת תבנית'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Basic info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>שם התבנית</Label>
              <Input
                value={edited.name}
                onChange={(e) => setEdited({ ...edited, name: e.target.value })}
                placeholder="למשל: חלבי, בשרי..."
              />
            </div>
            <div className="space-y-2">
              <Label>קטגוריה (סוג כשרות)</Label>
              <Input
                value={edited.category ?? ''}
                onChange={(e) => setEdited({ ...edited, category: e.target.value })}
                placeholder="חלבי / בשרי / פרווה..."
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>תיאור</Label>
            <Textarea
              value={edited.description}
              onChange={(e) => setEdited({ ...edited, description: e.target.value })}
              placeholder="תיאור קצר של סוג הפרויקט..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>אייקון</Label>
              <div className="flex flex-wrap gap-2">
                {ICON_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEdited({ ...edited, icon: opt.id })}
                    className={`p-2 rounded-lg border-2 transition-all ${
                      edited.icon === opt.id ? 'border-primary bg-primary/10' : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <opt.icon className="h-5 w-5" />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>צבע</Label>
              <div className="flex flex-wrap gap-2">
                {COLOR_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setEdited({ ...edited, color: opt.classes })}
                    className={`w-8 h-8 rounded-lg border-2 ${opt.classes} ${
                      edited.color === opt.classes ? 'ring-2 ring-primary ring-offset-2' : ''
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Tools — core (always) + optional */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label className="text-base">כלי התיק</Label>
              <div className="rounded-lg border bg-muted/30 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1.5">כלי ליבה — פעילים בכל תיק</p>
                <div className="flex flex-wrap gap-1.5">
                  {BUILTIN_TOOLS.filter((t) => t.alwaysOn).map((t) => (
                    <Badge key={t.key} variant="secondary" className="text-[10px] gap-1">
                      <Check className="h-3 w-3 text-emerald-600" />
                      {t.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">כלים אופציונליים — הפעל את אלו שהתבנית צריכה:</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {TOOL_OPTIONS.map((t) => {
                const on = (edited.enabledTools ?? []).includes(t.value);
                return (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() =>
                      setEdited((prev) => ({
                        ...prev,
                        enabledTools: on
                          ? (prev.enabledTools ?? []).filter((x) => x !== t.value)
                          : [...(prev.enabledTools ?? []), t.value],
                      }))
                    }
                    className={cn(
                      'rounded-lg border p-3 text-right transition-colors',
                      on ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm">{t.label}</span>
                      <span className={cn('h-4 w-4 rounded-full border flex items-center justify-center', on ? 'bg-primary border-primary' : 'border-muted-foreground/40')}>
                        {on && <Check className="h-3 w-3 text-primary-foreground" />}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">{t.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Requirement groups */}
          <div className="space-y-3">
            <div>
              <Label className="text-base">דרישות התיק</Label>
              <p className="text-xs text-muted-foreground mt-0.5">
                ארגן את המסמכים, השדות והמשימות שהתיק דורש לקבוצות (למשל "פתיחה", "ייצור"). אלו יופיעו בכלי "מסמכים ודרישות".
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={addStage}>
                <Plus className="h-4 w-4 ml-1" />
                קבוצה חדשה
              </Button>
              {library.length > 0 && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1">
                      <Wrench className="h-4 w-4 ml-1" />
                      מהספרייה
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {library.map((tool) => (
                      <DropdownMenuItem key={tool.id} onClick={() => insertCustomTool(tool)}>
                        {tool.name}
                        <span className="text-xs text-muted-foreground mr-2">({tool.requirements.length})</span>
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>

            <div className="space-y-2">
              {edited.stages.map((stage, index) => (
                <div key={stage.id} className="border rounded-lg bg-card overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50"
                    onClick={() => setExpandedStage(expandedStage === stage.id ? null : stage.id)}
                  >
                    <div className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <span className="flex-1 font-medium">{stage.name || 'קבוצה ללא שם'}</span>
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <Badge variant="outline" className="text-[10px]">
                        {stage.requirements.length} דרישות
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStage(stage.id, 'up')} disabled={index === 0}>
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => moveStage(stage.id, 'down')} disabled={index === edited.stages.length - 1}>
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {expandedStage === stage.id && (
                    <div className="p-4 pt-0 border-t space-y-4 bg-muted/30">
                      <div className="space-y-2">
                        <Label>שם הקבוצה</Label>
                        <Input value={stage.name} onChange={(e) => updateStage(stage.id, { name: e.target.value })} placeholder="למשל: פתיחת תיק / מסמכי ייצור" />
                      </div>
                      <div className="space-y-2">
                        <Label>תיאור (אופציונלי)</Label>
                        <Textarea value={stage.description} onChange={(e) => updateStage(stage.id, { description: e.target.value })} rows={2} />
                      </div>

                      {/* Requirements */}
                      <div className="space-y-2">
                        <Label>דרישות בקבוצה</Label>
                        <div className="space-y-2">
                          {stage.requirements.map((req) => (
                            <RequirementRow
                              key={req.id}
                              req={req}
                              team={team}
                              onChange={(patch) => updateRequirement(stage.id, req.id, patch)}
                              onRemove={() => removeRequirement(stage.id, req.id)}
                            />
                          ))}
                          {stage.requirements.length === 0 && (
                            <p className="text-xs text-muted-foreground py-2">אין דרישות בקבוצה זו. הוסף מסמך, שאלה, שדה, משימה או אישור.</p>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2 pt-1">
                          {REQ_TYPES.map((rt) => (
                            <Button key={rt.type} variant="outline" size="sm" className="gap-1.5" onClick={() => addRequirement(stage.id, rt.type)}>
                              <rt.icon className="h-3.5 w-3.5" />
                              {rt.label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          onClick={() => removeStage(stage.id)}
                          disabled={edited.stages.length <= 1}
                        >
                          <Trash2 className="h-4 w-4 ml-1" />
                          מחק קבוצה
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            ביטול
          </Button>
          <Button onClick={handleSave} disabled={saving || !edited.name.trim()}>
            {saving ? <Loader2 className="h-4 w-4 ml-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 ml-2" />}
            שמור תבנית
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================================
// A single requirement editor row
// ============================================================================

function RequirementRow({
  req,
  team,
  onChange,
  onRemove,
}: {
  req: TemplateRequirement;
  team: { id: string; name: string; role: string }[];
  onChange: (patch: Partial<TemplateRequirement>) => void;
  onRemove: () => void;
}) {
  const meta = reqTypeMeta(req.type);
  const Icon = meta.icon;

  return (
    <div className="rounded-md border bg-background p-3 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
          <Icon className="h-3.5 w-3.5" />
          {meta.label}
        </span>
        <Input
          value={req.label}
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder={
            req.type === 'document'
              ? 'שם המסמך (למשל: רשימת מרכיבים)'
              : req.type === 'question'
              ? 'נוסח השאלה'
              : req.type === 'task'
              ? 'תיאור המשימה'
              : req.type === 'approval'
              ? 'מה צריך לאשר'
              : 'שם השדה'
          }
          className="flex-1 h-8"
        />
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive shrink-0" onClick={onRemove}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* Field data-type */}
        {req.type === 'field' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">סוג שדה:</span>
            <Select value={req.dataType ?? 'text'} onValueChange={(v) => onChange({ dataType: v as FieldDataType })}>
              <SelectTrigger className="h-8 w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FIELD_TYPES.map((ft) => (
                  <SelectItem key={ft.value} value={ft.value}>
                    {ft.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Select options */}
        {req.type === 'field' && req.dataType === 'select' && (
          <Input
            value={req.options?.join(', ') ?? ''}
            onChange={(e) => onChange({ options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
            placeholder="אפשרויות מופרדות בפסיק"
            className="h-8 flex-1 min-w-[12rem]"
          />
        )}

        {/* Accepted formats for documents */}
        {req.type === 'document' && (
          <Input
            value={req.acceptedFormats?.join(', ') ?? ''}
            onChange={(e) => onChange({ acceptedFormats: e.target.value.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) })}
            placeholder="פורמטים מותרים (pdf, jpg...)"
            className="h-8 flex-1 min-w-[12rem]"
          />
        )}

        {/* Approver — a specific system user picks it up in their 'לאישורי' inbox */}
        {req.type === 'approval' && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">מאשר:</span>
            <Select
              value={req.approverName ?? ''}
              onValueChange={(v) => onChange({ approverName: v, approverRole: v })}
            >
              <SelectTrigger className="h-8 w-44">
                <SelectValue placeholder="בחר איש צוות" />
              </SelectTrigger>
              <SelectContent>
                {team.map((u) => (
                  <SelectItem key={u.id} value={u.name}>{u.name}{u.role === 'admin' ? ' (מנהל)' : ''}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Source — from whom (drives "request from…") */}
        {(req.type === 'document' || req.type === 'question' || req.type === 'task') && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">מאת:</span>
            <Select value={req.source ?? 'office'} onValueChange={(v) => onChange({ source: v as RequirementSource })}>
              <SelectTrigger className="h-8 w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SOURCE_OPTIONS.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <label className="flex items-center gap-2 text-xs text-muted-foreground mr-auto cursor-pointer">
          <Switch checked={req.required} onCheckedChange={(v) => onChange({ required: v })} />
          חובה
        </label>
      </div>
    </div>
  );
}
