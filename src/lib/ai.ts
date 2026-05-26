import { db } from './firebaseAdmin';
import { generateGeminiText, parseJsonObject } from './gemini';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiInsight {
  type: 'spending' | 'budget' | 'goal' | 'savings' | 'alert' | 'loan';
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'success' | 'critical';
  metric?: number;
  trend?: 'up' | 'down' | 'flat';
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface FinancialContext {
  accounts: Array<{ id: string; name: string; type: string; subtype?: string; currentBalance?: number }>;
  totalBalance: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  monthlySavings: number;
  activeLoans: Array<{ personName: string; outstandingAmount: number; loanType: string }>;
  goals: Array<{ name: string; targetAmount: number; currentAmount: number; targetDate?: number }>;
  budgets: Array<{ accountId: string; monthlyAmount: number; currentAmount: number; month: string }>;
  activeSchedules: number;
  recentTransactions: Array<{ amount: number; type: string; category?: string; note?: string; date: number }>;
  topCategories: Array<{ category: string; total: number }>;
}

// ─── Context Builder ──────────────────────────────────────────────────────────

export async function buildFinancialContext(userId: string): Promise<FinancialContext> {
  const userRef = db.collection('users').doc(userId);
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const [
    accountsSnap,
    txSnap,
    loansSnap,
    goalsSnap,
    budgetsSnap,
    schedulesSnap,
  ] = await Promise.all([
    userRef.collection('accounts').get(),
    userRef.collection('transactions').where('date', '>=', startOfMonth).orderBy('date', 'desc').limit(100).get(),
    userRef.collection('loans').where('status', '==', 'active').get(),
    userRef.collection('goals').get(),
    userRef.collection('budgets').where('month', '==', currentMonth).get(),
    userRef.collection('schedules').where('status', '==', 'active').get(),
  ]);

  const accounts = accountsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  const transactions = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  const loans = loansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  const goals = goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
  const budgets = budgetsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

  const totalBalance = accounts.reduce((s, a) => s + Number(a.currentBalance || 0), 0);
  const monthlyIncome = transactions
    .filter((t: any) => t.type === 'income' || t.type === 'salary')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const monthlyExpenses = transactions
    .filter((t: any) => t.type === 'expense')
    .reduce((s, t) => s + Number(t.amount || 0), 0);
  const monthlySavings = transactions
    .filter((t: any) => t.type === 'savings')
    .reduce((s, t) => s + Number(t.amount || 0), 0);

  // Calculate top spending categories
  const categoryMap: Record<string, number> = {};
  transactions
    .filter((t: any) => t.type === 'expense')
    .forEach((t: any) => {
      const cat = t.category || 'Uncategorized';
      categoryMap[cat] = (categoryMap[cat] || 0) + Number(t.amount || 0);
    });
  const topCategories = Object.entries(categoryMap)
    .map(([category, total]) => ({ category, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return {
    accounts: accounts.map(a => ({
      id: a.id,
      name: a.name,
      type: a.type,
      subtype: a.subtype,
      currentBalance: a.currentBalance,
    })),
    totalBalance,
    monthlyIncome,
    monthlyExpenses,
    monthlySavings,
    activeLoans: loans.map(l => ({
      personName: l.personName,
      outstandingAmount: l.outstandingAmount,
      loanType: l.loanType,
    })),
    goals: goals.map(g => ({
      name: g.name,
      targetAmount: g.targetAmount,
      currentAmount: g.currentAmount || 0,
      targetDate: g.targetDate,
    })),
    budgets: budgets.map(b => ({
      accountId: b.accountId,
      monthlyAmount: b.monthlyAmount,
      currentAmount: b.currentAmount,
      month: b.month,
    })),
    activeSchedules: schedulesSnap.size,
    recentTransactions: transactions.slice(0, 15).map(t => ({
      amount: t.amount,
      type: t.type,
      category: t.category,
      note: t.note,
      date: t.date,
    })),
    topCategories,
  };
}

// ─── Insights Generator ───────────────────────────────────────────────────────

export async function generateInsights(userId: string): Promise<{ insights: AiInsight[]; aiEnabled: boolean }> {
  const ctx = await buildFinancialContext(userId);

  // Build deterministic insights first (always available)
  const deterministic: AiInsight[] = [];

  // Budget alerts
  ctx.budgets.forEach(b => {
    const pct = b.monthlyAmount > 0 ? (b.currentAmount / b.monthlyAmount) * 100 : 0;
    if (pct >= 90) {
      deterministic.push({
        type: 'budget',
        title: 'Budget Nearly Exhausted',
        description: `You've used ${pct.toFixed(0)}% of your budget this month (₹${b.currentAmount.toLocaleString('en-IN')} / ₹${b.monthlyAmount.toLocaleString('en-IN')}).`,
        severity: pct >= 100 ? 'critical' : 'warning',
        metric: pct,
        trend: 'up',
      });
    }
  });

  // Savings rate
  if (ctx.monthlyIncome > 0) {
    const savingsRate = ((ctx.monthlyIncome - ctx.monthlyExpenses) / ctx.monthlyIncome) * 100;
    deterministic.push({
      type: 'savings',
      title: 'Monthly Savings Rate',
      description: `You're saving ${savingsRate.toFixed(1)}% of your income this month. ${savingsRate >= 30 ? 'Excellent work!' : savingsRate >= 15 ? 'Good progress.' : 'Consider cutting discretionary spending.'}`,
      severity: savingsRate >= 30 ? 'success' : savingsRate >= 15 ? 'info' : 'warning',
      metric: savingsRate,
      trend: savingsRate >= 20 ? 'up' : 'down',
    });
  }

  // Goal progress
  ctx.goals.forEach(g => {
    const pct = g.targetAmount > 0 ? (g.currentAmount / g.targetAmount) * 100 : 0;
    if (pct >= 80) {
      deterministic.push({
        type: 'goal',
        title: `Almost There: ${g.name}`,
        description: `You're ${pct.toFixed(0)}% toward your goal of ₹${g.targetAmount.toLocaleString('en-IN')}.`,
        severity: 'success',
        metric: pct,
        trend: 'up',
      });
    } else if (g.targetDate && g.targetDate < Date.now() + 30 * 86400000) {
      deterministic.push({
        type: 'goal',
        title: `Deadline Approaching: ${g.name}`,
        description: `Only ${Math.max(0, Math.ceil((g.targetDate - Date.now()) / 86400000))} days left. ₹${(g.targetAmount - g.currentAmount).toLocaleString('en-IN')} remaining.`,
        severity: 'warning',
        metric: pct,
        trend: 'flat',
      });
    }
  });

  // Active loans
  const totalLoanOutstanding = ctx.activeLoans.reduce((s, l) => s + l.outstandingAmount, 0);
  if (totalLoanOutstanding > 0) {
    deterministic.push({
      type: 'loan',
      title: 'Outstanding Loans',
      description: `You have ₹${totalLoanOutstanding.toLocaleString('en-IN')} in active loans across ${ctx.activeLoans.length} ${ctx.activeLoans.length === 1 ? 'loan' : 'loans'}.`,
      severity: totalLoanOutstanding > ctx.totalBalance * 0.5 ? 'warning' : 'info',
      metric: totalLoanOutstanding,
    });
  }

  // Top spending
  if (ctx.topCategories.length > 0) {
    const top = ctx.topCategories[0];
    deterministic.push({
      type: 'spending',
      title: `Top Spending: ${top.category}`,
      description: `₹${top.total.toLocaleString('en-IN')} spent on ${top.category} this month${ctx.monthlyExpenses > 0 ? ` (${((top.total / ctx.monthlyExpenses) * 100).toFixed(0)}% of total expenses)` : ''}.`,
      severity: 'info',
      metric: top.total,
    });
  }

  // Net cash flow
  const netFlow = ctx.monthlyIncome - ctx.monthlyExpenses - ctx.monthlySavings;
  deterministic.push({
    type: 'spending',
    title: 'Net Cash Flow',
    description: `This month: ₹${ctx.monthlyIncome.toLocaleString('en-IN')} income, ₹${ctx.monthlyExpenses.toLocaleString('en-IN')} expenses, ₹${ctx.monthlySavings.toLocaleString('en-IN')} saved. Net: ${netFlow >= 0 ? '+' : ''}₹${netFlow.toLocaleString('en-IN')}.`,
    severity: netFlow >= 0 ? 'success' : 'critical',
    metric: netFlow,
    trend: netFlow >= 0 ? 'up' : 'down',
  });

  // Try AI-enhanced insights
  try {
    const prompt = `You are a personal finance advisor. Analyze this financial data and return a JSON array of 2-3 additional insights.
Each insight object must have: type (spending|budget|goal|savings|alert), title (short), description (1-2 sentences, direct "you" language), severity (info|warning|success|critical).

Financial Data:
- Liquid Balance: ₹${ctx.totalBalance.toLocaleString('en-IN')}
- Monthly Income: ₹${ctx.monthlyIncome.toLocaleString('en-IN')}
- Monthly Expenses: ₹${ctx.monthlyExpenses.toLocaleString('en-IN')}
- Monthly Savings: ₹${ctx.monthlySavings.toLocaleString('en-IN')}
- Top Spending: ${JSON.stringify(ctx.topCategories)}
- Active Loans: ${ctx.activeLoans.length} totaling ₹${totalLoanOutstanding.toLocaleString('en-IN')}
- Goals: ${ctx.goals.map(g => `${g.name}: ${((g.currentAmount / g.targetAmount) * 100).toFixed(0)}%`).join(', ') || 'none'}
- Active Recurring Schedules: ${ctx.activeSchedules}

Return ONLY a JSON array, no markdown fences. Focus on actionable advice.`;

    const aiText = await generateGeminiText(prompt);
    const aiInsights = parseJsonObject<AiInsight[]>(aiText, []);
    if (Array.isArray(aiInsights) && aiInsights.length > 0) {
      return { insights: [...deterministic, ...aiInsights], aiEnabled: true };
    }
  } catch (err) {
    console.error('AI insights generation failed:', err);
  }

  return { insights: deterministic, aiEnabled: false };
}

// ─── Chat Response Generator ──────────────────────────────────────────────────

export async function generateChatResponse(
  userId: string,
  message: string,
  history: ChatMessage[] = []
): Promise<{ reply: string; aiEnabled: boolean }> {
  const ctx = await buildFinancialContext(userId);

  const contextSummary = `
User Financial Snapshot:
- Total Balance: ₹${ctx.totalBalance.toLocaleString('en-IN')}
- This Month: Income ₹${ctx.monthlyIncome.toLocaleString('en-IN')}, Expenses ₹${ctx.monthlyExpenses.toLocaleString('en-IN')}, Saved ₹${ctx.monthlySavings.toLocaleString('en-IN')}
- Accounts: ${ctx.accounts.map(a => `${a.name} (${a.type}): ₹${(a.currentBalance || 0).toLocaleString('en-IN')}`).join('; ')}
- Active Loans: ${ctx.activeLoans.map(l => `${l.personName}: ₹${l.outstandingAmount.toLocaleString('en-IN')} (${l.loanType})`).join('; ') || 'None'}
- Goals: ${ctx.goals.map(g => `${g.name}: ₹${g.currentAmount.toLocaleString('en-IN')}/${g.targetAmount.toLocaleString('en-IN')}`).join('; ') || 'None'}
- Top Spending Categories: ${ctx.topCategories.map(c => `${c.category}: ₹${c.total.toLocaleString('en-IN')}`).join(', ') || 'None'}
- Recent Transactions: ${ctx.recentTransactions.slice(0, 8).map(t => `${t.type}: ₹${t.amount} ${t.category || t.note || ''}`).join('; ')}
- Active Schedules: ${ctx.activeSchedules}
- Budgets: ${ctx.budgets.map(b => `₹${b.currentAmount}/${b.monthlyAmount}`).join('; ') || 'None set'}
`;

  const historyText = history
    .slice(-6)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n');

  const prompt = `You are a friendly, concise personal finance assistant. Answer the user's question using ONLY the provided financial data. Be specific with numbers. Use ₹ for Indian Rupees. Keep responses under 150 words. Speak directly to "you".

${contextSummary}

${historyText ? `Previous conversation:\n${historyText}\n` : ''}
User: ${message}

If asked about affordability, compare against liquid balance minus a ₹5,000 safety buffer and scheduled outflows.
If asked about trends, use the recent transactions data.
If asked about goals, calculate remaining amount and time.
Give direct, actionable answers. Don't be vague.`;

  try {
    const aiText = await generateGeminiText(prompt);
    if (aiText) {
      return { reply: aiText, aiEnabled: true };
    }
  } catch (err) {
    console.error('AI chat generation failed:', err);
  }

  // Deterministic fallback
  const amountMatch = message.replace(/,/g, '').match(/(?:inr|rs|₹)?\s*(\d{3,})/i);
  const amount = amountMatch ? Number(amountMatch[1]) : null;

  let fallback: string;
  if (amount) {
    const available = ctx.totalBalance - 5000;
    fallback = `Your liquid balance is ₹${ctx.totalBalance.toLocaleString('en-IN')}. After a ₹5,000 safety buffer, you have ₹${Math.max(0, available).toLocaleString('en-IN')} available. A ₹${amount.toLocaleString('en-IN')} transaction ${available >= amount ? 'looks feasible' : 'may stretch your finances'}. Add a GEMINI_API_KEY for smarter analysis.`;
  } else if (message.toLowerCase().includes('summary') || message.toLowerCase().includes('overview')) {
    fallback = `This month: ₹${ctx.monthlyIncome.toLocaleString('en-IN')} earned, ₹${ctx.monthlyExpenses.toLocaleString('en-IN')} spent, ₹${ctx.monthlySavings.toLocaleString('en-IN')} saved. Liquid balance: ₹${ctx.totalBalance.toLocaleString('en-IN')}. ${ctx.topCategories.length > 0 ? `Top spend: ${ctx.topCategories[0].category} (₹${ctx.topCategories[0].total.toLocaleString('en-IN')})` : ''}`;
  } else {
    fallback = `Liquid balance: ₹${ctx.totalBalance.toLocaleString('en-IN')}. Income: ₹${ctx.monthlyIncome.toLocaleString('en-IN')}, Expenses: ₹${ctx.monthlyExpenses.toLocaleString('en-IN')} this month. Add a GEMINI_API_KEY for AI-powered answers.`;
  }

  return { reply: fallback, aiEnabled: false };
}
