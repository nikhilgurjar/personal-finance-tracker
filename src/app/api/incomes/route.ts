import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const IncomeSchema = z.object({
  date: z.number(),
  amount: z.number().positive(),
  currency: z.string().default('INR'),
  toAccountId: z.string(),
  sourceType: z.enum(['salary', 'freelance', 'from_person', 'business', 'rental', 'investment', 'other']),
  sourceName: z.string().optional(), // employer name or person name
  note: z.string().optional(),
  tags: z.array(z.string()).optional(),
  month: z.string().optional(), // YYYY-MM for salary
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
    const sourceType = searchParams.get('sourceType');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let query: FirebaseFirestore.Query = db
      .collection('users').doc(userId).collection('incomes');

    if (sourceType) query = query.where('sourceType', '==', sourceType);
    if (startDate) query = query.where('date', '>=', parseInt(startDate));
    if (endDate) query = query.where('date', '<=', parseInt(endDate));

    const snapshot = await query.orderBy('date', 'desc').get();
    const incomes = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), type: 'income' }));

    return NextResponse.json(incomes);
  } catch (error) {
    console.error('Error fetching incomes:', error);
    return NextResponse.json({ error: 'Failed to fetch incomes' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = IncomeSchema.parse(body);

    const batch = db.batch();
    const incomeRef = db.collection('users').doc(userId).collection('incomes').doc();

    const incomeData = {
      ...data,
      id: incomeRef.id,
      type: 'income',
      createdAt: Date.now(),
      createdBy: userId,
    };

    batch.set(incomeRef, incomeData);

    // Audit log
    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'transaction',
      entityId: incomeRef.id,
      action: 'create',
      before: null,
      after: incomeData,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();
    return NextResponse.json(incomeData, { status: 201 });
  } catch (error) {
    console.error('Error creating income:', error);
    return NextResponse.json({ error: 'Failed to create income' }, { status: 500 });
  }
}
