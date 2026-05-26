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
  Users,
  Coins,
  History,
  X,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  PlusCircle,
} from 'lucide-react';

const TYPE_CONFIG = {
  lent: { label: 'Lent', textColor: 'text-green', bgColor: 'bg-green/10 border-green/20' },
  borrowed: { label: 'Borrowed', textColor: 'text-red', bgColor: 'bg-red/10 border-red/20' },
  payable: { label: 'Payable', textColor: 'text-amber', bgColor: 'bg-amber/10 border-amber/20' },
};

export default function PeoplePage() {
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [repaymentOpen, setRepaymentOpen] = useState(false);
  const [repaymentContext, setRepaymentContext] = useState<any | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Repayment form states
  const [repAmount, setRepAmount] = useState('');
  const [repDate, setRepDate] = useState(new Date().toISOString().split('T')[0]);
  const [repAccountId, setRepAccountId] = useState('');
  const [repNote, setRepNote] = useState('');

  // SWR queries
  const { data: people = [], mutate: mutatePeople } = useSWR('/api/people', fetcher);
  const { data: accounts = [] } = useSWR('/api/accounts', fetcher);

  const handleCreatePerson = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPersonName.trim()) return;

    setLoadingAction(true);
    try {
      const res = await fetch('/api/people', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newPersonName.trim() }),
      });

      if (!res.ok) throw new Error('Failed to create person');
      mutatePeople();
      setCreateOpen(false);
      setNewPersonName('');
    } catch (err: any) {
      alert(err.message || 'Error creating person');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleRecordRepayment = (person: any, loanType: 'lent' | 'borrowed' | 'payable') => {
    setRepaymentContext({
      personName: person.name,
      loanType,
      outstandingAmount:
        loanType === 'lent'
          ? person.totalLent
          : loanType === 'borrowed'
          ? person.totalBorrowed
          : person.totalPayable,
    });
    setRepAmount('');
    setRepAccountId('');
    setRepNote('');
    setRepDate(new Date().toISOString().split('T')[0]);
    setRepaymentOpen(true);
  };

  const handleRepaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repAmount || Number(repAmount) <= 0 || !repAccountId) {
      return alert('Enter valid amount and select account');
    }

    if (Number(repAmount) > repaymentContext.outstandingAmount) {
      return alert('Repayment amount cannot exceed outstanding balance.');
    }

    setLoadingAction(true);
    try {
      const payload = {
        repayment: {
          personName: repaymentContext.personName,
          loanType: repaymentContext.loanType,
          amount: Number(repAmount),
          currency: 'INR',
          date: new Date(repDate).getTime(),
          accountId: repAccountId,
          note: repNote.trim() || undefined,
        },
      };

      const res = await fetch('/api/people/repayments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to record repayment');
      
      mutatePeople();
      setRepaymentOpen(false);
      setSelectedPerson(null);
    } catch (err: any) {
      alert(err.message || 'Error saving repayment');
    } finally {
      setLoadingAction(false);
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="People & Ledger" />
        <button
          onClick={() => setCreateOpen(true)}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <UserPlus className="w-4.5 h-4.5" /> Add Person
        </button>
      </div>

      {/* People Grid */}
      {people.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm border border-dashed border-border rounded-xl bg-card">
          No people ledger interactions found. Add a person to get started.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" aria-label="People lists">
          {people.map((person: any) => {
            const initials = person.name.substring(0, 2).toUpperCase();
            const hasLent = person.totalLent > 0;
            const hasBorrowed = person.totalBorrowed > 0;
            const hasPayable = person.totalPayable > 0;

            return (
              <div
                key={person.id}
                onClick={() => setSelectedPerson(person)}
                className="bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-all cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs font-mono border ${
                      person.netBalance >= 0 ? 'bg-green/10 border-green/20 text-green' : 'bg-red/10 border-red/20 text-red'
                    }`}>
                      {initials}
                    </div>
                    <div>
                      <h4 className="font-semibold text-white text-sm">{person.name}</h4>
                      <span className="text-[10px] text-text-muted">
                        {person.loans.length} interactions
                      </span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center py-2.5 px-3 bg-[#0a0f1c] border border-border rounded-lg mb-3">
                    <span className="text-[10px] text-text-dim uppercase font-bold tracking-wider">Net Balance</span>
                    <span className={`font-syne text-sm font-bold ${
                      person.netBalance >= 0 ? 'text-green' : 'text-red'
                    }`}>
                      {person.netBalance >= 0 ? '+' : ''}{formatCurrency(person.netBalance)}
                    </span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {hasLent && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-green/10 border border-green/20 text-green">
                      Lent: {formatCurrency(person.totalLent)}
                    </span>
                  )}
                  {hasBorrowed && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-red/10 border border-red/20 text-red">
                      Borrowed: {formatCurrency(person.totalBorrowed)}
                    </span>
                  )}
                  {hasPayable && (
                    <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber/10 border border-amber/20 text-amber">
                      Payable: {formatCurrency(person.totalPayable)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Person Detail Slider / Overlay */}
      {selectedPerson && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={() => setSelectedPerson(null)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-full max-w-lg bg-surface border-l border-border z-50 p-6 overflow-y-auto shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-250">
            <div>
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-xs font-mono border ${
                    selectedPerson.netBalance >= 0 ? 'bg-green/10 border-green/20 text-green' : 'bg-red/10 border-red/20 text-red'
                  }`}>
                    {selectedPerson.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="font-syne text-md font-bold text-white leading-none mb-1">{selectedPerson.name}</h3>
                    <span className={`text-[11px] font-bold ${
                      selectedPerson.netBalance >= 0 ? 'text-green' : 'text-red'
                    }`}>
                      Net Balance: {selectedPerson.netBalance >= 0 ? '+' : ''}{formatCurrency(selectedPerson.netBalance)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedPerson(null)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Repayments actions panel */}
              <div className="flex gap-2 flex-wrap mb-6 border-b border-border/60 pb-5">
                {selectedPerson.totalLent > 0 && (
                  <button
                    onClick={() => handleRecordRepayment(selectedPerson, 'lent')}
                    className="text-xs bg-green/10 hover:bg-green/15 text-green border border-green/25 font-bold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Receive Lent Repayment
                  </button>
                )}
                {selectedPerson.totalBorrowed > 0 && (
                  <button
                    onClick={() => handleRecordRepayment(selectedPerson, 'borrowed')}
                    className="text-xs bg-red/10 hover:bg-red/15 text-red border border-red/25 font-bold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Pay Borrowed Amount
                  </button>
                )}
                {selectedPerson.totalPayable > 0 && (
                  <button
                    onClick={() => handleRecordRepayment(selectedPerson, 'payable')}
                    className="text-xs bg-amber/10 hover:bg-amber/15 text-amber border border-amber/25 font-bold py-1.5 px-3 rounded-lg transition-colors"
                  >
                    Pay Payable Amount
                  </button>
                )}
              </div>

              {/* Loans List */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-2">Interactions History</h4>
                {selectedPerson.loans.map((loan: any) => {
                  const cfg = TYPE_CONFIG[loan.loanType as keyof typeof TYPE_CONFIG] || TYPE_CONFIG.lent;
                  return (
                    <div key={loan.id} className="p-4 bg-[#0a0f1c] border border-border rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${cfg.bgColor} ${cfg.textColor}`}>
                          {cfg.label}
                        </span>
                        <span className="text-[10px] text-text-muted font-mono">{formatIndianDate(loan.startDate)}</span>
                      </div>

                      <div className="flex justify-between items-baseline mb-2">
                        <span className="text-sm font-bold text-white">{formatCurrency(loan.principalAmount)}</span>
                        <span className="text-[11px] text-text-muted">
                          Outstanding: <strong className="text-white">{formatCurrency(loan.outstandingAmount)}</strong>
                        </span>
                      </div>

                      {loan.note && (
                        <p className="text-[11px] text-text-muted italic mb-3">"{loan.note}"</p>
                      )}

                      {/* Repayments log */}
                      {loan.repayments?.length > 0 && (
                        <div className="mt-3 pl-3 border-l-2 border-border/80 space-y-1.5">
                          <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider block mb-1">Repayments logs</span>
                          {loan.repayments.map((rep: any) => (
                            <div key={rep.id} className="flex justify-between text-[11px] text-text-muted">
                              <span>
                                {formatCurrency(rep.amount)}
                                {rep.note && <span className="text-text-dim"> — {rep.note}</span>}
                              </span>
                              <span>{formatIndianDate(rep.date)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t border-border">
              <button
                onClick={() => setSelectedPerson(null)}
                className="w-full border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Close Details
              </button>
            </div>
          </div>
        </>
      )}

      {/* Record Repayment Dialog */}
      {repaymentOpen && repaymentContext && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={() => setRepaymentOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface border border-border p-6 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
            <h3 className="font-syne text-md font-bold text-white mb-2">Record Person Repayment</h3>
            <p className="text-xs text-text-muted mb-4 leading-normal">
              Recording repayment against <strong className="text-text">{repaymentContext.personName}</strong>. 
              This will automatically satisfy their oldest outstanding <strong className="text-text">{repaymentContext.loanType}</strong> dues first.
            </p>

            <form onSubmit={handleRepaymentSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Repayment Amount</label>
                <input
                  type="number"
                  required
                  step="any"
                  value={repAmount}
                  onChange={(e) => setRepAmount(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="0.00"
                />
                <span className="text-[10px] text-text-muted mt-1 block">
                  Max outstanding: {formatCurrency(repaymentContext.outstandingAmount)}
                </span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Date</label>
                <input
                  type="date"
                  required
                  value={repDate}
                  onChange={(e) => setRepDate(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">
                  {repaymentContext.loanType === 'lent' ? 'Received Into Account' : 'Paid From Account'}
                </label>
                <select
                  required
                  value={repAccountId}
                  onChange={(e) => setRepAccountId(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                >
                  <option value="">Select Account</option>
                  {accounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.name} ({formatCurrency(acc.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Notes</label>
                <input
                  type="text"
                  value={repNote}
                  onChange={(e) => setRepNote(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="repayment note details..."
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setRepaymentOpen(false)}
                  className="border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction}
                  className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 px-5 rounded-lg text-sm transition-all"
                >
                  {loadingAction ? 'Recording...' : 'Record Repayment'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* Add Person Dialog */}
      {createOpen && (
        <>
          <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50" onClick={() => setCreateOpen(false)} />
          <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-surface border border-border p-6 rounded-xl shadow-2xl z-50 animate-in fade-in zoom-in duration-200">
            <h3 className="font-syne text-md font-bold text-white mb-4">Add New Person</h3>
            <form onSubmit={handleCreatePerson} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Person Name</label>
                <input
                  type="text"
                  autoFocus
                  required
                  value={newPersonName}
                  onChange={(e) => setNewPersonName(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="e.g. Rahul Sharma"
                />
              </div>

              <div className="flex gap-2 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loadingAction || !newPersonName.trim()}
                  className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 px-5 rounded-lg text-sm transition-all"
                >
                  {loadingAction ? 'Saving...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </AppLayout>
  );
}
