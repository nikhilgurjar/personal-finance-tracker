'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { fetcher } from '@/lib/swr';
import { formatCurrency } from '@/lib/utils/currency';
import {
  Plus,
  Trash2,
  Edit2,
  Wallet,
  Landmark,
  ShieldCheck,
  CreditCard,
  History,
  X,
  BadgeAlert,
} from 'lucide-react';

const ACCOUNT_TYPES = ['savings', 'expense', 'income'];
const ACCOUNT_SUBTYPES: Record<string, string[]> = {
  savings: ['bank', 'savings_account', 'checking_account', 'wallet', 'commodity'],
  expense: ['credit_card', 'loan', 'mortgage', 'utility', 'subscription'],
  income: ['salary', 'freelance', 'business', 'other'],
};

export default function AccountsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [accType, setAccType] = useState<'savings' | 'expense' | 'income'>('savings');
  const [accSubtype, setAccSubtype] = useState('bank');
  const [institution, setInstitution] = useState('');
  const [balance, setBalance] = useState('');
  const [creditLimit, setCreditLimit] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');

  // Fetch accounts list using SWR
  const { data: accounts = [], mutate: mutateAccounts, error, isValidating } = useSWR(
    '/api/accounts?includeGoals=true',
    fetcher
  );

  const filteredAccounts = useMemo(() => {
    return accounts.filter((acc: any) => {
      const matchesSearch =
        !searchQuery ||
        acc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        acc.institution?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = !selectedTypeFilter || acc.type === selectedTypeFilter;
      return matchesSearch && matchesType;
    });
  }, [accounts, searchQuery, selectedTypeFilter]);

  const handleOpenCreate = () => {
    setEditingAccount(null);
    setName('');
    setAccType('savings');
    setAccSubtype('bank');
    setInstitution('');
    setBalance('');
    setCreditLimit('');
    setDueDate('');
    setInterestRate('');
    setFormOpen(true);
  };

  const handleOpenEdit = (acc: any) => {
    setEditingAccount(acc);
    setName(acc.name || '');
    setAccType(acc.type || 'savings');
    setAccSubtype(acc.subtype || 'bank');
    setInstitution(acc.institution || '');
    setBalance(String(acc.balance || acc.currentBalance || 0));
    setCreditLimit(String(acc.creditLimit || ''));
    setDueDate(String(acc.dueDate || ''));
    setInterestRate(String(acc.interestRate || ''));
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert('Name is required');

    setLoadingAction(true);
    try {
      const payload: any = {
        name: name.trim(),
        type: accType,
        subtype: accSubtype,
        institution: institution.trim() || undefined,
        balance: Number(balance || 0),
        currency: 'INR',
      };

      if (accSubtype === 'credit_card' || accSubtype === 'loan') {
        if (creditLimit) payload.creditLimit = Number(creditLimit);
        if (dueDate) payload.dueDate = Number(dueDate);
        if (interestRate) payload.interestRate = Number(interestRate);
      }

      const method = editingAccount ? 'PUT' : 'POST';
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts';

      // Optimistic Update
      const tempId = editingAccount ? editingAccount.id : crypto.randomUUID();
      const tempAccount = {
        ...payload,
        id: tempId,
        currentBalance: payload.balance,
      };

      await mutateAccounts(
        (current: any) => {
          if (!current) return current;
          if (editingAccount) {
            return current.map((a: any) => (a.id === tempId ? tempAccount : a));
          }
          return [...current, tempAccount];
        },
        { revalidate: false }
      );

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save account');

      mutateAccounts();
      setFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving account');
      mutateAccounts();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this account? Any associated transactions will not be deleted.')) return;

    try {
      const res = await fetch(`/api/accounts/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');
      mutateAccounts();
    } catch (err: any) {
      alert(err.message || 'Error deleting account');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="Accounts & Cards" />
        <button
          onClick={handleOpenCreate}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> Add Account
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red/10 border border-red/20 text-red text-xs px-4 py-3 rounded-lg flex items-center">
          <span>Failed to load accounts. Please refresh the page.</span>
        </div>
      )}

      {/* Account form Drawer Overlay */}
      {formOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setFormOpen(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-50 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-syne text-md font-bold text-white">
                  {editingAccount ? 'Edit Account' : 'New Account'}
                </h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-text-muted hover:text-text"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Account Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="e.g. HDFC Salary Account"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Type</label>
                    <select
                      value={accType}
                      onChange={(e) => {
                        const nextType = e.target.value as any;
                        setAccType(nextType);
                        setAccSubtype(ACCOUNT_SUBTYPES[nextType][0]);
                      }}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan capitalize"
                    >
                      {ACCOUNT_TYPES.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Subtype</label>
                    <select
                      value={accSubtype}
                      onChange={(e) => setAccSubtype(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan capitalize"
                    >
                      {ACCOUNT_SUBTYPES[accType].map((sub) => (
                        <option key={sub} value={sub}>{sub.replace('_', ' ')}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Institution / Bank Name</label>
                  <input
                    type="text"
                    value={institution}
                    onChange={(e) => setInstitution(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="e.g. HDFC Bank"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">
                    {accType === 'expense' ? 'Current Outstanding Balance (INR)' : 'Current Balance (INR)'}
                  </label>
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="0.00"
                  />
                </div>

                {accSubtype === 'credit_card' && (
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Credit Limit (INR)</label>
                    <input
                      type="number"
                      value={creditLimit}
                      onChange={(e) => setCreditLimit(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="e.g. 100000"
                    />
                  </div>
                )}

                {(accSubtype === 'credit_card' || accSubtype === 'loan') && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Billing Due Day</label>
                      <input
                        type="number"
                        min="1"
                        max="31"
                        value={dueDate}
                        onChange={(e) => setDueDate(e.target.value)}
                        className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                        placeholder="e.g. 15"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Interest Rate (% p.a.)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={interestRate}
                        onChange={(e) => setInterestRate(e.target.value)}
                        className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                        placeholder="e.g. 12.5"
                      />
                    </div>
                  </div>
                )}
              </form>
            </div>

            <div className="flex gap-2 pt-6 border-t border-border mt-6">
              <button
                type="button"
                onClick={() => setFormOpen(false)}
                className="flex-1 border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={loadingAction}
                className="flex-1 bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 px-5 rounded-lg text-sm transition-all"
              >
                {loadingAction ? 'Saving...' : 'Save Account'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by account name or bank..."
          className="bg-card border border-border rounded-lg py-2 px-4 text-xs text-text focus:outline-none focus:border-cyan transition-colors"
        />

        <select
          value={selectedTypeFilter}
          onChange={(e) => setSelectedTypeFilter(e.target.value)}
          className="bg-card border border-border rounded-lg py-2 px-4 text-xs text-text focus:outline-none focus:border-cyan transition-colors capitalize"
        >
          <option value="">All Account Types</option>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      {/* Accounts List Deck */}
      {filteredAccounts.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm border border-dashed border-border rounded-xl bg-card">
          No accounts found. Create one to start tracking.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Accounts and Credit Cards list">
          {filteredAccounts.map((acc: any) => {
            const isSavings = acc.type === 'savings';
            const isExpense = acc.type === 'expense';
            const isCreditCard = acc.subtype === 'credit_card';
            const bal = acc.balance ?? acc.currentBalance ?? 0;

            return (
              <div
                key={acc.id}
                className={`bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-all flex flex-col justify-between relative group ${
                  isExpense ? 'border-t-2 border-t-red' : isSavings ? 'border-t-2 border-t-cyan' : 'border-t-2 border-t-green'
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 rounded-lg bg-[#0a0f1c] ${
                        isExpense ? 'text-red' : isSavings ? 'text-cyan' : 'text-green'
                      }`}>
                        {isCreditCard ? <CreditCard className="w-4.5 h-4.5" /> : <Landmark className="w-4.5 h-4.5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-white text-sm">{acc.name}</h4>
                        <span className="text-[10px] text-text-muted leading-none font-mono capitalize">
                          {acc.subtype || acc.type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(acc)}
                        className="text-text-dim hover:text-cyan p-1.5 rounded hover:bg-cyan/5 transition-all"
                        title="Edit Account"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(acc.id)}
                        className="text-text-dim hover:text-red p-1.5 rounded hover:bg-red/5 transition-all"
                        title="Delete Account"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {acc.institution && (
                    <div className="text-xs text-text-muted flex items-center gap-1 mb-4">
                      <Landmark className="w-3 h-3" />
                      <span>{acc.institution}</span>
                    </div>
                  )}

                  {/* Balance details */}
                  <div className="p-3 bg-[#0a0f1c] border border-border rounded-lg mb-3">
                    <div className="text-[9px] font-bold text-text-dim uppercase tracking-wider mb-0.5">
                      {isExpense ? 'Owed / Outstanding' : 'Available Balance'}
                    </div>
                    <div className={`font-syne text-lg font-bold ${
                      isExpense ? 'text-red' : isSavings ? 'text-cyan' : 'text-green'
                    }`}>
                      {formatCurrency(bal)}
                    </div>
                  </div>
                </div>

                <div>
                  {/* Credit Card features */}
                  {isCreditCard && acc.creditLimit && (
                    <div className="space-y-2 mb-3">
                      <div className="w-full bg-[#0a0f1c] rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-red h-full rounded-full transition-all"
                          style={{ width: `${Math.min((bal / acc.creditLimit) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-text-muted">
                        <span>Limit: {formatCurrency(acc.creditLimit)}</span>
                        <span>Utilized: {Math.round((bal / acc.creditLimit) * 100)}%</span>
                      </div>
                    </div>
                  )}

                  {acc.dueDate && (
                    <div className="text-[10px] text-text-dim flex items-center gap-1.5 bg-[#0a0f1c] px-2.5 py-1.5 border border-border rounded-md mt-2">
                      <BadgeAlert className="w-3.5 h-3.5 text-amber" />
                      <span>Payment Due Day: <strong className="text-text">{acc.dueDate}</strong></span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
}
