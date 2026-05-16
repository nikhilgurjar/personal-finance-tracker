import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const ExpenseSchema = z.object({
  date: z.number(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  category: z.string().optional(),
  expenseNature: z.enum(['fixed', 'dynamic']).optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  sourceBreakdown: z.array(z.object({
    sourceAccountId: z.string(),
    amount: z.number().positive(),
    sourceType: z.enum(['account', 'savings_instrument']).optional(),
    referenceId: z.string().optional(),
  })).optional(),
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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const nature = searchParams.get('nature'); // fixed | dynamic
    const category = searchParams.get('category');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: FirebaseFirestore.Query = db
      .collection('users').doc(userId).collection('expenses');

    if (nature) query = query.where('expenseNature', '==', nature);
    if (category) query = query.where('category', '==', category);
    if (startDate) query = query.where('date', '>=', parseInt(startDate));
    if (endDate) query = query.where('date', '<=', parseInt(endDate));

    const snapshot = await query.orderBy('date', 'desc').get();
    const expenses = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'expense' }));

    return NextResponse.json(expenses);
  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json({ error: 'Failed to fetch expenses' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = ExpenseSchema.parse(body);

    const batch = db.batch();
    const expRef = db.collection('users').doc(userId).collection('expenses').doc();

    const expenseData = {
      ...data,
      id: expRef.id,
      type: 'expense',
      createdAt: Date.now(),
      createdBy: userId,
    };

    batch.set(expRef, expenseData);

    // Audit log
    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'transaction',
      entityId: expRef.id,
      action: 'create',
      before: null,
      after: expenseData,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json(expenseData, { status: 201 });
  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json({ error: 'Failed to create expense' }, { status: 500 });
  }
}
