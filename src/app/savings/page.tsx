'use client';

import useSWR from 'swr';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { getIdToken } from '@/lib/auth';

async function authedFetch(path: string, user: any) {
  const token = await getIdToken(user);
  const res = await fetch(path, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

function formatINR(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value || 0);
}

export default function SavingsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const { data: instruments = [], isLoading } = useSWR(
    user ? ['savings-instruments', user.uid] : null,
    () => authedFetch('/api/savings-instruments', user),
    { revalidateOnFocus: true }
  );

  if (!user) return null;

  const active = instruments.filter((i: any) => i.status === 'active');
  const portfolio = active.reduce((sum: number, i: any) => sum + Number(i.currentValue || 0), 0);

  return (
    <ResponsiveLayout>
      <main className="mx-auto min-h-screen max-w-6xl p-4 md:p-8">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Savings & Investments</h1>
            <p className="text-sm text-neutral-400">Dark mode, native dates, and lightweight data fetching.</p>
          </div>
        </div>

        <section className="mb-6 rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-400">Total Portfolio</p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-400">{formatINR(portfolio)}</p>
          <p className="mt-1 text-sm text-neutral-500">{active.length} active instruments</p>
        </section>

        <section className="rounded-xl border border-neutral-800 bg-neutral-900 p-4">
          {isLoading ? (
            <p className="text-sm text-neutral-500">Loading instruments...</p>
          ) : instruments.length === 0 ? (
            <p className="text-sm text-neutral-500">No instruments found.</p>
          ) : (
            <ul className="space-y-3">
              {instruments.map((instrument: any) => (
                <li key={instrument.id} className="rounded-lg border border-neutral-800 bg-neutral-950 p-3">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-semibold text-neutral-100">{instrument.name}</p>
                      <p className="text-xs text-neutral-500">
                        {instrument.provider || 'Unknown provider'}
                        {instrument.maturityDate
                          ? ` • Matures ${new Date(instrument.maturityDate).toLocaleDateString('en-IN')}`
                          : ''}
                      </p>
                    </div>
                    <p className="text-lg font-bold text-emerald-400">{formatINR(Number(instrument.currentValue || 0))}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </ResponsiveLayout>
  );
}

