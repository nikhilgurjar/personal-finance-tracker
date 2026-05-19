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
  'Groceries',
  'Education',
  'EMI / Loan Payment',
  'Other',
];

export const ExpenseForm: React.FC<BaseTransactionFormProps> = ({ accounts, ...props }) => {
  // Debit FROM: any non-expense account (bank, savings, wallet, income)
  const sourceAccounts = accounts.filter(a => a.type !== 'expense');
  // Categorize TO: expense-type accounts (category buckets)
  const categoryAccounts = accounts.filter(a => a.type === 'expense');

  return (
    <BaseTransactionForm
      {...props}
      accounts={accounts}
      fromAccounts={sourceAccounts}
      toAccounts={categoryAccounts.length > 0 ? categoryAccounts : accounts}
      title="New Expense"
      additionalFields={
        <>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                defaultValue=""
                name="category"
                label="Category"
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