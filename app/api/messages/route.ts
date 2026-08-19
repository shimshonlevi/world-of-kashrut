import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getServerSession } from '@/lib/session';

// GET /api/messages — team/internal messages the current user can see:
// office broadcasts (toUserId null) + any DM they sent or received.
export async function GET() {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const me = session.sub;
  const messages = await prisma.message.findMany({
    where: { OR: [{ toUserId: null }, { toUserId: me }, { fromUserId: me }] },
    orderBy: { createdAt: 'asc' },
  });
  return NextResponse.json({ messages });
}

// POST /api/messages — send an internal message (optionally to a person, optionally linked to a case).
export async function POST(req: NextRequest) {
  const session = await getServerSession();
  if (!session) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const text = (body.body ?? '').toString().trim();
  if (!text) return NextResponse.json({ error: 'empty message' }, { status: 400 });
  const message = await prisma.message.create({
    data: {
      body: text,
      fromUserId: session.sub,
      fromName: session.name,
      toUserId: body.toUserId || null,
      toName: body.toName || null,
      caseId: body.caseId || null,
      readBy: JSON.stringify([session.sub]),
    },
  });
  return NextResponse.json({ message });
}
