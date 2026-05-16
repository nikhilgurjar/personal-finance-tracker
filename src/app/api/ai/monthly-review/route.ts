import { db, authAdmin } from '@/lib/firebaseAdmin';
import { generateGeminiText } from '@/lib/gemini';
import { NextRequest, NextResponse } from 'next/server';

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

function monthRange(month?: string | null) {
  const value = month || new Date().toISOString().slice(0, 7);
  const [year, monthIndex] = value.split('-').map(Number);
  return {
    month: value,
    start: new Date(year, monthIndex - 1, 1).getTime(),
    end: new Date(year, monthIndex, 1).getTime() - 1,
  };
}

function sum(items: any[], key = 'amount') {
  return items.reduce((total, item) => total + Number(item[key] || 0), 0);
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const { month, start, end } = monthRange(searchParams.get('month'));
    const userRef = db.collection('users').doc(userId);

    const [expensesSnap, incomesSnap, loansSnap, goalsSnap, savingsSnap] = await Promise.all([
      userRef.collection('expenses').where('date', '>=', start).where('date', '<=', end).get(),
      userRef.collection('incomes').where('date', '>=', start).where('date', '<=', end).get(),
      userRef.collection('loans').get(),
      userRef.collection('goals').get(),
      userRef.collection('savingsInstruments').where('status', '==', 'active').get(),
    ]);

    const expenses = expensesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const incomes = incomesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const loans = loansSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const goals = goalsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const savings = savingsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    const categoryTotals = expenses.reduce((acc: Record<string, number>, expense: any) => {
      const category = expense.category || 'Uncategorized';
      acc[category] = (acc[category] || 0) + Number(expense.amount || 0);
      return acc;
    }, {});

    const summary = {
      month,
      income: sum(incomes),
      expenses: sum(expenses),
      fixedExpenses: sum(expenses.filter((expense: any) => expense.expenseNature === 'fixed')),
      dynamicExpenses: sum(expenses.filter((expense: any) => expense.expenseNature !== 'fixed')),
      activeLoanOutstanding: sum(loans.filter((loan: any) => loan.status === 'active'), 'outstandingAmount'),
      savingsValue: sum(savings, 'currentValue'),
      goalRemaining: goals.reduce((total: number, goal: any) => total + Math.max(0, Number(goal.targetAmount || 0) - Number(goal.currentAmount || 0)), 0),
      topCategories: Object.entries(categoryTotals)
        .sort((a: any, b: any) => b[1] - a[1])
        .slice(0, 5)
        .map(([category, amount]) => ({ category, amount })),
    };

    const aiText = await generateGeminiText(`
Write a concise monthly personal finance review in 5 bullets.
Use plain language, mention risks and one practical next action.
Data: ${JSON.stringify(summary)}
`);

    const fallback = [
      `Income: INR ${summary.income.toLocaleString('en-IN')}; expenses: INR ${summary.expenses.toLocaleString('en-IN')}.`,
      `Fixed expenses were INR ${summary.fixedExpenses.toLocaleString('en-IN')} and dynamic expenses were INR ${summary.dynamicExpenses.toLocaleString('en-IN')}.`,
      `Active loan outstanding is INR ${summary.activeLoanOutstanding.toLocaleString('en-IN')}.`,
      `Active savings instruments total INR ${summary.savingsValue.toLocaleString('en-IN')}.`,
      `Goal shortfall remaining is INR ${summary.goalRemaining.toLocaleString('en-IN')}.`,
    ].join('\n');

    return NextResponse.json({ summary, review: aiText || fallback, aiEnabled: Boolean(aiText) });
  } catch (error) {
    console.error('Error building monthly review:', error);
    return NextResponse.json({ error: 'Failed to build monthly review' }, { status: 500 });
  }
}
