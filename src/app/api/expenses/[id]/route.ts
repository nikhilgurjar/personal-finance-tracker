import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

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
      .collection('expenses').doc(params.id).get();

    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch expense' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const expRef = db.collection('users').doc(userId).collection('expenses').doc(params.id);
    const expDoc = await expRef.get();
    if (!expDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const before = expDoc.data();
    const batch = db.batch();

    batch.update(expRef, { ...body, updatedAt: Date.now() });

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id, entity: 'transaction', entityId: params.id,
      action: 'update', before, after: { ...before, ...body },
      by: userId, at: Date.now(), reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update expense' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const expRef = db.collection('users').doc(userId).collection('expenses').doc(params.id);
    const expDoc = await expRef.get();
    if (!expDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const batch = db.batch();
    batch.delete(expRef);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id, entity: 'transaction', entityId: params.id,
      action: 'delete', before: expDoc.data(), after: null,
      by: userId, at: Date.now(), reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete expense' }, { status: 500 });
  }
}
