'use client';

import { useState, useEffect } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { TimelineView, TimelineEventData } from '@/components/TimelineView';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent, Chip,
  IconButton, Menu, MenuItem, Alert, Skeleton, Tabs, Tab, Dialog,
  DialogTitle, DialogContent, DialogActions, TextField, Snackbar,
  Select, FormControl, InputLabel, LinearProgress,
} from '@mui/material';
import {
  Add, MoreVert, Edit, Delete, Savings, AccountBalance,
  TrendingUp, Close, CheckCircle, Lock,
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { SavingsInstrument } from '@/lib/types';

async function apiFetch(path: string, user: any, opts: RequestInit = {}) {
  const token = await getIdToken(user);
  return fetch(path, { ...opts, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(opts.headers || {}) } });
}

const INSTRUMENT_CONFIG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  savings_account: { label: 'Savings Account', color: '#3b82f6', bg: '#dbeafe', icon: '🏦' },
  fd: { label: 'Fixed Deposit', color: '#8b5cf6', bg: '#ede9fe', icon: '🔒' },
  rd: { label: 'Recurring Deposit', color: '#6366f1', bg: '#e0e7ff', icon: '📅' },
  stock: { label: 'Stock', color: '#10b981', bg: '#d1fae5', icon: '📈' },
  equity_mf: { label: 'Equity MF', color: '#059669', bg: '#d1fae5', icon: '💹' },
  debt_mf: { label: 'Debt MF', color: '#0891b2', bg: '#cffafe', icon: '📊' },
  etf: { label: 'ETF', color: '#2563eb', bg: '#dbeafe', icon: '🔷' },
  commodity: { label: 'Commodity', color: '#d97706', bg: '#fef3c7', icon: '🪙' },
  ppf: { label: 'PPF', color: '#7c3aed', bg: '#ede9fe', icon: '🏛️' },
  nps: { label: 'NPS', color: '#9333ea', bg: '#f3e8ff', icon: '🎯' },
  other: { label: 'Other', color: '#64748b', bg: '#f1f5f9', icon: '📦' },
};

const INSTRUMENT_TYPES = Object.entries(INSTRUMENT_CONFIG).map(([value, cfg]) => ({
  value, label: `${cfg.icon} ${cfg.label}`,
}));

interface CreateInstrumentForm {
  name: string;
  type: string;
  provider: string;
  accountNumber: string;
  openedAt: Date | null;
  maturityDate: Date | null;
  interestRate: string;
  principalAmount: string;
}

interface EventForm {
  type: string;
  amount: string;
  date: Date | null;
  note: string;
  reason: string;
  linkedAccountId: string;
}

export default function SavingsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<SavingsInstrument | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');

  const [createForm, setCreateForm] = useState<CreateInstrumentForm>({
    name: '', type: 'fd', provider: '', accountNumber: '',
    openedAt: new Date(), maturityDate: null, interestRate: '', principalAmount: '',
  });
  const [eventForm, setEventForm] = useState<EventForm>({
    type: 'deposit', amount: '', date: new Date(), note: '', reason: '', linkedAccountId: '',
  });

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: instruments = [], isLoading } = useQuery({
    queryKey: ['savings-instruments', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/savings-instruments', user); return r.json(); },
    enabled: !!user,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['accounts', user?.uid],
    queryFn: async () => { const r = await apiFetch('/api/accounts', user); return r.json(); },
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await apiFetch('/api/savings-instruments', user, {
        method: 'POST',
        body: JSON.stringify({
          name: createForm.name,
          type: createForm.type,
          provider: createForm.provider,
          accountNumber: createForm.accountNumber || undefined,
          currency: 'INR',
          openedAt: createForm.openedAt?.getTime() || Date.now(),
          maturityDate: createForm.maturityDate?.getTime() || undefined,
          interestRate: createForm.interestRate ? parseFloat(createForm.interestRate) : undefined,
          principalAmount: parseFloat(createForm.principalAmount),
        }),
      });
      if (!res.ok) throw new Error('Failed to create instrument');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-instruments'] });
      setCreateOpen(false);
      setCreateForm({ name: '', type: 'fd', provider: '', accountNumber: '', openedAt: new Date(), maturityDate: null, interestRate: '', principalAmount: '' });
      setToast('Savings instrument created!');
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async () => {
      if (!selectedInstrument) return;
      const res = await apiFetch(`/api/savings-instruments/${selectedInstrument.id}`, user, {
        method: 'PUT',
        body: JSON.stringify({
          event: {
            type: eventForm.type,
            date: eventForm.date?.getTime() || Date.now(),
            amount: eventForm.amount ? parseFloat(eventForm.amount) : undefined,
            note: eventForm.note || undefined,
            reason: eventForm.reason || undefined,
            linkedAccountId: eventForm.linkedAccountId || undefined,
          },
        }),
      });
      if (!res.ok) throw new Error('Failed to add event');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-instruments'] });
      setEventOpen(false);
      setEventForm({ type: 'deposit', amount: '', date: new Date(), note: '', reason: '', linkedAccountId: '' });
      setToast('Event recorded!');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiFetch(`/api/savings-instruments/${id}`, user, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-instruments'] });
      setConfirmOpen(false);
      setToast('Instrument deleted');
    },
  });

  if (!user) return null;

  const activeInstruments = instruments.filter((i: SavingsInstrument) => i.status === 'active');
  const closedInstruments = instruments.filter((i: SavingsInstrument) => i.status !== 'active');
  const totalPortfolio = activeInstruments.reduce((s: number, i: SavingsInstrument) => s + (i.currentValue || 0), 0);

  const filtered = instruments.filter((i: SavingsInstrument) => {
    if (tab === 'active') return i.status === 'active';
    if (tab === 'closed') return i.status !== 'active';
    if (tab !== 'all') return i.type === tab;
    return true;
  });

  const getHistory = (instrument: SavingsInstrument): TimelineEventData[] =>
    (instrument.events || []).map(ev => ({
      id: ev.id,
      date: ev.date,
      title: ev.type.charAt(0).toUpperCase() + ev.type.slice(1).replace('_', ' '),
      amount: ev.amount,
      type: ev.type === 'closed' || ev.type === 'broken' ? 'instrument' : ev.amount ? 'income' : 'savings',
      note: ev.note || ev.reason,
    }));

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ResponsiveLayout>
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
          <Container maxWidth="lg">
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
              <Box>
                <Typography variant="h4" fontWeight={800}>Savings & Investments</Typography>
                <Typography variant="body2" color="text.secondary">FDs, stocks, mutual funds, and more</Typography>
              </Box>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)}>
                Add Instrument
              </Button>
            </Box>

            {/* Portfolio summary */}
            <Grid container spacing={2} sx={{ mb: 4 }}>
              <Grid item xs={12} sm={4}>
                <Card sx={{ background: 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)', color: 'white' }}>
                  <CardContent>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>Total Portfolio Value</Typography>
                    <Typography variant="h4" fontWeight={800}>₹{totalPortfolio.toLocaleString('en-IN')}</Typography>
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>{activeInstruments.length} active instruments</Typography>
                  </CardContent>
                </Card>
              </Grid>
              {Object.entries(INSTRUMENT_CONFIG).slice(0, 2).map(([type, cfg]) => {
                const typeTotal = activeInstruments
                  .filter((i: SavingsInstrument) => i.type === type)
                  .reduce((s: number, i: SavingsInstrument) => s + (i.currentValue || 0), 0);
                if (typeTotal === 0) return null;
                return (
                  <Grid item xs={12} sm={4} key={type}>
                    <Card sx={{ borderTop: 4, borderTopColor: cfg.color, background: cfg.bg }}>
                      <CardContent>
                        <Typography variant="caption" color="text.secondary">{cfg.icon} {cfg.label}</Typography>
                        <Typography variant="h5" fontWeight={700} sx={{ color: cfg.color }}>
                          ₹{typeTotal.toLocaleString('en-IN')}
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              }).filter(Boolean)}
            </Grid>

            {/* Tabs */}
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto">
              <Tab label="All" value="all" />
              <Tab label="Active" value="active" />
              <Tab label="Closed" value="closed" />
              {Object.entries(INSTRUMENT_CONFIG).map(([val, cfg]) => (
                <Tab key={val} label={`${cfg.icon} ${cfg.label}`} value={val} />
              ))}
            </Tabs>

            {isLoading ? (
              <Grid container spacing={2}>
                {[1,2,3].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={220} /></Grid>)}
              </Grid>
            ) : filtered.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 8 }}>
                <Savings sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">No instruments found</Typography>
                <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setCreateOpen(true)}>
                  Add First Instrument
                </Button>
              </Box>
            ) : (
              <Grid container spacing={2}>
                {filtered.map((instrument: SavingsInstrument) => {
                  const cfg = INSTRUMENT_CONFIG[instrument.type] || INSTRUMENT_CONFIG.other;
                  const isClosed = instrument.status !== 'active';
                  const gainLoss = instrument.currentValue - (instrument.principalAmount || instrument.currentValue);
                  return (
                    <Grid item xs={12} sm={6} md={4} key={instrument.id}>
                      <Card sx={{
                        borderTop: 4, borderTopColor: isClosed ? 'grey.300' : cfg.color,
                        opacity: isClosed ? 0.75 : 1,
                        transition: 'box-shadow 0.2s',
                        '&:hover': { boxShadow: 6 },
                      }}>
                        <CardContent>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                                <Typography variant="h5" component="span">{cfg.icon}</Typography>
                                <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 600 }} />
                                {isClosed && <Chip label={instrument.status} size="small" color="default" />}
                              </Box>
                              <Typography variant="subtitle1" fontWeight={700}>{instrument.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{instrument.provider}</Typography>
                            </Box>
                            <IconButton size="small" onClick={(e) => { setSelectedInstrument(instrument); setMenuAnchor(e.currentTarget); }}>
                              <MoreVert />
                            </IconButton>
                          </Box>

                          <Typography variant="h5" fontWeight={800} sx={{ color: cfg.color, my: 1 }}>
                            ₹{instrument.currentValue.toLocaleString('en-IN')}
                          </Typography>

                          {instrument.principalAmount && instrument.principalAmount !== instrument.currentValue && (
                            <Typography variant="caption" sx={{ color: gainLoss >= 0 ? 'success.main' : 'error.main' }}>
                              {gainLoss >= 0 ? '▲' : '▼'} ₹{Math.abs(gainLoss).toLocaleString('en-IN')} from principal
                            </Typography>
                          )}

                          <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {instrument.interestRate && (
                              <Typography variant="caption" color="text.secondary">
                                📊 {instrument.interestRate}% p.a.
                              </Typography>
                            )}
                            {instrument.maturityDate && (
                              <Typography variant="caption" color={new Date(instrument.maturityDate) < new Date() && !isClosed ? 'warning.main' : 'text.secondary'}>
                                🗓️ Matures: {new Date(instrument.maturityDate).toLocaleDateString('en-IN')}
                              </Typography>
                            )}
                            {instrument.openedAt && (
                              <Typography variant="caption" color="text.secondary">
                                Opened: {new Date(instrument.openedAt).toLocaleDateString('en-IN')}
                              </Typography>
                            )}
                            {isClosed && instrument.closedAt && (
                              <Typography variant="caption" color="text.secondary">
                                Closed: {new Date(instrument.closedAt).toLocaleDateString('en-IN')}
                                {instrument.closeReason && ` — ${instrument.closeReason}`}
                              </Typography>
                            )}
                          </Box>

                          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                            {!isClosed && (
                              <Button
                                size="small" variant="outlined" fullWidth
                                onClick={() => { setSelectedInstrument(instrument); setEventOpen(true); }}
                              >
                                Add Event
                              </Button>
                            )}
                            <Button
                              size="small" variant="text" fullWidth
                              onClick={() => { setSelectedInstrument(instrument); setHistoryOpen(true); }}
                            >
                              History ({(instrument.events || []).length})
                            </Button>
                          </Box>
                        </CardContent>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Container>
        </Box>

        {/* Create Instrument Dialog */}
        <Dialog open={createOpen} onClose={() => setCreateOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Add Savings Instrument</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Type</InputLabel>
                  <Select value={createForm.type} onChange={e => setCreateForm(f => ({ ...f, type: e.target.value }))} label="Type">
                    {INSTRUMENT_TYPES.map(t => <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Name" placeholder="e.g. HDFC FD 7.5%" value={createForm.name} onChange={e => setCreateForm(f => ({ ...f, name: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Provider / Bank" placeholder="e.g. HDFC, Zerodha" value={createForm.provider} onChange={e => setCreateForm(f => ({ ...f, provider: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Account/Folio No. (optional)" value={createForm.accountNumber} onChange={e => setCreateForm(f => ({ ...f, accountNumber: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Principal Amount (₹)" type="number" value={createForm.principalAmount} onChange={e => setCreateForm(f => ({ ...f, principalAmount: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Interest Rate % p.a. (optional)" type="number" value={createForm.interestRate} onChange={e => setCreateForm(f => ({ ...f, interestRate: e.target.value }))} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Opened On"
                  value={createForm.openedAt ? dayjs(createForm.openedAt) : null}
                  onChange={val => setCreateForm(f => ({ ...f, openedAt: val?.toDate() || null }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <DatePicker
                  label="Maturity Date (optional)"
                  value={createForm.maturityDate ? dayjs(createForm.maturityDate) : null}
                  onChange={val => setCreateForm(f => ({ ...f, maturityDate: val?.toDate() || null }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              onClick={() => createMutation.mutate()}
              disabled={!createForm.name || !createForm.provider || !createForm.principalAmount || createMutation.isPending}
            >
              {createMutation.isPending ? 'Creating...' : 'Create'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Add Event Dialog */}
        <Dialog open={eventOpen} onClose={() => setEventOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>
            Add Event — {selectedInstrument?.name}
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Event Type</InputLabel>
                  <Select value={eventForm.type} onChange={e => setEventForm(f => ({ ...f, type: e.target.value }))} label="Event Type">
                    <MenuItem value="deposit">💰 Deposit / Top-up</MenuItem>
                    <MenuItem value="withdrawal">💸 Withdrawal</MenuItem>
                    <MenuItem value="interest_credit">📈 Interest Credit</MenuItem>
                    <MenuItem value="broken">🔓 Break / Exit</MenuItem>
                    <MenuItem value="closed">✅ Matured / Closed</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              {eventForm.type !== 'closed' && (
                <Grid item xs={12}>
                  <TextField size="small" fullWidth label="Amount (₹)" type="number" value={eventForm.amount} onChange={e => setEventForm(f => ({ ...f, amount: e.target.value }))} />
                </Grid>
              )}
              <Grid item xs={12}>
                <DatePicker
                  label="Date"
                  value={eventForm.date ? dayjs(eventForm.date) : null}
                  onChange={val => setEventForm(f => ({ ...f, date: val?.toDate() || null }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true } }}
                />
              </Grid>
              {(eventForm.type === 'broken' || eventForm.type === 'closed' || eventForm.type === 'withdrawal') && (
                <>
                  <Grid item xs={12}>
                    <TextField size="small" fullWidth label="Reason" placeholder="e.g. Emergency, Matured, Better returns" value={eventForm.reason} onChange={e => setEventForm(f => ({ ...f, reason: e.target.value }))} />
                  </Grid>
                  <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                      <InputLabel>Money received into account</InputLabel>
                      <Select value={eventForm.linkedAccountId} onChange={e => setEventForm(f => ({ ...f, linkedAccountId: e.target.value }))} label="Money received into account">
                        <MenuItem value=""><em>Not specified</em></MenuItem>
                        {accounts.map((a: any) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                      </Select>
                    </FormControl>
                  </Grid>
                </>
              )}
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="Note (optional)" value={eventForm.note} onChange={e => setEventForm(f => ({ ...f, note: e.target.value }))} />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setEventOpen(false)}>Cancel</Button>
            <Button
              variant="contained"
              color={eventForm.type === 'broken' ? 'error' : 'primary'}
              onClick={() => addEventMutation.mutate()}
              disabled={addEventMutation.isPending}
            >
              {addEventMutation.isPending ? 'Saving...' : 'Save Event'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedInstrument?.name} — History
            <IconButton size="small" onClick={() => setHistoryOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedInstrument && (
              <TimelineView
                events={getHistory(selectedInstrument)}
                emptyMessage="No events recorded yet"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Actions Menu */}
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { setEventOpen(true); setMenuAnchor(null); }}>
            <Add sx={{ mr: 1 }} fontSize="small" /> Add Event
          </MenuItem>
          <MenuItem onClick={() => { setHistoryOpen(true); setMenuAnchor(null); }}>
            <TrendingUp sx={{ mr: 1 }} fontSize="small" /> View History
          </MenuItem>
          <MenuItem onClick={() => { setConfirmOpen(true); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
            <Delete sx={{ mr: 1 }} fontSize="small" /> Delete
          </MenuItem>
        </Menu>

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Instrument"
          message={`Delete ${selectedInstrument?.name}? All history will be lost.`}
          onConfirm={() => selectedInstrument && deleteMutation.mutate(selectedInstrument.id)}
          onCancel={() => setConfirmOpen(false)}
          loading={deleteMutation.isPending}
        />

        <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
      </ResponsiveLayout>
    </LocalizationProvider>
  );
}
