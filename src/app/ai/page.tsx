'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Sparkles, MessageCircleQuestion, FileText } from 'lucide-react';
import { useMutation } from '@tanstack/react-query';
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

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const { data, isLoading, error } = useAuthedQuery<any>(
    user,
    ['monthly-review', user?.uid, month],
    `/api/ai/monthly-review?month=${month}`
  );

  const queryMutation = useMutation({
    mutationFn: async () => authedJson<any>(user, '/api/ai/query', {
      method: 'POST',
      body: JSON.stringify({ question }),
    }),
    onSuccess: (result) => setAnswer(result.answer),
  });

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <div className="min-h-screen bg-slate-50 p-4 md:p-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 flex items-center gap-2">
            <div className="rounded-lg bg-blue-600 p-2 text-white"><Sparkles size={18} /></div>
            <div>
              <h1 className="text-3xl font-extrabold text-slate-900">AI Insights</h1>
              <p className="text-sm text-slate-500">
                Optional Gemini-powered review and natural language finance questions.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="h-full rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <h2 className="text-xl font-extrabold text-slate-900">Monthly Review</h2>
              </div>
              <input type="month" value={month} onChange={(event) => setMonth(event.target.value)} className="mb-2 rounded-lg border border-slate-300 px-3 py-2 text-sm" />
                  {error && <div className="rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">Failed to load review.</div>}
                  {isLoading || !data ? (
                    <div className="h-[220px] animate-pulse rounded-lg bg-slate-200" />
                  ) : (
                    <>
                      {!data.aiEnabled && (
                        <div className="mb-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                          Add GEMINI_API_KEY to enable AI wording. Showing deterministic review.
                        </div>
                      )}
                      <pre className="m-0 whitespace-pre-wrap font-sans text-sm text-slate-700">
                        {data.review}
                      </pre>
                    </>
                  )}
            </div>

            <div className="h-full rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-2 flex items-center gap-2">
                <MessageCircleQuestion size={18} className="text-blue-600" />
                <h2 className="text-xl font-extrabold text-slate-900">Ask Your Finances</h2>
              </div>
              <textarea className="mb-2 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" rows={3} value={question} onChange={(event) => setQuestion(event.target.value)} />
              <button
                    onClick={() => queryMutation.mutate()}
                    disabled={queryMutation.isPending || !question.trim()}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                  >
                    Ask
                  </button>
                  {queryMutation.isError && <div className="mt-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-700">Failed to answer question.</div>}
                  {answer && (
                    <div className="mt-2 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm text-blue-700">
                      {answer}
                    </div>
                  )}
            </div>
          </div>
        </div>
      </div>
    </ResponsiveLayout>
  );
}
