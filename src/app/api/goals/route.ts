import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Goal } from '@/lib/types';

const AllocationSchema = z.object({
  accountId: z.string(),
  amount: z.number().positive(),
});

const GoalSchema = z.object({
  name: z.string().min(1),
  targetAmount: z.number().positive(),
  targetDate: z.number().optional(),
  priority: z.number().optional(),
  allocations: z.array(AllocationSchema).default([]),
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
    const data = GoalSchema.parse(body);

    const batch = db.batch();
    const goalRef = db.collection('users').doc(userId).collection('goals').doc();
    
    const goalData: Goal = {
      ...data,
      id: goalRef.id,
      createdAt: Date.now(),
    };

    batch.set(goalRef, goalData);

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'goal',
      entityId: goalRef.id,
      action: 'create',
      before: null,
      after: data,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ id: goalRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating goal:', error);
    return NextResponse.json({ error: 'Failed to create goal' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const data = GoalSchema.parse(updateData);
    const goalRef = db.collection('users').doc(userId).collection('goals').doc(id);
    
    // Get the current goal data for audit
    const currentGoal = (await goalRef.get()).data();
    
    const batch = db.batch();
    batch.update(goalRef, {
      ...data,
      updatedAt: Date.now(),
    });

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'goal',
      entityId: id,
      action: 'update',
      before: currentGoal,
      after: data,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ id }, { status: 200 });
  } catch (error) {
    console.error('Error updating goal:', error);
    return NextResponse.json({ error: 'Failed to update goal' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;

    const { searchParams } = new URL(req.url);
    const goalId = searchParams.get('id');

    if (!goalId) {
      return NextResponse.json({ error: 'Goal ID is required' }, { status: 400 });
    }

    const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
    
    // Get the current goal data for audit
    const currentGoal = (await goalRef.get()).data();
    
    const batch = db.batch();
    batch.delete(goalRef);

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    batch.set(auditRef, {
      entity: 'goal',
      entityId: goalId,
      action: 'delete',
      before: currentGoal,
      after: null,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('Error deleting goal:', error);
    return NextResponse.json({ error: 'Failed to delete goal' }, { status: 500 });
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

    const snapshot = await db.collection('users').doc(userId).collection('goals')
      .orderBy('priority', 'desc')
      .orderBy('createdAt', 'desc')
      .get();
    
    const goals = snapshot.docs.map(doc => doc.data());
    return NextResponse.json(goals);
  } catch (error) {
    console.error('Error fetching goals:', error);
    return NextResponse.json({ error: 'Failed to fetch goals' }, { status: 500 });
  }
}
