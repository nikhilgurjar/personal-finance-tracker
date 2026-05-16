import { db, authAdmin } from '@/lib/firebaseAdmin';
import { generateGeminiText, parseJsonObject } from '@/lib/gemini';
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

function fallbackSuggestion(note: string, categories: any[]) {
  const text = note.toLowerCase();
  const match = categories.find((category) => text.includes(String(category.name || '').toLowerCase()));
  const fixedWords = ['rent', 'emi', 'subscription', 'insurance', 'utility', 'internet', 'phone'];

  return {
    category: match?.name || categories[0]?.name || 'Uncategorized',
    expenseNature: fixedWords.some((word) => text.includes(word)) ? 'fixed' : 'dynamic',
    note: note.trim(),
    confidence: match ? 0.7 : 0.45,
    reason: 'Heuristic suggestion; configure GEMINI_API_KEY for AI suggestions.',
  };
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const note = String(body.note || '');
    const amount = Number(body.amount || 0);

    const categoriesSnapshot = await db.collection('users').doc(userId).collection('categories').get();
    const categories = categoriesSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    const fallback = fallbackSuggestion(note, categories);

    const text = await generateGeminiText(`
You are categorizing a personal finance expense.
Return only JSON with: category, expenseNature ("fixed" or "dynamic"), note, confidence, reason.
Use one of these categories: ${categories.map((category: any) => category.name).join(', ') || 'Uncategorized'}.
Expense amount: ${amount}
Expense note: ${note}
Clean the note to be concise and user-facing.
`);

    return NextResponse.json(parseJsonObject(text, fallback));
  } catch (error) {
    console.error('Error suggesting expense category:', error);
    return NextResponse.json({ error: 'Failed to suggest category' }, { status: 500 });
  }
}
