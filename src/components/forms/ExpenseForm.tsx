'use client';

import { Grid, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const EXPENSE_CATEGORIES = [
  'Food & Dining',
  'Shopping',
  'Transportation',
  'Bills & Utilities',
  'Entertainment',
  'Health & Fitness',
  'Travel',
  'Other',
];

export const ExpenseForm: React.FC<BaseTransactionFormProps> = ({ accounts, ...props }) => {
  // Filter only expense accounts for the "to" account selection
  const expenseAccounts = accounts.filter(account => account.type === 'expense');

  return (
    <BaseTransactionForm
      {...props}
      accounts={expenseAccounts}
      title="New Expense"
      hideFromAccount
      additionalFields={
        <>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                defaultValue=""
                name="category"
                required
              >
                {EXPENSE_CATEGORIES.map((category) => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Tags"
              name="tags"
              placeholder="Enter tags (comma separated)"
            />
          </Grid>
        </>
      }
    />
  );
};