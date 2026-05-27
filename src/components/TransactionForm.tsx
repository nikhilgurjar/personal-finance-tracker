'use client';
import { useEffect, useState } from 'react';
import { Account, TransactionFormData } from '@/lib/types';

interface TransactionFormProps {
  open?: boolean;
  onClose?: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  accounts: Account[];
  editingTransaction?: any;
  initialValues?: any;
}

export function TransactionForm({ open = true, onClose, onSubmit, accounts, editingTransaction, initialValues }: TransactionFormProps) {
  const [form, setForm] = useState<any>({ date: '', amount: '', fromAccountId: '', toAccountId: '', category: '', note: '', tags: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const src = editingTransaction || initialValues || {};
    setForm({
      date: src.date ? new Date(src.date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
      amount: src.amount || '', fromAccountId: src.fromAccountId || '', toAccountId: src.toAccountId || '',
      category: src.category || '', note: src.note || '', tags: (src.tags || []).join(', '),
    });
  }, [editingTransaction, initialValues, open]);

  if (!open) return null;

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form className="w-full max-w-xl space-y-3 rounded-xl bg-neutral-900 p-4" onSubmit={async (e)=>{e.preventDefault();setSaving(true);await onSubmit({ ...form, amount:Number(form.amount), date:new Date(form.date), tags:String(form.tags||'').split(',').map((t)=>t.trim()).filter(Boolean), currency:'INR', sourceBreakdown:[] });setSaving(false);onClose?.();}}><h3 className="text-lg font-semibold">{editingTransaction ? 'Edit' : 'Add'} Transaction</h3><input className="w-full rounded bg-neutral-800 p-2" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><input className="w-full rounded bg-neutral-800 p-2" type="number" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><select className="w-full rounded bg-neutral-800 p-2" value={form.fromAccountId} onChange={e=>setForm({...form,fromAccountId:e.target.value})}><option value="">From account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><select className="w-full rounded bg-neutral-800 p-2" value={form.toAccountId} onChange={e=>setForm({...form,toAccountId:e.target.value})}><option value="">To account</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><input className="w-full rounded bg-neutral-800 p-2" placeholder="Category" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}/><textarea className="w-full rounded bg-neutral-800 p-2" placeholder="Note" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/><div className="flex justify-end gap-2"><button type="button" className="rounded border px-3 py-2" onClick={onClose}>Cancel</button><button className="rounded bg-emerald-600 px-3 py-2" disabled={saving}>{saving?'Saving...':'Save'}</button></div></form></div>;
}
