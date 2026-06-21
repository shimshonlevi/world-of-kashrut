import { cookies } from 'next/headers';
import { verifySession, SESSION_COOKIE, type SessionPayload } from './auth';

/** Read & verify the current session on the server (route handlers). */
export async function getServerSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  return verifySession(store.get(SESSION_COOKIE)?.value);
}
