import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Global document search. Filters: q (name), projectId, category.
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get('q')?.trim();
    const projectId = searchParams.get('projectId') || undefined;
    const category = searchParams.get('category') || undefined;

    const where: Record<string, unknown> = {};
    if (projectId) where.projectId = projectId;
    if (category) where.category = category;
    if (q) {
      where.OR = [
        { originalName: { contains: q, mode: 'insensitive' } },
        { fileName: { contains: q, mode: 'insensitive' } },
        { category: { contains: q, mode: 'insensitive' } },
      ];
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 500,
    });
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('[documents] search error', err);
    return NextResponse.json({ error: 'שגיאה בחיפוש מסמכים' }, { status: 500 });
  }
}
