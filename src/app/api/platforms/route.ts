import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PlatformSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  logoUrl: z.string().optional(),
});

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

const DEFAULT_PLATFORMS = [
  { name: 'Groww', type: 'mf_invest', isActive: true },
  { name: 'Zerodha Kite', type: 'trading', isActive: true },
  { name: 'Zerodha Coin', type: 'mf_invest', isActive: true },
  { name: 'Upstox', type: 'trading', isActive: true },
  { name: 'Angel One', type: 'trading', isActive: true },
  { name: 'HDFC Sky', type: 'trading', isActive: true },
  { name: 'Paytm Money', type: 'mf_invest', isActive: true },
  { name: 'PhonePe', type: 'mf_invest', isActive: true },
  { name: 'ET Money', type: 'mf_invest', isActive: true },
];

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const snapshot = await db.collection('platforms').get();
    let platforms = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (platforms.length === 0) {
      const batch = db.batch();
      DEFAULT_PLATFORMS.forEach(p => {
        const docRef = db.collection('platforms').doc();
        batch.set(docRef, {
          id: docRef.id,
          name: p.name,
          type: p.type,
          isActive: p.isActive,
          createdAt: Date.now(),
          createdBy: 'system',
        });
      });
      await batch.commit();
      
      const newSnapshot = await db.collection('platforms').get();
      platforms = newSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    const activePlatforms = platforms.filter((p: any) => p.isActive === true || p.createdBy === userId);
    
    return NextResponse.json(activePlatforms, {
      headers: {
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching platforms:', error);
    return NextResponse.json({ error: 'Failed to fetch platforms' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = PlatformSchema.parse(body);

    const snapshot = await db.collection('platforms').get();
    const existing = snapshot.docs.find(d => d.data().name.trim().toLowerCase() === data.name.trim().toLowerCase());
    
    if (existing) {
      return NextResponse.json({ error: 'Platform already exists', platform: { id: existing.id, ...existing.data() } }, { status: 400 });
    }

    const platformRef = db.collection('platforms').doc();
    const platformData = {
      id: platformRef.id,
      name: data.name.trim(),
      type: data.type,
      logoUrl: data.logoUrl || null,
      isActive: false,
      createdAt: Date.now(),
      createdBy: userId,
    };

    await platformRef.set(platformData);

    return NextResponse.json(platformData, { status: 201 });
  } catch (error) {
    console.error('Error creating platform:', error);
    return NextResponse.json({ error: 'Failed to create platform' }, { status: 500 });
  }
}
