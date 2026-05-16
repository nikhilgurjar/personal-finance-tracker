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
    // Fetch all loans and repayments
    const [loansSnapshot, repaymentsSnapshot] = await Promise.all([
      db.collection('users').doc(userId).collection('loans').get(),
      db.collection('users').doc(userId).collection('loanRepayments').get()
    ]);

    const loans = loansSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
    const repayments = repaymentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    // Group by personName
    const peopleMap: Record<string, any> = {};

    loans.forEach((loan: any) => {
      const name = loan.personName.trim();
      if (!peopleMap[name]) {
        peopleMap[name] = {
          name,
          netBalance: 0,
          totalLent: 0,
          totalBorrowed: 0,
          totalPayable: 0,
          loans: [],
        };
      }

      const person = peopleMap[name];
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
