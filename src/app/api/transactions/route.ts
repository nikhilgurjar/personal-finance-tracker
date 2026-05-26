import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createTransactionWithSummary } from '@/lib/transactionBatch';

const TransactionSchema = z.object({
  date: z.number(),
  amount: z.number().positive(),
  currency: z.string().optional(),
  type: z.enum(['expense', 'income', 'transfer', 'savings', 'salary', 'loan_repayment']),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  scheduleId: z.string().optional(),
  expenseNature: z.enum(['fixed', 'dynamic']).optional(),
  sourceType: z.string().optional(),
  sourceName: z.string().optional(),
  paymentMethod: z.string().optional(),
  upiRefId: z.string().optional(),
  instrumentId: z.string().optional(),
  salaryComponents: z.object({
    netTakeHome: z.number(),
    employeePf: z.number(),
    salaryMonth: z.string(),
  }).optional(),
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

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await req.json();
    const data = TransactionSchema.parse(body);

    const createdTx = await createTransactionWithSummary(userId, data);
    return NextResponse.json(createdTx, { status: 201 });
  } catch (error: any) {
    console.error('Error creating transaction:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to create transaction' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const limitParam = Number(searchParams.get('limit') || '25');
    const limit = Math.min(Math.max(limitParam, 1), 100);
    const after = searchParams.get('after'); // cursor document ID
    const type = searchParams.get('type');
    const category = searchParams.get('category');
    const accountId = searchParams.get('accountId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: FirebaseFirestore.Query = db
      .collection('users')
      .doc(userId)
      .collection('transactions');

    // Apply filters
    if (type) {
      query = query.where('type', '==', type);
    }
    if (category) {
      query = query.where('category', '==', category);
    }
    if (startDate) {
      query = query.where('date', '>=', Number(startDate));
    }
    if (endDate) {
      query = query.where('date', '<=', Number(endDate));
    }

    // Sort order (must match filters or use indexes)
    query = query.orderBy('date', 'desc');

    // Cursor pagination
    if (after) {
      const cursorDoc = await db
        .collection('users')
        .doc(userId)
        .collection('transactions')
        .doc(after)
        .get();

      if (cursorDoc.exists) {
        query = query.startAfter(cursorDoc);
      }
    }

    // Limit to page size + 1 to check if there is a next page
    const snapshot = await query.limit(limit + 1).get();
    
    let docs = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // If accountId is provided, we need to filter on client/API for fromAccountId or toAccountId.
    // (Note: Firestore does not support OR queries across different fields natively without complex queries,
    // so if accountId is passed, we check if it is either debit or credit account).
    if (accountId) {
      docs = docs.filter((doc: any) => doc.fromAccountId === accountId || doc.toAccountId === accountId);
    }

    let nextCursor: string | null = null;
    if (docs.length > limit) {
      nextCursor = docs[limit - 1].id;
      docs = docs.slice(0, limit);
    }

    return NextResponse.json({
      data: docs,
      nextCursor,
    });
  } catch (error: any) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: error.message || 'Failed to fetch transactions' }, { status: 500 });
  }
}
