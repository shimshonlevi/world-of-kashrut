import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { deserializeTemplate } from '../route';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const t = await prisma.template.findUnique({ where: { id } });
    if (!t) return NextResponse.json({ error: 'התבנית לא נמצאה' }, { status: 404 });
    return NextResponse.json({ template: deserializeTemplate(t as any) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינה' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.name !== undefined) data.name = body.name;
    if (body.description !== undefined) data.description = body.description;
    if (body.icon !== undefined) data.icon = body.icon;
    if (body.color !== undefined) data.color = body.color;
    if (body.category !== undefined) data.category = body.category;
    if (body.isArchived !== undefined) data.isArchived = body.isArchived;
    if (body.stages !== undefined) data.stages = JSON.stringify(body.stages);
    if (body.enabledTools !== undefined) data.tools = JSON.stringify(body.enabledTools);

    const updated = await prisma.template.update({ where: { id }, data });
    return NextResponse.json({ template: deserializeTemplate(updated as any) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון בעדכון התבנית' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    // Soft-delete defaults (archive); hard-delete custom templates.
    const existing = await prisma.template.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });

    if (existing.isDefault) {
      const archived = await prisma.template.update({
        where: { id },
        data: { isArchived: true },
      });
      return NextResponse.json({ template: deserializeTemplate(archived as any) });
    }

    await prisma.template.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
  }
}
