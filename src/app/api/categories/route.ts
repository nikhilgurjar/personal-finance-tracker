import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const CategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().optional(),
  color: z.string().optional(),
  nature: z.enum(['fixed', 'dynamic', 'both']).default('both'),
});

// Predefined default categories to seed for new users
const DEFAULT_CATEGORIES = [
  { name: 'Rent / EMI', icon: '🏠', color: '#ef4444', nature: 'fixed' },
  { name: 'Groceries', icon: '🛒', color: '#f97316', nature: 'dynamic' },
  { name: 'Dining Out', icon: '🍽️', color: '#eab308', nature: 'dynamic' },
  { name: 'Transport', icon: '🚗', color: '#3b82f6', nature: 'dynamic' },
  { name: 'Fuel', icon: '⛽', color: '#2563eb', nature: 'dynamic' },
  { name: 'Utilities', icon: '⚡', color: '#8b5cf6', nature: 'fixed' },
  { name: 'Mobile & Internet', icon: '📶', color: '#7c3aed', nature: 'fixed' },
  { name: 'Subscriptions', icon: '📱', color: '#06b6d4', nature: 'fixed' },
  { name: 'Health & Medical', icon: '🏥', color: '#10b981', nature: 'dynamic' },
  { name: 'Pharmacy', icon: '💊', color: '#22c55e', nature: 'dynamic' },
  { name: 'Entertainment', icon: '🎬', color: '#f43f5e', nature: 'dynamic' },
  { name: 'Shopping', icon: '🛍️', color: '#a855f7', nature: 'dynamic' },
  { name: 'Insurance', icon: '🛡️', color: '#64748b', nature: 'fixed' },
  { name: 'Education', icon: '📚', color: '#0ea5e9', nature: 'fixed' },
  { name: 'Travel', icon: '✈️', color: '#14b8a6', nature: 'dynamic' },
  { name: 'Hotels & Stay', icon: '🏨', color: '#0f766e', nature: 'dynamic' },
  { name: 'Flight Tickets', icon: '🛫', color: '#06b6d4', nature: 'dynamic' },
  { name: 'Investments', icon: '📈', color: '#16a34a', nature: 'both' },
  { name: 'Savings', icon: '💰', color: '#15803d', nature: 'both' },
  { name: 'Credit Card Payment', icon: '💳', color: '#1d4ed8', nature: 'fixed' },
  { name: 'Loan Payment', icon: '🏦', color: '#475569', nature: 'fixed' },
  { name: 'Bank Charges', icon: '🏛️', color: '#334155', nature: 'dynamic' },
  { name: 'Taxes', icon: '🧾', color: '#b45309', nature: 'fixed' },
  { name: 'Salary', icon: '💼', color: '#059669', nature: 'fixed' },
  { name: 'Freelance Income', icon: '🧑‍💻', color: '#0284c7', nature: 'dynamic' },
  { name: 'Business Income', icon: '🏢', color: '#0369a1', nature: 'dynamic' },
  { name: 'Cash Withdrawal', icon: '🏧', color: '#6b7280', nature: 'dynamic' },
  { name: 'Family', icon: '👨‍👩‍👧', color: '#db2777', nature: 'dynamic' },
  { name: 'Kids', icon: '🧸', color: '#f59e0b', nature: 'dynamic' },
  { name: 'Pets', icon: '🐶', color: '#84cc16', nature: 'dynamic' },
  { name: 'Personal Care', icon: '💇', color: '#ec4899', nature: 'dynamic' },
  { name: 'Gym & Fitness', icon: '🏋️', color: '#dc2626', nature: 'fixed' },
  { name: 'Gifts & Donations', icon: '🎁', color: '#ec4899', nature: 'dynamic' },
  { name: 'Home Maintenance', icon: '🛠️', color: '#78716c', nature: 'dynamic' },
  { name: 'Office Expenses', icon: '🖥️', color: '#4b5563', nature: 'dynamic' },
  { name: 'Miscellaneous', icon: '📦', color: '#94a3b8', nature: 'both' },
  { name: 'Other', icon: '📂', color: '#64748b', nature: 'both' },
];

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
