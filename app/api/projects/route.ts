import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeProjectForDb, deserializeProjectFromDb } from '@/lib/project-utils';
import { instantiateStages } from '@/lib/templates';
import type { TemplateStage } from '@/lib/types';
import { isDriveConfigured, createProjectFolder } from '@/lib/drive';

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

    let query: any = {};
    if (status) query.status = status;
    if (responsible) query.responsible = responsible;

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
  currentStage: '', driveLink: '', profitDaily: 0, kosherFee: 0, submissionFee: 0,
  reportReceived: false, sentToChaim: false, paid: false, needsFlightBooking: false,
  clientAwaitingResponse: false, timeline: [], documents: [], chatHistory: [],
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
        if (stages[0]) body.currentStage = stages[0].name;
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

    // Auto-create an organized Drive folder for the project (best-effort).
    if (!body.driveLink && isDriveConfigured()) {
      try {
        const folder = await createProjectFolder(`${body.projectName} — ${body.importer}`);
        if (folder) body.driveLink = folder.link;
      } catch (e) {
        console.error('[projects] drive folder creation failed', e);
      }
    }

    const data = serializeProjectForDb(body);
    const project = await prisma.project.create({ data });

    return NextResponse.json({ project: deserializeProjectFromDb(project) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת פרויקט' }, { status: 500 });
  }
}

