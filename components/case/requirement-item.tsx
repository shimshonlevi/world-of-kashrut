'use client';

import { useEffect, useRef, useState } from 'react';
import type { ProjectRequirement, RequirementType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  FileText,
  HelpCircle,
  Type,
  CheckSquare,
  ShieldCheck,
  Upload,
  Check,
  X,
  Loader2,
  Download,
  Send,
  ScanText,
  MoreVertical,
  Pencil,
  MessageSquarePlus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { RequirementSource } from '@/lib/types';

const SOURCE_LABEL: Record<RequirementSource, string> = {
  office: 'המשרד',
  supervisor: 'המשגיח',
  importer: 'היבואן',
  factory: 'המפעל',
};

const TYPE_META: Record<RequirementType, { icon: React.ComponentType<{ className?: string }>; label: string; tone: string }> = {
  document: { icon: FileText, label: 'מסמך', tone: 'bg-sky-100 text-sky-600' },
  question: { icon: HelpCircle, label: 'שאלה', tone: 'bg-amber-100 text-amber-600' },
  field: { icon: Type, label: 'שדה', tone: 'bg-slate-100 text-slate-600' },
  task: { icon: CheckSquare, label: 'משימה', tone: 'bg-violet-100 text-violet-600' },
  approval: { icon: ShieldCheck, label: 'אישור', tone: 'bg-primary/10 text-primary' },
};

function StatusBadge({ status }: { status: ProjectRequirement['status'] }) {
  const map: Record<string, { label: string; cls: string }> = {
    pending: { label: 'ממתין', cls: 'bg-muted text-muted-foreground' },
    in_progress: { label: 'בתהליך', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    submitted: { label: 'הוגש לבדיקה', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    approved: { label: 'אושר', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    rejected: { label: 'נדחה', cls: 'bg-red-50 text-red-700 border-red-200' },
    done: { label: 'הושלם', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  };
  const m = map[status] ?? map.pending;
  return (
    <Badge variant="outline" className={cn('text-[10px] h-5', m.cls)}>
      {m.label}
    </Badge>
  );
}

function SavedTag() {
  return (
    <span className="inline-flex items-center gap-0.5 text-[10px] text-emerald-600 animate-in fade-in">
      <Check className="h-3 w-3" /> נשמר
    </span>
  );
}

interface RequirementItemProps {
  requirement: ProjectRequirement;
  onUpdate: (patch: Partial<ProjectRequirement>) => void;
  onUploadDocument: (file: File) => Promise<void> | void;
  onRequest?: () => void;
  onRecordReply?: () => void;
  onAnalyzeAI?: () => void;
  /** Where this requirement is defined (its template group) — shown for traceability. */
  originLabel?: string;
  /** When provided, enables in-case management (rename / remove) for this requirement. */
  onRemove?: () => void;
  busy?: boolean;
}

export function RequirementItem({ requirement: req, onUpdate, onUploadDocument, onRequest, onRecordReply, onAnalyzeAI, originLabel, onRemove, busy }: RequirementItemProps) {
  const meta = TYPE_META[req.type];
  const Icon = meta.icon;
  const fileRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(req.value ?? '');
  const [uploading, setUploading] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(req.label);
  const [justSaved, setJustSaved] = useState(false);

  useEffect(() => setDraft(req.value ?? ''), [req.value]);
  useEffect(() => setLabelDraft(req.label), [req.label]);

  const satisfied = req.status === 'approved' || req.status === 'done';

  const flashSaved = () => { setJustSaved(true); setTimeout(() => setJustSaved(false), 1600); };

  const commitValue = () => {
    const value = draft.trim();
    if (value === (req.value ?? '')) return;
    onUpdate({ value, status: value ? 'done' : 'pending' });
    flashSaved();
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    try {
      await onUploadDocument(file);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-lg border px-3 py-2.5 transition-all',
        satisfied ? 'border-emerald-200 bg-emerald-50/40' : req.status === 'rejected' ? 'border-red-200 bg-red-50/40' : req.status === 'submitted' ? 'border-amber-200 bg-amber-50/30' : 'bg-card hover:border-primary/30 hover:shadow-sm'
      )}
    >
      {/* status accent on the start (right in RTL) edge */}
      <span
        className={cn(
          'absolute inset-y-0 right-0 w-1',
          satisfied ? 'bg-emerald-400' : req.status === 'rejected' ? 'bg-red-400' : req.status === 'submitted' ? 'bg-amber-400' : 'bg-transparent'
        )}
      />
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
            satisfied ? 'bg-emerald-500 text-white' : meta.tone
          )}
        >
          {satisfied ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            {editingLabel ? (
              <Input
                autoFocus
                value={labelDraft}
                onChange={(e) => setLabelDraft(e.target.value)}
                onBlur={() => { const v = labelDraft.trim(); if (v && v !== req.label) onUpdate({ label: v }); setEditingLabel(false); }}
                onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); if (e.key === 'Escape') { setLabelDraft(req.label); setEditingLabel(false); } }}
                className="h-7 max-w-xs text-sm"
              />
            ) : (
              <span className="font-medium text-sm">{req.label || meta.label}</span>
            )}
            {req.required && <span className="text-destructive text-xs">*</span>}
            <StatusBadge status={req.status} />
            {onRequest && req.source && req.source !== 'office' && !satisfied && (
              <button
                onClick={onRequest}
                className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline mr-auto"
              >
                <Send className="h-3 w-3" />
                בקש מ{SOURCE_LABEL[req.source]}
              </button>
            )}
            {onRecordReply && req.source && req.source !== 'office' && (
              <button
                onClick={onRecordReply}
                className={cn('inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground hover:underline', !(onRequest && !satisfied) && 'mr-auto')}
              >
                <MessageSquarePlus className="h-3 w-3" />
                רשום תשובה
              </button>
            )}
            {onRemove && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className={cn('p-1 rounded hover:bg-muted text-muted-foreground', !(onRequest && req.source && req.source !== 'office' && !satisfied) && 'mr-auto')}>
                    <MoreVertical className="h-4 w-4" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setEditingLabel(true)}>
                    <Pencil className="h-4 w-4 ml-2" /> שנה שם
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive" onClick={() => { if (confirm(`להסיר את "${req.label}" מהתיק?`)) onRemove(); }}>
                    <X className="h-4 w-4 ml-2" /> הסר מהתיק
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          {/* Provenance: type · who provides it · which template group defines it */}
          <div className="flex flex-wrap items-center gap-x-1.5 text-[10px] text-muted-foreground">
            <span>{meta.label}</span>
            {req.source && req.source !== 'office' && <span>· מאת {SOURCE_LABEL[req.source]}</span>}
            {originLabel && <span>· משלב "{originLabel}"</span>}
          </div>
          {req.description && <p className="text-xs text-muted-foreground">{req.description}</p>}

          {/* ---- Type-specific fulfillment ---- */}

          {req.type === 'task' && (
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={satisfied}
                onCheckedChange={(v) => onUpdate({ status: v ? 'done' : 'pending' })}
              />
              סמן כבוצע
            </label>
          )}

          {req.type === 'question' && (
            <div className="space-y-1">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onBlur={commitValue}
                placeholder="כתוב את התשובה כאן..."
                rows={2}
                className="text-sm"
              />
              {justSaved && <SavedTag />}
            </div>
          )}

          {req.type === 'field' && (
            <div className="space-y-1">
              <FieldInput req={req} draft={draft} setDraft={setDraft} commit={commitValue} onUpdate={onUpdate} />
              {justSaved && <SavedTag />}
            </div>
          )}

          {req.type === 'document' && (
            <div className="space-y-2">
              <input
                ref={fileRef}
                type="file"
                hidden
                accept={req.acceptedFormats?.map((f) => `.${f}`).join(',')}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
              {req.value ? (
                <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2 text-sm">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <a href={req.value} target="_blank" rel="noreferrer" className="flex-1 truncate text-blue-600 hover:underline">
                    {req.note || 'צפה במסמך'}
                  </a>
                  <a href={req.value} download className="text-muted-foreground hover:text-foreground">
                    <Download className="h-4 w-4" />
                  </a>
                </div>
              ) : null}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={uploading || busy}>
                  {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin ml-1" /> : <Upload className="h-3.5 w-3.5 ml-1" />}
                  {req.value ? 'החלף קובץ' : 'העלה קובץ'}
                </Button>
                {onAnalyzeAI && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onAnalyzeAI}
                    className="gap-1 border-primary/30 text-primary hover:bg-primary/5"
                  >
                    <ScanText className="h-3.5 w-3.5" />
                    נתח עם AI
                    <span className="text-[9px] rounded bg-primary/10 px-1 py-px">בקרוב</span>
                  </Button>
                )}
                {req.status === 'submitted' && (
                  <>
                    <Button variant="outline" size="sm" className="text-emerald-700" onClick={() => onUpdate({ status: 'approved' })}>
                      <Check className="h-3.5 w-3.5 ml-1" />
                      אשר
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive" onClick={() => onUpdate({ status: 'rejected' })}>
                      <X className="h-3.5 w-3.5 ml-1" />
                      דחה
                    </Button>
                  </>
                )}
                {req.acceptedFormats && req.acceptedFormats.length > 0 && (
                  <span className="text-[10px] text-muted-foreground">פורמטים: {req.acceptedFormats.join(', ')}</span>
                )}
              </div>
            </div>
          )}

          {req.type === 'approval' && (
            <div className="flex flex-wrap items-center gap-2">
              {req.approverRole && <span className="text-xs text-muted-foreground">מאשר: {req.approverRole}</span>}
              {req.status !== 'approved' && (
                <Button variant="outline" size="sm" className="text-emerald-700" onClick={() => onUpdate({ status: 'approved' })}>
                  <Check className="h-3.5 w-3.5 ml-1" />
                  אשר
                </Button>
              )}
              {req.status !== 'rejected' && (
                <Button variant="outline" size="sm" className="text-destructive" onClick={() => onUpdate({ status: 'rejected' })}>
                  <X className="h-3.5 w-3.5 ml-1" />
                  דחה
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FieldInput({
  req,
  draft,
  setDraft,
  commit,
  onUpdate,
}: {
  req: ProjectRequirement;
  draft: string;
  setDraft: (v: string) => void;
  commit: () => void;
  onUpdate: (patch: Partial<ProjectRequirement>) => void;
}) {
  switch (req.dataType) {
    case 'boolean':
      return (
        <Select value={req.value ?? ''} onValueChange={(v) => onUpdate({ value: v, status: 'done' })}>
          <SelectTrigger className="h-9 w-40 text-sm">
            <SelectValue placeholder="בחר..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="כן">כן</SelectItem>
            <SelectItem value="לא">לא</SelectItem>
          </SelectContent>
        </Select>
      );
    case 'select':
      return (
        <Select value={req.value ?? ''} onValueChange={(v) => onUpdate({ value: v, status: 'done' })}>
          <SelectTrigger className="h-9 w-56 text-sm">
            <SelectValue placeholder="בחר..." />
          </SelectTrigger>
          <SelectContent>
            {(req.options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      );
    case 'longtext':
      return (
        <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit} rows={2} className="text-sm" />
      );
    default:
      return (
        <Input
          type={req.dataType === 'number' ? 'number' : req.dataType === 'date' ? 'date' : 'text'}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          className="h-9 max-w-xs text-sm"
        />
      );
  }
}
