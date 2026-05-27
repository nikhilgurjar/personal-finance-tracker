'use client';

import { useState, useRef, useMemo } from 'react';
import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useVirtualizer } from '@tanstack/react-virtual';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { fetcher } from '@/lib/swr';
import { formatCurrency } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import {
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Wallet,
  ArrowRight,
  TrendingDown,
  TrendingUp,
  RefreshCw,
} from 'lucide-react';

const TRANSACTION_TYPES = ['expense', 'income', 'transfer', 'savings', 'salary'];
const PAYMENT_METHODS = ['upi', 'neft', 'imps', 'rtgs', 'cash', 'card', 'cheque'];
const CATEGORIES = [
  'Food & Dining',
  'Rent & Home',
  'Utilities',
  'Shopping',
  'Travel & Transport',
  'Entertainment',
  'Medical & Health',
  'Education',
  'Investment',
  'Salary',
  'Others',
];

export default function TransactionsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Form states (controlled React state)
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer' | 'savings' | 'salary'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiRefId, setUpiRefId] = useState('');
  
  // Salary details
  const [netTakeHome, setNetTakeHome] = useState('');
  const [employeePf, setEmployeePf] = useState('');

  // Fetch accounts list
  const { data: accounts = [], mutate: mutateAccounts } = useSWR('/api/accounts', fetcher);

  // Infinite Scroll SWR setup for transactions
  const {
    data: pagesData,
    size,
    setSize,
    mutate: mutateTransactions,
    isValidating,
  } = useSWRInfinite(
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

  // Flatten all transactions from all pages
  const allTransactions = useMemo(() => {
    if (!pagesData) return [];
    return pagesData.flatMap((page) => page.data || []);
  }, [pagesData]);

  // Client-side search filtering
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

  // Virtualizer setup
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: filteredTransactions.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 5,
  });

  const getAccountName = (id?: string) => {
    if (!id) return '';
    const acc = accounts.find((a: any) => a.id === id);
    return acc ? acc.name : 'Unknown';
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Enter valid amount');

    setLoadingAction(true);
    try {
      const payload: any = {
        type: txType,
        amount: Number(amount),
        date: new Date(date).getTime(),
        note: note.trim(),
        paymentMethod,
      };

      if (txType === 'expense') {
        payload.fromAccountId = fromAccountId;
        payload.category = category || 'Others';
      } else if (txType === 'income') {
        payload.toAccountId = toAccountId;
        payload.category = category || 'Salary';
      } else if (txType === 'salary') {
        payload.toAccountId = toAccountId;
        payload.category = 'Salary';
        payload.salaryComponents = {
          netTakeHome: Number(netTakeHome || amount),
          employeePf: Number(employeePf || 0),
          salaryMonth: date.substring(0, 7), // YYYY-MM
        };
      } else if (txType === 'transfer' || txType === 'savings') {
        payload.fromAccountId = fromAccountId;
        payload.toAccountId = toAccountId;
        payload.category = txType === 'savings' ? 'Investment' : 'Transfer';
      }

      if (paymentMethod === 'upi' && upiRefId) {
        payload.upiRefId = upiRefId.trim();
      }

      // Optimistic Update
      const optimisticTx = {
        ...payload,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      };
      
      // Update local cache
      await mutateTransactions(
        (current: any) => {
          if (!current) return current;
          const firstPage = current[0] || { data: [] };
          const updatedFirstPage = {
            ...firstPage,
            data: [optimisticTx, ...(firstPage.data || [])],
          };
          return [updatedFirstPage, ...current.slice(1)];
        },
        { revalidate: false }
      );

      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save transaction');

      // Trigger full SWR updates
      mutateTransactions();
      mutateAccounts();

      // Reset form states
      setAmount('');
      setNote('');
      setCategory('');
      setUpiRefId('');
      setNetTakeHome('');
      setEmployeePf('');
      setFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving transaction');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;

    try {
      const res = await fetch(`/api/transactions/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');
      mutateTransactions();
      mutateAccounts();
    } catch (err: any) {
      alert(err.message || 'Error deleting transaction');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="Transactions" />
        <button
          onClick={() => setFormOpen(!formOpen)}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> Add Transaction
        </button>
      </div>

      {/* Transaction Editor Panel */}
      {formOpen && (
        <div className="bg-card border border-border rounded-xl p-6 mb-6 animate-in fade-in slide-in-from-top duration-200">
          <h3 className="font-syne text-md font-bold text-white mb-4">New Money Flow</h3>
          <form onSubmit={handleAddTransaction} className="space-y-4">
            
            {/* Flow Type selector */}
            <div className="grid grid-cols-5 gap-1.5 p-1 bg-[#0a0f1c] border border-border rounded-lg">
              {TRANSACTION_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => {
                    setTxType(type as any);
                    setCategory('');
                  }}
                  className={`py-1.5 rounded text-xs font-semibold capitalize transition-all ${
                    txType === type
                      ? 'bg-cyan/15 text-cyan'
                      : 'text-text-muted hover:text-text'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {/* Basic Grid Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Amount (INR)</label>
                <input
                  type="number"
                  required
                  min="0.01"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan capitalize"
                >
                  {PAYMENT_METHODS.map((pm) => (
                    <option key={pm} value={pm}>{pm}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Conditional Sub-selectors */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Debit/From Account */}
              {(txType === 'expense' || txType === 'transfer' || txType === 'savings') && (
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Debit From (Source)</label>
                  <select
                    required
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Credit/To Account */}
              {(txType === 'income' || txType === 'salary' || txType === 'transfer' || txType === 'savings') && (
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Credit To (Destination)</label>
                  <select
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category */}
              {(txType === 'expense' || txType === 'income') && (
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="">Select Category</option>
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* UPI ID */}
              {paymentMethod === 'upi' && (
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">UPI Ref ID / UTR (Optional)</label>
                  <input
                    type="text"
                    value={upiRefId}
                    onChange={(e) => setUpiRefId(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="e.g. 601289139182"
                  />
                </div>
              )}
            </div>

            {/* Salary components */}
            {txType === 'salary' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-border pt-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Net Take Home (Hits Bank)</label>
                  <input
                    type="number"
                    value={netTakeHome}
                    onChange={(e) => setNetTakeHome(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder={amount || '0.00'}
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Employee PF Deduction</label>
                  <input
                    type="number"
                    value={employeePf}
                    onChange={(e) => setEmployeePf(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="0.00"
                  />
                </div>
              </div>
            )}

            {/* Note text */}
            <div>
              <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Notes</label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:border-cyan"
                placeholder="Description of the transaction..."
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingAction}
                className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 px-5 rounded-lg text-sm transition-all flex items-center gap-1.5"
              >
                {loadingAction ? 'Saving...' : 'Add Transaction'}
              </button>
            </div>

          </form>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search notes or categories..."
            className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-4 text-xs text-text focus:outline-none focus:border-cyan transition-colors"
          />
        </div>

        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-text-muted">
            <Filter className="w-4 h-4" />
          </span>
          <select
            value={selectedTypeFilter}
            onChange={(e) => setSelectedTypeFilter(e.target.value)}
            className="w-full bg-card border border-border rounded-lg py-2 pl-9 pr-4 text-xs text-text focus:outline-none focus:border-cyan transition-colors capitalize"
          >
            <option value="">All Flow Types</option>
            {TRANSACTION_TYPES.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end text-text-muted text-xs gap-1.5">
          {isValidating && <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan" />}
          <span>Displaying {filteredTransactions.length} records</span>
        </div>
      </div>

      {/* Virtualized Table container */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        {/* Table Headings */}
        <div className="grid grid-cols-12 px-5 py-3 border-b border-border bg-[#0a0f1c] text-[10px] font-bold text-text-dim uppercase tracking-wider text-left">
          <div className="col-span-2">Date</div>
          <div className="col-span-3">Transfer Route</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-3">Note / Details</div>
          <div className="col-span-2 text-right">Amount</div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No transactions found.
          </div>
        ) : (
          <div
            ref={parentRef}
            className="overflow-auto max-h-[500px]"
            style={{ position: 'relative' }}
          >
            <div
              style={{
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const tx = filteredTransactions[virtualRow.index];
                if (!tx) return null;
                const isIncome = tx.type === 'income' || tx.type === 'salary';

                return (
                  <div
                    key={virtualRow.index}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                    }}
                    className="grid grid-cols-12 px-5 py-3 border-b border-border/60 hover:bg-white/[0.015] items-center text-xs text-text transition-colors group"
                  >
                    {/* Date */}
                    <div className="col-span-2 flex flex-col">
                      <span className="font-semibold text-white">{formatIndianDate(tx.date)}</span>
                      <span className="text-[10px] text-text-dim uppercase font-mono mt-0.5">{tx.paymentMethod}</span>
                    </div>

                    {/* Route */}
                    <div className="col-span-3 flex items-center gap-1.5 max-w-[90%] truncate">
                      {tx.fromAccountId && (
                        <span className="font-medium text-text-muted shrink truncate">
                          {getAccountName(tx.fromAccountId)}
                        </span>
                      )}
                      {tx.fromAccountId && tx.toAccountId && (
                        <ArrowRight className="w-3.5 h-3.5 text-text-dim shrink-0" />
                      )}
                      {tx.toAccountId && (
                        <span className="font-semibold text-white shrink truncate">
                          {getAccountName(tx.toAccountId)}
                        </span>
                      )}
                      {!tx.fromAccountId && !tx.toAccountId && (
                        <span className="text-text-dim">-</span>
                      )}
                    </div>

                    {/* Category */}
                    <div className="col-span-2">
                      <span className={`inline-block px-2.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                        tx.type === 'salary'
                          ? 'bg-purple/10 text-purple border border-purple/20'
                          : tx.type === 'savings'
                          ? 'bg-cyan/10 text-cyan border border-cyan/20'
                          : tx.type === 'transfer'
                          ? 'bg-white/5 text-text-muted border border-border/80'
                          : isIncome
                          ? 'bg-green/10 text-green border border-green/20'
                          : 'bg-red/10 text-red border border-red/20'
                      }`}>
                        {tx.category || tx.type}
                      </span>
                    </div>

                    {/* Note */}
                    <div className="col-span-3 pr-2 flex items-center justify-between">
                      <span className="truncate text-text-muted max-w-[85%]">{tx.note || '-'}</span>
                      {tx.upiRefId && (
                        <span className="text-[9px] font-mono bg-white/5 border border-border px-1.5 py-0.5 rounded text-text-dim hidden md:inline-block">
                          UPI: {tx.upiRefId}
                        </span>
                      )}
                    </div>

                    {/* Amount & Actions */}
                    <div className="col-span-2 flex items-center justify-end gap-3 text-right">
                      <span className={`font-mono text-sm font-bold ${isIncome ? 'text-green' : 'text-red'}`}>
                        {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                      </span>
                      
                      {/* Delete Action button (reveals on row hover) */}
                      <button
                        onClick={() => handleDelete(tx.id)}
                        className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red p-1 rounded hover:bg-red/5 transition-all"
                        title="Delete Transaction"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Load More Button */}
      {pagesData && pagesData[pagesData.length - 1]?.nextCursor && (
        <div className="flex justify-center mt-6">
          <button
            onClick={() => setSize(size + 1)}
            disabled={isValidating}
            className="border border-border hover:bg-card text-text-muted hover:text-text font-bold py-2.5 px-6 rounded-lg text-xs transition-all active:scale-[0.98]"
          >
            {isValidating ? 'Loading...' : 'Load Older Transactions'}
          </button>
        </div>
      )}
    </AppLayout>
  );
}
