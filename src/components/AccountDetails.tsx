'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  Box,
  Typography,
  Tabs,
  Tab,
  IconButton,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from '@mui/material';
import { Close, AccountBalance } from '@mui/icons-material';
import { Account, Transaction, Schedule, Goal } from '@/lib/types';
import { useQuery } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import { useAuthContext } from './AuthProvider';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`account-tabpanel-${index}`}
      aria-labelledby={`account-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ py: 3 }}>{children}</Box>}
    </div>
  );
}

interface AccountDetailsProps {
  account: Account | null;
  onClose: () => void;
}

async function fetchAccountTransactions(accountId: string, token: string) {
  const response = await fetch(`/api/transactions?accountId=${accountId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch transactions');
  return response.json();
}

async function fetchAccountSchedules(accountId: string, token: string) {
  const response = await fetch(`/api/schedules?accountId=${accountId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch schedules');
  return response.json();
}

export function AccountDetails({ account, onClose }: AccountDetailsProps) {
  const [tabValue, setTabValue] = useState(0);
  const { user } = useAuthContext();
  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', account?.id],
    queryFn: async () => {
      const token = await getIdToken(user);
      if (!token || !account) return [];
      return fetchAccountTransactions(account.id, token);
    },
    enabled: !!account,
  });

  const { data: schedules = [] } = useQuery({
    queryKey: ['schedules', account?.id],
    queryFn: async () => {
      const token = await getIdToken(user);
      if (!token || !account) return [];
      return fetchAccountSchedules(account.id, token);
    },
    enabled: !!account,
  });

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  if (!account) return null;

  return (
    <Dialog 
      open={!!account} 
      onClose={onClose}
      maxWidth="md"
      fullWidth
    >
      <DialogTitle>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AccountBalance 
              sx={{ 
                color: account.type === 'income' 
                  ? 'success.main' 
                  : account.type === 'expense'
                  ? 'error.main'
                  : 'primary.main'
              }} 
            />
            <Typography variant="h6">{account.name}</Typography>
          </Box>
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        </Box>
      </DialogTitle>

      <DialogContent>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Transactions" />
            <Tab label="Schedules" />
            <Tab label="Linked Goals" />
          </Tabs>
        </Box>

        <TabPanel value={tabValue} index={0}>
          <Box>
            <Typography variant="overline" color="text.secondary">
              Account Details
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box>
                <Typography variant="body2" color="text.secondary">Type</Typography>
                <Chip 
                  label={account.type}
                  size="small"
                  color={
                    account.type === 'income' 
                      ? 'success' 
                      : account.type === 'expense'
                      ? 'error'
                      : 'primary'
                  }
                  sx={{ mt: 0.5, textTransform: 'capitalize' }}
                />
              </Box>
              
              {account.subtype && (
                <Box>
                  <Typography variant="body2" color="text.secondary">Subtype</Typography>
                  <Chip 
                    label={account.subtype}
                    size="small"
                    variant="outlined"
                    sx={{ mt: 0.5, textTransform: 'capitalize' }}
                  />
                </Box>
              )}

              {account.institution && (
                <Box>
                  <Typography variant="body2" color="text.secondary">Institution</Typography>
                  <Typography variant="body1">{account.institution}</Typography>
                </Box>
              )}

              <Box>
                <Typography variant="body2" color="text.secondary">Currency</Typography>
                <Typography variant="body1">{account.currency}</Typography>
              </Box>

              <Box>
                <Typography variant="body2" color="text.secondary">Current Balance</Typography>
                <Typography 
                  variant="h4"
                  sx={{ 
                    color: account.type === 'income' 
                      ? 'success.main' 
                      : account.type === 'expense'
                      ? 'error.main'
                      : 'primary.main',
                    fontWeight: 'bold'
                  }}
                >
                  ₹{account.currentBalance?.toLocaleString() || '0'}
                </Typography>
              </Box>
            </Box>
          </Box>
        </TabPanel>

        <TabPanel value={tabValue} index={1}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Date</TableCell>
                  <TableCell>Description</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Balance</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {transactions.map((transaction: Transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>
                      {new Date(transaction.date).toLocaleDateString()}
                    </TableCell>
                    <TableCell>{transaction.note}</TableCell>
                    <TableCell>₹{transaction.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Chip 
                        label={transaction.type}
                        size="small"
                        color={
                          transaction.type === 'income' 
                            ? 'success' 
                            : transaction.type === 'expense'
                            ? 'error'
                            : 'primary'
                        }
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                    <TableCell>-</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={2}>
          <TableContainer component={Paper} variant="outlined">
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Amount</TableCell>
                  <TableCell>Frequency</TableCell>
                  <TableCell>Next Run</TableCell>
                  <TableCell>Status</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {schedules.map((schedule: Schedule) => (
                  <TableRow key={schedule.id}>
                    <TableCell>{schedule.name}</TableCell>
                    <TableCell>₹{schedule.template.amount.toLocaleString()}</TableCell>
                    <TableCell>{schedule.rrule}</TableCell>
                    <TableCell>
                      {new Date(schedule.nextRunAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={schedule.status}
                        size="small"
                        color={schedule.status === 'active' ? 'success' : 'default'}
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </TabPanel>

        <TabPanel value={tabValue} index={3}>
          {false ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* TODO: Implement linked goals view */}
            </Box>
          ) : (
            <Typography color="text.secondary">No goals linked to this account</Typography>
          )}
        </TabPanel>
      </DialogContent>
    </Dialog>
  );
}
