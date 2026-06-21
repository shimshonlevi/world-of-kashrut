import { NextRequest, NextResponse } from 'next/server';

const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
const SESSION_COOKIE = 'wok_session';

function fromB64Url(b64url: string): Uint8Array {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

function toB64Url(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function verify(token: string | undefined): Promise<boolean> {
  if (!token) return false;
  const [body, sig] = token.split('.');
  if (!body || !sig) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const expected = toB64Url(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
    if (expected !== sig) return false;
    const payload = JSON.parse(new TextDecoder().decode(fromB64Url(body)));
    return typeof payload.exp === 'number' && payload.exp >= Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const token = req.cookies.get(SESSION_COOKIE)?.value;
  if (await verify(token)) return NextResponse.next();
  return NextResponse.json({ error: 'לא מורשה' }, { status: 401 });
}

// Protect all API routes except the auth endpoints themselves.
export const config = {
  matcher: ['/api/((?!auth/).*)'],
};
