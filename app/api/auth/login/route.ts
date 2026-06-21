import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { verifyPassword, signSession, SESSION_COOKIE, SESSION_MAX_AGE } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const { name, password } = await request.json();
    if (!name || !password) {
      return NextResponse.json({ error: 'יש להזין שם וסיסמה' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { name } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ error: 'שם משתמש או סיסמה שגויים' }, { status: 401 });
    }

    const token = signSession({ sub: user.id, name: user.name, role: user.role as 'admin' | 'secretary' });
    const res = NextResponse.json({
      user: { id: user.id, name: user.name, role: user.role, avatar: user.avatar },
    });
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_MAX_AGE,
    });
    return res;
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: 'שגיאת התחברות' }, { status: 500 });
  }
}
