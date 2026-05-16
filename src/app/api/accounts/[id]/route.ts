import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';

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
    const accountId = params.id;

    const batch = db.batch();
    const accountRef = db.collection('users').doc(userId).collection('accounts').doc(accountId);

    // Create audit log before deletion
    const auditRef = db.collection('users').doc(userId).collection('audit').doc();
    const accountDoc = await accountRef.get();
    
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    batch.set(auditRef, {
      entity: 'account',
      entityId: accountId,
      action: 'delete',
      before: accountDoc.data(),
      after: null,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    batch.delete(accountRef);
    await batch.commit();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}