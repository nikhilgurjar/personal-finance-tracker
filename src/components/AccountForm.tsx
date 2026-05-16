'use client';

import { useEffect } from 'react';
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from '@mui/material';
import { Account, AccountType } from '@/lib/types';

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'income', label: 'Income' },
  { value: 'expense', label: 'Expense' },
  { value: 'savings', label: 'Savings' },
];

const incomeSubtypes = [
  { value: 'salary', label: 'Salary' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'business', label: 'Business' },
  { value: 'investment', label: 'Investment' },
  { value: 'rental', label: 'Rental' },
  { value: 'other', label: 'Other' },
];

const expenseSubtypes = [
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'debit_card', label: 'Debit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'utility', label: 'Utility' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'tax', label: 'Tax' },
  { value: 'subscription', label: 'Subscription' },
  { value: 'category', label: 'Category' },
];

const savingsSubtypes = [
  { value: 'savings_account', label: 'Savings Account' },
  { value: 'checking_account', label: 'Checking Account' },
  { value: 'stock', label: 'Stock' },
  { value: 'equity_mf', label: 'Equity Mutual Fund' },
  { value: 'etf', label: 'ETF' },
  { value: 'debt_mf', label: 'Debt Mutual Fund' },
  { value: 'fd', label: 'Fixed Deposit' },
  { value: 'commodity', label: 'Commodity' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'bank', label: 'Bank' },
];

const currencies = [
  { value: 'INR', label: 'Indian Rupee (₹)' },
  { value: 'USD', label: 'US Dollar ($)' },
  { value: 'EUR', label: 'Euro (€)' },
  { value: 'GBP', label: 'British Pound (£)' },
];

const AccountSchema = z.object({
  type: z.enum(['income', 'expense', 'savings']),
  subtype: z.string(),
  name: z.string().min(1, 'Name is required'),
  institution: z.string().optional(),
  currency: z.string().min(1, 'Currency is required'),
  currentBalance: z.number().optional(),
  creditLimit: z.number().optional(),
  interestRate: z.number().optional(),
  dueDate: z.number().optional(),
  minimumPayment: z.number().optional(),
  billingCycleDay: z.number().min(1).max(31).optional(),
});

type AccountFormData = z.infer<typeof AccountSchema>;

interface AccountFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: AccountFormData) => Promise<void>;
  editingAccount?: Account;
}

export function AccountForm({
  open,
  onClose,
  onSubmit,
  editingAccount,
}: AccountFormProps) {
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(AccountSchema),
    defaultValues: editingAccount ? {
      type: editingAccount.type,
      subtype: editingAccount.subtype || '',
      name: editingAccount.name,
      institution: editingAccount.institution || '',
      currency: editingAccount.currency,
      currentBalance: editingAccount.currentBalance,
      creditLimit: editingAccount.creditLimit,
      interestRate: editingAccount.interestRate,
      dueDate: editingAccount.dueDate,
      minimumPayment: editingAccount.minimumPayment,
      billingCycleDay: editingAccount.billingCycleDay,
    } : {
      type: 'expense',
      subtype: '',
      name: '',
      institution: '',
      currency: 'INR',
    },
  });

  const watchedType = watch('type');
  const watchedSubtype = watch('subtype');

  const getSubtypeOptions = (type: AccountType) => {
    switch (type) {
      case 'income':
        return incomeSubtypes;
      case 'expense':
        return expenseSubtypes;
      case 'savings':
        return savingsSubtypes;
      default:
        return [];
    }
  };

  useEffect(() => {
    if (editingAccount) {
      reset({
        type: editingAccount.type,
        subtype: editingAccount.subtype || '',
        name: editingAccount.name,
        institution: editingAccount.institution || '',
        currency: editingAccount.currency,
        currentBalance: editingAccount.currentBalance,
        creditLimit: editingAccount.creditLimit,
        interestRate: editingAccount.interestRate,
        dueDate: editingAccount.dueDate,
        minimumPayment: editingAccount.minimumPayment,
        billingCycleDay: editingAccount.billingCycleDay,
      });
    }
  }, [editingAccount, reset]);

  const handleFormSubmit = async (data: AccountFormData) => {
    try {
      await onSubmit(data);
      reset();
      onClose();
    } catch (error) {
      console.error('Error submitting account:', error);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {editingAccount ? 'Edit Account' : 'Add Account'}
      </DialogTitle>
      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.type}>
                    <InputLabel>Type</InputLabel>
                    <Select {...field} label="Type">
                      {accountTypes.map((type) => (
                        <MenuItem key={type.value} value={type.value}>
                          {type.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="subtype"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.subtype}>
                    <InputLabel>Subtype</InputLabel>
                    <Select {...field} label="Subtype">
                      {getSubtypeOptions(watchedType).map((subtype) => (
                        <MenuItem key={subtype.value} value={subtype.value}>
                          {subtype.label}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Name"
                    fullWidth
                    error={!!errors.name}
                    helperText={errors.name?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="institution"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Institution"
                    fullWidth
                    error={!!errors.institution}
                    helperText={errors.institution?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="currency"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    {...field}
                    options={currencies}
                    getOptionLabel={(option) => 
                      typeof option === 'string' 
                        ? option
                        : option.label
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Currency"
                        error={!!errors.currency}
                        helperText={errors.currency?.message}
                      />
                    )}
                    onChange={(_, value) => field.onChange(value?.value || '')}
                    value={currencies.find(c => c.value === field.value) || null}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="currentBalance"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <TextField
                    {...field}
                    type="number"
                    label="Current Balance"
                    fullWidth
                    value={value || ''}
                    onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                    error={!!errors.currentBalance}
                    helperText={errors.currentBalance?.message}
                  />
                )}
              />
            </Grid>

            {/* Conditional fields based on account subtype */}
            {watchedType === 'expense' && watchedSubtype === 'credit_card' && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="creditLimit"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Credit Limit"
                        fullWidth
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        error={!!errors.creditLimit}
                        helperText={errors.creditLimit?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="interestRate"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Interest Rate (%)"
                        fullWidth
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        error={!!errors.interestRate}
                        helperText={errors.interestRate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="billingCycleDay"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Billing Cycle Day"
                        fullWidth
                        inputProps={{ min: 1, max: 31 }}
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        error={!!errors.billingCycleDay}
                        helperText={errors.billingCycleDay?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="minimumPayment"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Minimum Payment"
                        fullWidth
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        error={!!errors.minimumPayment}
                        helperText={errors.minimumPayment?.message}
                      />
                    )}
                  />
                </Grid>
              </>
            )}

            {watchedType === 'expense' && ['loan', 'mortgage'].includes(watchedSubtype) && (
              <>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="interestRate"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Interest Rate (%)"
                        fullWidth
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        error={!!errors.interestRate}
                        helperText={errors.interestRate?.message}
                      />
                    )}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Controller
                    name="minimumPayment"
                    control={control}
                    render={({ field: { value, onChange, ...field } }) => (
                      <TextField
                        {...field}
                        type="number"
                        label="Monthly Payment"
                        fullWidth
                        value={value || ''}
                        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                        error={!!errors.minimumPayment}
                        helperText={errors.minimumPayment?.message}
                      />
                    )}
                  />
                </Grid>
              </>
            )}

            {watchedType === 'savings' && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="interestRate"
                  control={control}
                  render={({ field: { value, onChange, ...field } }) => (
                    <TextField
                      {...field}
                      type="number"
                      label="Interest Rate (%)"
                      fullWidth
                      value={value || ''}
                      onChange={(e) => onChange(e.target.value ? Number(e.target.value) : undefined)}
                      error={!!errors.interestRate}
                      helperText={errors.interestRate?.message}
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            type="submit"
            variant="contained"
            color="primary"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}