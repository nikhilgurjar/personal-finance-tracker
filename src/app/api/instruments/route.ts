import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const titleCase = (str: string) => str.trim().split(/\s+/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');

function getFinancialYear(dateMs: number): string {
  const date = new Date(dateMs);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  if (month >= 3) {
    return `${year}-${String(year + 1).slice(-2)}`;
  } else {
    return `${year - 1}-${String(year).slice(-2)}`;
  }
}

function getInstrumentClassFromType(type: string): 'fixed_return' | 'market_linked' | 'govt_scheme' {
  switch (type) {
    case 'fd':
    case 'rd':
    case 'bond':
      return 'fixed_return';
    case 'stock':
    case 'equity_mf':
    case 'debt_mf':
    case 'etf':
    case 'mf':
      return 'market_linked';
    case 'ppf':
    case 'nps':
    case 'epf':
      return 'govt_scheme';
    default:
      return 'fixed_return';
  }
}

async function resolveProviderId(providerName: string): Promise<string> {
  const snapshot = await db.collection('providers').get();
  const existing = snapshot.docs.find(d => d.data().name.trim().toLowerCase() === providerName.trim().toLowerCase());
  if (existing) return existing.id;
  
  const ref = db.collection('providers').doc();
  const shortCode = providerName.trim().replace(/\s+/g, '').toUpperCase().slice(0, 8);
  await ref.set({
    id: ref.id,
    name: titleCase(providerName),
    type: 'bank',
    shortCode,
    createdAt: Date.now(),
    createdBy: 'system_compat',
  });
  return ref.id;
}

async function resolvePlatformId(platformName: string): Promise<string> {
  const snapshot = await db.collection('platforms').get();
  const existing = snapshot.docs.find(d => d.data().name.trim().toLowerCase() === platformName.trim().toLowerCase());
  if (existing) return existing.id;

  const ref = db.collection('platforms').doc();
  await ref.set({
    id: ref.id,
    name: titleCase(platformName),
    type: 'trading',
    isActive: true,
    createdAt: Date.now(),
    createdBy: 'system_compat',
  });
  return ref.id;
}

const InstrumentDetailsSchema = z.object({
  interestRate: z.number().optional(),
  maturityDate: z.number().optional(),
  maturityAmount: z.number().optional(),
  payoutFrequency: z.string().optional(),
  accountNumber: z.string().optional(),
  tdsApplicable: z.boolean().optional(),
  isin: z.string().optional(),
  folioNumber: z.string().optional(),
  dematAccountNo: z.string().optional(),
  units: z.number().optional(),
  avgCostBasis: z.number().optional(),
  currentNAV: z.number().optional(),
  navUpdatedAt: z.number().optional(),
  npsAccountType: z.string().optional(),
  lockInUntil: z.number().optional(),
}).optional();

const InstrumentSchema = z.object({
  name: z.string().min(1),
  type: z.string().min(1),
  instrumentClass: z.enum(['fixed_return', 'market_linked', 'govt_scheme']).optional(),
  provider: z.string().optional(), // legacy
  providerId: z.string().optional(),
  platform: z.string().optional(), // legacy
  platformId: z.string().optional(),
  ownerName: z.string().optional(),
  ownerId: z.string().optional(),
  goalIds: z.array(z.string()).optional(),
  sipScheduleId: z.string().optional(),
  accountNumber: z.string().optional(),
  currency: z.string().optional(),
  openedAt: z.number(),
  closedAt: z.number().optional(),
  closeReason: z.string().optional(),
  maturityDate: z.number().optional(),
  interestRate: z.number().optional(),
  principalAmount: z.number().optional(),
  currentValue: z.number().optional(),
  status: z.enum(['active', 'closed', 'matured']).default('active'),
  linkedAccountId: z.string().optional(),
  details: InstrumentDetailsSchema,
  metadata: z.record(z.any()).optional(),
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

async function syncGoalAmounts(userId: string, goalIds: string[], instrumentId: string, value: number) {
  for (const goalId of goalIds) {
    try {
      const goalRef = db.collection('users').doc(userId).collection('goals').doc(goalId);
      const goalDoc = await goalRef.get();
      if (!goalDoc.exists) continue;
      const goal = goalDoc.data()!;

      const instrumentsSnap = await db
        .collection('users').doc(userId)
        .collection('instruments')
        .where('status', '==', 'active')
        .get();

      let total = 0;
      instrumentsSnap.docs.forEach(doc => {
        const inst = doc.data();
        const linkedGoals: string[] = inst.goalIds || [];
        if (linkedGoals.includes(goalId)) {
          total += doc.id === instrumentId ? value : (inst.currentValue || 0);
        }
      });

      const existingAllocations: any[] = goal.allocations || [];
      const nonInstrumentAllocations = existingAllocations.filter((a: any) => !a.instrumentId);
      const accountTotal = nonInstrumentAllocations.reduce((s: number, a: any) => s + (a.amount || 0), 0);

      await goalRef.update({
        currentAmount: accountTotal + total,
        updatedAt: Date.now(),
      });
    } catch (e) {
      console.error(`Failed to sync goal ${goalId}:`, e);
    }
  }
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    const status = searchParams.get('status');
    const instrumentClass = searchParams.get('instrumentClass');

    let query: FirebaseFirestore.Query = db
      .collection('users').doc(userId).collection('instruments');

    if (type) query = query.where('type', '==', type);
    if (status) query = query.where('status', '==', status);
    if (instrumentClass) query = query.where('instrumentClass', '==', instrumentClass);

    const snapshot = await query.orderBy('createdAt', 'desc').get();
    const instruments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    return NextResponse.json(instruments);
  } catch (error) {
    console.error('Error fetching instruments:', error);
    return NextResponse.json({ error: 'Failed to fetch instruments' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = InstrumentSchema.parse(body);

    const resolvedClass = data.instrumentClass || getInstrumentClassFromType(data.type);
    
    // Resolve providerId and platformId if only legacy names are provided
    let providerId = data.providerId;
    if (!providerId && data.provider) {
      providerId = await resolveProviderId(data.provider);
    } else if (!providerId) {
      providerId = 'unknown';
    }

    let platformId = data.platformId;
    if (!platformId && data.platform) {
      platformId = await resolvePlatformId(data.platform);
    }

    // Build details object based on class
    const details: any = data.details || {};
    const principal = data.principalAmount ?? 0;
    let currentValue = data.currentValue ?? principal;

    if (resolvedClass === 'market_linked') {
      details.units = details.units ?? 0;
      details.avgCostBasis = details.avgCostBasis ?? 0;
      details.currentNAV = details.currentNAV ?? 0;
      if (details.units && details.currentNAV) {
        currentValue = details.units * details.currentNAV;
      }
    } else if (resolvedClass === 'fixed_return') {
      details.interestRate = details.interestRate ?? data.interestRate;
      details.maturityDate = details.maturityDate ?? data.maturityDate;
      details.accountNumber = details.accountNumber ?? data.accountNumber;
    }

    const batch = db.batch();
    const instRef = db.collection('users').doc(userId).collection('instruments').doc();

    const openEvent = {
      id: `${instRef.id}_opened`,
      type: 'opened',
      date: data.openedAt,
      amount: principal,
      units: resolvedClass === 'market_linked' ? details.units : undefined,
      navAtPurchase: resolvedClass === 'market_linked' ? details.currentNAV : undefined,
      financialYear: getFinancialYear(data.openedAt),
      note: `Opened ${data.name}`,
    };

    const instrumentData: any = {
      id: instRef.id,
      name: data.name,
      type: data.type,
      instrumentClass: resolvedClass,
      providerId,
      platformId: platformId || null,
      provider: data.provider || null, // legacy support
      platform: data.platform || null, // legacy support
      ownerName: data.ownerName || 'Myself',
      ownerId: data.ownerId || null,
      goalIds: data.goalIds || [],
      sipScheduleId: data.sipScheduleId || null,
      accountNumber: data.accountNumber || null,
      currency: data.currency || null, // null inherits base currency
      openedAt: data.openedAt,
      closedAt: data.closedAt || null,
      closeReason: data.closeReason || null,
      maturityDate: data.maturityDate || null,
      interestRate: data.interestRate || null,
      principalAmount: principal,
      currentValue,
      unrealizedGain: resolvedClass === 'market_linked' ? (currentValue - (details.units * details.avgCostBasis)) : 0,
      status: data.status,
      linkedAccountId: data.linkedAccountId || null,
      details,
      events: [openEvent],
      createdAt: Date.now(),
      createdBy: userId,
      metadata: data.metadata || {},
    };

    batch.set(instRef, instrumentData);

    const auditRef = db.collection('users').doc(userId).collection('auditLogs').doc();
    batch.set(auditRef, {
      id: auditRef.id,
      entity: 'savings_instrument',
      entityId: instRef.id,
      action: 'create',
      before: null,
      after: instrumentData,
      by: userId,
      at: Date.now(),
      reason: 'manual',
    });

    await batch.commit();

    if (data.goalIds && data.goalIds.length > 0) {
      await syncGoalAmounts(userId, data.goalIds, instRef.id, currentValue);
    }

    return NextResponse.json(instrumentData, { status: 201 });
  } catch (error) {
    console.error('Error creating instrument:', error);
    return NextResponse.json({ error: 'Failed to create instrument' }, { status: 500 });
  }
}
