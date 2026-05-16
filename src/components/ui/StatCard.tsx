'use client';

import { Box, Typography, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface StatCardProps extends BoxProps {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  gradient?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'orange';
}

const gradientStyles = {
  blue: 'linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)',
  green: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
  red: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)',
  purple: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)',
  teal: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  orange: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
};

export function StatCard({ 
  title, 
  value, 
  icon, 
  trend,
  gradient = 'blue',
  sx,
  ...props 
}: StatCardProps) {
  return (
    <Box
      sx={{
        background: gradientStyles[gradient],
        borderRadius: 3,
        p: 3,
        color: 'white',
        position: 'relative',
        overflow: 'hidden',
        ...sx,
      }}
      {...props}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography 
          variant="body2" 
          sx={{ 
            opacity: 0.9, 
            fontWeight: 500,
            fontSize: '0.875rem',
          }}
        >
          {title}
        </Typography>
        {icon && (
          <Box sx={{ opacity: 0.8 }}>
            {icon}
          </Box>
        )}
      </Box>
      
      <Typography 
        variant="h4" 
        sx={{ 
          fontWeight: 800, 
          mb: trend ? 1 : 0,
          fontSize: '1.875rem',
          lineHeight: 1.2,
        }}
      >
        {typeof value === 'number' ? value.toLocaleString() : value}
      </Typography>
      
      {trend && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: trend.isPositive ? 'rgba(255,255,255,0.9)' : 'rgba(255,255,255,0.7)',
              fontWeight: 600,
            }}
          >
            {trend.isPositive ? '+' : ''}{trend.value}%
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            vs last month
          </Typography>
        </Box>
      )}
    </Box>
  );
}
