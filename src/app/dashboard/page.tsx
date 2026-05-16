import Link from 'next/link';
import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import {
  Avatar,
  Box,
  Button,
  Container,
  Grid,
  LinearProgress,
  Typography,
} from '@mui/material';
import {
  AccountBalance,
  Add,
  Flag,
  PieChart,
  TrendingDown,
  TrendingUp,
  Wallet,
} from '@mui/icons-material';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { MonthPicker } from '@/components/dashboard/MonthPicker';
import { getCurrentUser } from '@/lib/serverAuth';
import { getDashboardData } from '@/lib/dashboardData';

export const dynamic = 'force-dynamic';

function formatCurrency(amount = 0) {
  return `₹${amount.toLocaleString('en-IN')}`;
}

function StatCard({
  title,
  value,
  icon,
  gradient,
}: {
  title: string;
  value: string;
  icon: ReactNode;
  gradient: string;
}) {
  return (
    <Box
      sx={{
        background: gradient,
        borderRadius: 3,
        p: 3,
        color: 'white',
        minHeight: 138,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Typography variant="body2" sx={{ opacity: 0.9, fontWeight: 500 }}>
          {title}
        </Typography>
        <Box sx={{ opacity: 0.85 }}>{icon}</Box>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1.2 }}>
        {value}
      </Typography>
    </Box>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <Box
      sx={{
        background: 'white',
        border: '1px solid',
        borderColor: 'grey.200',
        borderRadius: 3,
        boxShadow: '0 1px 3px rgba(15, 23, 42, 0.08)',
        p: 3,
      }}
    >
      {children}
    </Box>
  );
}

function QuickAction({
  title,
  href,
  icon,
  color,
}: {
  title: string;
  href: string;
  icon: ReactNode;
  color: string;
}) {
  return (
    <Box
      component={Link}
      href={href}
      sx={{
        background: `${color}14`,
        borderRadius: 2,
        p: 3,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        color,
        textDecoration: 'none',
        transition: 'background 0.2s ease, transform 0.2s ease',
        '&:hover': {
          background: `${color}24`,
          transform: 'translateY(-2px)',
        },
      }}
    >
      <Box sx={{ mb: 1, '& svg': { width: 24, height: 24 } }}>{icon}</Box>
      <Typography variant="body2" sx={{ fontWeight: 700, textAlign: 'center' }}>
        {title}
      </Typography>
    </Box>
  );
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/');
  }

  const selectedMonth = searchParams.month || new Date().toISOString().slice(0, 7);
  const { totals, recentTransactions, goals } = await getDashboardData(user.uid, selectedMonth);
  const userInitial = user.name?.charAt(0) || user.email?.charAt(0) || 'U';

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, background: 'background.default', minHeight: '100vh' }}>
        <Container maxWidth="xl">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: { xs: 'flex-start', sm: 'center' },
              flexDirection: { xs: 'column', sm: 'row' },
              gap: 2,
              mb: 4,
            }}
          >
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'text.primary', mb: 1 }}>
                Welcome back!
              </Typography>
              <Typography variant="body1" sx={{ color: 'text.secondary' }}>
                Here's your financial overview
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <MonthPicker month={selectedMonth} />
              <Avatar
                sx={{
                  width: 48,
                  height: 48,
                  background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                }}
              >
                {userInitial}
              </Avatar>
            </Box>
          </Box>

          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Income"
                value={formatCurrency(totals.totalIncome)}
                icon={<TrendingUp sx={{ width: 32, height: 32 }} />}
                gradient="linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Salary Income"
                value={formatCurrency(totals.salaryIncome)}
                icon={<Wallet sx={{ width: 32, height: 32 }} />}
                gradient="linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={4}>
              <StatCard
                title="Total Expenses"
                value={formatCurrency(totals.totalExpenses)}
                icon={<TrendingDown sx={{ width: 32, height: 32 }} />}
                gradient="linear-gradient(135deg, #EF4444 0%, #DC2626 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <StatCard
                title="Savings Portfolio"
                value={formatCurrency(totals.savingsPortfolio)}
                icon={<AccountBalance sx={{ width: 32, height: 32 }} />}
                gradient="linear-gradient(135deg, #10B981 0%, #059669 100%)"
              />
            </Grid>
            <Grid item xs={12} sm={6} md={6}>
              <StatCard
                title="Outstanding Loans"
                value={formatCurrency(totals.outstandingLoans)}
                icon={<Wallet sx={{ width: 32, height: 32 }} />}
                gradient="linear-gradient(135deg, #F59E0B 0%, #D97706 100%)"
              />
            </Grid>
          </Grid>

          <Panel>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 3, color: 'text.primary' }}>
              Quick Actions
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={6} sm={3}>
                <QuickAction title="Add Income" href="/incomes" icon={<Add />} color="#2563eb" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <QuickAction title="Add Expense" href="/expenses" icon={<Add />} color="#dc2626" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <QuickAction title="New Goal" href="/goals" icon={<Flag />} color="#059669" />
              </Grid>
              <Grid item xs={6} sm={3}>
                <QuickAction title="Analytics" href="/dashboard" icon={<PieChart />} color="#7c3aed" />
              </Grid>
            </Grid>
          </Panel>

          <Grid container spacing={4} sx={{ mt: 0 }}>
            <Grid item xs={12} lg={8}>
              <Panel>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Recent Transactions
                  </Typography>
                  <Button component={Link} href="/transactions" variant="text">
                    View All
                  </Button>
                </Box>

                {recentTransactions.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                      No transactions yet
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                      <Button component={Link} href="/incomes" variant="contained">
                        Add Income
                      </Button>
                      <Button component={Link} href="/expenses" variant="contained">
                        Add Expense
                      </Button>
                    </Box>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {recentTransactions.map((tx: any) => {
                      const isIncome = tx.txType === 'income';
                      return (
                        <Box
                          key={`${tx.txType}-${tx.id}`}
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 2,
                            border: '1px solid',
                            borderColor: 'grey.200',
                            borderRadius: 2,
                            background: 'white',
                            gap: 2,
                          }}
                        >
                          <Box>
                            <Typography variant="body1" sx={{ fontWeight: 700 }}>
                              {tx.note || tx.sourceName || tx.category || 'No description'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {isIncome ? 'Income' : 'Expense'} • {new Date(tx.date).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Typography
                            variant="h6"
                            sx={{ fontWeight: 800, color: isIncome ? 'success.main' : 'error.main' }}
                          >
                            {isIncome ? '+' : '-'}{formatCurrency(tx.amount)}
                          </Typography>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Panel>
            </Grid>

            <Grid item xs={12} lg={4}>
              <Panel>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: 'text.primary' }}>
                    Goals Progress
                  </Typography>
                  <Button component={Link} href="/goals" variant="text">
                    View All
                  </Button>
                </Box>

                {goals.length === 0 ? (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="body1" sx={{ color: 'text.secondary', mb: 2 }}>
                      No goals set yet
                    </Typography>
                    <Button component={Link} href="/goals" variant="contained">
                      Set Goal
                    </Button>
                  </Box>
                ) : (
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                    {goals.map((goal: any) => {
                      const progress = goal.targetAmount
                        ? Math.min(((goal.currentAmount || 0) / goal.targetAmount) * 100, 100)
                        : 0;

                      return (
                        <Box key={goal.id}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 700 }}>
                              {goal.name}
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                              {Math.round(progress)}%
                            </Typography>
                          </Box>
                          <LinearProgress variant="determinate" value={progress} sx={{ height: 8, borderRadius: 1 }} />
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(goal.currentAmount || 0)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatCurrency(goal.targetAmount || 0)}
                            </Typography>
                          </Box>
                        </Box>
                      );
                    })}
                  </Box>
                )}
              </Panel>
            </Grid>
          </Grid>
        </Container>
      </Box>
    </ResponsiveLayout>
  );
}
