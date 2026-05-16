'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import dayjs from 'dayjs';
import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { TransferForm } from '@/components/forms/TransferForm';
import { SavingsForm } from '@/components/forms/SavingsForm';
import { SalaryForm } from '@/components/forms/SalaryForm';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
} from '@mui/material';
import { MoreVert, Add, Edit, Delete, AccountBalance } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Transaction, Account, TransactionType, AccountType } from '@/lib/types';

async function fetchTransactions(user: any) {
  try {
    const token = await getIdToken(user);
    if (!token) throw new Error('No authentication token available');
    
    const response = await fetch('/api/transactions?limit=100', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store', // Disable caching to always get fresh data
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch transactions: ${error}`);
    }
    
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error('Error fetching transactions:', error);
    throw error;
  }
}

async function fetchAccounts(user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/accounts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

interface CreateTransactionData {
  amount: string | number;
  date: Date;
  fromAccountId?: string;
  toAccountId: string;
  note?: string;
  tags?: string[];
  type: TransactionType;
  currency: string;
  toAccountType: AccountType;
  fromAccountType?: AccountType;
}

async function createTransaction(data: CreateTransactionData, user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  // Convert amount to number if it's a string
  const processedData = {
    ...data,
    amount: typeof data.amount === 'string' ? parseFloat(data.amount) : data.amount
  };
  
  const response = await fetch('/api/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(processedData),
  });
  if (!response.ok) throw new Error('Failed to create transaction');
  return response.json();
}

const transactionForms = {
  expense: ExpenseForm,
  income: IncomeForm,
  transfer: TransferForm,
  savings: SavingsForm,
  salary: SalaryForm,
};

export default function TransactionsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    account: '',
    type: '',
  });
  const [transactionType, setTransactionType] = useState<keyof typeof transactionForms>('expense');
  const [showForm, setShowForm] = useState(false);

  const { data: transactions = [], isLoading: transactionsLoading, error: transactionsError, refetch: refetchTransactions } = useQuery({
    queryKey: ['transactions', user?.uid],
    queryFn: () => fetchTransactions(user),
    enabled: !!user,
    staleTime: 0, // Always consider data stale
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 2, // Retry failed requests twice
  });

  const { data: accounts = [], isLoading: accountsLoading, refetch: refetchAccounts } = useQuery({
    queryKey: ['accounts', user?.uid],
    queryFn: () => fetchAccounts(user),
    enabled: !!user,
    staleTime: 0,
    refetchOnWindowFocus: true,
    retry: 2,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createTransaction(data, user),
    onSuccess: async () => {
      // Invalidate and refetch both queries
      await Promise.all([
        refetchTransactions(),
        refetchAccounts()
      ]);
      setFormOpen(false);
      setShowForm(false);
    },
    onError: (error) => {
      console.error('Transaction creation failed:', error);
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  const handleCreateTransaction = async (data: any) => {
    try {
      const transactionData = {
        ...data,
        type: transactionType,
        currency: 'INR',
        date: data.date instanceof Date ? data.date.getTime() : new Date(data.date).getTime(),
        toAccountType: getAccountType(data.toAccountId),
        fromAccountType: data.fromAccountId ? getAccountType(data.fromAccountId) : undefined,
        userId: user.uid, // Add user ID to transaction data
      };
      
      await createMutation.mutateAsync(transactionData);
      // Form closing is handled in mutation's onSuccess
    } catch (error) {
      console.error('Failed to create transaction:', error);
      // Keep form open if there's an error
      throw error; // Propagate error to show in form
    }
  };

  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteTransaction = (transaction: Transaction) => {
    // Implement delete functionality
    console.log('Delete transaction:', transaction.id);
    setMenuAnchor(null);
  };

  const filteredTransactions = transactions.filter((tx: Transaction) => {
    const matchesSearch = !filters.search || 
      tx.note?.toLowerCase().includes(filters.search.toLowerCase()) ||
      tx.tags?.some(tag => tag.toLowerCase().includes(filters.search.toLowerCase()));
    
    const matchesAccount = !filters.account || 
      (tx.fromAccountId && tx.fromAccountId === filters.account) || 
      tx.toAccountId === filters.account;
    
    return matchesSearch && matchesAccount;
  });

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const getAccountType = (accountId: string) => {
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account?.type || 'unknown';
  };

  if (transactionsLoading || accountsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  const TransactionForm = transactionForms[transactionType];



  return (
    <ResponsiveLayout>
      <Container maxWidth="lg" sx={{ mt: 4, p: 3 }}>
        <Box
          sx={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            mb: 4,
            pb: 3,
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography 
              variant="h4" 
              component="h1"
              sx={{ 
                fontWeight: 600,
                color: 'primary.main',
                mb: 1,
              }}
            >
              Transactions
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Track your income, expenses, and transfers between accounts
            </Typography>
          </Box>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setFormOpen(true)}
            sx={{
              borderRadius: 2,
              px: 3,
              py: 1,
              boxShadow: 2,
              '&:hover': {
                boxShadow: 4,
              }
            }}
          >
            Add Transaction
          </Button>
        </Box>

        {transactionsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load transactions. Please try again.
          </Alert>
        )}

         {formOpen && (
          <Card 
          elevation={0}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Box mb={3}>
              <FormControl fullWidth>
                <InputLabel id="transaction-type-label">Transaction Type</InputLabel>
                <Select
                  labelId="transaction-type-label"
                  value={transactionType}
                  onChange={(e) => setTransactionType(e.target.value as keyof typeof transactionForms)}
                  label="Transaction Type"
                >
                  {Object.keys(transactionForms).map((type) => (
                    <MenuItem key={type} value={type} sx={{ textTransform: 'capitalize' }}>
                      {type.charAt(0).toUpperCase() + type.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Box>
            <Box>
              <TransactionForm
                onClose={() => {
                  setFormOpen(false);
                  setEditingTransaction(null);
                  setShowForm(false);
                }}
                onSubmit={handleCreateTransaction}
                accounts={accounts}
                editingTransaction={editingTransaction}
                isLoading={createMutation.isPending}
                error={createMutation.error as Error}
              />
            </Box>
          </CardContent>
          </Card>
        )}

        {/* Filters */}
        <Card 
          elevation={0}
          sx={{ 
            mb: 3,
            borderRadius: 2,
            bgcolor: 'background.default',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} sm={6}>
                <TextField
                  label="Search transactions"
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  fullWidth
                  size="small"
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      bgcolor: 'background.paper',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                        }
                      }
                    }
                  }}
                  placeholder="Search by note or tags..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Filter by Account</InputLabel>
                  <Select
                    value={filters.account}
                    onChange={(e) => setFilters({ ...filters, account: e.target.value })}
                    label="Filter by Account"
                    sx={{
                      bgcolor: 'background.paper',
                      '&:hover': {
                        '& .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'primary.main',
                        }
                      }
                    }}
                  >
                    <SelectMenuItem value="">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccountBalance />
                        All Accounts
                      </Box>
                    </SelectMenuItem>
                    {accounts.map((account: Account) => (
                      <SelectMenuItem key={account.id} value={account.id}>
                        <Box sx={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          gap: 1,
                          color: account.type === 'income' 
                            ? 'success.main' 
                            : account.type === 'expense'
                            ? 'error.main'
                            : 'primary.main'
                        }}>
                          <AccountBalance />
                          {account.name}
                        </Box>
                      </SelectMenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Transactions Table */}
        <Card
          elevation={0}
          sx={{
            borderRadius: 2,
            bgcolor: 'background.paper',
            border: 1,
            borderColor: 'divider',
          }}
        >
          <CardContent sx={{ p: 2 }}>
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Date
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Account/Source
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Merchant/Destination
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Amount
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Tags
                    </TableCell>
                    <TableCell 
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Note
                    </TableCell>
                    <TableCell 
                      align="right"
                      sx={{ 
                        bgcolor: 'background.default',
                        fontWeight: 600,
                        py: 2,
                      }}
                    >
                      Actions
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredTransactions.map((transaction: Transaction) => (
                    <TableRow 
                      key={transaction.id}
                      hover
                      sx={{
                        '&:hover': {
                          '.transaction-actions': {
                            opacity: 1,
                          }
                        }
                      }}
                    >
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {new Date(transaction.date).toLocaleDateString('en-IN', {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(transaction.date).toLocaleDateString('en-IN', {
                              year: 'numeric',
                            })}
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          {transaction.fromAccountId ? (
                            <>
                              <Typography variant="body2" fontWeight={500}>
                                {getAccountName(transaction.fromAccountId)}
                              </Typography>
                              <Chip
                                label={getAccountType(transaction.fromAccountId)}
                                size="small"
                                color={
                                  getAccountType(transaction.fromAccountId) === 'expense' 
                                    ? 'error' 
                                    : getAccountType(transaction.fromAccountId) === 'income'
                                    ? 'success'
                                    : 'primary'
                                }
                                sx={{ 
                                  height: 20,
                                  borderRadius: 1,
                                  '& .MuiChip-label': {
                                    px: 1,
                                    fontSize: '0.7rem',
                                    textTransform: 'capitalize',
                                  }
                                }}
                              />
                            </>
                          ) : (
                            <Typography variant="body2" color="text.secondary">
                              -
                            </Typography>
                          )}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Typography variant="body2" fontWeight={500}>
                            {getAccountName(transaction.toAccountId)}
                          </Typography>
                          <Chip
                            label={getAccountType(transaction.toAccountId)}
                            size="small"
                            color={
                              getAccountType(transaction.toAccountId) === 'expense' 
                                ? 'error' 
                                : getAccountType(transaction.toAccountId) === 'income'
                                ? 'success'
                                : 'primary'
                            }
                            sx={{ 
                              height: 20,
                              borderRadius: 1,
                              '& .MuiChip-label': {
                                px: 1,
                                fontSize: '0.7rem',
                                textTransform: 'capitalize',
                              }
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography
                          sx={{ 
                            fontWeight: 600,
                            color: transaction.amount > 0 ? 'success.main' : 'error.main',
                            fontSize: '1rem',
                          }}
                        >
                          ₹{Math.abs(transaction.amount).toLocaleString()}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Box display="flex" gap={0.5} flexWrap="wrap">
                          {transaction.tags?.map((tag, index) => (
                            <Chip
                              key={index}
                              label={tag}
                              size="small"
                              sx={{ 
                                height: 20,
                                borderRadius: 1,
                                bgcolor: 'action.selected',
                                '& .MuiChip-label': {
                                  px: 1,
                                  fontSize: '0.7rem',
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography 
                          variant="body2" 
                          sx={{
                            maxWidth: 200,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }}
                        >
                          {transaction.note || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <IconButton
                          className="transaction-actions"
                          size="small"
                          onClick={(e) => {
                            setSelectedTransaction(transaction);
                            setMenuAnchor(e.currentTarget);
                          }}
                          sx={{
                            opacity: 0,
                            transition: 'opacity 0.2s',
                          }}
                        >
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

       

        {/* Actions Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => selectedTransaction && handleEditTransaction(selectedTransaction)}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={() => selectedTransaction && handleDeleteTransaction(selectedTransaction)}>
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>
      </Container>
    </ResponsiveLayout>
  );
}
