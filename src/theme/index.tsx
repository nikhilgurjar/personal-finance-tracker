'use client';

import { useMemo } from 'react';
import { CssBaseline } from '@mui/material';
import { createTheme, ThemeOptions, ThemeProvider as MUIThemeProvider } from '@mui/material/styles';
import palette from './palette';
import typography from './typography';
import shadows from './shadows';
import componentsOverrides from './components';

// ----------------------------------------------------------------------

type Props = {
  children: React.ReactNode;
};

export default function ThemeProvider({ children }: Props) {
  const themeOptions: ThemeOptions = useMemo(
    () => ({
      palette: palette('light'),
      typography,
      shape: { borderRadius: 16 },
      direction: 'ltr',
      shadows: shadows('light'),
    }),
    []
  );

  const theme = createTheme(themeOptions);

  theme.components = componentsOverrides(theme) as any;

  return (
    <MUIThemeProvider theme={theme}>
      <CssBaseline />
      {children}
    </MUIThemeProvider>
  );
}
