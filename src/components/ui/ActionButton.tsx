'use client';

import { Button, ButtonProps } from '@mui/material';
import { ReactNode } from 'react';

interface ActionButtonProps extends Omit<ButtonProps, 'variant'> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'success' | 'error' | 'outlined' | 'ghost';
  size?: 'small' | 'medium' | 'large';
  icon?: ReactNode;
}

const variantStyles = {
  primary: {
    background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #2563EB 0%, #7C3AED 100%)',
    },
  },
  secondary: {
    background: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #7C3AED 0%, #DB2777 100%)',
    },
  },
  success: {
    background: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #059669 0%, #0D9488 100%)',
    },
  },
  error: {
    background: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
    color: 'white',
    '&:hover': {
      background: 'linear-gradient(135deg, #DC2626 0%, #EA580C 100%)',
    },
  },
  outlined: {
    background: 'white',
    color: 'primary.main',
    border: '1px solid',
    borderColor: 'primary.main',
    '&:hover': {
      background: 'primary.lighter',
    },
  },
  ghost: {
    background: 'transparent',
    color: 'text.primary',
    '&:hover': {
      background: 'grey.100',
    },
  },
};

const sizeStyles = {
  small: {
    padding: '8px 16px',
    fontSize: '0.875rem',
    minHeight: '36px',
  },
  medium: {
    padding: '12px 24px',
    fontSize: '1rem',
    minHeight: '44px',
  },
  large: {
    padding: '16px 32px',
    fontSize: '1.125rem',
    minHeight: '52px',
  },
};

export function ActionButton({ 
  children, 
  variant = 'primary', 
  size = 'medium',
  icon,
  sx,
  ...props 
}: ActionButtonProps) {
  return (
    <Button
      sx={{
        borderRadius: 2,
        fontWeight: 600,
        textTransform: 'none',
        boxShadow: 'none',
        ...variantStyles[variant],
        ...sizeStyles[size],
        ...(icon && {
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }),
        ...sx,
      }}
      {...props}
    >
      {icon}
      {children}
    </Button>
  );
}
