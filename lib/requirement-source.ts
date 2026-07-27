import type { RequirementSource } from './types';

// Infers who a requirement is asked from, by its wording — so the work tool can
// group by "from whom" even when a template didn't set it explicitly.
export function inferRequirementSource(label: string, _type?: string): RequirementSource {
  const l = label || '';
  if (/דו.?ח|דוח|תמונה|צילום|מעבד|נוכח|פיקוח|השגח/.test(l)) return 'supervisor';
  if (/מרכיב|ספק|ציוד|תרשים|שוחט|מטבחי|ניקור|וטרינר|תווית|קו ייצור|הגעל|אריז/.test(l)) return 'factory';
  if (/חוזה|הסכם|תשלום|הצעת מחיר|חשבונ|קבלה/.test(l)) return 'importer';
  return 'office';
}
