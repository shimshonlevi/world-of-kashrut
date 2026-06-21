import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import prisma from '@/lib/prisma';
import { verifySession, SESSION_COOKIE } from '@/lib/auth';

export async function GET() {
  const store = await cookies();
  const session = verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return NextResponse.json({ user: null }, { status: 401 });

  const user = await prisma.user.findUnique({ where: { id: session.sub } });
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  return NextResponse.json({
    user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar },
  });
}
