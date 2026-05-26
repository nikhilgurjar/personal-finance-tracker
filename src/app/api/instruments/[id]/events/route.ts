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

const EventSchema = z.object({
  type: z.enum(['deposit', 'withdrawal', 'interest', 'interest_credit', 'sip', 'closed', 'broken', 'nav_update']),
  date: z.number(),
  amount: z.number().optional(),
  note: z.string().optional(),
  reason: z.string().optional(),
  linkedAccountId: z.string().optional(),
  units: z.number().optional(),
  navAtPurchase: z.number().optional(),
  financialYear: z.string().optional(),
  tdsDeducted: z.number().optional(),
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

async function getInstrumentRef(userId: string, id: string) {
  const newRef = db.collection('users').doc(userId).collection('instruments').doc(id);
  const newDoc = await newRef.get();
  if (newDoc.exists) return { ref: newRef, doc: newDoc };

  const legacyRef = db.collection('users').doc(userId).collection('savingsInstruments').doc(id);
  const legacyDoc = await legacyRef.get();
  if (legacyDoc.exists) return { ref: legacyRef, doc: legacyDoc };

  return null;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await getInstrumentRef(userId, params.id);
    if (!result) return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });

    const instrument = result.doc.data()!;
    return NextResponse.json(instrument.events || []);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const eventData = EventSchema.parse(body);

    const result = await getInstrumentRef(userId, params.id);
    if (!result) return NextResponse.json({ error: 'Instrument not found' }, { status: 404 });

    const { ref: instRef } = result;
    const instrument = result.doc.data()!;
    const fy = eventData.financialYear || getFinancialYear(eventData.date);

    const newEvent: any = {
      id: `${params.id}_${Date.now()}`,
      ...eventData,
      financialYear: fy,
    };

    const events = [...(instrument.events || []), newEvent];
    let currentValue = instrument.currentValue || 0;
    let status = instrument.status;
    const details = { ...(instrument.details || {}) };
    let unrealizedGain = instrument.unrealizedGain || 0;

    const isMarketLinked = instrument.instrumentClass === 'market_linked';

    switch (eventData.type) {
      case 'deposit':
      case 'sip': {
        if (eventData.amount) {
          if (isMarketLinked && eventData.units) {
            const oldUnits = details.units || 0;
            const oldCost = details.avgCostBasis || 0;
            details.units = oldUnits + eventData.units;
            details.avgCostBasis = details.units > 0
              ? ((oldUnits * oldCost) + (eventData.units * (eventData.navAtPurchase || 0))) / details.units
              : 0;
            if (details.currentNAV) {
              currentValue = details.units * details.currentNAV;
            }
            unrealizedGain = currentValue - (details.units * details.avgCostBasis);
          } else {
            currentValue += eventData.amount;
          }
        }

        // For SIP events: also create a corresponding transaction
        if (eventData.type === 'sip' && eventData.amount && eventData.linkedAccountId) {
          const txRef = db.collection('users').doc(userId).collection('savings').doc();
          const txData = {
            id: txRef.id,
            date: eventData.date,
            amount: eventData.amount,
            currency: instrument.currency || 'INR',
            fromAccountId: eventData.linkedAccountId,
            toAccountId: instrument.linkedAccountId || eventData.linkedAccountId,
            type: 'savings',
            instrumentId: params.id,
            note: `SIP investment into ${instrument.name}`,
            fiscalYear: fy,
            scheduleId: instrument.sipScheduleId || null,
            createdAt: Date.now(),
            createdBy: userId,
          };
          await db.collection('users').doc(userId).collection('savings').doc(txRef.id).set(txData);
          newEvent.transactionId = txRef.id;
        }
        break;
      }

      case 'withdrawal': {
        if (isMarketLinked && eventData.units) {
          details.units = Math.max(0, (details.units || 0) - eventData.units);
          if (details.currentNAV) {
            currentValue = details.units * details.currentNAV;
          } else if (eventData.amount) {
            currentValue = Math.max(0, currentValue - eventData.amount);
          }
          unrealizedGain = currentValue - (details.units * (details.avgCostBasis || 0));
        } else if (eventData.amount) {
          currentValue = Math.max(0, currentValue - eventData.amount);
        }
        break;
      }

      case 'interest':
      case 'interest_credit': {
        if (eventData.amount) {
          currentValue += eventData.amount;
        }
        break;
      }

      case 'nav_update': {
        if (eventData.navAtPurchase) {
          details.currentNAV = eventData.navAtPurchase;
          details.navUpdatedAt = eventData.date;
          if (details.units) {
            currentValue = details.units * details.currentNAV;
            unrealizedGain = currentValue - (details.units * (details.avgCostBasis || 0));
          }
        }
        break;
      }

      case 'closed':
      case 'broken': {
        status = eventData.type === 'broken' ? 'closed' : 'matured';
        currentValue = 0;
        unrealizedGain = 0;
        break;
      }
    }

    await instRef.update({
      events,
      currentValue,
      unrealizedGain,
      details,
      status,
      updatedAt: Date.now(),
    });

    return NextResponse.json({
      success: true,
      event: newEvent,
      currentValue,
      unrealizedGain,
      status,
    }, { status: 201 });
  } catch (error) {
    console.error('Error adding event:', error);
    return NextResponse.json({ error: 'Failed to add event' }, { status: 500 });
  }
}
