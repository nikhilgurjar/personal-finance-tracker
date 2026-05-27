'use client';

import { ReactNode } from 'react';

interface QuickActionCardProps {
  title: string;
  icon: ReactNode;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'teal';
  onClick?: () => void;
  className?: string;
}

const colorStyles = {
  blue: { bg: 'bg-blue-50', hover: 'hover:bg-blue-100', icon: 'text-blue-500', text: 'text-blue-900' },
  red: { bg: 'bg-red-50', hover: 'hover:bg-red-100', icon: 'text-red-500', text: 'text-red-900' },
  green: { bg: 'bg-green-50', hover: 'hover:bg-green-100', icon: 'text-green-500', text: 'text-green-900' },
  purple: { bg: 'bg-purple-50', hover: 'hover:bg-purple-100', icon: 'text-purple-500', text: 'text-purple-900' },
  orange: { bg: 'bg-orange-50', hover: 'hover:bg-orange-100', icon: 'text-orange-500', text: 'text-orange-900' },
  teal: { bg: 'bg-teal-50', hover: 'hover:bg-teal-100', icon: 'text-teal-500', text: 'text-teal-900' },
};

export function QuickActionCard({
  title,
  icon,
  color = 'blue',
  onClick,
  className = '',
}: QuickActionCardProps) {
  const styles = colorStyles[color];

  return (
    <button
      onClick={onClick}
      className={`
        ${styles.bg} ${styles.hover}
        rounded-lg p-4 flex flex-col items-center gap-2
        cursor-pointer transition-all hover:-translate-y-0.5
        ${className}
      `}
    >
      <div className={`${styles.icon}`}>
        {icon}
      </div>
      <p className={`text-sm font-semibold ${styles.text} text-center`}>{title}</p>
    </button>
  );
}
