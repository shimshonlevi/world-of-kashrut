import type { ToolKey, TemplateRequirement } from './types';

// ---------------------------------------------------------------------------
// Central Tool Catalog — the single source of truth for which tools exist,
// what they do, and how they behave. The case screen, the template editor and
// the tools-management screen all read from here.
// ---------------------------------------------------------------------------

export type ToolKind = 'structured' | 'checklist';

export interface ToolMeta {
  key: string; // builtin key or custom tool id
  name: string;
  icon: string; // lucide icon name
  description: string;
  kind: ToolKind; // structured = code-backed form; checklist = requirements list
  alwaysOn?: boolean; // present in every case
  optional?: boolean; // toggleable per template (the ToolKey set)
}

export const BUILTIN_TOOLS: ToolMeta[] = [
  { key: 'overview', name: 'סקירה כללית', icon: 'LayoutDashboard', description: 'מסמך התיק המלא, אחוז השלמה וייצוא', kind: 'structured', alwaysOn: true },
  { key: 'opening', name: 'פתיחה ופרטי יבואן', icon: 'Building2', description: 'פרטי היבואן, איש קשר ומידע ראשוני', kind: 'structured', alwaysOn: true },
  { key: 'supervision', name: 'השגחה וטיסות', icon: 'Plane', description: 'משגיח, טיסות ומלון', kind: 'structured', optional: true },
  { key: 'production', name: 'פרטי ייצור', icon: 'Factory', description: 'תאריכים, כמות ומרכיבים', kind: 'structured', optional: true },
  { key: 'requirements', name: 'מסמכים ודרישות', icon: 'FileText', description: 'מסמכים, שדות ומשימות נדרשים — עם מעקב השלמה', kind: 'checklist', alwaysOn: true },
  { key: 'approvals', name: 'אישורים', icon: 'CheckCircle2', description: 'גורמים מאשרים בתיק', kind: 'checklist', optional: true },
  { key: 'chat', name: 'צ׳אט ותקשורת', icon: 'MessageCircle', description: 'תקשורת פנימית ומול היבואן', kind: 'structured', alwaysOn: true },
  { key: 'history', name: 'היסטוריית פעולות', icon: 'History', description: 'יומן כל השינויים בתיק', kind: 'structured', alwaysOn: true },
];

/** Optional builtin tools that a template can switch on/off. */
export const OPTIONAL_TOOL_KEYS: ToolKey[] = ['supervision', 'production', 'approvals'];

export function getToolMeta(key: string): ToolMeta | undefined {
  return BUILTIN_TOOLS.find((t) => t.key === key);
}

// A reusable, user-defined tool stored in the central library (Settings).
// It bundles a named set of requirements that templates can drop in.
export interface CustomTool {
  id: string;
  name: string;
  icon: string;
  description?: string;
  requirements: TemplateRequirement[];
}

export const CUSTOM_TOOLS_SETTING = 'customTools';

export async function fetchCustomTools(): Promise<CustomTool[]> {
  const res = await fetch(`/api/settings/${CUSTOM_TOOLS_SETTING}`);
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data.value) ? data.value : [];
}

export async function saveCustomTools(tools: CustomTool[]): Promise<void> {
  const res = await fetch(`/api/settings/${CUSTOM_TOOLS_SETTING}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value: tools }),
  });
  if (!res.ok) throw new Error('שמירת הכלים נכשלה');
}
