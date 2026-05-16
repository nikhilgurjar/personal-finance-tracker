'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { TimelineView, TimelineEventData } from '@/components/TimelineView';
import { useQuery } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box, Container, Typography, Grid, Card, CardContent, Chip,
  Alert, Skeleton, FormControl, InputLabel, Select, MenuItem, TextField,
  InputAdornment,
} from '@mui/material';
import { History, Search } from '@mui/icons-material';
import { useRouter } from 'next/navigation';

async function apiFetch(path: string, user: any) {
  const token = await getIdToken(user);
  return fetch(path, { headers: { Authorization: `Bearer ${token}` } });
}

const ENTITY_LABELS: Record<string, string> = {
  transaction: 'Transaction',
  account: 'Account',
  goal: 'Goal',
  schedule: 'Schedule',
  loan: 'Loan',
  savings_instrument: 'Savings Instrument',
  category: 'Category',
};

function auditToTimeline(log: any): TimelineEventData {
  const typeMap: Record<string, TimelineEventData['type']> = {
    transaction: 'expense',
    loan: 'loan',
    savings_instrument: 'instrument',
    account: 'savings',
    goal: 'savings',
  };

  return {
    id: log.id,
    date: log.at || log.timestamp,
    title: `${log.action?.charAt(0).toUpperCase() + log.action?.slice(1)} ${ENTITY_LABELS[log.entity] || log.entity}`,
    subtitle: log.after?.note || log.after?.name || log.entityId,
    amount: log.after?.amount || log.before?.amount,
    type: typeMap[log.entity] || 'expense',
    action: log.action,
    note: log.reason === 'manual' ? undefined : `via ${log.reason}`,
  };
}

export default function HistoryPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: auditLogs = [], isLoading, error } = useQuery({
    queryKey: ['auditLogs', user?.uid],
    queryFn: async () => {
      const token = await getIdToken(user);
      const res = await fetch('/api/audit-logs', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!user,
  });

  if (!user) return null;

  const filtered = auditLogs.filter((log: any) => {
    const matchEntity = !entityFilter || log.entity === entityFilter;
    const matchAction = !actionFilter || log.action === actionFilter;
    const matchSearch = !search || JSON.stringify(log).toLowerCase().includes(search.toLowerCase());
    return matchEntity && matchAction && matchSearch;
  });

  const events: TimelineEventData[] = filtered.map(auditToTimeline);

  const counts = {
    total: auditLogs.length,
    creates: auditLogs.filter((l: any) => l.action === 'create').length,
    updates: auditLogs.filter((l: any) => l.action === 'update').length,
    deletes: auditLogs.filter((l: any) => l.action === 'delete').length,
  };

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={800}>History & Audit Log</Typography>
            <Typography variant="body2" color="text.secondary">Full timeline of all financial events</Typography>
          </Box>

          {/* Stats */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              { label: 'Total Events', value: counts.total, color: '#3b82f6' },
              { label: 'Created', value: counts.creates, color: '#10b981' },
              { label: 'Updated', value: counts.updates, color: '#f59e0b' },
              { label: 'Deleted', value: counts.deletes, color: '#ef4444' },
            ].map(c => (
              <Grid item xs={6} sm={3} key={c.label}>
                <Card elevation={0} sx={{ border: 1, borderColor: 'divider', borderTop: 4, borderTopColor: c.color }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ color: c.color }}>{c.value}</Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filters */}
          <Card elevation={0} sx={{ mb: 4, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={4}>
                  <TextField
                    size="small" fullWidth label="Search"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" /> }}
                  />
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Entity Type</InputLabel>
                    <Select value={entityFilter} onChange={e => setEntityFilter(e.target.value)} label="Entity Type">
                      <MenuItem value="">All</MenuItem>
                      {Object.entries(ENTITY_LABELS).map(([v, l]) => <MenuItem key={v} value={v}>{l}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={6} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Action</InputLabel>
                    <Select value={actionFilter} onChange={e => setActionFilter(e.target.value)} label="Action">
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="create">Create</MenuItem>
                      <MenuItem value="update">Update</MenuItem>
                      <MenuItem value="delete">Delete</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {error && <Alert severity="warning" sx={{ mb: 3 }}>Could not load audit logs. The audit logs API may need to be set up.</Alert>}

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} variant="rounded" height={70} />)}
            </Box>
          ) : (
            <TimelineView
              events={events}
              emptyMessage="No audit history yet. Start adding transactions to see them here."
            />
          )}
        </Container>
      </Box>
    </ResponsiveLayout>
  );
}
