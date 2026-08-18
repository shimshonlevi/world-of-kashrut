import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeProjectForDb, deserializeProjectFromDb } from '@/lib/project-utils';
import { instantiateStages } from '@/lib/templates';
import type { TemplateStage } from '@/lib/types';

// Validation — only the essentials needed to open a case. The rest (supervisor,
// factory, kosher body, financials…) are collected later via the case tools.
function validateProject(data: any) {
  const errors: string[] = [];
  if (!data.projectName?.trim()) errors.push('שם הפרויקט חובה');
  if (!data.importer?.trim()) errors.push('שם היבואן חובה');
  if (!data.responsible?.trim()) errors.push('אחראי חובה');
  return errors;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const responsible = searchParams.get('responsible');
    const archived = searchParams.get('archived'); // '1' = only archived; default = only active

    let query: any = {};
    if (status) query.status = status;
    if (responsible) query.responsible = responsible;
    query.archivedAt = archived === '1' ? { not: null } : null;

    const rawProjects = await prisma.project.findMany({ 
      where: query,
      orderBy: { createdAt: 'desc' }
    });
    const projects = rawProjects.map(deserializeProjectFromDb);
    return NextResponse.json({ projects });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינת פרויקטים' }, { status: 500 });
  }
}

// Defaults for required columns so a minimal create payload never fails.
const PROJECT_DEFAULTS = {
  importerPhone: '', importerEmail: '', country: '', kosherBody: '', supervisor: '',
  supervisorPhone: '', factoryName: '', factoryAddress: '', status: 'בתהליך',
  reportReceived: false, sentToChaim: false, paid: false, needsFlightBooking: false,
  clientAwaitingResponse: false, chatHistory: [],
  flight: { status: 'not_booked' }, hotel: { status: 'not_booked' },
  startDate: new Date().toISOString().split('T')[0],
  endDate: new Date().toISOString().split('T')[0],
};

export async function POST(request: Request) {
  try {
    const raw = await request.json();
    const body: any = { ...PROJECT_DEFAULTS, ...raw };

    // Validate
    const errors = validateProject(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'Validation failed', details: errors }, { status: 400 });
    }

    // If created from a template, snapshot its stages + requirements into the
    // project (single source of truth for the case workflow). Also set the
    // first stage as the current stage.
    if (body.templateId && (!Array.isArray(body.stages) || body.stages.length === 0)) {
      const template = await prisma.template.findUnique({ where: { id: body.templateId } });
      if (template) {
        let templateStages: TemplateStage[] = [];
        try {
          templateStages = JSON.parse(template.stages || '[]');
        } catch {
          templateStages = [];
        }
        const stages = instantiateStages({ stages: templateStages });
        body.stages = stages;
        try {
          body.enabledTools = JSON.parse((template as { tools?: string }).tools || '[]');
        } catch {
          body.enabledTools = [];
        }
        // bump template usage
        await prisma.template.update({
          where: { id: template.id },
          data: { usageCount: { increment: 1 } },
        });
      }
    }

    // Link master data by id (name stays as the display snapshot). Best-effort:
    // if the name isn't in the registry yet, the id is simply left null.
    const [imp, sup, kb] = await Promise.all([
      body.importer ? prisma.importer.findUnique({ where: { name: String(body.importer).trim() }, select: { id: true } }) : null,
      body.supervisor ? prisma.supervisor.findUnique({ where: { name: String(body.supervisor).trim() }, select: { id: true } }) : null,
      body.kosherBody ? prisma.kosherBody.findUnique({ where: { name: String(body.kosherBody).trim() }, select: { id: true } }) : null,
    ]);
    if (imp) body.importerId = imp.id;
    if (sup) body.supervisorId = sup.id;
    if (kb) body.kosherBodyId = kb.id;

    const data = serializeProjectForDb(body);
    const project = await prisma.project.create({ data });

    return NextResponse.json({ project: deserializeProjectFromDb(project) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת פרויקט' }, { status: 500 });
  }
}

