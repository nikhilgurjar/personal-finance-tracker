'use client';

import { ReactNode } from 'react';

interface StatCardProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'orange';
  className?: string;
}

const gradientStyles = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-green-500 to-green-700',
  red: 'from-red-500 to-red-700',
  purple: 'from-purple-500 to-purple-700',
  teal: 'from-teal-500 to-teal-700',
  orange: 'from-orange-500 to-orange-700',
};

export function StatCard({
  title,
  value,
  icon,
  trend,
  gradient = 'blue',
  className = '',
}: StatCardProps) {
  return (
    <div className={`bg-gradient-to-br ${gradientStyles[gradient]} rounded-lg p-6 text-white relative overflow-hidden ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium opacity-90">{title}</p>
        {icon && <div className="opacity-80">{icon}</div>}
      </div>

      <h3 className="text-3xl font-bold mb-2 leading-tight">
        {typeof value === 'number' ? value.toLocaleString() : value}
      </h3>

      {trend && (
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${trend.isPositive ? 'text-white' : 'opacity-70'}`}>
            {trend.isPositive ? '+' : ''}{trend.value}%
          </span>
          <span className="text-xs opacity-70">vs last month</span>
        </div>
      )}
    </div>
  );
}
