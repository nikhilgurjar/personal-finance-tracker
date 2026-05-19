'use client';

import { Box, Typography, Paper, Avatar, Button, Divider, Switch, List, ListItem, ListItemText, ListItemSecondaryAction } from '@mui/material';
import { useAuthContext } from '@/components/AuthProvider';
import { logout } from '@/lib/auth';
import { Logout, AccountCircle, Notifications, DarkMode, Language } from '@mui/icons-material';

export default function SettingsPage() {
  const { user } = useAuthContext();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  if (!user) return null;

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 800, mx: 'auto' }}>
      <Typography variant="h4" fontWeight={800} color="primary" sx={{ mb: 4 }}>
        Settings
      </Typography>

      <Paper sx={{ p: 3, mb: 4, borderRadius: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, mb: 3 }}>
          <Avatar
            sx={{
              width: 80,
              height: 80,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              fontSize: '2rem',
              fontWeight: 600,
            }}
          >
            {user.displayName?.charAt(0) || user.email?.charAt(0) || 'U'}
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight={700}>
              {user.displayName || user.email?.split('@')[0] || 'User'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              {user.email}
            </Typography>
          </Box>
        </Box>
        <Divider sx={{ my: 2 }} />
        <Button
          variant="outlined"
          color="error"
          startIcon={<Logout />}
          onClick={handleLogout}
          fullWidth
          sx={{ mt: 1 }}
        >
          Logout
        </Button>
      </Paper>

      <Paper sx={{ borderRadius: 3, overflow: 'hidden' }}>
        <List disablePadding>
          <ListItem sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <AccountCircle color="action" />
              <ListItemText primary="Profile Information" secondary="Update your name and email" />
            </Box>
            <ListItemSecondaryAction>
              <Button size="small" variant="text">Edit</Button>
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
          <ListItem sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <DarkMode color="action" />
              <ListItemText primary="Dark Mode" secondary="Toggle dark theme (Coming soon)" />
            </Box>
            <ListItemSecondaryAction>
              <Switch edge="end" disabled />
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
          <ListItem sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Language color="action" />
              <ListItemText primary="Currency" secondary="Base currency for tracking (INR)" />
            </Box>
            <ListItemSecondaryAction>
              <Button size="small" variant="text">Change</Button>
            </ListItemSecondaryAction>
          </ListItem>
          <Divider />
          <ListItem sx={{ py: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <Notifications color="action" />
              <ListItemText primary="Notifications" secondary="Manage email alerts" />
            </Box>
            <ListItemSecondaryAction>
              <Switch edge="end" defaultChecked />
            </ListItemSecondaryAction>
          </ListItem>
        </List>
      </Paper>
    </Box>
  );
}
