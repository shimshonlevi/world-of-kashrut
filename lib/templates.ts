import type {
  WorkflowTemplate,
  TemplateStage,
  ProjectStage,
  ProjectRequirement,
  CoreBindKey,
} from './types';

/**
 * Snapshot a template's stages + requirements into the live, per-project
 * structure. The snapshot is stored on the project so later edits to the
 * template never retroactively change an in-flight case.
 */
export function instantiateStages(template: Pick<WorkflowTemplate, 'stages'>): ProjectStage[] {
  const ordered = [...template.stages].sort((a, b) => a.order - b.order);
  return ordered.map((s: TemplateStage, idx): ProjectStage => ({
    id: s.id,
    name: s.name,
    description: s.description,
    order: s.order,
    estimatedDays: s.estimatedDays,
    status: idx === 0 ? 'active' : 'pending',
    requirements: s.requirements.map(
      (r): ProjectRequirement => ({ ...r, status: 'pending' })
    ),
  }));
}

/** A requirement counts as satisfied if it's approved or done. */
export function isRequirementSatisfied(r: ProjectRequirement): boolean {
  return r.status === 'approved' || r.status === 'done';
}

/** Progress (0-100) of a single stage based on its required items. */
export function stageProgress(stage: ProjectStage): number {
  const required = stage.requirements.filter((r) => r.required);
  if (required.length === 0) return stage.status === 'completed' ? 100 : 0;
  const satisfied = required.filter(isRequirementSatisfied).length;
  return Math.round((satisfied / required.length) * 100);
}

/** Overall project progress (0-100) across all stages' required items. */
export function overallProgress(stages: ProjectStage[]): number {
  const required = stages.flatMap((s) => s.requirements.filter((r) => r.required));
  if (required.length === 0) return 0;
  const satisfied = required.filter(isRequirementSatisfied).length;
  return Math.round((satisfied / required.length) * 100);
}

/** A stage is complete once every required item is satisfied. */
export function isStageComplete(stage: ProjectStage): boolean {
  return stage.requirements.filter((r) => r.required).every(isRequirementSatisfied);
}

// --------------------------- Field binding / sync ---------------------------
// A requirement with `bindKey` mirrors a core boolean field (reportReceived,
// sentToChaim, paid). Editing either side keeps both in sync.

const satisfiedForBinding = (r: ProjectRequirement) =>
  r.status === 'submitted' || r.status === 'approved' || r.status === 'done';

/** Core-field patch implied by a (changed) requirement, e.g. { paid: true }. */
export function corePatchFromRequirement(req: ProjectRequirement): Partial<Record<CoreBindKey, boolean>> {
  if (!req.bindKey) return {};
  return { [req.bindKey]: satisfiedForBinding(req) };
}

/** Reflect a core-flag change into any bound stage requirements. */
export function syncStagesFromCore(stages: ProjectStage[], key: CoreBindKey, value: boolean): ProjectStage[] {
  return stages.map((s) => ({
    ...s,
    requirements: s.requirements.map((r) =>
      r.bindKey === key
        ? { ...r, status: value ? (r.type === 'document' ? 'approved' : 'done') : 'pending' }
        : r
    ),
  }));
}

/** Apply all core-flag changes in a patch to the stage snapshot. */
export function applyCorePatchToStages(
  stages: ProjectStage[],
  patch: Record<string, unknown>
): ProjectStage[] {
  let next = stages;
  const keys: CoreBindKey[] = ['reportReceived', 'sentToChaim', 'sentToKosherBody', 'certReceived', 'submittedToRabbinate', 'submittedForPayment', 'paid'];
  for (const key of keys) {
    if (key in patch && typeof patch[key] === 'boolean') {
      next = syncStagesFromCore(next, key, patch[key] as boolean);
    }
  }
  return next;
}

// --------------------------- API client helpers ---------------------------

export async function fetchTemplates(): Promise<WorkflowTemplate[]> {
  const res = await fetch('/api/templates');
  if (!res.ok) throw new Error('שגיאה בטעינת תבניות');
  const data = await res.json();
  return data.templates || [];
}

export async function fetchTemplate(id: string): Promise<WorkflowTemplate> {
  const res = await fetch(`/api/templates/${id}`);
  if (!res.ok) throw new Error('התבנית לא נמצאה');
  const data = await res.json();
  return data.template;
}

export async function saveTemplate(
  template: Partial<WorkflowTemplate>
): Promise<WorkflowTemplate> {
  const isUpdate = Boolean(template.id);
  const res = await fetch(isUpdate ? `/api/templates/${template.id}` : '/api/templates', {
    method: isUpdate ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(template),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error || 'שגיאה בשמירת התבנית');
  }
  const data = await res.json();
  return data.template;
}

export async function deleteTemplate(id: string): Promise<void> {
  const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('שגיאה במחיקת התבנית');
}
