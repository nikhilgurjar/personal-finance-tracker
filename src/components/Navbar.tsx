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
} from '@mui/icons-material';
import Link from 'next/link';
import { useAuthContext } from './AuthProvider';
import { logout } from '@/lib/auth';
import { useState } from 'react';
import { NavigationDrawer } from './NavigationDrawer';
import { usePathname } from 'next/navigation';

export function Navbar() {
  const { user } = useAuthContext();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const pathname = usePathname();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const navigationItems = [
    { label: 'Dashboard', href: '/dashboard', icon: <Dashboard /> },
    { label: 'Expenses', href: '/expenses', icon: <TrendingDown /> },
    { label: 'Incomes', href: '/incomes', icon: <AccountBalanceWallet /> },
    { label: 'AI Insights', href: '/ai', icon: <AutoAwesome /> },
    { label: 'Forecast', href: '/forecast', icon: <AutoGraph /> },
    { label: 'Budgets', href: '/budgets', icon: <SavingsOutlined /> },
    { label: 'Savings', href: '/savings', icon: <Savings /> },
    { label: 'Loans', href: '/loans', icon: <Handshake /> },
    { label: 'Accounts', href: '/accounts', icon: <AccountBalance /> },
    { label: 'Goals', href: '/goals', icon: <Flag /> },
    { label: 'Schedules', href: '/schedules', icon: <Schedule /> },
    { label: 'History', href: '/history', icon: <History /> },
  ];

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
      <Box sx={{ flex: 1, py: 2 }}>
        <List sx={{ px: 2 }}>
          {navigationItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <ListItem key={item.href} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  component={Link}
                  href={item.href}
                  sx={{
                    borderRadius: 2,
                    py: 1.5,
                    px: 2,
                    backgroundColor: isActive ? 'primary.lighter' : 'transparent',
                    color: isActive ? 'primary.main' : 'text.primary',
                    '&:hover': {
                      backgroundColor: isActive ? 'primary.lighter' : 'grey.100',
                    },
                    '& .MuiListItemIcon-root': {
                      color: isActive ? 'primary.main' : 'text.secondary',
                      minWidth: 40,
                    },
                    '& .MuiListItemText-primary': {
                      fontWeight: isActive ? 600 : 500,
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
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
