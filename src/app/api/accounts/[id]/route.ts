import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const AccountUpdateSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']),
  subtype: z.string().optional(),
  name: z.string().min(1),
  institution: z.string().optional(),
  currency: z.string().default('INR'),
  currentBalance: z.number().optional(),
  creditLimit: z.number().optional(),
  interestRate: z.number().optional(),
  dueDate: z.number().optional(),
  minimumPayment: z.number().optional(),
  billingCycleDay: z.number().min(1).max(31).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;
    const accountId = params.id;

    const body = await req.json();
    const data = AccountUpdateSchema.parse(body);
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);
    const accountDoc = await accountRef.get();

    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const batch = db.batch();
    const updatedAccount = {
      ...data,
      id: accountId,
      updatedAt: Date.now(),
    };

    batch.update(accountRef, updatedAccount);

    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'account',
      entityId: accountId,
      action: 'update',
      before: accountDoc.data(),
      after: updatedAccount,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();

    return NextResponse.json({ id: accountId }, { status: 200 });
  } catch (error) {
    console.error('Error updating account:', error);
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;
    const accountId = params.id;

    const batch = db.batch();
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);

    // Create audit log before deletion
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    const accountDoc = await accountRef.get();
    
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    batch.set(auditRef, {
      entity: 'account',
      entityId: accountId,
      action: 'delete',
      before: accountDoc.data(),
      after: null,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    batch.delete(accountRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
