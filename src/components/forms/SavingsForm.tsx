'use client';

import { Grid, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const SAVINGS_CATEGORIES = [
  'Emergency Fund',
  'Retirement',
  'Investment',
  'House Down Payment',
  'Education',
  'Other',
];

export const SavingsForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Savings"
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
                {SAVINGS_CATEGORIES.map((category) => (
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
              label="Goal"
              name="goal"
              placeholder="Savings goal (optional)"
            />
          </Grid>
        </>
      }
    />
  );
};