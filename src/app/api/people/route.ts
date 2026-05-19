import { db, authAdmin } from '@/lib/firebaseAdmin';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const PersonSchema = z.object({
  name: z.string().min(1),
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
    const [peopleSnapshot, loansSnapshot, repaymentsSnapshot] = await Promise.all([
      db.collection('users').doc(userId).collection('people').get(),
      db.collection('users').doc(userId).collection('loans').get(),
      db.collection('users').doc(userId).collection('loanRepayments').get()
    ]);

    const peopleDocs = peopleSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const loans = loansSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const repayments = repaymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    const peopleMap: Record<string, any> = {};

    // First initialize explicit people from the DB
    peopleDocs.forEach((p: any) => {
      peopleMap[p.id] = {
        id: p.id,
        name: p.name,
        netBalance: 0,
        totalLent: 0,
        totalBorrowed: 0,
        totalPayable: 0,
        loans: [],
      };
    });

    // Helper to find a person by name (case-insensitive) for legacy matching
    const findPersonByName = (name: string) => {
      const lowerName = name.trim().toLowerCase();
      return Object.values(peopleMap).find(p => p.name.trim().toLowerCase() === lowerName);
    };

    loans.forEach((loan: any) => {
      let person = null;

      // 1. Match by explicit personId
      if (loan.personId && peopleMap[loan.personId]) {
        person = peopleMap[loan.personId];
      } 
      // 2. Fallback to name matching
      else if (loan.personName) {
        person = findPersonByName(loan.personName);
        
        // 3. Create a legacy fallback in the map if absolutely no match
        if (!person) {
          const fakeId = `legacy_${loan.personName.trim().toLowerCase()}`;
          peopleMap[fakeId] = {
            id: fakeId,
            name: loan.personName.trim(),
            netBalance: 0,
            totalLent: 0,
            totalBorrowed: 0,
            totalPayable: 0,
            loans: [],
          };
          person = peopleMap[fakeId];
        }
      }

      if (!person) return; // Should never happen unless loan has no personName or personId

      const loanRepayments = repayments.filter((r: any) => r.loanId === loan.id).sort((a: any, b: any) => b.date - a.date);
      const fullLoan = { ...loan, repayments: loanRepayments };
      person.loans.push(fullLoan);

      if (loan.status === 'active') {
        if (loan.loanType === 'lent') {
          person.totalLent += loan.outstandingAmount;
          person.netBalance += loan.outstandingAmount;
        } else if (loan.loanType === 'borrowed') {
          person.totalBorrowed += loan.outstandingAmount;
          person.netBalance -= loan.outstandingAmount;
        } else if (loan.loanType === 'payable') {
          person.totalPayable += loan.outstandingAmount;
          person.netBalance -= loan.outstandingAmount;
        }
      }
    });

    const people = Object.values(peopleMap).sort((a: any, b: any) => b.netBalance - a.netBalance);

    return NextResponse.json(people);
  } catch (error) {
    console.error('Error fetching people:', error);
    return NextResponse.json({ error: 'Failed to fetch people' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await req.json();
    const data = PersonSchema.parse(body);

    const personRef = db.collection('users').doc(userId).collection('people').doc();
    const personData = {
      id: personRef.id,
      name: data.name.trim(),
      createdAt: Date.now(),
      userId,
    };

    await personRef.set(personData);

    return NextResponse.json(personData, { status: 201 });
  } catch (error) {
    console.error('Error creating person:', error);
    return NextResponse.json({ error: 'Failed to create person' }, { status: 500 });
  }
}
