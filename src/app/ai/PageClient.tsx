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

  return (
    <ResponsiveLayout>
      <main className="min-h-screen p-4 md:p-8">
        <h1 className="text-2xl font-bold text-text">AI Insights</h1>
        
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Select Month</label>
            <input
              type="month"
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-text placeholder-text-dim focus:border-cyan focus:outline-none transition-colors"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Monthly Review</label>
            <div className="rounded-lg border border-border bg-card p-4 min-h-24 text-text">
              {isLoading ? (
                <span className="text-text-muted">Loading review...</span>
              ) : (
                data?.review || 'No review available'
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-text-muted mb-2">Ask a Question</label>
            <textarea
              className="w-full rounded-lg border border-border bg-card px-3 py-2 text-text placeholder-text-dim focus:border-cyan focus:outline-none transition-colors"
              rows={3}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask something about your finances..."
            />
          </div>

          <button
            className="w-full rounded-lg bg-cyan text-bg px-4 py-2 font-semibold hover:bg-cyan/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            disabled={asking}
            onClick={async () => {
              setAsking(true);
              try {
                const res = await authedJson<any>(user, '/api/ai/query', {
                  method: 'POST',
                  body: JSON.stringify({ question }),
                });
                setAnswer(res.answer || '');
              } finally {
                setAsking(false);
              }
            }}
          >
            {asking ? 'Asking...' : 'Ask'}
          </button>

          {answer && (
            <div>
              <label className="block text-sm font-medium text-text-muted mb-2">Answer</label>
              <div className="rounded-lg border border-border bg-card p-4 text-text whitespace-pre-wrap">
                {answer}
              </div>
            </div>
          )}
        </div>
      </main>
    </ResponsiveLayout>
  );
}

