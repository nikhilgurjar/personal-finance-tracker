import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/serverAuth';
import { getDashboardData } from '@/lib/dashboardData';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import {
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  TrendingDown,
  Coins,
  Handshake,
  Plus,
  Target,
  LineChart,
} from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const selectedMonth = searchParams.month || new Date().toISOString().slice(0, 7);
  const { totals, recentTransactions, goals } = await getDashboardData(user.uid, selectedMonth);

  return (
    <AppLayout>
      <PageHeader title="Dashboard" />

      {/* Hero section / Briefing */}
      <section className="mb-8 bg-gradient-to-r from-cyan/10 to-transparent p-6 rounded-xl border border-cyan/15">
        <h3 className="font-syne text-lg font-bold text-white mb-2">Morning Briefing</h3>
        <p className="text-text-muted text-sm max-w-2xl leading-relaxed">
          Good morning! Your net worth is <span className="text-white font-semibold">{formatCurrency(totals.netWorth)}</span>. 
          This month, you have received <span className="text-green font-semibold">{formatCurrency(totals.totalIncome)}</span> in income and spent <span className="text-red font-semibold">{formatCurrency(totals.totalExpenses)}</span>.
          {totals.totalExpenses > totals.totalIncome && totals.totalIncome > 0 ? (
            <span className="text-amber"> Warning: Your expenses exceed this month's income.</span>
          ) : (
            <span className="text-green"> You are saving {Math.max(0, Math.round(((totals.totalIncome - totals.totalExpenses) / (totals.totalIncome || 1)) * 100))}% of your income.</span>
          )}
        </p>
      </section>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8" aria-label="Financial statistics">
        <div className="bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-colors">
          <div className="flex items-center justify-between text-text-dim uppercase tracking-wider text-[10px] font-bold mb-3">
            <span>Net Worth</span>
            <TrendingUp className="w-4 h-4 text-cyan" />
          </div>
          <div className="font-syne text-xl font-bold text-white leading-tight">
            {formatCurrency(totals.netWorth)}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Liquid balance</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:border-green/35 transition-colors">
          <div className="flex items-center justify-between text-text-dim uppercase tracking-wider text-[10px] font-bold mb-3">
            <span>Income</span>
            <ArrowUpRight className="w-4 h-4 text-green" />
          </div>
          <div className="font-syne text-xl font-bold text-green leading-tight">
            {formatCurrency(totals.totalIncome)}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">For {selectedMonth}</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:border-red/35 transition-colors">
          <div className="flex items-center justify-between text-text-dim uppercase tracking-wider text-[10px] font-bold mb-3">
            <span>Expenses</span>
            <ArrowDownRight className="w-4 h-4 text-red" />
          </div>
          <div className="font-syne text-xl font-bold text-red leading-tight">
            {formatCurrency(totals.totalExpenses)}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Monthly usage</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:border-cyan/35 transition-colors">
          <div className="flex items-center justify-between text-text-dim uppercase tracking-wider text-[10px] font-bold mb-3">
            <span>Investments</span>
            <Coins className="w-4 h-4 text-cyan" />
          </div>
          <div className="font-syne text-xl font-bold text-cyan leading-tight">
            {formatCurrency(totals.savingsPortfolio)}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Total instruments</span>
        </div>

        <div className="bg-card border border-border rounded-xl p-5 hover:border-amber/35 transition-colors">
          <div className="flex items-center justify-between text-text-dim uppercase tracking-wider text-[10px] font-bold mb-3">
            <span>Total Loans</span>
            <Handshake className="w-4 h-4 text-amber" />
          </div>
          <div className="font-syne text-xl font-bold text-amber leading-tight">
            {formatCurrency(totals.outstandingLoans)}
          </div>
          <span className="text-[11px] text-text-muted mt-1 block">Owed to others</span>
        </div>
      </div>

      {/* Quick Actions Panel */}
      <section className="bg-card border border-border rounded-xl p-6 mb-8">
        <h3 className="font-syne text-md font-bold text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Link
            href="/transactions?action=add_income"
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-green/5 border border-green/10 text-green hover:bg-green/10 transition-all active:scale-[0.98] text-center"
          >
            <Plus className="w-5 h-5 mb-2" />
            <span className="text-xs font-bold">Add Income</span>
          </Link>
          <Link
            href="/transactions?action=add_expense"
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-red/5 border border-red/10 text-red hover:bg-red/10 transition-all active:scale-[0.98] text-center"
          >
            <Plus className="w-5 h-5 mb-2" />
            <span className="text-xs font-bold">Add Expense</span>
          </Link>
          <Link
            href="/goals?action=new"
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-cyan/5 border border-cyan/10 text-cyan hover:bg-cyan/10 transition-all active:scale-[0.98] text-center"
          >
            <Target className="w-5 h-5 mb-2" />
            <span className="text-xs font-bold">Set Financial Goal</span>
          </Link>
          <Link
            href="/ai"
            className="flex flex-col items-center justify-center p-4 rounded-lg bg-purple/5 border border-purple/10 text-purple hover:bg-purple/10 transition-all active:scale-[0.98] text-center"
          >
            <LineChart className="w-5 h-5 mb-2" />
            <span className="text-xs font-bold">AI Analytics</span>
          </Link>
        </div>
      </section>

      {/* Details split grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Transactions */}
        <section className="lg:col-span-2 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-syne text-md font-bold text-white">Recent Transactions</h3>
            <Link href="/transactions" className="text-xs text-cyan hover:underline font-medium">
              View All History
            </Link>
          </div>

          {recentTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm mb-4">No transactions found</p>
              <div className="flex gap-2 justify-center">
                <Link href="/transactions?action=add_income" className="bg-cyan text-bg px-3 py-1.5 rounded-lg text-xs font-semibold">
                  Add Income
                </Link>
                <Link href="/transactions?action=add_expense" className="border border-border text-text px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-white/5">
                  Add Expense
                </Link>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {recentTransactions.map((tx: any) => {
                const isIncome = tx.type === 'income' || tx.type === 'salary';
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3.5 border border-border/80 rounded-lg bg-white/[0.01]"
                  >
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {tx.note || tx.sourceName || tx.category || 'Reconciliation'}
                      </p>
                      <p className="text-[11px] text-text-muted mt-0.5">
                        <span className="capitalize">{tx.type}</span> • {formatIndianDate(tx.date)}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-bold ${isIncome ? 'text-green' : 'text-red'}`}
                    >
                      {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Goals Progress */}
        <section className="bg-card border border-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-syne text-md font-bold text-white">Goals Progress</h3>
            <Link href="/goals" className="text-xs text-cyan hover:underline font-medium">
              Manage Goals
            </Link>
          </div>

          {goals.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-muted text-sm mb-4">No active goals</p>
              <Link href="/goals?action=new" className="bg-cyan text-bg px-3.5 py-1.5 rounded-lg text-xs font-semibold inline-block">
                Create First Goal
              </Link>
            </div>
          ) : (
            <div className="space-y-5">
              {goals.map((goal: any) => {
                const progress = goal.targetAmount
                  ? Math.min(((goal.currentAmount || 0) / goal.targetAmount) * 100, 100)
                  : 0;

                return (
                  <div key={goal.id}>
                    <div className="flex justify-between items-baseline mb-2">
                      <span className="text-sm font-semibold text-white">{goal.name}</span>
                      <span className="text-xs font-bold text-cyan">{Math.round(progress)}%</span>
                    </div>
                    {/* Progress track */}
                    <div className="w-full bg-[#0a0f1c] rounded-full h-2 overflow-hidden border border-border/60">
                      <div
                        className="bg-cyan h-full rounded-full transition-all duration-300"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 text-[10px] text-text-muted">
                      <span>{formatCurrency(goal.currentAmount || 0)}</span>
                      <span>Target: {formatCurrency(goal.targetAmount || 0)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppLayout>
  );
}
