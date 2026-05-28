import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { DEFAULT_CATEGORIES } from '@/lib/constants';

const CategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  nature: z.enum(['fixed', 'dynamic', 'both']).default('both'),
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

  try {
    const { searchParams } = new URL(req.url);
    const nature = searchParams.get('nature');

    const categoriesRef = db.collection('users').doc(userId).collection('categories');
    let query: FirebaseFirestore.Query = categoriesRef;
    if (nature) query = query.where('nature', 'in', [nature, 'both']);

    const snapshot = await query.orderBy('name', 'asc').get();

    // If no categories exist yet, seed with defaults
    if (snapshot.empty) {
      const batch = db.batch();
      const seeded = DEFAULT_CATEGORIES.map(cat => {
        const ref = categoriesRef.doc();
        const data = {
          id: ref.id,
          ...cat,
          isDefault: true,
          createdAt: Date.now(),
          createdBy: userId,
        };
        batch.set(ref, data);
        return data;
      });
      await batch.commit();
      return NextResponse.json(nature
        ? seeded.filter(c => c.nature === nature || c.nature === 'both')
        : seeded);
    }

    const categories = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = CategorySchema.parse(body);

    const catRef = db.collection('users').doc(userId).collection('categories').doc();
    const catData = {
      ...data,
      id: catRef.id,
      isDefault: false,
      createdAt: Date.now(),
      createdBy: userId,
    };

    await catRef.set(catData);
    return NextResponse.json(catData, { status: 201 });
  } catch (error) {
    console.error('Error creating category:', error);
    return NextResponse.json({ error: 'Failed to create category' }, { status: 500 });
  }
}
