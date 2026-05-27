'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { authedJson } from '@/lib/apiClient';

export default function AiPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [question, setQuestion] = useState('Can I repay INR 15000 this month?');
  const [answer, setAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);
  const { data, isLoading } = useAuthedQuery<any>(user, ['monthly-review', user?.uid, month], `/api/ai/monthly-review?month=${month}`);
  if (!user) return null;

  return <ResponsiveLayout><main className='min-h-screen p-4 md:p-8'><h1 className='text-2xl font-bold'>AI Insights</h1><input type='month' className='mt-3 rounded border px-2 py-1' value={month} onChange={e=>setMonth(e.target.value)} /><div className='mt-3 rounded border p-3'>{isLoading ? 'Loading review...' : (data?.review || 'No review')}</div><textarea className='mt-3 w-full rounded border p-2' rows={3} value={question} onChange={e=>setQuestion(e.target.value)} /><button className='mt-2 rounded bg-blue-600 px-3 py-2 text-white' disabled={asking} onClick={async ()=>{setAsking(true); try { const res=await authedJson<any>(user,'/api/ai/query',{method:'POST',body:JSON.stringify({question})}); setAnswer(res.answer||''); } finally { setAsking(false); }}}>Ask</button>{answer && <div className='mt-2 rounded border p-2'>{answer}</div>}</main></ResponsiveLayout>;
}
