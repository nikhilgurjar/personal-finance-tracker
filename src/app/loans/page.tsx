'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { LoanForm } from '@/components/LoanForm';
import { RepaymentForm } from '@/components/RepaymentForm';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { authedFetch, authedJson } from '@/lib/apiClient';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import {
  Box, Container, Typography, Button, Grid, Card, CardContent, Chip,
  IconButton, Menu, MenuItem, Alert, CircularProgress, LinearProgress,
  Tabs, Tab, Skeleton, Snackbar,
} from '@mui/material';
import {
  Add, MoreVert, Edit, Delete, Handshake, TrendingDown, Receipt,
  CheckCircle, AccountBalance, Payment,
} from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loan } from '@/lib/types';

type LoanTab = 'all' | 'lent' | 'borrowed' | 'payable';

const LOAN_CONFIG = {
  lent: { label: 'I Lent', color: '#10b981', bg: '#d1fae5', icon: <TrendingDown />, chipColor: 'success' as const },
  borrowed: { label: 'I Borrowed', color: '#ef4444', bg: '#fee2e2', icon: <Handshake />, chipColor: 'error' as const },
  payable: { label: 'I Owe', color: '#f97316', bg: '#ffedd5', icon: <Receipt />, chipColor: 'warning' as const },
};

export default function LoansPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<LoanTab>('all');
  const [formOpen, setFormOpen] = useState(false);
  const [editingLoan, setEditingLoan] = useState<Loan | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [repaymentFormOpen, setRepaymentFormOpen] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: loans = [], isLoading, error } = useAuthedQuery(user, ['loans', user?.uid], '/api/loans');

  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      return authedJson(user, '/api/loans', {
        method: 'POST',
        body: JSON.stringify({ ...data, startDate: data.startDate.getTime(), dueDate: data.dueDate?.getTime() }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loans'] }); setFormOpen(false); setToast('Loan added!'); },
  });

  const deleteMutation = useMutation({
    mutationFn: async (loanId: string) => {
      await authedFetch(user, `/api/loans/${loanId}`, { method: 'DELETE' });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loans'] }); setConfirmOpen(false); setToast('Loan deleted'); },
  });

  const repaymentMutation = useMutation({
    mutationFn: async ({ loanId, repayment }: { loanId: string, repayment: any }) => {
      return authedJson(user, `/api/loans/${loanId}`, {
        method: 'PUT',
        body: JSON.stringify({ repayment }),
      });
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['loans'] }); setRepaymentFormOpen(false); setToast('Repayment recorded!'); },
  });

  if (!user) return null;

  const filtered = tab === 'all' ? loans : loans.filter((l: Loan) => l.loanType === tab);

  const totals = {
    lent: loans.filter((l: Loan) => l.loanType === 'lent' && l.status === 'active').reduce((s: number, l: Loan) => s + l.outstandingAmount, 0),
    borrowed: loans.filter((l: Loan) => l.loanType === 'borrowed' && l.status === 'active').reduce((s: number, l: Loan) => s + l.outstandingAmount, 0),
    payable: loans.filter((l: Loan) => l.loanType === 'payable' && l.status === 'active').reduce((s: number, l: Loan) => s + l.outstandingAmount, 0),
  };

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh' }}>
        <Container maxWidth="lg">
          {/* Header */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
            <Box>
              <Typography variant="h4" fontWeight={800} color="text.primary">Loans & Dues</Typography>
              <Typography variant="body2" color="text.secondary">Track money you lent, borrowed, or owe</Typography>
            </Box>
            <Button variant="contained" startIcon={<Add />} onClick={() => { setEditingLoan(null); setFormOpen(true); }}>
              Add Loan
            </Button>
          </Box>

          {/* Summary cards */}
          <Grid container spacing={2} sx={{ mb: 4 }}>
            {Object.entries(LOAN_CONFIG).map(([type, cfg]) => (
              <Grid item xs={12} sm={4} key={type}>
                <Card sx={{ borderTop: 4, borderTopColor: cfg.color, background: cfg.bg }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ color: cfg.color }}>{cfg.icon}</Box>
                    <Box>
                      <Typography variant="caption" color="text.secondary">{cfg.label} (outstanding)</Typography>
                      <Typography variant="h5" fontWeight={700} sx={{ color: cfg.color }}>
                        ₹{totals[type as keyof typeof totals].toLocaleString('en-IN')}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {error && <Alert severity="error" sx={{ mb: 3 }}>Failed to load loans</Alert>}

          {/* Tabs */}
          <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
            <Tab label="All" value="all" />
            <Tab label="I Lent" value="lent" />
            <Tab label="I Borrowed" value="borrowed" />
            <Tab label="I Owe" value="payable" />
          </Tabs>

          {isLoading ? (
            <Grid container spacing={2}>
              {[1,2,3].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={180} /></Grid>)}
            </Grid>
          ) : filtered.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Handshake sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No loans found</Typography>
              <Button variant="contained" startIcon={<Add />} sx={{ mt: 2 }} onClick={() => setFormOpen(true)}>
                Add First Loan
              </Button>
            </Box>
          ) : (
            <Grid container spacing={2}>
              {filtered.map((loan: Loan) => {
                const cfg = LOAN_CONFIG[loan.loanType];
                const repaidPct = ((loan.principalAmount - loan.outstandingAmount) / loan.principalAmount) * 100;
                const isSettled = loan.status === 'settled';
                return (
                  <Grid item xs={12} sm={6} md={4} key={loan.id}>
                    <Card sx={{
                      borderTop: 4, borderTopColor: isSettled ? 'grey.300' : cfg.color,
                      opacity: isSettled ? 0.75 : 1,
                      transition: 'box-shadow 0.2s',
                      '&:hover': { boxShadow: 6 },
                    }}>
                      <CardContent>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                              <Chip label={cfg.label} size="small" color={cfg.chipColor} />
                              {isSettled && <Chip label="Settled" size="small" color="default" icon={<CheckCircle fontSize="small" />} />}
                            </Box>
                            <Typography variant="h6" fontWeight={700}>{loan.personName}</Typography>
                          </Box>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedLoan(loan); setMenuAnchor(e.currentTarget); }}>
                            <MoreVert />
                          </IconButton>
                        </Box>

                        <Typography variant="h5" fontWeight={800} sx={{ color: cfg.color, mb: 1 }}>
                          ₹{loan.outstandingAmount.toLocaleString('en-IN')}
                          <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                            / ₹{loan.principalAmount.toLocaleString('en-IN')}
                          </Typography>
                        </Typography>

                        <LinearProgress
                          variant="determinate" value={Math.min(repaidPct, 100)}
                          sx={{ mb: 1, height: 6, borderRadius: 3, bgcolor: 'grey.200',
                            '& .MuiLinearProgress-bar': { bgcolor: cfg.color } }}
                        />

                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" color="text.secondary">
                            {new Date(loan.startDate).toLocaleDateString('en-IN')}
                          </Typography>
                          {!isSettled && (
                            <Button 
                              variant="outlined" 
                              size="small" 
                              color={cfg.chipColor}
                              onClick={(e) => { e.stopPropagation(); setSelectedLoan(loan); setRepaymentFormOpen(true); }}
                              sx={{ mt: 1, borderRadius: 2 }}
                            >
                              Record Repayment
                            </Button>
                          )}
                        </Box>
                        {loan.dueDate && (
                          <Typography variant="caption" color={new Date(loan.dueDate) < new Date() && !isSettled ? 'error.main' : 'text.secondary'} sx={{ display: 'block', mt: 1 }}>
                            Due: {new Date(loan.dueDate).toLocaleDateString('en-IN')}
                          </Typography>
                        )}
                        {loan.note && <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5, fontStyle: 'italic' }}>{loan.note}</Typography>}
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
            </Grid>
          )}
        </Container>
      </Box>

      {/* Loan Form */}
      <LoanForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingLoan(null); }}
        onSubmit={createMutation.mutateAsync}
        accounts={[]}
        editingLoan={editingLoan}
      />

      {/* Actions Menu */}
      <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={() => setMenuAnchor(null)}>
        <MenuItem onClick={() => { setRepaymentFormOpen(true); setMenuAnchor(null); }} disabled={selectedLoan?.status === 'settled'}>
          <Payment sx={{ mr: 1 }} fontSize="small" /> Record Repayment
        </MenuItem>
        <MenuItem onClick={() => { setEditingLoan(selectedLoan); setFormOpen(true); setMenuAnchor(null); }}>
          <Edit sx={{ mr: 1 }} fontSize="small" /> Edit
        </MenuItem>
        <MenuItem onClick={() => { setConfirmOpen(true); setMenuAnchor(null); }} sx={{ color: 'error.main' }}>
          <Delete sx={{ mr: 1 }} fontSize="small" /> Delete
        </MenuItem>
      </Menu>

      {/* Confirm Delete */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Loan"
        message={`Delete loan for ${selectedLoan?.personName}? This cannot be undone.`}
        onConfirm={() => selectedLoan && deleteMutation.mutate(selectedLoan.id)}
        onCancel={() => setConfirmOpen(false)}
        loading={deleteMutation.isPending}
      />

      {/* Repayment Form */}
      <RepaymentForm
        open={repaymentFormOpen}
        onClose={() => setRepaymentFormOpen(false)}
        onSubmit={async (data) => { if (selectedLoan) await repaymentMutation.mutateAsync({ loanId: selectedLoan.id, repayment: data.repayment }); }}
        loan={selectedLoan}
      />

      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </ResponsiveLayout>
  );
}
