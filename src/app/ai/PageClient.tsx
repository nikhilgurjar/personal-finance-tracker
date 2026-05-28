'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { Send, Loader2, CheckCircle2, XCircle, Sparkles, HelpCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  variant?: 'success' | 'error';
}

/** Shape returned inside __ACTION__:{...} */
interface PendingAction {
  intent: 'add_goal' | 'add_investment' | 'add_schedule' | 'add_transaction';
  fields: Record<string, string | number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);

/** Convert YYYY-MM-DD to Unix ms timestamp */
const toMs = (dateStr: string): number => new Date(dateStr).getTime();

/** rrule string from plain frequency */
const toRRule = (freq: string): string => ({
  daily:     'FREQ=DAILY',
  weekly:    'FREQ=WEEKLY;BYDAY=MO',
  monthly:   'FREQ=MONTHLY;BYMONTHDAY=1',
  quarterly: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1',
  yearly:    'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1',
}[freq] ?? 'FREQ=MONTHLY;BYMONTHDAY=1');

/** Instrument class from type */
const toInstrumentClass = (type: string): string =>
  ['fd', 'rd', 'bond'].includes(type) ? 'fixed_return' :
  ['stock', 'mf', 'etf'].includes(type) ? 'market_linked' : 'govt_scheme';

/** Parse __ACTION__:{...} from AI response, return clean text + action */
const parseAIResponse = (raw: string): { text: string; action: PendingAction | null } => {
  const match = raw.match(/__ACTION__:(\{[\s\S]*?\})\s*$/);
  if (!match) return { text: raw.trim(), action: null };

  let action: PendingAction | null = null;
  try {
    action = JSON.parse(match[1]) as PendingAction;
  } catch {
    /* malformed JSON — ignore action, show full text */
  }

  const text = raw.replace(/__ACTION__:[\s\S]*$/, '').trim();
  return { text, action };
};

/** Human-readable label for a field key */
const fieldLabel = (key: string): string =>
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiPage() {
  const { user } = useAuthContext();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content:
        'Hi! 👋 I\'m your Finance AI Assistant.\n\nI can help you:\n📝 Add Goals — set a savings target\n💎 Add Investments — FD, MF, stocks, PPF…\n📅 Schedule Payments — recurring bills or SIPs\n💳 Log Transactions — income or expenses\n\nJust tell me what you\'d like to do in plain language!',
      timestamp: Date.now(),
    },
  ]);

  /** Full conversation history sent to the AI on every turn */
  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  /** Action parsed from AI response — shown as inline confirm card */
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useSWR(user ? '/api/accounts' : null, fetcher);

  // Scroll to bottom whenever messages or pending action changes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction, isLoading]);

  // ── Auth token ──────────────────────────────────────────────────────────────
  const getToken = useCallback(async (): Promise<string> => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  // ── Add a message to the visible chat ──────────────────────────────────────
  const pushMessage = useCallback(
    (role: 'user' | 'assistant', content: string, variant?: 'success' | 'error') => {
      setMessages((prev) => [...prev, { id: uid(), role, content, timestamp: Date.now(), variant }]);
    },
    []
  );

  // ── Send user message → call AI ────────────────────────────────────────────
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading || isSubmitting) return;

    setInput('');
    pushMessage('user', text);

    const newHistory = [...history, { role: 'user', content: text }];
    setHistory(newHistory);
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!res.ok) throw new Error(`AI service returned ${res.status}`);

      const { content }: { content: string } = await res.json();
      const { text: displayText, action } = parseAIResponse(content);

      if (displayText) pushMessage('assistant', displayText);

      // Record the raw AI response in history (includes __ACTION__ if present)
      setHistory((prev) => [...prev, { role: 'assistant', content }]);

      if (action) {
        // Clear any previous pending action and surface the new one
        setPendingAction(action);
      }
    } catch (err) {
      pushMessage('assistant', '❌ Couldn\'t reach the AI right now. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── User confirms the pending action → create entity ───────────────────────
  const handleConfirm = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);

    try {
      const token = await getToken();
      const { intent, fields } = pendingAction;

      let endpoint = '';
      let body: Record<string, unknown> = {};

      switch (intent) {
        case 'add_goal':
          endpoint = '/api/goals';
          body = {
            name: fields.name,
            targetAmount: Number(fields.targetAmount),
            targetDate: toMs(String(fields.targetDate)),
            priority: Number(fields.priority),
          };
          break;

        case 'add_investment':
          endpoint = '/api/instruments';
          body = {
            name: fields.name,
            type: fields.type,
            principal: Number(fields.principal),
            currentValue: Number(fields.currentValue),
            openedAt: toMs(String(fields.openedAt)),
            provider: fields.provider,
            interestRate: fields.interestRate ? Number(fields.interestRate) : undefined,
            instrumentClass: toInstrumentClass(String(fields.type)),
          };
          break;

        case 'add_schedule': {
          endpoint = '/api/schedules';
          const firstAccount = (accounts as { id: string }[])[0];
          body = {
            name: fields.name,
            rrule: toRRule(String(fields.frequency)),
            template: {
              amount: Number(fields.amount),
              type: fields.type,
              currency: 'INR',
              fromAccountId: firstAccount?.id ?? '',
              toAccountId: firstAccount?.id ?? '',
              note: fields.note ?? '',
            },
            nextRunAt: Date.now(),
            status: 'active',
          };
          break;
        }

        case 'add_transaction': {
          endpoint = '/api/transactions';
          const firstAccount = (accounts as { id: string }[])[0];
          body = {
            amount: Number(fields.amount),
            type: fields.type,
            category: fields.category,
            date: toMs(String(fields.date)),
            note: fields.note ?? '',
            accountId: firstAccount?.id ?? '',
            currency: 'INR',
          };
          break;
        }
      }

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(res.statusText);

      const successText = `✅ Done! Your ${intent.replace('add_', '')} has been saved. Anything else I can help with?`;
      pushMessage('assistant', successText, 'success');
      setHistory((prev) => [...prev, { role: 'assistant', content: successText }]);
      setPendingAction(null);
    } catch (err) {
      const errText = `❌ Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}. Want to try again?`;
      pushMessage('assistant', errText, 'error');
      setPendingAction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── User wants to change something ─────────────────────────────────────────
  const handleCancel = () => {
    const msg = "No problem! What would you like to change?";
    pushMessage('assistant', msg);
    setHistory((prev) => [...prev, { role: 'assistant', content: msg }]);
    setPendingAction(null);
    inputRef.current?.focus();
  };

  // ── Quick-fill examples ─────────────────────────────────────────────────────
  const quickExamples = [
    { emoji: '🎯', label: 'Save 5L for a car by end of year' },
    { emoji: '💎', label: 'I opened an FD of 1L in SBI today' },
    { emoji: '📅', label: 'Schedule my Jio bill ₹999 monthly' },
    { emoji: '💳', label: 'Spent 2500 on groceries today' },
  ];

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <PageHeader title="AI Finance Assistant" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl flex flex-col h-[640px] overflow-hidden">

          {/* Message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={[
                    'max-w-[80%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed',
                    msg.role === 'user'
                      ? 'bg-cyan text-bg rounded-br-sm'
                      : msg.variant === 'success'
                        ? 'bg-green-500/10 border border-green-500/30 text-text rounded-bl-sm'
                        : msg.variant === 'error'
                          ? 'bg-red-500/10 border border-red-500/30 text-text rounded-bl-sm'
                          : 'bg-white/5 border border-border text-text rounded-bl-sm',
                  ].join(' ')}
                >
                  {msg.content}
                </div>
              </div>
            ))}

            {/* ── Inline confirmation card ── */}
            {pendingAction && !isSubmitting && (
              <div className="flex justify-start">
                <div className="max-w-[80%] bg-cyan/10 border border-cyan/40 rounded-2xl rounded-bl-sm p-4 space-y-3">
                  <p className="text-[11px] font-semibold text-cyan uppercase tracking-widest">
                    Ready to Save
                  </p>

                  {/* Field summary */}
                  <div className="space-y-1.5">
                    {Object.entries(pendingAction.fields).map(([key, val]) => (
                      <div key={key} className="flex gap-3 text-sm">
                        <span className="text-text-muted w-28 shrink-0 capitalize">
                          {fieldLabel(key)}
                        </span>
                        <span className="font-medium text-text">{String(val)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Action buttons */}
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleConfirm}
                      className="flex items-center gap-1.5 bg-cyan text-bg px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-cyan/90 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm &amp; Save
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 bg-white/5 border border-border text-text-muted px-4 py-1.5 rounded-lg text-sm hover:bg-white/10 active:scale-95 transition-all"
                    >
                      <XCircle className="w-4 h-4" />
                      Change
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Loading / submitting indicator ── */}
            {(isLoading || isSubmitting) && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-border px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-cyan" />
                  <span className="text-sm text-text-muted">
                    {isSubmitting ? 'Saving…' : 'Thinking…'}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* ── Input bar ── */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  pendingAction
                    ? "Say 'yes' to confirm, or describe what to change…"
                    : "Tell me what you'd like to do…"
                }
                className="flex-1 bg-[#0a0f1c] border border-border rounded-xl px-4 py-2.5 text-sm text-text placeholder-text-muted focus:outline-none focus:border-cyan transition-colors"
                disabled={isLoading || isSubmitting}
                autoComplete="off"
              />
              <button
                type="submit"
                disabled={isLoading || isSubmitting || !input.trim()}
                className="bg-cyan hover:bg-cyan/90 disabled:opacity-40 text-bg px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* ── Sidebar ─────────────────────────────────────────────────────── */}
        <div className="space-y-4">

          {/* Quick examples */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-text mb-3 flex items-center gap-2 text-sm">
              <Sparkles className="w-4 h-4 text-cyan" />
              Try saying…
            </h3>
            <div className="space-y-1">
              {quickExamples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => {
                    setInput(ex.label);
                    inputRef.current?.focus();
                  }}
                  className="block w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 transition-colors text-xs text-text-muted"
                >
                  {ex.emoji} &ldquo;{ex.label}&rdquo;
                </button>
              ))}
            </div>
          </div>

          {/* Natural language hints */}
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-text mb-3 flex items-center gap-2 text-sm">
              <HelpCircle className="w-4 h-4 text-cyan" />
              Natural Language
            </h3>
            <ul className="text-xs text-text-muted space-y-2">
              <li>
                <span className="text-text font-medium">Amounts</span>
                <br />
                1 lakh · 1L · 50k · 1.5L · 1 crore
              </li>
              <li>
                <span className="text-text font-medium">Dates</span>
                <br />
                end of June · 26 July · 1 month from now · end of year
              </li>
              <li>
                <span className="text-text font-medium">How it works</span>
                <br />
                I'll ask one question at a time, then show you a summary to confirm before saving anything.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}