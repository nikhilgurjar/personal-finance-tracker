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

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const doc = await db
      .collection('users').doc(userId)
      .collection('incomes').doc(params.id).get();

    if (!doc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json({ id: doc.id, ...doc.data() });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch income' }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const incomeRef = db.collection('users').doc(userId).collection('incomes').doc(params.id);
    const incomeDoc = await incomeRef.get();
    if (!incomeDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const before = incomeDoc.data();
    const batch = db.batch();
    batch.update(incomeRef, { ...body, updatedAt: Date.now() });

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id, entity: 'transaction', entityId: params.id,
      action: 'update', before, after: { ...before, ...body },
      by: userId, at: Date.now(), reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update income' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const incomeRef = db.collection('users').doc(userId).collection('incomes').doc(params.id);
    const incomeDoc = await incomeRef.get();
    if (!incomeDoc.exists) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const batch = db.batch();
    batch.delete(incomeRef);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id, entity: 'transaction', entityId: params.id,
      action: 'delete', before: incomeDoc.data(), after: null,
      by: userId, at: Date.now(), reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete income' }, { status: 500 });
  }
}
