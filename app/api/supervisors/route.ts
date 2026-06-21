import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const supervisors = await prisma.supervisor.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ supervisors });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינת משגיחים' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'שם המשגיח חובה' }, { status: 400 });
    const supervisor = await prisma.supervisor.create({
      data: {
        name: body.name.trim(),
        phone: body.phone || null,
        email: body.email || null,
        kosherBodies: body.kosherBodies || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ supervisor }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'משגיח בשם זה כבר קיים' }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת משגיח' }, { status: 500 });
  }
}
