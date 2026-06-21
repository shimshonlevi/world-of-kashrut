import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import type { WorkflowTemplate, TemplateStage } from '@/lib/types';

type DbTemplate = {
  id: string;
  name: string;
  description: string;
  icon: string;
  color: string;
  category: string;
  stages: string;
  tools: string;
  isDefault: boolean;
  isArchived: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
};

export function deserializeTemplate(t: DbTemplate): WorkflowTemplate {
  let stages: TemplateStage[] = [];
  try {
    stages = JSON.parse(t.stages || '[]');
  } catch {
    stages = [];
  }
  let enabledTools: WorkflowTemplate['enabledTools'] = [];
  try {
    enabledTools = JSON.parse(t.tools || '[]');
  } catch {
    enabledTools = [];
  }
  return {
    id: t.id,
    name: t.name,
    description: t.description,
    icon: t.icon,
    color: t.color,
    category: t.category,
    stages,
    enabledTools,
    isDefault: t.isDefault,
    isArchived: t.isArchived,
    usageCount: t.usageCount,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
  };
}

function validate(data: any): string[] {
  const errors: string[] = [];
  if (!data.name?.trim()) errors.push('שם התבנית חובה');
  if (!Array.isArray(data.stages) || data.stages.length === 0)
    errors.push('נדרש לפחות שלב אחד');
  return errors;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const includeArchived = searchParams.get('includeArchived') === 'true';
    const rows = (await prisma.template.findMany({
      where: includeArchived ? {} : { isArchived: false },
      orderBy: { updatedAt: 'desc' },
    })) as DbTemplate[];
    return NextResponse.json({ templates: rows.map(deserializeTemplate) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינת תבניות' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const errors = validate(body);
    if (errors.length) {
      return NextResponse.json({ error: errors.join(', '), details: errors }, { status: 400 });
    }
    const created = (await prisma.template.create({
      data: {
        name: body.name,
        description: body.description ?? '',
        icon: body.icon ?? 'FileText',
        color: body.color ?? 'bg-slate-50 border-slate-200 text-slate-700',
        category: body.category ?? '',
        stages: JSON.stringify(body.stages ?? []),
        tools: JSON.stringify(body.enabledTools ?? []),
        isDefault: false,
      },
    })) as DbTemplate;
    return NextResponse.json({ template: deserializeTemplate(created) }, { status: 201 });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת תבנית' }, { status: 500 });
  }
}
