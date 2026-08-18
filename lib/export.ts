import type { Project, ProjectRequirement } from './types';
import { overallProgress, stageProgress } from './templates';

// Dependency-free CSV export. Adds a UTF-8 BOM so Excel renders Hebrew correctly.

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const esc = (v: string | number | null | undefined) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][]
) {
  const csv = '﻿' + toCsv(headers, rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function requirementValueText(r: ProjectRequirement): string {
  if (r.type === 'task') return r.status === 'done' || r.status === 'approved' ? 'בוצע' : 'לא בוצע';
  if (r.type === 'approval') return r.status === 'approved' ? 'אושר' : r.status === 'rejected' ? 'נדחה' : 'ממתין';
  if (r.type === 'document')
    return r.status === 'approved' ? 'אושר' : r.status === 'submitted' ? 'הוגש' : r.status === 'rejected' ? 'נדחה' : 'חסר';
  return r.value || '—';
}

/** Export every detail of a single project as a key/value CSV (opens in Excel). */
export function exportProjectCsv(project: Project) {
  const stages = project.stages ?? [];
  const progress = overallProgress(stages);
  const profit = (project.quotedPrice || 0) - (project.actualExpenses || 0);
  const rows: (string | number)[][] = [
    ['פרויקט', project.projectName],
    ['מזהה', project.id],
    ['יבואן', project.importer],
    ['טלפון יבואן', project.importerPhone || ''],
    ['אימייל יבואן', project.importerEmail || ''],
    ['מדינה', project.country],
    ['סוג כשרות', project.kosherBody],
    ['אחראי/ת', project.responsible],
    ['סטטוס', project.status],
    ['התקדמות', `${progress}%`],
    ['תאריך התחלה', project.startDate],
    ['תאריך יעד', project.endDate],
    ['מפעל', project.factoryName],
    ['כתובת מפעל', project.factoryAddress || ''],
    ['משגיח', project.supervisor],
    ['טלפון משגיח', project.supervisorPhone || ''],
    ['דוח התקבל', project.reportReceived ? 'כן' : 'לא'],
    ['טיסה', `${project.flight?.airline || ''} ${project.flight?.flightNumber || ''} (${project.flight?.status || 'לא הוזמן'})`],
    ['תאריכי טיסה', `${project.flight?.departureDate || ''} - ${project.flight?.arrivalDate || ''}`],
    ['מלון', `${project.hotel?.hotelName || ''} (${project.hotel?.status || 'לא הוזמן'})`],
    ['הצעת מחיר', project.quotedPrice || 0],
    ['הוצאות בפועל', project.actualExpenses || 0],
    ['רווח', profit],
    ['שולם', project.paid ? 'כן' : 'לא'],
  ];
  if (project.productionDetails) {
    const pd = project.productionDetails;
    rows.push(['שעות ייצור ביום', pd.productionHoursPerDay ?? ''], ['כמות צפויה (טון)', pd.expectedQuantityTons ?? ''], ['איש קשר מקומי', pd.localContact || '']);
  }
  for (const s of stages) {
    rows.push(['—', '—'], [`שלב: ${s.name}`, `${stageProgress(s)}% (${s.status})`]);
    for (const r of s.requirements) rows.push([`  ${r.label}`, requirementValueText(r)]);
  }
  downloadCsv(`תיק-${project.id}`, ['שדה', 'ערך'], rows);
}
