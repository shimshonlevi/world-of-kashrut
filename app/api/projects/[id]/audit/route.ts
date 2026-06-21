import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auditLog = await prisma.auditLog.findMany({
      where: { projectId: id },
      orderBy: { timestamp: 'desc' },
    });

    return NextResponse.json({ auditLog });
  } catch (err) {
    console.error('Failed to fetch audit log:', err);
    return NextResponse.json({ error: 'שגיאה בטעינת יומן הפעולות' }, { status: 500 });
  }
}
