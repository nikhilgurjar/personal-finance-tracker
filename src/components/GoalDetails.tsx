'use client';

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Grid,
  Box,
  LinearProgress,
  Chip,
  IconButton,
  Divider,
  Paper,
} from '@mui/material';
import { Edit, Delete, Close } from '@mui/icons-material';
import { Goal, Account } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';

interface GoalDetailsProps {
  goal: Goal | null;
  onClose: () => void;
  onEdit: (goal: Goal) => void;
  onDelete: (goal: Goal) => void;
  accounts: Account[];
  open: boolean;
}

export function GoalDetails({ goal, open, onClose, onEdit, onDelete, accounts }: GoalDetailsProps) {
  if (!goal) return null;

  const totalAllocated = goal.allocations.reduce((sum, alloc) => sum + alloc.amount, 0);
  const progress = Math.min((totalAllocated / goal.targetAmount) * 100, 100);
  const priority = goal.priority ?? 1;

  const getAccountName = (accountId?: string) => {
    if (!accountId) return 'Linked Instrument';
    const account = accounts.find(acc => acc.id === accountId);
    return account?.name || 'Unknown Account';
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString();
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

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="md" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ px: 3, py: 2 }}>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box display="flex" alignItems="center" gap={2}>
            <Typography variant="h5" component="div">
              {goal.name}
            </Typography>
            <Chip
              label={getPriorityLabel(priority)}
              color={getPriorityColor(priority)}
              size="small"
              sx={{ height: 24 }}
            />
          </Box>
          <Box display="flex" alignItems="center" gap={1}>
            <IconButton 
              size="small" 
              onClick={() => onEdit(goal)}
              color="primary"
            >
              <Edit />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={() => onDelete(goal)}
              color="error"
            >
              <Delete />
            </IconButton>
            <IconButton 
              size="small" 
              onClick={onClose}
              sx={{ ml: 1 }}
            >
              <Close />
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ px: 3, py: 3 }}>
        <Grid container spacing={3}>
          <Grid item xs={12}>
            <Paper 
              elevation={0} 
              sx={{ 
                p: 3, 
                bgcolor: 'background.default',
                borderRadius: 2,
                mb: 3
              }}
            >
              <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={3}>
                <Box>
                  <Typography variant="h4" color="primary.main" gutterBottom sx={{ fontWeight: 'medium' }}>
                    {formatCurrency(goal.targetAmount)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Target Amount
                  </Typography>
                </Box>
                <Box textAlign="right">
                  <Typography variant="h4" sx={{ fontWeight: 'medium' }}>
                    {formatCurrency(totalAllocated)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Allocated
                  </Typography>
                </Box>
              </Box>
              
              <Box sx={{ position: 'relative', mb: 1 }}>
                <LinearProgress
                  variant="determinate"
                  value={progress}
                  sx={{ 
                    height: 12,
                    borderRadius: 6,
                    bgcolor: 'primary.light',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 6,
                    }
                  }}
                />
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    right: 0,
                    top: -20,
                    fontWeight: 'bold',
                    color: 'primary.main'
                  }}
                >
                  {Math.round(progress)}%
                </Typography>
              </Box>
              
              <Box display="flex" justifyContent="space-between" mt={2}>
                <Typography variant="body2" color="success.main" fontWeight="medium">
                  {formatCurrency(goal.targetAmount - totalAllocated)} remaining
                </Typography>
                {goal.targetDate && (
                  <Typography variant="body2" color="text.secondary">
                    Target: {formatDate(goal.targetDate)}
                  </Typography>
                )}
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
              Account Allocations
            </Typography>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'background.default',
                borderRadius: 2,
                overflow: 'hidden'
              }}
            >
              {goal.allocations.map((allocation, index) => (
                <Box 
                  key={index}
                  sx={{
                    p: 2,
                    '&:not(:last-child)': {
                      borderBottom: 1,
                      borderColor: 'divider'
                    }
                  }}
                >
                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">
                      {getAccountName(allocation.accountId)}
                    </Typography>
                    <Typography variant="subtitle2" fontWeight="medium">
                      {formatCurrency(allocation.amount)}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {((allocation.amount / goal.targetAmount) * 100).toFixed(1)}% of goal
                  </Typography>
                </Box>
              ))}
            </Paper>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
              Goal Information
            </Typography>
            <Paper 
              elevation={0}
              sx={{ 
                bgcolor: 'background.default',
                borderRadius: 2,
                p: 2
              }}
            >
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Created On</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    {formatDate(goal.createdAt)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">Priority Level</Typography>
                  <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                    {getPriorityLabel(priority)} Priority
                  </Typography>
                </Grid>
                {goal.targetDate && (
                  <Grid item xs={12}>
                    <Box 
                      sx={{ 
                        mt: 1, 
                        pt: 2, 
                        borderTop: 1, 
                        borderColor: 'divider'
                      }}
                    >
                      <Typography variant="body2" color="text.secondary">
                        Time Remaining
                      </Typography>
                      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                        {new Date(goal.targetDate).getTime() - Date.now() > 0
                          ? `${Math.ceil((new Date(goal.targetDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days left`
                          : 'Past due date'
                        }
                      </Typography>
                    </Box>
                  </Grid>
                )}
              </Grid>
            </Paper>
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
