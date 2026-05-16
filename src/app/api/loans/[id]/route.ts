import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const RepaymentSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  date: z.number(),
  note: z.string().optional(),
  accountId: z.string(), // which account was used for this repayment
});

const UpdateLoanSchema = z.object({
  status: z.enum(['active', 'settled', 'written_off']).optional(),
  dueDate: z.number().optional(),
  interestRate: z.number().optional(),
  note: z.string().optional(),
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

// GET /api/loans/[id] — get single loan with repayments
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const loanDoc = await db
      .collection('users').doc(userId).collection('loans').doc(params.id).get();

    if (!loanDoc.exists) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const repaymentsSnapshot = await db
      .collection('users').doc(userId).collection('loanRepayments')
      .where('loanId', '==', params.id)
      .orderBy('date', 'desc')
      .get();

    const repayments = repaymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json({ id: loanDoc.id, ...loanDoc.data(), repayments });
  } catch (error) {
    console.error('Error fetching loan:', error);
    return NextResponse.json({ error: 'Failed to fetch loan' }, { status: 500 });
  }
}

// PUT /api/loans/[id] — update loan metadata OR record a repayment
export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const loanRef = db.collection('users').doc(userId).collection('loans').doc(params.id);
    const loanDoc = await loanRef.get();

    if (!loanDoc.exists) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const loan = loanDoc.data()!;

    // Check if this is a repayment or a metadata update
    if (body.repayment) {
      const repaymentData = RepaymentSchema.parse(body.repayment);

      const newOutstanding = Math.max(0, (loan.outstandingAmount || 0) - repaymentData.amount);
      const isFullyRepaid = newOutstanding === 0;

      const batch = db.batch();

      // Create repayment record
      const repaymentRef = db.collection('users').doc(userId).collection('loanRepayments').doc();
      const repayment = {
        ...repaymentData,
        id: repaymentRef.id,
        loanId: params.id,
        createdAt: Date.now(),
        createdBy: userId,
      };
      batch.set(repaymentRef, repayment);

      // Update loan outstanding amount
      batch.update(loanRef, {
        outstandingAmount: newOutstanding,
        status: isFullyRepaid ? 'settled' : 'active',
        updatedAt: Date.now(),
      });

      // Create matching transaction in main transaction list
      const txCollection = loan.loanType === 'lent' ? 'incomes' : 'expenses';
      const txRef = db.collection('users').doc(userId).collection(txCollection).doc();
      batch.set(txRef, {
        id: txRef.id,
        date: repaymentData.date,
        amount: repaymentData.amount,
        currency: repaymentData.currency,
        ...(loan.loanType === 'lent'
          ? { toAccountId: repaymentData.accountId, sourceType: 'from_person', sourceName: loan.personName }
          : { fromAccountId: repaymentData.accountId, category: 'Loan Repayment' }
        ),
        note: `Loan repayment ${loan.loanType === 'lent' ? 'received from' : 'to'} ${loan.personName}${repaymentData.note ? ' — ' + repaymentData.note : ''}`,
        type: loan.loanType === 'lent' ? 'income' : 'expense',
        loanId: params.id,
        loanRepaymentId: repaymentRef.id,
        createdAt: Date.now(),
        createdBy: userId,
      });

      // Audit log
      const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
      batch.set(auditRef, {
        id: auditRef.id,
        entity: 'loan',
        entityId: params.id,
        action: 'update',
        before: { outstandingAmount: loan.outstandingAmount },
        after: { outstandingAmount: newOutstanding, repayment },
        by: userId,
        at: Date.now(),
        reason: 'manual',
      });

      await batch.commit();
      return NextResponse.json({ 
        outstandingAmount: newOutstanding, 
        status: isFullyRepaid ? 'settled' : 'active',
        repayment 
      });
    } else {
      // Metadata update
      const updateData = UpdateLoanSchema.parse(body);
      await loanRef.update({ ...updateData, updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error updating loan:', error);
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 });
  }
}

// DELETE /api/loans/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const loanRef = db.collection('users').doc(userId).collection('loans').doc(params.id);
    const loanDoc = await loanRef.get();
    if (!loanDoc.exists) return NextResponse.json({ error: 'Loan not found' }, { status: 404 });

    const batch = db.batch();
    batch.delete(loanRef);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'loan',
      entityId: params.id,
      action: 'delete',
      before: loanDoc.data(),
      after: null,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 });
  }
}
