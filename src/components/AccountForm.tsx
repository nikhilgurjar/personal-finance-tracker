'use client';
import { useEffect, useState } from 'react';
import { Account } from '@/lib/types';

export function AccountForm({ open, onClose, onSubmit, editingAccount }: {open:boolean;onClose:()=>void;onSubmit:(d:any)=>Promise<void>;editingAccount?:Account;}) {
  const [form, setForm] = useState<any>({ type: 'expense', subtype: '', name: '', institution: '', currency: 'INR', currentBalance: '' });
  useEffect(() => {
    if (editingAccount) {
      setForm({
        type: editingAccount.type || 'expense', subtype: editingAccount.subtype || '', name: editingAccount.name || '',
        institution: editingAccount.institution || '', currency: editingAccount.currency || 'INR', currentBalance: editingAccount.currentBalance ?? '',
      });
    } else if (open) {
      setForm({ type: 'expense', subtype: '', name: '', institution: '', currency: 'INR', currentBalance: '' });
    }
  }, [editingAccount, open]);
  if (!open) return null;
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'><form className='w-full max-w-lg space-y-3 rounded-xl bg-neutral-900 p-4' onSubmit={async e=>{e.preventDefault(); await onSubmit({...form,currentBalance:form.currentBalance===''?undefined:Number(form.currentBalance)}); onClose();}}><h3 className='text-lg font-semibold'>{editingAccount?'Edit':'Add'} Account</h3><select className='w-full rounded bg-neutral-800 p-2' value={form.type} onChange={e=>setForm({...form,type:e.target.value})}><option value='income'>Income</option><option value='expense'>Expense</option><option value='savings'>Savings</option></select><input className='w-full rounded bg-neutral-800 p-2' placeholder='Subtype' value={form.subtype} onChange={e=>setForm({...form,subtype:e.target.value})}/><input className='w-full rounded bg-neutral-800 p-2' placeholder='Name' value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/><input className='w-full rounded bg-neutral-800 p-2' placeholder='Institution' value={form.institution} onChange={e=>setForm({...form,institution:e.target.value})}/><input className='w-full rounded bg-neutral-800 p-2' placeholder='Currency' value={form.currency} onChange={e=>setForm({...form,currency:e.target.value})}/><input className='w-full rounded bg-neutral-800 p-2' type='number' placeholder='Current Balance' value={form.currentBalance} onChange={e=>setForm({...form,currentBalance:e.target.value})}/><div className='flex justify-end gap-2'><button type='button' className='rounded border px-3 py-2' onClick={onClose}>Cancel</button><button className='rounded bg-emerald-600 px-3 py-2'>Save</button></div></form></div>;
}

