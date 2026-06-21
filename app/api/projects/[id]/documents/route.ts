import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import prisma from '@/lib/prisma';
import { isDriveConfigured, createProjectFolder, uploadToFolder, folderIdFromUrl } from '@/lib/drive';

export const runtime = 'nodejs';

// Accepts a multipart upload. Prefers Google Drive (into the project's folder);
// falls back to local /public/uploads storage when Drive isn't available.
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const form = await request.formData();
    const file = form.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'לא צורף קובץ' }, { status: 400 });
    }
    if (file.size > 15 * 1024 * 1024) {
      return NextResponse.json({ error: 'הקובץ גדול מדי (מקסימום 15MB)' }, { status: 400 });
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const safeName = file.name.replace(/[^\w.\-֐-׿ ]/g, '_');

    // --- Try Google Drive first ---
    if (isDriveConfigured()) {
      try {
        const project = await prisma.project.findUnique({ where: { id } });
        let folderId = folderIdFromUrl(project?.driveLink);
        if (!folderId && project) {
          const folder = await createProjectFolder(`${project.projectName} — ${project.importer}`);
          if (folder) {
            folderId = folder.id;
            await prisma.project.update({ where: { id }, data: { driveLink: folder.link } });
          }
        }
        if (folderId) {
          const uploaded = await uploadToFolder(folderId, safeName, bytes, file.type || 'application/octet-stream');
          if (uploaded) {
            return NextResponse.json({ url: uploaded.link, name: file.name, storage: 'drive' });
          }
        }
      } catch (e) {
        console.error('[documents] drive upload failed, falling back to local', e);
      }
    }

    // --- Fallback: local storage ---
    const fileName = `${Date.now().toString(36)}-${safeName}`;
    const dir = path.join(process.cwd(), 'public', 'uploads', id);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, fileName), bytes);

    return NextResponse.json({ url: `/uploads/${id}/${fileName}`, name: file.name, storage: 'local' });
  } catch (err) {
    console.error('[documents] upload error', err);
    return NextResponse.json({ error: 'שגיאה בהעלאת הקובץ' }, { status: 500 });
  }
}
