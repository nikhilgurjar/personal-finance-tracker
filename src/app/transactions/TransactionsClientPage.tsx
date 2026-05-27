'use client';

import dynamic from 'next/dynamic';
import { useMemo, useState } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { fetcher } from '@/lib/swr';
import { Plus, Search, Filter, RefreshCw } from 'lucide-react';

const TransactionFormPanel = dynamic(() => import('./TransactionFormPanel'), {
  loading: () => <div className="mb-6 h-72 animate-pulse rounded-xl bg-card" />,
});
const TransactionTable = dynamic(() => import('./TransactionTable'), {
  loading: () => <div className="h-96 animate-pulse rounded-xl bg-card" />,
});

const TRANSACTION_TYPES = ['expense', 'income', 'transfer', 'savings', 'salary'];

export default function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');

  const { data: accounts = [], mutate: mutateAccounts } = useSWR('/api/accounts', fetcher);
  const { data: pagesData, size, setSize, mutate: mutateTransactions, isValidating } = useSWRInfinite(
    (pageIndex, previousPageData) => {
      if (previousPageData && !previousPageData.nextCursor) return null;
      const cursor = previousPageData ? previousPageData.nextCursor : '';
      let url = `/api/transactions?limit=25&after=${cursor}`;
      if (selectedTypeFilter) url += `&type=${selectedTypeFilter}`;
      return url;
    },
    fetcher,
    { revalidateOnFocus: true }
  );

  const allTransactions = useMemo(() => {
    if (!pagesData) return [];
    return pagesData.flatMap((page) => page.data || []);
  }, [pagesData]);

  const filteredTransactions = useMemo(() => {
    return allTransactions.filter((tx: any) => {
      const matchesSearch =
        !searchQuery ||
        tx.note?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tx.upiRefId?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesSearch;
    });
  }, [allTransactions, searchQuery]);

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <PageHeader title="Transactions" />
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="shrink-0 rounded-lg bg-cyan px-4 py-2.5 text-sm font-bold text-bg transition-all hover:bg-cyan/95 active:scale-[0.98]"
        >
          <span className="inline-flex items-center gap-2"><Plus className="h-4.5 w-4.5" /> Add Transaction</span>
        </button>
      </div>

      {formOpen && (
        <TransactionFormPanel
          accounts={accounts}
          onSaved={() => {
            mutateTransactions();
            mutateAccounts();
            setFormOpen(false);
          }}
          onCancel={() => setFormOpen(false)}
          mutateTransactions={mutateTransactions}
        />
      )}

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted"><Search className="h-4 w-4" /></span>
          <input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search notes or categories..." className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-xs text-text transition-colors focus:border-cyan focus:outline-none" />
        </div>
        <div className="relative">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted"><Filter className="h-4 w-4" /></span>
          <select value={selectedTypeFilter} onChange={(e) => setSelectedTypeFilter(e.target.value)} className="w-full rounded-lg border border-border bg-card py-2 pl-9 pr-4 text-xs capitalize text-text transition-colors focus:border-cyan focus:outline-none">
            <option value="">All Flow Types</option>
            {TRANSACTION_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
        </div>
        <div className="flex items-center justify-end gap-1.5 text-xs text-text-muted">
          {isValidating && <RefreshCw className="h-3.5 w-3.5 animate-spin text-cyan" />}
          <span>Displaying {filteredTransactions.length} records</span>
        </div>
      </div>

      <TransactionTable accounts={accounts} filteredTransactions={filteredTransactions} onDeleteDone={() => { mutateTransactions(); mutateAccounts(); }} />

      {pagesData && pagesData[pagesData.length - 1]?.nextCursor && (
        <div className="mt-6 flex justify-center">
          <button onClick={() => setSize(size + 1)} disabled={isValidating} className="rounded-lg border border-border px-6 py-2.5 text-xs font-bold text-text-muted transition-all hover:bg-card hover:text-text active:scale-[0.98]">
            {isValidating ? 'Loading...' : 'Load Older Transactions'}
          </button>
        </div>
      )}
    </AppLayout>
  );
}
