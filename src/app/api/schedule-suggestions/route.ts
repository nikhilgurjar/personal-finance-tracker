import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

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

function nextOccurrence(rule: string, after: Date) {
  const base = new Date(after);
  const safe = (days: number) => base.getTime() + days * 24 * 60 * 60 * 1000;
  const normalized = String(rule || '').toUpperCase();

  if (normalized.includes('FREQ=DAILY')) return safe(1);
  if (normalized.includes('FREQ=WEEKLY')) return safe(7);
  if (normalized.includes('FREQ=YEARLY')) return safe(365);
  return safe(30);
}

function collectionFor(type: string) {
  if (type === 'income') return 'incomes';
  if (type === 'expense') return 'expenses';
  if (type === 'transfer') return 'transfers';
  if (type === 'savings') return 'savings';
  return null;
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const now = Date.now();
    const lookahead = now + 7 * 24 * 60 * 60 * 1000;
    const snapshot = await db.collection('users').doc(userId).collection('schedules')
      .where('status', '==', 'active')
      .where('nextRunAt', '<=', lookahead)
      .orderBy('nextRunAt', 'asc')
      .get();

    const suggestions = snapshot.docs.map((doc) => {
      const data: any = { id: doc.id, ...doc.data() };
      return {
        id: data.id,
        scheduleId: data.id,
        name: data.name,
        dueAt: data.nextRunAt,
        overdue: data.nextRunAt < now,
        template: data.template,
      };
    });

    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error fetching schedule suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule suggestions' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { scheduleId, action } = await req.json();
    const scheduleRef = db.collection('users').doc(userId).collection('schedules').doc(scheduleId);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const schedule: any = { id: scheduleDoc.id, ...scheduleDoc.data() };
    const nextRunAt = nextOccurrence(schedule.rrule, new Date((schedule.nextRunAt || Date.now()) + 1000));

    if (action === 'skip') {
      await scheduleRef.update({ lastRunAt: schedule.nextRunAt, nextRunAt, updatedAt: Date.now() });
      return NextResponse.json({ skipped: true, nextRunAt });
    }

    const collection = collectionFor(schedule.template?.type);
    if (!collection) {
      return NextResponse.json({ error: 'Unsupported schedule type' }, { status: 400 });
    }

    const batch = db.batch();
    const txRef = db.collection('users').doc(userId).collection(collection).doc();
    const transaction = {
      ...schedule.template,
      id: txRef.id,
      date: schedule.nextRunAt || Date.now(),
      scheduleId: schedule.id,
      createdAt: Date.now(),
      createdBy: userId,
    };

    batch.set(txRef, transaction);
    batch.update(scheduleRef, { lastRunAt: schedule.nextRunAt, nextRunAt, updatedAt: Date.now() });
    await batch.commit();

    return NextResponse.json({ transactionId: txRef.id, nextRunAt });
  } catch (error) {
    console.error('Error applying schedule suggestion:', error);
    return NextResponse.json({ error: 'Failed to apply schedule suggestion' }, { status: 500 });
  }
}
