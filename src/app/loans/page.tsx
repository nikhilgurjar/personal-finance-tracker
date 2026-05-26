'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { fetcher } from '@/lib/swr';
import { formatCurrency } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import {
  Plus,
  Trash2,
  Edit2,
  Handshake,
  TrendingDown,
  Receipt,
  X,
  Calendar,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';

const LOAN_TAB_TYPES = ['all', 'lent', 'borrowed', 'payable'];

const LOAN_CONFIG = {
  lent: { label: 'I Lent', textColor: 'text-green', bgColor: 'bg-green/10 border-green/20', icon: TrendingDown },
  borrowed: { label: 'I Borrowed', textColor: 'text-red', bgColor: 'bg-red/10 border-red/20', icon: Handshake },
  payable: { label: 'I Owe', textColor: 'text-amber', bgColor: 'bg-amber/10 border-amber/20', icon: Receipt },
};

export default function LoansPage() {
  const [tab, setTab] = useState<'all' | 'lent' | 'borrowed' | 'payable'>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<any>(null);
  const [loadingAction, setLoadingAction] = useState(false);

  // Form states
  const [loanType, setLoanType] = useState<'lent' | 'borrowed' | 'payable'>('lent');
  const [personName, setPersonName] = useState('');
  const [principal, setPrincipal] = useState('');
  const [outstanding, setOutstanding] = useState('');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState('');
  const [interestRate, setInterestRate] = useState('');
  const [note, setNote] = useState('');

  // SWR queries
  const { data: loans = [], mutate: mutateLoans, error } = useSWR('/api/loans', fetcher);

  const filteredLoans = useMemo(() => {
    return loans.filter((l: any) => {
      if (tab !== 'all' && l.loanType !== tab) return false;
      return true;
    });
  }, [loans, tab]);

  const totals = useMemo(() => {
    let lentTotal = 0;
    let borrowedTotal = 0;
    let payableTotal = 0;

    loans.forEach((l: any) => {
      if (l.status === 'active') {
        if (l.loanType === 'lent') lentTotal += l.outstandingAmount || 0;
        else if (l.loanType === 'borrowed') borrowedTotal += l.outstandingAmount || 0;
        else if (l.loanType === 'payable') payableTotal += l.outstandingAmount || 0;
      }
    });

    return { lent: lentTotal, borrowed: borrowedTotal, payable: payableTotal };
  }, [loans]);

  const handleOpenCreate = () => {
    setEditingLoan(null);
    setLoanType('lent');
    setPersonName('');
    setPrincipal('');
    setOutstanding('');
    setStartDate(new Date().toISOString().split('T')[0]);
    setDueDate('');
    setInterestRate('');
    setNote('');
    setFormOpen(true);
  };

  const handleOpenEdit = (loan: any) => {
    setEditingLoan(loan);
    setLoanType(loan.loanType || 'lent');
    setPersonName(loan.personName || '');
    setPrincipal(String(loan.principalAmount || ''));
    setOutstanding(String(loan.outstandingAmount || ''));
    setStartDate(loan.startDate ? new Date(loan.startDate).toISOString().split('T')[0] : '');
    setDueDate(loan.dueDate ? new Date(loan.dueDate).toISOString().split('T')[0] : '');
    setInterestRate(String(loan.interestRate || ''));
    setNote(loan.note || '');
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim() || !principal || Number(principal) <= 0) {
      return alert('Enter valid person name and principal amount');
    }

    setLoadingAction(true);
    try {
      const payload: any = {
        loanType,
        personName: personName.trim(),
        principalAmount: Number(principal),
        outstandingAmount: Number(outstanding || principal),
        startDate: new Date(startDate).getTime(),
        dueDate: dueDate ? new Date(dueDate).getTime() : undefined,
        interestRate: interestRate ? Number(interestRate) : undefined,
        note: note.trim() || undefined,
        currency: 'INR',
        status: 'active',
      };

      const method = editingLoan ? 'PUT' : 'POST';
      const url = editingLoan ? `/api/loans/${editingLoan.id}` : '/api/loans';

      if (editingLoan) {
        payload.id = editingLoan.id;
      }

      // Optimistic update
      const tempLoan = {
        ...payload,
        id: editingLoan ? editingLoan.id : crypto.randomUUID(),
      };

      await mutateLoans(
        (current: any) => {
          if (!current) return current;
          if (editingLoan) {
            return current.map((l: any) => (l.id === editingLoan.id ? tempLoan : l));
          }
          return [tempLoan, ...current];
        },
        { revalidate: false }
      );

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save loan');

      mutateLoans();
      setFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving loan');
      mutateLoans();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this loan?')) return;

    try {
      const res = await fetch(`/api/loans/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');
      mutateLoans();
    } catch (err: any) {
      alert(err.message || 'Error deleting loan');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="Loans & Dues" />
        <button
          onClick={handleOpenCreate}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> Add Loan
        </button>
      </div>

      {/* Summary statistics grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8" aria-label="Outstanding sums">
        <div className="bg-[#0f1d19] border border-green/15 rounded-xl p-5">
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">I Lent (Dues to Collect)</span>
          <div className="font-syne text-xl font-bold text-green mt-1">
            {formatCurrency(totals.lent)}
          </div>
        </div>

        <div className="bg-[#1f1216] border border-red/15 rounded-xl p-5">
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">I Borrowed (Dues to Pay)</span>
          <div className="font-syne text-xl font-bold text-red mt-1">
            {formatCurrency(totals.borrowed)}
          </div>
        </div>

        <div className="bg-[#1e1711] border border-amber/15 rounded-xl p-5">
          <span className="text-[10px] font-bold text-text-dim uppercase tracking-wider">I Owe (Accounts Payable)</span>
          <div className="font-syne text-xl font-bold text-amber mt-1">
            {formatCurrency(totals.payable)}
          </div>
        </div>
      </div>

      {/* Add / Edit Form Modal */}
      {formOpen && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40" onClick={() => setFormOpen(false)} />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-surface border-l border-border z-50 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex justify-between items-center mb-6">
                <h3 className="font-syne text-md font-bold text-white">
                  {editingLoan ? 'Edit Loan Record' : 'Record New Loan / Due'}
                </h3>
                <button onClick={() => setFormOpen(false)} className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-text-muted">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Loan / Due Type</label>
                  <select
                    value={loanType}
                    onChange={(e) => setLoanType(e.target.value as any)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="lent">Lent (I gave money to someone)</option>
                    <option value="borrowed">Borrowed (Someone gave money to me)</option>
                    <option value="payable">Payable (Accounts/Subscriptions payable)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Counterparty (Person Name)</label>
                  <input
                    type="text"
                    required
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="e.g. Rahul Sharma"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Principal Amount (INR)</label>
                    <input
                      type="number"
                      required
                      value={principal}
                      onChange={(e) => setPrincipal(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Outstanding Amount</label>
                    <input
                      type="number"
                      value={outstanding}
                      onChange={(e) => setOutstanding(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="Default is same as principal"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Due Date (Optional)</label>
                    <input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Interest Rate (% p.a. Optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Notes</label>
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="Additional context..."
                  />
                </div>
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
                {loadingAction ? 'Saving...' : 'Save Loan'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tabs */}
      <div className="flex border-b border-border mb-6">
        {LOAN_TAB_TYPES.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t as any)}
            className={`pb-2.5 px-4 text-xs font-semibold uppercase tracking-wider transition-colors border-b-2 ${
              tab === t ? 'border-cyan text-cyan' : 'border-transparent text-text-muted hover:text-text'
            }`}
          >
            {t === 'all' ? 'All Loans' : t === 'lent' ? '💰 Lent' : t === 'borrowed' ? '🤝 Borrowed' : '💸 Owed'}
          </button>
        ))}
      </div>

      {/* List Grid */}
      {filteredLoans.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm border border-dashed border-border rounded-xl bg-card">
          No active loans found. Record one above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="Active loan records">
          {filteredLoans.map((loan: any) => {
            const cfg = LOAN_CONFIG[loan.loanType as 'lent' | 'borrowed' | 'payable'] || LOAN_CONFIG.lent;
            const Icon = cfg.icon;
            const repaidPct = loan.principalAmount ? ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100 : 0;
            const isSettled = loan.status === 'settled';

            return (
              <div
                key={loan.id}
                className={`bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-all flex flex-col justify-between relative group ${
                  isSettled ? 'opacity-65' : ''
                }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${cfg.bgColor} ${cfg.textColor}`}>
                      {cfg.label}
                    </span>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(loan)}
                        className="text-text-dim hover:text-cyan p-1 rounded hover:bg-cyan/5 transition-all"
                        title="Edit Loan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(loan.id)}
                        className="text-text-dim hover:text-red p-1 rounded hover:bg-red/5 transition-all"
                        title="Delete Loan"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <h4 className="font-semibold text-white text-sm mb-1">{loan.personName}</h4>

                  <div className="font-syne text-xl font-bold text-white mt-1 mb-3">
                    {formatCurrency(loan.outstandingAmount || 0)}
                    <span className="text-[10px] text-text-muted font-normal ml-1 font-mono">
                      / {formatCurrency(loan.principalAmount || 0)}
                    </span>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-[#0a0f1c] rounded-full h-1.5 overflow-hidden border border-border my-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 bg-cyan`}
                      style={{ width: `${Math.min(repaidPct, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center text-[10px] text-text-muted font-mono mt-2">
                    <span>Started: {formatIndianDate(loan.startDate)}</span>
                    {loan.dueDate && (
                      <span className={new Date(loan.dueDate) < new Date() && !isSettled ? 'text-red font-bold' : ''}>
                        Due: {formatIndianDate(loan.dueDate)}
                      </span>
                    )}
                  </div>

                  {loan.note && (
                    <p className="text-[10px] text-text-dim italic mt-2.5 truncate">"{loan.note}"</p>
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
