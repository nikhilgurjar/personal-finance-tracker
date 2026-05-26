import { db } from './firebaseAdmin';
import { getCurrentMonthStr } from './utils/date';

export async function getDashboardData(userId: string, month?: string | null) {
  const monthStr = month || getCurrentMonthStr();
  const userRef = db.collection('users').doc(userId);

  const [
    summarySnap,
    accountsSnap,
    instrumentsSnap,
    loansSnap,
    goalsSnap,
    recentTxSnap
  ] = await Promise.all([
    userRef.collection('summaries').doc(monthStr).get(),
    userRef.collection('accounts').get(),
    userRef.collection('instruments').where('status', '==', 'active').get(),
    userRef.collection('loans').where('status', '==', 'active').get(),
    userRef.collection('goals').orderBy('createdAt', 'desc').limit(2).get(),
    userRef.collection('transactions').orderBy('date', 'desc').limit(5).get()
  ]);

  const summaryData = summarySnap.exists ? summarySnap.data() || {} : {};
  const accounts = accountsSnap.docs.map(doc => doc.data());
  const instruments = instrumentsSnap.docs.map(doc => doc.data());
  const loans = loansSnap.docs.map(doc => doc.data());
  const goals = goalsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  const recentTransactions = recentTxSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

  const totalIncome = summaryData.income || 0;
  const totalExpenses = summaryData.expenses || 0;
  
  // Sum bank balances
  const netWorth = accounts.reduce((acc, account) => {
    return acc + (account.balance || 0);
  }, 0);

  // Sum active investments
  const savingsPortfolio = instruments.reduce((acc, inst) => {
    return acc + (inst.currentValue || 0);
  }, 0);

  // Sum outstanding loans
  const outstandingLoans = loans.reduce((acc, loan) => {
    return acc + (loan.outstandingAmount || 0);
  }, 0);

  return {
    totals: {
      totalIncome,
      totalExpenses,
      netWorth,
      savingsPortfolio,
      outstandingLoans,
    },
    recentTransactions,
    goals,
    accounts: accounts.map(acc => ({ id: acc.id, name: acc.name, type: acc.type, balance: acc.balance })),
  };
}
