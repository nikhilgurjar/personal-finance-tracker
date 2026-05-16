'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem, Box, Typography,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Account } from '@/lib/types';

const IncomeSchema = z.object({
  date: z.date(),
  amount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('INR'),
  toAccountId: z.string().min(1, 'Account is required'),
  sourceType: z.enum(['salary', 'freelance', 'from_person', 'business', 'rental', 'investment', 'other']),
  sourceName: z.string().optional(),
  note: z.string().optional(),
  month: z.string().optional(),
});

type IncomeSchema = z.infer<typeof IncomeSchema>;

const SOURCE_TYPES = [
  { value: 'salary', label: '💼 Salary' },
  { value: 'freelance', label: '💻 Freelance' },
  { value: 'from_person', label: '🤝 From a Person' },
  { value: 'business', label: '🏪 Business Income' },
  { value: 'rental', label: '🏠 Rental Income' },
  { value: 'investment', label: '📈 Investment Returns' },
  { value: 'other', label: '📦 Other' },
];

interface IncomeFormFullProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: IncomeSchema) => Promise<void>;
  accounts: Account[];
  editingIncome?: any;
}

export function IncomeFormFull({ open, onClose, onSubmit, accounts, editingIncome }: IncomeFormFullProps) {
  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<IncomeSchema>({
    resolver: zodResolver(IncomeSchema),
    defaultValues: {
      date: new Date(),
      amount: 0,
      currency: 'INR',
      toAccountId: '',
      sourceType: 'salary',
      sourceName: '',
      note: '',
    },
  });

  const watchedSourceType = watch('sourceType');

  useEffect(() => {
    if (editingIncome) {
      reset({
        date: new Date(editingIncome.date),
        amount: editingIncome.amount,
        currency: editingIncome.currency || 'INR',
        toAccountId: editingIncome.toAccountId || '',
        sourceType: editingIncome.sourceType || 'salary',
        sourceName: editingIncome.sourceName || '',
        note: editingIncome.note || '',
        month: editingIncome.month || '',
      });
    } else {
      reset({ date: new Date(), amount: 0, currency: 'INR', toAccountId: '', sourceType: 'salary' });
    }
  }, [editingIncome, open, reset]);

  const handleFormSubmit = async (data: IncomeSchema) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (err) {
      console.error('Error submitting income:', err);
    }
  };

  const sourceNameLabel =
    watchedSourceType === 'salary' ? 'Employer Name' :
    watchedSourceType === 'from_person' ? 'Person Name' :
    watchedSourceType === 'freelance' ? 'Client Name (optional)' :
    watchedSourceType === 'business' ? 'Business / Client Name' :
    'Source Name (optional)';

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingIncome ? 'Edit Income' : 'Add Income'}</DialogTitle>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <Controller
                  name="sourceType"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.sourceType}>
                      <InputLabel>Income Source</InputLabel>
                      <Select {...field} label="Income Source">
                        {SOURCE_TYPES.map(s => (
                          <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="sourceName"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label={sourceNameLabel} fullWidth />
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
                      label="Amount (₹)"
                      type="number"
                      fullWidth
                      error={!!errors.amount}
                      helperText={errors.amount?.message}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={6}>
                <Controller
                  name="date"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Date"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={val => field.onChange(val?.toDate() || new Date())}
                      slotProps={{ textField: { fullWidth: true, error: !!errors.date } }}
                    />
                  )}
                />
              </Grid>

              <Grid item xs={12} sm={watchedSourceType === 'salary' ? 6 : 12}>
                <Controller
                  name="toAccountId"
                  control={control}
                  render={({ field }) => (
                    <FormControl fullWidth error={!!errors.toAccountId}>
                      <InputLabel>Received Into Account</InputLabel>
                      <Select {...field} label="Received Into Account">
                        {accounts.map(acc => (
                          <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                />
              </Grid>

              {watchedSourceType === 'salary' && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="month"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Salary Month (YYYY-MM)"
                        fullWidth
                        placeholder="e.g. 2025-09"
                        helperText="Month this salary is for"
                      />
                    )}
                  />
                </Grid>
              )}

              <Grid item xs={12}>
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Note (optional)" multiline rows={2} fullWidth />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" color="success" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingIncome ? 'Update' : 'Add Income'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}
