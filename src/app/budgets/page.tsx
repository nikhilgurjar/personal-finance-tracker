'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Grid,
  LinearProgress,
  MenuItem,
  Skeleton,
  TextField,
  Typography,
} from '@mui/material';
import { AccountBalanceWallet, Delete, WarningAmber } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { authedFetch, authedJson } from '@/lib/apiClient';

function formatCurrency(value = 0) {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

export default function BudgetsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({ category: '', monthlyAmount: '', expenseNature: 'dynamic' });

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const { data: budgetData, isLoading } = useAuthedQuery<any>(user, ['budgets', user?.uid, month], `/api/budgets?month=${month}`);
  const { data: categories = [] } = useAuthedQuery<any[]>(user, ['categories', user?.uid], '/api/categories');

  const createMutation = useMutation({
    mutationFn: async () => authedJson(user, '/api/budgets', {
      method: 'POST',
      body: JSON.stringify({
        category: form.category,
        month,
        monthlyAmount: Number(form.monthlyAmount),
        expenseNature: form.expenseNature,
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      setForm({ category: '', monthlyAmount: '', expenseNature: 'dynamic' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => authedFetch(user, `/api/budgets/${id}`, { method: 'DELETE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['budgets'] }),
  });

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={800}>Budgets</Typography>
            <Typography variant="body2" color="text.secondary">
              Set monthly category rules and catch dynamic spending before it runs hot.
            </Typography>
          </Box>

          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={3}>
                  <TextField fullWidth size="small" type="month" label="Month" value={month} onChange={(e) => setMonth(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12} sm={3}>
                  <TextField select fullWidth size="small" label="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                    {categories.map((category: any) => <MenuItem key={category.id} value={category.name}>{category.icon} {category.name}</MenuItem>)}
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField select fullWidth size="small" label="Nature" value={form.expenseNature} onChange={(e) => setForm({ ...form, expenseNature: e.target.value })}>
                    <MenuItem value="dynamic">Dynamic</MenuItem>
                    <MenuItem value="fixed">Fixed</MenuItem>
                  </TextField>
                </Grid>
                <Grid item xs={12} sm={2}>
                  <TextField fullWidth size="small" type="number" label="Monthly Limit" value={form.monthlyAmount} onChange={(e) => setForm({ ...form, monthlyAmount: e.target.value })} />
                </Grid>
                <Grid item xs={12} sm={2}>
                  <Button fullWidth variant="contained" disabled={!form.category || !form.monthlyAmount || createMutation.isPending} onClick={() => createMutation.mutate()}>
                    Add
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {isLoading || !budgetData ? (
            <Skeleton variant="rounded" height={320} />
          ) : budgetData.budgets.length === 0 ? (
            <Alert severity="info">No budgets for this month yet.</Alert>
          ) : (
            <Grid container spacing={2}>
              {budgetData.budgets.map((budget: any) => {
                const color = budget.alertLevel === 'critical' ? 'error' : budget.alertLevel === 'warning' ? 'warning' : budget.alertLevel === 'info' ? 'info' : 'success';
                return (
                  <Grid item xs={12} md={6} key={budget.id}>
                    <Card>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                          <Box>
                            <Typography variant="h6" fontWeight={800}>{budget.category}</Typography>
                            <Chip size="small" label={budget.expenseNature} color={budget.expenseNature === 'dynamic' ? 'warning' : 'secondary'} />
                          </Box>
                          <Button color="error" size="small" startIcon={<Delete />} onClick={() => deleteMutation.mutate(budget.id)}>
                            Delete
                          </Button>
                        </Box>
                        <LinearProgress variant="determinate" value={Math.min(budget.usedPct, 100)} color={color as any} sx={{ height: 8, borderRadius: 1, mb: 1 }} />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">{formatCurrency(budget.spent)} spent</Typography>
                          <Typography variant="body2" fontWeight={800}>{budget.usedPct}% of {formatCurrency(budget.monthlyAmount)}</Typography>
                        </Box>
                        {budget.alertLevel !== 'ok' && (
                          <Alert severity={budget.alertLevel === 'critical' ? 'error' : budget.alertLevel} icon={<WarningAmber />} sx={{ mt: 2 }}>
                            {budget.category} is at {budget.usedPct}% of its monthly budget.
                          </Alert>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </Box>
    </ResponsiveLayout>
  );
}
