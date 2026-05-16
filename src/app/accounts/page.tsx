'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { AccountForm } from '@/components/AccountForm';
import { AccountDetails } from '@/components/AccountDetails';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem as SelectMenuItem,
} from '@mui/material';
import { MoreVert, Add, Edit, Delete, AccountBalance } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Account, AccountType, Goal } from '@/lib/types';

interface AccountWithGoals extends Account {
  linkedGoals?: Array<{
    id: string;
    name: string;
    targetAmount: number;
    currentAmount: number;
  }>;
}

async function fetchAccounts(user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/accounts?includeGoals=true', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

async function createAccount(data: any, user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/accounts', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error('Failed to create account');
  return response.json();
}

async function deleteAccount(accountId: string, user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch(`/api/accounts/${accountId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete account');
  return response.json();
}

export default function AccountsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [viewingAccount, setViewingAccount] = useState<Account | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    type: '',
  });

  const { data: accounts = [], isLoading, error } = useQuery({
    queryKey: ['accounts', user?.uid],
    queryFn: () => fetchAccounts(user),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createAccount(data, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setFormOpen(false);
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await getIdToken(user);
      if (!token) throw new Error('No authentication token available');

      if (editingAccount) {
        const response = await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(data),
        });
        if (!response.ok) throw new Error('Failed to update account');
        return response.json();
      }
      return createAccount(data, user);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setFormOpen(false);
      setEditingAccount(null);
    },
  });

  const handleCreateAccount = async (data: any) => {
    await updateMutation.mutateAsync(data);
  };

  const handleEditAccount = (account: Account) => {
    const accountToEdit = accounts.find((a: Account) => a.id === account.id);
    if (accountToEdit) {
      setEditingAccount(accountToEdit);
      setFormOpen(true);
      setMenuAnchor(null);
    }
  };

  const deleteMutation = useMutation({
    mutationFn: (accountId: string) => deleteAccount(accountId, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setMenuAnchor(null);
    },
  });

  if (loading || !user) {
    return null;
  }

  const handleDeleteAccount = (account: Account) => {
    setAccountToDelete(account);
    setConfirmOpen(true);
    setMenuAnchor(null);
  };

  const filteredAccounts = accounts.filter((account: Account) => {
    const matchesSearch = !filters.search || 
      account.name.toLowerCase().includes(filters.search.toLowerCase()) ||
      account.institution?.toLowerCase().includes(filters.search.toLowerCase());
    
    const matchesType = !filters.type || account.type === filters.type;
    
    return matchesSearch && matchesType;
  });

  const getTypeColor = (type: AccountType) => {
    switch (type) {
      case 'income':
        return 'success';
      case 'expense':
        return 'error';
      case 'savings':
        return 'primary';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: AccountType) => {
    return <AccountBalance />;
  };

  const getAccountsByType = (type: AccountType) => {
    return filteredAccounts.filter((account: Account) => account.type === type);
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

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
              Accounts
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage your financial accounts and track balances
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
            Add Account
          </Button>
        </Box>

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load accounts. Please try again.
          </Alert>
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
                  label="Search accounts"
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
                  placeholder="Search by name or institution..."
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Account Type</InputLabel>
                  <Select
                    value={filters.type}
                    onChange={(e) => setFilters({ ...filters, type: e.target.value })}
                    label="Account Type"
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
                        All Account Types
                      </Box>
                    </SelectMenuItem>
                    <SelectMenuItem value="income">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'success.main' }}>
                        <AccountBalance />
                        Income Accounts
                      </Box>
                    </SelectMenuItem>
                    <SelectMenuItem value="expense">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'error.main' }}>
                        <AccountBalance />
                        Expense Accounts
                      </Box>
                    </SelectMenuItem>
                    <SelectMenuItem value="savings">
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, color: 'primary.main' }}>
                        <AccountBalance />
                        Savings Accounts
                      </Box>
                    </SelectMenuItem>
                  </Select>
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Accounts by Type */}
        {(['income', 'expense', 'savings'] as AccountType[]).map((type) => {
          const typeAccounts = getAccountsByType(type);
          if (typeAccounts.length === 0) return null;

          return (
            <Box key={type} mb={3}>
              <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
                {type} Accounts ({typeAccounts.length})
              </Typography>
              <Grid container spacing={2}>
                {typeAccounts.map((account: AccountWithGoals) => (
                  <Grid item xs={12} sm={6} md={4} key={account.id}>
                    <Card
                      onClick={() => setViewingAccount(account)}
                      sx={{
                        height: '100%',
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                        position: 'relative',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: (theme) => theme.shadows[8],
                          '& .account-menu': {
                            opacity: 1,
                          },
                        },
                        background: (theme) => type === 'income' 
                          ? 'linear-gradient(135deg, #52c41a10 0%, #52c41a05 100%)'
                          : type === 'expense'
                          ? 'linear-gradient(135deg, #ff4d4f10 0%, #ff4d4f05 100%)'
                          : 'linear-gradient(135deg, #1890ff10 0%, #1890ff05 100%)',
                        borderTop: 4,
                        borderTopColor: (theme) => type === 'income' 
                          ? 'success.main'
                          : type === 'expense'
                          ? 'error.main'
                          : 'primary.main',
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Box 
                          display="flex" 
                          justifyContent="space-between" 
                          alignItems="flex-start"
                          mb={2}
                        >
                          <Box>
                            <Typography 
                              variant="h6" 
                              sx={{ 
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                              }}
                            >
                              <AccountBalance 
                                sx={{ 
                                  color: type === 'income' 
                                    ? 'success.main'
                                    : type === 'expense'
                                    ? 'error.main'
                                    : 'primary.main'
                                }} 
                              />
                              {account.name}
                            </Typography>
                            {account.institution && (
                              <Typography 
                                variant="body2" 
                                color="text.secondary"
                                sx={{ mt: 0.5 }}
                              >
                                {account.institution}
                              </Typography>
                            )}
                          </Box>
                          <IconButton
                            className="account-menu"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAccount(account);
                              setMenuAnchor(e.currentTarget);
                            }}
                            sx={{
                              opacity: 0,
                              transition: 'opacity 0.2s',
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </Box>
                        
                        <Box 
                          sx={{ 
                            p: 2, 
                            bgcolor: 'background.paper',
                            borderRadius: 2,
                            mb: 2,
                            boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)'
                          }}
                        >
                          {account.currentBalance !== undefined && (
                            <Box>
                              <Typography variant="overline" color="text.secondary">
                                Current Balance
                              </Typography>
                              <Typography 
                                variant="h4" 
                                sx={{ 
                                  fontWeight: 'bold',
                                  color: type === 'income' 
                                    ? 'success.main'
                                    : type === 'expense'
                                    ? 'error.main'
                                    : 'primary.main'
                                }}
                              >
                                ₹{account.currentBalance.toLocaleString()}
                              </Typography>
                            </Box>
                          )}
                        </Box>

                        <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                          <Chip
                            label={type}
                            color={getTypeColor(type)}
                            size="small"
                            sx={{ 
                              borderRadius: 2,
                              textTransform: 'capitalize',
                              fontWeight: 500,
                            }}
                          />
                          {account.subtype && (
                            <Chip
                              label={account.subtype}
                              variant="outlined"
                              size="small"
                              sx={{ 
                                borderRadius: 2,
                                textTransform: 'capitalize',
                              }}
                            />
                          )}
                        </Box>
                        
                        {account.linkedGoals && account.linkedGoals.length > 0 && (
                          <Box>
                            <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                              Linked Goals
                            </Typography>
                            <Box display="flex" gap={1} flexWrap="wrap">
                              {account.linkedGoals.map((goal) => (
                                <Chip
                                  key={goal.id}
                                  label={`${goal.name} (₹${goal.currentAmount?.toLocaleString() || 0}/${goal.targetAmount.toLocaleString()})`}
                                  size="small"
                                  onClick={() => router.push(`/goals?id=${goal.id}`)}
                                  sx={{
                                    bgcolor: 'background.paper',
                                    borderRadius: '16px',
                                    '&:hover': {
                                      bgcolor: 'action.hover',
                                    },
                                  }}
                                />
                              ))}
                            </Box>
                          </Box>
                        )}

                        <Box 
                          sx={{ 
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            color: 'text.secondary',
                            fontSize: '0.875rem'
                          }}
                        >
                          <Typography variant="caption" sx={{ opacity: 0.7 }}>
                            Currency:
                          </Typography>
                          <Typography variant="body2" sx={{ fontWeight: 500 }}>
                            {account.currency}
                          </Typography>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </Box>
          );
        })}

        {/* Account Form */}
        <AccountForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingAccount(null);
          }}
          onSubmit={handleCreateAccount}
          editingAccount={editingAccount || undefined}
        />

        {/* Actions Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => selectedAccount && handleEditAccount(selectedAccount)}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={() => selectedAccount && handleDeleteAccount(selectedAccount)}>
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        {/* Account Details Dialog */}
        <AccountDetails
          account={viewingAccount}
          onClose={() => setViewingAccount(null)}
        />

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Account"
          message={`Are you sure you want to delete account "${accountToDelete?.name}"?`}
          onConfirm={async () => {
            if (accountToDelete) {
              try {
                await deleteMutation.mutateAsync(accountToDelete.id);
              } catch (error) {
                console.error('Error deleting account:', error);
              }
            }
            setConfirmOpen(false);
            setAccountToDelete(null);
          }}
          onCancel={() => {
            setConfirmOpen(false);
            setAccountToDelete(null);
          }}
          loading={deleteMutation.isPending}
        />
      </Container>
    </ResponsiveLayout>
  );
}
