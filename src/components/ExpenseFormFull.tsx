'use client';

import { FormEvent, useEffect, useState } from 'react';
import {
  Alert,
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
  Typography,
  Box,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import { AutoAwesome } from '@mui/icons-material';
import { Account } from '@/lib/types';
import { authedJson } from '@/lib/apiClient';
import { useAuthContext } from '@/components/AuthProvider';

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
  const { user } = useAuthContext();
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestion, setSuggestion] = useState<any>(null);

  useEffect(() => {
    if (!open) return;

    setSuggestion(null);

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

  useEffect(() => {
    if (!open || editingExpense) return;
    if (!form.note.trim()) return;

    const delayDebounceFn = setTimeout(async () => {
      try {
        const result = await authedJson<any>(user, '/api/ai/categorize-expense', {
          method: 'POST',
          body: JSON.stringify({ note: form.note, amount: Number(form.amount || 0) }),
        });

        setSuggestion(result);
        setForm((current) => ({
          ...current,
          category: result.category || current.category,
          expenseNature: result.expenseNature || current.expenseNature,
        }));
      } catch (err) {
        console.warn('Background auto-categorization failed:', err);
      }
    }, 1200);

    return () => clearTimeout(delayDebounceFn);
  }, [form.note, form.amount, open, editingExpense, user]);

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

  const handleAiSuggest = async () => {
    setSuggesting(true);
    try {
      const result = await authedJson<any>(user, '/api/ai/categorize-expense', {
        method: 'POST',
        body: JSON.stringify({ note: form.note, amount: Number(form.amount || 0) }),
      });

      setSuggestion(result);
      setForm((current) => ({
        ...current,
        category: result.category || current.category,
        expenseNature: result.expenseNature || current.expenseNature,
        note: result.note || current.note,
      }));
    } finally {
      setSuggesting(false);
    }
  };

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
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
                {suggestion && suggestion.confidence && (
                  <Typography variant="caption" sx={{ color: 'primary.main', display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5, pl: 1 }}>
                    <AutoAwesome sx={{ fontSize: 12 }} />
                    AI Auto-categorized ({Math.round(suggestion.confidence * 100)}% confidence)
                  </Typography>
                )}
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
              <Button
                variant="outlined"
                onClick={handleAiSuggest}
                disabled={suggesting || (!form.note && !form.amount)}
              >
                {suggesting ? 'Suggesting...' : 'AI Suggest Category'}
              </Button>
              {suggestion && (
                <Alert severity="info" sx={{ mt: 1 }}>
                  {suggestion.reason || `Suggested ${suggestion.category} as ${suggestion.expenseNature}.`}
                </Alert>
              )}
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
