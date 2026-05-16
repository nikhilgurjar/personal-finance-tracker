import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { Transaction, SourceBreakdown, AccountType, TransactionType } from '@/lib/types';

const SourceBreakdownSchema = z.object({
  sourceAccountId: z.string(),
  amount: z.number().positive(),
  referenceTxId: z.string().optional(),
});

const TransactionSchema = z.object({
  date: z.number(),
  amount: z.number().positive(),
  currency: z.string(),
  fromAccountId: z.string(),
  toAccountId: z.string(),
  category: z.string().optional(),
  tags: z.array(z.string()).optional(),
  note: z.string().optional(),
  sourceBreakdown: z.array(SourceBreakdownSchema).optional(),
  scheduleId: z.string().optional(),
  expenseNature: z.enum(['fixed', 'dynamic']).optional(),
  sourceType: z.string().optional(), // for incomes: salary, freelance, from_person, etc.
  sourceName: z.string().optional(), // for incomes: person/employer name
});

const TransactionTypeSchema = z.enum(['expense', 'income', 'transfer', 'savings', 'salary', 'loan_repayment']);

const ExtendedTransactionSchema = TransactionSchema.extend({
  type: TransactionTypeSchema,
});

export async function POST(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;

    const body = await req.json();
    const data = ExtendedTransactionSchema.parse(body);

    const batch = db.batch();

    let collectionName;
    switch (data.type) {
      case 'expense':
        collectionName = 'expenses';
        break;
      case 'income':
        collectionName = 'incomes';
        break;
      case 'transfer':
        collectionName = 'transfers';
        break;
      case 'savings':
        collectionName = 'savings';
        break;
      case 'salary':
        collectionName = 'salaries';
        break;
      default:
        throw new Error('Invalid transaction type');
    }

    const txRef = db.collection('users').doc(userId).collection(collectionName).doc();

    const transactionData = {
      ...data,
      id: txRef.id,
      createdAt: Date.now(),
      createdBy: userId,
    };

    batch.set(txRef, transactionData);

    // Create audit log
    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      system: data.type,
      entityId: txRef.id,
      action: 'create',
      payload: transactionData,
      timestamp: Date.now(),
      userId,
    });

    await batch.commit();
    return NextResponse.json({ id: txRef.id }, { status: 201 });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return NextResponse.json({ error: 'Failed to create transaction' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    const decoded = await authAdmin.verifyIdToken(token);
    const userId = decoded.uid;

    const { searchParams } = new URL(req.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('accountId');
    const limitParam = Number(searchParams.get('limit') || '100');
    const resultLimit = Number.isFinite(limitParam)
      ? Math.min(Math.max(limitParam, 1), 500)
      : 100;

    // Define all transaction collections to fetch from
    const collections = ['expenses', 'incomes', 'transfers', 'savings', 'salaries'];
    
    // Fetch from all collections in parallel
    const transactionPromises = collections.map(async (collectionName) => {
      const collectionRef = db
        .collection('users')
        .doc(userId)
        .collection(collectionName);

      let baseQuery = collectionRef as FirebaseFirestore.Query<FirebaseFirestore.DocumentData>;

      if (startDate) {
        baseQuery = baseQuery.where('date', '>=', parseInt(startDate));
      }
      if (endDate) {
        baseQuery = baseQuery.where('date', '<=', parseInt(endDate));
      }

      if (accountId) {
        // Check both fromAccountId and toAccountId for transfers
        const fromQuery = baseQuery.where('fromAccountId', '==', accountId).limit(resultLimit);
        const toQuery = baseQuery.where('toAccountId', '==', accountId).limit(resultLimit);
        
        const [fromSnapshot, toSnapshot] = await Promise.all([
          fromQuery.get(),
          toQuery.get()
        ]);
        
        const fromDocs = fromSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          type: collectionName.slice(0, -1) // Remove 's' from end to get type
        })) as Transaction[];
        
        const toDocs = toSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          type: collectionName.slice(0, -1) // Remove 's' from end to get type
        })) as Transaction[];
        
        return [...fromDocs, ...toDocs];
      }

      const snapshot = await baseQuery.orderBy('date', 'desc').limit(resultLimit).get();
      return snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        type: collectionName.slice(0, -1) // Remove 's' from end to get type
      })) as Transaction[];
    });

    // Wait for all queries to complete
    const transactionArrays = await Promise.all(transactionPromises);
    
    // Flatten and sort all transactions by date
    const transactions = transactionArrays
      .flat()
      .sort((a, b) => (b.date || 0) - (a.date || 0))
      .slice(0, resultLimit);

    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 });
  }
}
