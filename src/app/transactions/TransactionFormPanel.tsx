'use client';

import { useState } from 'react';
import { formatCurrency } from '@/lib/utils/currency';

const TRANSACTION_TYPES = ['expense', 'income', 'transfer', 'savings', 'salary'];
const PAYMENT_METHODS = ['upi', 'neft', 'imps', 'rtgs', 'cash', 'card', 'cheque'];
const CATEGORIES = ['Food & Dining', 'Rent & Home', 'Utilities', 'Shopping', 'Travel & Transport', 'Entertainment', 'Medical & Health', 'Education', 'Investment', 'Salary', 'Others'];

export default function TransactionFormPanel({ accounts, onSaved, onCancel, mutateTransactions }: any) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [txType, setTxType] = useState<'expense' | 'income' | 'transfer' | 'savings' | 'salary'>('expense');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [fromAccountId, setFromAccountId] = useState('');
  const [toAccountId, setToAccountId] = useState('');
  const [category, setCategory] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('upi');
  const [upiRefId, setUpiRefId] = useState('');
  const [netTakeHome, setNetTakeHome] = useState('');
  const [employeePf, setEmployeePf] = useState('');

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) return alert('Enter valid amount');
    setLoadingAction(true);
    try {
      const payload: any = { type: txType, amount: Number(amount), date: new Date(date).getTime(), note: note.trim(), paymentMethod };
      if (txType === 'expense') { payload.fromAccountId = fromAccountId; payload.category = category || 'Others'; }
      else if (txType === 'income') { payload.toAccountId = toAccountId; payload.category = category || 'Salary'; }
      else if (txType === 'salary') { payload.toAccountId = toAccountId; payload.category = 'Salary'; payload.salaryComponents = { netTakeHome: Number(netTakeHome || amount), employeePf: Number(employeePf || 0), salaryMonth: date.substring(0, 7) }; }
      else if (txType === 'transfer' || txType === 'savings') { payload.fromAccountId = fromAccountId; payload.toAccountId = toAccountId; payload.category = txType === 'savings' ? 'Investment' : 'Transfer'; }
      if (paymentMethod === 'upi' && upiRefId) payload.upiRefId = upiRefId.trim();

      await mutateTransactions((current: any) => {
        if (!current) return current;
        const optimisticTx = { ...payload, id: crypto.randomUUID(), createdAt: Date.now() };
        const firstPage = current[0] || { data: [] };
        return [{ ...firstPage, data: [optimisticTx, ...(firstPage.data || [])] }, ...current.slice(1)];
      }, { revalidate: false });

      const res = await fetch('/api/transactions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error('Failed to save transaction');
      onSaved();
    } catch (err: any) {
      alert(err.message || 'Error saving transaction');
    } finally {
      setLoadingAction(false);
    }
  };

  return <div className="mb-6 rounded-xl border border-border bg-card p-6"><h3 className="mb-4 font-syne text-md font-bold text-white">New Money Flow</h3><form onSubmit={handleAddTransaction} className="space-y-4">{/* unchanged form */}
  <div className="grid grid-cols-5 gap-1.5 rounded-lg border border-border bg-[#0a0f1c] p-1">{TRANSACTION_TYPES.map((type) => <button key={type} type="button" onClick={() => { setTxType(type as any); setCategory(''); }} className={`rounded py-1.5 text-xs font-semibold capitalize transition-all ${txType === type ? 'bg-cyan/15 text-cyan' : 'text-text-muted hover:text-text'}`}>{type}</button>)}</div>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3"><input type="number" required min="0.01" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text" placeholder="0.00" /><input type="date" required value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text" /><select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm capitalize text-text">{PAYMENT_METHODS.map((pm) => <option key={pm} value={pm}>{pm}</option>)}</select></div>
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{(txType === 'expense' || txType === 'transfer' || txType === 'savings') && <select required value={fromAccountId} onChange={(e) => setFromAccountId(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text"><option value="">Select Account</option>{accounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}</select>}{(txType === 'income' || txType === 'salary' || txType === 'transfer' || txType === 'savings') && <select required value={toAccountId} onChange={(e) => setToAccountId(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text"><option value="">Select Account</option>{accounts.map((acc: any) => <option key={acc.id} value={acc.id}>{acc.name} ({formatCurrency(acc.balance)})</option>)}</select>}{(txType === 'expense' || txType === 'income') && <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text"><option value="">Select Category</option>{CATEGORIES.map((cat) => <option key={cat} value={cat}>{cat}</option>)}</select>}{paymentMethod === 'upi' && <input type="text" value={upiRefId} onChange={(e) => setUpiRefId(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text" placeholder="UPI ref" />}</div>
  {txType === 'salary' && <div className="grid grid-cols-1 gap-4 sm:grid-cols-2"><input type="number" value={netTakeHome} onChange={(e) => setNetTakeHome(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text" placeholder={amount || '0.00'} /><input type="number" value={employeePf} onChange={(e) => setEmployeePf(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2 text-sm text-text" placeholder="0.00" /></div>}
  <input type="text" value={note} onChange={(e) => setNote(e.target.value)} className="w-full rounded-lg border border-border bg-[#0a0f1c] px-3 py-2.5 text-sm text-text" placeholder="Description of the transaction..." />
  <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-text">Cancel</button><button type="submit" disabled={loadingAction} className="rounded-lg bg-cyan px-5 py-2 text-sm font-bold text-bg">{loadingAction ? 'Saving...' : 'Add Transaction'}</button></div></form></div>;
}
