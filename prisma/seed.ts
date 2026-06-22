import prisma from '../lib/prisma'
import { mockProjects, defaultTemplates } from '../lib/data'
import { serializeProjectForDb } from '../lib/project-utils'
import { instantiateStages } from '../lib/templates'
import { hashPassword } from '../lib/auth'

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
        stages: JSON.stringify(t.stages),
        tools: JSON.stringify(t.enabledTools ?? []),
        isDefault: true,
        usageCount: t.usageCount,
      },
    })
  }

  // ---- Projects ----
  // Map each mock project to a default template (by kosher category) and snapshot
  // its stages, so the seeded data exercises the new requirement-driven workflow.
  const byCategory = new Map(defaultTemplates.map((t) => [t.category, t]))
  const wkTemplate = defaultTemplates.find((t) => t.id === 'tpl-wok')!
  // Spread end-dates around "today" so the demo feels alive: a couple overdue,
  // a couple due-soon, the rest comfortably ahead.
  const endOffsets = [-6, -2, 3, 9, 18, 27, 40, 55]
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  await prisma.project.deleteMany()
  for (let i = 0; i < mockProjects.length; i++) {
    const project = mockProjects[i]
    const template = byCategory.get(project.kosherBody) ?? wkTemplate // default: full WK pipeline
    const end = new Date()
    end.setDate(end.getDate() + (endOffsets[i] ?? 30))
    const start = new Date(end)
    start.setDate(start.getDate() - 45)
    const withStages = {
      ...project,
      startDate: project.status === 'הסתיים' ? project.startDate : fmt(start),
      endDate: project.status === 'הסתיים' ? project.endDate : fmt(end),
      templateId: project.templateId ?? template.id,
      stages: instantiateStages(template),
      enabledTools: template.enabledTools ?? [],
      driveLink: '', // demo data: no fake Drive link (real folders are created when Drive is configured)
    }
    const data = serializeProjectForDb(withStages)
    await prisma.project.create({ data: { ...data, id: project.id } })
  }

  // ---- Importers (derived from the mock projects) ----
  await prisma.importer.deleteMany()
  const importerMap = new Map<string, { name: string; phone?: string; email?: string; country?: string }>()
  for (const p of mockProjects) {
    if (!importerMap.has(p.importer)) {
      importerMap.set(p.importer, {
        name: p.importer,
        phone: p.importerPhone,
        email: p.importerEmail,
        country: p.country,
      })
    }
  }
  for (const imp of importerMap.values()) {
    await prisma.importer.create({
      data: { name: imp.name, phone: imp.phone ?? null, email: imp.email ?? null, country: imp.country ?? null },
    })
  }

  // ---- Supervisors (derived from the mock projects) ----
  await prisma.supervisor.deleteMany()
  const supMap = new Map<string, { name: string; phone?: string }>()
  for (const p of mockProjects) {
    if (p.supervisor && !supMap.has(p.supervisor)) {
      supMap.set(p.supervisor, { name: p.supervisor, phone: p.supervisorPhone })
    }
  }
  for (const s of supMap.values()) {
    await prisma.supervisor.create({ data: { name: s.name, phone: s.phone ?? null } })
  }

  console.log(
    `Seeded ${users.length} users (default password "${DEFAULT_PASSWORD}"), ${defaultTemplates.length} templates, ${mockProjects.length} projects, ${importerMap.size} importers, ${supMap.size} supervisors.`
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
