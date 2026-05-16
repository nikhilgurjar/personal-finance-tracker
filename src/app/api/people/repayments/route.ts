import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PersonRepaymentSchema = z.object({
  personName: z.string().min(1),
  loanType: z.enum(['lent', 'borrowed', 'payable']),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  date: z.number(),
  note: z.string().optional(),
  accountId: z.string(),
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

function normalizeName(name: string) {
  return name.trim().toLowerCase();
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const data = PersonRepaymentSchema.parse(await req.json());
    const userRef = db.collection('users').doc(userId);
    const loansSnapshot = await userRef
      .collection('loans')
      .where('loanType', '==', data.loanType)
      .where('status', '==', 'active')
      .get();

    const matchingLoans = loansSnapshot.docs
      .map((doc) => ({ id: doc.id, ref: doc.ref, ...doc.data() }))
      .filter((loan: any) => normalizeName(loan.personName) === normalizeName(data.personName))
      .sort((a: any, b: any) => (a.startDate || 0) - (b.startDate || 0));

    const totalOutstanding = matchingLoans.reduce((sum: number, loan: any) => sum + Number(loan.outstandingAmount || 0), 0);

    if (matchingLoans.length === 0) {
      return NextResponse.json({ error: 'No active loans found for this person' }, { status: 404 });
    }

    if (data.amount > totalOutstanding) {
      return NextResponse.json({ error: 'Repayment amount exceeds outstanding balance for this person' }, { status: 400 });
    }

    const batch = db.batch();
    const personRepaymentId = userRef.collection('loanRepayments').doc().id;
    let remaining = data.amount;
    const allocations = [];

    for (const loan of matchingLoans as any[]) {
      if (remaining <= 0) break;

      const outstanding = Number(loan.outstandingAmount || 0);
      const allocatedAmount = Math.min(outstanding, remaining);
      const newOutstanding = Math.max(0, outstanding - allocatedAmount);
      const repaymentRef = userRef.collection('loanRepayments').doc();
      const repayment = {
        id: repaymentRef.id,
        personRepaymentId,
        loanId: loan.id,
        personName: loan.personName,
        loanType: data.loanType,
        amount: allocatedAmount,
        currency: data.currency,
        date: data.date,
        accountId: data.accountId,
        note: data.note,
        createdAt: Date.now(),
        createdBy: userId,
      };

      batch.set(repaymentRef, repayment);
      batch.update(loan.ref, {
        outstandingAmount: newOutstanding,
        status: newOutstanding === 0 ? 'settled' : 'active',
        updatedAt: Date.now(),
      });

      allocations.push({
        loanId: loan.id,
        personName: loan.personName,
        amount: allocatedAmount,
        beforeOutstanding: outstanding,
        afterOutstanding: newOutstanding,
      });

      remaining -= allocatedAmount;
    }

    const txCollection = data.loanType === 'lent' ? 'incomes' : 'expenses';
    const txRef = userRef.collection(txCollection).doc();
    batch.set(txRef, {
      id: txRef.id,
      date: data.date,
      amount: data.amount,
      currency: data.currency,
      ...(data.loanType === 'lent'
        ? { toAccountId: data.accountId, sourceType: 'from_person', sourceName: data.personName }
        : { fromAccountId: data.accountId, category: 'Loan Repayment' }
      ),
      note: `Person repayment ${data.loanType === 'lent' ? 'received from' : 'paid to'} ${data.personName}${data.note ? ' - ' + data.note : ''}`,
      type: data.loanType === 'lent' ? 'income' : 'expense',
      personRepaymentId,
      loanAllocations: allocations,
      createdAt: Date.now(),
      createdBy: userId,
    });

    const auditRef = userRef.collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'loan',
      entityId: personRepaymentId,
      action: 'update',
      before: { totalOutstanding },
      after: { totalOutstanding: totalOutstanding - data.amount, allocations },
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();

    return NextResponse.json({
      personRepaymentId,
      amount: data.amount,
      remainingOutstanding: totalOutstanding - data.amount,
      allocations,
    });
  } catch (error) {
    console.error('Error recording person repayment:', error);
    return NextResponse.json({ error: 'Failed to record person repayment' }, { status: 500 });
  }
}
