import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/serverAuth';
import PageClient from './PageClient';

export const dynamic = 'force-dynamic';

export default async function Page() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return <PageClient />;
}
