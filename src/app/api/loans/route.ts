import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const LoanSchema = z.object({
  loanType: z.enum(['lent', 'borrowed', 'payable']),
  personName: z.string().min(1),
  principalAmount: z.number().positive(),
  currency: z.string().default('INR'),
  startDate: z.number(),
  dueDate: z.number().optional(),
  interestRate: z.number().optional(),
  note: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
  personId: z.string().optional(),
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
    const loanType = searchParams.get('loanType');
    const status = searchParams.get('status');

    let query: FirebaseFirestore.Query = db
      .collection('users').doc(userId).collection('loans');

    if (loanType) query = query.where('loanType', '==', loanType);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const loans = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(loans);
  } catch (error) {
    console.error('Error fetching loans:', error);
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = LoanSchema.parse(body);

    const batch = db.batch();
    const loanRef = db.collection('users').doc(userId).collection('loans').doc();

    const loanData = {
      ...data,
      id: loanRef.id,
      outstandingAmount: data.principalAmount, // starts equal to principal
      status: 'active',
      createdAt: Date.now(),
      createdBy: userId,
    };

    batch.set(loanRef, loanData);

    // If "borrowed" — also create an income transaction so it appears in transaction list
    if (data.loanType === 'borrowed' && data.toAccountId) {
      const txRef = db.collection('users').doc(userId).collection('incomes').doc();
      batch.set(txRef, {
        id: txRef.id,
        date: data.startDate,
        amount: data.principalAmount,
        currency: data.currency,
        toAccountId: data.toAccountId,
        sourceType: 'from_person',
        sourceName: data.personName,
        note: `Loan from ${data.personName}${data.note ? ' — ' + data.note : ''}`,
        type: 'income',
        loanId: loanRef.id,
        createdAt: Date.now(),
        createdBy: userId,
      });
    }

    // If "lent" — also create an expense transaction
    if (data.loanType === 'lent' && data.fromAccountId) {
      const txRef = db.collection('users').doc(userId).collection('expenses').doc();
      batch.set(txRef, {
        id: txRef.id,
        date: data.startDate,
        amount: data.principalAmount,
        currency: data.currency,
        fromAccountId: data.fromAccountId,
        category: 'Loan Given',
        note: `Lent to ${data.personName}${data.note ? ' — ' + data.note : ''}`,
        type: 'expense',
        loanId: loanRef.id,
        createdAt: Date.now(),
        createdBy: userId,
      });
    }

    // Audit log
    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'loan',
      entityId: loanRef.id,
      action: 'create',
      before: null,
      after: loanData,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json(loanData, { status: 201 });
  } catch (error) {
    console.error('Error creating loan:', error);
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 });
  }
}
