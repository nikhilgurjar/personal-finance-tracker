'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  SelectChangeEvent,
  Snackbar,
} from '@mui/material';
import { 
  MoreVert, Add, Edit, Delete, Schedule, PlayArrow, Pause,
  Savings, ArrowUpward, ArrowDownward, SwapHoriz, RemoveRedEye,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Schedule as ScheduleType, Account } from '@/lib/types';
import { RRule } from 'rrule';

import { ExpenseForm } from '@/components/forms/ExpenseForm';
import { IncomeForm } from '@/components/forms/IncomeForm';
import { TransferForm } from '@/components/forms/TransferForm';
import { SavingsForm } from '@/components/forms/SavingsForm';
const formatRRule = (rule: string) => {
  try {
    const rrule = RRule.fromString(rule);
    return rrule.toText();
  } catch (e) {
    return 'Invalid frequency';
  }
};

const getNextRunDate = (nextRunAt: number) => {
  const date = new Date(nextRunAt);
  const now = new Date();
  return {
    date,
    isOverdue: date < now
  };
};

type ScheduleTransactionType = 'expense' | 'income' | 'transfer' | 'savings';

function isScheduleTransactionType(type: string): type is ScheduleTransactionType {
  return type === 'expense' || type === 'income' || type === 'transfer' || type === 'savings';
}

export default function SchedulesPage() {
  // Map of transaction types to their forms
  const transactionForms = {
    expense: ExpenseForm,
    income: IncomeForm,
    transfer: TransferForm,
    savings: SavingsForm,
  } as const;
  const { user } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedSchedule, setSelectedSchedule] = useState<ScheduleType | null>(null);
  const [transactionType, setTransactionType] = useState<keyof typeof transactionForms>('expense');
  const [showForm, setShowForm] = useState(false);
  const [frequency, setFrequency] = useState('FREQ=MONTHLY');
  const [scheduleName, setScheduleName] = useState('');
  const [formError, setFormError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [scheduleToDelete, setScheduleToDelete] = useState<ScheduleType | null>(null);
  const [automationToast, setAutomationToast] = useState('');

  const TransactionForm = transactionForms[transactionType];

  const handleTransactionTypeChange = (event: SelectChangeEvent<string>) => {
    setTransactionType(event.target.value as keyof typeof transactionForms);
  };

  // Add schedule mutation
  const addScheduleMutation = useMutation({
    mutationFn: async (data: any) => {
      const token = await getIdToken(user);
      const response = await fetch('/api/schedules', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create schedule');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      setShowForm(false);
      setScheduleName('');
      setFrequency('FREQ=MONTHLY');
      setFormError('');
    },
    onError: (error: Error) => {
      setFormError(error.message);
    },
  });

  // Fetch schedules
  const { 
    data: schedules = [], 
    isLoading: schedulesLoading,
    error: schedulesError,
  } = useQuery({
    queryKey: ['schedules'],
    queryFn: async () => {
      const token = await getIdToken(user);
      const response = await fetch('/api/schedules', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch schedules');
      }
      return response.json();
    },
    enabled: !!user
  });

  // Fetch accounts
  const { 
    data: accounts = [], 
    isLoading: accountsLoading 
  } = useQuery({
    queryKey: ['accounts'],
    queryFn: async () => {
      const token = await getIdToken(user);
      const response = await fetch('/api/accounts', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to fetch accounts');
      }
      return response.json();
    },
    enabled: !!user,
  });

  const {
    data: scheduleSuggestions = [],
    isLoading: suggestionsLoading,
  } = useQuery({
    queryKey: ['schedule-suggestions', user?.uid],
    queryFn: async () => {
      const token = await getIdToken(user);
      const response = await fetch('/api/schedule-suggestions', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch schedule suggestions');
      return response.json();
    },
    enabled: !!user,
  });

  const applySuggestionMutation = useMutation({
    mutationFn: async ({ scheduleId, action }: { scheduleId: string; action: 'approve' | 'skip' }) => {
      const token = await getIdToken(user);
      const response = await fetch('/api/schedule-suggestions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scheduleId, action }),
      });
      if (!response.ok) throw new Error('Failed to apply schedule suggestion');
      return response.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['schedule-suggestions'] });
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setAutomationToast(variables.action === 'skip' ? 'Schedule skipped' : 'Transaction created from schedule');
    },
  });

  // Update schedule status mutation
  const updateStatusMutation = useMutation<
    ScheduleType, 
    Error, 
    ScheduleType
  >({
    mutationFn: async (schedule) => {
      const token = await getIdToken(user);
      const response = await fetch(`/api/schedules/${schedule.id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: schedule.status === 'active' ? 'paused' : 'active',
        }),
      });
      if (!response.ok) {
        throw new Error('Failed to update schedule status');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  // Filter schedules based on search term
  const filteredSchedules = Array.isArray(schedules) ? schedules.filter((schedule: ScheduleType) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      schedule.name?.toLowerCase().includes(searchLower) ||
      schedule.template.note?.toLowerCase().includes(searchLower) ||
      schedule.template.tags?.some(tag => tag.toLowerCase().includes(searchLower)) ||
      schedule.template.type.toLowerCase() === searchLower
    );
  }) : [];

  // Helper functions
  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return 'Unknown Account';
    const account = accounts.find((a: Account) => a.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const handleToggleStatus = (schedule: ScheduleType) => {
    updateStatusMutation.mutate(schedule);
  };

  const [viewingSchedule, setViewingSchedule] = useState<ScheduleType | null>(null);
  const [editingSchedule, setEditingSchedule] = useState<ScheduleType | null>(null);

  const handleViewSchedule = (schedule: ScheduleType) => {
    setMenuAnchor(null);
    setViewingSchedule(schedule);
  };

  const handleEditSchedule = (schedule: ScheduleType) => {
    setMenuAnchor(null);
    setEditingSchedule(schedule);
    setShowForm(true);
    if (isScheduleTransactionType(schedule.template.type)) {
      setTransactionType(schedule.template.type);
    }
    setScheduleName(schedule.name);
    setFrequency(schedule.rrule);
    
    // Reset any existing form error
    setFormError('');
  };

  const handleDeleteSchedule = (schedule: ScheduleType) => {
    setMenuAnchor(null);
    setScheduleToDelete(schedule);
    setConfirmOpen(true);
  };

  // Delete schedule mutation
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      const token = await getIdToken(user);
      const response = await fetch(`/api/schedules/${scheduleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        throw new Error('Failed to delete schedule');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
    },
  });

  const frequencyOptions = [
    { value: 'FREQ=DAILY', label: 'Daily' },
    { value: 'FREQ=WEEKLY', label: 'Weekly' },
    { value: 'FREQ=MONTHLY', label: 'Monthly' },
    { value: 'FREQ=YEARLY', label: 'Yearly' },
  ];

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <Container maxWidth="lg" sx={{ mt: 4, pb: 4 }}>
        <Grid container spacing={3}>
          {/* Header */}
          <Grid item xs={12}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
              <Typography variant="h4">Schedules</Typography>
              <Button
                variant="contained"
                color="primary"
                startIcon={<Add />}
                onClick={() => setShowForm(!showForm)}
              >
                {showForm ? 'Hide Form' : 'New Schedule'}
              </Button>
            </Box>
          </Grid>

          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 3, mb: 1 }}>
              <Typography variant="h6" fontWeight={700} gutterBottom>
                Suggested Transactions
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Review due or upcoming schedules before creating transactions.
              </Typography>
              {suggestionsLoading ? (
                <CircularProgress size={24} />
              ) : scheduleSuggestions.length === 0 ? (
                <Alert severity="success">No schedules are due in the next 7 days.</Alert>
              ) : (
                <Grid container spacing={2}>
                  {scheduleSuggestions.map((suggestion: any) => (
                    <Grid item xs={12} md={6} key={suggestion.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 2, mb: 1 }}>
                            <Box>
                              <Typography variant="subtitle1" fontWeight={700}>{suggestion.name}</Typography>
                              <Typography variant="caption" color={suggestion.overdue ? 'error.main' : 'text.secondary'}>
                                {suggestion.overdue ? 'Overdue: ' : 'Due: '}
                                {new Date(suggestion.dueAt).toLocaleDateString('en-IN')}
                              </Typography>
                            </Box>
                            <Chip label={suggestion.template.type} size="small" />
                          </Box>
                          <Typography variant="h6" fontWeight={800}>
                            {suggestion.template.amount.toLocaleString('en-IN', { style: 'currency', currency: suggestion.template.currency || 'INR' })}
                          </Typography>
                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            <Button
                              size="small"
                              variant="contained"
                              onClick={() => applySuggestionMutation.mutate({ scheduleId: suggestion.scheduleId, action: 'approve' })}
                              disabled={applySuggestionMutation.isPending}
                            >
                              Approve
                            </Button>
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => applySuggestionMutation.mutate({ scheduleId: suggestion.scheduleId, action: 'skip' })}
                              disabled={applySuggestionMutation.isPending}
                            >
                              Skip
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </Paper>
          </Grid>

          {/* Schedule Form */}
          {showForm && (
            <Grid item xs={12}>
              <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                  {/* Transaction Type Selection */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Transaction Type</InputLabel>
                      <Select
                        value={transactionType}
                        onChange={handleTransactionTypeChange}
                        label="Transaction Type"
                      >
                        {Object.keys(transactionForms).map((type) => (
                          <MenuItem key={type} value={type}>
                            {type.charAt(0).toUpperCase() + type.slice(1)}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Frequency Selection */}
                  <Grid item xs={12} sm={6}>
                    <FormControl fullWidth>
                      <InputLabel>Frequency</InputLabel>
                      <Select
                        value={frequency}
                        onChange={(e) => setFrequency(e.target.value)}
                        label="Frequency"
                      >
                        {frequencyOptions.map((option) => (
                          <MenuItem key={option.value} value={option.value}>
                            {option.label}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>

                  {/* Schedule Name */}
                  <Grid item xs={12}>
                    <TextField
                      fullWidth
                      label="Schedule Name"
                      placeholder="Enter a name for this scheduled transaction"
                      required
                      value={scheduleName}
                      onChange={(e) => setScheduleName(e.target.value)}
                      error={formError.includes('name')}
                      helperText={formError.includes('name') ? formError : ''}
                    />
                  </Grid>

                  {/* Error Display */}
                  {formError && !formError.includes('name') && (
                    <Grid item xs={12}>
                      <Alert severity="error">{formError}</Alert>
                    </Grid>
                  )}

                  {/* Transaction Form */}
                  <Grid item xs={12}>
                    <TransactionForm
                      accounts={accounts}
                      initialValues={editingSchedule ? {
                        amount: editingSchedule.template.amount.toString(),
                        date: new Date(editingSchedule.nextRunAt),
                        note: editingSchedule.template.note || '',
                        fromAccountId: editingSchedule.template.fromAccountId,
                        toAccountId: editingSchedule.template.toAccountId,
                        category: editingSchedule.template.category || '',
                        tags: editingSchedule.template.tags || [],
                      } : undefined}
                      onSubmit={(data) => {
                        if (!scheduleName.trim()) {
                          setFormError('Schedule name is required');
                          return;
                        }

                          // Validate and prepare account data based on transaction type
                        let fromAccount: Account | undefined;
                        let toAccount: Account | undefined;
                        let fromAccountType: 'income' | 'expense' | 'savings';
                        let toAccountType: 'income' | 'expense' | 'savings';

                        switch(transactionType) {
                          case 'income':
                            // For income, we only need the target account
                            if (!data.toAccountId) {
                              setFormError('Please select the account to receive the income');
                              return;
                            }
                            toAccount = accounts.find((a: Account) => a.id === data.toAccountId);
                            if (!toAccount) {
                              setFormError('Invalid target account selection');
                              return;
                            }
                            fromAccountType = 'income';
                            toAccountType = toAccount.type;
                            break;

                          case 'expense':
                            // For expense, we need the source account
                            if (!data.fromAccountId) {
                              setFormError('Please select the account to pay from');
                              return;
                            }
                            fromAccount = accounts.find((a: Account) => a.id === data.fromAccountId);
                            if (!fromAccount) {
                              setFormError('Invalid source account selection');
                              return;
                            }
                            fromAccountType = fromAccount.type;
                            toAccountType = 'expense';
                            break;

                          case 'transfer':
                          case 'savings':
                            // For transfers and savings, we need both accounts
                            if (!data.fromAccountId || !data.toAccountId) {
                              setFormError('Please select both source and destination accounts');
                              return;
                            }
                            fromAccount = accounts.find((a: Account) => a.id === data.fromAccountId);
                            toAccount = accounts.find((a: Account) => a.id === data.toAccountId);
                            if (!fromAccount || !toAccount) {
                              setFormError('Invalid account selection');
                              return;
                            }
                            fromAccountType = fromAccount.type;
                            toAccountType = toAccount.type;
                            // Validate savings transactions
                            if (transactionType === 'savings' && toAccountType !== 'savings') {
                              setFormError('Target account must be a savings account for savings transactions');
                              return;
                            }
                            break;

                          default:
                            setFormError('Invalid transaction type');
                            return;
                        }

                        // Convert date to timestamp for nextRunAt
                        const nextRunAt = data.date instanceof Date 
                          ? data.date.getTime() 
                          : new Date(data.date).getTime();

                        const scheduleData = {
                          name: scheduleName,
                          rrule: frequency,
                          template: {
                            amount: Number(data.amount),
                            type: transactionType,
                            fromAccountId: fromAccount?.id || 'income',
                            toAccountId: toAccount?.id || 'expense',
                            fromAccountType,
                            toAccountType,
                            currency: 'INR',
                            note: data.note,
                            category: data.category,
                            tags: data.tags || [],
                          },
                          nextRunAt,
                          status: 'active' as const,
                          priority: 1,
                        };                        addScheduleMutation.mutate(scheduleData);
                      }}
                    />
                  </Grid>
                </Grid>
              </Paper>
            </Grid>
          )}

          {/* Search and Filters */}
          <Grid item xs={12}>
            <Paper elevation={1} sx={{ p: 3, mb: 3 }}>
              <TextField
                fullWidth
                label="Search Schedules"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by name, type, or tags..."
              />
            </Paper>
          </Grid>

          {/* Schedules List */}
          <Grid item xs={12}>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Name</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Amount</TableCell>
                    <TableCell>Frequency</TableCell>
                    <TableCell>Next Run</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filteredSchedules.map((schedule: ScheduleType) => {
                    const { date: nextRunDate, isOverdue } = getNextRunDate(schedule.nextRunAt);
                    return (
                      <TableRow key={schedule.id}>
                        <TableCell>{schedule.name}</TableCell>
                        <TableCell>
                          <Chip
                            label={schedule.template.type}
                            color={
                              schedule.template.type === 'expense' ? 'error' :
                              schedule.template.type === 'income' ? 'success' :
                              schedule.template.type === 'transfer' ? 'info' :
                              schedule.template.type === 'savings' ? 'secondary' :
                              'default'
                            }
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {typeof schedule.template.amount === 'number'
                            ? schedule.template.amount.toLocaleString('en-US', {
                                style: 'currency',
                                currency: 'USD',
                              })
                            : schedule.template.amount}
                        </TableCell>
                        <TableCell>{formatRRule(schedule.rrule)}</TableCell>
                        <TableCell>
                          <Chip
                            label={nextRunDate.toLocaleDateString()}
                            color={isOverdue ? 'error' : 'default'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={schedule.status === 'active'}
                                onChange={() => handleToggleStatus(schedule)}
                                color="primary"
                              />
                            }
                            label={schedule.status === 'active' ? 'Active' : 'Paused'}
                          />
                        </TableCell>
                        <TableCell>
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              setSelectedSchedule(schedule);
                              setMenuAnchor(e.currentTarget);
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          </Grid>
        </Grid>

        {/* Actions Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => selectedSchedule && handleViewSchedule(selectedSchedule)}>
            <RemoveRedEye sx={{ mr: 1 }} /> View Details
          </MenuItem>
          <MenuItem onClick={() => selectedSchedule && handleEditSchedule(selectedSchedule)}>
            <Edit sx={{ mr: 1 }} /> Edit
          </MenuItem>
          <MenuItem onClick={() => selectedSchedule && handleDeleteSchedule(selectedSchedule)}>
            <Delete sx={{ mr: 1 }} /> Delete
          </MenuItem>
        </Menu>

        {/* View Schedule Dialog */}
        <Dialog 
          open={!!viewingSchedule} 
          onClose={() => setViewingSchedule(null)}
          maxWidth="md"
          fullWidth
        >
          {viewingSchedule && (
            <>
              <DialogTitle>
                Schedule Details
              </DialogTitle>
              <DialogContent>
                <Grid container spacing={3} sx={{ mt: 1 }}>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Name
                    </Typography>
                    <Typography variant="body1">
                      {viewingSchedule.name}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Type
                    </Typography>
                    <Chip
                      label={viewingSchedule.template.type}
                      color={
                        viewingSchedule.template.type === 'expense' ? 'error' :
                        viewingSchedule.template.type === 'income' ? 'success' :
                        viewingSchedule.template.type === 'transfer' ? 'info' :
                        viewingSchedule.template.type === 'savings' ? 'secondary' :
                        'default'
                      }
                      size="small"
                    />
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Amount
                    </Typography>
                    <Typography variant="body1">
                      {viewingSchedule.template.amount.toLocaleString('en-IN', {
                        style: 'currency',
                        currency: viewingSchedule.template.currency || 'INR'
                      })}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Frequency
                    </Typography>
                    <Typography variant="body1">
                      {formatRRule(viewingSchedule.rrule)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      From Account
                    </Typography>
                    <Typography variant="body1">
                      {viewingSchedule.template.type === 'income' ? 'Income' : getAccountName(viewingSchedule.template.fromAccountId)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      To Account
                    </Typography>
                    <Typography variant="body1">
                      {viewingSchedule.template.type === 'expense' ? 'Expense' : getAccountName(viewingSchedule.template.toAccountId)}
                    </Typography>
                  </Grid>
                  <Grid item xs={12} sm={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Next Run
                    </Typography>
                    <Typography variant="body1">
                      {new Date(viewingSchedule.nextRunAt).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </Typography>
                  </Grid>
                  {viewingSchedule.template.note && (
                    <Grid item xs={12}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Note
                      </Typography>
                      <Typography variant="body1">
                        {viewingSchedule.template.note}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setViewingSchedule(null)}>Close</Button>
                <Button 
                  variant="contained" 
                  onClick={() => {
                    handleEditSchedule(viewingSchedule);
                    setViewingSchedule(null);
                  }}
                >
                  Edit
                </Button>
              </DialogActions>
            </>
          )}
        </Dialog>

        {/* Loading State */}
        {(schedulesLoading || accountsLoading) && (
          <Box display="flex" justifyContent="center" mt={4}>
            <CircularProgress />
          </Box>
        )}

        {/* Error State */}
        {schedulesError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {schedulesError.message}
          </Alert>
        )}

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Schedule"
          message={`Are you sure you want to delete this schedule?`}
          onConfirm={() => {
            if (scheduleToDelete) {
              deleteScheduleMutation.mutate(scheduleToDelete.id);
            }
            setConfirmOpen(false);
          }}
          onCancel={() => setConfirmOpen(false)}
          loading={deleteScheduleMutation.isPending}
        />
        <Snackbar open={!!automationToast} autoHideDuration={3000} onClose={() => setAutomationToast('')} message={automationToast} />
      </Container>
    </ResponsiveLayout>
  );
}
