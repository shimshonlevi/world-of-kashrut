/**
 * Backfills Project.importerId / supervisorId / kosherBodyId from the existing
 * name strings, by matching against the master tables. Idempotent.
 *
 *   npx tsx scripts/backfill-entity-ids.ts          # dry run
 *   npx tsx scripts/backfill-entity-ids.ts --apply  # write
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

async function main() {
  console.log(APPLY ? '⚠️  APPLY\n' : '🔍 DRY RUN\n');
  const [importers, supervisors, bodies, projects] = await Promise.all([
    prisma.importer.findMany({ select: { id: true, name: true } }),
    prisma.supervisor.findMany({ select: { id: true, name: true } }),
    prisma.kosherBody.findMany({ select: { id: true, name: true } }),
    prisma.project.findMany({ select: { id: true, importer: true, supervisor: true, kosherBody: true, importerId: true, supervisorId: true, kosherBodyId: true } }),
  ]);
  const impBy = new Map(importers.map((x) => [x.name.trim(), x.id]));
  const supBy = new Map(supervisors.map((x) => [x.name.trim(), x.id]));
  const bodBy = new Map(bodies.map((x) => [x.name.trim(), x.id]));

  let imp = 0, sup = 0, bod = 0, unmatched = 0;
  for (const p of projects) {
    const data: Record<string, string> = {};
    const iId = impBy.get((p.importer || '').trim());
    const sId = supBy.get((p.supervisor || '').trim());
    const kId = bodBy.get((p.kosherBody || '').trim());
    if (iId && p.importerId !== iId) { data.importerId = iId; imp++; }
    if (sId && p.supervisorId !== sId) { data.supervisorId = sId; sup++; }
    if (kId && p.kosherBodyId !== kId) { data.kosherBodyId = kId; bod++; }
    if ((p.importer && !iId) || (p.supervisor && !sId) || (p.kosherBody && !kId)) unmatched++;
    if (APPLY && Object.keys(data).length) await prisma.project.update({ where: { id: p.id }, data });
  }

  console.log(`תיקים: ${projects.length}`);
  console.log(`קישורי יבואן: ${imp} · משגיח: ${sup} · גוף כשרות: ${bod}`);
  if (unmatched) console.log(`⚠️  ${unmatched} תיקים עם שם שלא נמצא במאגר (יישארו בלי id — נורמלי אם השם לא רשום)`);
  if (!APPLY) console.log('\nלהחלה: --apply');
  else console.log('✅ בוצע.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
