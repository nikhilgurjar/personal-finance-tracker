'use client';

import { Grid, TextField } from '@mui/material';
import { BaseTransactionForm, BaseTransactionFormProps } from './BaseTransactionForm';

export const TransferForm: React.FC<BaseTransactionFormProps> = (props) => {
  return (
    <BaseTransactionForm
      {...props}
      title="New Transfer"
      additionalFields={
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Transfer Description"
            name="description"
            placeholder="Transfer description"
          />
        </Grid>
      }
    />
  );
};