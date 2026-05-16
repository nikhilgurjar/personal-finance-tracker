'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from '@mui/material';
import { Account } from '@/lib/types';

interface ExpenseFormFullProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => Promise<void>;
  accounts: Account[];
  categories: Array<{ id: string; name: string; icon?: string }>;
  editingExpense?: any;
}

const defaultForm = {
  amount: '',
  date: new Date().toISOString().slice(0, 10),
  currency: 'INR',
  category: '',
  expenseNature: 'dynamic',
  fromAccountId: '',
  note: '',
  tags: '',
};

export function ExpenseFormFull({
  open,
  onClose,
  onSubmit,
  accounts,
  categories,
  editingExpense,
}: ExpenseFormFullProps) {
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingExpense) {
      setForm({
        amount: String(editingExpense.amount || ''),
        date: editingExpense.date
          ? new Date(editingExpense.date).toISOString().slice(0, 10)
          : new Date().toISOString().slice(0, 10),
        currency: editingExpense.currency || 'INR',
        category: editingExpense.category || '',
        expenseNature: editingExpense.expenseNature || 'dynamic',
        fromAccountId: editingExpense.fromAccountId || '',
        note: editingExpense.note || '',
        tags: (editingExpense.tags || []).join(', '),
      });
      return;
    }

    setForm(defaultForm);
  }, [editingExpense, open]);

  const updateField = (field: string, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    try {
      await onSubmit({
        ...form,
        amount: Number(form.amount),
        date: new Date(form.date),
        tags: form.tags.split(',').map(tag => tag.trim()).filter(Boolean),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{editingExpense ? 'Edit Expense' : 'Add Expense'}</DialogTitle>
      <form onSubmit={handleSubmit}>
        <DialogContent>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Amount"
                type="number"
                value={form.amount}
                onChange={(event) => updateField('amount', event.target.value)}
                fullWidth
                required
                inputProps={{ min: 0, step: '0.01' }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                label="Date"
                type="date"
                value={form.date}
                onChange={(event) => updateField('date', event.target.value)}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Nature</InputLabel>
                <Select
                  label="Nature"
                  value={form.expenseNature}
                  onChange={(event) => updateField('expenseNature', event.target.value)}
                >
                  <MenuItem value="fixed">Fixed</MenuItem>
                  <MenuItem value="dynamic">Dynamic</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Category</InputLabel>
                <Select
                  label="Category"
                  value={form.category}
                  onChange={(event) => updateField('category', event.target.value)}
                >
                  {categories.map((category) => (
                    <MenuItem key={category.id} value={category.name}>
                      {category.icon ? `${category.icon} ` : ''}{category.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Paid From</InputLabel>
                <Select
                  label="Paid From"
                  value={form.fromAccountId}
                  onChange={(event) => updateField('fromAccountId', event.target.value)}
                >
                  {accounts.map((account) => (
                    <MenuItem key={account.id} value={account.id}>
                      {account.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Note"
                value={form.note}
                onChange={(event) => updateField('note', event.target.value)}
                fullWidth
                multiline
                minRows={2}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Tags"
                value={form.tags}
                onChange={(event) => updateField('tags', event.target.value)}
                fullWidth
                placeholder="comma, separated, tags"
              />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {editingExpense ? 'Save Changes' : 'Add Expense'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
