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
    const snapshot = await db.collection('users').doc(userId).collection('savingsInstruments').get();
    
    const platforms = new Set<string>();
    const providers = new Set<string>();

    snapshot.docs.forEach(doc => {
      const data = doc.data();
      if (data.platform) platforms.add(data.platform);
      if (data.provider) providers.add(data.provider);
    });

    return NextResponse.json({
      platforms: Array.from(platforms).sort(),
      providers: Array.from(providers).sort(),
    });
  } catch (error) {
    console.error('Error fetching savings metadata:', error);
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
