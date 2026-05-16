import { cookies } from 'next/headers';
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
