import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Update a document's editable metadata (category, display name).
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await request.json();
    const data: Record<string, unknown> = {};
    if (body.category !== undefined) data.category = body.category || null;
    if (typeof body.originalName === 'string' && body.originalName.trim()) data.originalName = body.originalName.trim();
    const document = await prisma.document.update({ where: { id }, data });
    return NextResponse.json({ document });
  } catch (err) {
    console.error('[documents] update error', err);
    return NextResponse.json({ error: 'עדכון נכשל' }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const doc = await prisma.document.findUnique({ where: { id } });
    if (!doc) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });

    // Best-effort removal of the underlying blob (metadata is the source of truth).
    if (doc.storage === 'blob' && process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { del } = await import('@vercel/blob');
        await del(doc.url);
      } catch (e) {
        console.error('[documents] blob delete failed', e);
      }
    }

    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('[documents] delete error', err);
    return NextResponse.json({ error: 'מחיקה נכשלה' }, { status: 500 });
  }
}
