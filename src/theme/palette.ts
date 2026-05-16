import { alpha } from '@mui/material/styles';

// ----------------------------------------------------------------------

export type ColorSchema = 'primary' | 'secondary' | 'info' | 'success' | 'warning' | 'error';

declare module '@mui/material/styles/createPalette' {
  interface TypeBackground {
    neutral: string;
    paper: string;
  }
  interface SimplePaletteColorOptions {
    lighter?: string;
    darker?: string;
  }
  interface PaletteColor {
    lighter: string;
    darker: string;
  }
}

// SETUP COLORS

const GREY = {
  0: '#FFFFFF',
  50: '#F9FAFB',
  100: '#F3F4F6',
  200: '#E5E7EB',
  300: '#D1D5DB',
  400: '#9CA3AF',
  500: '#6B7280',
  600: '#4B5563',
  700: '#374151',
  800: '#1F2937',
  900: '#111827',
};

const PRIMARY = {
  lighter: '#DBEAFE',
  light: '#60A5FA',
  main: '#3B82F6',
  dark: '#2563EB',
  darker: '#1D4ED8',
  contrastText: '#FFFFFF',
};

const SECONDARY = {
  lighter: '#F3E8FF',
  light: '#C084FC',
  main: '#8B5CF6',
  dark: '#7C3AED',
  darker: '#6D28D9',
  contrastText: '#FFFFFF',
};

const INFO = {
  lighter: '#E0F2F1',
  light: '#4DB6AC',
  main: '#00BCD4',
  dark: '#0097A7',
  darker: '#006064',
  contrastText: '#FFFFFF',
};

const SUCCESS = {
  lighter: '#D1FAE5',
  light: '#6EE7B7',
  main: '#10B981',
  dark: '#059669',
  darker: '#047857',
  contrastText: '#FFFFFF',
};

const WARNING = {
  lighter: '#FFF8E1',
  light: '#FFD54F',
  main: '#FF9800',
  dark: '#F57C00',
  darker: '#E65100',
  contrastText: '#FFFFFF',
};

const ERROR = {
  lighter: '#FEE2E2',
  light: '#F87171',
  main: '#EF4444',
  dark: '#DC2626',
  darker: '#B91C1C',
  contrastText: '#FFFFFF',
};

const COMMON = {
  common: { black: '#000000', white: '#FFFFFF' },
  primary: PRIMARY,
  secondary: SECONDARY,
  info: INFO,
  success: SUCCESS,
  warning: WARNING,
  error: ERROR,
  grey: GREY,
  divider: alpha(GREY[500], 0.2),
  action: {
    hover: alpha(GREY[500], 0.08),
    selected: alpha(GREY[500], 0.12),
    disabled: alpha(GREY[500], 0.8),
    disabledBackground: alpha(GREY[500], 0.24),
    focus: alpha(GREY[500], 0.24),
    hoverOpacity: 0.08,
    disabledOpacity: 0.48,
  },
};

export default function palette(themeMode: 'light' | 'dark') {
  const light = {
    ...COMMON,
    mode: 'light',
    text: {
      primary: GREY[800],
      secondary: GREY[600],
      disabled: GREY[500],
    },
    background: { 
      paper: '#FFFFFF', 
      default: '#F9FAFB', 
      neutral: GREY[50] 
    },
    action: {
      ...COMMON.action,
      active: GREY[600],
    },
  } as const;

  return light;
}
