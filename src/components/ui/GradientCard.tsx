'use client';

import { ReactNode } from 'react';

interface GradientCardProps {
  children: ReactNode;
  gradient?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'orange';
  variant?: 'filled' | 'outlined';
  className?: string;
}

const gradientClasses = {
  blue: 'from-blue-500 to-blue-700',
  green: 'from-green-500 to-green-700',
  red: 'from-red-500 to-red-700',
  purple: 'from-purple-500 to-purple-700',
  teal: 'from-teal-500 to-teal-700',
  orange: 'from-orange-500 to-orange-700',
};

export function GradientCard({
  children,
  gradient = 'blue',
  variant = 'filled',
  className = '',
}: GradientCardProps) {
  if (variant === 'filled') {
    return (
      <div
        className={`rounded-lg p-6 text-white relative overflow-hidden bg-gradient-to-br ${gradientClasses[gradient]} ${className}`}
      >
        {children}
      </div>
    );
  }

  return (
    <div className={`rounded-lg p-6 bg-white border border-gray-200 shadow-sm ${className}`}>
      {children}
    </div>
  );
}
