'use client';

import { Box, useTheme, useMediaQuery } from '@mui/material';
import { Navbar } from './Navbar';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
}

export function ResponsiveLayout({ children }: ResponsiveLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Navbar />
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          backgroundColor: 'background.default',
          ...(isMobile ? { pt: '72px' } : { marginLeft: '280px' }),
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
