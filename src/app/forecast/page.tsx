'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
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
  Slider,
  TextField,
  Typography,
} from '@mui/material';
import {
  AccountBalanceWallet,
  AutoGraph,
  CalendarMonth,
  Flag,
  Savings,
  WarningAmber,
} from '@mui/icons-material';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';

function formatCurrency(value = 0) {
  return `INR ${Math.round(value).toLocaleString('en-IN')}`;
}

function formatDate(value: number | string) {
  return new Date(value).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <Card sx={{ height: '100%', borderTop: 4, borderTopColor: color }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
          <Typography variant="body2" color="text.secondary" fontWeight={700}>
            {title}
          </Typography>
          <Box sx={{ color }}>{icon}</Box>
        </Box>
        <Typography variant="h5" fontWeight={800}>
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

export default function ForecastPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const [days, setDays] = useState(90);
  const [extraSavings, setExtraSavings] = useState(0);
  const [earlyRepayment, setEarlyRepayment] = useState(0);
  const [whatIfAccountId, setWhatIfAccountId] = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/');
  }, [loading, user, router]);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ days: String(days) });
    if (extraSavings > 0) params.set('extraSavings', String(extraSavings));
    if (earlyRepayment > 0) params.set('earlyRepayment', String(earlyRepayment));
    if (whatIfAccountId) params.set('whatIfAccountId', whatIfAccountId);
    return params.toString();
  }, [days, extraSavings, earlyRepayment, whatIfAccountId]);

  const { data, isLoading, error } = useAuthedQuery<any>(
    user,
    ['forecast', user?.uid, queryString],
    `/api/forecast?${queryString}`
  );

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="xl">
          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, flexWrap: 'wrap', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color="text.primary">
                Forecast
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Project balances, upcoming obligations, goal timing, and what-if decisions.
              </Typography>
            </Box>
            <Box sx={{ minWidth: 220 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                Horizon: {days} days
              </Typography>
              <Slider
                value={days}
                min={30}
                max={180}
                step={30}
                marks
                onChange={(_, value) => setDays(value as number)}
              />
            </Box>
          </Box>

          {error && <Alert severity="error" sx={{ mb: 3 }}>Failed to load forecast.</Alert>}

          {isLoading || !data ? (
            <Skeleton variant="rounded" height={520} />
          ) : (
            <>
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard title="Starting Balance" value={formatCurrency(data.startingBalance)} icon={<AccountBalanceWallet />} color="#2563eb" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard title="Projected Ending" value={formatCurrency(data.endingBalance)} icon={<AutoGraph />} color="#059669" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard title="Forecast Outflow" value={formatCurrency(data.outflowTotal)} icon={<Savings />} color="#dc2626" />
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <StatCard title="Net Worth Snapshot" value={formatCurrency(data.netWorth)} icon={<Flag />} color="#7c3aed" />
                </Grid>
              </Grid>

              <Grid container spacing={3}>
                <Grid item xs={12} lg={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                        Balance Projection
                      </Typography>
                      <Box sx={{ height: 360 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={data.daily}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tickFormatter={formatDate} minTickGap={28} />
                            <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} />
                            <Tooltip
                              labelFormatter={(label) => formatDate(label)}
                              formatter={(value) => [formatCurrency(Number(value)), 'Balance']}
                            />
                            <Line type="monotone" dataKey="totalBalance" stroke="#2563eb" strokeWidth={3} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} lg={4}>
                  <Card sx={{ mb: 3 }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                        What-If Controls
                      </Typography>
                      <TextField
                        select
                        fullWidth
                        size="small"
                        label="Source Account"
                        value={whatIfAccountId}
                        onChange={(event) => setWhatIfAccountId(event.target.value)}
                        sx={{ mb: 2 }}
                      >
                        <MenuItem value="">No account selected</MenuItem>
                        {data.accounts.map((account: any) => (
                          <MenuItem key={account.id} value={account.id}>
                            {account.name} ({formatCurrency(account.balance)})
                          </MenuItem>
                        ))}
                      </TextField>
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Extra savings contribution"
                        value={extraSavings}
                        onChange={(event) => setExtraSavings(Number(event.target.value || 0))}
                        sx={{ mb: 2 }}
                      />
                      <TextField
                        fullWidth
                        size="small"
                        type="number"
                        label="Early loan repayment"
                        value={earlyRepayment}
                        onChange={(event) => setEarlyRepayment(Number(event.target.value || 0))}
                        sx={{ mb: 2 }}
                      />
                      <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => {
                          setExtraSavings(0);
                          setEarlyRepayment(0);
                          setWhatIfAccountId('');
                        }}
                      >
                        Reset Scenario
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                        Risk Alerts
                      </Typography>
                      {data.alerts.length === 0 ? (
                        <Alert severity="success">No major forecast risks in this horizon.</Alert>
                      ) : (
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                          {data.alerts.map((alert: any, index: number) => (
                            <Alert
                              key={`${alert.title}-${index}`}
                              severity={alert.severity === 'critical' ? 'error' : alert.severity}
                              icon={<WarningAmber />}
                            >
                              <Typography variant="body2" fontWeight={800}>{alert.title}</Typography>
                              <Typography variant="caption">{alert.message}</Typography>
                            </Alert>
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                        Upcoming Forecast Events
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        {data.upcoming.slice(0, 10).map((event: any) => (
                          <Box key={event.id} sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, p: 1.5, border: 1, borderColor: 'divider', borderRadius: 2 }}>
                            <Box>
                              <Typography variant="body2" fontWeight={800}>{event.title}</Typography>
                              <Typography variant="caption" color="text.secondary">{formatDate(event.date)}</Typography>
                            </Box>
                            <Chip size="small" label={formatCurrency(event.amount)} color={event.type === 'income' ? 'success' : 'default'} />
                          </Box>
                        ))}
                        {data.upcoming.length === 0 && <Typography color="text.secondary">No upcoming scheduled events.</Typography>}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Typography variant="h6" fontWeight={800} sx={{ mb: 2 }}>
                        Goal Impact
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {data.goalImpact.map((goal: any) => (
                          <Box key={goal.id}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 0.75 }}>
                              <Typography variant="body2" fontWeight={800}>{goal.name}</Typography>
                              <Typography variant="body2" color="primary.main" fontWeight={800}>{goal.progress}%</Typography>
                            </Box>
                            <LinearProgress variant="determinate" value={goal.progress} sx={{ height: 8, borderRadius: 1, mb: 0.75 }} />
                            <Typography variant="caption" color="text.secondary">
                              Remaining {formatCurrency(goal.remaining)}
                              {goal.projectedDate ? `, projected around ${formatDate(goal.projectedDate)}` : ', needs more surplus to project a date'}
                            </Typography>
                          </Box>
                        ))}
                        {data.goalImpact.length === 0 && (
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CalendarMonth color="disabled" />
                            <Typography color="text.secondary">No goals available for impact projection.</Typography>
                          </Box>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          )}
        </Container>
      </Box>
    </ResponsiveLayout>
  );
}
