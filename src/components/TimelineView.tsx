'use client';
import { TrendingUp, TrendingDown, ArrowRightLeft, PiggyBank, Landmark, Receipt, HandCoins, History } from 'lucide-react';

export interface TimelineEventData {
  id: string;
  date: number;
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  type: 'income' | 'expense' | 'transfer' | 'savings' | 'loan' | 'instrument' | 'repayment';
  action?: 'create' | 'update' | 'delete';
  note?: string;
  tags?: string[];
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  income: { icon: <TrendingUp size={14} />, color: '#10b981', bg: '#d1fae5' },
  expense: { icon: <TrendingDown size={14} />, color: '#ef4444', bg: '#fee2e2' },
  transfer: { icon: <ArrowRightLeft size={14} />, color: '#3b82f6', bg: '#dbeafe' },
  savings: { icon: <PiggyBank size={14} />, color: '#8b5cf6', bg: '#ede9fe' },
  loan: { icon: <HandCoins size={14} />, color: '#f97316', bg: '#ffedd5' },
  instrument: { icon: <Landmark size={14} />, color: '#06b6d4', bg: '#cffafe' },
  repayment: { icon: <Receipt size={14} />, color: '#14b8a6', bg: '#ccfbf1' },
};

function groupByDate(events: TimelineEventData[]) {
  const groups: Record<string, TimelineEventData[]> = {};
  [...events].sort((a, b) => b.date - a.date).forEach((e) => {
    const k = new Date(e.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    if (!groups[k]) groups[k] = [];
    groups[k].push(e);
  });
  return groups;
}

export function TimelineView({ events, emptyMessage = 'No events yet' }: { events: TimelineEventData[]; emptyMessage?: string }) {
  if (!events.length) return <div className="py-8 text-center text-slate-500"><History className="mx-auto mb-1" size={28} />{emptyMessage}</div>;
  const groups = groupByDate(events);
  return (
    <div className="relative">
      <div className="absolute bottom-0 left-5 top-0 w-0.5 bg-slate-200" />
      {Object.entries(groups).map(([dateLabel, dateEvents]) => (
        <div key={dateLabel} className="mb-4">
          <div className="relative z-10 mb-2 flex items-center gap-2">
            <div className="flex w-10 justify-center"><div className="h-2.5 w-2.5 rounded-full border-2 border-white bg-slate-400 shadow-[0_0_0_2px_#e2e8f0]" /></div>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700">{dateLabel}</span>
          </div>
          {dateEvents.map((event) => {
            const cfg = TYPE_CONFIG[event.type] || TYPE_CONFIG.expense;
            return (
              <div key={event.id} className="relative z-10 mb-2 flex items-start gap-2">
                <div className="flex w-10 justify-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white" style={{ backgroundColor: cfg.bg, color: cfg.color, boxShadow: `0 0 0 2px ${cfg.bg}` }}>{cfg.icon}</div>
                </div>
                <div className="flex-1 rounded-lg border border-slate-200 bg-white p-2">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="text-sm font-semibold text-slate-900">{event.title}</p>{event.subtitle && <p className="text-xs text-slate-500">{event.subtitle}</p>}</div>
                    {event.amount != null && <p className="text-sm font-bold" style={{ color: cfg.color }}>{['income', 'repayment'].includes(event.type) ? '+' : '-'}Rs {event.amount.toLocaleString('en-IN')}</p>}
                  </div>
                  {event.note && <p className="mt-1 text-xs text-slate-500">{event.note}</p>}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

