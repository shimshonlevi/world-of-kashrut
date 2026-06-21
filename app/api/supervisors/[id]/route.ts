import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    for (const k of ['name', 'phone', 'email', 'kosherBodies', 'notes']) {
      if (body[k] !== undefined) data[k] = body[k] || null;
    }
    const supervisor = await prisma.supervisor.update({ where: { id }, data });
    return NextResponse.json({ supervisor });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון בעדכון משגיח' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.supervisor.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
  }
}
