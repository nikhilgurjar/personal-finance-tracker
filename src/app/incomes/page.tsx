'use client';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { IncomeFormFull } from '@/components/IncomeFormFull';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import { useRouter, useSearchParams } from 'next/navigation';
import { Plus, TrendingUp, MoreVertical, Pencil, Trash2, Search } from 'lucide-react';
import { SimpleTabs } from '@/components/ui/SimpleTabs';
import { useIsMobile } from '@/hooks/useIsMobile';

async function apiFetch(path: string, user: any, opts: RequestInit = {}) {
  const token = await getIdToken(user);
  return fetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default function IncomesPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);
  useEffect(() => {
    const prefill = searchParams.get('prefill');
    if (!prefill) return;
    try { setEditingIncome(JSON.parse(decodeURIComponent(prefill))); setFormOpen(true); router.replace('/incomes'); } catch {}
  }, [searchParams, router]);

  const { data: incomes = [], isLoading } = useQuery({ queryKey: ['incomes', user?.uid], queryFn: async () => (await apiFetch('/api/incomes', user)).json(), enabled: !!user });
  const { data: accounts = [] } = useQuery({ queryKey: ['accounts', user?.uid], queryFn: async () => (await apiFetch('/api/accounts', user)).json(), enabled: !!user });

  const createMutation = useMutation({ mutationFn: async (data: any) => (await apiFetch('/api/incomes', user, { method: 'POST', body: JSON.stringify({ ...data, date: data.date instanceof Date ? data.date.getTime() : data.date }) })).json(), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incomes'] }); setFormOpen(false); setToast('Income added!'); } });
  const updateMutation = useMutation({ mutationFn: async (data: any) => apiFetch(`/api/incomes/${editingIncome?.id}`, user, { method: 'PUT', body: JSON.stringify({ ...data, date: data.date instanceof Date ? data.date.getTime() : data.date }) }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incomes'] }); setFormOpen(false); setEditingIncome(null); setToast('Income updated!'); } });
  const deleteMutation = useMutation({ mutationFn: async (id: string) => apiFetch(`/api/incomes/${id}`, user, { method: 'DELETE' }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incomes'] }); setConfirmOpen(false); setToast('Income deleted'); } });
  if (!user) return null;

  const filtered = incomes.filter((i: any) => (tab === 'all' || i.sourceType === tab) && (!search || (i.sourceName || '').toLowerCase().includes(search.toLowerCase()) || (i.note || '').toLowerCase().includes(search.toLowerCase())));
  const grandTotal = incomes.reduce((s: number, i: any) => s + i.amount, 0);
  const tabs = [{ label: 'All', value: 'all' }, ...Array.from(new Set(incomes.map((i: any) => i.sourceType))).map((s) => ({ label: s, value: s }))];

  return (
    <ResponsiveLayout>
      <div className="min-h-screen p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center justify-between">
            <div><h1 className="text-3xl font-extrabold">Incomes</h1><p className="text-sm text-slate-500">Track all your income sources</p></div>
            {!isMobile && <button className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white" onClick={() => { setEditingIncome(null); setFormOpen(true); }}><Plus size={16} />Add Income</button>}
          </div>
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="text-xs text-slate-500">Total Income</p><p className="text-2xl font-extrabold text-emerald-700">Rs {grandTotal.toLocaleString('en-IN')}</p></div>
          <div className="mb-3"><label className="relative block"><Search size={16} className="absolute left-3 top-2.5 text-slate-400" /><input className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm" placeholder="Search by name or note..." value={search} onChange={(e) => setSearch(e.target.value)} /></label></div>
          <SimpleTabs value={tab} onChange={setTab} tabs={tabs} />
          {isLoading ? <div className="space-y-2">{[1,2,3].map((i)=><div key={i} className="h-12 animate-pulse rounded bg-slate-200"/>)}</div> : (
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {filtered.map((income: any) => (
                <div key={income.id} className="flex items-center justify-between border-b border-slate-100 px-3 py-2 last:border-0">
                  <div><p className="font-semibold">{income.sourceName || 'Unknown'}</p><p className="text-xs text-slate-500">{new Date(income.date).toLocaleDateString('en-IN')} {income.note ? `• ${income.note}` : ''}</p></div>
                  <div className="flex items-center gap-2"><p className="font-bold text-emerald-700">+Rs {income.amount.toLocaleString('en-IN')}</p><button onClick={() => setSelectedIncome(income)}><MoreVertical size={16} /></button></div>
                </div>
              ))}
            </div>
          )}
          {isMobile && <button className="fixed bottom-24 right-4 rounded-full bg-emerald-600 p-3 text-white shadow-lg" onClick={() => { setEditingIncome(null); setFormOpen(true); }}><Plus size={20} /></button>}
          {selectedIncome && <div className="fixed bottom-4 right-4 z-40 rounded-lg border border-slate-200 bg-white p-2 shadow"><button className="mr-2 inline-flex items-center gap-1 text-sm" onClick={() => { setEditingIncome(selectedIncome); setFormOpen(true); setSelectedIncome(null); }}><Pencil size={14}/>Edit</button><button className="inline-flex items-center gap-1 text-sm text-red-600" onClick={() => { setConfirmOpen(true); }}><Trash2 size={14}/>Delete</button></div>}
        </div>
      </div>
      <IncomeFormFull open={formOpen} onClose={() => { setFormOpen(false); setEditingIncome(null); }} onSubmit={async (d) => editingIncome ? updateMutation.mutateAsync(d) : createMutation.mutateAsync(d)} accounts={accounts} editingIncome={editingIncome} />
      <ConfirmDialog open={confirmOpen} title="Delete Income" message="Delete this income entry? This cannot be undone." onConfirm={() => selectedIncome && deleteMutation.mutate(selectedIncome.id)} onCancel={() => { setConfirmOpen(false); setSelectedIncome(null); }} loading={deleteMutation.isPending} />
      {!!toast && <div className="fixed bottom-4 left-4 rounded bg-slate-900 px-3 py-2 text-sm text-white" onAnimationEnd={() => setToast('')}>{toast}</div>}
    </ResponsiveLayout>
  );
}

