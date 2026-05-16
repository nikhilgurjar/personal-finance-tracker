import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const UpdateScheduleSchema = z.object({
  status: z.enum(['active', 'paused']),
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

    const batch = db.batch();
    
    // Update schedule
    batch.update(scheduleRef, {
      status: data.status,
      updatedAt: Date.now(),
    });

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      system: 'schedules',
      entityId: params.id,
      action: 'update',
      payload: {
        status: data.status,
        updatedAt: Date.now(),
      },
      timestamp: Date.now(),
      userId,
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
    
    // Delete schedule
    batch.delete(scheduleRef);

    // Create audit log
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
