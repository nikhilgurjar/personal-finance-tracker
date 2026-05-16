import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Account } from '@/lib/types';

const AccountSchema = z.object({
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

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const data = AccountSchema.parse(body);

    const batch = db.batch();
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc();
    
    const accountData: Account = {
      ...data,
      subtype: data.subtype as Account['subtype'],
      id: accountRef.id,
      createdAt: Date.now(),
    };

    batch.set(accountRef, accountData);

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'account',
      entityId: accountRef.id,
      action: 'create',
      before: null,
      after: data,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ id: accountRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating account:', error);
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const includeGoals = searchParams.get('includeGoals') === 'true';

    let query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData> = db
      .collection('users')
      .doc(userId)
      .collection('accounts');

    if (type) {
      query = query.where('type', '==', type);
    }

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const accounts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    if (!includeGoals) {
      return NextResponse.json(accounts);
    }

    const goalsSnapshot = await db.collection('users')
      .doc(userId)
      .collection('goals')
      .get();

    const goals = goalsSnapshot.docs.map(goalDoc => ({
      id: goalDoc.id,
      name: goalDoc.data().name,
      targetAmount: goalDoc.data().targetAmount,
      currentAmount: goalDoc.data().currentAmount || 0,
      allocations: goalDoc.data().allocations || [],
      linkedAccounts: goalDoc.data().linkedAccounts || [],
    }));

    const accountsWithGoals = accounts.map((account: any) => ({
      ...account,
      linkedGoals: goals
        .filter((goal: any) =>
          goal.linkedAccounts.includes(account.id) ||
          goal.allocations.some((allocation: any) => allocation.accountId === account.id)
        )
        .map((goal: any) => ({
          id: goal.id,
          name: goal.name,
          targetAmount: goal.targetAmount,
          currentAmount: goal.currentAmount,
        })),
    }));

    return NextResponse.json(accountsWithGoals);
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}
