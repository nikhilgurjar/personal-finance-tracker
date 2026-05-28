'use client';

import { useState, useRef, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import AppLayout from '@/components/layout/AppLayout';
import PageHeader from '@/components/layout/PageHeader';
import useSWR from 'swr';
import { fetcher } from '@/lib/swr';
import { formatCurrency } from '@/lib/utils/currency';
import { Send, Loader, AlertCircle, CheckCircle, HelpCircle } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  action?: {
    type: string;
    data: any;
    status?: 'pending' | 'success' | 'error';
    message?: string;
  };
}

interface FormField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  options?: { label: string; value: string }[];
  value?: string;
  error?: string;
}

export default function AiPage() {
  const { user } = useAuthContext();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! 👋 I'm your Finance AI Assistant. I can help you:\n\n📝 **Add Goals** - Set financial targets\n💎 **Add Investments** - Track FDs, mutual funds, stocks, etc.\n💾 **Create Savings** - Set up savings instruments\n📅 **Schedule Payments** - Automate recurring transactions\n💳 **Log Transactions** - Record income/expenses\n\nWhat would you like to do?",
      timestamp: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [formFields, setFormFields] = useState<FormField[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch necessary data
  const { data: accounts = [] } = useSWR(user ? '/api/accounts' : null, fetcher);
  const { data: providers = [] } = useSWR('/api/providers', fetcher);
  const { data: platforms = [] } = useSWR('/api/platforms', fetcher);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const parseUserIntent = (text: string): string => {
    const lower = text.toLowerCase();

    if (
      lower.includes('goal') ||
      lower.includes('target') ||
      lower.includes('save')
    ) {
      return 'add_goal';
    }
    if (
      lower.includes('invest') ||
      lower.includes('mutual fund') ||
      lower.includes('fd') ||
      lower.includes('fixed deposit')
    ) {
      return 'add_investment';
    }
    if (
      lower.includes('schedule') ||
      lower.includes('recurring') ||
      lower.includes('automate')
    ) {
      return 'add_schedule';
    }
    if (lower.includes('transaction') || lower.includes('expense')) {
      return 'add_transaction';
    }
    if (lower.includes('savings') || lower.includes('savings account')) {
      return 'add_savings';
    }

    return 'unknown';
  };

  const generateFormFields = (intent: string, context: any): FormField[] => {
    switch (intent) {
      case 'add_goal':
        return [
          {
            name: 'name',
            label: 'Goal Name',
            type: 'text',
            required: true,
            value: context.name || '',
          },
          {
            name: 'targetAmount',
            label: 'Target Amount (INR)',
            type: 'number',
            required: true,
            value: context.targetAmount || '',
          },
          {
            name: 'targetDate',
            label: 'Target Date',
            type: 'date',
            required: true,
            value: context.targetDate || '',
          },
          {
            name: 'priority',
            label: 'Priority',
            type: 'select',
            required: true,
            options: [
              { label: 'Low', value: '1' },
              { label: 'Medium', value: '2' },
              { label: 'High', value: '3' },
            ],
            value: context.priority || '2',
          },
          {
            name: 'description',
            label: 'Description (optional)',
            type: 'textarea',
            required: false,
            value: context.description || '',
          },
        ];

      case 'add_investment':
        return [
          {
            name: 'name',
            label: 'Investment Name',
            type: 'text',
            required: true,
            value: context.name || '',
          },
          {
            name: 'type',
            label: 'Investment Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Fixed Deposit (FD)', value: 'fd' },
              { label: 'Recurring Deposit (RD)', value: 'rd' },
              { label: 'Mutual Fund', value: 'mf' },
              { label: 'Stock', value: 'stock' },
              { label: 'ETF', value: 'etf' },
              { label: 'Bond', value: 'bond' },
              { label: 'PPF', value: 'ppf' },
              { label: 'NPS', value: 'nps' },
            ],
            value: context.type || 'mf',
          },
          {
            name: 'principal',
            label: 'Principal Amount (INR)',
            type: 'number',
            required: true,
            value: context.principal || '',
          },
          {
            name: 'currentValue',
            label: 'Current Value (INR)',
            type: 'number',
            required: true,
            value: context.currentValue || '',
          },
          {
            name: 'openedAt',
            label: 'Date Opened',
            type: 'date',
            required: true,
            value: context.openedAt || new Date().toISOString().split('T')[0],
          },
          {
            name: 'provider',
            label: 'Provider/Bank Name',
            type: 'text',
            required: true,
            value: context.provider || '',
          },
          {
            name: 'interestRate',
            label: 'Interest Rate (%) [if fixed]',
            type: 'number',
            required: false,
            value: context.interestRate || '',
          },
        ];

      case 'add_schedule':
        return [
          {
            name: 'name',
            label: 'Schedule Name',
            type: 'text',
            required: true,
            value: context.name || '',
          },
          {
            name: 'amount',
            label: 'Amount (INR)',
            type: 'number',
            required: true,
            value: context.amount || '',
          },
          {
            name: 'frequency',
            label: 'Frequency',
            type: 'select',
            required: true,
            options: [
              { label: 'Daily', value: 'daily' },
              { label: 'Weekly', value: 'weekly' },
              { label: 'Monthly', value: 'monthly' },
              { label: 'Quarterly', value: 'quarterly' },
              { label: 'Yearly', value: 'yearly' },
            ],
            value: context.frequency || 'monthly',
          },
          {
            name: 'type',
            label: 'Type',
            type: 'select',
            required: true,
            options: [
              { label: 'Expense', value: 'expense' },
              { label: 'Income', value: 'income' },
              { label: 'Savings/Investment', value: 'savings' },
            ],
            value: context.type || 'expense',
          },
          {
            name: 'description',
            label: 'Description',
            type: 'textarea',
            required: false,
            value: context.description || '',
          },
        ];

      default:
        return [];
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Math.random().toString(),
      role: 'user',
      content: input,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Parse user intent
      const intent = parseUserIntent(input);

      if (intent === 'unknown') {
        const response: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          content:
            "I didn't quite understand that. I can help you with:\n- **Add Goals** (e.g., 'I want to set a goal to buy a car')\n- **Add Investments** (e.g., 'I invested in a mutual fund')\n- **Schedule Payments** (e.g., 'Setup monthly broadband bill')\n- **Log Transactions** (e.g., 'I spent 500 on groceries')\n\nWhat would you like to do?",
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, response]);
      } else {
        // Extract entities from user input
        const context = extractContext(input, intent);

        // Generate form fields
        const fields = generateFormFields(intent, context);
        setFormFields(fields);

        // Ask for missing required fields
        const missingFields = fields.filter(
          (f) => f.required && !f.value && f.type !== 'select'
        );

        let responseText = '';
        if (missingFields.length > 0) {
          responseText = `Great! I'll help you add a ${intent.replace('add_', '')}. \n\nI need a few details:\n\n`;
          missingFields.forEach((field, i) => {
            responseText += `${i + 1}. **${field.label}**\n`;
          });
          responseText += '\nPlease provide these details so I can create it for you.';
        } else {
          responseText = `Perfect! I have all the details. Let me create this ${intent.replace('add_', '')} for you...`;

          // Auto-submit if we have all fields
          setTimeout(() => {
            handleCreateEntity(intent, fields);
          }, 1000);
        }

        const response: Message = {
          id: Math.random().toString(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
        };
        setMessages((prev) => [...prev, response]);
      }
    } catch (error) {
      const errorMessage: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const extractContext = (text: string, intent: string): any => {
    const context: any = {};

    // Extract amounts
    const amountMatch = text.match(/₹?\s*(\d+(?:,\d{3})*(?:\.\d{2})?)/);
    if (amountMatch) {
      context.principal = context.targetAmount = context.amount = amountMatch[1]
        .replace(',', '')
        .replace('₹', '');
    }

    // Extract names/descriptions
    if (intent === 'add_goal') {
      const nameMatch = text.match(/goal (?:to|for|of) (.+?)(?:\.|$)/i);
      if (nameMatch) context.name = nameMatch[1];
    }

    if (intent === 'add_investment') {
      const typeMatches = ['mutual fund', 'fd', 'fixed deposit', 'stock', 'bond', 'ppf'];
      const matched = typeMatches.find((t) => text.toLowerCase().includes(t));
      if (matched) {
        context.type = matched === 'mutual fund' ? 'mf' : matched === 'fixed deposit' ? 'fd' : matched;
      }
    }

    if (intent === 'add_schedule') {
      const nameMatch = text.match(/(?:schedule|bill|payment) (?:for|of) (.+?)(?:\s*monthly|\s*daily|\.)?/i);
      if (nameMatch) context.name = nameMatch[1];
    }

    return context;
  };

  const handleCreateEntity = async (intent: string, fields: FormField[]) => {
    setIsLoading(true);
    try {
      const payload: any = {};

      fields.forEach((field) => {
        if (field.value) {
          if (field.type === 'number') {
            payload[field.name] = Number(field.value);
          } else if (field.type === 'date') {
            payload[field.name] = new Date(field.value).getTime();
          } else {
            payload[field.name] = field.value;
          }
        }
      });

      let endpoint = '';
      let method = 'POST';
      let body: any = payload;

      switch (intent) {
        case 'add_goal':
          endpoint = '/api/goals';
          body = {
            name: payload.name,
            targetAmount: payload.targetAmount,
            targetDate: payload.targetDate,
            priority: Number(payload.priority),
          };
          break;

        case 'add_investment':
          endpoint = '/api/instruments';
          body = {
            name: payload.name,
            type: payload.type,
            principal: payload.principal,
            currentValue: payload.currentValue,
            openedAt: payload.openedAt,
            provider: payload.provider,
            interestRate: payload.interestRate,
            instrumentClass: ['fd', 'rd', 'bond'].includes(payload.type)
              ? 'fixed_return'
              : ['stock', 'mf', 'etf'].includes(payload.type)
              ? 'market_linked'
              : 'govt_scheme',
          };
          break;

        case 'add_schedule':
          endpoint = '/api/schedules';
          const rrule = generateRRule(payload.frequency);
          body = {
            name: payload.name,
            rrule,
            template: {
              amount: payload.amount,
              type: payload.type,
              currency: 'INR',
              fromAccountId: accounts[0]?.id || '',
              toAccountId: accounts[0]?.id || '',
              note: payload.description,
            },
            nextRunAt: Date.now(),
            status: 'active',
          };
          break;
      }

      const response = await fetch(endpoint, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${await getToken()}`,
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        throw new Error(`Failed to create: ${response.statusText}`);
      }

      const result = await response.json();

      const successMessage: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `✅ Successfully created! I've added your ${intent.replace('add_', '')} to the system.`,
        timestamp: Date.now(),
        action: {
          type: intent,
          data: result,
          status: 'success',
          message: 'Created successfully',
        },
      };

      setMessages((prev) => [...prev, successMessage]);
      setFormFields([]);
    } catch (error) {
      const errorMessage: Message = {
        id: Math.random().toString(),
        role: 'assistant',
        content: `❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}. Please try again or fill in the details manually.`,
        timestamp: Date.now(),
        action: {
          type: intent,
          data: {},
          status: 'error',
          message: error instanceof Error ? error.message : 'Unknown error',
        },
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const generateRRule = (frequency: string): string => {
    switch (frequency) {
      case 'daily':
        return 'FREQ=DAILY';
      case 'weekly':
        return 'FREQ=WEEKLY;BYDAY=MO';
      case 'monthly':
        return 'FREQ=MONTHLY;BYMONTHDAY=1';
      case 'quarterly':
        return 'FREQ=MONTHLY;INTERVAL=3;BYMONTHDAY=1';
      case 'yearly':
        return 'FREQ=YEARLY;BYMONTH=1;BYMONTHDAY=1';
      default:
        return 'FREQ=MONTHLY;BYMONTHDAY=1';
    }
  };

  const getToken = async () => {
    if (!user) throw new Error('Not authenticated');
    return await user.getIdToken();
  };

  return (
    <AppLayout>
      <PageHeader title="AI Finance Assistant" />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Chat Section */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl overflow-hidden flex flex-col h-[600px]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                    msg.role === 'user'
                      ? 'bg-cyan text-bg'
                      : 'bg-white/5 border border-border text-text'
                  }`}
                >
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.action && (
                    <div className="mt-2 text-xs opacity-75">
                      {msg.action.status === 'success' && (
                        <CheckCircle className="w-4 h-4 inline mr-1" />
                      )}
                      {msg.action.status === 'error' && (
                        <AlertCircle className="w-4 h-4 inline mr-1" />
                      )}
                      {msg.action.message}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white/5 border border-border text-text px-4 py-2 rounded-lg">
                  <Loader className="w-4 h-4 animate-spin" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-border p-4">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Tell me what you want to do..."
                className="flex-1 bg-[#0a0f1c] border border-border rounded-lg px-3 py-2 text-sm text-text focus:outline-none focus:border-cyan"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-cyan hover:bg-cyan/95 text-bg px-4 py-2 rounded-lg font-bold flex items-center gap-2 disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>

        {/* Quick Actions & Tips */}
        <div className="space-y-4">
          <div className="bg-card border border-border rounded-xl p-4">
            <h3 className="font-bold text-text mb-3 flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-cyan" />
              Quick Examples
            </h3>
            <div className="space-y-2 text-xs text-text-muted">
              <button
                onClick={() => setInput('I want to set a goal to buy a car for ₹5 lakhs')}
                className="block w-full text-left p-2 rounded hover:bg-white/5 transition-colors"
              >
                💰 "Set a goal to buy a car"
              </button>
              <button
                onClick={() => setInput('I invested ₹50000 in a mutual fund')}
                className="block w-full text-left p-2 rounded hover:bg-white/5 transition-colors"
              >
                💎 "Add investment in mutual fund"
              </button>
              <button
                onClick={() => setInput('Schedule my broadband bill of ₹999 monthly')}
                className="block w-full text-left p-2 rounded hover:bg-white/5 transition-colors"
              >
                📅 "Schedule a recurring payment"
              </button>
              <button
                onClick={() => setInput('Create a savings account')}
                className="block w-full text-left p-2 rounded hover:bg-white/5 transition-colors"
              >
                💾 "Create savings account"
              </button>
            </div>
          </div>

          <div className="bg-green/10 border border-green/20 rounded-xl p-4">
            <h3 className="font-bold text-green mb-2">💡 Tips</h3>
            <ul className="text-xs text-text-muted space-y-1">
              <li>✓ Be specific with amounts</li>
              <li>✓ Mention the type/category</li>
              <li>✓ I'll ask for details I need</li>
              <li>✓ Confirm before creating</li>
            </ul>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

