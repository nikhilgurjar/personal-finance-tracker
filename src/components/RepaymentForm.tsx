'use client';

import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material';
import { Loan } from '@/lib/types';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { useAuthContext } from '@/components/AuthProvider';

interface RepaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loan?: Loan | null;
  personName?: string;
  loanType?: Loan['loanType'];
  outstandingAmount?: number;
  currency?: string;
}

export function RepaymentForm({
  open,
  onClose,
  onSubmit,
  loan,
  personName,
  loanType,
  outstandingAmount,
  currency,
}: RepaymentFormProps) {
  const { user } = useAuthContext();
  const effectivePersonName = personName || loan?.personName || '';
  const effectiveLoanType = loanType || loan?.loanType;
  const effectiveOutstanding = outstandingAmount ?? loan?.outstandingAmount ?? 0;
  const effectiveCurrency = currency || loan?.currency || 'INR';

  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { data: accounts = [] } = useAuthedQuery(user, ['accounts', user?.uid], '/api/accounts');

  useEffect(() => {
    if (open && effectivePersonName) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setAccountId('');
      setNote('');
      setError('');
    }
  }, [open, effectivePersonName]);

  if (!effectivePersonName || !effectiveLoanType) return null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!amount || !accountId) {
      setError('Amount and account are required.');
      return;
    }

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError('Enter a valid repayment amount.');
      return;
    }

    if (parsedAmount > effectiveOutstanding) {
      setError('Repayment amount cannot exceed outstanding balance for this person.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({
        repayment: {
          personName: effectivePersonName,
          loanType: effectiveLoanType,
          amount: parsedAmount,
          currency: effectiveCurrency,
          date: new Date(date).getTime(),
          accountId,
          note,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record repayment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Person Repayment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}

            <Box>
              <Typography variant="body2" color="text.secondary">
                Recording repayment against <strong>{effectivePersonName}</strong>
              </Typography>
              <Typography variant="caption" color="text.secondary">
                This will be allocated across this person's active {effectiveLoanType} loans, oldest first.
              </Typography>
            </Box>

            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              required
              fullWidth
              inputProps={{ max: effectiveOutstanding, step: 'any' }}
              helperText={`Outstanding for person: INR ${effectiveOutstanding.toLocaleString('en-IN')}`}
            />

            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label={effectiveLoanType === 'lent' ? 'Account Received To' : 'Account Paid From'}
              value={accountId}
              onChange={(event) => setAccountId(event.target.value)}
              required
              fullWidth
            >
              {accounts.map((account: any) => (
                <MenuItem key={account.id} value={account.id}>
                  {account.name} (INR {account.currentBalance?.toLocaleString('en-IN') || 0})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Note (Optional)"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              multiline
              rows={2}
              fullWidth
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>
            {loading ? 'Saving...' : 'Save Repayment'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
