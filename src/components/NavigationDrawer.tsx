'use client';

import { useState } from 'react';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  IconButton,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  Dashboard,
  AccountBalanceWallet,
  AccountBalance,
  Analytics as AnalyticsIcon,
  AutoGraph,
  AutoAwesome,
  SavingsOutlined,
  Flag,
  Schedule,
  Close,
  Menu,
  TrendingDown,
  Savings,
  Handshake,
  People,
  History,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

const navigationItems = [
  { title: 'Dashboard', path: '/dashboard', icon: <Dashboard /> },
  { title: 'Expenses', path: '/expenses', icon: <TrendingDown /> },
  { title: 'Incomes', path: '/incomes', icon: <AccountBalanceWallet /> },
  { title: 'Analytics', path: '/analytics', icon: <AnalyticsIcon /> },
  { title: 'AI Insights', path: '/ai', icon: <AutoAwesome /> },
  { title: 'Forecast', path: '/forecast', icon: <AutoGraph /> },
  { title: 'Budgets', path: '/budgets', icon: <SavingsOutlined /> },
  { title: 'Savings', path: '/savings', icon: <Savings /> },
  { title: 'Loans', path: '/loans', icon: <Handshake /> },
  { title: 'People Ledger', path: '/people', icon: <People /> },
  { title: 'Accounts', path: '/accounts', icon: <AccountBalance /> },
  { title: 'Goals', path: '/goals', icon: <Flag /> },
  { title: 'Schedules', path: '/schedules', icon: <Schedule /> },
  { title: 'History', path: '/history', icon: <History /> },
];


export function NavigationDrawer({ open, onClose }: NavigationDrawerProps) {
  const theme = useTheme();
  const pathname = usePathname();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const drawerWidth = 280;

  const drawerContent = (
    <Box sx={{ width: drawerWidth, height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 3,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="h6" fontWeight={700} color="primary">
          Finance Tracker
        </Typography>
        {isMobile && (
          <IconButton onClick={onClose} size="small">
            <Close />
          </IconButton>
        )}
      </Box>

      {/* Navigation Items */}
      <List sx={{ px: 1, py: 2 }}>
        {navigationItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.title} disablePadding>
              <ListItemButton
                component={Link}
                href={item.path}
                onClick={onClose}
                selected={isActive}
                sx={{
                  borderRadius: 2,
                  mx: 1,
                  mb: 0.5,
                  '&.Mui-selected': {
                    backgroundColor: theme.palette.primary.main,
                    color: 'white',
                    '&:hover': {
                      backgroundColor: theme.palette.primary.dark,
                    },
                    '& .MuiListItemIcon-root': {
                      color: 'white',
                    },
                  },
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? 'white' : theme.palette.text.secondary,
                  }}
                >
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.title}
                  primaryTypographyProps={{
                    fontWeight: isActive ? 600 : 500,
                    fontSize: '0.875rem',
                  }}
                />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ mx: 2 }} />

      {/* Footer */}
      <Box sx={{ p: 3, mt: 'auto' }}>
        <Typography variant="caption" color="text.secondary">
          © 2024 Finance Tracker
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Drawer
      variant={isMobile ? 'temporary' : 'persistent'}
      anchor="left"
      open={open}
      onClose={onClose}
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
          borderRight: `1px solid ${theme.palette.divider}`,
        },
      }}
    >
      {drawerContent}
    </Drawer>
  );
}
