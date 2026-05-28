'use client';

import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { ArrowRight, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/utils/currency';
import { formatIndianDate } from '@/lib/utils/date';
import { auth } from '@/lib/firebase';

export default function TransactionTable({ accounts, filteredTransactions, onDeleteDone }: any) {
  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({ count: filteredTransactions.length, getScrollElement: () => parentRef.current, estimateSize: () => 72, overscan: 5 });

  const getAccountName = (id?: string) => {
    if (!id) return '';
    const acc = accounts.find((a: any) => a.id === id);
    return acc ? acc.name : 'Unknown';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return;
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`/api/transactions/${id}`, { 
        method: 'DELETE',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) throw new Error('Deletion failed');
      onDeleteDone();
    } catch (err: any) {
      alert(err.message || 'Error deleting transaction');
    }
  };

  return <div className="overflow-hidden rounded-xl border border-border bg-card">{/* headings/table */}
    <div className="grid grid-cols-12 border-b border-border bg-[#0a0f1c] px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-text-dim"><div className="col-span-2">Date</div><div className="col-span-3">Transfer Route</div><div className="col-span-2">Category</div><div className="col-span-3">Note / Details</div><div className="col-span-2 text-right">Amount</div></div>
    {filteredTransactions.length === 0 ? <div className="py-12 text-center text-sm text-text-muted">No transactions found.</div> : <div ref={parentRef} className="max-h-[500px] overflow-auto" style={{ position: 'relative' }}><div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>{rowVirtualizer.getVirtualItems().map((virtualRow) => { const tx = filteredTransactions[virtualRow.index]; if (!tx) return null; const isIncome = tx.type === 'income' || tx.type === 'salary'; return <div key={virtualRow.index} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: `${virtualRow.size}px`, transform: `translateY(${virtualRow.start}px)` }} className="group grid grid-cols-12 items-center border-b border-border/60 px-5 py-3 text-xs text-text transition-colors hover:bg-white/[0.015]"><div className="col-span-2 flex flex-col"><span className="font-semibold text-white">{formatIndianDate(tx.date)}</span><span className="mt-0.5 font-mono text-[10px] uppercase text-text-dim">{tx.paymentMethod}</span></div><div className="col-span-3 flex max-w-[90%] items-center gap-1.5 truncate">{tx.fromAccountId && <span className="shrink truncate font-medium text-text-muted">{getAccountName(tx.fromAccountId)}</span>}{tx.fromAccountId && tx.toAccountId && <ArrowRight className="h-3.5 w-3.5 shrink-0 text-text-dim" />}{tx.toAccountId && <span className="shrink truncate font-semibold text-white">{getAccountName(tx.toAccountId)}</span>}{!tx.fromAccountId && !tx.toAccountId && <span className="text-text-dim">-</span>}</div><div className="col-span-2"><span className="inline-block rounded px-2.5 py-0.5 text-[10px] font-bold capitalize">{tx.category || tx.type}</span></div><div className="col-span-3 pr-2"><span className="max-w-[85%] truncate text-text-muted">{tx.note || '-'}</span></div><div className="col-span-2 flex items-center justify-end gap-3 text-right"><span className={`font-mono text-sm font-bold ${isIncome ? 'text-green' : 'text-red'}`}>{isIncome ? '+' : '-'}{formatCurrency(tx.amount)}</span><button onClick={() => handleDelete(tx.id)} className="rounded p-1 text-text-dim opacity-0 transition-all hover:bg-red/5 hover:text-red group-hover:opacity-100" title="Delete Transaction"><Trash2 className="h-3.5 w-3.5" /></button></div></div>; })}</div></div>}
  </div>;
}
