import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';

export const runtime = 'nodejs';

// Lists the documents indexed for a project (newest first).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const documents = await prisma.document.findMany({
      where: { projectId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json({ documents });
  } catch (err) {
    console.error('[documents] list error', err);
    return NextResponse.json({ error: 'שגיאה בטעינת מסמכים' }, { status: 500 });
  }
}

// Accepts a multipart upload. Stores bytes in Vercel Blob (object storage) and
// records searchable metadata in the Document index. Falls back to local
// /public/uploads in dev when Blob isn't configured.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get('file');
    const requirementId = (form.get('requirementId') as string) || null;
    const category = (form.get('category') as string) || null;
    const uploadedBy = (form.get('uploadedBy') as string) || null;

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'לא צורף קובץ' }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 15MB)' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-֐-׿ ]/g, '_');

    // Record the document in the central index (metadata + URL). Bytes live in
    // object storage; this row powers per-project folders and global search.
    const indexDocument = async (url: string, storage: string) => {
      try {
        const doc = await prisma.document.create({
          data: {
            projectId: id,
            requirementId,
            fileName: safeName,
            originalName: file.name,
            mimeType: file.type || null,
            size: file.size,
            category,
            url,
            storage,
            uploadedBy,
          },
        });
        return doc.id;
      } catch (e) {
        console.error('[documents] failed to index document', e);
        return null;
      }
    };

    // --- Vercel Blob (cloud storage — works on serverless) ---
    if (process.env.BLOB_READ_WRITE_TOKEN) {
      try {
        const { put } = await import('@vercel/blob');
        const blob = await put(`${id}/${safeName}`, bytes, {
          access: 'public',
          addRandomSuffix: true,
          contentType: file.type || 'application/octet-stream',
        });
        const documentId = await indexDocument(blob.url, 'blob');
        return NextResponse.json({ url: blob.url, name: file.name, storage: 'blob', documentId });
      } catch (e) {
        console.error('[documents] blob upload failed', e);
      }
    }

    // --- Local storage (dev only; not writable on serverless) ---
    try {
      const fileName = `${Date.now().toString(36)}-${safeName}`;
      const dir = path.join(process.cwd(), 'public', 'uploads', id);
      await mkdir(dir, { recursive: true });
      await writeFile(path.join(dir, fileName), bytes);
      const url = `/uploads/${id}/${fileName}`;
      const documentId = await indexDocument(url, 'local');
      return NextResponse.json({ url, name: file.name, storage: 'local', documentId });
    } catch {
      return NextResponse.json(
        { error: 'אחסון הקבצים אינו מוגדר בענן. הפעל Vercel Blob (הוסף BLOB_READ_WRITE_TOKEN).' },
        { status: 503 }
      );
    }
  } catch (err) {
    console.error('[documents] upload error', err);
    return NextResponse.json({ error: 'שגיאה בהעלאת הקובץ' }, { status: 500 });
  }
}
