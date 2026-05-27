'use client';

import { ReactNode } from 'react';

interface ActionButtonProps {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'outlined' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: ReactNode;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  onClick?: () => void;
  className?: string;
}

const variantClasses = {
  primary: 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700',
  secondary: 'bg-gradient-to-r from-purple-500 to-pink-600 text-white hover:from-purple-600 hover:to-pink-700',
  success: 'bg-gradient-to-r from-green-500 to-teal-600 text-white hover:from-green-600 hover:to-teal-700',
  error: 'bg-gradient-to-r from-red-500 to-orange-600 text-white hover:from-red-600 hover:to-orange-700',
  outlined: 'border-2 border-blue-500 text-blue-600 bg-white hover:bg-blue-50',
  ghost: 'bg-transparent text-gray-900 hover:bg-gray-100',
};

const sizeClasses = {
  small: 'px-4 py-2 text-sm h-9',
  medium: 'px-6 py-3 text-base h-11',
  large: 'px-8 py-4 text-lg h-13',
};

export function ActionButton({
  children,
  variant = 'primary',
  size = 'medium',
  icon,
  disabled = false,
  type = 'button',
  onClick,
  className = '',
}: ActionButtonProps) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        font-semibold rounded-lg transition-all duration-200
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${icon ? 'flex items-center gap-2' : ''}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${className}
      `}
    >
      {icon}
      {children}
    </button>
  );
}
