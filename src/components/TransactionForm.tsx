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
  Chip,
  Box,
  Grid,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { Add, Delete } from '@mui/icons-material';
import dayjs from 'dayjs';
import { TransactionFormData, Account, SourceBreakdown } from '@/lib/types';

const TransactionSchema = z.object({
  date: z.date(),
  amount: z.number().positive('Amount must be positive'),
  currency: z.string().min(1, 'Currency is required'),
  fromAccountId: z.string().min(1, 'From account is required'),
  toAccountId: z.string().min(1, 'To account is required'),
  category: z.string().optional(),
  tags: z.array(z.string()),
  note: z.string().optional(),
  sourceBreakdown: z.array(z.object({
    sourceAccountId: z.string(),
    amount: z.number().positive(),
    referenceTxId: z.string().optional(),
  })),
});

interface TransactionFormProps {
  open?: boolean;
  onClose?: () => void;
  onSubmit: (data: TransactionFormData) => Promise<void>;
  accounts: Account[];
  editingTransaction?: any;
  initialValues?: {
    amount: string;
    date: Date;
    note?: string;
    fromAccountId: string;
    toAccountId: string;
    category?: string;
    tags?: string[];
  };
}

export function TransactionForm({
  open = true,
  onClose,
  onSubmit,
  accounts,
  editingTransaction,
  initialValues,
}: TransactionFormProps) {
  const [sourceBreakdown, setSourceBreakdown] = useState<SourceBreakdown[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(TransactionSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      currency: 'INR',
      category: '',
      fromAccountId: '',
      toAccountId: '',
      tags: [],
      note: '',
      sourceBreakdown: [],
    },
  });

  const watchedAmount = watch('amount');
  const watchedFromAccount = watch('fromAccountId');

  useEffect(() => {
    if (editingTransaction) {
      reset({
        date: dayjs(editingTransaction.date).toDate(),
        amount: editingTransaction.amount,
        currency: editingTransaction.currency,
        fromAccountId: editingTransaction.fromAccountId,
        toAccountId: editingTransaction.toAccountId,
        tags: editingTransaction.tags || [],
        note: editingTransaction.note || '',
        sourceBreakdown: editingTransaction.sourceBreakdown || [],
      });
      setSourceBreakdown(editingTransaction.sourceBreakdown || []);
    } else if (initialValues) {
      reset({
        date: dayjs(initialValues.date).toDate(),
        amount: parseFloat(initialValues.amount),
        currency: 'INR',
        fromAccountId: initialValues.fromAccountId,
        toAccountId: initialValues.toAccountId,
        tags: initialValues.tags || [],
        note: initialValues.note || '',
        sourceBreakdown: [],
      });
      setSourceBreakdown([]);
    } else {
      reset({
        date: dayjs().toDate(),
        amount: 0,
        currency: 'INR',
        fromAccountId: '',
        toAccountId: '',
        tags: [],
        note: '',
        sourceBreakdown: [],
      });
      setSourceBreakdown([]);
    }
  }, [editingTransaction, initialValues, reset]);

  const handleFormSubmit = async (data: TransactionFormData) => {
    try {
      await onSubmit({
        ...data,
        sourceBreakdown,
      });
      reset();
      setSourceBreakdown([]);
      onClose?.();
    } catch (error) {
      console.error('Error submitting transaction:', error);
    }
  };

  const addSourceBreakdown = () => {
    setSourceBreakdown([...sourceBreakdown, { sourceAccountId: '', amount: 0 }]);
  };

  const removeSourceBreakdown = (index: number) => {
    setSourceBreakdown(sourceBreakdown.filter((_, i) => i !== index));
  };

  const updateSourceBreakdown = (index: number, field: keyof SourceBreakdown, value: any) => {
    const updated = [...sourceBreakdown];
    updated[index] = { ...updated[index], [field]: value };
    setSourceBreakdown(updated);
  };

  const totalSourceAmount = sourceBreakdown.reduce((sum, item) => sum + (item.amount || 0), 0);
  const remainingAmount = watchedAmount - totalSourceAmount;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
        <DialogTitle>
          {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
        </DialogTitle>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Date"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={(newValue) => field.onChange(newValue ? newValue.toDate() : new Date())}
                      slotProps={{
                        textField: {
                          fullWidth: true,
                          error: !!errors.date,
                          helperText: errors.date?.message,
                        },
                      }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="amount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Amount"
                      type="number"
                      fullWidth
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      options={[
                        'Income',
                        'Expense',
                        'Transfer',
                        'Bills',
                        'Food',
                        'Shopping',
                        'Travel',
                        'Entertainment',
                        'Others'
                      ]}
                      freeSolo
                      value={field.value || ''}
                      onChange={(_, value) => field.onChange(value)}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Category"
                          error={!!errors.category}
                          helperText={errors.category?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="fromAccountId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      options={accounts}
                      getOptionLabel={(option) => option.name}
                      value={accounts.find(acc => acc.id === field.value) || null}
                      onChange={(_, value) => field.onChange(value?.id || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="From Account"
                          error={!!errors.fromAccountId}
                          helperText={errors.fromAccountId?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="toAccountId"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      options={accounts}
                      getOptionLabel={(option) => option.name}
                      value={accounts.find(acc => acc.id === field.value) || null}
                      onChange={(_, value) => field.onChange(value?.id || '')}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="To Account"
                          error={!!errors.toAccountId}
                          helperText={errors.toAccountId?.message}
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="tags"
                  control={control}
                  render={({ field }) => (
                    <Autocomplete
                      {...field}
                      multiple
                      freeSolo
                      options={[]}
                      value={field.value}
                      onChange={(_, value) => field.onChange(value)}
                      renderTags={(value, getTagProps) =>
                        value.map((option, index) => (
                          <Chip
                            variant="outlined"
                            label={option}
                            {...getTagProps({ index })}
                            key={index}
                          />
                        ))
                      }
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Tags"
                          placeholder="Add tags..."
                        />
                      )}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Note"
                      multiline
                      rows={3}
                      fullWidth
                    />
                  )}
                />
              </Grid>

              {watchedFromAccount && (
                <>
                  <Grid item xs={12}>
                    <Divider sx={{ my: 2 }} />
                    <Box display="flex" justifyContent="space-between" alignItems="center">
                      <Typography variant="h6">Source of Funds</Typography>
                      <Button
                        startIcon={<Add />}
                        onClick={addSourceBreakdown}
                        size="small"
                      >
                        Add Source
                      </Button>
                    </Box>
                    <Typography variant="body2" color="text.secondary">
                      Remaining amount: ₹{remainingAmount.toLocaleString()}
                    </Typography>
                  </Grid>

                  {sourceBreakdown.map((item, index) => (
                    <Grid item xs={12} key={index}>
                      <Box display="flex" gap={2} alignItems="center">
                        <Autocomplete
                          options={accounts}
                          getOptionLabel={(option) => option.name}
                          value={accounts.find(acc => acc.id === item.sourceAccountId) || null}
                          onChange={(_, value) => updateSourceBreakdown(index, 'sourceAccountId', value?.id || '')}
                          sx={{ flexGrow: 1 }}
                          renderInput={(params) => (
                            <TextField {...params} label="Source Account" />
                          )}
                        />
                        <TextField
                          label="Amount"
                          type="number"
                          value={item.amount}
                          onChange={(e) => updateSourceBreakdown(index, 'amount', parseFloat(e.target.value) || 0)}
                          sx={{ width: 120 }}
                        />
                        <IconButton
                          onClick={() => removeSourceBreakdown(index)}
                          color="error"
                        >
                          <Delete />
                        </IconButton>
                      </Box>
                    </Grid>
                  ))}
                </>
              )}
            </Grid>
          </DialogContent>

          <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingTransaction ? 'Update' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}
