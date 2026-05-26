import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

function getFinancialYear(dateMs: number): string {
  const date = new Date(dateMs);
  const year = date.getFullYear();
  const month = date.getMonth();
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

const titleCase = (str: string) => str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

const EventSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'interest_credit', 'interest', 'closed', 'broken', 'sip', 'nav_update']),
  date: z.number(),
  amount: z.number().optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
  linkedTransactionId: z.string().optional(),
  linkedExpenseId: z.string().optional(),
  newInstrumentId: z.string().optional(),
  closeReason: z.string().optional(),
  linkedAccountId: z.string().optional(),
  units: z.number().optional(),
  navAtPurchase: z.number().optional(),
  transactionId: z.string().optional(),
  financialYear: z.string().optional(),
  tdsDeducted: z.number().optional(),
});

const UpdateInstrumentSchema = z.object({
  currentValue: z.number().optional(),
  interestRate: z.number().optional(),
  maturityDate: z.number().optional(),
  platform: z.string().optional().transform(val => val ? titleCase(val) : val),
  platformId: z.string().optional(),
  ownerName: z.string().optional(),
  ownerId: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
  sipScheduleId: z.string().optional(),
  metadata: z.record(z.any()).optional(),
  details: z.record(z.any()).optional(),
  instrumentClass: z.enum(['fixed_return', 'market_linked', 'govt_scheme']).optional(),
});

/** Sync all linked goals' currentAmount based on this instrument's new value */
async function syncGoalAmounts(userId: string, goalIds: string[], instrumentId: string, newValue: number) {
  for (const goalId of goalIds) {
    try {
      const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
      const goalDoc = await goalRef.get();
      if (!goalDoc.exists) continue;
      const goal = goalDoc.data()!;

      // Check both collections for backward compat
      const [instrumentsSnap, legacySnap] = await Promise.all([
        db.collection('users').doc(userId).collection('instruments').where('status', '==', 'active').get(),
        db.collection('users').doc(userId).collection('savingsInstruments').where('status', '==', 'active').get(),
      ]);

      let instrumentTotal = 0;
      const allDocs = [...instrumentsSnap.docs, ...legacySnap.docs];
      const seen = new Set<string>();
      allDocs.forEach(doc => {
        if (seen.has(doc.id)) return;
        seen.add(doc.id);
        const inst = doc.data();
        const linkedGoals: string[] = inst.goalIds || [];
        if (linkedGoals.includes(goalId)) {
          instrumentTotal += doc.id === instrumentId ? newValue : (inst.currentValue || 0);
        }
      });

      const existingAllocations: any[] = goal.allocations || [];
      const accountTotal = existingAllocations
        .filter((a: any) => !a.instrumentId)
        .reduce((s: number, a: any) => s + (a.amount || 0), 0);

      await goalRef.update({ currentAmount: accountTotal + instrumentTotal, updatedAt: Date.now() });
    } catch (e) {
      console.error(`Failed to sync goal ${goalId}:`, e);
    }
  }
}

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

/** Try instruments collection first, fall back to savingsInstruments */
async function getInstrumentRef(userId: string, id: string) {
  const newRef = db.collection('users').doc(userId).collection('instruments').doc(id);
  const newDoc = await newRef.get();
  if (newDoc.exists) return { ref: newRef, doc: newDoc, collection: 'instruments' };

  const legacyRef = db.collection('users').doc(userId).collection('savingsInstruments').doc(id);
  const legacyDoc = await legacyRef.get();
  if (legacyDoc.exists) return { ref: legacyRef, doc: legacyDoc, collection: 'savingsInstruments' };

  return null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getInstrumentRef(userId, params.id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: result.doc.id, ...result.doc.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch instrument' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const result = await getInstrumentRef(userId, params.id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { ref: instRef, doc: instDoc } = result;
    const instrument = instDoc.data()!;

    // If adding an event (deposit, withdrawal, close, break, sip, nav_update)
    if (body.event) {
      const eventData = EventSchema.parse(body.event);

      const newEvent: any = {
        id: `${params.id}_${Date.now()}`,
        ...eventData,
        financialYear: eventData.financialYear || getFinancialYear(eventData.date),
      };

      const events = [...(instrument.events || []), newEvent];
      let newValue = instrument.currentValue || 0;
      let status = instrument.status;
      let closedAt = instrument.closedAt;
      let closeReason = instrument.closeReason;
      const details = { ...(instrument.details || {}) };
      let unrealizedGain = instrument.unrealizedGain || 0;

      if (eventData.type === 'deposit' && eventData.amount) {
        newValue += eventData.amount;
        // For market-linked: update units and avgCostBasis
        if (instrument.instrumentClass === 'market_linked' && eventData.units) {
          const oldUnits = details.units || 0;
          const oldCost = details.avgCostBasis || 0;
          details.units = oldUnits + eventData.units;
          details.avgCostBasis = details.units > 0
            ? ((oldUnits * oldCost) + (eventData.units * (eventData.navAtPurchase || 0))) / details.units
            : 0;
          if (details.currentNAV) {
            newValue = details.units * details.currentNAV;
          }
          unrealizedGain = newValue - (details.units * details.avgCostBasis);
        }
      } else if (eventData.type === 'sip' && eventData.amount) {
        // SIP is essentially a deposit for market-linked instruments
        if (instrument.instrumentClass === 'market_linked' && eventData.units) {
          const oldUnits = details.units || 0;
          const oldCost = details.avgCostBasis || 0;
          details.units = oldUnits + eventData.units;
          details.avgCostBasis = details.units > 0
            ? ((oldUnits * oldCost) + (eventData.units * (eventData.navAtPurchase || 0))) / details.units
            : 0;
          if (details.currentNAV) {
            newValue = details.units * details.currentNAV;
          }
          unrealizedGain = newValue - (details.units * details.avgCostBasis);
        } else {
          newValue += eventData.amount;
        }
      } else if (eventData.type === 'withdrawal' && eventData.amount) {
        if (instrument.instrumentClass === 'market_linked' && eventData.units) {
          details.units = Math.max(0, (details.units || 0) - eventData.units);
          if (details.currentNAV) {
            newValue = details.units * details.currentNAV;
          } else {
            newValue = Math.max(0, newValue - eventData.amount);
          }
          unrealizedGain = newValue - (details.units * (details.avgCostBasis || 0));
        } else {
          newValue = Math.max(0, newValue - eventData.amount);
        }
      } else if ((eventData.type === 'interest_credit' || eventData.type === 'interest') && eventData.amount) {
        newValue += eventData.amount;
      } else if (eventData.type === 'nav_update') {
        // Update NAV for market-linked instruments
        if (eventData.navAtPurchase) {
          details.currentNAV = eventData.navAtPurchase;
          details.navUpdatedAt = eventData.date;
          if (details.units) {
            newValue = details.units * details.currentNAV;
            unrealizedGain = newValue - (details.units * (details.avgCostBasis || 0));
          }
        }
      } else if (eventData.type === 'closed' || eventData.type === 'broken') {
        status = eventData.type === 'broken' ? 'closed' : 'matured';
        closedAt = eventData.date;
        closeReason = eventData.reason || eventData.closeReason;
        newValue = 0;
        unrealizedGain = 0;
      }

      const batch = db.batch();
      batch.update(instRef, {
        events,
        currentValue: newValue,
        unrealizedGain,
        details,
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
          instrumentId: params.id,
          fiscalYear: newEvent.financialYear,
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
      const goalIds: string[] = instrument.goalIds || [];
      if (goalIds.length > 0) {
        await syncGoalAmounts(userId, goalIds, params.id, newValue);
      }
      return NextResponse.json({ success: true, currentValue: newValue, unrealizedGain, status, event: newEvent });
    } else {
      // Regular metadata/details update
      const updateData = UpdateInstrumentSchema.parse(body);
      
      // If details are being updated, merge with existing details
      const updatePayload: any = { ...updateData, updatedAt: Date.now() };
      if (updateData.details) {
        updatePayload.details = { ...(instrument.details || {}), ...updateData.details };
        // Recompute currentValue and unrealizedGain for market-linked if NAV or units changed
        if (instrument.instrumentClass === 'market_linked' || updateData.instrumentClass === 'market_linked') {
          const d = updatePayload.details;
          if (d.units && d.currentNAV) {
            updatePayload.currentValue = d.units * d.currentNAV;
            updatePayload.unrealizedGain = updatePayload.currentValue - (d.units * (d.avgCostBasis || 0));
          }
        }
      }

      await instRef.update(updatePayload);
      const newGoalIds: string[] = updateData.goalIds ?? instrument.goalIds ?? [];
      if (newGoalIds.length > 0) {
        const syncValue = updatePayload.currentValue ?? updateData.currentValue ?? instrument.currentValue ?? 0;
        await syncGoalAmounts(userId, newGoalIds, params.id, syncValue);
      }
      return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error('Error updating instrument:', error);
    return NextResponse.json({ error: 'Failed to update instrument' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  // PATCH for NAV update shorthand: PATCH /api/instruments/{id}?action=nav
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action');

  try {
    const result = await getInstrumentRef(userId, params.id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const { ref: instRef, doc: instDoc } = result;
    const instrument = instDoc.data()!;

    if (action === 'nav') {
      const body = await req.json();
      const { currentNAV } = body;
      if (typeof currentNAV !== 'number') {
        return NextResponse.json({ error: 'currentNAV must be a number' }, { status: 400 });
      }

      const details = { ...(instrument.details || {}), currentNAV, navUpdatedAt: Date.now() };
      const units = details.units || 0;
      const currentValue = units * currentNAV;
      const unrealizedGain = currentValue - (units * (details.avgCostBasis || 0));

      const navEvent = {
        id: `${params.id}_nav_${Date.now()}`,
        type: 'nav_update',
        date: Date.now(),
        navAtPurchase: currentNAV,
        financialYear: getFinancialYear(Date.now()),
        note: `NAV updated to ${currentNAV}`,
      };

      await instRef.update({
        details,
        currentValue,
        unrealizedGain,
        events: [...(instrument.events || []), navEvent],
        updatedAt: Date.now(),
      });

      return NextResponse.json({ success: true, currentValue, unrealizedGain, details });
    }

    // Default PATCH: treat as regular update
    const body = await req.json();
    const updateData = UpdateInstrumentSchema.parse(body);
    await instRef.update({ ...updateData, updatedAt: Date.now() });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error patching instrument:', error);
    return NextResponse.json({ error: 'Failed to patch instrument' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getInstrumentRef(userId, params.id);
    if (!result) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const batch = db.batch();
    batch.delete(result.ref);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'savings_instrument',
      entityId: params.id,
      action: 'delete',
      before: result.doc.data(),
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
