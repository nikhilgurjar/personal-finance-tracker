'use client';

import { useEffect, useState } from 'react';
import { Loan } from '@/lib/types';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { useAuthContext } from '@/components/AuthProvider';

export function RepaymentForm({ open, onClose, onSubmit, loan, personName, loanType, outstandingAmount, currency }: {open:boolean;onClose:()=>void;onSubmit:(d:any)=>Promise<void>;loan?:Loan|null;personName?:string;loanType?:Loan['loanType'];outstandingAmount?:number;currency?:string;}) {
  const { user } = useAuthContext();
  const effectivePersonName = personName || loan?.personName || '';
  const effectiveLoanType = loanType || loan?.loanType;
  const effectiveOutstanding = outstandingAmount ?? loan?.outstandingAmount ?? 0;
  const effectiveCurrency = currency || loan?.currency || 'INR';
  const [amount, setAmount] = useState(''); const [date, setDate] = useState(new Date().toISOString().split('T')[0]); const [accountId, setAccountId] = useState(''); const [note, setNote] = useState(''); const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  const { data: accounts = [] } = useAuthedQuery(user, ['accounts', user?.uid], '/api/accounts');
  useEffect(() => { if (open) { setAmount(''); setDate(new Date().toISOString().split('T')[0]); setAccountId(''); setNote(''); setError(''); } }, [open]);
  if (!open || !effectivePersonName || !effectiveLoanType) return null;
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'><form className='w-full max-w-md space-y-3 rounded-xl bg-neutral-900 p-4' onSubmit={async e=>{e.preventDefault();const n=Number(amount); if(!n||!accountId){setError('Amount and account required');return;} if(n>effectiveOutstanding){setError('Repayment exceeds outstanding');return;} try{setLoading(true);setError('');await onSubmit({repayment:{personName:effectivePersonName,loanType:effectiveLoanType,amount:n,currency:effectiveCurrency,date:new Date(date).getTime(),accountId,note}}); onClose();}catch(err:any){setError(err.message||'Failed');}finally{setLoading(false);}}}><h3 className='text-lg font-semibold'>Record Repayment</h3><p className='text-sm text-neutral-400'>Against <strong>{effectivePersonName}</strong>. Outstanding: INR {effectiveOutstanding.toLocaleString('en-IN')}</p>{error&&<p className='text-sm text-red-400'>{error}</p>}<input className='w-full rounded bg-neutral-800 p-2' type='number' value={amount} onChange={e=>setAmount(e.target.value)} placeholder='Amount' required/><input className='w-full rounded bg-neutral-800 p-2' type='date' value={date} onChange={e=>setDate(e.target.value)} required/><select className='w-full rounded bg-neutral-800 p-2' value={accountId} onChange={e=>setAccountId(e.target.value)} required><option value=''>Select account</option>{(accounts as any[]).map((a:any)=><option key={a.id} value={a.id}>{a.name}</option>)}</select><textarea className='w-full rounded bg-neutral-800 p-2' rows={2} placeholder='Note' value={note} onChange={e=>setNote(e.target.value)} /><div className='flex justify-end gap-2'><button type='button' className='rounded border px-3 py-2' onClick={onClose}>Cancel</button><button className='rounded bg-emerald-600 px-3 py-2' disabled={loading}>{loading?'Saving...':'Save'}</button></div></form></div>;
}

