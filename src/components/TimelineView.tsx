'use client';

import { Box, Typography, Chip, Divider } from '@mui/material';
import {
  TrendingUp, TrendingDown, SwapHoriz, Savings,
  AccountBalance, Receipt, Handshake, Timeline,
} from '@mui/icons-material';

export interface TimelineEventData {
  id: string;
  date: number; // epoch ms
  title: string;
  subtitle?: string;
  amount?: number;
  currency?: string;
  type: 'income' | 'expense' | 'transfer' | 'savings' | 'loan' | 'instrument' | 'repayment';
  action?: 'create' | 'update' | 'delete';
  note?: string;
  tags?: string[];
}

interface TimelineViewProps {
  events: TimelineEventData[];
  emptyMessage?: string;
}

const TYPE_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  income: { icon: <TrendingUp fontSize="small" />, color: '#10b981', bgColor: '#d1fae5' },
  expense: { icon: <TrendingDown fontSize="small" />, color: '#ef4444', bgColor: '#fee2e2' },
  transfer: { icon: <SwapHoriz fontSize="small" />, color: '#3b82f6', bgColor: '#dbeafe' },
  savings: { icon: <Savings fontSize="small" />, color: '#8b5cf6', bgColor: '#ede9fe' },
  loan: { icon: <Handshake fontSize="small" />, color: '#f97316', bgColor: '#ffedd5' },
  instrument: { icon: <AccountBalance fontSize="small" />, color: '#06b6d4', bgColor: '#cffafe' },
  repayment: { icon: <Receipt fontSize="small" />, color: '#14b8a6', bgColor: '#ccfbf1' },
};

function groupByDate(events: TimelineEventData[]) {
  const groups: Record<string, TimelineEventData[]> = {};
  const sorted = [...events].sort((a, b) => b.date - a.date);
  sorted.forEach(event => {
    const dateKey = new Date(event.date).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(event);
  });
  return groups;
}

export function TimelineView({ events, emptyMessage = 'No events yet' }: TimelineViewProps) {
  if (events.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 6 }}>
        <Timeline sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
        <Typography variant="body1" color="text.secondary">{emptyMessage}</Typography>
      </Box>
    );
  }

  const groups = groupByDate(events);

  return (
    <Box sx={{ position: 'relative' }}>
      {/* Vertical line */}
      <Box sx={{
        position: 'absolute', left: 20, top: 0, bottom: 0, width: 2,
        background: 'linear-gradient(to bottom, #e2e8f0, #e2e8f0)',
        zIndex: 0,
      }} />

      {Object.entries(groups).map(([dateLabel, dateEvents]) => (
        <Box key={dateLabel} sx={{ mb: 3 }}>
          {/* Date separator */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2, position: 'relative', zIndex: 1 }}>
            <Box sx={{ width: 40, display: 'flex', justifyContent: 'center' }}>
              <Box sx={{
                width: 10, height: 10, borderRadius: '50%',
                bgcolor: 'grey.400', border: '2px solid white',
                boxShadow: '0 0 0 2px #e2e8f0',
              }} />
            </Box>
            <Chip label={dateLabel} size="small" sx={{ fontSize: '0.75rem', bgcolor: 'grey.100' }} />
          </Box>

          {/* Events for this date */}
          {dateEvents.map((event, idx) => {
            const config = TYPE_CONFIG[event.type] || TYPE_CONFIG.expense;
            return (
              <Box key={event.id} sx={{
                display: 'flex', alignItems: 'flex-start', gap: 2, mb: 1.5,
                position: 'relative', zIndex: 1,
              }}>
                {/* Icon dot */}
                <Box sx={{
                  width: 40, minWidth: 40, display: 'flex', justifyContent: 'center',
                }}>
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '50%',
                    bgcolor: config.bgColor, color: config.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: '2px solid white',
                    boxShadow: `0 0 0 2px ${config.bgColor}`,
                  }}>
                    {config.icon}
                  </Box>
                </Box>

                {/* Event card */}
                <Box sx={{
                  flex: 1, p: 1.5, borderRadius: 2,
                  bgcolor: 'background.paper',
                  border: '1px solid',
                  borderColor: 'grey.100',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  transition: 'box-shadow 0.2s',
                  '&:hover': { boxShadow: '0 4px 12px rgba(0,0,0,0.1)' },
                }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                      <Typography variant="body2" fontWeight={600} color="text.primary">
                        {event.title}
                      </Typography>
                      {event.subtitle && (
                        <Typography variant="caption" color="text.secondary">
                          {event.subtitle}
                        </Typography>
                      )}
                    </Box>
                    {event.amount != null && (
                      <Typography
                        variant="body2"
                        fontWeight={700}
                        sx={{ color: config.color, ml: 2, whiteSpace: 'nowrap' }}
                      >
                        {['income', 'repayment'].includes(event.type) ? '+' : '−'}
                        ₹{event.amount.toLocaleString('en-IN')}
                      </Typography>
                    )}
                  </Box>
                  {event.note && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                      {event.note}
                    </Typography>
                  )}
                  {event.tags && event.tags.length > 0 && (
                    <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                      {event.tags.map(tag => (
                        <Chip key={tag} label={tag} size="small" variant="outlined"
                          sx={{ height: 18, fontSize: '0.65rem' }} />
                      ))}
                    </Box>
                  )}
                </Box>
              </Box>
            );
          })}
        </Box>
      ))}
    </Box>
  );
}
