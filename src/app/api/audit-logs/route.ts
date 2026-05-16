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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const entity = searchParams.get('entity');
    const entityId = searchParams.get('entityId');
    const action = searchParams.get('action');
    const limit = parseInt(searchParams.get('limit') || '100');

    let query: FirebaseFirestore.Query = db
      .collection('users').doc(userId).collection('auditLogs');

    if (entity) query = query.where('entity', '==', entity);
    if (entityId) query = query.where('entityId', '==', entityId);
    if (action) query = query.where('action', '==', action);

    const snapshot = await query.orderBy('at', 'desc').limit(limit).get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(logs);
  } catch (error) {
    console.error('Error fetching audit logs:', error);
    return NextResponse.json({ error: 'Failed to fetch audit logs' }, { status: 500 });
  }
}
