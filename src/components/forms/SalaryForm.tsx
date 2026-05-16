'use client';

import { Grid, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';
import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

const SALARY_TYPES = [
  'Regular',
  'Bonus',
  'Commission',
  'Overtime',
  'Other',
];

export const SalaryForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Salary"
      hideFromAccount
      additionalFields={
        <>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Type</InputLabel>
              <Select
                defaultValue=""
                name="salaryType"
                required
              >
                {SALARY_TYPES.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Company"
              name="company"
              placeholder="Company name"
              required
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Pay Period"
              name="payPeriod"
              placeholder="e.g., Sept 1-15, 2025"
            />
          </Grid>
        </>
      }
    />
  );
};