'use client';
import { FormEvent, useEffect, useState } from 'react';
import { Account } from '@/lib/types';
import { authedJson } from '@/lib/apiClient';
import { useAuthContext } from '@/components/AuthProvider';

export function ExpenseFormFull({ open, onClose, onSubmit, accounts, categories, editingExpense }: {open:boolean;onClose:()=>void;onSubmit:(d:any)=>Promise<void>;accounts:Account[];categories:Array<{id:string;name:string;icon?:string}>;editingExpense?:any;}) {
  const { user } = useAuthContext();
  const [form, setForm] = useState<any>({ amount:'', date:new Date().toISOString().slice(0,10), category:'', expenseNature:'dynamic', fromAccountId:'', note:'', tags:'' });
  useEffect(()=>{ if(editingExpense){setForm({amount:String(editingExpense.amount||''),date:new Date(editingExpense.date).toISOString().slice(0,10),category:editingExpense.category||'',expenseNature:editingExpense.expenseNature||'dynamic',fromAccountId:editingExpense.fromAccountId||'',note:editingExpense.note||'',tags:(editingExpense.tags||[]).join(', ')})}},[editingExpense,open]);
  if(!open) return null;
  const handleSubmit = async (e:FormEvent)=>{e.preventDefault(); await onSubmit({...form,amount:Number(form.amount),date:new Date(form.date),tags:String(form.tags||'').split(',').map((t)=>t.trim()).filter(Boolean)}); onClose(); };
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form onSubmit={handleSubmit} className="w-full max-w-lg space-y-3 rounded-xl bg-neutral-900 p-4"><h3 className="text-lg font-semibold">{editingExpense?'Edit':'Add'} Expense</h3><input className="w-full rounded bg-neutral-800 p-2" type="number" placeholder="Amount" value={form.amount} onChange={e=>setForm({...form,amount:e.target.value})}/><input className="w-full rounded bg-neutral-800 p-2" type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})}/><select className="w-full rounded bg-neutral-800 p-2" value={form.category} onChange={e=>setForm({...form,category:e.target.value})}><option value="">Category</option>{categories.map(c=><option key={c.id} value={c.name}>{c.name}</option>)}</select><select className="w-full rounded bg-neutral-800 p-2" value={form.fromAccountId} onChange={e=>setForm({...form,fromAccountId:e.target.value})}><option value="">Paid from</option>{accounts.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><textarea className="w-full rounded bg-neutral-800 p-2" placeholder="Note" value={form.note} onChange={e=>setForm({...form,note:e.target.value})}/><div className="flex justify-end gap-2"><button type="button" className="rounded border px-3 py-2" onClick={onClose}>Cancel</button><button className="rounded bg-emerald-600 px-3 py-2">Save</button></div></form></div>;
}

