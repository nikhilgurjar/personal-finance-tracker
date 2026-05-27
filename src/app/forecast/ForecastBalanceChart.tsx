'use client';

import dynamic from 'next/dynamic';

const ForecastChart = dynamic(() => import('./ForecastChartInner'), {
  ssr: false,
  loading: () => <div className="h-[360px] animate-pulse rounded-lg bg-slate-100" />,
});

export default function ForecastBalanceChart({ daily }: { daily: any[] }) {
  return <ForecastChart daily={daily} />;
}
