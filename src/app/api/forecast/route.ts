import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { getNextRunAt } from '@/lib/utils/schedule';

type ForecastEventType = 'income' | 'expense' | 'transfer' | 'savings' | 'loan_due' | 'what_if';
type AlertSeverity = 'info' | 'warning' | 'critical';

interface ForecastEvent {
  id: string;
  date: number;
  title: string;
  amount: number;
  type: ForecastEventType;
  accountId?: string;
  fromAccountId?: string;
  toAccountId?: string;
  source: 'schedule' | 'loan' | 'what_if';
}

interface AccountBalance {
  id: string;
  name: string;
  balance: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;
const LOW_BALANCE_LIMIT = 5000;

async function getUserId(req: NextRequest) {
  const token = req.headers.get('authorization')?.replace('Bearer ', '');
  if (!token) return null;
  try {
    const decoded = await authAdmin.verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addDays(date: Date, days: number) {
  return new Date(date.getTime() + days * DAY_MS);
}

function formatDateKey(timestamp: number) {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function parseNumber(value: string | null, fallback = 0) {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function getScheduleOccurrences(schedule: any, start: Date, end: Date) {
  const occurrences: Date[] = [];
  let cursor = Math.max(Number(schedule.nextRunAt || 0), start.getTime());
  let guard = 0;

  while (cursor <= end.getTime() && guard < 100) {
    const date = new Date(cursor);
    if (date >= start && date <= end) occurrences.push(date);
    cursor = getNextRunAt(schedule.rrule || 'FREQ=MONTHLY', cursor + 1000);
    guard += 1;
  }

  return occurrences;
}

function scheduleToEvents(schedule: any, start: Date, end: Date): ForecastEvent[] {
  if (schedule.status !== 'active') return [];

  return getScheduleOccurrences(schedule, start, end).map((date, index) => {
    const template = schedule.template || {};
    const type = template.type as ForecastEventType;
    const amount = Number(template.amount || 0);

    return {
      id: `schedule-${schedule.id}-${date.getTime()}-${index}`,
      date: date.getTime(),
      title: schedule.name || template.note || 'Scheduled transaction',
      amount,
      type,
      accountId: type === 'income' ? template.toAccountId : template.fromAccountId,
      fromAccountId: template.fromAccountId,
      toAccountId: template.toAccountId,
      source: 'schedule',
    };
  });
}

function loanToEvents(loans: any[], start: Date, end: Date): ForecastEvent[] {
  return loans
    .filter((loan) => loan.status === 'active' && loan.dueDate && loan.dueDate >= start.getTime() && loan.dueDate <= end.getTime())
    .map((loan) => ({
      id: `loan-${loan.id}`,
      date: loan.dueDate,
      title: `Loan due: ${loan.personName}`,
      amount: Number(loan.outstandingAmount || 0),
      type: 'loan_due' as const,
      accountId: loan.fromAccountId || loan.toAccountId,
      source: 'loan' as const,
    }));
}

function whatIfEvents(searchParams: URLSearchParams, start: Date): ForecastEvent[] {
  const events: ForecastEvent[] = [];
  const savingsAmount = parseNumber(searchParams.get('extraSavings'));
  const repaymentAmount = parseNumber(searchParams.get('earlyRepayment'));
  const accountId = searchParams.get('whatIfAccountId') || undefined;
  const date = start.getTime();

  if (savingsAmount > 0) {
    events.push({
      id: 'what-if-savings',
      date,
      title: 'What-if savings contribution',
      amount: savingsAmount,
      type: 'what_if',
      accountId,
      source: 'what_if',
    });
  }

  if (repaymentAmount > 0) {
    events.push({
      id: 'what-if-repayment',
      date,
      title: 'What-if early loan repayment',
      amount: repaymentAmount,
      type: 'what_if',
      accountId,
      source: 'what_if',
    });
  }

  return events;
}

function applyEventToBalances(event: ForecastEvent, balances: Map<string, AccountBalance>) {
  const amount = event.amount || 0;

  if ((event.type === 'expense' || event.type === 'savings' || event.type === 'what_if') && event.accountId) {
    const account = balances.get(event.accountId);
    if (account) account.balance -= amount;
  }

  if (event.type === 'income' && event.accountId) {
    const account = balances.get(event.accountId);
    if (account) account.balance += amount;
  }

  if (event.type === 'transfer') {
    const from = event.fromAccountId ? balances.get(event.fromAccountId) : null;
    const to = event.toAccountId ? balances.get(event.toAccountId) : null;
    if (from) from.balance -= amount;
    if (to) to.balance += amount;
  }
}

function totalLiquidBalance(balances: Map<string, AccountBalance>) {
  return Array.from(balances.values()).reduce((sum, account) => sum + account.balance, 0);
}

function buildAlerts(events: ForecastEvent[], daily: any[], loans: any[]) {
  const alerts: Array<{ severity: AlertSeverity; title: string; message: string; date?: number }> = [];
  const lowPoint = daily.reduce((lowest, row) => (row.totalBalance < lowest.totalBalance ? row : lowest), daily[0]);
  const nextIncome = events.find((event) => event.type === 'income');

  if (lowPoint && lowPoint.totalBalance < LOW_BALANCE_LIMIT) {
    alerts.push({
      severity: lowPoint.totalBalance < 0 ? 'critical' : 'warning',
      title: nextIncome ? 'Low balance before income' : 'Low projected balance',
      message: `Projected liquid balance reaches INR ${Math.round(lowPoint.totalBalance).toLocaleString('en-IN')} on ${lowPoint.date}.`,
      date: new Date(lowPoint.date).getTime(),
    });
  }

  loans
    .filter((loan) => loan.status === 'active' && loan.dueDate)
    .sort((a, b) => a.dueDate - b.dueDate)
    .slice(0, 5)
    .forEach((loan) => {
      const daysUntilDue = Math.ceil((loan.dueDate - Date.now()) / DAY_MS);
      if (daysUntilDue >= 0 && daysUntilDue <= 14) {
        alerts.push({
          severity: daysUntilDue <= 3 ? 'critical' : 'warning',
          title: 'Loan due soon',
          message: `${loan.personName} has INR ${Number(loan.outstandingAmount || 0).toLocaleString('en-IN')} due in ${daysUntilDue} day${daysUntilDue === 1 ? '' : 's'}.`,
          date: loan.dueDate,
        });
      }
    });

  const outgoing = events.filter((event) => ['expense', 'savings', 'what_if'].includes(event.type)).reduce((sum, event) => sum + event.amount, 0);
  const incoming = events.filter((event) => event.type === 'income').reduce((sum, event) => sum + event.amount, 0);

  if (incoming > 0 && outgoing / incoming > 0.75) {
    alerts.push({
      severity: 'info',
      title: 'High committed outflow',
      message: `Scheduled outflows consume ${Math.round((outgoing / incoming) * 100)}% of forecast income in this period.`,
    });
  }

  return alerts;
}

function buildGoalImpact(goals: any[], monthlySurplus: number) {
  return goals.map((goal) => {
    const currentAmount = Number(goal.currentAmount || 0);
    const targetAmount = Number(goal.targetAmount || 0);
    const remaining = Math.max(0, targetAmount - currentAmount);
    const projectedMonthlyContribution = Math.max(0, monthlySurplus * 0.25);
    const monthsToGoal = remaining > 0 && projectedMonthlyContribution > 0
      ? Math.ceil(remaining / projectedMonthlyContribution)
      : null;
    const projectedDate = monthsToGoal === null
      ? null
      : new Date(new Date().setMonth(new Date().getMonth() + monthsToGoal)).toISOString().slice(0, 10);

    return {
      id: goal.id,
      name: goal.name,
      currentAmount,
      targetAmount,
      remaining,
      progress: targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0,
      projectedMonthlyContribution,
      projectedDate,
      targetDate: goal.targetDate || null,
    };
  });
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const days = Math.min(Math.max(Math.round(parseNumber(searchParams.get('days'), 90)), 30), 180);
    const start = startOfDay(new Date());
    const end = addDays(start, days);
    const userRef = db.collection('users').doc(userId);

    const [accountsSnap, schedulesSnap, loansSnap, goalsSnap, instrumentsSnap] = await Promise.all([
      userRef.collection('accounts').get(),
      userRef.collection('schedules').where('status', '==', 'active').get(),
      userRef.collection('loans').where('status', '==', 'active').get(),
      userRef.collection('goals').get(),
      userRef.collection('savingsInstruments').where('status', '==', 'active').get(),
    ]);

    const accounts = accountsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const schedules = schedulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const loans = loansSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const goals = goalsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const instruments = instrumentsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const balances = new Map<string, AccountBalance>(
      accounts.map((account: any) => [
        account.id,
        {
          id: account.id,
          name: account.name,
          balance: Number(account.currentBalance || 0),
        },
      ])
    );

    const scheduleEvents = schedules.flatMap((schedule) => scheduleToEvents(schedule, start, end));
    const loanEvents = loanToEvents(loans, start, end);
    const scenarioEvents = whatIfEvents(searchParams, start);
    const events = [...scheduleEvents, ...loanEvents, ...scenarioEvents]
      .sort((a, b) => a.date - b.date);

    const eventsByDate = new Map<string, ForecastEvent[]>();
    events.forEach((event) => {
      const key = formatDateKey(event.date);
      eventsByDate.set(key, [...(eventsByDate.get(key) || []), event]);
    });

    const daily = [];
    for (let day = 0; day <= days; day += 1) {
      const date = addDays(start, day);
      const key = formatDateKey(date.getTime());
      const dayEvents = eventsByDate.get(key) || [];
      dayEvents.forEach((event) => applyEventToBalances(event, balances));

      daily.push({
        date: key,
        totalBalance: totalLiquidBalance(balances),
        events: dayEvents.length,
      });
    }

    const incomeTotal = events.filter((event) => event.type === 'income').reduce((sum, event) => sum + event.amount, 0);
    const outflowTotal = events.filter((event) => ['expense', 'savings', 'what_if'].includes(event.type)).reduce((sum, event) => sum + event.amount, 0);
    const monthlySurplus = ((incomeTotal - outflowTotal) / days) * 30;
    const netWorth = totalLiquidBalance(balances)
      + instruments.reduce((sum: number, item: any) => sum + Number(item.currentValue || 0), 0)
      + loans.filter((loan: any) => loan.loanType === 'lent').reduce((sum: number, loan: any) => sum + Number(loan.outstandingAmount || 0), 0)
      - loans.filter((loan: any) => loan.loanType !== 'lent').reduce((sum: number, loan: any) => sum + Number(loan.outstandingAmount || 0), 0);

    return NextResponse.json({
      horizonDays: days,
      startingBalance: accounts.reduce((sum: number, account: any) => sum + Number(account.currentBalance || 0), 0),
      endingBalance: daily[daily.length - 1]?.totalBalance || 0,
      incomeTotal,
      outflowTotal,
      monthlySurplus,
      netWorth,
      daily,
      upcoming: events.slice(0, 20),
      alerts: buildAlerts(events, daily, loans),
      goalImpact: buildGoalImpact(goals, monthlySurplus),
      accounts: Array.from(balances.values()),
    });
  } catch (error) {
    console.error('Error building forecast:', error);
    return NextResponse.json({ error: 'Failed to build forecast' }, { status: 500 });
  }
}
