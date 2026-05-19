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

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const text = String(body.text || '').trim();

    if (!text) {
      return NextResponse.json({ error: 'Text query is required' }, { status: 400 });
    }

    // Fetch user's categories and accounts for mapping
    const userRef = db.collection('users').doc(userId);
    const [categoriesSnap, accountsSnap] = await Promise.all([
      userRef.collection('categories').get(),
      userRef.collection('accounts').get(),
    ]);

    const categories = categoriesSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));
    const accounts = accountsSnap.docs.map(doc => ({ id: doc.id, name: doc.data().name }));

    const systemPrompt = `
You are a transaction parser. Parse the following user's text description of a financial transaction.
User text: "${text}"

Match the transaction type:
- "income" if they received money (salary, refund, gift, interest, etc.)
- "expense" if they spent money (bought, paid, bills, etc.)

Available accounts in system:
${JSON.stringify(accounts)}

Available categories in system:
${JSON.stringify(categories)}

Rules:
1. Extract the numeric amount. If currency is mentioned (e.g. $, ₹), extract it but amount must be a number.
2. Clean up the note to be clean and simple (e.g. "dinner at Starbucks" instead of "spent 400 on dinner at Starbucks using HDFC card").
3. Determine the type ("income" or "expense").
4. Map the category to one of the available category names. If none fit well, use "Other" or "Uncategorized".
5. Map the account used to one of the available account IDs. Look for names that match the source/destination (e.g., if they say "HDFC", match the account ID of "HDFC Bank"). If no match, return null or empty string.
6. Estimate the date of the transaction. If they mention "yesterday", "last week", "today", calculate the date relative to today (${new Date().toLocaleDateString()}). Return it in "YYYY-MM-DD" format. Defaults to today's date.
7. If the type is "income", also extract:
   - "sourceType": one of "salary", "freelance", "from_person", "business", "rental", "investment", "other"
   - "sourceName": who paid them (e.g., "Google" for salary, or the person's name)

Return ONLY a JSON object:
{
  "type": "income" | "expense",
  "amount": number,
  "note": string,
  "category": string (matched category name),
  "fromAccountId": string (matched account ID if expense),
  "toAccountId": string (matched account ID if income),
  "sourceType": string (for income, one of the values above),
  "sourceName": string (for income, source name),
  "date": string ("YYYY-MM-DD")
}
`;

    const aiResponse = await generateGeminiText(systemPrompt);
    const parsed = parseJsonObject(aiResponse, {
      type: 'expense' as const,
      amount: 0,
      note: text,
      category: 'Other',
      fromAccountId: '',
      toAccountId: '',
      sourceType: 'other',
      sourceName: '',
      date: new Date().toISOString().slice(0, 10),
    });

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('Error parsing transaction:', error);
    return NextResponse.json({ error: 'Failed to parse transaction' }, { status: 500 });
  }
}
