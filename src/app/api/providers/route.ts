import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_PROVIDERS } from '@/lib/constants';

const ProviderSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  shortCode: z.string().min(1),
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

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const typeFilter = searchParams.get('type');

  try {
    const snapshot = await db.collection('providers').get();
    let providers = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    if (providers.length === 0) {
      const batch = db.batch();
      DEFAULT_PROVIDERS.forEach(p => {
        const docRef = db.collection('providers').doc();
        batch.set(docRef, {
          id: docRef.id,
          name: p.name,
          type: p.type,
          shortCode: p.shortCode,
          createdAt: Date.now(),
          createdBy: 'system',
        });
      });
      await batch.commit();

      const newSnapshot = await db.collection('providers').get();
      providers = newSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    }

    if (typeFilter) {
      providers = providers.filter((p: any) => p.type === typeFilter);
    }

    return NextResponse.json(providers, {
      headers: {
        'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    return NextResponse.json({ error: 'Failed to fetch providers' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = ProviderSchema.parse(body);

    const snapshot = await db.collection('providers').get();
    const existing = snapshot.docs.find(d => d.data().name.trim().toLowerCase() === data.name.trim().toLowerCase());

    if (existing) {
      return NextResponse.json({ error: 'Provider already exists', provider: { id: existing.id, ...existing.data() } }, { status: 400 });
    }

    const providerRef = db.collection('providers').doc();
    const providerData = {
      id: providerRef.id,
      name: data.name.trim(),
      type: data.type,
      shortCode: data.shortCode.trim().toUpperCase(),
      logoUrl: data.logoUrl || null,
      createdAt: Date.now(),
      createdBy: userId,
    };

    await providerRef.set(providerData);

    return NextResponse.json(providerData, { status: 201 });
  } catch (error) {
    console.error('Error creating provider:', error);
    return NextResponse.json({ error: 'Failed to create provider' }, { status: 500 });
  }
}
