import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 });
  const { id } = await params;

  // Admins can edit anyone; a user may change only their own password.
  const isAdmin = session.role === 'admin';
  const isSelf = session.sub === id;
  if (!isAdmin && !isSelf) return NextResponse.json({ error: 'אין הרשאה' }, { status: 403 });

  try {
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.password) data.passwordHash = hashPassword(body.password);
    if (isAdmin && body.role) data.role = body.role === 'admin' ? 'admin' : 'secretary';
    if (isAdmin && body.name?.trim()) data.name = body.name.trim();
    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'אין שינויים' }, { status: 400 });

    const user = await prisma.user.update({ where: { id }, data });
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar } });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון בעדכון' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getServerSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  const { id } = await params;
  if (session.sub === id) return NextResponse.json({ error: 'לא ניתן למחוק את עצמך' }, { status: 400 });
  try {
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
  }
}
