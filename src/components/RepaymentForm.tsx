'use client';

import { useState, useEffect } from 'react';
import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, TextField, MenuItem, Box, Alert, Typography
} from '@mui/material';
import { Loan } from '@/lib/types';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { useAuthContext } from '@/components/AuthProvider';

interface RepaymentFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  loan: Loan | null;
}

export function RepaymentForm({ open, onClose, onSubmit, loan }: RepaymentFormProps) {
  const { user } = useAuthContext();
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [accountId, setAccountId] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Fetch accounts to link repayment
  const { data: accounts = [] } = useAuthedQuery(user, ['accounts', user?.uid], '/api/accounts');

  // Reset form when loan changes or modal opens
  useEffect(() => {
    if (open && loan) {
      setAmount('');
      setDate(new Date().toISOString().split('T')[0]);
      setAccountId('');
      setNote('');
      setError('');
    }
  }, [open, loan]);

  if (!loan) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !accountId) {
      setError('Amount and Account are required');
      return;
    }

    const parsedAmount = parseFloat(amount);
    if (parsedAmount > loan.outstandingAmount) {
      setError('Repayment amount cannot exceed outstanding balance.');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await onSubmit({
        repayment: {
          amount: parsedAmount,
          currency: loan.currency || 'INR',
          date: new Date(date).getTime(),
          accountId,
          note,
        }
      });
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to record repayment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <form onSubmit={handleSubmit}>
        <DialogTitle>Record Repayment</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            
            <Typography variant="body2" color="text.secondary">
              Recording repayment for <strong>{loan.personName}</strong>
            </Typography>

            <TextField
              label="Amount"
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              fullWidth
              inputProps={{ max: loan.outstandingAmount, step: 'any' }}
              helperText={`Outstanding: ₹${loan.outstandingAmount.toLocaleString('en-IN')}`}
            />

            <TextField
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              fullWidth
              InputLabelProps={{ shrink: true }}
            />

            <TextField
              select
              label={loan.loanType === 'borrowed' ? 'Account Paid From' : 'Account Received To'}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              fullWidth
            >
              {accounts.map((acc: any) => (
                <MenuItem key={acc.id} value={acc.id}>
                  {acc.name} (₹{acc.currentBalance?.toLocaleString('en-IN')})
                </MenuItem>
              ))}
            </TextField>

            <TextField
              label="Note (Optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
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
