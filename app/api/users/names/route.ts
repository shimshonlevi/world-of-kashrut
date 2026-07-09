import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

// Lightweight roster of user names for any authenticated user (e.g. to pick an
// approver). Unlike /api/users it exposes no sensitive fields and isn't admin-only.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'לא מחובר' }, { status: 401 });
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' }, select: { id: true, name: true, role: true } });
  return NextResponse.json({ users });
}
