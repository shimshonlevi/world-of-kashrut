/**
 * Removes requirement entries that duplicate master data already captured
 * elsewhere in the case (importer card, supervisor assignment, production,
 * financial). These made the checklist show permanently-empty fields.
 *
 * Usage:
 *   npx tsx scripts/clean-duplicate-requirements.ts          # dry run (default)
 *   npx tsx scripts/clean-duplicate-requirements.ts --apply  # write changes
 *
 * A timestamped backup of every touched row is written to scripts/backups/
 * before anything is modified.
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

// Field requirements that restate data owned by another screen.
const DUPLICATE_FIELD_LABELS = new Set([
  'גוף כשרות',
  'משגיח',
  'פרטי מפעל / איש קשר',
  'סכום שחויב / הצעת מחיר',
  'שם איש קשר במפעל',
  'טלפון איש קשר',
]);

type Req = { id: string; type: string; label: string; [k: string]: unknown };
type Stage = { id: string; name: string; requirements: Req[]; [k: string]: unknown };

const isDuplicate = (r: Req) => r.type === 'field' && DUPLICATE_FIELD_LABELS.has((r.label || '').trim());

/** Returns [newStagesJson, removedLabels] or null when nothing changes. */
function stripDuplicates(stagesJson: string): [string, string[]] | null {
  let stages: Stage[];
  try {
    stages = JSON.parse(stagesJson || '[]');
  } catch {
    return null;
  }
  if (!Array.isArray(stages)) return null;

  const removed: string[] = [];
  const next = stages.map((s) => {
    const kept = (s.requirements || []).filter((r) => {
      if (isDuplicate(r)) {
        removed.push(`${s.name} › ${r.label}`);
        return false;
      }
      return true;
    });
    return { ...s, requirements: kept };
  });

  return removed.length ? [JSON.stringify(next), removed] : null;
}

async function main() {
  console.log(APPLY ? '⚠️  APPLY MODE — changes will be written\n' : '🔍 DRY RUN — no changes written\n');

  const templates = await prisma.template.findMany();
  const projects = await prisma.project.findMany();

  const backup: Record<string, unknown> = { at: new Date().toISOString(), templates: [], projects: [] };
  const tplUpdates: { id: string; stages: string }[] = [];
  const prjUpdates: { id: string; stages: string }[] = [];

  for (const t of templates) {
    const res = stripDuplicates(t.stages);
    if (!res) continue;
    const [stages, removed] = res;
    console.log(`תבנית "${t.name}" — ${removed.length} דרישות כפולות:`);
    removed.forEach((r) => console.log(`   − ${r}`));
    (backup.templates as unknown[]).push({ id: t.id, name: t.name, stages: t.stages });
    tplUpdates.push({ id: t.id, stages });
  }

  for (const p of projects) {
    const res = stripDuplicates(p.stages);
    if (!res) continue;
    const [stages, removed] = res;
    console.log(`תיק "${p.projectName}" — ${removed.length} דרישות כפולות`);
    (backup.projects as unknown[]).push({ id: p.id, projectName: p.projectName, stages: p.stages });
    prjUpdates.push({ id: p.id, stages });
  }

  console.log(`\nסה״כ: ${tplUpdates.length} תבניות, ${prjUpdates.length} תיקים.`);

  if (!APPLY) {
    console.log('\nלהחלה: npx tsx scripts/clean-duplicate-requirements.ts --apply');
    return;
  }

  if (!tplUpdates.length && !prjUpdates.length) {
    console.log('אין מה לעדכן.');
    return;
  }

  // Backup before writing.
  const dir = path.join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `requirements-backup-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\n💾 גיבוי נשמר: ${file}`);

  for (const u of tplUpdates) {
    await prisma.template.update({ where: { id: u.id }, data: { stages: u.stages } });
  }
  for (const u of prjUpdates) {
    await prisma.project.update({ where: { id: u.id }, data: { stages: u.stages } });
  }
  console.log('✅ בוצע.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
