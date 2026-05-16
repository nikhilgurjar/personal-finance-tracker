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

function extractAmount(question: string) {
  const match = question.replace(/,/g, '').match(/(?:inr|rs|₹)?\s*(\d{3,})/i);
  return match ? Number(match[1]) : null;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { question } = await req.json();
    const userRef = db.collection('users').doc(userId);

    const [accountsSnap, schedulesSnap, loansSnap, goalsSnap] = await Promise.all([
      userRef.collection('accounts').get(),
      userRef.collection('schedules').where('status', '==', 'active').get(),
      userRef.collection('loans').where('status', '==', 'active').get(),
      userRef.collection('goals').get(),
    ]);

    const accounts = accountsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const schedules = schedulesSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const loans = loansSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const goals = goalsSnap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const liquidBalance = accounts.reduce((sum: number, account: any) => sum + Number(account.currentBalance || 0), 0);
    const activeOutflow = schedules
      .filter((schedule: any) => ['expense', 'savings'].includes(schedule.template?.type))
      .reduce((sum: number, schedule: any) => sum + Number(schedule.template?.amount || 0), 0);
    const amount = extractAmount(String(question || ''));

    const context = {
      liquidBalance,
      safetyBuffer: 5000,
      activeScheduledOutflow: activeOutflow,
      activeLoanOutstanding: loans.reduce((sum: number, loan: any) => sum + Number(loan.outstandingAmount || 0), 0),
      goals: goals.map((goal: any) => ({
        name: goal.name,
        remaining: Math.max(0, Number(goal.targetAmount || 0) - Number(goal.currentAmount || 0)),
      })),
      requestedAmount: amount,
    };

    const aiText = await generateGeminiText(`
Answer this personal finance question using only the provided data. Be concise.
Question: ${question}
Data: ${JSON.stringify(context)}
If the user asks if they can repay/save/spend an amount, compare it to liquidBalance minus safetyBuffer and scheduled outflow.
`);

    const fallback = amount
      ? `You have INR ${liquidBalance.toLocaleString('en-IN')} liquid. After a INR 5,000 safety buffer and INR ${activeOutflow.toLocaleString('en-IN')} scheduled outflow, a INR ${amount.toLocaleString('en-IN')} move ${liquidBalance - 5000 - activeOutflow >= amount ? 'looks feasible' : 'looks tight'} based on current data.`
      : `Current liquid balance is INR ${liquidBalance.toLocaleString('en-IN')} with INR ${activeOutflow.toLocaleString('en-IN')} in active scheduled outflows. Ask with an amount for a tighter answer.`;

    return NextResponse.json({ answer: aiText || fallback, aiEnabled: Boolean(aiText), context });
  } catch (error) {
    console.error('Error answering AI query:', error);
    return NextResponse.json({ error: 'Failed to answer query' }, { status: 500 });
  }
}
