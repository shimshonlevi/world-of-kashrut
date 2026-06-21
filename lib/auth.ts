import { scryptSync, randomBytes, timingSafeEqual, createHmac } from 'crypto';

// Secret for signing session cookies. Set AUTH_SECRET in .env for production.
const SECRET = process.env.AUTH_SECRET || 'dev-insecure-secret-change-me';
export const SESSION_COOKIE = 'wok_session';
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string; // user id
  name: string;
  role: 'admin' | 'secretary';
  exp: number; // unix seconds
}

// ----------------------------- Passwords -----------------------------------

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  if (!salt || !hash) return false;
  const candidate = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, 'hex');
  return candidate.length === original.length && timingSafeEqual(candidate, original);
}

// --------------------------- Session tokens ---------------------------------

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString('base64url');
}

export function signSession(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE };
  const body = b64url(JSON.stringify(full));
  const sig = b64url(createHmac('sha256', SECRET).update(body).digest());
  return `${body}.${sig}`;
}

export function verifySession(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = b64url(createHmac('sha256', SECRET).update(body).digest());
  // constant-time compare
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
