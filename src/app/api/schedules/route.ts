import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Schedule, AccountType } from '@/lib/types';

const AccountTypeSchema = z.enum(['income', 'expense', 'savings']);

const ScheduleTemplateSchema = z.object({
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  fromAccountId: z.string(),
  toAccountId: z.string(),
  fromAccountType: AccountTypeSchema,
  toAccountType: AccountTypeSchema,
  type: z.enum(['income', 'expense', 'transfer', 'savings']),
  category: z.string().optional(),
  tags: z.array(z.string()).default([]),
  note: z.string().optional(),
});

const ScheduleSchema = z.object({
  name: z.string().min(1, 'Schedule name is required'),
  rrule: z.string(),
  template: ScheduleTemplateSchema,
  nextRunAt: z.number(),
  lastRunAt: z.number().optional(),
  status: z.enum(['active', 'paused']),
  priority: z.number().min(1).default(1),
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
    const data = ScheduleSchema.parse(body);

    // Validate accounts based on transaction type
    let fromAccountSnapshot = null;
    let toAccountSnapshot = null;

    if (data.template.type === 'income') {
      // For income, only validate the target account
      toAccountSnapshot = await db.collection('users').doc(userId).collection('accounts').doc(data.template.toAccountId).get();
      if (!toAccountSnapshot.exists) {
        return NextResponse.json({ error: 'Target account not found' }, { status: 400 });
      }
    } 
    else if (data.template.type === 'expense') {
      // For expense, only validate the source account
      fromAccountSnapshot = await db.collection('users').doc(userId).collection('accounts').doc(data.template.fromAccountId).get();
      if (!fromAccountSnapshot.exists) {
        return NextResponse.json({ error: 'Source account not found' }, { status: 400 });
      }
    }
    else {
      // For transfers and savings, validate both accounts
      [fromAccountSnapshot, toAccountSnapshot] = await Promise.all([
        db.collection('users').doc(userId).collection('accounts').doc(data.template.fromAccountId).get(),
        db.collection('users').doc(userId).collection('accounts').doc(data.template.toAccountId).get()
      ]);

      if (!fromAccountSnapshot.exists || !toAccountSnapshot.exists) {
        return NextResponse.json({ error: 'One or more accounts not found' }, { status: 400 });
      }
    }

    // Set account data based on transaction type
    const fromAccountData = data.template.type === 'income' 
      ? { type: 'income' as const } 
      : fromAccountSnapshot?.data() || { type: 'expense' as const };
      
    const toAccountData = data.template.type === 'expense'
      ? { type: 'expense' as const }
      : toAccountSnapshot?.data() || { type: 'income' as const };

    // Use the transaction type directly instead of trying to determine it from accounts
    const type = data.template.type;

    const batch = db.batch();
    const scheduleRef = db.collection('users').doc(userId).collection('schedules').doc();
    
    const scheduleData: Schedule = {
      ...data,
      id: scheduleRef.id,
      createdAt: Date.now(),
      template: {
        ...data.template,
        type,
        fromAccountType: fromAccountData?.type || 'unknown',
        toAccountType: toAccountData?.type || 'unknown',
      }
    };

    batch.set(scheduleRef, scheduleData);

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'schedule',
      entityId: scheduleRef.id,
      action: 'create',
      before: null,
      after: data,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ id: scheduleRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({ error: 'Failed to create schedule' }, { status: 500 });
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

    // Fetch accounts first
    const accountsSnapshot = await db.collection('users').doc(userId).collection('accounts').get();
    const accountsMap = new Map(
      accountsSnapshot.docs.map(doc => [
        doc.id, 
        { id: doc.id, type: doc.data().type as AccountType, ...doc.data() }
      ])
    );

    // Fetch schedules
    const schedulesSnapshot = await db.collection('users').doc(userId).collection('schedules')
      .orderBy('nextRunAt', 'asc')
      .get();
    
    const schedules = schedulesSnapshot.docs.map(doc => {
      const data = doc.data() as Schedule;
      const fromAccount = data.template.fromAccountId ? accountsMap.get(data.template.fromAccountId) : null;
      const toAccount = data.template.toAccountId ? accountsMap.get(data.template.toAccountId) : null;

      const schedule = {
        ...data,
        id: doc.id,
        template: {
          ...data.template,
        }
      };

      // Handle account types based on transaction type
      switch(data.template.type) {
        case 'income':
          schedule.template.fromAccountType = 'income';
          schedule.template.toAccountType = toAccount?.type || 'savings';
          break;
        case 'expense':
          schedule.template.fromAccountType = fromAccount?.type || 'savings';
          schedule.template.toAccountType = 'expense';
          break;
        case 'transfer':
        case 'savings':
          schedule.template.fromAccountType = fromAccount?.type || 'savings';
          schedule.template.toAccountType = toAccount?.type || 'savings';
          break;
      }

      return schedule;
    });

    // Return all schedules in a flat array
    return NextResponse.json(schedules);
  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({ error: 'Failed to fetch schedules' }, { status: 500 });
  }
}
