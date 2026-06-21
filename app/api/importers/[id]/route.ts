import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'contactPerson', 'phone', 'email', 'country', 'notes']) {
      if (body[k] !== undefined) data[k] = body[k] || null;
    }
    const importer = await prisma.importer.update({ where: { id }, data });
    return NextResponse.json({ importer });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון בעדכון יבואן' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.importer.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
  }
}
