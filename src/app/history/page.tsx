'use client';
import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { TimelineView } from '@/components/TimelineView';
import useSWR from 'swr';
import { getIdToken } from '@/lib/auth';
import { useRouter } from 'next/navigation';

export default function HistoryPage(){
 const {user,loading}=useAuthContext(); const router=useRouter(); const [search,setSearch]=useState('');
 useEffect(()=>{if(!loading&&!user) router.push('/');},[loading,user,router]);
 const {data:auditLogs=[],isLoading}=useSWR(user?['auditLogs',user.uid]:null,async()=>{const t=await getIdToken(user); const r=await fetch('/api/audit-logs',{headers:{Authorization:`Bearer ${t}`}}); return r.ok?r.json():[];});
 if(!user) return null;
 const events=auditLogs.filter((l:any)=>!search||JSON.stringify(l).toLowerCase().includes(search.toLowerCase())).map((l:any)=>({id:l.id,date:l.at||l.timestamp,title:`${l.action} ${l.entity}`,subtitle:l.after?.name||l.entityId,amount:l.after?.amount||l.before?.amount,type:'expense'}));
 return <ResponsiveLayout><main className='min-h-screen p-4'><h1 className='text-2xl font-bold'>History</h1><input className='mt-2 rounded border p-2' placeholder='Search' value={search} onChange={e=>setSearch(e.target.value)} />{isLoading?'Loading...':<TimelineView events={events} emptyMessage='No history'/>}</main></ResponsiveLayout>
}
