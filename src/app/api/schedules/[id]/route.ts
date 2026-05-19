import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
  metadata: z.record(z.any()).optional(),
});

const UpdateScheduleSchema = z.object({
  status: z.enum(['active', 'paused']).optional(),
  name: z.string().min(1).optional(),
  rrule: z.string().optional(),
  nextRunAt: z.number().optional(),
  priority: z.number().min(1).optional(),
  template: ScheduleTemplateSchema.optional(),
});

export async function PATCH(
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

    const body = await req.json();
    const data = UpdateScheduleSchema.parse(body);

    const scheduleRef = db.collection('users').doc(userId).collection('schedules').doc(params.id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const updatePayload: Record<string, any> = { updatedAt: Date.now() };
    if (data.status !== undefined) updatePayload.status = data.status;
    if (data.name !== undefined) updatePayload.name = data.name;
    if (data.rrule !== undefined) updatePayload.rrule = data.rrule;
    if (data.nextRunAt !== undefined) updatePayload.nextRunAt = data.nextRunAt;
    if (data.priority !== undefined) updatePayload.priority = data.priority;
    if (data.template !== undefined) updatePayload.template = data.template;

    const batch = db.batch();
    batch.update(scheduleRef, updatePayload);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'schedule',
      entityId: params.id,
      action: 'update',
      before: scheduleDoc.data(),
      after: updatePayload,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating schedule:', error);
    return NextResponse.json({ error: 'Failed to update schedule' }, { status: 500 });
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

    const scheduleRef = db.collection('users').doc(userId).collection('schedules').doc(params.id);
    const scheduleDoc = await scheduleRef.get();

    if (!scheduleDoc.exists) {
      return NextResponse.json({ error: 'Schedule not found' }, { status: 404 });
    }

    const batch = db.batch();
    batch.delete(scheduleRef);

    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'schedule',
      entityId: params.id,
      action: 'delete',
      before: scheduleDoc.data(),
      after: null,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting schedule:', error);
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 });
  }
}
