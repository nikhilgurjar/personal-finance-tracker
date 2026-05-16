'use client';

import { useRouter, useSearchParams } from 'next/navigation';

export function MonthPicker({ month }: { month: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('month', value);
    router.replace(`/dashboard?${params.toString()}`);
  };

  return (
    <input
      type="month"
      value={month}
      onChange={(event) => handleChange(event.target.value)}
      style={{
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        fontSize: '1rem',
      }}
    />
  );
}
