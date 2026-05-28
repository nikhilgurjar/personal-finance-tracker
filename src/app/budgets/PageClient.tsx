'use client';

import { useState, useMemo } from 'react';
import useSWR from 'swr';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import { fetcher } from '@/lib/swr';
import { authenticatedFetch } from '@/lib/auth';
import { formatCurrency } from '@/lib/utils/currency';
import { getCurrentMonthStr } from '@/lib/utils/date';
import {
  Plus,
  Trash2,
  AlertTriangle,
  Flame,
  Wallet,
  Settings,
  Calendar,
  Sparkles,
  Search,
} from 'lucide-react';

const FALLBACK_CATEGORIES = [
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

export default function BudgetsPage() {
  const [month, setMonth] = useState(getCurrentMonthStr());
  const [category, setCategory] = useState('');
  const [monthlyAmount, setMonthlyAmount] = useState('');
  const [expenseNature, setExpenseNature] = useState<'dynamic' | 'fixed'>('dynamic');
  const [loadingAction, setLoadingAction] = useState(false);

  // SWR queries
  const { data: budgetData, mutate: mutateBudgets, error, isValidating } = useSWR(
    `/api/budgets?month=${month}`,
    fetcher
  );
  
  const { data: userCategories = [] } = useSWR('/api/categories', fetcher);

  const categories = useMemo<string[]>(() => {
    if (userCategories && userCategories.length > 0) {
      return userCategories.map((c: any) => c.name);
    }
    return FALLBACK_CATEGORIES;
  }, [userCategories]);

  const handleAddBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !monthlyAmount || Number(monthlyAmount) <= 0) {
      return alert('Please select a category and enter a valid monthly limit.');
    }

    setLoadingAction(true);
    try {
      const payload = {
        category,
        month,
        monthlyAmount: Number(monthlyAmount),
        expenseNature,
      };

      // Optimistic update
      const tempId = crypto.randomUUID();
      const tempBudget = {
        ...payload,
        id: tempId,
        spent: 0,
        usedPct: 0,
        alertLevel: 'ok',
      };

      await mutateBudgets(
        (current: any) => {
          const budgetsList = current?.budgets || [];
          return {
            ...current,
            budgets: [tempBudget, ...budgetsList],
          };
        },
        { revalidate: false }
      );

      const res = await authenticatedFetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('Failed to create budget');
      mutateBudgets();
      setCategory('');
      setMonthlyAmount('');
    } catch (err: any) {
      alert(err.message || 'Error saving budget');
      mutateBudgets();
    } finally {
      setLoadingAction(false);
    }
  };

  const handleDeleteBudget = async (id: string) => {
    if (!confirm('Are you sure you want to delete this budget?')) return;

    try {
      const res = await authenticatedFetch(`/api/budgets/${id}`, { 
        method: 'DELETE'
      });
      if (!res.ok) throw new Error('Failed to delete budget');
      mutateBudgets();
    } catch (err: any) {
      alert(err.message || 'Error deleting budget');
    }
  };

  return (
    <AppLayout>
      <PageHeader title="Category Budgets" />

      {/* Intro info panel */}
      <section className="mb-6 bg-gradient-to-r from-amber/10 to-transparent p-5 rounded-xl border border-amber/15">
        <h3 className="font-syne text-sm font-bold text-white mb-1.5 flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber" /> Smart Budgets
        </h3>
        <p className="text-text-muted text-xs leading-relaxed max-w-2xl">
          Set monthly limit ceilings on categories and catch dynamic spending before it runs hot. 
          Your spending is computed automatically against transaction summaries.
        </p>
      </section>

      {/* Editor & Parameters Card */}
      <div className="bg-card border border-border rounded-xl p-5 mb-6">
        <form onSubmit={handleAddBudget} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Target Period</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-cyan"
            />
          </div>

          <div className="sm:col-span-3">
            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-cyan capitalize"
            >
              <option value="">Select Category</option>
              {categories.map((cat: string) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Nature</label>
            <select
              value={expenseNature}
              onChange={(e) => setExpenseNature(e.target.value as any)}
              className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-cyan"
            >
              <option value="dynamic">Dynamic</option>
              <option value="fixed">Fixed</option>
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-text-dim uppercase tracking-wider mb-1">Limit (INR)</label>
            <input
              type="number"
              value={monthlyAmount}
              onChange={(e) => setMonthlyAmount(e.target.value)}
              className="w-full bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-xs text-text focus:outline-none focus:border-cyan"
              placeholder="e.g. 5000"
            />
          </div>

          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={loadingAction}
              className="w-full bg-cyan hover:bg-cyan/95 text-bg font-bold py-2 rounded-lg text-xs transition-all active:scale-[0.98]"
            >
              {loadingAction ? 'Adding...' : 'Add Limit'}
            </button>
          </div>
        </form>
      </div>

      {/* Budgets Progress Grid */}
      {!budgetData ? (
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-card rounded-xl border border-border" />
          <div className="h-32 bg-card rounded-xl border border-border" />
        </div>
      ) : budgetData.budgets?.length === 0 ? (
        <div className="text-center py-12 text-text-muted text-sm border border-dashed border-border rounded-xl bg-card">
          No budgets configured for this month. Set one above!
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {budgetData.budgets.map((budget: any) => {
            const pct = budget.usedPct || 0;
            const alertLvl = budget.alertLevel || 'ok';
            const progressColor =
              alertLvl === 'critical'
                ? 'bg-red'
                : alertLvl === 'warning'
                ? 'bg-amber'
                : 'bg-green';

            return (
              <div
                key={budget.id}
                className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h4 className="font-semibold text-white text-sm capitalize">{budget.category}</h4>
                      <span className="text-[10px] text-text-muted capitalize leading-none block mt-0.5 font-mono">
                        {budget.expenseNature} Spending Nature
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteBudget(budget.id)}
                      className="text-text-dim hover:text-red p-1 rounded hover:bg-red/5 transition-colors"
                      title="Delete Budget"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Progress Line */}
                  <div className="w-full bg-[#0a0f1c] rounded-full h-2 overflow-hidden border border-border/80 my-4">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${progressColor}`}
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-text-muted">
                      Spent: <strong className="text-white font-mono">{formatCurrency(budget.spent || 0)}</strong>
                    </span>
                    <span className="font-bold text-white font-mono">
                      {Math.round(pct)}% of {formatCurrency(budget.monthlyAmount)}
                    </span>
                  </div>

                  {alertLvl !== 'ok' && (
                    <div className={`mt-4 px-3 py-2 rounded-lg border text-xs flex items-center gap-2 leading-relaxed ${
                      alertLvl === 'critical'
                        ? 'bg-red/10 border-red/20 text-red'
                        : 'bg-amber/10 border-amber/20 text-amber'
                    }`}>
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>
                        Budget alert! category {budget.category} is at {Math.round(pct)}% of monthly limit.
                      </span>
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
