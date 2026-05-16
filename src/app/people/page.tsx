'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { useAuthedQuery } from '@/hooks/useAuthedQuery';
import { RepaymentForm } from '@/components/RepaymentForm';
import { authedJson } from '@/lib/apiClient';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Box, Container, Typography, Card, CardContent, Grid,
  Avatar, Chip, Dialog, DialogTitle, DialogContent, IconButton,
  Divider, Skeleton, Button, Snackbar
} from '@mui/material';
import { Close, Receipt, TrendingDown, Handshake, AccountBalanceWallet } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

const TYPE_CONFIG = {
  lent: { label: 'Lent', color: '#10b981', icon: <TrendingDown fontSize="small" /> },
  borrowed: { label: 'Borrowed', color: '#ef4444', icon: <Handshake fontSize="small" /> },
  payable: { label: 'Payable', color: '#f97316', icon: <Receipt fontSize="small" /> },
};

function LedgerDialog({
  person,
  open,
  onClose,
  onRecordRepayment,
}: {
  person: any,
  open: boolean,
  onClose: () => void,
  onRecordRepayment: (person: any, loanType: 'lent' | 'borrowed' | 'payable') => void,
}) {
  if (!person) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar sx={{ bgcolor: person.netBalance >= 0 ? '#10b981' : '#ef4444' }}>
            {person.name.charAt(0)}
          </Avatar>
          <Box>
            <Typography variant="h6">{person.name}</Typography>
            <Typography variant="body2" color={person.netBalance >= 0 ? 'success.main' : 'error.main'} fontWeight={700}>
              Net Balance: {person.netBalance >= 0 ? '+' : ''}₹{person.netBalance.toLocaleString('en-IN')}
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose}><Close /></IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: 0 }}>
        <Box sx={{ p: 2, display: 'flex', gap: 1, flexWrap: 'wrap', borderBottom: '1px solid', borderColor: 'divider' }}>
          {person.totalLent > 0 && (
            <Button size="small" variant="outlined" color="success" onClick={() => onRecordRepayment(person, 'lent')}>
              Receive Lent Repayment
            </Button>
          )}
          {person.totalBorrowed > 0 && (
            <Button size="small" variant="outlined" color="error" onClick={() => onRecordRepayment(person, 'borrowed')}>
              Pay Borrowed Amount
            </Button>
          )}
          {person.totalPayable > 0 && (
            <Button size="small" variant="outlined" color="warning" onClick={() => onRecordRepayment(person, 'payable')}>
              Pay Payable Amount
            </Button>
          )}
        </Box>
        {person.loans.sort((a: any, b: any) => b.startDate - a.startDate).map((loan: any) => {
          const cfg = TYPE_CONFIG[loan.loanType as keyof typeof TYPE_CONFIG];
          return (
            <Box key={loan.id} sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Chip label={cfg.label} size="small" icon={cfg.icon} sx={{ color: cfg.color, borderColor: cfg.color }} variant="outlined" />
                  <Typography variant="body2" fontWeight={600}>
                    ₹{loan.principalAmount.toLocaleString('en-IN')}
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {new Date(loan.startDate).toLocaleDateString('en-IN')}
                </Typography>
              </Box>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Status: <strong>{loan.status.toUpperCase()}</strong> (Outstanding: ₹{loan.outstandingAmount.toLocaleString('en-IN')})
              </Typography>
              {loan.note && <Typography variant="caption" display="block" sx={{ fontStyle: 'italic', mb: 1 }}>"{loan.note}"</Typography>}

              {loan.repayments?.length > 0 && (
                <Box sx={{ ml: 2, mt: 1, pl: 2, borderLeft: '2px solid', borderColor: 'grey.200' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                    REPAYMENTS
                  </Typography>
                  {loan.repayments.map((rep: any) => (
                    <Box key={rep.id} sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                      <Typography variant="body2">
                        ₹{rep.amount.toLocaleString('en-IN')}
                        {rep.note && <span style={{ color: '#666', fontSize: '0.8em', marginLeft: '8px' }}>— {rep.note}</span>}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {new Date(rep.date).toLocaleDateString('en-IN')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          );
        })}
      </DialogContent>
    </Dialog>
  );
}

export default function PeoplePage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedPerson, setSelectedPerson] = useState<any | null>(null);
  const [repaymentContext, setRepaymentContext] = useState<any | null>(null);
  const [toast, setToast] = useState('');

  useEffect(() => { if (!loading && !user) router.push('/'); }, [loading, user, router]);

  const { data: people = [], isLoading } = useAuthedQuery(user, ['people', user?.uid], '/api/people');

  const repaymentMutation = useMutation({
    mutationFn: async (repayment: any) => authedJson(user, '/api/people/repayments', {
      method: 'POST',
      body: JSON.stringify(repayment),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['people'] });
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setRepaymentContext(null);
      setToast('Person repayment recorded');
    },
  });

  if (!user) return null;

  return (
    <ResponsiveLayout>
      <Box sx={{ p: { xs: 2, md: 4 }, minHeight: '100vh', bgcolor: 'background.default' }}>
        <Container maxWidth="lg">
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" fontWeight={800} color="text.primary">People & Ledger</Typography>
            <Typography variant="body2" color="text.secondary">View all money interactions grouped by person</Typography>
          </Box>

          {isLoading ? (
            <Grid container spacing={2}>
              {[1, 2, 3].map(i => <Grid item xs={12} sm={6} md={4} key={i}><Skeleton variant="rounded" height={160} /></Grid>)}
            </Grid>
          ) : people.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <AccountBalanceWallet sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">No interactions found</Typography>
            </Box>
          ) : (
            <Grid container spacing={3}>
              {people.map((person: any) => (
                <Grid item xs={12} sm={6} md={4} key={person.name}>
                  <Card 
                    onClick={() => setSelectedPerson(person)}
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 4 }
                    }}
                  >
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                        <Avatar sx={{ bgcolor: person.netBalance >= 0 ? '#10b981' : '#ef4444', width: 48, height: 48 }}>
                          {person.name.charAt(0)}
                        </Avatar>
                        <Box>
                          <Typography variant="h6" fontWeight={700}>{person.name}</Typography>
                          <Typography variant="body2" color="text.secondary">{person.loans.length} interactions</Typography>
                        </Box>
                      </Box>
                      
                      <Divider sx={{ my: 1.5 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" color="text.secondary">Net Balance</Typography>
                        <Typography variant="body1" fontWeight={800} color={person.netBalance >= 0 ? 'success.main' : 'error.main'}>
                          {person.netBalance >= 0 ? '+' : ''}₹{person.netBalance.toLocaleString('en-IN')}
                        </Typography>
                      </Box>
                      
                      {(person.totalLent > 0 || person.totalBorrowed > 0 || person.totalPayable > 0) && (
                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 1 }}>
                          {person.totalLent > 0 && <Chip label={`Lent: ₹${person.totalLent.toLocaleString()}`} size="small" color="success" variant="outlined" />}
                          {person.totalBorrowed > 0 && <Chip label={`Borrowed: ₹${person.totalBorrowed.toLocaleString()}`} size="small" color="error" variant="outlined" />}
                          {person.totalPayable > 0 && <Chip label={`Payable: ₹${person.totalPayable.toLocaleString()}`} size="small" color="warning" variant="outlined" />}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </Container>
      </Box>
      <LedgerDialog
        person={selectedPerson}
        open={!!selectedPerson}
        onClose={() => setSelectedPerson(null)}
        onRecordRepayment={(person, loanType) => {
          setRepaymentContext({
            personName: person.name,
            loanType,
            outstandingAmount: loanType === 'lent'
              ? person.totalLent
              : loanType === 'borrowed'
                ? person.totalBorrowed
                : person.totalPayable,
          });
        }}
      />
      <RepaymentForm
        open={!!repaymentContext}
        onClose={() => setRepaymentContext(null)}
        onSubmit={async (data) => repaymentMutation.mutateAsync(data.repayment)}
        personName={repaymentContext?.personName}
        loanType={repaymentContext?.loanType}
        outstandingAmount={repaymentContext?.outstandingAmount}
        currency="INR"
      />
      <Snackbar open={!!toast} autoHideDuration={3000} onClose={() => setToast('')} message={toast} />
    </ResponsiveLayout>
  );
}
