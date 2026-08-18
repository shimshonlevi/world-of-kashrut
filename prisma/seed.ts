import prisma from '../lib/prisma'
import { mockProjects, defaultTemplates } from '../lib/data'
import { serializeProjectForDb } from '../lib/project-utils'
import { instantiateStages } from '../lib/templates'
import { inferRequirementSource } from '../lib/requirement-source'
import { hashPassword } from '../lib/auth'

const SEED_USERS = new Set(['נחמה', 'שירה', 'מנהל'])

// Fill each requirement's source + approver so a fresh install groups correctly.
function normalizeStages(stages: any[]): any[] {
  return (stages || []).map((s) => ({
    ...s,
    requirements: (s.requirements || []).map((r: any) => {
      const out = { ...r }
      if (!out.source && out.type !== 'field' && out.type !== 'approval') out.source = inferRequirementSource(out.label, out.type)
      if (out.type === 'approval' && !out.approverName && out.approverRole && SEED_USERS.has(out.approverRole)) out.approverName = out.approverRole
      return out
    }),
  }))
}

// Reflect a project's core flags in its bound requirement statuses (so progress isn't 0).
function syncStatusesFromFlags(stages: any[], project: any): any[] {
  return (stages || []).map((s) => ({
    ...s,
    requirements: (s.requirements || []).map((r: any) => {
      if (r.bindKey && project[r.bindKey] === true && r.status !== 'approved' && r.status !== 'done') {
        return { ...r, status: r.type === 'approval' ? 'approved' : 'done' }
      }
      return r
    }),
  }))
}

async function main() {
  // ---- Users (default password documented; change after first login) ----
  await prisma.user.deleteMany()
  const DEFAULT_PASSWORD = '1234'
  const users = [
    { name: 'נחמה', role: 'secretary', avatar: 'נח' },
    { name: 'שירה', role: 'secretary', avatar: 'שי' },
    { name: 'מנהל', role: 'admin', avatar: 'מנ' },
  ]
  for (const u of users) {
    await prisma.user.create({ data: { ...u, passwordHash: hashPassword(DEFAULT_PASSWORD) } })
  }

  // ---- Templates ----
  await prisma.template.deleteMany()
  for (const t of defaultTemplates) {
    await prisma.template.create({
      data: {
        id: t.id,
        name: t.name,
        description: t.description,
        icon: t.icon,
        color: t.color,
        category: t.category ?? '',
        stages: JSON.stringify(normalizeStages(t.stages)),
        tools: JSON.stringify(t.enabledTools ?? []),
        isDefault: true,
        usageCount: t.usageCount,
      },
    })
  }

  // ---- Master data FIRST, so projects can link to it by id ----
  const importerId = new Map<string, string>()
  const supervisorId = new Map<string, string>()
  const kosherBodyId = new Map<string, string>()

  // Importers (derived from the mock projects)
  await prisma.importer.deleteMany()
  const impSeen = new Map<string, { phone?: string; email?: string; country?: string }>()
  for (const p of mockProjects) {
    if (p.importer && !impSeen.has(p.importer)) impSeen.set(p.importer, { phone: p.importerPhone, email: p.importerEmail, country: p.country })
  }
  for (const [name, v] of impSeen) {
    const row = await prisma.importer.create({ data: { name, phone: v.phone ?? null, email: v.email ?? null, country: v.country ?? null } })
    importerId.set(name, row.id)
  }

  // Kosher bodies (derived from the mock projects)
  await prisma.kosherBody.deleteMany()
  for (const name of new Set(mockProjects.map((p) => (p.kosherBody || '').trim()).filter(Boolean))) {
    const row = await prisma.kosherBody.create({ data: { name } })
    kosherBodyId.set(name, row.id)
  }

  // Supervisors (derived, enriched with sample roster data for the demo)
  await prisma.supervisor.deleteMany()
  const supSeen = new Map<string, { phone?: string }>()
  for (const p of mockProjects) {
    if (p.supervisor && !supSeen.has(p.supervisor)) supSeen.set(p.supervisor, { phone: p.supervisorPhone })
  }
  const sampleRegions = ['איטליה, מרכז אירופה', 'פולין, מזרח אירופה', 'ארה״ב, קנדה', 'תורכיה, יוון', 'צרפת, ספרד', 'הודו, מזרח אסיה']
  const sampleAvail = ['פנוי מ-15/8', 'לא זמין בחגים', 'זמין בכל עת', 'עדיף נסיעות קצרות עד שבוע', 'פנוי בסופי שבוע בלבד', 'בחו״ל עד 20/8']
  const sampleBodies = ['OU, בד״ץ', 'כ״ף, OK', 'בד״ץ העדה', 'OU', 'Star-K, OK', 'רבנות, כ״ף']
  let si = 0
  for (const [name, v] of supSeen) {
    const row = await prisma.supervisor.create({
      data: {
        name, phone: v.phone ?? null,
        regions: sampleRegions[si % sampleRegions.length],
        availability: sampleAvail[si % sampleAvail.length],
        kosherBodies: sampleBodies[si % sampleBodies.length],
        active: si % 5 !== 4,
      },
    })
    supervisorId.set(name, row.id)
    si++
  }

  // ---- Projects (snapshot template stages + link master data by id) ----
  const byCategory = new Map(defaultTemplates.map((t) => [t.category, t]))
  const wkTemplate = defaultTemplates.find((t) => t.id === 'tpl-wok')!
  // Spread end-dates around "today" so the demo feels alive.
  const endOffsets = [-6, -2, 3, 9, 18, 27, 40, 55]
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  await prisma.project.deleteMany()
  for (let i = 0; i < mockProjects.length; i++) {
    const project = mockProjects[i]
    const template = byCategory.get(project.kosherBody) ?? wkTemplate
    const end = new Date()
    end.setDate(end.getDate() + (endOffsets[i] ?? 30))
    const start = new Date(end)
    start.setDate(start.getDate() - 45)
    const withStages = {
      ...project,
      startDate: project.status === 'הסתיים' ? project.startDate : fmt(start),
      endDate: project.status === 'הסתיים' ? project.endDate : fmt(end),
      templateId: project.templateId ?? template.id,
      importerId: importerId.get(project.importer) ?? null,
      supervisorId: supervisorId.get(project.supervisor) ?? null,
      kosherBodyId: kosherBodyId.get((project.kosherBody || '').trim()) ?? null,
      stages: syncStatusesFromFlags(normalizeStages(instantiateStages(template)), project),
      enabledTools: template.enabledTools ?? [],
    }
    const data = serializeProjectForDb(withStages)
    await prisma.project.create({ data: { ...data, id: project.id } })
  }

  console.log(
    `Seeded ${users.length} users (default password "${DEFAULT_PASSWORD}"), ${defaultTemplates.length} templates, ${importerId.size} importers, ${supervisorId.size} supervisors, ${kosherBodyId.size} kosher bodies, ${mockProjects.length} projects (linked by id).`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
