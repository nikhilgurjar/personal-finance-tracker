'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { IncomeFormFull } from '@/components/IncomeFormFull';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent, Chip,
  IconButton, Menu, MenuItem, Alert, Skeleton, Tabs, Tab,
  TextField, InputAdornment, Snackbar, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Paper, FormControl, InputLabel, Select,
  useTheme, useMediaQuery, Fab,
} from '@mui/material';
import { Add, MoreVert, Edit, Delete, TrendingUp, Search } from '@mui/icons-material';
import { useRouter, useSearchParams } from 'next/navigation';

async function apiFetch(path: string, user: any, opts: RequestInit = {}) {
  const token = await getIdToken(user);
  return fetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

const SOURCE_LABELS: Record<string, string> = {
  salary: '💼 Salary',
  freelance: '💻 Freelance',
  from_person: '🤝 From Person',
  business: '🏪 Business',
  rental: '🏠 Rental',
  investment: '📈 Investment',
  other: '📦 Other',
};

const SOURCE_LABELS_SHORT: Record<string, string> = {
  salary: '💼 Sal',
  freelance: '💻 Free',
  from_person: '🤝 Pers',
  business: '🏪 Biz',
  rental: '🏠 Rent',
  investment: '📈 Inv',
  other: '📦 Oth',
};

const SOURCE_COLORS: Record<string, { bg: string; color: string }> = {
  salary: { bg: '#dbeafe', color: '#1d4ed8' },
  freelance: { bg: '#dcfce7', color: '#166534' },
  from_person: { bg: '#fef3c7', color: '#92400e' },
  business: { bg: '#ede9fe', color: '#5b21b6' },
  rental: { bg: '#cffafe', color: '#164e63' },
  investment: { bg: '#d1fae5', color: '#065f46' },
  other: { bg: '#f1f5f9', color: '#475569' },
};

export default function IncomesPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

  const [tab, setTab] = useState('all');
  const [search, setSearch] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editingIncome, setEditingIncome] = useState<any>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedIncome, setSelectedIncome] = useState<any>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const prefill = searchParams.get('prefill');
  useEffect(() => {
    if (prefill) {
      try {
        const parsed = JSON.parse(decodeURIComponent(prefill));
        setEditingIncome(parsed);
        setFormOpen(true);
        router.replace('/incomes');
      } catch (err) {
        console.error('Failed to parse prefill:', err);
      }
    }
  }, [prefill, router]);

  const { data: incomes = [], isLoading } = useQuery({
    queryKey: ['incomes', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/incomes', user); return r.json(); },
    enabled: !!user,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/accounts', user); return r.json(); },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch('/api/incomes', user, {
        method: 'POST',
        body: JSON.stringify({ ...data, date: data.date instanceof Date ? data.date.getTime() : data.date }),
      });
      if (!res.ok) throw new Error('Failed');
      return res.json();
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incomes'] }); setFormOpen(false); setToast('Income added!'); },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await apiFetch(`/api/incomes/${editingIncome?.id}`, user, {
        method: 'PUT',
        body: JSON.stringify({ ...data, date: data.date instanceof Date ? data.date.getTime() : data.date }),
      });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incomes'] });
      setFormOpen(false);
      setEditingIncome(null);
      setToast('Income updated!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/incomes/${id}`, user, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['incomes'] }); setConfirmOpen(false); setToast('Income deleted'); },
  });

  if (!user) return null;

  const filtered = incomes.filter((i: any) => {
    const matchTab = tab === 'all' || i.sourceType === tab;
    const matchSearch = !search ||
      (i.sourceName || '').toLowerCase().includes(search.toLowerCase()) ||
      (i.note || '').toLowerCase().includes(search.toLowerCase());
    return matchTab && matchSearch;
  });

  const totalBySource: Record<string, number> = {};
  incomes.forEach((i: any) => {
    totalBySource[i.sourceType] = (totalBySource[i.sourceType] || 0) + i.amount;
  });
  const grandTotal = incomes.reduce((s: number, i: any) => s + i.amount, 0);

  const handleSubmit = async (data: any) => {
    if (editingIncome) await updateMutation.mutateAsync(data);
    else await createMutation.mutateAsync(data);
  };

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={800}>Incomes</Typography>
              <Typography variant="body2" color="text.secondary">Track all your income sources</Typography>
            </Box>
            {!isMobile && (
              <Button variant="contained" color="success" startIcon={<Add />} onClick={() => { setEditingIncome(null); setFormOpen(true); }}>
                Add Income
              </Button>
            )}
          </Box>

          {/* Total + breakdown cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} sm={4}>
              <Card sx={{ borderTop: 4, borderTopColor: '#10b981', background: '#d1fae5' }}>
                <CardContent>
                  <Typography variant="caption" color="text.secondary">Total Income</Typography>
                  <Typography variant="h5" fontWeight={700} color="success.dark">
                    ₹{grandTotal.toLocaleString('en-IN')}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            {Object.entries(totalBySource).slice(0, 2).map(([src, amount]) => {
              const cfg = SOURCE_COLORS[src] || SOURCE_COLORS.other;
              return (
                <Grid item xs={6} sm={4} key={src}>
                  <Card sx={{ borderTop: 4, borderTopColor: cfg.color, background: cfg.bg }}>
                    <CardContent>
                      <Typography variant="caption" color="text.secondary">{SOURCE_LABELS[src] || src}</Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: cfg.color }}>
                        ₹{(amount as number).toLocaleString('en-IN')}
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          {/* Search */}
          <Card elevation={0} sx={{ mb: 3, border: 1, borderColor: 'divider', borderRadius: 2 }}>
            <CardContent>
              <TextField
                size="small" fullWidth
                placeholder="Search by name or note..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                InputProps={{ startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} fontSize="small" /> }}
              />
            </CardContent>
          </Card>

          {/* Source type tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
            <Tab label="All" value="all" />
            {Object.entries(SOURCE_LABELS).map(([val, label]) => (
              <Tab key={val} label={isMobile ? (SOURCE_LABELS_SHORT[val] || label) : label} value={val} />
            ))}
          </Tabs>

          {isLoading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {[1, 2, 3, 4].map(i => <Skeleton key={i} variant="rounded" height={56} />)}
            </Box>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <TrendingUp sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No incomes found</Typography>
              <Button variant="contained" color="success" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setFormOpen(true)}>
                Add First Income
              </Button>
            </Box>
          ) : isMobile ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {filtered.map((income: any) => {
                const cfg = SOURCE_COLORS[income.sourceType] || SOURCE_COLORS.other;
                return (
                  <Card key={income.id} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                        <Box>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {income.sourceName || 'Unknown'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(income.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          <Typography variant="subtitle1" fontWeight={700} color="success.dark" sx={{ mr: 1 }}>
                            +₹{income.amount.toLocaleString('en-IN')}
                          </Typography>
                          <IconButton size="small" onClick={(e) => { setSelectedIncome(income); setMenuAnchor(e.currentTarget); }}>
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </Box>
                      </Box>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Chip
                          label={SOURCE_LABELS[income.sourceType] || income.sourceType}
                          size="small"
                          sx={{
                            bgcolor: cfg.bg,
                            color: cfg.color,
                            fontSize: '0.7rem',
                            height: 20
                          }}
                        />
                        <Typography variant="caption" color="text.secondary" sx={{ maxWidth: '60%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {income.note || '—'}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                );
              })}
            </Box>
          ) : (
            <TableContainer component={Paper} elevation={0} sx={{ border: 1, borderColor: 'divider', borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'grey.50' }}>
                    <TableCell><Typography variant="caption" fontWeight={600}>Date</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>Source</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>From</Typography></TableCell>
                    <TableCell><Typography variant="caption" fontWeight={600}>Note</Typography></TableCell>
                    <TableCell align="right"><Typography variant="caption" fontWeight={600}>Amount</Typography></TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {filtered.map((income: any) => {
                    const cfg = SOURCE_COLORS[income.sourceType] || SOURCE_COLORS.other;
                    return (
                      <TableRow key={income.id} hover>
                        <TableCell>
                          <Typography variant="caption">
                            {new Date(income.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={SOURCE_LABELS[income.sourceType] || income.sourceType}
                            size="small"
                            sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 500 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{income.sourceName || '—'}</Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="caption" color="text.secondary" sx={{ maxWidth: 180, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {income.note || '—'}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700} color="success.dark">
                            +₹{income.amount.toLocaleString('en-IN')}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <IconButton size="small" onClick={(e) => { setSelectedIncome(income); setMenuAnchor(e.currentTarget); }}>
                            <MoreVert fontSize="small" />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Container>
      </Box>

      {isMobile && (
        <Fab
          color="success"
          aria-label="add"
          onClick={() => { setEditingIncome(null); setFormOpen(true); }}
          sx={{
            position: 'fixed',
            bottom: 16,
            right: 16,
            zIndex: 1000,
            boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)',
            bgcolor: '#10b981',
            '&:hover': {
              bgcolor: '#059669',
            }
          }}
        >
          <Add sx={{ color: 'white' }} />
        </Fab>
      )}

      <IncomeFormFull
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingIncome(null); }}
        onSubmit={handleSubmit}
        accounts={accounts}
        editingIncome={editingIncome}
      />

      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setEditingIncome(selectedIncome); setFormOpen(true); setMenuAnchor(null); }}>
          <Edit sx={{ mr: 1 }} fontSize="small" /> Edit
        </MenuItem>
        <MenuItem onClick={() => { setConfirmOpen(true); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" /> Delete
        </MenuItem>
      </Menu>

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Income"
        message="Delete this income entry? This cannot be undone."
        onConfirm={() => selectedIncome && deleteMutation.mutate(selectedIncome.id)}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </ResponsiveLayout>
  );
}
