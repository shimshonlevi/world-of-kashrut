// Derives the prioritized "what needs work now" list for a case, so that on
// entering a project it's immediately clear what requires action.

import type { Project } from './types';
import { deadlineInfo } from './dates';
import { isRequirementSatisfied } from './templates';

export type AttentionTone = 'danger' | 'warning' | 'info';
export type AttentionSection =
  | 'overview'
  | 'details'
  | 'requirements'
  | 'approvals'
  | 'communication';

export interface AttentionItem {
  id: string;
  label: string;
  detail?: string;
  tone: AttentionTone;
  section: AttentionSection;
  count?: number;
}

const TONE_RANK: Record<AttentionTone, number> = { danger: 0, warning: 1, info: 2 };

// Empty enabledTools = show all (back-compat); otherwise only listed optionals.
function toolOn(project: Project, key: 'supervision' | 'production' | 'approvals') {
  return !project.enabledTools?.length || project.enabledTools.includes(key);
}

/** Prioritized action list for a case (most urgent first). Empty = all clear. */
export function caseAttention(project: Project): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (project.status === 'הסתיים') return items; // completed → nothing to do

  // Deadline
  const dl = deadlineInfo(project.endDate, project.status);
  if (dl.tone === 'overdue') {
    items.push({ id: 'overdue', label: 'התיק באיחור', detail: dl.label, tone: 'danger', section: 'overview' });
  } else if (dl.tone === 'soon') {
    items.push({ id: 'soon', label: 'היעד מתקרב', detail: dl.label, tone: 'warning', section: 'overview' });
  }

  // Client waiting
  if (project.clientAwaitingResponse) {
    items.push({ id: 'client', label: 'יבואן ממתין למענה', tone: 'warning', section: 'communication' });
  }

  // Pending required requirements
  const required = (project.stages ?? []).flatMap((s) => s.requirements.filter((r) => r.required));
  const pending = required.filter((r) => !isRequirementSatisfied(r));
  const pendingDocs = pending.filter((r) => r.type === 'document');
  const pendingOther = pending.filter((r) => r.type !== 'document');
  if (pendingDocs.length > 0) {
    items.push({ id: 'docs', label: 'מסמכי חובה חסרים', detail: `${pendingDocs.length} מסמכים`, tone: 'warning', section: 'requirements', count: pendingDocs.length });
  }
  if (pendingOther.length > 0) {
    items.push({ id: 'reqs', label: 'דרישות חובה פתוחות', detail: `${pendingOther.length} דרישות`, tone: 'info', section: 'requirements', count: pendingOther.length });
  }

  // Supervision / report / logistics
  if (toolOn(project, 'supervision')) {
    if (!project.reportReceived) {
      items.push({ id: 'report', label: 'דו״ח משגיח טרם התקבל', tone: 'warning', section: 'details' });
    }
    if (project.flight?.status === 'not_booked' || project.needsFlightBooking) {
      items.push({ id: 'flight', label: 'טיסה טרם הוזמנה', tone: 'warning', section: 'details' });
    }
    if (project.hotel?.status === 'not_booked') {
      items.push({ id: 'hotel', label: 'מלון טרם הוזמן', tone: 'info', section: 'details' });
    }
  }

  // Approvals that still need action from the office (not yet sent, or rejected).
  if (toolOn(project, 'approvals')) {
    let toHandle = 0;
    for (const s of project.stages ?? []) {
      for (const r of s.requirements) {
        if (r.type !== 'approval') continue;
        if (r.status === 'pending' || r.status === 'rejected') toHandle++; // needs sending / re-handling
      }
    }
    if (toHandle > 0) {
      items.push({ id: 'approvals', label: 'אישורים לטיפול', detail: `${toHandle} לשליחה`, tone: 'info', section: 'approvals', count: toHandle });
    }
  }

  return items.sort((a, b) => TONE_RANK[a.tone] - TONE_RANK[b.tone]);
}

/** Items awaiting review in a case: approvals that were sent + documents submitted. */
export function awaitingReviewCount(project: Project): number {
  if (project.status === 'הסתיים') return 0;
  let n = 0;
  for (const s of project.stages ?? []) {
    for (const r of s.requirements) {
      if (r.type === 'approval' && r.status === 'submitted') n++;
      else if (r.type === 'document' && r.status === 'submitted') n++;
    }
  }
  return n;
}

/** Items awaiting *this user's* review: approvals sent to them + docs on their own cases. */
export function myAwaitingReviewCount(project: Project, userName?: string): number {
  if (project.status === 'הסתיים' || !userName) return 0;
  let n = 0;
  for (const s of project.stages ?? []) {
    for (const r of s.requirements) {
      if (r.type === 'approval' && r.status === 'submitted' && r.approverName === userName) n++;
      else if (r.type === 'document' && r.status === 'submitted' && project.responsible === userName) n++;
    }
  }
  return n;
}
