'use client';
import { useState } from 'react';
import { Account } from '@/lib/types';
import { useAuthContext } from './AuthProvider';
import useSWR from 'swr';
import { getIdToken } from '@/lib/auth';

export function AccountDetails({ account, onClose }: { account: Account | null; onClose: () => void; }) {
  const [tab, setTab] = useState<'overview'|'tx'|'schedules'>('overview');
  const { user } = useAuthContext();
  const { data: transactions = [] } = useSWR(account&&user?['transactions',account.id,user.uid]:null,async()=>{const t=await getIdToken(user);const r=await fetch(`/api/transactions?accountId=${account?.id}`,{headers:{Authorization:`Bearer ${t}`}});return r.ok?r.json():[];});
  const { data: schedules = [] } = useSWR(account&&user?['schedules',account.id,user.uid]:null,async()=>{const t=await getIdToken(user);const r=await fetch(`/api/schedules?accountId=${account?.id}`,{headers:{Authorization:`Bearer ${t}`}});return r.ok?r.json():[];});
  if(!account) return null;
  return <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4'><div className='w-full max-w-3xl rounded-xl bg-neutral-900 p-4'><div className='mb-3 flex items-center justify-between'><h3 className='text-lg font-semibold'>{account.name}</h3><button onClick={onClose}>Close</button></div><div className='mb-3 flex gap-2'><button onClick={()=>setTab('overview')}>Overview</button><button onClick={()=>setTab('tx')}>Transactions</button><button onClick={()=>setTab('schedules')}>Schedules</button></div>{tab==='overview'&&<div>Balance: Rs {account.currentBalance||0}</div>}{tab==='tx'&&<ul>{transactions.map((t:any)=><li key={t.id}>{new Date(t.date).toLocaleDateString('en-IN')} - Rs {t.amount}</li>)}</ul>}{tab==='schedules'&&<ul>{schedules.map((s:any)=><li key={s.id}>{s.name}</li>)}</ul>}</div></div>;
}

