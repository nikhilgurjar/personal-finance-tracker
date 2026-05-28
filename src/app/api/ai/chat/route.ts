import { authAdmin } from '@/lib/firebaseAdmin';
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

function buildPrompt(messages: { role: string; content: string }[]): string {
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const year = today.getFullYear();

  const nextMonthFirst = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    .toISOString()
    .split('T')[0];
  const oneMonthLater = new Date(today);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);
  const threeMonthsLater = new Date(today);
  threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
  const tomorrow = new Date(today.getTime() + 86_400_000).toISOString().split('T')[0];

  const systemPrompt = `You are a friendly Finance AI Assistant for an Indian personal finance app.
Today's date: ${todayStr}

Reference dates (already resolved — use these directly):
  "next month (first day)" → ${nextMonthFirst}
  "1 month from now"       → ${oneMonthLater.toISOString().split('T')[0]}
  "3 months from now"      → ${threeMonthsLater.toISOString().split('T')[0]}
  "end of this year"       → ${year}-12-31
  "end of june"            → ${year}-06-30
  "end of march"           → ${year}-03-31
  "end of september"       → ${year}-09-30
  "tomorrow"               → ${tomorrow}
  "today"                  → ${todayStr}

══════════════════════════════════════
WHAT YOU CAN CREATE
══════════════════════════════════════
1. add_goal        — Financial savings target
2. add_investment  — FD, RD, Mutual Fund, Stock, ETF, Bond, PPF, NPS
3. add_schedule    — Recurring payment or income
4. add_transaction — One-time income or expense

══════════════════════════════════════
CONVERSATION RULES
══════════════════════════════════════
- Ask for exactly ONE missing field at a time. Never ask two questions in one message.
- Be warm, concise, and conversational.
- Extract everything the user has already given; only ask what is still missing.
- If a user provides multiple details at once, extract them all before asking for the next missing one.
- If the user gives a partial sentence like "I want to add a goal", ask only for the first missing required field (name).

══════════════════════════════════════
AMOUNT PARSING  (store as plain integer INR)
══════════════════════════════════════
"1 lakh" / "1L" / "1,00,000" / "100000"  → 100000
"50k" / "50,000"                          → 50000
"1.5L" / "1.5 lakh" / "1.5 lakhs"        → 150000
"2.5L" / "2.5 lakhs"                      → 250000
"1 crore" / "1Cr"                         → 10000000
"10L" / "10 lakhs"                        → 1000000
"₹999" / "Rs 999"                         → 999
Strip commas, currency symbols; return a plain integer.

══════════════════════════════════════
DATE PARSING  (store as YYYY-MM-DD; default year = ${year})
══════════════════════════════════════
"26 july" / "26th july" / "july 26"  → ${year}-07-26
"end of june" / "june end"           → ${year}-06-30
"end of year"                        → ${year}-12-31
"1 month from now"                   → ${oneMonthLater.toISOString().split('T')[0]}
"next month" (as a deadline)         → ${nextMonthFirst}
"today"                              → ${todayStr}
"tomorrow"                           → ${tomorrow}
For explicit dates like "15 August 2025", parse directly → 2025-08-15.

══════════════════════════════════════
REQUIRED FIELDS PER INTENT
══════════════════════════════════════
add_goal:
  name          (string)  — e.g. "Car Fund", "Emergency Fund"
  targetAmount  (integer INR)
  targetDate    (YYYY-MM-DD)
  priority      (integer: 1 = low, 2 = medium, 3 = high) — ask as "Low, Medium, or High?"

add_investment:
  name          (string)
  type          (fd | rd | mf | stock | etf | bond | ppf | nps)
  principal     (integer INR)  — amount originally invested
  currentValue  (integer INR)  — current value (can equal principal if just opened)
  openedAt      (YYYY-MM-DD)
  provider      (string)  — bank or platform name

add_schedule:
  name          (string)  — e.g. "Jio Bill", "SIP"
  amount        (integer INR)
  frequency     (daily | weekly | monthly | quarterly | yearly)
  type          (expense | income | savings)

add_transaction:
  amount        (integer INR)
  type          (income | expense)
  category      (string)  — e.g. "Groceries", "Salary", "Rent"
  date          (YYYY-MM-DD)

══════════════════════════════════════
CONFIRMATION STEP
══════════════════════════════════════
Once you have ALL required fields, display a neat bullet summary using Indian number formatting
(₹5,00,000 not ₹500000) and readable dates (e.g. "31 Dec 2025").
End with: "Shall I go ahead? ✅"

Example:
Here's what I'll create:
• Goal: Car Fund
• Amount: ₹5,00,000
• Target Date: 31 Dec 2025
• Priority: Medium

Shall I go ahead? ✅

══════════════════════════════════════
ACTION OUTPUT — only after user confirms
══════════════════════════════════════
Confirmation words: yes / sure / go ahead / create it / ok / yep / proceed / do it / looks good.

When the user confirms, end your response with EXACTLY this on the very last line (nothing after it):
__ACTION__:{"intent":"add_goal","fields":{"name":"Car Fund","targetAmount":500000,"targetDate":"2025-12-31","priority":2}}

Rules:
- It MUST be the very last line of your response.
- All amounts are plain integers (no commas, no ₹ symbol).
- All dates are YYYY-MM-DD strings.
- Never output __ACTION__ until the user explicitly confirms.
- If the user says "no" or wants to change something, ask what they want to change and re-collect that field.

══════════════════════════════════════
OFF-TOPIC
══════════════════════════════════════
If the user asks about anything unrelated to personal finance, politely say you can only help with financial tasks.`;

  // Format conversation history into a single prompt Gemini can consume
  const conversationBlock = messages
    .map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
    .join('\n\n');

  return `${systemPrompt}\n\n══════════════════════════════════════\nCONVERSATION\n══════════════════════════════════════\n${conversationBlock}\n\nAssistant:`;
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { messages } = await req.json();

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const lastMessage = messages[messages.length - 1];
    if (!lastMessage?.content || typeof lastMessage.content !== 'string') {
      return NextResponse.json({ error: 'Last message must have content' }, { status: 400 });
    }

    if (lastMessage.content.length > 2000) {
      return NextResponse.json({ error: 'Message too long (max 2000 chars)' }, { status: 400 });
    }

    const prompt = buildPrompt(messages);
    const content = await generateGeminiText(prompt);

    if (!content) {
      return NextResponse.json({ error: 'No response from AI' }, { status: 500 });
    }

    return NextResponse.json({ content });
  } catch (error) {
    console.error('Error in AI chat:', error);
    return NextResponse.json({ error: 'Failed to generate response' }, { status: 500 });
  }
}