import { db, authAdmin } from '@/lib/firebaseAdmin';
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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const [expensesSnap, incomesSnap, loansSnap] = await Promise.all([
      db.collection('users').doc(userId).collection('expenses').get(),
      db.collection('users').doc(userId).collection('incomes').get(),
      db.collection('users').doc(userId).collection('loans').get(),
    ]);

    const expenses = expensesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const incomes = incomesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    const loans = loansSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // Monthly View Aggregation
    const monthlyData: Record<string, any> = {};
    const getMonthKey = (ts: number) => {
      const d = new Date(ts);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    };

    const initMonth = (key: string) => {
      if (!monthlyData[key]) {
        monthlyData[key] = { month: key, income: 0, expenses: 0, saved: 0, invested: 0, lent: 0, borrowed: 0 };
      }
    };

    expenses.forEach((e: any) => {
      const k = getMonthKey(e.date);
      initMonth(k);
      monthlyData[k].expenses += e.amount;
    });

    incomes.forEach((i: any) => {
      const k = getMonthKey(i.date);
      initMonth(k);
      monthlyData[k].income += i.amount;
    });

    loans.forEach((l: any) => {
      const k = getMonthKey(l.startDate);
      initMonth(k);
      if (l.loanType === 'lent') monthlyData[k].lent += l.principalAmount;
      if (l.loanType === 'borrowed') monthlyData[k].borrowed += l.principalAmount;
    });

    // We don't have direct 'saved' and 'invested' timeline in expenses easily, 
    // unless they categorized it as "Savings" or "Investment" in expenses.
    expenses.forEach((e: any) => {
      const k = getMonthKey(e.date);
      const cat = (e.category || '').toLowerCase();
      if (cat.includes('save') || cat.includes('saving')) {
        monthlyData[k].saved += e.amount;
      }
      if (cat.includes('invest')) {
        monthlyData[k].invested += e.amount;
      }
    });

    const monthlyArray = Object.values(monthlyData).sort((a: any, b: any) => b.month.localeCompare(a.month));

    // Category View Aggregation (Fixed vs Dynamic)
    const categoryData: Record<string, { category: string, fixed: number, dynamic: number, total: number }> = {};
    expenses.forEach((e: any) => {
      const cat = e.category || 'Uncategorized';
      if (!categoryData[cat]) {
        categoryData[cat] = { category: cat, fixed: 0, dynamic: 0, total: 0 };
      }
      if (e.expenseNature === 'fixed') {
        categoryData[cat].fixed += e.amount;
      } else {
        categoryData[cat].dynamic += e.amount;
      }
      categoryData[cat].total += e.amount;
    });

    const categoryArray = Object.values(categoryData).sort((a: any, b: any) => b.total - a.total);

    return NextResponse.json({
      monthly: monthlyArray,
      categories: categoryArray,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
