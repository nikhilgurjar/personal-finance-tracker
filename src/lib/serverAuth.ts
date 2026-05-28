import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { authAdmin } from './firebaseAdmin';

export async function getCurrentUser() {
  const session = cookies().get('session')?.value;

  if (!session) {
    return null;
  }

  try {
    return await authAdmin.verifySessionCookie(session, true);
  } catch {
    return null;
  }
}

function getBearerToken(req: NextRequest) {
  const auth = req.headers.get('authorization');
  if (!auth) return null;
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

/**
 * Central auth helper for API routes.
 * - Prefer Authorization: Bearer <Firebase ID token>
 * - Fallback to the session cookie (cookies().get('session')) verified via verifySessionCookie
 */
export async function getUserIdFromRequest(req: NextRequest): Promise<string | null> {
  // 1) Header-based auth (ID token)
  const token = getBearerToken(req);
  if (token) {
    try {
      const decoded = await authAdmin.verifyIdToken(token);
      return decoded.uid;
    } catch {
      // fall through to cookie fallback
    }
  }

  // 2) Cookie-based auth (session cookie)
  try {
    const session = cookies().get('session')?.value;
    if (!session) return null;

    const decoded = await authAdmin.verifySessionCookie(session, true);
    // decoded should include uid
    return (decoded as any)?.uid ?? null;
  } catch {
    return null;
  }
}
