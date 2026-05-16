'use client';

import { Box, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface GradientCardProps extends BoxProps {
  children: ReactNode;
  gradient?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'orange';
  variant?: 'filled' | 'outlined';
}

const gradientStyles = {
  blue: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  green: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  red: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  purple: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  teal: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  orange: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
};

export function GradientCard({ 
  children, 
  gradient = 'blue', 
  variant = 'filled',
  sx,
  ...props 
}: GradientCardProps) {
  return (
    <Box
      sx={{
        borderRadius: 3,
        p: 3,
        position: 'relative',
        overflow: 'hidden',
        ...(variant === 'filled' && {
          background: gradientStyles[gradient],
          color: 'white',
        }),
        ...(variant === 'outlined' && {
          background: 'white',
          border: '1px solid',
          borderColor: 'grey.200',
          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        }),
        ...sx,
      }}
      {...props}
    >
      {children}
    </Box>
  );
}
