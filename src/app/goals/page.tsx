'use client';

import { useState } from 'react';
import { useAuthContext } from '@/components/AuthProvider';
import { ResponsiveLayout } from '@/components/ResponsiveLayout';
import { GoalForm } from '@/components/GoalForm';
import { GoalDetails } from '@/components/GoalDetails';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { formatCurrency } from '@/lib/utils';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getIdToken } from '@/lib/auth';
import {
  Box,
  Container,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Alert,
  CircularProgress,
  LinearProgress,
  TextField,
} from '@mui/material';
import { MoreVert, Add, Edit, Delete, Flag } from '@mui/icons-material';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Goal, Account } from '@/lib/types';

async function fetchGoals(user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/goals', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch goals');
  return response.json();
}

async function fetchAccounts(user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/accounts', {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error('Failed to fetch accounts');
  return response.json();
}

async function createGoal(data: any, user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/goals', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...data,
      targetDate: data.targetDate?.getTime(),
    }),
  });
  if (!response.ok) throw new Error('Failed to create goal');
  return response.json();
}

async function updateGoal(data: any, user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch('/api/goals', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...data,
      targetDate: data.targetDate?.getTime(),
    }),
  });
  if (!response.ok) throw new Error('Failed to update goal');
  return response.json();
}

async function deleteGoal(goalId: string, user: any) {
  const token = await getIdToken(user);
  if (!token) throw new Error('No authentication token available');
  
  const response = await fetch(`/api/goals?id=${goalId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to delete goal');
  return response.json();
}

export default function GoalsPage() {
  const { user, loading } = useAuthContext();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  const { data: goals = [], isLoading: goalsLoading, error: goalsError } = useQuery({
    queryKey: ['goals', user?.uid],
    queryFn: () => fetchGoals(user),
    enabled: !!user,
  });

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['accounts', user?.uid],
    queryFn: () => fetchAccounts(user),
    enabled: !!user,
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => createGoal(data, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setFormOpen(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateGoal(data, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
      setFormOpen(false);
      setEditingGoal(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId, user),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['goals'] });
    },
  });

  useEffect(() => {
    if (!loading && !user) {
      router.push('/');
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return null;
  }

  const handleCreateGoal = async (data: any) => {
    if (editingGoal) {
      await updateMutation.mutateAsync({ ...data, id: editingGoal.id });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const handleEditGoal = (goal: Goal) => {
    setEditingGoal(goal);
    setFormOpen(true);
    setMenuAnchor(null);
  };

  const handleDeleteGoal = (goal: Goal) => {
    setGoalToDelete(goal);
    setConfirmOpen(true);
    setMenuAnchor(null);
  };

  const filteredGoals = goals.filter((goal: Goal) =>
    goal.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getAccountName = (accountId: string) => {
    const account = accounts.find((acc: Account) => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const calculateProgress = (goal: Goal) => {
    // This would typically calculate based on actual allocations and transactions
    // For now, we'll use a mock calculation
    const totalAllocated = goal.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
    return Math.min((totalAllocated / goal.targetAmount) * 100, 100);
  };

  const getPriorityColor = (priority: number) => {
    if (priority >= 3) return 'error';
    if (priority === 2) return 'warning';
    return 'success';
  };

  const getPriorityLabel = (priority: number) => {
    if (priority >= 3) return 'High';
    if (priority === 2) return 'Medium';
    return 'Low';
  };

  if (goalsLoading || accountsLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <ResponsiveLayout>
      <Container maxWidth="lg" sx={{ mt: 4, p: 3 }}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
          <Typography variant="h4" component="h1">
            Financial Goals
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => {
              setEditingGoal(null);
              setFormOpen(true);
            }}
          >
            Add Goal
          </Button>
        </Box>

        {goalsError && (
          <Alert severity="error" sx={{ mb: 3 }}>
            Failed to load goals. Please try again.
          </Alert>
        )}

        {/* Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <TextField
              label="Search Goals"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              fullWidth
              size="small"
            />
          </CardContent>
        </Card>

        {/* Goals Grid */}
        <Grid container spacing={3}>
          {filteredGoals.map((goal: Goal) => {
            const progress = calculateProgress(goal);
            const isOverdue = goal.targetDate && new Date(goal.targetDate) < new Date() && progress < 100;

            return (
              <Grid item xs={12} md={6} key={goal.id}>
                <Card 
                  sx={{ 
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    '&:hover': {
                      transform: 'translateY(-2px)',
                      boxShadow: (theme) => theme.shadows[4]
                    }
                  }}
                  onClick={() => {
                    setSelectedGoal(goal);
                    setDetailsOpen(true);
                  }}
                >
                  <CardContent>
                    <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                      <Box flex={1}>
                        <Box display="flex" alignItems="center" mb={1}>
                          <Typography variant="h6" component="div" sx={{ mr: 1 }}>
                            {goal.name}
                          </Typography>
                          <Chip
                            label={getPriorityLabel(goal.priority || 1)}
                            color={getPriorityColor(goal.priority || 1)}
                            size="small"
                            sx={{ height: 24 }}
                          />
                        </Box>
                        <Typography variant="h4" color="primary.main" gutterBottom sx={{ fontWeight: 'medium' }}>
                          {formatCurrency(goal.targetAmount)}
                        </Typography>
                        {goal.targetDate && (
                          <Typography variant="body2" color="text.secondary">
                            Target: {new Date(goal.targetDate).toLocaleDateString()}
                          </Typography>
                        )}
                      </Box>
                      <Box>
                        <IconButton
                          onClick={(e) => {
                            setSelectedGoal(goal);
                            setMenuAnchor(e.currentTarget);
                          }}
                          size="small"
                        >
                          <MoreVert />
                        </IconButton>
                      </Box>
                    </Box>

                    {/* Progress Section */}
                    <Box sx={{ 
                      bgcolor: 'background.default', 
                      borderRadius: 2,
                      p: 2,
                      mb: 2
                    }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box>
                          <Typography variant="body2" color="text.secondary">
                            Progress
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(goal.allocations.reduce((sum, alloc) => sum + alloc.amount, 0))}
                          </Typography>
                        </Box>
                        <Box textAlign="right">
                          <Typography variant="body2" color="text.secondary">
                            Remaining
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 'medium' }}>
                            {formatCurrency(goal.targetAmount - goal.allocations.reduce((sum, alloc) => sum + alloc.amount, 0))}
                          </Typography>
                        </Box>
                      </Box>
                      <Box sx={{ position: 'relative', mt: 2 }}>
                        <LinearProgress
                          variant="determinate"
                          value={progress}
                          color={isOverdue ? 'error' : 'primary'}
                          sx={{ 
                            height: 10, 
                            borderRadius: 5,
                            bgcolor: isOverdue ? 'error.light' : 'primary.light',
                            '& .MuiLinearProgress-bar': {
                              borderRadius: 5,
                            }
                          }}
                        />
                        <Typography
                          variant="caption"
                          sx={{
                            position: 'absolute',
                            right: 0,
                            top: -20,
                            color: isOverdue ? 'error.main' : 'primary.main',
                            fontWeight: 'bold'
                          }}
                        >
                          {progress.toFixed(1)}%
                        </Typography>
                      </Box>
                    </Box>

                    {/* Allocations Summary */}
                    {goal.allocations.length > 0 && (
                      <Box>
                        <Typography variant="subtitle2" color="text.primary" gutterBottom sx={{ mb: 1 }}>
                          Allocated to
                        </Typography>
                        <Box sx={{ 
                          display: 'flex', 
                          flexWrap: 'wrap', 
                          gap: 1 
                        }}>
                          {goal.allocations.map((allocation, index) => (
                            <Chip
                              key={index}
                              label={`${getAccountName(allocation.accountId)} (${formatCurrency(allocation.amount)})`}
                              size="small"
                              variant="outlined"
                              sx={{ 
                                borderRadius: 2,
                                '& .MuiChip-label': {
                                  px: 1
                                }
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    )}

                    {/* Overdue Warning */}
                    {isOverdue && (
                      <Alert severity="error" sx={{ mt: 2 }}>
                        This goal is overdue!
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>

        {filteredGoals.length === 0 && (
          <Card>
            <CardContent>
              <Box textAlign="center" py={4}>
                <Flag sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
                <Typography variant="h6" color="text.secondary" gutterBottom>
                  No goals found
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  {searchTerm ? 'Try adjusting your search terms.' : 'Create your first financial goal to get started!'}
                </Typography>
                {!searchTerm && (
                  <Button
                    variant="contained"
                    startIcon={<Add />}
                    onClick={() => setFormOpen(true)}
                    sx={{ mt: 2 }}
                  >
                    Add Your First Goal
                  </Button>
                )}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Goal Form */}
        <GoalForm
          open={formOpen}
          onClose={() => {
            setFormOpen(false);
            setEditingGoal(null);
          }}
          onSubmit={handleCreateGoal}
          accounts={accounts}
          editingGoal={editingGoal || undefined}
        />

        {/* Goal Details */}
        <GoalDetails
          goal={selectedGoal}
          open={detailsOpen}
          onClose={() => {
            setDetailsOpen(false);
            setSelectedGoal(null);
          }}
          onEdit={(goal) => {
            setEditingGoal(goal);
            setDetailsOpen(false);
            setFormOpen(true);
          }}
          onDelete={handleDeleteGoal}
          accounts={accounts}
        />

        {/* Actions Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={() => setMenuAnchor(null)}
        >
          <MenuItem onClick={() => selectedGoal && handleEditGoal(selectedGoal)}>
            <Edit sx={{ mr: 1 }} />
            Edit
          </MenuItem>
          <MenuItem onClick={() => selectedGoal && handleDeleteGoal(selectedGoal)}>
            <Delete sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        </Menu>

        <ConfirmDialog
          open={confirmOpen}
          title="Delete Goal"
          message={`Are you sure you want to delete the goal "${goalToDelete?.name}"?`}
          onConfirm={async () => {
            if (goalToDelete) {
              await deleteMutation.mutateAsync(goalToDelete.id);
            }
            setConfirmOpen(false);
            setGoalToDelete(null);
          }}
          onCancel={() => {
            setConfirmOpen(false);
            setGoalToDelete(null);
          }}
          loading={deleteMutation.isPending}
        />
      </Container>
    </ResponsiveLayout>
  );
}
