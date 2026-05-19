'use client';

import { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Grid,
  Paper,
  Typography,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Alert,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs, { Dayjs } from 'dayjs';
import { Account } from '@/lib/types';

interface FormFields {
  amount: string;
  date: Dayjs | null;
  note?: string;
  fromAccountId?: string;
  toAccountId?: string;
  [key: string]: any;
}

type InitialFormFields = Partial<Omit<FormFields, 'date'> & {
  date: Dayjs | Date | null;
}>;

export interface BaseTransactionFormProps {
  accounts: Account[];
  onSubmit: (formData: any) => void;
  onClose?: () => void;
  isLoading?: boolean;
  error?: Error | null;
  editingTransaction?: any;
  initialValues?: InitialFormFields;
  /** Override accounts shown in the "From Account" selector */
  fromAccounts?: Account[];
  /** Override accounts shown in the "To Account" selector */
  toAccounts?: Account[];
}

export const BaseTransactionForm: React.FC<BaseTransactionFormProps & {
  title: string;
  additionalFields?: React.ReactNode;
  initialValues?: InitialFormFields;
  hideFromAccount?: boolean;
  hideToAccount?: boolean;
  fromAccounts?: Account[];
  toAccounts?: Account[];
}> = ({
  title,
  accounts,
  fromAccounts,
  toAccounts,
  onSubmit,
  isLoading,
  error,
  additionalFields,
  initialValues = {},
  hideFromAccount = false,
  hideToAccount = false,
}) => {
  const [formData, setFormData] = useState<FormFields>({
    ...initialValues,
    amount: initialValues.amount || '',
    date: initialValues.date ? dayjs(initialValues.date) : dayjs(),
    note: initialValues.note || '',
    fromAccountId: initialValues.fromAccountId || '',
    toAccountId: initialValues.toAccountId || '',
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.amount) {
      newErrors.amount = 'Amount is required';
    } else if (isNaN(Number(formData.amount)) || Number(formData.amount) <= 0) {
      newErrors.amount = 'Amount must be a positive number';
    }

    if (!formData.date) {
      newErrors.date = 'Date is required';
    }

    if (!hideFromAccount && !formData.fromAccountId) {
      newErrors.fromAccountId = 'From Account is required';
    }
    if (!hideToAccount && !formData.toAccountId) {
      newErrors.toAccountId = 'To Account is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const tagsArray = formData.tags
        ? formData.tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
        : [];

      const submissionData = {
        ...formData,
        date: formData.date?.toDate(),
        tags: tagsArray,
        currency: 'INR',
      };
      onSubmit(submissionData);
    }
  };

  const handleChange = (field: string) => (event: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const resolvedFromAccounts = fromAccounts ?? accounts;
  const resolvedToAccounts = toAccounts ?? accounts;

  return (
    <Paper elevation={0} sx={{ p: 3, mb: 3, backgroundColor: 'transparent' }}>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <form onSubmit={handleSubmit}>
        <Grid container spacing={3}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Amount"
              type="number"
              value={formData.amount}
              onChange={handleChange('amount')}
              required
              inputProps={{ step: '0.01' }}
              error={!!errors.amount}
              helperText={errors.amount}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DatePicker
                label="Date"
                value={formData.date}
                onChange={(newValue) =>
                  setFormData((prev) => ({ ...prev, date: newValue }))
                }
                slotProps={{
                  textField: {
                    fullWidth: true,
                    error: !!errors.date,
                    helperText: errors.date,
                  }
                }}
              />
            </LocalizationProvider>
          </Grid>
          {!hideFromAccount && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.fromAccountId}>
                <InputLabel>From Account</InputLabel>
                <Select
                  value={formData.fromAccountId}
                  onChange={handleChange('fromAccountId')}
                  required
                  error={!!errors.fromAccountId}
                  label="From Account"
                >
                  {resolvedFromAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.fromAccountId && (
                  <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                    {errors.fromAccountId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          )}
          {!hideToAccount && (
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth error={!!errors.toAccountId}>
                <InputLabel>To Account</InputLabel>
                <Select
                  value={formData.toAccountId}
                  onChange={handleChange('toAccountId')}
                  required
                  error={!!errors.toAccountId}
                  label="To Account"
                >
                  {resolvedToAccounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
                {errors.toAccountId && (
                  <Typography color="error" variant="caption" sx={{ mt: 1 }}>
                    {errors.toAccountId}
                  </Typography>
                )}
              </FormControl>
            </Grid>
          )}
          {additionalFields}
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Note"
              multiline
              rows={2}
              value={formData.note}
              onChange={handleChange('note')}
            />
          </Grid>
          {error && (
            <Grid item xs={12}>
              <Alert severity="error">{error.message}</Alert>
            </Grid>
          )}
          <Grid item xs={12}>
            <Button
              type="submit"
              variant="contained"
              color="primary"
              disabled={isLoading}
              fullWidth
            >
              {isLoading ? 'Saving...' : 'Save'}
            </Button>
          </Grid>
        </Grid>
      </form>
    </Paper>
  );
};
