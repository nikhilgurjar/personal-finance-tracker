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
  Savings,
  Handshake,
  People,
  TrendingDown,
  History,
  Settings,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface NavigationDrawerProps {
  open: boolean;
  onClose: () => void;
}

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
      <List sx={{ px: 1, py: 1 }}>
        {navigationGroups.map((group) => (
          <Box key={group.subheader} sx={{ mb: 1.5 }}>
            <Typography
              variant="caption"
              fontWeight={700}
              sx={{ px: 3, py: 0.5, display: 'block', color: 'text.secondary', textTransform: 'uppercase', fontSize: '0.7rem', letterSpacing: '0.05em' }}
            >
              {group.subheader}
            </Typography>
            {group.items.map((item) => {
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
                      py: 0.5,
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
                        minWidth: 36,
                        color: isActive ? 'white' : theme.palette.text.secondary,
                      }}
                    >
                      {item.icon}
                    </ListItemIcon>
                    <ListItemText
                      primary={item.title}
                      primaryTypographyProps={{
                        fontWeight: isActive ? 600 : 500,
                        fontSize: '0.85rem',
                      }}
                    />
                  </ListItemButton>
                </ListItem>
              );
            })}
          </Box>
        ))}
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
