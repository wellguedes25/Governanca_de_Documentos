const SESSION_COOKIE_NAME = 'goverdoc_session';
const SESSION_SECRET = process.env.ENCRYPTION_KEY || 'goverdoc-secret-session-key-32-bytes-long!';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 horas

export interface SessionData {
  connectionId: string;
  connectionName: string;
  version: 'V2' | 'V3';
  createdAt: number;
  expiresAt: number;
}

/**
 * Assina um payload com HMAC-SHA256 usando Web Crypto API (compatível com Edge Runtime e Node.js)
 */
async function signPayload(payload: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(SESSION_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(payload));
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Cria o token assinado de sessão
 */
export async function createSessionToken(data: Omit<SessionData, 'createdAt' | 'expiresAt'>): Promise<string> {
  const now = Date.now();
  const session: SessionData = {
    ...data,
    createdAt: now,
    expiresAt: now + SESSION_DURATION_MS,
  };

  const payload = btoa(JSON.stringify(session));
  const signature = await signPayload(payload);
  return `${payload}.${signature}`;
}

/**
 * Valida o token de sessão (compatível com Middleware e Server Actions/Routes)
 */
export async function verifySessionToken(token: string | undefined | null): Promise<SessionData | null> {
  if (!token) return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payload, signature] = parts;
    const expectedSignature = await signPayload(payload);

    if (signature !== expectedSignature) {
      return null;
    }

    const session: SessionData = JSON.parse(atob(payload));

    if (Date.now() > session.expiresAt) {
      return null;
    }

    return session;
  } catch {
    return null;
  }
}

export { SESSION_COOKIE_NAME, SESSION_DURATION_MS };
