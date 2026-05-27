'use client';
import { Goal, Account } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

export function GoalDetails({ goal, open, onClose, onEdit, onDelete, accounts }: {goal:Goal|null;open:boolean;onClose:()=>void;onEdit:(g:Goal)=>void;onDelete:(g:Goal)=>void;accounts:Account[];}) {
  if (!goal || !open) return null;
  const totalAllocated = goal.allocations.reduce((s, a) => s + a.amount, 0);
  const progress = Math.min((totalAllocated / goal.targetAmount) * 100, 100);
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'><div className='w-full max-w-3xl rounded-xl bg-neutral-900 p-4'><div className='mb-3 flex items-center justify-between'><h3 className='text-xl font-semibold'>{goal.name}</h3><div className='flex gap-2'><button onClick={()=>onEdit(goal)} className='rounded border px-2 py-1'>Edit</button><button onClick={()=>onDelete(goal)} className='rounded border border-red-500 px-2 py-1 text-red-400'>Delete</button><button onClick={onClose}>Close</button></div></div><div className='mb-3 h-2 w-full overflow-hidden rounded bg-neutral-800'><div className='h-full bg-emerald-500' style={{width:`${progress}%`}} /></div><p className='mb-3 text-sm text-neutral-400'>{Math.round(progress)}% funded • {formatCurrency(totalAllocated)} / {formatCurrency(goal.targetAmount)}</p><ul className='space-y-2'>{goal.allocations.map((a,i)=><li key={i} className='flex justify-between rounded border border-neutral-800 p-2'><span>{accounts.find(x=>x.id===a.accountId)?.name||'Linked Instrument'}</span><span>{formatCurrency(a.amount)}</span></li>)}</ul></div></div>;
}

