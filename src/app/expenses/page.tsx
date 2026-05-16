'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { ExpenseFormFull } from '@/components/ExpenseFormFull';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent, Chip,
  IconButton, Menu, MenuItem, Alert, Skeleton, Tabs, Tab,
  TextField, InputAdornment, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, Select, FormControl, InputLabel,
} from '@mui/material';
import {
  Add, MoreVert, Edit, Delete, TrendingDown, Search, FilterList, PushPin,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';

async function apiFetch(path: string, user: any, opts: RequestInit = {}) {
  const token = await getIdToken(user);
  return fetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

export default function ExpensesPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<'all' | 'fixed' | 'dynamic'>('all');
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<any>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ['expenses', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/expenses', user); return r.json(); },
    enabled: !!user,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['categories', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/categories', user); return r.json(); },
    enabled: !!user,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/accounts', user); return r.json(); },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/expenses', user, {
        method: 'POST',
        body: JSON.stringify({ ...data, date: data.date instanceof Date ? data.date.getTime() : data.date }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setFormOpen(false); setToast('Expense added!'); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch(`/api/expenses/${editingExpense?.id}`, user, {
        method: 'PUT',
        body: JSON.stringify({ ...data, date: data.date instanceof Date ? data.date.getTime() : data.date }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setFormOpen(false); setEditingExpense(null); setToast('Expense updated!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/expenses/${id}`, user, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['expenses'] }); setConfirmOpen(false); setToast('Expense deleted'); },
  });

  if (!user) return null;

  const filtered = expenses.filter((e: any) => {
    const matchNature = tab === 'all' || e.expenseNature === tab;
    const matchSearch = !search || (e.note || '').toLowerCase().includes(search.toLowerCase()) || (e.category || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = !categoryFilter || e.category === categoryFilter;
    return matchNature && matchSearch && matchCat;
  });

  const totalFixed = expenses.filter((e: any) => e.expenseNature === 'fixed').reduce((s: number, e: any) => s + e.amount, 0);
  const totalDynamic = expenses.filter((e: any) => e.expenseNature === 'dynamic').reduce((s: number, e: any) => s + e.amount, 0);
  const totalAll = expenses.reduce((s: number, e: any) => s + e.amount, 0);

  const handleSubmit = async (data: any) => {
    if (editingExpense) await updateMutation.mutateAsync(data);
    else await createMutation.mutateAsync(data);
  };

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>Expenses</Typography>
              <Typography variant="body2" color="text.secondary">Track fixed and variable spending</Typography>
            </Box>
            <Button variant="contained" color="error" startIcon={<Add />} onClick={() => { setEditingExpense(null); setFormOpen(true); }}>
              Add Expense
            </Button>
          </Box>

          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {[
              { label: 'Total Expenses', value: totalAll, color: '#ef4444', bg: '#fee2e2' },
              { label: 'Fixed', value: totalFixed, color: '#8b5cf6', bg: '#ede9fe', icon: <PushPin fontSize="small" /> },
              { label: 'Dynamic', value: totalDynamic, color: '#f59e0b', bg: '#fef3c7' },
            ].map(c => (
              <Grid item xs={12} sm={4} key={c.label}>
                <Card sx={{ borderTop: 4, borderTopColor: c.color, background: c.bg }}>
                  <CardContent>
                    <Typography variant="caption" color="text.secondary">{c.label}</Typography>
                    <Typography variant="h5" fontWeight={700} sx={{ color: c.color }}>
                      ₹{c.value.toLocaleString('en-IN')}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Filters */}
          <Card elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} sm={5}>
                  <TextField
                    size="small" fullWidth
                    placeholder="Search expenses..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    InputProps={{ startAdornment: <InputAdornment position="start"><Search fontSize="small" /></InputAdornment> }}
                  />
                </Grid>
                <Grid item xs={12} sm={4}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Category</InputLabel>
                    <Select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} label="Category">
                      <MenuItem value="">All Categories</MenuItem>
                      {categories.map((c: any) => <MenuItem key={c.id} value={c.name}>{c.icon} {c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Nature tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="All" value="all" />
            <Tab label="📌 Fixed" value="fixed" />
            <Tab label="🔄 Dynamic" value="dynamic" />
          </Tabs>

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1,2,3,4,5].map(i => <Skeleton key={i} variant="rounded" height={56} />)}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TrendingDown sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No expenses found</Typography>
              <Button variant="contained" color="error" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setFormOpen(true)}>
                Add First Expense
              </Button>
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><Typography variant="caption" fontWeight={600}>Date</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>Category</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>Type</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>Note</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption" fontWeight={600}>Amount</Typography></TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((expense: any) => (
                    <TableRow key={expense.id} hover>
                      <TableCell>
                        <Typography variant="caption">
                          {new Date(expense.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        {expense.category ? (
                          <Chip label={expense.category} size="small" variant="outlined" />
                        ) : <Typography variant="caption" color="text.disabled">—</Typography>}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={expense.expenseNature === 'fixed' ? '📌 Fixed' : '🔄 Dynamic'}
                          size="small"
                          sx={{
                            bgcolor: expense.expenseNature === 'fixed' ? '#ede9fe' : '#fef3c7',
                            color: expense.expenseNature === 'fixed' ? '#8b5cf6' : '#b45309',
                          }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 200, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {expense.note || '—'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2" fontWeight={700} color="error.main">
                          ₹{expense.amount.toLocaleString('en-IN')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <IconButton size="small" onClick={(e) => { setSelectedExpense(expense); setMenuAnchor(e.currentTarget); }}>
                          <MoreVert fontSize="small" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>
      </Box>

      <ExpenseFormFull
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingExpense(null); }}
        onSubmit={handleSubmit}
        accounts={accounts}
        categories={categories}
        editingExpense={editingExpense}
      />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditingExpense(selectedExpense); setFormOpen(true); setMenuAnchor(null); }}>
          <Edit sx={{ mr: 1 }} fontSize="small" /> Edit
        </MenuItem>
        <MenuItem onClick={() => { setConfirmOpen(true); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Expense"
        message="Delete this expense? This cannot be undone."
        onConfirm={() => selectedExpense && deleteMutation.mutate(selectedExpense.id)}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </ResponsiveLayout>
  );
}
