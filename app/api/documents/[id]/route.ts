import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

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
