import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { serializeProjectForDb, deserializeProjectFromDb } from '@/lib/project-utils';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await prisma.project.findUnique({ where: { id } });
    if (!project) return NextResponse.json({ error: 'הפרויקט לא נמצא' }, { status: 404 });
    return NextResponse.json({ project: deserializeProjectFromDb(project) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינה' }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const updates = await request.json();
    const data = serializeProjectForDb(updates);
    
    // Log changes
    const oldProject = await prisma.project.findUnique({ where: { id } });
    if (!oldProject) return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
    
    const project = await prisma.project.update({
      where: { id },
      data,
    });

    // Log audit entry for important changes
    const auditChanges = ['status', 'currentStage', 'reportReceived', 'paid'];
    for (const field of auditChanges) {
      const oldVal = (oldProject as any)[field];
      const newVal = (updates as any)[field];
      if (oldVal !== newVal) {
        try {
          await prisma.auditLog.create({
            data: {
              projectId: id,
              action: 'UPDATE',
              fieldName: field,
              oldValue: String(oldVal),
              newValue: String(newVal),
              performedBy: updates.performedBy || 'מערכת',
            },
          });
        } catch (e) {
          console.error('Audit log error:', e);
        }
      }
    }

    return NextResponse.json({ project: deserializeProjectFromDb(project) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'כישלון בעדכון' }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const project = await prisma.project.delete({ where: { id } });
    
    // Log deletion
    await prisma.auditLog.create({
      data: {
        projectId: id,
        action: 'DELETE',
        fieldName: 'project',
        oldValue: project.projectName,
        newValue: null,
        performedBy: 'מערכת',
      },
    }).catch(() => {
      // Ignore if this fails - project is already deleted
    });

    return NextResponse.json({ project: deserializeProjectFromDb(project) });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'לא נמצא' }, { status: 404 });
  }
}

