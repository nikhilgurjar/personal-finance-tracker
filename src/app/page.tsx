import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/serverAuth';
import HomeClientPage from './HomeClientPage';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const user = await getCurrentUser();

  if (user) {
    redirect('/dashboard');
  }

  return <HomeClientPage />;
}
