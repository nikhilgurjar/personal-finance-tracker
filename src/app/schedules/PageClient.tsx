'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { FrequencySelector } from '@/components/FrequencySelector';
import { CalendarDatePicker } from '@/components/CalendarDatePicker';
import { fetcher } from '@/lib/swr';
import { authenticatedFetch } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import { scheduleLabel } from '@/lib/utils/schedule';
import {
  Plus,
  Trash2,
  Calendar,
  X,
  Play,
  Pause,
  AlertCircle,
  TrendingDown,
  TrendingUp,
  RefreshCw,
  Clock,
  ArrowRight,
} from 'lucide-react';

const TRANSACTION_TYPES = ['expense', 'income', 'transfer', 'savings'];

export default function SchedulesPage() {
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Form states
  const [scheduleName, setScheduleName] = useState('');
  const [frequency, setFrequency] = useState('FREQ=MONTHLY;BYMONTHDAY=5');
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer' | 'savings'>('expense');
  const [amount, setAmount] = useState('');
  const [nextRun, setNextRun] = useState(new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');

  // SWR queries
  const { data: schedules = [], mutate: mutateSchedules, error } = useSWR('/api/schedules', fetcher);
  const { data: accounts = [] } = useSWR('/api/accounts', fetcher);
  const { data: suggestions = [], mutate: mutateSuggestions } = useSWR('/api/schedule-suggestions', fetcher);

  const filteredSchedules = useMemo(() => {
    return schedules.filter((s: any) => {
      const nameMatch = !searchTerm || s.name.toLowerCase().includes(searchTerm.toLowerCase());
      return nameMatch;
    });
  }, [schedules, searchTerm]);

  const getAccountName = (id?: string) => {
    if (!id) return '';
    const acc = accounts.find((a: any) => a.id === id);
    return acc ? acc.name : 'Unknown';
  };

  const handleToggleStatus = async (s: any) => {
    try {
      const nextStatus = s.status === 'active' ? 'paused' : 'active';
      const res = await authenticatedFetch(`/api/schedules/${s.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      if (!res.ok) throw new Error('Failed to toggle status');
      mutateSchedules();
    } catch (err: any) {
      alert(err.message || 'Error updating schedule status');
    }
  };

  const handleApproveSuggestion = async (suggestion: any) => {
    try {
      setLoadingAction(true);
      const res = await authenticatedFetch('/api/schedule-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: suggestion.scheduleId, action: 'approve' }),
      });
      if (!res.ok) throw new Error('Failed to approve suggestion');
      
      mutateSuggestions();
      mutateSchedules();
    } catch (err: any) {
      alert(err.message || 'Error executing schedule');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSkipSuggestion = async (suggestion: any) => {
    try {
      setLoadingAction(true);
      const res = await authenticatedFetch('/api/schedule-suggestions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduleId: suggestion.scheduleId, action: 'skip' }),
      });
      if (!res.ok) throw new Error('Failed to skip suggestion');
      mutateSuggestions();
    } catch (err: any) {
      alert(err.message || 'Error skipping schedule');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scheduleName.trim() || !amount || Number(amount) <= 0) {
      return alert('Enter valid name and amount');
    }

    setLoadingAction(true);
    try {
      const payload: any = {
        name: scheduleName.trim(),
        rrule: frequency,
        template: {
          amount: Number(amount),
          type: txType,
          fromAccountId: txType === 'income' ? 'income' : fromAccountId,
          toAccountId: txType === 'expense' ? 'expense' : toAccountId,
          currency: 'INR',
          note: note.trim() || undefined,
          category: category || undefined,
        },
        nextRunAt: new Date(nextRun).getTime(),
        status: 'active',
        priority: 1,
      };

      const res = await authenticatedFetch('/api/schedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create schedule');

      mutateSchedules();
      setShowForm(false);
      setScheduleName('');
      setAmount('');
      setNote('');
      setCategory('');
    } catch (err: any) {
      alert(err.message || 'Error saving schedule');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;
    try {
      const res = await authenticatedFetch(`/api/schedules/${id}`, { 
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Deletion failed');
      mutateSchedules();
    } catch (err: any) {
      alert(err.message || 'Error deleting schedule');
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="Recurring Payments & Bills" />
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> New Schedule
        </button>
      </div>

      {/* Suggested due bills panel */}
      <section className="bg-card border border-border rounded-xl p-5 mb-6">
        <h3 className="font-syne text-sm font-bold text-white mb-2 flex items-center gap-2">
          <Clock className="w-4.5 h-4.5 text-cyan animate-pulse" /> Suggested Transactions
        </h3>
        <p className="text-text-muted text-xs mb-4">
          Review upcoming recurring rules and approve them to record money flows instantly.
        </p>

        {suggestions.length === 0 ? (
          <div className="text-xs text-green bg-green/5 border border-green/10 p-3 rounded-lg flex items-center gap-2">
            ✅ No schedules are due for approval in the next 7 days.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {suggestions.map((suggestion: any) => {
              const isOverdue = new Date(suggestion.dueAt) < new Date();
              return (
                <div
                  key={suggestion.id}
                  className="p-4 bg-[#0a0f1c] border border-border rounded-lg flex flex-col justify-between"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h4 className="font-semibold text-white text-xs leading-none mb-1">
                        {suggestion.name}
                      </h4>
                      <span className={`text-[9px] font-bold font-mono ${
                        isOverdue ? 'text-red' : 'text-text-muted'
                      }`}>
                        {isOverdue ? 'Overdue: ' : 'Due: '} {formatIndianDate(suggestion.dueAt)}
                      </span>
                    </div>
                    <span className="text-[10px] bg-white/5 border border-border px-2 py-0.5 rounded uppercase font-bold text-text-muted">
                      {suggestion.template.type}
                    </span>
                  </div>

                  <div className="font-syne text-md font-bold text-cyan mb-3">
                    {formatCurrency(suggestion.template.amount)}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApproveSuggestion(suggestion)}
                      disabled={loadingAction}
                      className="text-[10px] bg-cyan hover:bg-cyan/95 text-bg font-bold py-1.5 px-3 rounded transition-all active:scale-[0.98]"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleSkipSuggestion(suggestion)}
                      disabled={loadingAction}
                      className="text-[10px] border border-border hover:bg-white/5 text-text-muted hover:text-text font-bold py-1.5 px-3 rounded transition-all"
                    >
                      Skip
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* New Schedule Editor */}
      {showForm && (
        <div className="bg-card border border-border rounded-xl p-5 mb-6 animate-in slide-in-from-top duration-200">
          <h3 className="font-syne text-md font-bold text-white mb-4">New Recurring Schedule</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Schedule Name</label>
                <input
                  type="text"
                  required
                  value={scheduleName}
                  onChange={(e) => setScheduleName(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="e.g. Broadband Bill"
                />
              </div>

              <div>
                <CalendarDatePicker
                  label="First Execution Date"
                  value={nextRun}
                  onChange={setNextRun}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Amount (INR)</label>
                <input
                  type="number"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Dynamic Frequency Selector */}
            <div className="bg-[#0a0f1c] border border-border rounded-lg p-4">
              <FrequencySelector frequency={frequency} onChange={setFrequency} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Flow Type</label>
                <select
                  value={txType}
                  onChange={(e) => setTxType(e.target.value as any)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan capitalize"
                >
                  {TRANSACTION_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              {txType !== 'income' && (
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Source Account</label>
                  <select
                    required
                    value={fromAccountId}
                    onChange={(e) => setFromAccountId(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {txType !== 'expense' && (
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Destination Account</label>
                  <select
                    required
                    value={toAccountId}
                    onChange={(e) => setToAccountId(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="">Select Account</option>
                    {accounts.map((a: any) => (
                      <option key={a.id} value={a.id}>{a.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Category</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="e.g. Bills"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Notes</label>
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  placeholder="Memo..."
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="border border-border hover:bg-white/5 text-text font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loadingAction}
                className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 px-5 rounded-lg text-sm transition-all"
              >
                {loadingAction ? 'Saving...' : 'Create Schedule'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Schedules list */}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="grid grid-cols-12 px-5 py-3 border-b border-border bg-[#0a0f1c] text-[10px] font-bold text-text-dim uppercase tracking-wider text-left">
          <div className="col-span-3">Schedule Name</div>
          <div className="col-span-2">Type</div>
          <div className="col-span-2">Amount</div>
          <div className="col-span-2">Frequency</div>
          <div className="col-span-2">Next Date</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {filteredSchedules.length === 0 ? (
          <div className="text-center py-12 text-text-muted text-sm">
            No active schedules found. Configure one above!
          </div>
        ) : (
          <div className="divide-y divide-border/60">
            {filteredSchedules.map((s: any) => {
              const isOverdue = new Date(s.nextRunAt) < new Date();
              const label = scheduleLabel(s.rrule);
              
              return (
                <div
                  key={s.id}
                  className="grid grid-cols-12 px-5 py-3 items-center text-xs text-text hover:bg-white/[0.01] transition-colors group"
                >
                  <div className="col-span-3 font-semibold text-white truncate pr-2">
                    {s.name}
                  </div>

                  <div className="col-span-2">
                    <span className={`inline-block px-2.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      s.template.type === 'expense'
                        ? 'bg-red/10 border-red/20 text-red'
                        : 'bg-green/10 border-green/20 text-green'
                    }`}>
                      {s.template.type}
                    </span>
                  </div>

                  <div className="col-span-2 font-mono font-bold text-white">
                    {formatCurrency(s.template.amount)}
                  </div>

                  <div className="col-span-2 text-text-muted truncate pr-2">
                    {label}
                  </div>

                  <div className="col-span-2 flex flex-col">
                    <span className={`font-semibold ${isOverdue ? 'text-red' : 'text-text-muted'}`}>
                      {formatIndianDate(s.nextRunAt)}
                    </span>
                    {isOverdue && <span className="text-[9px] text-red font-bold font-mono uppercase mt-0.5">Overdue</span>}
                  </div>

                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <button
                      onClick={() => handleToggleStatus(s)}
                      className={`p-1 rounded text-text-muted hover:text-text hover:bg-white/5 transition-all`}
                      title={s.status === 'active' ? 'Pause Schedule' : 'Activate Schedule'}
                    >
                      {s.status === 'active' ? <Pause className="w-4 h-4 text-cyan" /> : <Play className="w-4 h-4 text-text-muted" />}
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="opacity-0 group-hover:opacity-100 text-text-dim hover:text-red p-1 rounded hover:bg-red/5 transition-all"
                      title="Delete Schedule"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
