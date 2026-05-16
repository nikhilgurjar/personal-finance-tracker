'use client';

import { User } from 'firebase/auth';
import { getIdToken } from './auth';

export async function authedFetch(user: User | null, path: string, opts: RequestInit = {}) {
  const token = await getIdToken(user);

  if (!token) {
    throw new Error('No authentication token available');
  }

  const headers = new Headers(opts.headers);
  headers.set('Authorization', `Bearer ${token}`);

  if (opts.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(path, {
    ...opts,
    headers,
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `Request failed with ${response.status}`);
  }

  return response;
}

export async function authedJson<T = any>(user: User | null, path: string, opts: RequestInit = {}) {
  const response = await authedFetch(user, path, opts);
  return response.json() as Promise<T>;
}
