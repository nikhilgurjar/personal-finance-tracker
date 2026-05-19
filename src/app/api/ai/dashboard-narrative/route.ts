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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const userRef = db.collection('users').doc(userId);
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    // Fetch this month's expenses and incomes
    const [expensesSnap, incomesSnap] = await Promise.all([
      userRef.collection('expenses').where('date', '>=', startOfMonth).get(),
      userRef.collection('incomes').where('date', '>=', startOfMonth).get(),
    ]);

    const expenses = expensesSnap.docs.map(doc => doc.data());
    const incomes = incomesSnap.docs.map(doc => doc.data());

    const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    const totalIncome = incomes.reduce((sum, e) => sum + Number(e.amount || 0), 0);
    
    const recentExpenses = expenses
      .sort((a, b) => b.date - a.date)
      .slice(0, 5)
      .map(e => `${e.note || e.category || 'Expense'}: ₹${e.amount}`);

    const prompt = `
You are a friendly personal finance bot. Analyze the user's cash flow for the current month:
- Total Income: ₹${totalIncome}
- Total Expenses: ₹${totalExpenses}
- Net Savings: ₹${totalIncome - totalExpenses}
- Recent spends: ${JSON.stringify(recentExpenses)}

Provide a concise 2-sentence conversational narrative summarizing their current monthly state.
Give one encouraging highlight or a constructive suggestion (e.g. if spending is high relative to income). Do not use placeholders. Speak directly to "you".
`;

    const narrative = await generateGeminiText(prompt);

    return NextResponse.json({
      narrative: narrative || `Your spending this month is ₹${totalExpenses.toLocaleString('en-IN')} against an income of ₹${totalIncome.toLocaleString('en-IN')}. Keep tracking your dynamic expenses to stay on budget!`
    });
  } catch (error) {
    console.error('Error generating dashboard narrative:', error);
    return NextResponse.json({ error: 'Failed to generate narrative' }, { status: 500 });
  }
}
