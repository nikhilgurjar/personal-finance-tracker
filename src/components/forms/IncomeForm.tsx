'use client';

import { Grid, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const INCOME_CATEGORIES = [
  'Salary',
  'Freelance',
  'Investment',
  'Business',
  'Rental',
  'Other',
];

export const IncomeForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Income"
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
                {INCOME_CATEGORIES.map((category) => (
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
              label="Source"
              name="source"
              placeholder="Income source"
            />
          </Grid>
        </>
      }
    />
  );
};