'use client';
import { User } from 'firebase/auth';
import useSWR from 'swr';
import { authedJson } from '@/lib/apiClient';

export function useAuthedQuery<T = any>(user: User | null, queryKey: any, path: string) {
  const key = user ? [Array.isArray(queryKey) ? queryKey.join(':') : String(queryKey), user.uid, path] : null;
  const swr = useSWR<T>(key, () => authedJson<T>(user, path), { revalidateOnFocus: true });
  return { data: swr.data, isLoading: swr.isLoading, error: swr.error, mutate: swr.mutate };
}
