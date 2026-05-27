import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/serverAuth';
import ForecastClientPage from './ForecastClientPage';

export const dynamic = 'force-dynamic';

export default async function ForecastPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  return <ForecastClientPage userId={user.uid} />;
}
