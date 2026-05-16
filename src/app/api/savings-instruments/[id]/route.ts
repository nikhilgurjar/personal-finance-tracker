import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const EventSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'interest_credit', 'closed', 'broken']),
  date: z.number(),
  amount: z.number().optional(),
  note: z.string().optional(),
  reason: z.string().optional(), // for closed/broken
  linkedTransactionId: z.string().optional(),
  linkedExpenseId: z.string().optional(),
  newInstrumentId: z.string().optional(), // if money moved to another instrument
  closeReason: z.string().optional(),
  linkedAccountId: z.string().optional(), // account that received/gave the money
});

const UpdateInstrumentSchema = z.object({
  currentValue: z.number().optional(),
  interestRate: z.number().optional(),
  maturityDate: z.number().optional(),
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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const doc = await db
      .collection('users').doc(userId)
      .collection('savingsInstruments').doc(params.id).get();

    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch instrument' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const instRef = db.collection('users').doc(userId).collection('savingsInstruments').doc(params.id);
    const instDoc = await instRef.get();
    if (!instDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const instrument = instDoc.data()!;

    // If adding an event (deposit, withdrawal, close, break)
    if (body.event) {
      const eventData = EventSchema.parse(body.event);

      const newEvent = {
        id: `${params.id}_${Date.now()}`,
        ...eventData,
      };

      const events = [...(instrument.events || []), newEvent];
      let newValue = instrument.currentValue || 0;
      let status = instrument.status;
      let closedAt = instrument.closedAt;
      let closeReason = instrument.closeReason;

      if (eventData.type === 'deposit' && eventData.amount) {
        newValue += eventData.amount;
      } else if (eventData.type === 'withdrawal' && eventData.amount) {
        newValue = Math.max(0, newValue - eventData.amount);
      } else if (eventData.type === 'interest_credit' && eventData.amount) {
        newValue += eventData.amount;
      } else if (eventData.type === 'closed' || eventData.type === 'broken') {
        status = eventData.type === 'broken' ? 'closed' : 'matured';
        closedAt = eventData.date;
        closeReason = eventData.reason || eventData.closeReason;
        newValue = 0; // funds have been moved out
      }

      const batch = db.batch();
      batch.update(instRef, {
        events,
        currentValue: newValue,
        status,
        closedAt,
        closeReason,
        updatedAt: Date.now(),
      });

      // If withdrawal/closure linked to an account — create income transaction
      if ((eventData.type === 'withdrawal' || eventData.type === 'broken' || eventData.type === 'closed')
          && eventData.amount && eventData.linkedAccountId) {
        const txRef = db.collection('users').doc(userId).collection('incomes').doc();
        batch.set(txRef, {
          id: txRef.id,
          date: eventData.date,
          amount: eventData.amount,
          currency: instrument.currency || 'INR',
          toAccountId: eventData.linkedAccountId,
          sourceType: 'investment',
          sourceName: instrument.name,
          note: `${eventData.type === 'broken' ? 'Broke' : 'Withdrew from'} ${instrument.name} — ${eventData.reason || eventData.note || ''}`,
          type: 'income',
          savingsInstrumentId: params.id,
          createdAt: Date.now(),
          createdBy: userId,
        });
      }

      // Audit log
      const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
      batch.set(auditRef, {
        id: auditRef.id,
        entity: 'savings_instrument',
        entityId: params.id,
        action: 'update',
        before: { currentValue: instrument.currentValue, status: instrument.status },
        after: { currentValue: newValue, status, event: newEvent },
        by: userId,
        at: Date.now(),
        reason: 'manual',
      });

      await batch.commit();
      return NextResponse.json({ success: true, currentValue: newValue, status, event: newEvent });
    } else {
      // Regular metadata update
      const updateData = UpdateInstrumentSchema.parse(body);
      await instRef.update({ ...updateData, updatedAt: Date.now() });
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error updating savings instrument:', error);
    return NextResponse.json({ error: 'Failed to update savings instrument' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const instRef = db.collection('users').doc(userId).collection('savingsInstruments').doc(params.id);
    const instDoc = await instRef.get();
    if (!instDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const batch = db.batch();
    batch.delete(instRef);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'savings_instrument',
      entityId: params.id,
      action: 'delete',
      before: instDoc.data(),
      after: null,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete instrument' }, { status: 500 });
  }
}
