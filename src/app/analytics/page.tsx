'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import {
  Box, Container, Typography, Card, CardContent, Grid,
  Skeleton, Tabs, Tab, TableContainer, Table, TableHead, TableRow, TableCell, TableBody, Paper, Chip
} from '@mui/material';
import { Analytics as AnalyticsIcon, Category, CalendarMonth } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AnalyticsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [tab, setTab] = useState<'monthly' | 'category'>('monthly');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data, isLoading } = useAuthedQuery(user, ['analytics', user?.uid], '/api/analytics');

  if (!user) return null;

  const formatCurrency = (val: number) => `₹${val.toLocaleString('en-IN')}`;

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4, display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ p: 1.5, bgcolor: 'primary.main', borderRadius: 2, color: 'white', display: 'flex' }}>
              <AnalyticsIcon fontSize="large" />
            </Box>
            <Box>
              <Typography variant="h4" fontWeight={800} color="text.primary">Analytics</Typography>
              <Typography variant="body2" color="text.secondary">Deep dive into your financial trends</Typography>
            </Box>
          </Box>

          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab icon={<CalendarMonth sx={{ mr: 1, mb: 0 }} />} iconPosition="start" label="Monthly View" value="monthly" />
            <Tab icon={<Category sx={{ mr: 1, mb: 0 }} />} iconPosition="start" label="Category Trends" value="category" />
          </Tabs>

          {isLoading ? (
            <Skeleton variant="rounded" height={400} />
          ) : !data ? (
            <Typography>Failed to load analytics</Typography>
          ) : tab === 'monthly' ? (
            <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><Typography variant="subtitle2" fontWeight={700}>Month</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2" color="success.main" fontWeight={700}>Income</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2" color="error.main" fontWeight={700}>Expenses</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2" color="primary.main" fontWeight={700}>Net Saved</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2" color="text.secondary" fontWeight={700}>Invested</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2" color="warning.main" fontWeight={700}>Lent</Typography></TableCell>
                    <TableCell align="right"><Typography variant="subtitle2" color="error.main" fontWeight={700}>Borrowed</Typography></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {data.monthly.map((row: any) => {
                    const monthLabel = new Date(row.month + '-01').toLocaleDateString('en-IN', { year: 'numeric', month: 'long' });
                    const netSaved = row.income - row.expenses;
                    return (
                      <TableRow key={row.month} hover>
                        <TableCell><Typography fontWeight={600}>{monthLabel}</Typography></TableCell>
                        <TableCell align="right">{formatCurrency(row.income)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.expenses)}</TableCell>
                        <TableCell align="right">
                          <Chip size="small" label={formatCurrency(netSaved)} color={netSaved >= 0 ? 'success' : 'error'} variant={netSaved >= 0 ? 'filled' : 'outlined'} />
                        </TableCell>
                        <TableCell align="right">{formatCurrency(row.invested)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.lent)}</TableCell>
                        <TableCell align="right">{formatCurrency(row.borrowed)}</TableCell>
                      </TableRow>
                    );
                  })}
                  {data.monthly.length === 0 && (
                    <TableRow><TableCell colSpan={7} align="center" sx={{ py: 4 }}>No monthly data available</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          ) : (
            <Grid container spacing={3}>
              {data.categories.map((cat: any) => {
                const fixedPct = cat.total > 0 ? (cat.fixed / cat.total) * 100 : 0;
                const dynPct = cat.total > 0 ? (cat.dynamic / cat.total) * 100 : 0;

                return (
                  <Grid item xs={12} sm={6} md={4} key={cat.category}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                          <Typography variant="h6" fontWeight={700}>{cat.category}</Typography>
                          <Typography variant="h6" fontWeight={800} color="error.main">
                            {formatCurrency(cat.total)}
                          </Typography>
                        </Box>

                        {cat.total > 0 && (
                          <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', mb: 2 }}>
                            <Box sx={{ width: `${fixedPct}%`, bgcolor: '#8b5cf6' }} />
                            <Box sx={{ width: `${dynPct}%`, bgcolor: '#f59e0b' }} />
                          </Box>
                        )}

                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Box>
                            <Typography variant="caption" color="text.secondary" display="block">Fixed (📌)</Typography>
                            <Typography variant="body2" fontWeight={600} color="#8b5cf6">{formatCurrency(cat.fixed)}</Typography>
                          </Box>
                          <Box sx={{ textAlign: 'right' }}>
                            <Typography variant="caption" color="text.secondary" display="block">Dynamic (🔄)</Typography>
                            <Typography variant="body2" fontWeight={600} color="#f59e0b">{formatCurrency(cat.dynamic)}</Typography>
                          </Box>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
              {data.categories.length === 0 && (
                <Grid item xs={12}><Typography align="center" sx={{ py: 4 }}>No category data available</Typography></Grid>
              )}
            </Grid>
          )}
        </Container>
      </Box>
    </ResponsiveLayout>
  );
}
