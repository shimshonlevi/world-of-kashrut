import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/session';
import { hashPassword } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });

  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  return NextResponse.json({
    users: users.map((u) => ({ id: u.id, name: u.name, role: u.role, avatar: u.avatar, createdAt: u.createdAt })),
  });
}

export async function POST(request: Request) {
  const session = await getServerSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });

  try {
    const { name, password, role } = await request.json();
    if (!name?.trim() || !password) return NextResponse.json({ error: 'שם וסיסמה חובה' }, { status: 400 });
    const avatar = name.trim().slice(0, 2);
    const user = await prisma.user.create({
      data: { name: name.trim(), role: role === 'admin' ? 'admin' : 'secretary', avatar, passwordHash: hashPassword(password) },
    });
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar } }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'משתמש בשם זה כבר קיים' }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת משתמש' }, { status: 500 });
  }
}
