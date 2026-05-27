'use client';
import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { getIdToken } from '@/lib/auth';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';

async function apiFetch(path:string,user:any,opts:RequestInit={}){const t=await getIdToken(user); return fetch(path,{...opts,headers:{Authorization:`Bearer ${t}`,'Content-Type':'application/json',...(opts.headers||{})}})}

export function QuickAiAdd(){
 const {user}=useAuthContext(); const router=useRouter(); const [inputText,setInputText]=useState(''); const [parsing,setParsing]=useState(false); const [error,setError]=useState('');
 const {data:narrativeData,isLoading}=useSWR(user?['ai-narrative',user.uid]:null,async()=>{const r=await apiFetch('/api/ai/dashboard-narrative',user); return r.ok?r.json():null;});
 return <div className='mb-4'>{isLoading?<div>Loading insight...</div>:narrativeData?.narrative&&<div className='mb-2 rounded border p-2 text-sm'>{narrativeData.narrative}</div>}<form onSubmit={async e=>{e.preventDefault(); if(!inputText.trim()||parsing) return; setParsing(true);setError(''); try{const r=await apiFetch('/api/ai/parse-transaction',user,{method:'POST',body:JSON.stringify({text:inputText})}); if(!r.ok) throw new Error('Failed'); const p=await r.json(); setInputText(''); const d=(p.type||'expense')==='income'?'/incomes':'/expenses'; router.push(`${d}?prefill=${encodeURIComponent(JSON.stringify(p))}`);}catch(err:any){setError(err.message||'Parse failed');}finally{setParsing(false);}}}><input className='w-full rounded border p-2' value={inputText} onChange={e=>setInputText(e.target.value)} placeholder="Quick Add with AI"/>{error&&<p className='mt-1 text-xs text-red-500'>{error}</p>}</form></div>;
}
