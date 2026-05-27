'use client';

import { useMemo, useState } from 'react';
import { Wallet, ChartLine, PiggyBank, Flag, RefreshCw, AlertTriangle, CalendarDays } from 'lucide-react';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import ForecastBalanceChart from './ForecastBalanceChart';

function formatCurrency(value = 0) {
  return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

function formatDate(value: number | string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function StatCard({ title, value, icon, color }: { title: string; value: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="rounded-xl border border-slate-200 border-t-4 bg-white p-4" style={{ borderTopColor: color }}>
      <div className="mb-1 flex items-center justify-between">
        <p className="text-sm font-bold text-slate-500">{title}</p>
        <div style={{ color }}>{icon}</div>
      </div>
      <p className="text-2xl font-extrabold text-slate-900">{value}</p>
    </div>
  );
}

export default function ForecastClientPage({ userId }: { userId: string }) {
  const user = useMemo(() => ({ uid: userId }), [userId]);
  const [days, setDays] = useState(90);
  const [extraSavings, setExtraSavings] = useState(0);
  const [earlyRepayment, setEarlyRepayment] = useState(0);
  const [whatIfAccountId, setWhatIfAccountId] = useState('');

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ days: String(days) });
    if (extraSavings > 0) params.set('extraSavings', String(extraSavings));
    if (earlyRepayment > 0) params.set('earlyRepayment', String(earlyRepayment));
    if (whatIfAccountId) params.set('whatIfAccountId', whatIfAccountId);
    return params.toString();
  }, [days, extraSavings, earlyRepayment, whatIfAccountId]);

  const { data, isLoading, error, mutate } = useAuthedQuery<any>(user as any, ['forecast', userId, queryString], `/api/forecast?${queryString}`);

  const accounts: any[] = data?.accounts ?? [];
  const daily: any[] = data?.daily ?? [];
  const upcoming: any[] = data?.upcoming ?? [];
  const alerts: any[] = data?.alerts ?? [];
  const goalImpact: any[] = data?.goalImpact ?? [];

  return (
    <ResponsiveLayout>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-7xl">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">AI Forecast</h1>
              <p className="text-sm text-slate-500">Project balances, upcoming obligations, goal timing, and what-if decisions.</p>
            </div>
            <div className="min-w-[240px] rounded-lg border border-slate-200 bg-white p-3">
              <p className="text-xs font-bold text-slate-500">Horizon: {days} days</p>
              <input type="range" min={30} max={180} step={30} value={days} onChange={(e) => setDays(Number(e.target.value))} className="w-full" />
            </div>
          </div>

          {error && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">
              <span>Failed to load forecast: {(error as any)?.message || 'Unknown error.'}</span>
              <button onClick={() => mutate()} className="inline-flex items-center gap-1 text-red-700 underline"><RefreshCw size={14} />Retry</button>
            </div>
          )}

          {isLoading || (!data && !error) ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 animate-pulse rounded-lg bg-slate-200" />)}
            </div>
          ) : data ? (
            <>
              <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Starting Balance" value={formatCurrency(data.startingBalance)} icon={<Wallet size={18} />} color="#2563eb" />
                <StatCard title="Projected Ending" value={formatCurrency(data.endingBalance)} icon={<ChartLine size={18} />} color="#059669" />
                <StatCard title="Forecast Outflow" value={formatCurrency(data.outflowTotal)} icon={<PiggyBank size={18} />} color="#dc2626" />
                <StatCard title="Net Worth Snapshot" value={formatCurrency(data.netWorth)} icon={<Flag size={18} />} color="#7c3aed" />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
                <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-8">
                  <h2 className="mb-2 text-lg font-extrabold text-slate-900">Balance Projection</h2>
                  {daily.length > 0 ? (
                    <ForecastBalanceChart daily={daily} />
                  ) : <p className="py-8 text-center text-slate-500">No projection data available.</p>}
                </div>

                <div className="space-y-4 lg:col-span-4">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-lg font-extrabold text-slate-900">What-If Controls</h2>
                    <select value={whatIfAccountId} onChange={(e) => setWhatIfAccountId(e.target.value)} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm">
                      <option value="">No account selected</option>
                      {accounts.map((a: any) => <option key={a.id} value={a.id}>{a.name} ({formatCurrency(a.balance)})</option>)}
                    </select>
                    <input type="number" placeholder="Extra savings contribution" value={extraSavings} onChange={(e) => setExtraSavings(Number(e.target.value || 0))} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <input type="number" placeholder="Early loan repayment" value={earlyRepayment} onChange={(e) => setEarlyRepayment(Number(e.target.value || 0))} className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                    <button onClick={() => { setExtraSavings(0); setEarlyRepayment(0); setWhatIfAccountId(''); }} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">Reset Scenario</button>
                  </div>

                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <h2 className="mb-2 text-lg font-extrabold text-slate-900">Risk Alerts</h2>
                    {alerts.length === 0 ? (
                      <div className="rounded-lg border border-green-300 bg-green-50 px-3 py-2 text-sm text-green-700">No major forecast risks in this horizon.</div>
                    ) : (
                      <div className="space-y-2">
                        {alerts.map((alert: any, i: number) => (
                          <div key={`${alert.title}-${i}`} className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                            <div className="flex items-center gap-1 font-bold"><AlertTriangle size={14} />{alert.title}</div>
                            <p>{alert.message}</p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-6">
                  <h2 className="mb-2 text-lg font-extrabold text-slate-900">Upcoming Forecast Events</h2>
                  <div className="space-y-2">
                    {upcoming.slice(0, 10).map((event: any, i: number) => (
                      <div key={event.id ?? i} className="flex items-center justify-between gap-2 rounded-lg border border-slate-200 px-3 py-2">
                        <div>
                          <p className="text-sm font-bold text-slate-900">{event.title}</p>
                          <p className="text-xs text-slate-500">{formatDate(event.date)}</p>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">{formatCurrency(event.amount)}</span>
                      </div>
                    ))}
                    {upcoming.length === 0 && <p className="py-6 text-center text-slate-500"><CalendarDays className="mx-auto mb-1" size={28} />No upcoming scheduled events.</p>}
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4 lg:col-span-6">
                  <h2 className="mb-2 text-lg font-extrabold text-slate-900">Goal Impact</h2>
                  <div className="space-y-3">
                    {goalImpact.map((goal: any) => (
                      <div key={goal.id}>
                        <div className="mb-1 flex items-center justify-between gap-2">
                          <p className="text-sm font-bold text-slate-900">{goal.name}</p>
                          <p className="text-sm font-bold text-blue-600">{goal.progress}%</p>
                        </div>
                        <div className="mb-1 h-2 rounded-full bg-slate-200">
                          <div className="h-2 rounded-full bg-blue-600" style={{ width: `${goal.progress}%` }} />
                        </div>
                        <p className="text-xs text-slate-500">Remaining {formatCurrency(goal.remaining)}{goal.projectedDate ? `, projected around ${formatDate(goal.projectedDate)}` : ', needs more surplus to project a date'}</p>
                      </div>
                    ))}
                    {goalImpact.length === 0 && <p className="py-6 text-center text-slate-500">No goals available for impact projection.</p>}
                  </div>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </ResponsiveLayout>
  );
}
