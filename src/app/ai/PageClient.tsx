'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import {
  Send, Loader2, CheckCircle2, XCircle, Sparkles,
  HelpCircle, RotateCcw,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  variant?: 'success' | 'error';
}

interface PendingAction {
  intent: string;
  fields: Record<string, string | number>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const uid = () => Math.random().toString(36).slice(2);
const toMs = (d: string) => new Date(d).getTime();

const toRRule = (freq: string) =>
  ({ daily: 'FREQ=DAILY', weekly: 'FREQ=WEEKLY;BYDAY=MO',
     monthly: 'FREQ=MONTHLY;BYMONTHDAY=1',
     quarterly: 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1',
     yearly: 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1' }[freq]
    ?? 'FREQ=MONTHLY;BYMONTHDAY=1');

const toInstrumentClass = (type: string) =>
  ['fd', 'rd', 'bond'].includes(type) ? 'fixed_return' :
  ['stock', 'mf', 'etf'].includes(type) ? 'market_linked' : 'govt_scheme';

const parseAIResponse = (raw: string): { text: string; action: PendingAction | null } => {
  const match = raw.match(/__ACTION__:(\{[\s\S]*?\})\s*$/);
  if (!match) return { text: raw.trim(), action: null };
  let action: PendingAction | null = null;
  try { action = JSON.parse(match[1]); } catch { /* ignore malformed */ }
  const text = raw.replace(/__ACTION__:[\s\S]*$/, '').trim();
  return { text, action };
};

const fieldLabel = (key: string) =>
  key.replace(/([A-Z])/g, ' $1').replace(/^./, c => c.toUpperCase()).trim();

// ─── Component ───────────────────────────────────────────────────────────────

export default function AiPage() {
  const { user } = useAuthContext();

  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: '1', role: 'assistant', timestamp: Date.now(),
    content: "Hi! 👋 I'm your Finance AI Assistant.\n\nI can help you with:\n📝 Goals · 💎 Investments · 💳 Transactions\n📅 Schedules · 🏦 Loans · 📊 Budgets\n👥 People Ledger · 💾 Savings\n\nJust tell me what you'd like to do — in plain language!",
  }]);

  const [history, setHistory] = useState<{ role: string; content: string }[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { data: accounts = [] } = useSWR(user ? '/api/accounts' : null, fetcher);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, pendingAction, isLoading]);

  const getToken = useCallback(async () => {
    if (!user) throw new Error('Not authenticated');
    return user.getIdToken();
  }, [user]);

  const pushMessage = useCallback((
    role: 'user' | 'assistant',
    content: string,
    variant?: 'success' | 'error',
  ) => setMessages(prev => [...prev, { id: uid(), role, content, timestamp: Date.now(), variant }]), []);

  // ── Reset conversation ────────────────────────────────────────────────────
  const handleReset = () => {
    setHistory([]);
    setPendingAction(null);
    setInput('');
    pushMessage('assistant', "Conversation cleared! What would you like to do?");
  };

  // ── Send to AI ────────────────────────────────────────────────────────────
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
      const token = await getToken();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ messages: newHistory }),
      });

      if (!res.ok) throw new Error(`AI service returned ${res.status}`);
      const { content }: { content: string } = await res.json();

      const { text: displayText, action } = parseAIResponse(content);
      if (displayText) pushMessage('assistant', displayText);
      setHistory(prev => [...prev, { role: 'assistant', content }]);
      if (action) setPendingAction(action);
    } catch {
      pushMessage('assistant', '❌ Couldn\'t reach AI. Please try again.', 'error');
    } finally {
      setIsLoading(false);
      inputRef.current?.focus();
    }
  };

  // ── Confirm → create entity ───────────────────────────────────────────────
  const handleConfirm = async () => {
    if (!pendingAction) return;
    setIsSubmitting(true);

    try {
      const token = await getToken();
      const { intent, fields } = pendingAction;
      const firstAccount = (accounts as { id: string }[])[0];

      // Helper to find account id by name (case-insensitive partial match)
      const accountId = (name?: string): string => {
        if (!name) return firstAccount?.id ?? '';
        const match = (accounts as { id: string; name: string }[])
          .find(a => a.name.toLowerCase().includes(String(name).toLowerCase()));
        return match?.id ?? firstAccount?.id ?? '';
      };

      let endpoint = '';
      let body: Record<string, unknown> = {};

      switch (intent) {

        // ── Expense ────────────────────────────────────────────────────────
        case 'add_expense':
          endpoint = '/api/transactions';
          body = {
            amount: Number(fields.amount),
            type: 'expense',
            category: fields.category,
            date: toMs(String(fields.date)),
            fromAccountId: accountId(String(fields.fromAccountName ?? '')),
            paymentMethod: fields.paymentMethod ?? 'UPI',
            note: fields.note ?? '',
            currency: 'INR',
          };
          break;

        // ── Income ─────────────────────────────────────────────────────────
        case 'add_income':
          endpoint = '/api/transactions';
          body = {
            amount: Number(fields.amount),
            type: 'income',
            category: fields.category,
            date: toMs(String(fields.date)),
            toAccountId: accountId(String(fields.toAccountName ?? '')),
            sourceName: fields.sourceName ?? '',
            note: fields.note ?? '',
            currency: 'INR',
          };
          break;

        // ── Salary ─────────────────────────────────────────────────────────
        case 'add_salary':
          endpoint = '/api/transactions';
          body = {
            amount: Number(fields.amount),
            type: 'salary',
            date: toMs(String(fields.date)),
            toAccountId: accountId(String(fields.toAccountName ?? '')),
            netTakeHome: Number(fields.netTakeHome),
            employeePF: fields.employeePF ? Number(fields.employeePF) : 0,
            salaryMonth: fields.salaryMonth,
            sourceName: fields.sourceName ?? '',
            note: fields.note ?? '',
            currency: 'INR',
          };
          break;

        // ── Transfer ───────────────────────────────────────────────────────
        case 'add_transfer':
          endpoint = '/api/transactions';
          body = {
            amount: Number(fields.amount),
            type: 'transfer',
            date: toMs(String(fields.date)),
            fromAccountId: accountId(String(fields.fromAccountName ?? '')),
            toAccountId: accountId(String(fields.toAccountName ?? '')),
            note: fields.note ?? '',
            currency: 'INR',
          };
          break;

        // ── Goal ───────────────────────────────────────────────────────────
        case 'add_goal':
          endpoint = '/api/goals';
          body = {
            name: fields.name,
            targetAmount: Number(fields.targetAmount),
            targetDate: toMs(String(fields.targetDate)),
            priority: Number(fields.priority),
            description: fields.description ?? '',
          };
          break;

        // ── Investment ─────────────────────────────────────────────────────
        case 'add_investment':
          endpoint = '/api/instruments';
          body = {
            name: fields.name,
            type: fields.type,
            principal: Number(fields.principal),
            currentValue: Number(fields.currentValue),
            openedAt: toMs(String(fields.openedAt)),
            provider: fields.provider,
            instrumentClass: toInstrumentClass(String(fields.type)),
            interestRate: fields.interestRate ? Number(fields.interestRate) : undefined,
            maturityDate: fields.maturityDate ? toMs(String(fields.maturityDate)) : undefined,
            units: fields.units ? Number(fields.units) : undefined,
            currentNAV: fields.currentNAV ? Number(fields.currentNAV) : undefined,
            folioNumber: fields.folioNumber ?? undefined,
            shares: fields.shares ? Number(fields.shares) : undefined,
            currentPrice: fields.currentPrice ? Number(fields.currentPrice) : undefined,
            note: fields.note ?? '',
          };
          break;

        // ── Schedule ───────────────────────────────────────────────────────
        case 'add_schedule':
          endpoint = '/api/schedules';
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
            nextRunAt: fields.startDate
              ? toMs(String(fields.startDate))
              : Date.now(),
            status: 'active',
          };
          break;

        // ── Loan ───────────────────────────────────────────────────────────
        case 'add_loan':
          endpoint = '/api/loans';
          body = {
            name: fields.name,
            lender: fields.lender,
            loanType: fields.loanType,
            loanAmount: Number(fields.loanAmount),
            outstandingAmount: Number(fields.loanAmount),
            interestRate: Number(fields.interestRate),
            tenureMonths: Number(fields.tenureMonths),
            startDate: toMs(String(fields.startDate)),
            note: fields.note ?? '',
            status: 'active',
          };
          break;

        // ── Budget ─────────────────────────────────────────────────────────
        case 'add_budget':
          endpoint = '/api/budgets';
          body = {
            categoryName: fields.categoryName,
            amount: Number(fields.amount),
            month: fields.month,
            note: fields.note ?? '',
          };
          break;

        // ── People Ledger ──────────────────────────────────────────────────
        case 'add_people_entry':
          endpoint = '/api/people';
          body = {
            personName: fields.personName,
            amount: Number(fields.amount),
            type: fields.type,            // "lent" | "borrowed"
            reason: fields.reason,
            date: toMs(String(fields.date)),
            note: fields.note ?? '',
            status: 'pending',
          };
          break;

        // ── Savings Instrument ─────────────────────────────────────────────
        case 'add_savings_instrument':
          endpoint = '/api/savings';
          body = {
            name: fields.name,
            provider: fields.provider,
            accountNumber: fields.accountNumber ?? '',
            openingBalance: Number(fields.openingBalance),
            currentValue: Number(fields.currentValue),
            interestRate: fields.interestRate ? Number(fields.interestRate) : undefined,
            maturityDate: fields.maturityDate
              ? toMs(String(fields.maturityDate))
              : undefined,
          };
          break;

        default:
          throw new Error(`Unknown intent: ${intent}`);
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

      const label = intent.replace('add_', '').replace('_', ' ');
      const successText = `✅ Done! Your ${label} has been saved. Anything else?`;
      pushMessage('assistant', successText, 'success');
      setHistory(prev => [...prev, { role: 'assistant', content: successText }]);
      setPendingAction(null);
    } catch (err) {
      const msg = `❌ Failed to save: ${err instanceof Error ? err.message : 'Unknown error'}. Want to try again?`;
      pushMessage('assistant', msg, 'error');
      setPendingAction(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    const msg = "No problem! What would you like to change?";
    pushMessage('assistant', msg);
    setHistory(prev => [...prev, { role: 'assistant', content: msg }]);
    setPendingAction(null);
    inputRef.current?.focus();
  };

  // ── Quick examples ────────────────────────────────────────────────────────
  const quickExamples = [
    { emoji: '🎯', label: 'Save 5L for a car by end of year' },
    { emoji: '💳', label: 'Spent 2500 on groceries via UPI' },
    { emoji: '💎', label: 'Opened FD of 1L in SBI at 7.5%' },
    { emoji: '📅', label: 'Schedule Jio bill ₹999 monthly' },
    { emoji: '🤝', label: 'Lent 5000 to Rahul for rent' },
    { emoji: '🏦', label: 'Got salary 80k from Acme Corp' },
    { emoji: '📊', label: 'Budget 10k for food this month' },
    { emoji: '➡️', label: 'Transfer 20k from HDFC to SBI' },
  ];

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <AppLayout>
      <PageHeader title="AI Finance Assistant" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* ── Chat panel ─────────────────────────────────────────────────── */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl flex flex-col h-[680px] overflow-hidden">

          {/* Toolbar */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-border">
            <span className="text-xs text-text-muted">AI-powered · Gemini</span>
            <button
              onClick={handleReset}
              title="Clear conversation"
              className="flex items-center gap-1 text-xs text-text-muted hover:text-text transition-colors px-2 py-1 rounded hover:bg-white/5"
            >
              <RotateCcw className="w-3 h-3" /> New chat
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={[
                  'max-w-[82%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap leading-relaxed',
                  msg.role === 'user'
                    ? 'bg-cyan text-bg rounded-br-sm'
                    : msg.variant === 'success'
                      ? 'bg-green-500/10 border border-green-500/30 text-text rounded-bl-sm'
                      : msg.variant === 'error'
                        ? 'bg-red-500/10 border border-red-500/30 text-text rounded-bl-sm'
                        : 'bg-white/5 border border-border text-text rounded-bl-sm',
                ].join(' ')}>
                  {msg.content}
                </div>
              </div>
            ))}

            {/* Inline confirmation card */}
            {pendingAction && !isSubmitting && (
              <div className="flex justify-start">
                <div className="max-w-[82%] bg-cyan/10 border border-cyan/40 rounded-2xl rounded-bl-sm p-4 space-y-3">
                  <p className="text-[10px] font-semibold text-cyan uppercase tracking-widest">
                    Ready to Save
                  </p>
                  <div className="space-y-1.5">
                    {Object.entries(pendingAction.fields)
                      .filter(([, v]) => v !== '' && v !== null && v !== undefined)
                      .map(([key, val]) => (
                        <div key={key} className="flex gap-3 text-sm">
                          <span className="text-text-muted w-32 shrink-0 capitalize">
                            {fieldLabel(key)}
                          </span>
                          <span className="font-medium text-text">{String(val)}</span>
                        </div>
                      ))}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={handleConfirm}
                      className="flex items-center gap-1.5 bg-cyan text-bg px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-cyan/90 active:scale-95 transition-all"
                    >
                      <CheckCircle2 className="w-4 h-4" /> Confirm
                    </button>
                    <button
                      onClick={handleCancel}
                      className="flex items-center gap-1.5 bg-white/5 border border-border text-text-muted px-4 py-1.5 rounded-lg text-sm hover:bg-white/10 active:scale-95 transition-all"
                    >
                      <XCircle className="w-4 h-4" /> Change
                    </button>
                  </div>
                </div>
              </div>
            )}

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

          {/* Input bar */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  pendingAction
                    ? "Say 'yes' to confirm or describe what to change…"
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
            <p className="text-[11px] text-text-muted mt-2 text-center">
              Say "cancel" or "start over" anytime to reset · "change X to Y" to edit a field
            </p>
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
            <div className="space-y-0.5">
              {quickExamples.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => { setInput(ex.label); inputRef.current?.focus(); }}
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
                <span className="text-text font-medium">Amounts</span><br />
                1 lakh · 1L · 50k · 1.5L · 1 crore
              </li>
              <li>
                <span className="text-text font-medium">Dates</span><br />
                end of June · 26 July · 1 month from now
              </li>
              <li>
                <span className="text-text font-medium">Corrections</span><br />
                "change amount to 2L" · "actually make it monthly"
              </li>
              <li>
                <span className="text-text font-medium">Reset</span><br />
                "cancel" · "start over" · "never mind"
              </li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}