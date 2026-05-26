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

const DEFAULT_INSTRUMENT_MASTERS = [
  { isin: 'INF769K01168', name: 'Mirae Asset Large Cap Fund - Direct Growth', type: 'mf_equity', providerShortCode: 'MIRAE', category: 'large_cap', currentNAV: 98.45 },
  { isin: 'INF589K01231', name: 'Parag Parikh Flexi Cap Fund - Direct Growth', type: 'mf_equity', providerShortCode: 'UTI', category: 'flexi_cap', currentNAV: 75.32 },
  { isin: 'INF179K01933', name: 'HDFC Index Fund S&P BSE Sensex - Direct Growth', type: 'mf_equity', providerShortCode: 'HDFCBANK', category: 'index', currentNAV: 62.11 },
  { isin: 'INF204KB18I2', name: 'Nifty BEES ETF', type: 'etf', providerShortCode: 'NIPPON', category: 'index', currentNAV: 262.50 },
  { isin: 'INE002A01018', name: 'Reliance Industries Ltd', type: 'equity', providerShortCode: 'CDSL', category: 'large_cap', currentNAV: 2450.00 },
  { isin: 'INE040A01034', name: 'HDFC Bank Ltd', type: 'equity', providerShortCode: 'HDFCBANK', category: 'large_cap', currentNAV: 1520.00 }
];

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const query = searchParams.get('q') || '';

  try {
    const snapshot = await db.collection('instrument_masters').get();
    let masters = snapshot.docs.map(d => ({ isin: d.id, ...d.data() }));

    if (masters.length === 0) {
      // First make sure providers exist
      const providersSnapshot = await db.collection('providers').get();
      let providers = providersSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // If providers isn't seeded, we can query it to force seed it or use fallback
      if (providers.length === 0) {
        // Fetch to trigger seed
        const pRef = db.collection('providers');
        // Simple fallback/create inline if necessary, or just wait. 
        // We will query providers and if empty, we write defaults first:
        const batch = db.batch();
        const DEFAULT_PROVIDERS = [
          { name: 'HDFC Bank', type: 'bank', shortCode: 'HDFCBANK' },
          { name: 'SBI', type: 'bank', shortCode: 'SBI' },
          { name: 'ICICI Bank', type: 'bank', shortCode: 'ICICI' },
          { name: 'Axis Bank', type: 'bank', shortCode: 'AXIS' },
          { name: 'Mirae Asset', type: 'amc', shortCode: 'MIRAE' },
          { name: 'Nippon India', type: 'amc', shortCode: 'NIPPON' },
          { name: 'SBI Mutual Fund', type: 'amc', shortCode: 'SBIMF' },
          { name: 'UTI AMC', type: 'amc', shortCode: 'UTI' },
          { name: 'NSDL', type: 'broker', shortCode: 'NSDL' },
          { name: 'CDSL', type: 'broker', shortCode: 'CDSL' },
        ];
        DEFAULT_PROVIDERS.forEach(p => {
          const docRef = pRef.doc();
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
        const freshProviders = await pRef.get();
        providers = freshProviders.docs.map(d => ({ id: d.id, ...d.data() }));
      }

      const batch = db.batch();
      for (const item of DEFAULT_INSTRUMENT_MASTERS) {
        const provider = providers.find((p: any) => p.shortCode === item.providerShortCode);
        const providerId = provider ? provider.id : 'unknown';
        const docRef = db.collection('instrument_masters').doc(item.isin);
        batch.set(docRef, {
          isin: item.isin,
          name: item.name,
          type: item.type,
          providerId,
          category: item.category,
          currentNAV: item.currentNAV,
          navUpdatedAt: Date.now(),
          createdAt: Date.now(),
          createdBy: 'system',
        });
      }
      await batch.commit();

      const newSnapshot = await db.collection('instrument_masters').get();
      masters = newSnapshot.docs.map(d => ({ isin: d.id, ...d.data() }));
    }

    if (query) {
      const lowerQuery = query.toLowerCase();
      masters = masters.filter((m: any) => 
        m.name.toLowerCase().includes(lowerQuery) || 
        m.isin.toLowerCase().includes(lowerQuery)
      );
    }

    return NextResponse.json(masters.slice(0, 20));
  } catch (error) {
    console.error('Error fetching instrument masters:', error);
    return NextResponse.json({ error: 'Failed to fetch instrument masters' }, { status: 500 });
  }
}
