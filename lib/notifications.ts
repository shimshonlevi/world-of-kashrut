import type { Project } from './types';
import { daysUntil } from './dates';

// ---------------------------------------------------------------------------
// Rule-based notifications. Rules are configurable (per system, later per
// template). Delivery is in-app now; the same rules feed email/WhatsApp later.
// ---------------------------------------------------------------------------

export type NotificationEvent =
  | 'deadline_approaching'
  | 'overdue'
  | 'missing_report'
  | 'document_rejected'
  | 'awaiting_payment'
  | 'client_awaiting';

export type RecipientRole = 'responsible' | 'supervisor' | 'importer' | 'manager';

export type NotificationChannel = 'inapp' | 'email' | 'whatsapp';

export interface NotificationRule {
  event: NotificationEvent;
  enabled: boolean;
  recipients: RecipientRole[];
  channels: NotificationChannel[];
  leadDays?: number; // for deadline_approaching / awaiting_payment
}

export type Urgency = 'high' | 'medium' | 'low';

export interface NotificationItem {
  id: string;
  projectId: string;
  projectName: string;
  importer: string;
  event: NotificationEvent;
  title: string;
  urgency: Urgency;
  recipients: { role: RecipientRole; name: string }[];
}

export const EVENT_META: Record<NotificationEvent, { label: string; urgency: Urgency }> = {
  overdue: { label: 'תיק באיחור מהיעד', urgency: 'high' },
  missing_report: { label: 'חסר דו״ח ייצור מהמשגיח', urgency: 'high' },
  document_rejected: { label: 'מסמך נדחה', urgency: 'high' },
  deadline_approaching: { label: 'יעד מתקרב', urgency: 'medium' },
  awaiting_payment: { label: 'ממתין לתשלום', urgency: 'medium' },
  client_awaiting: { label: 'יבואן ממתין למענה', urgency: 'medium' },
};

export const RECIPIENT_LABEL: Record<RecipientRole, string> = {
  responsible: 'אחראי/ת התיק',
  supervisor: 'משגיח',
  importer: 'יבואן',
  manager: 'מנהל',
};

export const DEFAULT_RULES: NotificationRule[] = [
  { event: 'overdue', enabled: true, recipients: ['responsible', 'manager'], channels: ['inapp'] },
  { event: 'missing_report', enabled: true, recipients: ['responsible', 'supervisor'], channels: ['inapp'], leadDays: 0 },
  { event: 'document_rejected', enabled: true, recipients: ['responsible'], channels: ['inapp'] },
  { event: 'deadline_approaching', enabled: true, recipients: ['responsible'], channels: ['inapp'], leadDays: 5 },
  { event: 'awaiting_payment', enabled: true, recipients: ['responsible', 'manager'], channels: ['inapp'], leadDays: 7 },
  { event: 'client_awaiting', enabled: true, recipients: ['responsible'], channels: ['inapp'] },
];

export function mergeRules(saved?: Partial<NotificationRule>[] | null): NotificationRule[] {
  if (!saved || !Array.isArray(saved)) return DEFAULT_RULES;
  return DEFAULT_RULES.map((def) => {
    const override = saved.find((r) => r.event === def.event);
    return override ? { ...def, ...override } : def;
  });
}

function resolveRecipients(project: Project, roles: RecipientRole[]): { role: RecipientRole; name: string }[] {
  return roles.map((role) => {
    switch (role) {
      case 'responsible':
        return { role, name: project.responsible };
      case 'supervisor':
        return { role, name: project.supervisor || '—' };
      case 'importer':
        return { role, name: project.importer };
      case 'manager':
        return { role, name: 'מנהל' };
    }
  });
}

/** Does the project currently trigger this event? */
function eventFires(event: NotificationEvent, project: Project, rule: NotificationRule): boolean {
  if (project.status === 'הסתיים') return false;
  const days = daysUntil(project.endDate);

  switch (event) {
    case 'overdue':
      return days !== null && days < 0;
    case 'deadline_approaching':
      return days !== null && days >= 0 && days <= (rule.leadDays ?? 5);
    case 'client_awaiting':
      return Boolean(project.clientAwaitingResponse);
    case 'missing_report':
      // A production/report stage is active but no report received yet.
      return !project.reportReceived && (project.currentStage?.includes('ייצור') || project.currentStage?.includes('דו'));
    case 'document_rejected':
      return (project.stages ?? []).some((s) => s.requirements.some((r) => r.type === 'document' && r.status === 'rejected'));
    case 'awaiting_payment':
      // Report received (work effectively done) but not yet paid.
      return project.reportReceived && !project.paid;
    default:
      return false;
  }
}

export function computeNotifications(projects: Project[], rules: NotificationRule[]): NotificationItem[] {
  const items: NotificationItem[] = [];
  for (const rule of rules) {
    if (!rule.enabled) continue;
    const meta = EVENT_META[rule.event];
    for (const p of projects) {
      if (eventFires(rule.event, p, rule)) {
        items.push({
          id: `${p.id}-${rule.event}`,
          projectId: p.id,
          projectName: p.projectName,
          importer: p.importer,
          event: rule.event,
          title: meta.label,
          urgency: meta.urgency,
          recipients: resolveRecipients(p, rule.recipients),
        });
      }
    }
  }
  const rank: Record<Urgency, number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => rank[a.urgency] - rank[b.urgency]);
}
