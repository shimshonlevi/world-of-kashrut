/**
 * One-time normalization of templates + cases in the DB:
 *   1. Fill each requirement's `source` (from whom) when missing — powers the
 *      work tool's "ממי מבקשים" grouping.
 *   2. Set an approval's `approverName` from its `approverRole` when a matching
 *      system user exists (e.g. "מנהל").
 *   3. Sync a bound requirement's status from the project's core flag — so a
 *      case where e.g. reportReceived=true actually shows progress.
 *
 *   npx tsx scripts/normalize-requirements.ts          # dry run
 *   npx tsx scripts/normalize-requirements.ts --apply  # write (with backup)
 */
import { PrismaClient } from '@prisma/client';
import { writeFileSync, mkdirSync } from 'fs';
import path from 'path';
import { inferRequirementSource } from '../lib/requirement-source';

const prisma = new PrismaClient();
const APPLY = process.argv.includes('--apply');

type Req = { id: string; type: string; label: string; source?: string; approverRole?: string; approverName?: string; bindKey?: string; status?: string; [k: string]: unknown };
type Stage = { id: string; requirements: Req[]; [k: string]: unknown };

async function main() {
  console.log(APPLY ? '⚠️  APPLY\n' : '🔍 DRY RUN\n');
  const users = await prisma.user.findMany({ select: { name: true } });
  const userNames = new Set(users.map((u) => u.name));

  const templates = await prisma.template.findMany();
  const projects = await prisma.project.findMany();
  const backup: any = { at: new Date().toISOString(), templates: [], projects: [] };
  let tplChanged = 0, prjChanged = 0, srcFills = 0, apprFills = 0, statusSyncs = 0;

  // Templates: source + approverName
  const tplUpdates: { id: string; stages: string }[] = [];
  for (const t of templates) {
    let stages: Stage[]; try { stages = JSON.parse(t.stages || '[]'); } catch { continue; }
    let changed = false;
    for (const s of stages) for (const r of s.requirements || []) {
      if (!r.source && r.type !== 'field' && r.type !== 'approval') { r.source = inferRequirementSource(r.label, r.type); srcFills++; changed = true; }
      if (r.type === 'approval' && !r.approverName && r.approverRole && userNames.has(r.approverRole)) { r.approverName = r.approverRole; apprFills++; changed = true; }
    }
    if (changed) { backup.templates.push({ id: t.id, stages: t.stages }); tplUpdates.push({ id: t.id, stages: JSON.stringify(stages) }); tplChanged++; }
  }

  // Projects: source + approverName + status-from-flag
  const prjUpdates: { id: string; stages: string }[] = [];
  for (const p of projects) {
    let stages: Stage[]; try { stages = JSON.parse(p.stages || '[]'); } catch { continue; }
    let changed = false;
    for (const s of stages) for (const r of s.requirements || []) {
      if (!r.source && r.type !== 'field' && r.type !== 'approval') { r.source = inferRequirementSource(r.label, r.type); srcFills++; changed = true; }
      if (r.type === 'approval' && !r.approverName && r.approverRole && userNames.has(r.approverRole)) { r.approverName = r.approverRole; apprFills++; changed = true; }
      // status from bound core flag
      if (r.bindKey && (p as any)[r.bindKey] === true && r.status !== 'approved' && r.status !== 'done') {
        r.status = r.type === 'approval' ? 'approved' : 'done';
        statusSyncs++; changed = true;
      }
    }
    if (changed) { backup.projects.push({ id: p.id, stages: p.stages }); prjUpdates.push({ id: p.id, stages: JSON.stringify(stages) }); prjChanged++; }
  }

  console.log(`תבניות שישתנו: ${tplChanged} · תיקים שישתנו: ${prjChanged}`);
  console.log(`מקורות שהושלמו: ${srcFills} · מאשרים שהוקצו: ${apprFills} · סטטוסים שסונכרנו מדגלים: ${statusSyncs}`);

  if (!APPLY) { console.log('\nלהחלה: --apply'); return; }
  if (!tplUpdates.length && !prjUpdates.length) { console.log('אין מה לעדכן.'); return; }

  const dir = path.join(process.cwd(), 'scripts', 'backups');
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `normalize-backup-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(backup, null, 2), 'utf8');
  console.log(`\n💾 גיבוי: ${file}`);
  for (const u of tplUpdates) await prisma.template.update({ where: { id: u.id }, data: { stages: u.stages } });
  for (const u of prjUpdates) await prisma.project.update({ where: { id: u.id }, data: { stages: u.stages } });
  console.log('✅ בוצע.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
