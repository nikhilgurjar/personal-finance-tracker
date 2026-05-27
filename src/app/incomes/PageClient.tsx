'use client';
import useSWR from 'swr';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { IncomeFormFull } from '@/components/IncomeFormFull';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { getIdToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

async function apiFetch(path:string,user:any,opts:RequestInit={}){const t=await getIdToken(user);return fetch(path,{...opts,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',...(opts.headers||{})}})}

export default function IncomesPage(){
 const {user,loading}=useAuthContext(); const router=useRouter();
 const [formOpen,setFormOpen]=useState(false); const [editingIncome,setEditingIncome]=useState<any>(null); const [selectedIncome,setSelectedIncome]=useState<any>(null); const [confirmOpen,setConfirmOpen]=useState(false);
 useEffect(()=>{if(!loading&&!user) router.push('/');},[loading,user,router]);
 const {data:incomes=[],isLoading,mutate}=useSWR(user?['incomes',user.uid]:null,async()=> (await apiFetch('/api/incomes',user)).json());
 const {data:accounts=[]}=useSWR(user?['accounts',user.uid]:null,async()=> (await apiFetch('/api/accounts',user)).json());
 if(!user) return null;
 return <ResponsiveLayout><main className='min-h-screen p-4'><h1 className='text-2xl font-bold'>Incomes</h1>{isLoading?'Loading...':<ul>{incomes.map((i:any)=><li key={i.id} className='flex justify-between border-b py-2'><span>{i.sourceName||'Income'}</span><span>Rs {i.amount}</span></li>)}</ul>}<button className='mt-3 rounded bg-emerald-600 px-3 py-2 text-white' onClick={()=>setFormOpen(true)}>Add Income</button><IncomeFormFull open={formOpen} onClose={()=>{setFormOpen(false);setEditingIncome(null);}} onSubmit={async(d)=>{if(editingIncome){await apiFetch(`/api/incomes/${editingIncome.id}`,user,{method:'PUT',body:JSON.stringify({...d,date:d.date instanceof Date?d.date.getTime():d.date})});}else{await apiFetch('/api/incomes',user,{method:'POST',body:JSON.stringify({...d,date:d.date instanceof Date?d.date.getTime():d.date})});} mutate();}} accounts={accounts} editingIncome={editingIncome}/><ConfirmDialog open={confirmOpen} title='Delete Income' message='Delete this income?' onConfirm={async()=>{if(selectedIncome){await apiFetch(`/api/incomes/${selectedIncome.id}`,user,{method:'DELETE'}); mutate();} setConfirmOpen(false);}} onCancel={()=>setConfirmOpen(false)} loading={false}/></main></ResponsiveLayout>
}

