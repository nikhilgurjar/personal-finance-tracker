'use client';

import { Box, Typography, IconButton, BoxProps } from '@mui/material';
import { TrendingUp, TrendingDown, MoreVert, Edit, Delete } from '@mui/icons-material';
import { ReactNode } from 'react';

interface TransactionItemProps extends BoxProps {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  category: string;
  date: string;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export function TransactionItem({ 
  id,
  type, 
  amount, 
  description, 
  category, 
  date,
  onEdit,
  onDelete,
  sx,
  ...props 
}: TransactionItemProps) {
  const isIncome = type === 'income';
  const Icon = isIncome ? TrendingUp : TrendingDown;
  
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        p: 2,
        background: 'white',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'grey.200',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transform: 'translateY(-1px)',
        },
        ...sx,
      }}
      {...props}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Box
          sx={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: isIncome ? '#D1FAE5' : '#FEE2E2',
          }}
        >
          <Icon
            sx={{
              color: isIncome ? '#10B981' : '#EF4444',
              width: 20,
              height: 20,
            }}
          />
        </Box>
        
        <Box>
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'text.primary' }}>
            {description}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {category}
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              •
            </Typography>
            <Typography variant="body2" sx={{ color: 'text.secondary' }}>
              {date}
            </Typography>
          </Box>
        </Box>
      </Box>
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography
          variant="h6"
          sx={{
            fontWeight: 700,
            color: isIncome ? 'success.main' : 'error.main',
            fontSize: '1.125rem',
          }}
        >
          {isIncome ? '+' : '-'}₹{amount.toLocaleString()}
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {onEdit && (
            <IconButton
              size="small"
              onClick={() => onEdit(id)}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'primary.main',
                  background: 'primary.lighter',
                },
              }}
            >
              <Edit sx={{ width: 16, height: 16 }} />
            </IconButton>
          )}
          {onDelete && (
            <IconButton
              size="small"
              onClick={() => onDelete(id)}
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  color: 'error.main',
                  background: 'error.lighter',
                },
              }}
            >
              <Delete sx={{ width: 16, height: 16 }} />
            </IconButton>
          )}
        </Box>
      </Box>
    </Box>
  );
}
