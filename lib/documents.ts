// Smart default category for an uploaded document, from its requirement label
// and file type. The user can always override it manually.

export function inferDocumentCategory(label?: string, mimeType?: string): string {
  const l = (label || '').toLowerCase();
  if (l.includes('תעוד')) return 'certificate'; // תעודה / תעודת כשרות
  if (l.includes('חשבונ') || l.includes('קבלה')) return 'invoice';
  if (l.includes('דוח') || l.includes('דו״ח') || l.includes('דו"ח') || l.includes('report')) return 'report';
  if (l.includes('חוזה') || l.includes('הסכם')) return 'contract';
  if (mimeType?.startsWith('image/')) return 'photo';
  return 'other';
}
