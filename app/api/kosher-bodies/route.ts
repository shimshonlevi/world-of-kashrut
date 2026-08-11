import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const kosherBodies = await prisma.kosherBody.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ kosherBodies });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינת גופי כשרות' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'שם גוף הכשרות חובה' }, { status: 400 });
    const kosherBody = await prisma.kosherBody.create({
      data: {
        name: body.name.trim(),
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        region: body.region || null,
        notes: body.notes || null,
        active: body.active === undefined ? true : Boolean(body.active),
      },
    });
    return NextResponse.json({ kosherBody }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'גוף כשרות בשם זה כבר קיים' }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת גוף כשרות' }, { status: 500 });
  }
}
