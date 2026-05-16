'use client';

import { Box, Typography, BoxProps } from '@mui/material';
import { ReactNode } from 'react';

interface QuickActionCardProps extends BoxProps {
  title: string;
  icon: ReactNode;
  color?: 'blue' | 'red' | 'green' | 'purple' | 'orange' | 'teal';
  onClick?: () => void;
}

const colorStyles = {
  blue: {
    background: '#EBF8FF',
    hoverBackground: '#DBEAFE',
    iconColor: '#3B82F6',
    textColor: '#1E40AF',
  },
  red: {
    background: '#FEF2F2',
    hoverBackground: '#FEE2E2',
    iconColor: '#EF4444',
    textColor: '#B91C1C',
  },
  green: {
    background: '#F0FDF4',
    hoverBackground: '#DCFCE7',
    iconColor: '#10B981',
    textColor: '#047857',
  },
  purple: {
    background: '#FAF5FF',
    hoverBackground: '#F3E8FF',
    iconColor: '#8B5CF6',
    textColor: '#7C3AED',
  },
  orange: {
    background: '#FFF7ED',
    hoverBackground: '#FFEDD5',
    iconColor: '#F59E0B',
    textColor: '#D97706',
  },
  teal: {
    background: '#F0FDFA',
    hoverBackground: '#CCFBF1',
    iconColor: '#14B8A6',
    textColor: '#0D9488',
  },
};

export function QuickActionCard({ 
  title, 
  icon, 
  color = 'blue',
  onClick,
  sx,
  ...props 
}: QuickActionCardProps) {
  const styles = colorStyles[color];
  
  return (
    <Box
      onClick={onClick}
      sx={{
        background: styles.background,
        borderRadius: 2,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          background: styles.hoverBackground,
          transform: 'translateY(-2px)',
        },
        ...sx,
      }}
      {...props}
    >
      <Box
        sx={{
          color: styles.iconColor,
          mb: 1,
          '& svg': {
            width: 24,
            height: 24,
          },
        }}
      >
        {icon}
      </Box>
      <Typography
        variant="body2"
        sx={{
          color: styles.textColor,
          fontWeight: 600,
          textAlign: 'center',
          fontSize: '0.875rem',
        }}
      >
        {title}
      </Typography>
    </Box>
  );
}
