import { db } from './firebaseAdmin';

function getMonthRange(month?: string | null) {
  const fallback = new Date().toISOString().slice(0, 7);
  const [year, monthIndex] = (month || fallback).split('-').map(Number);

  if (!year || !monthIndex || monthIndex < 1 || monthIndex > 12) {
    return getMonthRange(fallback);
  }

  return {
    start: new Date(year, monthIndex - 1, 1).getTime(),
    end: new Date(year, monthIndex, 1).getTime() - 1,
  };
}

function sumBy<T>(items: T[], getAmount: (item: T) => number) {
  return items.reduce((total, item) => total + getAmount(item), 0);
}

export async function getDashboardData(userId: string, month?: string | null) {
  const { start, end } = getMonthRange(month);
  const userRef = db.collection('users').doc(userId);

  const expensesRef = userRef.collection('expenses');
  const incomesRef = userRef.collection('incomes');

  const [
    monthExpensesSnapshot,
    monthIncomesSnapshot,
    activeSavingsSnapshot,
    activeLoansSnapshot,
    goalsSnapshot,
    recentExpensesSnapshot,
    recentIncomesSnapshot,
  ] = await Promise.all([
    expensesRef.where('date', '>=', start).where('date', '<=', end).get(),
    incomesRef.where('date', '>=', start).where('date', '<=', end).get(),
    userRef.collection('savingsInstruments').where('status', '==', 'active').get(),
    userRef.collection('loans').where('status', '==', 'active').get(),
    userRef.collection('goals').orderBy('createdAt', 'desc').limit(2).get(),
    expensesRef.orderBy('date', 'desc').limit(5).get(),
    incomesRef.orderBy('date', 'desc').limit(5).get(),
  ]);

  const monthExpenses = monthExpensesSnapshot.docs.map(doc => doc.data());
  const monthIncomes = monthIncomesSnapshot.docs.map(doc => doc.data());
  const savingsInstruments = activeSavingsSnapshot.docs.map(doc => doc.data());
  const loans = activeLoansSnapshot.docs.map(doc => doc.data());
  const goals = goalsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const recentTransactions = [
    ...recentIncomesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), txType: 'income' })),
    ...recentExpensesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), txType: 'expense' })),
  ]
    .sort((a: any, b: any) => (b.date || 0) - (a.date || 0))
    .slice(0, 5);

  return {
    totals: {
      totalIncome: sumBy(monthIncomes, (income: any) => income.amount || 0),
      salaryIncome: sumBy(
        monthIncomes.filter((income: any) => income.sourceType === 'salary'),
        (income: any) => income.amount || 0
      ),
      totalExpenses: sumBy(monthExpenses, (expense: any) => expense.amount || 0),
      savingsPortfolio: sumBy(savingsInstruments, (instrument: any) => instrument.currentValue || 0),
      outstandingLoans: sumBy(loans, (loan: any) => loan.outstandingAmount || 0),
    },
    recentTransactions,
    goals,
  };
}
