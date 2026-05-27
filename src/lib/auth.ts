import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User
} from 'firebase/auth';
import { auth } from './firebase';
import { useState, useEffect } from 'react';

const syncSessionCookie = async (user: User | null) => {
  if (!user) {
    await fetch('/api/auth/session', { method: 'DELETE' });
    return;
  }

  const idToken = await user.getIdToken();
  await fetch('/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
};

const waitForSessionCookie = async (timeoutMs = 2000) => {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    try {
      const res = await fetch('/api/auth/session', { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data?.hasSession) return true;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 120));
  }
  return false;
};

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user);
      setLoading(false);
      syncSessionCookie(user).catch((error) => {
        console.error('Error syncing auth session:', error);
      });
    });

    return unsubscribe;
  }, []);

  return { user, loading };
};

export const getIdToken = async (user: User | null): Promise<string | null> => {
  if (!user) return null;
  try {
    return await user.getIdToken();
  } catch (error) {
    console.error('Error getting ID token:', error);
    return null;
  }
};

export const signInWithGoogle = async () => {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/drive.file');
  provider.addScope('https://www.googleapis.com/auth/spreadsheets');
  
  try {
    const result = await signInWithPopup(auth, provider);
    await syncSessionCookie(result.user);
    await waitForSessionCookie();
    return result.user;
  } catch (error) {
    console.error('Error signing in with Google:', error);
    throw error;
  }
};

export const signInWithEmail = async (email: string, password: string) => {
  try {
    const result = await signInWithEmailAndPassword(auth, email, password);
    await syncSessionCookie(result.user);
    await waitForSessionCookie();
    return result.user;
  } catch (error) {
    console.error('Error signing in with email:', error);
    throw error;
  }
};

export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const result = await createUserWithEmailAndPassword(auth, email, password);
    await syncSessionCookie(result.user);
    await waitForSessionCookie();
    return result.user;
  } catch (error) {
    console.error('Error signing up with email:', error);
    throw error;
  }
};

export const logout = async () => {
  try {
    await syncSessionCookie(null);
    await signOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};
