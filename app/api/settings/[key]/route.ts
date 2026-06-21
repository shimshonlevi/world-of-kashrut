import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

// Generic key/value settings store (JSON values). Read = any authenticated user;
// write = admin only.
export async function GET(_: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'לא מורשה' }, { status: 401 });
  const { key } = await params;
  const row = await prisma.setting.findUnique({ where: { key } });
  let value: unknown = null;
  if (row) {
    try {
      value = JSON.parse(row.value);
    } catch {
      value = null;
    }
  }
  return NextResponse.json({ key, value });
}

export async function PUT(request: Request, { params }: { params: Promise<{ key: string }> }) {
  const session = await getServerSession();
  if (session?.role !== 'admin') return NextResponse.json({ error: 'נדרשת הרשאת מנהל' }, { status: 403 });
  const { key } = await params;
  const body = await request.json();
  const value = JSON.stringify(body?.value ?? null);
  const row = await prisma.setting.upsert({
    where: { key },
    create: { key, value },
    update: { value },
  });
  return NextResponse.json({ key, value: JSON.parse(row.value) });
}
