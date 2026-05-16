'use client';

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog, DialogTitle, DialogContent, DialogActions, Button,
  TextField, Grid, FormControl, InputLabel, Select, MenuItem,
  Box, Typography, Divider, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { Handshake, TrendingDown, Receipt } from '@mui/icons-material';
import { LoanFormData, LoanType, Account } from '@/lib/types';

const LoanSchema = z.object({
  loanType: z.enum(['lent', 'borrowed', 'payable']),
  personName: z.string().min(1, 'Person/entity name is required'),
  principalAmount: z.coerce.number().positive('Amount must be positive'),
  currency: z.string().default('INR'),
  startDate: z.date(),
  dueDate: z.date().optional(),
  interestRate: z.coerce.number().min(0).optional(),
  note: z.string().optional(),
  fromAccountId: z.string().optional(),
  toAccountId: z.string().optional(),
});

type LoanSchema = z.infer<typeof LoanSchema>;

const LOAN_TYPE_CONFIG = {
  lent: {
    label: 'Money I Lent',
    description: 'You gave money to someone — they owe you',
    color: '#10b981',
    icon: <TrendingDown fontSize="small" />,
  },
  borrowed: {
    label: 'Money I Borrowed',
    description: 'Someone gave you money — you owe them',
    color: '#ef4444',
    icon: <Handshake fontSize="small" />,
  },
  payable: {
    label: 'Money I Owe',
    description: 'Outstanding dues you need to pay',
    color: '#f97316',
    icon: <Receipt fontSize="small" />,
  },
};

interface LoanFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: LoanFormData) => Promise<void>;
  accounts: Account[];
  editingLoan?: any;
}

export function LoanForm({ open, onClose, onSubmit, accounts, editingLoan }: LoanFormProps) {
  const { control, handleSubmit, reset, watch, formState: { errors, isSubmitting } } = useForm<LoanSchema>({
    resolver: zodResolver(LoanSchema),
    defaultValues: {
      loanType: 'lent',
      personName: '',
      principalAmount: 0,
      currency: 'INR',
      startDate: new Date(),
      note: '',
    },
  });

  const watchedType = watch('loanType');

  useEffect(() => {
    if (editingLoan) {
      reset({
        loanType: editingLoan.loanType,
        personName: editingLoan.personName,
        principalAmount: editingLoan.principalAmount,
        currency: editingLoan.currency || 'INR',
        startDate: new Date(editingLoan.startDate),
        dueDate: editingLoan.dueDate ? new Date(editingLoan.dueDate) : undefined,
        interestRate: editingLoan.interestRate,
        note: editingLoan.note || '',
        fromAccountId: editingLoan.fromAccountId || '',
        toAccountId: editingLoan.toAccountId || '',
      });
    } else {
      reset({ loanType: 'lent', personName: '', principalAmount: 0, currency: 'INR', startDate: new Date() });
    }
  }, [editingLoan, open, reset]);

  const handleFormSubmit = async (data: LoanSchema) => {
    try {
      await onSubmit(data as LoanFormData);
      reset();
      onClose();
    } catch (err) {
      console.error('Error submitting loan:', err);
    }
  };

  const config = LOAN_TYPE_CONFIG[watchedType || 'lent'];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ pb: 1 }}>
          {editingLoan ? 'Edit Loan' : 'Add Loan / Due'}
        </DialogTitle>
        <form onSubmit={handleSubmit(handleFormSubmit)}>
          <DialogContent>
            <Grid container spacing={2}>
              {/* Loan Type */}
              <Grid item xs={12}>
                <Controller
                  name="loanType"
                  control={control}
                  render={({ field }) => (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
                        Loan Type
                      </Typography>
                      <ToggleButtonGroup
                        value={field.value}
                        exclusive
                        onChange={(_, val) => val && field.onChange(val)}
                        fullWidth
                        size="small"
                      >
                        {Object.entries(LOAN_TYPE_CONFIG).map(([key, cfg]) => (
                          <ToggleButton
                            key={key}
                            value={key}
                            sx={{
                              flexDirection: 'column',
                              py: 1.5,
                              gap: 0.5,
                              '&.Mui-selected': {
                                bgcolor: `${cfg.color}15`,
                                borderColor: cfg.color,
                                color: cfg.color,
                              },
                            }}
                          >
                            {cfg.icon}
                            <Typography variant="caption" fontWeight={600}>{cfg.label}</Typography>
                          </ToggleButton>
                        ))}
                      </ToggleButtonGroup>
                      {config && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                          {config.description}
                        </Typography>
                      )}
                    </Box>
                  )}
                />
              </Grid>

              <Grid item xs={12}>
                <Divider />
              </Grid>

              {/* Person Name */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="personName"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label={watchedType === 'lent' ? 'Lent To' : watchedType === 'borrowed' ? 'Borrowed From' : 'Payable To'}
                      fullWidth
                      error={!!errors.personName}
                      helperText={errors.personName?.message}
                      placeholder="Person or company name"
                    />
                  )}
                />
              </Grid>

              {/* Amount */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="principalAmount"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Amount (₹)"
                      type="number"
                      fullWidth
                      error={!!errors.principalAmount}
                      helperText={errors.principalAmount?.message}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  )}
                />
              </Grid>

              {/* Start Date */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="startDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Date"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={val => field.onChange(val?.toDate())}
                      slotProps={{ textField: { fullWidth: true, error: !!errors.startDate } }}
                    />
                  )}
                />
              </Grid>

              {/* Due Date */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="dueDate"
                  control={control}
                  render={({ field }) => (
                    <DatePicker
                      label="Due Date (optional)"
                      value={field.value ? dayjs(field.value) : null}
                      onChange={val => field.onChange(val?.toDate())}
                      slotProps={{ textField: { fullWidth: true } }}
                    />
                  )}
                />
              </Grid>

              {/* Interest Rate */}
              <Grid item xs={12} sm={6}>
                <Controller
                  name="interestRate"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      label="Interest Rate % p.a. (optional)"
                      type="number"
                      fullWidth
                      value={value ?? ''}
                      onChange={e => onChange(e.target.value ? Number(e.target.value) : undefined)}
                      inputProps={{ min: 0, step: 0.01 }}
                    />
                  )}
                />
              </Grid>

              {/* Linked Account */}
              {(watchedType === 'lent' || watchedType === 'payable') && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="fromAccountId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>From Account</InputLabel>
                        <Select {...field} label="From Account" value={field.value || ''}>
                          <MenuItem value=""><em>Not specified</em></MenuItem>
                          {accounts.map(acc => (
                            <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}

              {watchedType === 'borrowed' && (
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="toAccountId"
                    control={control}
                    render={({ field }) => (
                      <FormControl fullWidth>
                        <InputLabel>To Account (received into)</InputLabel>
                        <Select {...field} label="To Account (received into)" value={field.value || ''}>
                          <MenuItem value=""><em>Not specified</em></MenuItem>
                          {accounts.map(acc => (
                            <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    )}
                  />
                </Grid>
              )}

              {/* Note */}
              <Grid item xs={12}>
                <Controller
                  name="note"
                  control={control}
                  render={({ field }) => (
                    <TextField {...field} label="Note (optional)" multiline rows={2} fullWidth placeholder="What was this for?" />
                  )}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
            <Button onClick={onClose} disabled={isSubmitting}>Cancel</Button>
            <Button type="submit" variant="contained" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : editingLoan ? 'Update' : 'Add Loan'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </LocalizationProvider>
  );
}
