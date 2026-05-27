'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import useSWR from 'swr';
import { getIdToken } from '@/lib/auth';

async function apiFetch(path: string, user: any) {
  const token = await getIdToken(user);
  const res = await fetch(path, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  return res.json();
}

export default function ExpensesPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const { data: expenses = [], isLoading } = useSWR(user ? ['expenses', user.uid] : null, () => apiFetch('/api/expenses', user));

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <main className="mx-auto min-h-screen max-w-5xl p-4 md:p-8">
        <h1 className="mb-4 text-2xl font-bold">Expenses</h1>
        <section className="rounded-lg border border-gray-200 bg-white p-4">
          {isLoading ? <p>Loading expenses...</p> : (
            <ul className="space-y-2">{expenses.map((expense: any) => <li key={expense.id}>{expense.category} - Rs {Number(expense.amount || 0).toLocaleString('en-IN')}</li>)}</ul>
          )}
        </section>
      </main>
    </ResponsiveLayout>
  );
}

