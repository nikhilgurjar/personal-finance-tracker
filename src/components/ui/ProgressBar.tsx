'use client';

import { Box, Typography, BoxProps } from '@mui/material';

interface ProgressBarProps extends BoxProps {
  value: number;
  max?: number;
  label?: string;
  showPercentage?: boolean;
  color?: 'blue' | 'green' | 'red' | 'purple' | 'teal' | 'orange';
  size?: 'small' | 'medium' | 'large';
}

const colorStyles = {
  blue: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
  green: 'linear-gradient(135deg, #10B981 0%, #14B8A6 100%)',
  red: 'linear-gradient(135deg, #EF4444 0%, #F97316 100%)',
  purple: 'linear-gradient(135deg, #8B5CF6 0%, #EC4899 100%)',
  teal: 'linear-gradient(135deg, #14B8A6 0%, #0D9488 100%)',
  orange: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)',
};

const sizeStyles = {
  small: { height: 6 },
  medium: { height: 8 },
  large: { height: 12 },
};

export function ProgressBar({ 
  value, 
  max = 100, 
  label,
  showPercentage = true,
  color = 'blue',
  size = 'medium',
  sx,
  ...props 
}: ProgressBarProps) {
  const percentage = Math.min((value / max) * 100, 100);
  const isCompleted = percentage >= 100;
  
  return (
    <Box sx={{ ...sx }} {...props}>
      {(label || showPercentage) && (
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          {label && (
            <Typography variant="body2" sx={{ fontWeight: 600, color: 'text.primary' }}>
              {label}
            </Typography>
          )}
          {showPercentage && (
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 700, 
                color: isCompleted ? 'success.main' : 'primary.main',
                fontSize: '0.875rem',
              }}
            >
              {Math.round(percentage)}%
            </Typography>
          )}
        </Box>
      )}
      
      <Box
        sx={{
          width: '100%',
          background: 'grey.200',
          borderRadius: 1,
          overflow: 'hidden',
          ...sizeStyles[size],
        }}
      >
        <Box
          sx={{
            width: `${percentage}%`,
            height: '100%',
            background: isCompleted 
              ? 'linear-gradient(135deg, #10B981 0%, #059669 100%)'
              : colorStyles[color],
            borderRadius: 1,
            transition: 'width 0.5s ease-in-out',
          }}
        />
      </Box>
    </Box>
  );
}
