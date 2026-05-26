import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { deleteTransactionWithSummary, updateTransactionWithSummary } from '@/lib/transactionBatch';
import { z } from 'zod';

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

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const txId = params.id;
    const txDoc = await db.collection('users').doc(userId).collection('transactions').doc(txId).get();
    
    if (!txDoc.exists) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const currentTx = txDoc.data();
    await deleteTransactionWithSummary(userId, txId, currentTx);
    
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Error deleting transaction:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete transaction' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const txId = params.id;
    const txDoc = await db.collection('users').doc(userId).collection('transactions').doc(txId).get();
    
    if (!txDoc.exists) {
      return NextResponse.json({ error: 'Transaction not found' }, { status: 404 });
    }

    const oldTx = txDoc.data();
    const body = await req.json();
    const newTxData = TransactionSchema.parse(body);

    const updatedTx = await updateTransactionWithSummary(userId, txId, oldTx, newTxData);
    
    return NextResponse.json(updatedTx);
  } catch (error: any) {
    console.error('Error updating transaction:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation failed', details: error.errors }, { status: 400 });
    }
    return NextResponse.json({ error: error.message || 'Failed to update transaction' }, { status: 500 });
  }
}
