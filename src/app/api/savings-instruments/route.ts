import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const titleCase = (str: string) => str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const InstrumentSchema = z.object({
  name: z.string().min(1),
  type: z.enum(['savings_account', 'fd', 'rd', 'stock', 'equity_mf', 'debt_mf', 'etf', 'commodity', 'ppf', 'nps', 'other']),
  provider: z.string().min(1).transform(titleCase),
  platform: z.string().optional().transform(val => val ? titleCase(val) : val),
  ownerName: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
  accountNumber: z.string().optional(),
  currency: z.string().default('INR'),
  openedAt: z.number(),
  maturityDate: z.number().optional(),
  interestRate: z.number().optional(),
  principalAmount: z.number().positive(),
  linkedAccountId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
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

/** Update all linked goals' currentAmount based on linked instruments */
async function syncGoalAmounts(userId: string, goalIds: string[], instrumentId: string, value: number) {
  for (const goalId of goalIds) {
    try {
      const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
      const goalDoc = await goalRef.get();
      if (!goalDoc.exists) continue;
      const goal = goalDoc.data()!;

      // Get all instruments linked to this goal (excluding current one to avoid double-count)
      const instrumentsSnap = await db
        .collection('users').doc(userId)
        .collection('savingsInstruments')
        .where('status', '==', 'active')
        .get();

      let total = 0;
      instrumentsSnap.docs.forEach(doc => {
        const inst = doc.data();
        const linkedGoals: string[] = inst.goalIds || [];
        if (linkedGoals.includes(goalId)) {
          // Use current value for the updated instrument, stored value for others
          total += doc.id === instrumentId ? value : (inst.currentValue || 0);
        }
      });

      // Rebuild allocations — keep existing account allocations, replace instrument ones
      const existingAllocations: any[] = goal.allocations || [];
      const nonInstrumentAllocations = existingAllocations.filter((a: any) => !a.instrumentId);
      const accountTotal = nonInstrumentAllocations.reduce((s: number, a: any) => s + (a.amount || 0), 0);

      await goalRef.update({
        currentAmount: accountTotal + total,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error(`Failed to sync goal ${goalId}:`, e);
    }
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    let query: FirebaseFirestore.Query = db
      .collection('users').doc(userId).collection('savingsInstruments');

    if (type) query = query.where('type', '==', type);
    if (status) query = query.where('status', '==', status);

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const instruments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(instruments);
  } catch (error) {
    console.error('Error fetching savings instruments:', error);
    return NextResponse.json({ error: 'Failed to fetch savings instruments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = InstrumentSchema.parse(body);

    const batch = db.batch();
    const instRef = db.collection('users').doc(userId).collection('savingsInstruments').doc();

    const openEvent = {
      id: `${instRef.id}_opened`,
      type: 'opened',
      date: data.openedAt,
      amount: data.principalAmount,
      note: `Opened ${data.name} with ${data.provider}`,
    };

    const instrumentData: any = {
      ...data,
      id: instRef.id,
      currentValue: data.principalAmount,
      status: 'active',
      events: [openEvent],
      createdAt: Date.now(),
      createdBy: userId,
    };

    batch.set(instRef, instrumentData);

    // Audit log
    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'savings_instrument',
      entityId: instRef.id,
      action: 'create',
      before: null,
      after: instrumentData,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();

    // Sync linked goals after commit
    if (data.goalIds && data.goalIds.length > 0) {
      await syncGoalAmounts(userId, data.goalIds, instRef.id, data.principalAmount);
    }

    return NextResponse.json(instrumentData, { status: 201 });
  } catch (error) {
    console.error('Error creating savings instrument:', error);
    return NextResponse.json({ error: 'Failed to create savings instrument' }, { status: 500 });
  }
}
