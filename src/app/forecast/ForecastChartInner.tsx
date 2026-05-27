'use client';

import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

function formatCurrency(value = 0) {
  return `Rs ${Math.round(value).toLocaleString('en-IN')}`;
}

function formatDate(value: number | string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export default function ForecastChartInner({ daily }: { daily: any[] }) {
  return (
    <div className="h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={daily}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={28} />
          <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
          <Tooltip labelFormatter={(label) => formatDate(label)} formatter={(value) => [formatCurrency(Number(value)), 'Balance']} />
          <Line type="monotone" dataKey="totalBalance" stroke="#2563eb" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
