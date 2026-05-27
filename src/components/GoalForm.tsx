'use client';
import { useEffect, useState } from 'react';
import { Account, Goal } from '@/lib/types';

export function GoalForm({ open, onClose, onSubmit, accounts, editingGoal }: {open:boolean;onClose:()=>void;onSubmit:(d:any)=>Promise<void>;accounts:Account[];editingGoal?:Goal;}) {
  const [form,setForm]=useState<any>({name:'',targetAmount:'',targetDate:'',priority:1});
  useEffect(()=>{setForm({name:editingGoal?.name||'',targetAmount:editingGoal?.targetAmount||'',targetDate:editingGoal?.targetDate?new Date(editingGoal.targetDate).toISOString().slice(0,10):'',priority:editingGoal?.priority||1});},[editingGoal,open]);
  if(!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"><form className="w-full max-w-lg space-y-3 rounded-xl bg-neutral-900 p-4" onSubmit={async e=>{e.preventDefault(); await onSubmit({...form,targetAmount:Number(form.targetAmount),targetDate:form.targetDate?new Date(form.targetDate):undefined,allocations:[]}); onClose();}}><h3 className="text-lg font-semibold">{editingGoal?'Edit':'Add'} Goal</h3><input className="w-full rounded bg-neutral-800 p-2" placeholder="Goal name" value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/><input className="w-full rounded bg-neutral-800 p-2" type="number" placeholder="Target amount" value={form.targetAmount} onChange={e=>setForm({...form,targetAmount:e.target.value})}/><input className="w-full rounded bg-neutral-800 p-2" type="date" value={form.targetDate} onChange={e=>setForm({...form,targetDate:e.target.value})}/><input className="w-full rounded bg-neutral-800 p-2" type="number" min={1} value={form.priority} onChange={e=>setForm({...form,priority:Number(e.target.value)})}/><div className="flex justify-end gap-2"><button type="button" className="rounded border px-3 py-2" onClick={onClose}>Cancel</button><button className="rounded bg-emerald-600 px-3 py-2">Save</button></div></form></div>;
}
