'use client';

import { useState, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  Autocomplete,
  Grid,
  Box,
  Typography,
  IconButton,
  Chip,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import { GoalFormData, Account, Goal } from '@/lib/types';

const AllocationSchema = z.object({
  accountId: z.string().optional(),
  instrumentId: z.string().optional(),
  amount: z.number().positive(),
});

const GoalSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  targetAmount: z.coerce.number().positive('Target amount must be positive'),
  targetDate: z.date().optional(),
  priority: z.coerce.number().min(1, 'Priority must be at least 1'),
  allocations: z.array(AllocationSchema),
});

interface GoalFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: GoalFormData) => Promise<void>;
  accounts: Account[];
  editingGoal?: Goal;
}

export function GoalForm({
  open,
  onClose,
  onSubmit,
  accounts,
  editingGoal,
}: GoalFormProps) {
  const [allocations, setAllocations] = useState<{ accountId?: string; instrumentId?: string; amount: number }[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<GoalFormData>({
    resolver: zodResolver(GoalSchema),
    defaultValues: {
      name: '',
      targetAmount: 0,
      targetDate: undefined,
      priority: 1,
      allocations: [],
    },
  });

  const watchedTargetAmount = watch('targetAmount');

  useEffect(() => {
    if (editingGoal) {
      reset({
        name: editingGoal.name,
        targetAmount: editingGoal.targetAmount,
        targetDate: editingGoal.targetDate ? new Date(editingGoal.targetDate) : undefined,
        priority: editingGoal.priority || 1,
        allocations: editingGoal.allocations || [],
      });
      setAllocations(editingGoal.allocations || []);
    } else {
      reset({
        name: '',
        targetAmount: 0,
        targetDate: undefined,
        priority: 1,
        allocations: [],
      });
      setAllocations([]);
    }
  }, [editingGoal, reset]);

  const handleFormSubmit = async (data: GoalFormData) => {
    try {
      await onSubmit({
        ...data,
        allocations,
      });
      reset();
      setAllocations([]);
      onClose();
    } catch (error) {
      console.error('Error submitting goal:', error);
    }
  };

  const addAllocation = () => {
    setAllocations([...allocations, { accountId: '', amount: 0 }]);
  };

  const removeAllocation = (index: number) => {
    setAllocations(allocations.filter((_, i) => i !== index));
  };

  const updateAllocation = (index: number, field: 'accountId' | 'amount', value: any) => {
    const updated = [...allocations];
    updated[index] = { ...updated[index], [field]: value };
    setAllocations(updated);
  };

  const totalAllocated = allocations.reduce((sum, allocation) => sum + (allocation.amount || 0), 0);
  const remainingAmount = watchedTargetAmount - totalAllocated;

  const savingsAccounts = accounts.filter(account => account.type === 'savings');

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingGoal ? 'Edit Goal' : 'Add Goal'}
        </DialogTitle>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="name"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Goal Name"
                      fullWidth
                      error={!!errors.name}
                      helperText={errors.name?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="targetAmount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Target Amount"
                      type="number"
                      fullWidth
                      error={!!errors.targetAmount}
                      helperText={errors.targetAmount?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="targetDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Target Date"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(date) => field.onChange(date?.toDate())}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.targetDate,
                          helperText: errors.targetDate?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="priority"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Priority"
                      type="number"
                      fullWidth
                      inputProps={{ min: 1 }}
                      error={!!errors.priority}
                      helperText={errors.priority?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Box>
                  <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6">Account Allocations</Typography>
                    <Button
                      startIcon={<Add />}
                      onClick={addAllocation}
                      size="small"
                      disabled={savingsAccounts.length === 0}
                    >
                      Add Allocation
                    </Button>
                  </Box>
                  
                  {savingsAccounts.length === 0 && (
                    <Typography color="text.secondary" variant="body2">
                      No savings accounts available. Create savings accounts first.
                    </Typography>
                  )}

                  <Typography variant="body2" color="text.secondary" mb={2}>
                    Total allocated: ₹{totalAllocated.toLocaleString()} / ₹{watchedTargetAmount.toLocaleString()}
                    {remainingAmount > 0 && (
                      <Chip
                        label={`Remaining: ₹${remainingAmount.toLocaleString()}`}
                        color="warning"
                        size="small"
                        sx={{ ml: 1 }}
                      />
                    )}
                  </Typography>

                  {allocations.map((allocation, index) => (
                    <Box key={index} display="flex" gap={2} alignItems="center" mb={2}>
                      <Autocomplete
                        options={savingsAccounts}
                        getOptionLabel={(option) => option.name}
                        value={savingsAccounts.find(acc => acc.id === allocation.accountId) || null}
                        onChange={(_, value) => updateAllocation(index, 'accountId', value?.id || '')}
                        sx={{ flexGrow: 1 }}
                        renderInput={(params) => (
                          <TextField {...params} label="Savings Account" />
                        )}
                      />
                      <TextField
                        label="Amount"
                        type="number"
                        value={allocation.amount}
                        onChange={(e) => updateAllocation(index, 'amount', parseFloat(e.target.value) || 0)}
                        sx={{ width: 120 }}
                      />
                      <IconButton
                        onClick={() => removeAllocation(index)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    </Box>
                  ))}
                </Box>
              </Grid>
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingGoal ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}
