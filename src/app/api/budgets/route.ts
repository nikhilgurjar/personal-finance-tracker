import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const BudgetSchema = z.object({
  category: z.string().min(1),
  month: z.string().regex(/^\d{4}-\d{2}$/),
  monthlyAmount: z.number().positive(),
  expenseNature: z.enum(['fixed', 'dynamic']).default('dynamic'),
});

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

function monthRange(month: string) {
  const [year, monthIndex] = month.split('-').map(Number);
  return {
    start: new Date(year, monthIndex - 1, 1).getTime(),
    end: new Date(year, monthIndex, 1).getTime() - 1,
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get('month') || new Date().toISOString().slice(0, 7);
    const userRef = db.collection('users').doc(userId);
    const { start, end } = monthRange(month);

    const [budgetsSnap, expensesSnap] = await Promise.all([
      userRef.collection('budgets').where('month', '==', month).get(),
      userRef.collection('expenses').where('date', '>=', start).where('date', '<=', end).get(),
    ]);

    const expenses = expensesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const budgets = budgetsSnap.docs.map((doc) => {
      const budget: any = { id: doc.id, ...doc.data() };
      const spent = expenses
        .filter((expense: any) => expense.category === budget.category && (!budget.expenseNature || expense.expenseNature === budget.expenseNature))
        .reduce((total: number, expense: any) => total + Number(expense.amount || 0), 0);
      const usedPct = budget.monthlyAmount ? Math.round((spent / budget.monthlyAmount) * 100) : 0;

      return {
        ...budget,
        spent,
        remaining: Math.max(0, Number(budget.monthlyAmount || 0) - spent),
        usedPct,
        alertLevel: usedPct >= 100 ? 'critical' : usedPct >= 90 ? 'warning' : usedPct >= 70 ? 'info' : 'ok',
      };
    });

    return NextResponse.json({ month, budgets });
  } catch (error) {
    console.error('Error fetching budgets:', error);
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = BudgetSchema.parse(await req.json());
    const ref = db.collection('users').doc(userId).collection('budgets').doc();
    const budget = {
      ...data,
      id: ref.id,
      createdAt: Date.now(),
      createdBy: userId,
    };

    await ref.set(budget);
    return NextResponse.json(budget, { status: 201 });
  } catch (error) {
    console.error('Error creating budget:', error);
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 });
  }
}
