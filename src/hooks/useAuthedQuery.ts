'use client';

import { QueryKey, useQuery, UseQueryOptions } from '@tanstack/react-query';
import { User } from 'firebase/auth';
import { authedJson } from '@/lib/apiClient';

type AuthedQueryOptions<T> = Omit<UseQueryOptions<T, Error, T, QueryKey>, 'queryKey' | 'queryFn'>;

export function useAuthedQuery<T = any>(
  user: User | null,
  queryKey: QueryKey,
  path: string,
  options: AuthedQueryOptions<T> = {}
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: () => authedJson<T>(user, path),
    enabled: !!user && (options.enabled ?? true),
    ...options,
  });
}
