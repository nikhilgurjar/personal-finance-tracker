'use client';

import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  useTheme,
  useMediaQuery,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  Grid,
  Button,
} from '@mui/material';
import {
  AccountBalance,
  AccountBalanceWallet,
  AutoAwesome,
  AutoGraph,
  Flag,
  Schedule,
  Dashboard,
  AccountCircle,
  Logout,
  Menu as MenuIcon,
  Handshake,
  TrendingDown,
  Savings,
  SavingsOutlined,
  History,
  People,
  Analytics as AnalyticsIcon,
  AddCircle,
  Settings,
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuthContext } from './AuthProvider';
import { logout } from '@/lib/auth';
import { useState } from 'react';
import { NavigationDrawer } from './NavigationDrawer';
import { usePathname } from 'next/navigation';

const navigationGroups = [
  {
    subheader: 'Core',
    items: [
      { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
      { title: 'Accounts', path: '/accounts', icon: <AccountBalance /> },
      { title: 'History', path: '/history', icon: <History /> },
    ]
  },
  {
    subheader: 'Money In/Out',
    items: [
      { title: 'Expenses', path: '/expenses', icon: <TrendingDown /> },
      { title: 'Incomes', path: '/incomes', icon: <AccountBalanceWallet /> },
      { title: 'Loans', path: '/loans', icon: <Handshake /> },
      { title: 'People Ledger', path: '/people', icon: <People /> },
    ]
  },
  {
    subheader: 'Planning',
    items: [
      { title: 'Budgets', path: '/budgets', icon: <SavingsOutlined /> },
      { title: 'Savings', path: '/savings', icon: <Savings /> },
      { title: 'Goals', path: '/goals', icon: <Flag /> },
      { title: 'Schedules', path: '/schedules', icon: <Schedule /> },
    ]
  },
  {
    subheader: 'Tracking & Insights',
    items: [
      { title: 'Analytics', path: '/analytics', icon: <AnalyticsIcon /> },
      { title: 'AI Insights', path: '/ai', icon: <AutoAwesome /> },
      { title: 'Forecast', path: '/forecast', icon: <AutoGraph /> },
    ]
  },
  {
    subheader: 'Settings',
    items: [
      { title: 'Settings', path: '/settings', icon: <Settings /> },
    ]
  }
];

export function Navbar() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await logout();
      handleClose();
    } catch (error) {
      console.error('Error logging out:', error);
    }
  };

  const toggleDrawer = () => {
    setDrawerOpen(!drawerOpen);
  };

  if (!user) {
    return null;
  }

  if (isMobile) {
    return (
      <>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            background: 'white',
            borderBottom: '1px solid',
            borderColor: 'grey.200',
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IconButton onClick={toggleDrawer} sx={{ color: 'text.primary' }}>
            <MenuIcon />
          </IconButton>
          <Typography noWrap variant="h6" sx={{ fontWeight: 700, color: 'primary.main', fontSize: { xs: '1.1rem', sm: '1.25rem' } }}>
            Finance Tracker
          </Typography>
          <IconButton onClick={handleMenu} sx={{ color: 'text.primary' }}>
            <AccountCircle />
          </IconButton>
        </Box>

        <NavigationDrawer 
          open={drawerOpen} 
          onClose={() => setDrawerOpen(false)} 
        />

        <Dialog open={quickAddOpen} onClose={() => setQuickAddOpen(false)} fullWidth maxWidth="xs">
          <DialogTitle sx={{ fontWeight: 'bold', textAlign: 'center' }}>Quick Add</DialogTitle>
          <DialogContent>
            <Grid container spacing={2} sx={{ mt: 1 }}>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" component={Link} href="/expenses" onClick={() => setQuickAddOpen(false)} startIcon={<TrendingDown />}>
                  Expense
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" component={Link} href="/incomes" onClick={() => setQuickAddOpen(false)} startIcon={<AccountBalanceWallet />}>
                  Income
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" component={Link} href="/loans" onClick={() => setQuickAddOpen(false)} startIcon={<Handshake />}>
                  Loan / Due
                </Button>
              </Grid>
              <Grid item xs={6}>
                <Button fullWidth variant="outlined" component={Link} href="/savings" onClick={() => setQuickAddOpen(false)} startIcon={<Savings />}>
                  Savings
                </Button>
              </Grid>
            </Grid>
          </DialogContent>
        </Dialog>

        {/* Bottom Navigation on Mobile */}
        <Paper
          sx={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            borderTop: 1,
            borderColor: 'divider',
            pb: 'env(safe-area-inset-bottom)',
            backgroundColor: 'background.paper',
            transform: 'translate3d(0,0,0)',
          }}
          elevation={3}
        >
          <BottomNavigation
            value={pathname === '/dashboard' ? 0 : pathname === '/expenses' ? 2 : pathname === '/incomes' ? 3 : -1}
            showLabels
            sx={{ height: 60, bgcolor: 'transparent' }}
          >
            <BottomNavigationAction
              label="Dashboard"
              icon={<Dashboard />}
              component={Link}
              href="/dashboard"
            />
            <BottomNavigationAction
              label="Add"
              icon={<AddCircle fontSize="large" sx={{ color: 'primary.main' }} />}
              onClick={() => setQuickAddOpen(true)}
            />
            <BottomNavigationAction
              label="Expenses"
              icon={<TrendingDown />}
              component={Link}
              href="/expenses"
            />
            <BottomNavigationAction
              label="Incomes"
              icon={<AccountBalanceWallet />}
              component={Link}
              href="/incomes"
            />
            <BottomNavigationAction
              label="More"
              icon={<MenuIcon />}
              onClick={toggleDrawer}
            />
          </BottomNavigation>
        </Paper>

        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        >
          <MenuItem onClick={handleLogout}>
            <ListItemIcon>
              <Logout fontSize="small" />
            </ListItemIcon>
            Logout
          </MenuItem>
        </Menu>
      </>
    );
  }

  return (
    <Box
      sx={{
        width: 280,
        height: '100vh',
        background: 'white',
        borderRight: '1px solid',
        borderColor: 'grey.200',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        left: 0,
        top: 0,
        zIndex: 1000,
      }}
    >
      {/* Logo */}
      <Box sx={{ p: 3, borderBottom: '1px solid', borderColor: 'grey.200' }}>
        <Typography 
          variant="h5" 
          sx={{ 
            fontWeight: 800, 
            color: 'primary.main',
            background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
            backgroundClip: 'text',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Finance Tracker
        </Typography>
      </Box>

      {/* Navigation */}
      <Box sx={{ flex: 1, py: 2, overflowY: 'auto' }}>
        {navigationGroups.map((group) => (
          <Box key={group.subheader} sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ px: 4, py: 0.5, display: 'block', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}
            >
              {group.subheader}
            </Typography>
            <List sx={{ px: 2, py: 0.5 }}>
              {group.items.map((item) => {
                const isActive = pathname === item.path;
                return (
                  <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
                    <ListItemButton
                      component={Link}
                      href={item.path}
                      sx={{
                        borderRadius: 2,
                        py: 0.75,
                        px: 2,
                        backgroundColor: isActive ? 'primary.lighter' : 'transparent',
                        color: isActive ? 'primary.main' : 'text.primary',
                        '&:hover': {
                          backgroundColor: isActive ? 'primary.lighter' : 'grey.100',
                        },
                        '& .MuiListItemIcon-root': {
                          color: isActive ? 'primary.main' : 'text.secondary',
                          minWidth: 36,
                        },
                        '& .MuiListItemText-primary': {
                          fontWeight: isActive ? 600 : 500,
                          fontSize: '0.85rem',
                        },
                      }}
                    >
                      <ListItemIcon>{item.icon}</ListItemIcon>
                      <ListItemText primary={item.title} />
                    </ListItemButton>
                  </ListItem>
                );
              })}
            </List>
          </Box>
        ))}
      </Box>

      {/* User Profile */}
      <Box sx={{ p: 2, borderTop: '1px solid', borderColor: 'grey.200' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              background: 'linear-gradient(135deg, #3B82F6 0%, #8B5CF6 100%)',
              fontSize: '1rem',
              fontWeight: 600,
            }}
          >
            {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
          </Avatar>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography 
              variant="body2" 
              sx={{ 
                fontWeight: 600, 
                color: 'text.primary',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {user?.displayName || user?.email?.split('@')[0] || 'User'}
            </Typography>
            <Typography 
              variant="caption" 
              sx={{ color: 'text.secondary' }}
            >
              {user?.email}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleMenu}
            sx={{ color: 'text.secondary' }}
          >
            <AccountCircle />
          </IconButton>
        </Box>
      </Box>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        transformOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'top' }}
      >
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout fontSize="small" />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>
    </Box>
  );
}
