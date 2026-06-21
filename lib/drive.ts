import { readFileSync } from 'fs';
import { createSign } from 'crypto';
import path from 'path';

// Dependency-free Google Drive client using a service account:
// sign a JWT with the private key -> exchange for an access token -> Drive REST.

interface ServiceAccount {
  client_email: string;
  private_key: string;
  token_uri?: string;
}

let _sa: ServiceAccount | null | undefined;

function loadServiceAccount(): ServiceAccount | null {
  if (_sa !== undefined) return _sa;
  let result: ServiceAccount | null = null;
  const p = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (p) {
    try {
      const abs = path.isAbsolute(p) ? p : path.join(process.cwd(), p);
      result = JSON.parse(readFileSync(abs, 'utf8')) as ServiceAccount;
    } catch (e) {
      console.error('[drive] failed to load credentials:', (e as Error).message);
    }
  }
  _sa = result;
  return result;
}

export function isDriveConfigured(): boolean {
  return Boolean(loadServiceAccount());
}

export function driveServiceEmail(): string | null {
  return loadServiceAccount()?.client_email ?? null;
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString('base64url');

let tokenCache: { token: string; exp: number } | null = null;

async function getAccessToken(): Promise<string | null> {
  const sa = loadServiceAccount();
  if (!sa) return null;
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;

  const tokenUri = sa.token_uri || 'https://oauth2.googleapis.com/token';
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope: 'https://www.googleapis.com/auth/drive',
      aud: tokenUri,
      iat: now,
      exp: now + 3600,
    })
  );
  const signingInput = `${header}.${claim}`;
  const signature = createSign('RSA-SHA256').update(signingInput).sign(sa.private_key).toString('base64url');
  const assertion = `${signingInput}.${signature}`;

  const res = await fetch(tokenUri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer', assertion }),
  });
  if (!res.ok) {
    console.error('[drive] token error', res.status, await res.text().catch(() => ''));
    return null;
  }
  const data = await res.json();
  tokenCache = { token: data.access_token, exp: Date.now() + (data.expires_in || 3600) * 1000 };
  return tokenCache.token;
}

/** Create a folder inside the shared GOOGLE_DRIVE_FOLDER_ID. Returns id + webViewLink.
 *  Requires a parent folder the user shared with the service account — otherwise
 *  the folder would live in the service account's invisible drive. */
export async function createProjectFolder(name: string): Promise<{ id: string; link: string } | null> {
  const parent = process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (!parent) return null;
  const token = await getAccessToken();
  if (!token) return null;
  const metadata: Record<string, unknown> = { name, mimeType: 'application/vnd.google-apps.folder', parents: [parent] };
  const res = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,webViewLink&supportsAllDrives=true', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata),
  });
  if (!res.ok) {
    console.error('[drive] create folder error', res.status, await res.text().catch(() => ''));
    return null;
  }
  const f = await res.json();
  return { id: f.id, link: f.webViewLink };
}

/** Upload a file into a folder. Returns id + webViewLink. */
export async function uploadToFolder(
  folderId: string,
  filename: string,
  bytes: Buffer,
  mimeType: string
): Promise<{ id: string; link: string } | null> {
  const token = await getAccessToken();
  if (!token) return null;
  const boundary = '----wok' + Date.now().toString(36);
  const metadata = JSON.stringify({ name: filename, parents: [folderId] });
  const pre = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${mimeType}\r\n\r\n`;
  const post = `\r\n--${boundary}--`;
  const body = Buffer.concat([Buffer.from(pre, 'utf8'), bytes, Buffer.from(post, 'utf8')]);

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true',
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': `multipart/related; boundary=${boundary}` },
      body,
    }
  );
  if (!res.ok) {
    console.error('[drive] upload error', res.status, await res.text().catch(() => ''));
    return null;
  }
  const f = await res.json();
  return { id: f.id, link: f.webViewLink };
}

export function folderIdFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/folders\/([A-Za-z0-9_-]+)/);
  return m ? m[1] : null;
}
