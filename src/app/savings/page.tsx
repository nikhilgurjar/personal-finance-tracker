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
  Select, FormControl, InputLabel, Autocomplete, useMediaQuery, useTheme, Fab,
  Stepper, Step, StepLabel
} from '@mui/material';
import {
  Add, MoreVert, Delete, Savings, TrendingUp, Close, AccountBalanceWallet, Update
} from '@mui/icons-material';
import { DatePicker, LocalizationProvider } from '@mui/x-date-pickers';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import dayjs from 'dayjs';
import { useRouter } from 'next/navigation';
import { SavingsInstrument, Goal } from '@/lib/types';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { authedJson } from '@/lib/apiClient';

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
  platform: string;
  personId: string;
  ownerName: string;
  goalIds: string[];
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

interface SipForm {
  amount: string;
  frequency: string;
  debitAccountId: string;
  startDate: Date | null;
}

export default function SavingsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const queryClient = useQueryClient();

  const [tab, setTab] = useState('all');
  const [createOpen, setCreateOpen] = useState(false);
  const [activeStep, setActiveStep] = useState(0);
  const steps = ['Identity', 'Terms', 'Ownership'];
  const [eventOpen, setEventOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [sipOpen, setSipOpen] = useState(false);
  const [selectedInstrument, setSelectedInstrument] = useState<SavingsInstrument | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [toast, setToast] = useState('');
  const [createPersonOpen, setCreatePersonOpen] = useState(false);
  const [newPersonName, setNewPersonName] = useState('');

  const [createForm, setCreateForm] = useState<CreateInstrumentForm>({
    name: '', type: 'fd', provider: '', platform: '', personId: '', ownerName: '', goalIds: [],
    accountNumber: '', openedAt: new Date(), maturityDate: null, interestRate: '', principalAmount: '',
  });
  
  const [eventForm, setEventForm] = useState<EventForm>({
    type: 'deposit', amount: '', date: new Date(), note: '', reason: '', linkedAccountId: '',
  });

  const [sipForm, setSipForm] = useState<SipForm>({
    amount: '', frequency: 'FREQ=MONTHLY', debitAccountId: '', startDate: new Date(),
  });

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: instruments = [], isLoading } = useAuthedQuery(user, ['savings-instruments', user?.uid], '/api/savings-instruments');
  const { data: accounts = [] } = useAuthedQuery(user, ['accounts', user?.uid], '/api/accounts');
  const { data: goals = [] } = useAuthedQuery(user, ['goals', user?.uid], '/api/goals');
  const { data: people = [] } = useAuthedQuery(user, ['people', user?.uid], '/api/people');
  const { data: metadata = { platforms: [], providers: [] } } = useAuthedQuery(user, ['savings-metadata', user?.uid], '/api/savings-instruments/metadata');

  const createMutation = useMutation({
    mutationFn: async () => {
      const selectedPerson = people.find((p: any) => p.id === createForm.personId);
      return authedJson(user, '/api/savings-instruments', {
        method: 'POST',
        body: JSON.stringify({
          ...createForm,
          accountNumber: createForm.accountNumber || undefined,
          platform: createForm.platform || undefined,
          personId: createForm.personId || undefined,
          ownerName: selectedPerson?.name || undefined,
          currency: 'INR',
          openedAt: createForm.openedAt?.getTime() || Date.now(),
          maturityDate: createForm.maturityDate?.getTime() || undefined,
          interestRate: createForm.interestRate ? parseFloat(createForm.interestRate) : undefined,
          principalAmount: parseFloat(createForm.principalAmount),
        }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-instruments'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setCreateOpen(false);
      setActiveStep(0);
      setCreateForm({ name: '', type: 'fd', provider: '', platform: '', personId: '', ownerName: '', goalIds: [], accountNumber: '', openedAt: new Date(), maturityDate: null, interestRate: '', principalAmount: '' });
      setToast('Savings instrument created!');
    },
  });

  const createPersonMutation = useMutation({
    mutationFn: async (name: string) => authedJson(user, '/api/people', {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),
    onSuccess: (newPerson) => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      setCreatePersonOpen(false);
      setNewPersonName('');
      setCreateForm(f => ({ ...f, personId: newPerson.id }));
      setToast('Person created successfully');
    },
  });

  const addEventMutation = useMutation({
    mutationFn: async () => authedJson(user, `/api/savings-instruments/${selectedInstrument?.id}`, {
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
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['savings-instruments'] });
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setEventOpen(false);
      setEventForm({ type: 'deposit', amount: '', date: new Date(), note: '', reason: '', linkedAccountId: '' });
      setToast('Event recorded!');
    },
  });

  const createSipMutation = useMutation({
    mutationFn: async () => authedJson(user, '/api/schedules', {
      method: 'POST',
      body: JSON.stringify({
        name: `SIP - ${selectedInstrument?.name}`,
        status: 'active',
        priority: 1,
        rrule: sipForm.frequency,
        nextRunAt: sipForm.startDate?.getTime() || Date.now(),
        template: {
          amount: parseFloat(sipForm.amount),
          currency: 'INR',
          fromAccountId: sipForm.debitAccountId,
          toAccountId: selectedInstrument?.id,
          fromAccountType: accounts.find((a: any) => a.id === sipForm.debitAccountId)?.type || 'savings',
          toAccountType: 'savings',
          type: 'savings',
          metadata: { instrumentId: selectedInstrument?.id },
        }
      }),
    }),
    onSuccess: () => {
      setSipOpen(false);
      setSipForm({ amount: '', frequency: 'FREQ=MONTHLY', debitAccountId: '', startDate: new Date() });
      setToast('Systematic Plan created! Ensure it is approved on schedule day.');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => authedJson(user, `/api/savings-instruments/${id}`, { method: 'DELETE' }),
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

  const personNames = ['Myself', ...people.map((p: any) => p.name)];
  const popularPlatforms = ['Groww', 'Zerodha Kite', 'Zerodha Coin', 'Upstox', 'HDFC App', 'Tata Neu', 'PhonePe', 'Amazon Pay'];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <ResponsiveLayout>
        <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', pb: { xs: 'calc(100px + env(safe-area-inset-bottom))', md: 10 } }}>
          <Container maxWidth="lg">
            {/* Header */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, gap: 2, mb: 4 }}>
              <Box>
                <Typography variant="h4" sx={{ fontSize: { xs: '1.75rem', md: '2.125rem' }, fontWeight: 800 }}>Savings & Investments</Typography>
                <Typography variant="body2" color="text.secondary">Track your wealth and linked goals</Typography>
              </Box>
              <Button variant="contained" startIcon={<Add />} onClick={() => setCreateOpen(true)} fullWidth={isMobile}>
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
            <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }} variant="scrollable" scrollButtons="auto" allowScrollButtonsMobile>
              <Tab label="All" value="all" />
              <Tab label="Active" value="active" />
              <Tab label="Closed" value="closed" />
              {Object.entries(INSTRUMENT_CONFIG).map(([val, cfg]) => (
                <Tab key={val} label={`${cfg.icon} ${cfg.label}`} value={val} />
              ))}
            </Tabs>

            {isLoading ? (
              <Grid container spacing={2}>
                {[1,2,3].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={260} /></Grid>)}
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
                  const instGoals = goals.filter((g: any) => (instrument.goalIds || []).includes(g.id));
                  
                  return (
                    <Grid item xs={12} sm={6} md={4} key={instrument.id}>
                      <Card sx={{
                        height: '100%',
                        display: 'flex', flexDirection: 'column',
                        borderTop: 4, borderTopColor: isClosed ? 'grey.300' : cfg.color,
                        opacity: isClosed ? 0.75 : 1,
                        transition: 'all 0.2s ease-in-out',
                        boxShadow: '0 4px 20px 0 rgba(0,0,0,0.05)',
                        borderRadius: 3,
                        '&:hover': { transform: 'translateY(-4px)', boxShadow: '0 12px 24px 0 rgba(0,0,0,0.1)' },
                      }}>
                        <CardContent sx={{ flexGrow: 1 }}>
                          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                            <Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5, flexWrap: 'wrap' }}>
                                <Typography variant="h6" component="span">{cfg.icon}</Typography>
                                <Chip label={cfg.label} size="small" sx={{ bgcolor: cfg.bg, color: cfg.color, fontWeight: 700 }} />
                                {isClosed && <Chip label={instrument.status} size="small" color="default" />}
                              </Box>
                              <Typography variant="subtitle1" fontWeight={800}>{instrument.name}</Typography>
                              <Typography variant="caption" color="text.secondary">{instrument.provider}</Typography>
                            </Box>
                            <IconButton size="small" onClick={(e) => { setSelectedInstrument(instrument); setMenuAnchor(e.currentTarget); }}>
                              <MoreVert />
                            </IconButton>
                          </Box>

                          <Typography variant="h4" fontWeight={800} sx={{ color: cfg.color, my: 1 }}>
                            ₹{instrument.currentValue.toLocaleString('en-IN')}
                          </Typography>

                          {instrument.principalAmount && instrument.principalAmount !== instrument.currentValue && (
                            <Typography variant="caption" sx={{ color: gainLoss >= 0 ? 'success.main' : 'error.main', display: 'block', mb: 1 }}>
                              {gainLoss >= 0 ? '▲' : '▼'} ₹{Math.abs(gainLoss).toLocaleString('en-IN')} from principal
                            </Typography>
                          )}

                          <Box sx={{ mt: 1.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {instrument.ownerName && (
                              <Chip size="small" icon={<AccountBalanceWallet fontSize="small"/>} label={instrument.ownerName} variant="outlined" />
                            )}
                            {instrument.platform && (
                              <Chip size="small" label={instrument.platform} variant="outlined" sx={{ bgcolor: 'grey.50' }} />
                            )}
                            {instGoals.map((g: any) => (
                              <Chip key={g.id} size="small" label={g.name} color="primary" variant="outlined" />
                            ))}
                          </Box>

                          <Box sx={{ mt: 2, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            {instrument.interestRate && (
                              <Typography variant="caption" color="text.secondary">📊 {instrument.interestRate}% p.a.</Typography>
                            )}
                            {instrument.maturityDate && (
                              <Typography variant="caption" color={new Date(instrument.maturityDate) < new Date() && !isClosed ? 'warning.main' : 'text.secondary'}>
                                🗓️ Matures: {new Date(instrument.maturityDate).toLocaleDateString('en-IN')}
                              </Typography>
                            )}
                          </Box>
                        </CardContent>
                        
                        <Box sx={{ p: 2, pt: 0, display: 'flex', gap: 1, flexDirection: 'row' }}>
                          {!isClosed && (
                            <Button size="small" variant="outlined" sx={{ flexGrow: 1 }} onClick={() => { setSelectedInstrument(instrument); setEventOpen(true); }}>
                              Add Event
                            </Button>
                          )}
                          <Button size="small" variant="text" sx={{ flexGrow: 1 }} onClick={() => { setSelectedInstrument(instrument); setHistoryOpen(true); }}>
                            History ({(instrument.events || []).length})
                          </Button>
                        </Box>
                      </Card>
                    </Grid>
                  );
                })}
              </Grid>
            )}
          </Container>
        </Box>

        {/* Create Instrument Dialog */}
        <Dialog open={createOpen} onClose={() => { setCreateOpen(false); setActiveStep(0); }} maxWidth="sm" fullWidth fullScreen={isMobile}>
          <DialogTitle>Add Savings Instrument</DialogTitle>
          <Stepper activeStep={activeStep} sx={{ px: 3, py: 2 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              {activeStep === 0 && (
                <>
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
                <Autocomplete
                  freeSolo
                  options={metadata.providers.length > 0 ? metadata.providers : ['HDFC', 'SBI', 'ICICI', 'Axis', 'Zerodha', 'Groww']}
                  value={createForm.provider}
                  onInputChange={(_, value) => setCreateForm(f => ({ ...f, provider: value }))}
                  renderInput={(params) => <TextField {...params} size="small" label="Provider / Bank / AMC" placeholder="e.g. HDFC, Mirae Asset" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField size="small" fullWidth label="Account Number (optional)" value={createForm.accountNumber} onChange={e => setCreateForm(f => ({ ...f, accountNumber: e.target.value }))} />
              </Grid>
                </>
              )}

              {activeStep === 1 && (
                <>
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
                </>
              )}

              {activeStep === 2 && (
                <>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={Array.from(new Set([...metadata.platforms, ...popularPlatforms]))}
                  value={createForm.platform}
                  onInputChange={(_, value) => setCreateForm(f => ({ ...f, platform: value }))}
                  renderInput={(params) => <TextField {...params} size="small" label="Platform / App" placeholder="e.g. Groww, PhonePe" />}
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Whose money is it?</InputLabel>
                    <Select
                      value={createForm.personId}
                      onChange={e => setCreateForm(f => ({ ...f, personId: e.target.value }))}
                      label="Whose money is it?"
                    >
                      <MenuItem value=""><em>Not specified</em></MenuItem>
                      {people.map((p: any) => (
                        <MenuItem key={p.id} value={p.id}>{p.name}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                  <Button variant="outlined" onClick={() => setCreatePersonOpen(true)} sx={{ minWidth: 'auto', px: 2 }}>
                    +
                  </Button>
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControl fullWidth size="small">
                  <InputLabel>Linked Goals</InputLabel>
                  <Select
                    multiple
                    value={createForm.goalIds}
                    onChange={e => setCreateForm(f => ({ ...f, goalIds: typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value }))}
                    label="Linked Goals"
                    renderValue={(selected) => (
                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                        {selected.map((value) => <Chip key={value} label={goals.find((g: any) => g.id === value)?.name || value} size="small" />)}
                      </Box>
                    )}
                  >
                    {goals.map((g: any) => (
                      <MenuItem key={g.id} value={g.id}>{g.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Autocomplete
                  freeSolo
                  options={Array.from(new Set([...metadata.platforms, ...popularPlatforms]))}
                  value={createForm.platform}
                  onInputChange={(_, value) => setCreateForm(f => ({ ...f, platform: value }))}
                  renderInput={(params) => <TextField {...params} size="small" label="Platform / App" placeholder="e.g. Groww, PhonePe" />}
                />
              </Grid>
                </>
              )}
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => { activeStep === 0 ? setCreateOpen(false) : setActiveStep(p => p - 1) }}>
              {activeStep === 0 ? 'Cancel' : 'Back'}
            </Button>
            {activeStep < steps.length - 1 ? (
              <Button variant="contained" onClick={() => setActiveStep(p => p + 1)}>Next</Button>
            ) : (
              <Button variant="contained" onClick={() => createMutation.mutate()} disabled={!createForm.name || !createForm.provider || !createForm.principalAmount || createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create'}
              </Button>
            )}
          </DialogActions>
        </Dialog>

        {/* Add Event Dialog */}
        <Dialog open={eventOpen} onClose={() => setEventOpen(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
          <DialogTitle>Add Event — {selectedInstrument?.name}</DialogTitle>
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
            <Button variant="contained" color={eventForm.type === 'broken' ? 'error' : 'primary'} onClick={() => addEventMutation.mutate()} disabled={addEventMutation.isPending}>
              {addEventMutation.isPending ? 'Saving...' : 'Save Event'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* SIP / Systematic Dialog */}
        <Dialog open={sipOpen} onClose={() => setSipOpen(false)} maxWidth="xs" fullWidth fullScreen={isMobile}>
          <DialogTitle>Add SIP — {selectedInstrument?.name}</DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Set up a recurring deposit. A schedule will be created and suggested to you automatically.
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField size="small" fullWidth label="Installment Amount (₹)" type="number" required value={sipForm.amount} onChange={e => setSipForm(f => ({ ...f, amount: e.target.value }))} />
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small" required>
                  <InputLabel>Debit From (Bank Account)</InputLabel>
                  <Select value={sipForm.debitAccountId} onChange={e => setSipForm(f => ({ ...f, debitAccountId: e.target.value }))} label="Debit From (Bank Account)">
                    {accounts.filter((a: any) => a.type === 'savings').map((a: any) => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <FormControl fullWidth size="small">
                  <InputLabel>Frequency</InputLabel>
                  <Select value={sipForm.frequency} onChange={e => setSipForm(f => ({ ...f, frequency: e.target.value }))} label="Frequency">
                    <MenuItem value="FREQ=MONTHLY">Monthly</MenuItem>
                    <MenuItem value="FREQ=WEEKLY">Weekly</MenuItem>
                    <MenuItem value="FREQ=YEARLY">Yearly</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12}>
                <DatePicker
                  label="Next Installment Date"
                  value={sipForm.startDate ? dayjs(sipForm.startDate) : null}
                  onChange={val => setSipForm(f => ({ ...f, startDate: val?.toDate() || null }))}
                  slotProps={{ textField: { size: 'small', fullWidth: true, required: true } }}
                />
              </Grid>
            </Grid>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setSipOpen(false)}>Cancel</Button>
            <Button variant="contained" onClick={() => createSipMutation.mutate()} disabled={!sipForm.amount || !sipForm.debitAccountId || createSipMutation.isPending}>
              {createSipMutation.isPending ? 'Saving...' : 'Set up SIP'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* History Dialog */}
        <Dialog open={historyOpen} onClose={() => setHistoryOpen(false)} maxWidth="sm" fullWidth fullScreen={isMobile}>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            {selectedInstrument?.name} — History
            <IconButton size="small" onClick={() => setHistoryOpen(false)}><Close /></IconButton>
          </DialogTitle>
          <DialogContent>
            {selectedInstrument && <TimelineView events={getHistory(selectedInstrument)} emptyMessage="No events recorded yet" />}
          </DialogContent>
        </Dialog>

        {/* Actions Menu */}
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
          <MenuItem onClick={() => { setEventOpen(true); setMenuAnchor(null); }}>
            <Add sx={{ mr: 1 }} fontSize="small" /> Add Event (One-time)
          </MenuItem>
          <MenuItem onClick={() => { setSipOpen(true); setMenuAnchor(null); }}>
            <Update sx={{ mr: 1 }} fontSize="small" /> Add SIP / Systematic
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

        <Dialog open={createPersonOpen} onClose={() => setCreatePersonOpen(false)} maxWidth="xs" fullWidth>
          <DialogTitle>Add New Person</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Person Name"
              type="text"
              fullWidth
              variant="outlined"
              value={newPersonName}
              onChange={(e) => setNewPersonName(e.target.value)}
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={() => setCreatePersonOpen(false)}>Cancel</Button>
            <Button 
              onClick={() => createPersonMutation.mutate(newPersonName)} 
              variant="contained" 
              disabled={!newPersonName.trim() || createPersonMutation.isPending}
            >
              {createPersonMutation.isPending ? 'Saving...' : 'Add'}
            </Button>
          </DialogActions>
        </Dialog>

        <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
        {isMobile && (
          <Fab 
            color="primary" 
            aria-label="add" 
            sx={{
              position: 'fixed',
              bottom: { xs: 'calc(80px + env(safe-area-inset-bottom))', md: 80 },
              right: 16,
              zIndex: 1200,
              boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.3)',
            }}
            onClick={() => setCreateOpen(true)}
          >
            <Add />
          </Fab>
        )}
      </ResponsiveLayout>
    </LocalizationProvider>
  );
}
