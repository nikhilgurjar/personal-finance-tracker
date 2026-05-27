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
  Target,
  History,
  X,
  AlertTriangle,
  Flame,
  Award,
} from 'lucide-react';

const PRIORITY_LABELS = ['Low', 'Medium', 'High'];
const PRIORITY_COLORS = [
  'bg-green/10 border-green/20 text-green',
  'bg-amber/10 border-amber/20 text-amber',
  'bg-red/10 border-red/20 text-red',
];

export default function GoalsPage() {
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loadingAction, setLoadingAction] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [targetDate, setTargetDate] = useState('');
  const [priority, setPriority] = useState('2'); // default medium
  const [allocationAmount, setAllocationAmount] = useState('');
  const [allocationAccountId, setAllocationAccountId] = useState('');
  const [allocationInstrumentId, setAllocationInstrumentId] = useState('');

  // SWR queries
  const { data: goals = [], mutate: mutateGoals, error } = useSWR('/api/goals', fetcher);
  const { data: accounts = [] } = useSWR('/api/accounts', fetcher);
  const { data: instruments = [] } = useSWR('/api/instruments', fetcher);

  const filteredGoals = useMemo(() => {
    return goals.filter((g: any) =>
      g.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [goals, searchTerm]);

  const handleOpenCreate = () => {
    setEditingGoal(null);
    setName('');
    setTargetAmount('');
    setTargetDate('');
    setPriority('2');
    setAllocationAmount('');
    setAllocationAccountId('');
    setAllocationInstrumentId('');
    setFormOpen(true);
  };

  const handleOpenEdit = (goal: any) => {
    setEditingGoal(goal);
    setName(goal.name || '');
    setTargetAmount(String(goal.targetAmount || ''));
    setTargetDate(goal.targetDate ? new Date(goal.targetDate).toISOString().split('T')[0] : '');
    setPriority(String(goal.priority || 2));
    
    // Extract first allocation if exists for editing simplicity
    const firstAlloc = goal.allocations?.[0];
    if (firstAlloc) {
      setAllocationAmount(String(firstAlloc.amount || ''));
      setAllocationAccountId(firstAlloc.accountId || '');
      setAllocationInstrumentId(firstAlloc.instrumentId || '');
    } else {
      setAllocationAmount('');
      setAllocationAccountId('');
      setAllocationInstrumentId('');
    }
    setFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !targetAmount || Number(targetAmount) <= 0) {
      return alert('Enter valid name and target amount');
    }

    setLoadingAction(true);
    try {
      const allocations: any[] = [];
      if (allocationAmount && Number(allocationAmount) > 0) {
        allocations.push({
          amount: Number(allocationAmount),
          accountId: allocationAccountId || undefined,
          instrumentId: allocationInstrumentId || undefined,
        });
      }

      const payload: any = {
        name: name.trim(),
        targetAmount: Number(targetAmount),
        priority: Number(priority),
        targetDate: targetDate ? new Date(targetDate).getTime() : undefined,
        allocations,
      };

      const method = editingGoal ? 'PUT' : 'POST';
      const url = '/api/goals';

      if (editingGoal) {
        payload.id = editingGoal.id;
      }

      // Optimistic update
      const tempGoal = {
        ...payload,
        id: editingGoal ? editingGoal.id : crypto.randomUUID(),
        currentAmount: allocations.reduce((s, a) => s + a.amount, 0),
      };

      await mutateGoals(
        (current: any) => {
          if (!current) return current;
          if (editingGoal) {
            return current.map((g: any) => (g.id === editingGoal.id ? tempGoal : g));
          }
          return [tempGoal, ...current];
        },
        { revalidate: false }
      );

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to save goal');

      mutateGoals();
      setFormOpen(false);
    } catch (err: any) {
      alert(err.message || 'Error saving goal');
      mutateGoals();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this goal?')) return;

    try {
      const res = await fetch(`/api/goals?id=${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Deletion failed');
      mutateGoals();
    } catch (err: any) {
      alert(err.message || 'Error deleting goal');
    }
  };

  const getAccountOrInstrumentName = (alloc: any) => {
    if (alloc.accountId) {
      const acc = accounts.find((a: any) => a.id === alloc.accountId);
      return acc ? acc.name : 'Unknown Account';
    }
    if (alloc.instrumentId) {
      const inst = instruments.find((i: any) => i.id === alloc.instrumentId);
      return inst ? inst.name : 'Unknown Instrument';
    }
    return 'Unlinked Allocation';
  };

  return (
    <AppLayout>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <PageHeader title="Financial Goals" />
        <button
          onClick={handleOpenCreate}
          className="bg-cyan hover:bg-cyan/95 text-bg font-bold py-2.5 px-4 rounded-lg flex items-center gap-2 transition-all active:scale-[0.98] text-sm shrink-0"
        >
          <Plus className="w-4.5 h-4.5" /> Add Goal
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red/10 border border-red/20 text-red text-xs px-4 py-3 rounded-lg flex items-center">
          <span>Failed to load goals. Please refresh the page.</span>
        </div>
      )}

      {/* Goal edit slideout */}
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
                  {editingGoal ? 'Edit Goal' : 'Create Goal'}
                </h3>
                <button
                  onClick={() => setFormOpen(false)}
                  className="p-1 rounded-full bg-white/5 hover:bg-white/10 text-text-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Goal Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    placeholder="e.g. Buy New Laptop"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Target Amount (INR)</label>
                    <input
                      type="number"
                      required
                      value={targetAmount}
                      onChange={(e) => setTargetAmount(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="0.00"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Target Date</label>
                    <input
                      type="date"
                      value={targetDate}
                      onChange={(e) => setTargetDate(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Priority</label>
                  <select
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                    className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                  >
                    <option value="1">Low Priority</option>
                    <option value="2">Medium Priority</option>
                    <option value="3">High Priority</option>
                  </select>
                </div>

                {/* Capital Allocation */}
                <div className="border-t border-border pt-4 space-y-4">
                  <h4 className="text-xs font-bold text-cyan uppercase tracking-wider">Allocate Capital</h4>
                  <div>
                    <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Allocation Amount (INR)</label>
                    <input
                      type="number"
                      value={allocationAmount}
                      onChange={(e) => setAllocationAmount(e.target.value)}
                      className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      placeholder="0.00"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Linked Account</label>
                      <select
                        value={allocationAccountId}
                        onChange={(e) => {
                          setAllocationAccountId(e.target.value);
                          if (e.target.value) setAllocationInstrumentId('');
                        }}
                        className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      >
                        <option value="">None</option>
                        {accounts.map((a: any) => (
                          <option key={a.id} value={a.id}>{a.name}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1.5">Linked Asset / Mutual Fund</label>
                      <select
                        value={allocationInstrumentId}
                        onChange={(e) => {
                          setAllocationInstrumentId(e.target.value);
                          if (e.target.value) setAllocationAccountId('');
                        }}
                        className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                      >
                        <option value="">None</option>
                        {instruments.map((i: any) => (
                          <option key={i.id} value={i.id}>{i.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
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
                {loadingAction ? 'Saving...' : 'Save Goal'}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Search Filter */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Filter goals by name..."
          className="w-full bg-card border border-border rounded-lg py-2 px-4 text-xs text-text focus:outline-none focus:border-cyan transition-colors"
        />
      </div>

      {/* Goals Grid */}
      {filteredGoals.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm border border-dashed border-border rounded-xl bg-card">
          No goals found. Configure one above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal: any) => {
            const totalAllocated = goal.allocations?.reduce((sum: number, alloc: any) => sum + (alloc.amount || 0), 0) || 0;
            const progress = goal.targetAmount ? Math.min((totalAllocated / goal.targetAmount) * 100, 100) : 0;
            const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && progress < 100;
            const prioIdx = Math.min(Math.max((goal.priority || 1) - 1, 0), 2);

            return (
              <div
                key={goal.id}
                className="bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-all flex flex-col justify-between relative group"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-white text-sm">{goal.name}</h4>
                      <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-wider border ${PRIORITY_COLORS[prioIdx]}`}>
                        {PRIORITY_LABELS[prioIdx]}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => handleOpenEdit(goal)}
                        className="text-text-dim hover:text-cyan p-1 rounded hover:bg-cyan/5 transition-all"
                        title="Edit Goal"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(goal.id)}
                        className="text-text-dim hover:text-red p-1 rounded hover:bg-red/5 transition-all"
                        title="Delete Goal"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="font-syne text-xl font-bold text-cyan mt-1 mb-4">
                    {formatCurrency(goal.targetAmount)}
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-[#0a0f1c] rounded-full h-2 overflow-hidden border border-border/80 my-3">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isOverdue ? 'bg-red' : 'bg-cyan'
                      }`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-baseline text-xs text-text-muted mt-2 mb-4">
                    <span>Saved: <strong className="text-white font-mono">{formatCurrency(totalAllocated)}</strong></span>
                    <span className="font-semibold text-cyan font-mono">{Math.round(progress)}% Complete</span>
                  </div>
                </div>

                <div>
                  {goal.targetDate && (
                    <div className="text-[10px] text-text-dim mt-2 font-mono flex justify-between items-center bg-[#0a0f1c] px-2.5 py-1 rounded-md border border-border">
                      <span>Target Date:</span>
                      <span className="text-text-muted">{formatIndianDate(goal.targetDate)}</span>
                    </div>
                  )}

                  {/* Allocations Summary */}
                  {goal.allocations?.length > 0 && (
                    <div className="mt-3.5 pt-3 border-t border-border/60">
                      <span className="text-[9px] font-bold text-text-dim uppercase tracking-wider block mb-1.5">Capital Allocations</span>
                      <div className="flex flex-wrap gap-1">
                        {goal.allocations.map((allocation: any, index: number) => (
                          <span
                            key={index}
                            className="inline-block bg-white/5 border border-border px-2 py-0.5 rounded text-[10px] text-text-muted font-mono"
                          >
                            {getAccountOrInstrumentName(allocation)}: <strong>{formatCurrency(allocation.amount)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {isOverdue && (
                    <div className="mt-3 bg-red/10 border border-red/20 text-red text-[11px] px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-bold">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      Goal period is past due!
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
