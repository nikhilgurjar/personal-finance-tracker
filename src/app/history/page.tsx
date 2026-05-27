'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { TimelineView, TimelineEventData } from '@/components/TimelineView';
import { useQuery } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import { Search } from 'lucide-react';
import { useRouter } from 'next/navigation';

async function apiFetch(path: string, user: any) {
  const token = await getIdToken(user);
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

const ENTITY_LABELS: Record<string, string> = {
  transaction: 'Transaction',
  account: 'Account',
  goal: 'Goal',
  schedule: 'Schedule',
  loan: 'Loan',
  savings_instrument: 'Savings Instrument',
  category: 'Category',
};

function auditToTimeline(log: any): TimelineEventData {
  const typeMap: Record<string, TimelineEventData['type']> = {
    transaction: 'expense',
    loan: 'loan',
    savings_instrument: 'instrument',
    account: 'savings',
    goal: 'savings',
  };

  return {
    id: log.id,
    date: log.at || log.timestamp,
    title: `${log.action?.charAt(0).toUpperCase() + log.action?.slice(1)} ${ENTITY_LABELS[log.entity] || log.entity}`,
    subtitle: log.after?.note || log.after?.name || log.entityId,
    amount: log.after?.amount || log.before?.amount,
    type: typeMap[log.entity] || 'expense',
    action: log.action,
    note: log.reason === 'manual' ? undefined : `via ${log.reason}`,
  };
}

export default function HistoryPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: auditLogs = [], isLoading, error } = useQuery({
    queryKey: ['auditLogs', user?.uid],
    queryFn: async () => {
      const token = await getIdToken(user);
      const res = await fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) return null;

  const filtered = auditLogs.filter((log: any) => {
    const matchEntity = !entityFilter || log.entity === entityFilter;
    const matchAction = !actionFilter || log.action === actionFilter;
    const matchSearch = !search || JSON.stringify(log).toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchAction && matchSearch;
  });

  const events: TimelineEventData[] = filtered.map(auditToTimeline);

  const counts = {
    total: auditLogs.length,
    creates: auditLogs.filter((l: any) => l.action === 'create').length,
    updates: auditLogs.filter((l: any) => l.action === 'update').length,
    deletes: auditLogs.filter((l: any) => l.action === 'delete').length,
  };

  return (
    <ResponsiveLayout>
      <div className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-extrabold text-slate-900">History & Audit Log</h1>
            <p className="text-sm text-slate-500">Full timeline of all financial events</p>
          </div>

          {/* Stats */}
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: 'Total Events', value: counts.total, color: '#3b82f6' },
              { label: 'Created', value: counts.creates, color: '#10b981' },
              { label: 'Updated', value: counts.updates, color: '#f59e0b' },
              { label: 'Deleted', value: counts.deletes, color: '#ef4444' },
            ].map(c => (
              <div key={c.label} className="rounded-xl border border-slate-200 border-t-4 bg-white p-3" style={{ borderTopColor: c.color }}>
                <p className="text-xs text-slate-500">{c.label}</p>
                <p className="text-2xl font-bold" style={{ color: c.color }}>{c.value}</p>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="mb-6 rounded-xl border border-slate-200 bg-white p-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <label className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-slate-400" />
                <input className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" placeholder="Search" value={search} onChange={e => setSearch(e.target.value)} />
              </label>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={entityFilter} onChange={e => setEntityFilter(e.target.value)}>
                <option value="">All Entities</option>
                {Object.entries(ENTITY_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              <select className="rounded-lg border border-slate-300 px-3 py-2 text-sm" value={actionFilter} onChange={e => setActionFilter(e.target.value)}>
                <option value="">All Actions</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </select>
            </div>
          </div>

          {error && <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">Could not load audit logs. The audit logs API may need to be set up.</div>}

          {isLoading ? (
            <div className="flex flex-col gap-2">
              {[1,2,3,4,5].map(i => <div key={i} className="h-[70px] animate-pulse rounded-lg bg-slate-200" />)}
            </div>
          ) : (
            <TimelineView
              events={events}
              emptyMessage="No audit history yet. Start adding transactions to see them here."
            />
          )}
        </div>
      </div>
    </ResponsiveLayout>
  );
}
