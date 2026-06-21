import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    const importers = await prisma.importer.findMany({ orderBy: { name: 'asc' } });
    return NextResponse.json({ importers });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאה בטעינת יבואנים' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name?.trim()) return NextResponse.json({ error: 'שם היבואן חובה' }, { status: 400 });
    const importer = await prisma.importer.create({
      data: {
        name: body.name.trim(),
        contactPerson: body.contactPerson || null,
        phone: body.phone || null,
        email: body.email || null,
        country: body.country || null,
        notes: body.notes || null,
      },
    });
    return NextResponse.json({ importer }, { status: 201 });
  } catch (err: any) {
    if (err?.code === 'P2002') return NextResponse.json({ error: 'יבואן בשם זה כבר קיים' }, { status: 409 });
    console.error(err);
    return NextResponse.json({ error: 'כישלון ביצירת יבואן' }, { status: 500 });
  }
}
