import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/serverAuth';
import TransactionsClientPage from './TransactionsClientPage';

export const dynamic = 'force-dynamic';

export default async function TransactionsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return <TransactionsClientPage />;
}
